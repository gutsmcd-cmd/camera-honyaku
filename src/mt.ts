// Offline JA→EN translation worker: Opus-MT ja-en (Helsinki-NLP, Apache-2.0 on HF / OPUS-MT CC-BY-4.0),
// ONNX export Xenova/opus-mt-ja-en (q8, ~108 MB) through transformers.js. Cached by transformers.js in the Cache API.
import { pipeline, env, type TranslationPipeline } from '@huggingface/transformers'
env.allowLocalModels = false
env.useBrowserCache = true
let tr: TranslationPipeline | null = null
onmessage = async (e: MessageEvent) => {
  const { id, texts } = e.data as { id: number; texts: string[] }
  try {
    if (!tr) {
      const files: Record<string, { got: number; total: number }> = {}
      tr = (await pipeline('translation', 'Xenova/opus-mt-ja-en', {
        dtype: 'q8', device: 'wasm',
        progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
          if (p.status === 'progress' && p.file) {
            files[p.file] = { got: p.loaded ?? 0, total: p.total ?? 0 }
            const v = Object.values(files); postMessage({ type: 'progress', got: v.reduce((a, b) => a + b.got, 0), total: v.reduce((a, b) => a + b.total, 0) })
          }
        },
      })) as TranslationPipeline
    }
    postMessage({ type: 'working' })
    const out: string[] = []
    for (const t of texts) {
      const r = (await tr(t, { max_new_tokens: 256 })) as { translation_text: string }[]
      out.push(r[0]?.translation_text ?? '')
      postMessage({ type: 'step', n: out.length, of: texts.length })
    }
    postMessage({ type: 'done', id, out })
  } catch (err) { postMessage({ type: 'error', id, msg: String(err) }) }
}
