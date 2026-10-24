import './style.css'
import { createWorker, PSM, type Worker as TWorker } from 'tesseract.js'
import { dict, type Dict, type Lang } from './i18n'
import { bigTextButton } from './bigtext'

let lang: Lang = (localStorage.getItem('camera-honyaku-lang') as Lang) || 'ja'
let t: Dict = dict[lang]
let vert = localStorage.getItem('camera-honyaku-vert') === '1'
navigator.storage?.persist?.().catch(() => {})

type Item = { ja: string; en: string; box: { x0: number; y0: number; x1: number; y1: number } }
const app = document.getElementById('app')!
let photo: HTMLCanvasElement | null = null
let items: Item[] = []
let busy = false, msg = ''
let ocr: TWorker | null = null, ocrLang = ''
let mt: Worker | null = null

const $ = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e
}
const button = (cls: string, text: string, fn: () => void) => { const b = $('button', cls, text); b.onclick = fn; return b }
function toast(m: string) { const d = $('div', 'toast', m); document.body.append(d); setTimeout(() => d.remove(), 2200) }
async function copy(s: string) { try { await navigator.clipboard.writeText(s); toast(t.copied) } catch { toast(t.fail) } }

const status = $('div', 'status'); status.hidden = true
const stText = $('div'); const stBar = $('progress'); const stNote = $('div', 'small')
status.append(stText, stBar, stNote)
function setStatus(text: string | null, p?: number, note = '') {
  status.hidden = text === null; if (text === null) return
  stText.textContent = text; stNote.textContent = note
  if (p === undefined || !isFinite(p)) stBar.removeAttribute('value'); else stBar.value = p
}

function render() {
  document.documentElement.lang = lang
  app.replaceChildren()
  const top = $('div', 'top'); const right = $('div', 'right')
  right.append(bigTextButton(t.big), button('ghost', t.toggle, () => { lang = lang === 'ja' ? 'en' : 'ja'; localStorage.setItem('camera-honyaku-lang', lang); t = dict[lang]; render() }))
  top.append($('h1', '', t.app), right)
  app.append(top, $('p', 'lead', t.lead))
  const cam = $('input'); cam.type = 'file'; cam.accept = 'image/*'; cam.setAttribute('capture', 'environment'); cam.hidden = true
  const pick = $('input'); pick.type = 'file'; pick.accept = 'image/*'; pick.hidden = true
  for (const f of [cam, pick]) f.onchange = () => { const x = f.files?.[0]; if (x) void openPhoto(x); f.value = '' }
  app.append(cam, pick)
  const seg = $('div', 'seg')
  for (const v of [false, true]) { const b = button(vert === v ? 'on' : '', v ? t.vert : t.horiz, () => { vert = v; localStorage.setItem('camera-honyaku-vert', v ? '1' : '0'); if (photo) void read(); else render() }); b.disabled = busy; seg.append(b) }
  if (!photo) {
    const home = $('div', 'home')
    home.append(button('primary big', t.shoot, () => cam.click()), button('big', t.pickPhoto, () => pick.click()), seg, $('p', 'small', t.tip), $('p', 'note', '📶 ' + t.dlNote))
    app.append(home, $('p', 'foot', t.foot)); return
  }
  const bar = $('div', 'ebar')
  bar.append(button('ghost', '← ' + t.other, () => cam.click()), button('', t.pickPhoto, () => pick.click()), seg)
  const wrap = $('div', 'stagewrap'); const box = $('div', 'cmp')
  const c = $('canvas', 'stage'); c.width = photo.width; c.height = photo.height; c.getContext('2d')!.drawImage(photo, 0, 0)
  box.append(c)
  items.forEach((it, i) => {
    const m = $('div', 'mark'); const b = it.box
    Object.assign(m.style, { left: b.x0 / photo!.width * 100 + '%', top: b.y0 / photo!.height * 100 + '%', width: (b.x1 - b.x0) / photo!.width * 100 + '%', height: (b.y1 - b.y0) / photo!.height * 100 + '%' })
    m.append($('span', 'num', String(i + 1))); box.append(m)
  })
  wrap.append(box, status); app.append(bar, wrap)
  if (msg) app.append($('p', 'note', msg))
  if (items.length) {
    const head = $('div', 'tools'); head.append(button('', '📋 ' + t.copyAll, () => void copy(items.map((x) => x.en).join('\n'))))
    const list = $('ol', 'lines')
    for (const it of items) {
      const li = $('li'); const en = $('p', 'en', it.en || '…'); const ja = $('p', 'ja', it.ja)
      const row = $('div', 'row'); row.append(button('', t.copy + ' EN', () => void copy(it.en)), button('ghost', t.copy + ' JA', () => void copy(it.ja)))
      li.append(en, ja, row); list.append(li)
    }
    app.append(head, list)
  }
  app.append($('p', 'small tip', t.tip), $('p', 'foot', t.foot))
}

