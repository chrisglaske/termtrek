import type { Explain } from '../../engine/types'
import { RichText } from '../RichText'

const GLYPH: Record<Explain['kind'], string> = { ok: '✓', tip: 'i', warn: '!' }
const LABEL: Record<Explain['kind'], string> = { ok: 'Success', tip: 'Tip', warn: 'Warning' }

export function FeedbackCard({ explain, onCommand }: { explain: Explain; onCommand?: (cmd: string) => void }): React.JSX.Element {
  return (
    <div className={`fb fb-${explain.kind}`}>
      <span className="fb-icon" aria-hidden="true">
        {GLYPH[explain.kind]}
      </span>
      <span className="sr-only">{LABEL[explain.kind]}</span>
      <div className="fb-body">
        <RichText text={explain.text} onCommand={onCommand} />
      </div>
    </div>
  )
}
