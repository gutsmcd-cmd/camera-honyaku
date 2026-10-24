# カメラ翻訳 / Camera Translator

Take a photo of Japanese text (signs, menus, letters, vertical book text) and read it in English. Works offline after the first download. Japanese UI by default, English toggle, 大きい文字 / Large text switch. Free, no ads, no login, photos never leave the device.

https://gutsmcd-cmd.github.io/camera-honyaku/

## How it works
- OCR: [Tesseract.js](https://github.com/naptha/tesseract.js) with `jpn` / `jpn_vert` traineddata (cached in IndexedDB, ~2–3 MB each).
- Translation: [transformers.js](https://github.com/huggingface/transformers.js) running `Xenova/opus-mt-ja-en` (q8, ~108 MB, cached via Cache API; download once on Wi-Fi).
- Only Japanese → English. EN→JA was skipped (the available small Opus-MT model is poor quality).

## Licences
- Tesseract.js, tesseract.js-core, tessdata: Apache-2.0
- transformers.js / onnxruntime-web: Apache-2.0 / MIT
- OPUS-MT ja-en model (Helsinki-NLP): CC-BY-4.0 (attribution in the app footer); ONNX conversion by Xenova
- This app: MIT