async function openPhoto(f: File) {
  const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' } as ImageBitmapOptions)
  const s = Math.min(1, 2200 / Math.max(bmp.width, bmp.height))
  photo = $('canvas'); photo.width = Math.round(bmp.width * s); photo.height = Math.round(bmp.height * s)
  photo.getContext('2d')!.drawImage(bmp, 0, 0, photo.width, photo.height)
  items = []; msg = ''; await read()
}

// Tesseract splits Japanese into spaced characters; remove spaces between CJK chars.
const CJK = '\\u3000-\\u30ff\\u3400-\\u9fff\\uff00-\\uffef'
const tidy = (s: string) => s.replace(new RegExp(`([${CJK}])\\s+(?=[${CJK}])`, 'g'), '$1').replace(/\s*\n\s*/g, '').replace(/\s+/g, ' ').trim()

async function getOcr() {
  const want = vert ? 'jpn_vert' : 'jpn'
  if (ocr && ocrLang === want) return ocr
  if (ocr) await ocr.terminate()
  ocr = await createWorker(want, 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status.includes('traineddata')) setStatus(t.dlOcr, m.progress, t.dlNote)
      else if (m.status === 'recognizing text') setStatus(t.reading, m.progress)
    },
  })
  ocrLang = want
  await ocr.setParameters({ tessedit_pageseg_mode: vert ? PSM.SINGLE_BLOCK_VERT_TEXT : PSM.AUTO, preserve_interword_spaces: '1' })
  return ocr
}

function translate(texts: string[]): Promise<string[]> {
  if (!mt) mt = new Worker(new URL('./mt.ts', import.meta.url), { type: 'module' })
  return new Promise((resolve, reject) => {
    mt!.onmessage = (e) => {
      const d = e.data
      if (d.type === 'progress') setStatus(t.dlMt, d.total ? d.got / d.total : undefined, `${Math.round(d.got / 1048576)} / ${Math.round(d.total / 1048576)} MB · ${t.dlNote}`)
      else if (d.type === 'working') setStatus(t.translating)
      else if (d.type === 'step') setStatus(t.translating, d.n / d.of, `${d.n} / ${d.of}`)
      else if (d.type === 'done') resolve(d.out)
      else if (d.type === 'error') reject(new Error(d.msg))
    }
    mt!.postMessage({ id: Date.now(), texts })
  })
}

let again = false
async function read() {
  if (!photo) return
  if (busy) { again = true; return }
  busy = true; items = []; msg = ''; render(); setStatus(t.reading)
  try {
    const w = await getOcr(); setStatus(t.reading)
    const r = await w.recognize(photo, {}, { blocks: true })
    const paras = (r.data.blocks ?? []).flatMap((b) => b.paragraphs)
    const jaRatio = (t: string) => (t.match(new RegExp(`[${CJK}]`, 'g'))?.length ?? 0) / Math.max(1, t.replace(/\s/g, '').length)
    items = paras
      .filter((p) => p.confidence >= 55 && jaRatio(p.text) >= 0.5)
      .map((p) => ({ ja: tidy(p.text), en: '', box: p.bbox }))
      .filter((p) => (p.ja.match(new RegExp(`[${CJK}A-Za-z0-9]`, 'g')) ?? []).length >= 2)
    if (!items.length) { msg = t.none } else {
      render(); setStatus(t.translating)
      const out = await translate(items.map((x) => x.ja))
      out.forEach((s, i) => { items[i].en = s })
    }
  } catch (err) { console.error(err); msg = t.fail }
  busy = false; setStatus(null); render()
  if (again) { again = false; void read() }
}

render()
