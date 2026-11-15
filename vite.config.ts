/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { runnerImport } from 'vite'

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

const SITE = 'https://termtrek.work'
const esc = (text: string) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

// Crawlers and link previews that do not run JavaScript read the HTML only.
// Write one copy of the built index.html per public route with its own head,
// and a sitemap listing every one.
function routeHeads(): Plugin {
  return {
    name: 'termtrek-route-heads',
    apply: 'build',
    generateBundle: {
      order: 'post',
      async handler(_options, bundle) {
      const { module } = await runnerImport<typeof import('./src/seo/routeMeta')>('./src/seo/routeMeta.ts')
      const routes = module.routeMeta()
      const index = bundle['index.html']
      if (!index || index.type !== 'asset') throw new Error('route heads: index.html is not in the bundle')
      const base = String(index.source)
      const swap = (html: string, pattern: RegExp, value: string) => {
        if (!pattern.test(html)) throw new Error(`route heads: ${pattern} not found in index.html`)
        return html.replace(pattern, () => value)
      }
      for (const route of routes) {
        if (route.path === '/') continue
        const url = SITE + route.path
        let html = base
        html = swap(html, /<title>[^<]*<\/title>/, `<title>${esc(route.title)}</title>`)
        html = swap(html, /<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(route.description)}" />`)
        html = swap(html, /<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${esc(route.title)}" />`)
        html = swap(html, /<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${esc(route.description)}" />`)
        html = swap(html, /<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`)
        html = swap(html, /<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`)
        this.emitFile({ type: 'asset', fileName: `${route.path.slice(1)}.html`, source: html })
      }
      const urls = routes.map((r) => `  <url><loc>${SITE}${r.path === '/' ? '/' : r.path}</loc></url>`).join('\n')
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n` })
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), fontPreload(), routeHeads()],
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
