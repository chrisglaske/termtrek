import { course } from '../../lessons/course'
import { CommandPill } from '../CommandPill'

/** The course outline: a numbered rail for sections at launch, then hollow stops for what's next. */
export function CourseRail(): React.JSX.Element {
  let n = 0
  return (
    <ol className="track">
      {course.map((s, i) => {
        const later = s.status === 'later'
        const prev = course[i - 1]
        const next = course[i + 1]
        if (!later) n += 1
        return (
          <li key={s.id} className={`sec${later ? ' later' : ''}`}>
            <span className="sec-rail" aria-hidden="true">
              {prev && <i className={`sec-line up${later ? ' dashed' : ''}`} />}
              {next && <i className={`sec-line down${next.status === 'later' ? ' dashed' : ''}`} />}
              <b className="sec-dot">{later ? '' : n}</b>
            </span>
            <div>
              <h3>{s.title}</h3>
              <p>{s.summary}</p>
              {s.commands.length > 0 && (
                <div className="cmds">
                  {s.commands.map((c) => (
                    <CommandPill key={c} cmd={c} />
                  ))}
                </div>
              )}
            </div>
            <span className="when">{later ? 'Coming next' : 'At launch'}</span>
          </li>
        )
      })}
    </ol>
  )
}
