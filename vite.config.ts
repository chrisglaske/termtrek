/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

// Preload the latin Plus Jakarta woff2 using its hashed build name, so the
// browser fetches the very file the CSS @font-face asks for.
function fontPreload(): Plugin {
  return {
    name: 'termtrek-font-preload',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const file = Object.keys(ctx.bundle ?? {}).find((name) => /plus-jakarta-sans-latin-wght-normal-.*\.woff2$/.test(name))
        if (!file) return []
        return [{ tag: 'link', attrs: { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '', href: `/${file}` }, injectTo: 'head' }]
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), fontPreload()],
  build: {
    // Small font subsets would be inlined as data: URIs, which the CSP
    // (font-src 'self') blocks. Ship every font as its own file.
    assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    // theme.test.ts reads tokens.css?raw to check token contrast.
    css: { include: [/tokens\.css/, /Home\.css/, /PageFlow\.css/] },
  },
})
