export type Lang = 'ja' | 'en'
export const dict = {
  ja: {
    app: 'カメラ翻訳', lead: '日本語の文字を写真に撮って、英語で読む。オフラインで動きます。', toggle: 'English', big: '大きい文字',
    shoot: '📷 撮る', pickPhoto: '🖼️ 写真を選ぶ', other: '別の写真', horiz: '横書き', vert: '縦書き', again: 'もう一度読む',
    dlOcr: '文字読み取りデータを準備中（初回のみ）', dlMt: '翻訳AIを準備中（初回のみ・約110MB）',
    dlNote: 'Wi-Fiでどうぞ。一度ダウンロードすれば、次からはオフラインで使えます。',
    reading: '文字を読んでいます…', translating: '翻訳しています…', none: '文字が見つかりませんでした。明るく、まっすぐ撮ってみてください。',
    copy: 'コピー', copyAll: '全部コピー', copied: 'コピーしました', fail: 'うまくいきませんでした。もう一度お試しください。',
    tip: 'コツ：文字を大きく、明るく、まっすぐに。縦書きの本や看板は「縦書き」を選んでください。',
    foot: '無料・広告なし・ログイン不要。写真はこの端末から出ません。文字読み取り: Tesseract.js（Apache-2.0）。翻訳: Opus-MT ja-en（Helsinki-NLP, CC-BY-4.0）。機械翻訳なので、大事な内容は確認してください。',
  },
  en: {
    app: 'Camera Translator', lead: 'Take a photo of Japanese text and read it in English. Works offline.', toggle: '日本語', big: 'Large text',
    shoot: '📷 Take photo', pickPhoto: '🖼️ Choose photo', other: 'Another photo', horiz: 'Horizontal', vert: 'Vertical', again: 'Read again',
    dlOcr: 'Getting the text reader ready (first time only)', dlMt: 'Getting the translation AI ready (first time only, ~110 MB)',
    dlNote: 'Wi-Fi recommended. After this one download it works offline.',
    reading: 'Reading the text…', translating: 'Translating…', none: 'No text found. Try a brighter, straighter photo.',
    copy: 'Copy', copyAll: 'Copy all', copied: 'Copied', fail: 'That didn’t work. Please try again.',
    tip: 'Tip: fill the frame with the text, in good light, held straight. Use “Vertical” for top-to-bottom books and signs.',
    foot: 'Free, no ads, no login. Your photos never leave this device. Text reading: Tesseract.js (Apache-2.0). Translation: Opus-MT ja-en (Helsinki-NLP, CC-BY-4.0). Machine translation: double-check anything important.',
  },
} as const
export type Dict = Record<keyof (typeof dict)["ja"], string>
