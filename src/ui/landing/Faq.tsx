import { Link } from 'react-router'

interface Item {
  q: string
  a: React.ReactNode
}

const LEFT: Item[] = [
  { q: 'Is it really free?', a: 'Yes. No account, no trial, no paid tier. The code is open source under the AGPL-3.0, so it stays that way.' },
  {
    q: 'Do I need to install anything?',
    a: (
      <>
        No. Everything runs in your browser. When you're ready to use Git on your own computer, <Link to="/guides">the guides</Link> walk you through installing it on macOS or Windows.
      </>
    ),
  },
  {
    q: "What's the difference between Git and GitHub?",
    a: 'Git is the tool that saves versions of your project on your computer. GitHub is a website that stores a copy online so a team can share it. The course teaches Git first, then how to work with a server like GitHub.',
  },
]

const RIGHT: Item[] = [
  {
    q: 'Are these real Git commands?',
    a: "Yes. You type the same commands you'd use at work, and see the same kind of output. The practice repo lives in your browser, so you can't break anything.",
  },
  {
    q: 'I use an AI assistant to code. Is this for me?',
    a: "Very much. Assistants run Git commands for you all the time. After this course you'll know what they did, and how to undo it if needed.",
  },
  {
    q: 'Can I use it on my phone?',
    a: 'Yes, every lesson works on a phone. Typing commands is easier with a keyboard, so a laptop is nicer for longer sessions.',
  },
]

function Column({ items }: { items: Item[] }): React.JSX.Element {
  return (
    <div>
      {items.map((it, i) => (
        <details key={it.q} open={i === 0}>
          <summary>{it.q}</summary>
          <p>{it.a}</p>
        </details>
      ))}
    </div>
  )
}

/** Short FAQ in two columns (one on narrow screens); native open/close, no script. */
export function Faq(): React.JSX.Element {
  return (
    <section className="blk faq-sec" id="faq" aria-labelledby="faq-title">
      <div className="wrap">
        <h2 id="faq-title" className="h2">Questions people ask first.</h2>
        <div className="faq">
          <Column items={LEFT} />
          <Column items={RIGHT} />
        </div>
      </div>
    </section>
  )
}
