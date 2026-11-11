import { Fragment } from 'react'
import { CommandPill } from './CommandPill'
import { registry } from '../engine/registry'

/** Flags that need something after them, so a span ending in one is a partial command, not a runnable one. */
const NEEDS_MORE = new Set(['-m', '-am', '-ma', '--message', '--global', '--local', '--system'])

/** Only spans that start with a real command (git or a shell command) and are complete can be run by clicking. */
const runnable = (span: string): boolean => {
  const words = span.trim().split(/\s+/)
  const first = words[0] ?? ''
  if (NEEDS_MORE.has(words[words.length - 1] ?? '')) return false
  return first === 'git' || Object.prototype.hasOwnProperty.call(registry, first)
}

type Token = { kind: 'text' | 'code' | 'bold' | 'br'; value: string }

function tokenize(s: string): Token[] {
  const out: Token[] = []
  let buf = ''
  const flush = () => {
    if (buf) out.push({ kind: 'text', value: buf })
    buf = ''
  }
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (c === '`') {
      const end = s.indexOf('`', i + 1)
      if (end > i + 1) {
        flush()
        out.push({ kind: 'code', value: s.slice(i + 1, end) })
        i = end + 1
        continue
      }
    } else if (c === '*' && s[i + 1] === '*') {
      const end = s.indexOf('**', i + 2)
      if (end > i + 2) {
        flush()
        out.push({ kind: 'bold', value: s.slice(i + 2, end) })
        i = end + 2
        continue
      }
    } else if (c === '\n') {
      flush()
      out.push({ kind: 'br', value: '' })
      i++
      continue
    }
    buf += c
    i++
  }
  flush()
  return out
}

export function RichText({ text, onCommand }: { text: string; onCommand?: (cmd: string) => void }): React.JSX.Element {
  const paragraphs = text.split(/\n{2,}/)
  return (
    <>
      {paragraphs.map((para, p) => (
        <p key={p}>
          {tokenize(para).map((t, k) => (
            <Fragment key={k}>
              {t.kind === 'text' && t.value}
              {t.kind === 'br' && <br />}
              {t.kind === 'bold' && <strong>{t.value}</strong>}
              {t.kind === 'code' && <CommandPill cmd={t.value} onRun={runnable(t.value) ? onCommand : undefined} />}
            </Fragment>
          ))}
        </p>
      ))}
    </>
  )
}
