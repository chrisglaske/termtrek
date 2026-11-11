import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist'
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

if (existsSync(DIST)) {
  let total = 0
  for (const file of walk(DIST)) {
    total += statSync(file).size
    const text = readFileSync(file).toString('latin1')
    for (const needle of FORBIDDEN) {
      if (text.includes(needle)) problems.push(`${file} references ${needle}`)
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
