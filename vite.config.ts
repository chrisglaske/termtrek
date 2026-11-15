/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
    css: { include: [/tokens\.css/] },
  },
})
