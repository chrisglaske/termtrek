import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist'
const ENTRY_MAX_BYTES = 419 * 1024 // measured 380 KB after code splitting, plus 10%
const MAX_BYTES = 3 * 1024 * 1024
const FORBIDDEN = ['fonts.googleapis.com', 'cdn.jsdelivr', 'cdnjs', 'unpkg', 'googletagmanager']

const problems = []

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })
}

for (const required of ['index.html', '_headers']) {
  if (!existsSync(join(DIST, required))) problems.push(`dist/${required} missing`)
}
if (existsSync(join(DIST, '404.html'))) {
  problems.push('dist/404.html exists and would break the SPA fallback')
}

const ALLOWED_ORIGINS = ['https://static.cloudflareinsights.com']

if (existsSync(join(DIST, 'index.html'))) {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8')
  if (!html.includes('<meta name="description"')) problems.push('dist/index.html lacks a meta description')
  if (!html.includes('<meta property="og:title"')) problems.push('dist/index.html lacks og:title')
  // A canonical link names this page; it loads nothing.
  if (!/<link[^>]*rel="preload"[^>]*as="font"[^>]*>/.test(html)) problems.push('dist/index.html has no font preload')
  const refs = [...html.matchAll(/<(?:script|link)\b(?![^>]*\brel="canonical")[^>]*?\b(?:src|href)="([^"]+)"/g)].map((m) => m[1])
  for (const ref of refs) {
    if (/^(?:https?:)?\/\//.test(ref) && !ALLOWED_ORIGINS.some((o) => ref.startsWith(o))) {
      problems.push(`dist/index.html loads ${ref} from a foreign origin`)
    }
  }
}
if (existsSync(join(DIST, '_headers'))) {
  if (!readFileSync(join(DIST, '_headers'), 'utf8').includes('Content-Security-Policy')) {
    problems.push('dist/_headers lacks Content-Security-Policy')
  }
}

if (existsSync(DIST)) {
  let total = 0
  for (const file of walk(DIST)) {
    total += statSync(file).size
    const text = readFileSync(file).toString('latin1')
    for (const needle of FORBIDDEN) {
      if (text.includes(needle)) problems.push(`${file} references ${needle}`)
    }
    // The CSP (font-src 'self') blocks fonts inlined as data: URIs.
    if (file.endsWith('.css') && text.includes('url(data:font')) problems.push(`${file} inlines a font as a data: URI`)
    // Only latin fonts ship; other subsets are dead weight.
    if (/\.(?:css|woff2?)$/.test(file) && /(?:cyrillic|vietnamese|greek|symbols)/.test(file.replace(/^.*[\\/]/, ''))) {
      problems.push(`${file} is a non-latin font subset`)
    }
    if (file.endsWith('.css') && /(?:cyrillic|vietnamese|greek|symbols)/.test(text)) problems.push(`${file} declares a non-latin font subset`)
    // Entry chunk budget: measured after code splitting, plus 10%.
    if (/[\\/]assets[\\/]index-[^\\/]+\.js$/.test(file) && statSync(file).size > ENTRY_MAX_BYTES) {
      problems.push(`${file} is ${(statSync(file).size / 1024).toFixed(1)} KB, over the ${(ENTRY_MAX_BYTES / 1024).toFixed(0)} KB entry budget`)
    }
  }
  if (total > MAX_BYTES) {
    problems.push(`dist is ${(total / 1024 / 1024).toFixed(2)} MB, over the 3 MB limit`)
  }
  console.log(`dist size: ${(total / 1024).toFixed(1)} KB`)
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`check-dist: FAIL ${problem}`)
  process.exit(1)
}
console.log('check-dist: ok')
