// Checks that a deployed TermTrek serves exactly what this code builds, byte for byte, file by file.
// Anyone can run it; it only reads public URLs.
//   npm ci && npm run build && node scripts/verify-live.mjs [origin]
// The one allowed difference: Cloudflare Pages adds its own anonymous page-count snippet to index.html when it serves it,
// so that block is removed from the served page before the two are compared. `_headers` is read by Cloudflare and never served.
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const origin = (process.argv[2] || 'https://termtrek.work').replace(/\/$/, '')
const DIST = 'dist'
const sha = (body) => createHash('sha256').update(body).digest('hex')
const CF_BLOCK = /<!-- Cloudflare Pages Analytics -->.*?<!-- Cloudflare Pages Analytics -->/gs

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]))
const files = walk(DIST)
  .map((p) => '/' + relative(DIST, p).split('\\').join('/'))
  .filter((p) => p !== '/_headers')
  .sort()

let failed = 0
for (const path of files) {
  const url = origin + (path === '/index.html' ? '/' : path)
  let verdict
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) verdict = `missing (${res.status})`
    else {
      let served = Buffer.from(await res.arrayBuffer())
      if (path === '/index.html') served = Buffer.from(served.toString('utf8').replace(CF_BLOCK, ''), 'utf8')
      verdict = sha(served) === sha(readFileSync(join(DIST, path))) ? 'same' : 'DIFFERENT'
    }
  } catch (error) {
    verdict = `unreachable (${error.message})`
  }
  if (verdict !== 'same') failed += 1
  console.log(verdict.padEnd(16), path)
}
console.log(failed ? `\n${failed} of ${files.length} files differ from ${origin}.` : `\nAll ${files.length} files ${origin} serves match this build.`)
process.exit(failed ? 1 : 0)
