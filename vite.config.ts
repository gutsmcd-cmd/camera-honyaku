import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const MANIFEST_ID = '/camera-honyaku/'

function assertManifestId(): Plugin {
  return {
    name: 'assert-manifest-id',
    apply: 'build',
    enforce: 'post',
    closeBundle() {
      const file = resolve('dist/manifest.webmanifest')
      const manifest = JSON.parse(readFileSync(file, 'utf8')) as { id?: string }
      if (manifest.id !== MANIFEST_ID) {
        throw new Error(`manifest id must be ${MANIFEST_ID} (never './'), got ${String(manifest.id)}`)
      }
    },
  }
}

export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
  worker: { format: 'es' },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-32.png', 'icons/icon-180.png'],
      manifest: {
        id: MANIFEST_ID,
        name: 'カメラ翻訳',
        short_name: 'カメラ翻訳',
        description: '日本語の文字を写真に撮って、英語で読む。Take a photo of Japanese text and read it in English, offline.',
        lang: 'ja',
        dir: 'ltr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#1b2a24',
        theme_color: '#1b2a24',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,woff2}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // ONNX runtime wasm (jsDelivr). Tesseract (jsDelivr) + Opus-MT (Hugging Face) cache themselves; this keeps the runtimes offline.
            // Downloaded once on first erase, then served from cache so it works offline.
            urlPattern: ({ url }) =>
              url.hostname === 'cdn.jsdelivr.net' ||
              url.pathname.endsWith('.wasm'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'camera-honyaku-runtime',
              expiration: { maxEntries: 40 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
    assertManifestId(),
  ],
})
