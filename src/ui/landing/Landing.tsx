import { useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import { Nav } from '../layout/Nav'
import { Logo } from '../layout/Logo'
import { useDocumentTitle } from '../layout/useDocumentTitle'
import { CommandPill } from '../CommandPill'
import { HeroDemo } from './HeroDemo'
import { CourseRail } from './CourseRail'
import '../buttons.css'
import './Landing.css'

const SOURCE = 'https://github.com/chrisglaske/devcore'

function Tick({ size = 10 }: { size?: number }): React.JSX.Element {
  return (
    <span className="tick" aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 12 12">
        <path d="M2.5 6.3l2.2 2.2L9.5 3.7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

/** A static picture of a lesson, drawn with the same tokens as the app. */
function LessonShot(): React.JSX.Element {
  return (
    <div className="shot" role="img" aria-label="A lesson in TermTrek: the course list, a terminal with a saved commit, and the lesson card">
      <div className="app">
        <div className="sh-side">
          <div className="lg">
            <Logo size={18} />
            TermTrek
          </div>
          <div className="grp">Foundations</div>
          <div className="it done"><i>✓</i>What is Git?</div>
          <div className="it done"><i>✓</i>Create a repo</div>
          <div className="it now"><i>3</i>Your first commit</div>
          <div className="it todo"><i />Read the history</div>
          <div className="grp">Fixing mistakes</div>
          <div className="it todo"><i />Undo a change</div>
          <div className="it todo"><i />Fix your last commit</div>
        </div>
        <div className="main">
          <div className="hdr">
            <b>Your first commit</b>
            <span className="tag">Beginner, 6 min</span>
            <span className="bar"><i className="d" /><i className="d" /><i className="c" /><i /></span>
          </div>
          <div className="work">
            <div className="t">
              <div><span className="p">~/project</span> <span className="b">(main)</span> $ git add notes.txt</div>
              <div><span className="p">~/project</span> <span className="b">(main)</span> $ git commit -m "Add meeting notes"</div>
              <div className="m">[main a1f3c9e] Add meeting notes</div>
              <div className="m">&nbsp;1 file changed, 3 insertions(+)</div>
              <div className="ok"><i>✓</i><b>Snapshot saved.</b> Your commit got an ID and main moved forward to point at it.</div>
            </div>
            <div className="col">
              <div className="pn">
                <h4>Save a snapshot</h4>
                <p>A commit saves a snapshot of your project. Stage files first with <CommandPill cmd="git add" /> so you choose what goes in.</p>
                <div className="task">Commit notes.txt with a short message.</div>
              </div>
              <div className="pn">
                <div className="tabs"><span className="on">Your repo</span><span>Remote</span></div>
                <svg viewBox="0 0 170 50" width="100%">
                  <path d="M16 32H96" stroke="var(--g-line)" strokeWidth="3" />
                  <circle cx="16" cy="32" r="7" fill="var(--surface)" stroke="var(--g-main)" strokeWidth="2.6" />
                  <circle cx="56" cy="32" r="7" fill="var(--surface)" stroke="var(--g-main)" strokeWidth="2.6" />
                  <circle cx="96" cy="32" r="12" fill="none" stroke="var(--g-head)" strokeWidth="2" />
                  <circle cx="96" cy="32" r="7" fill="var(--g-main)" />
                  <rect x="114" y="24" width="40" height="16" rx="8" fill="var(--g-main-lbl)" />
                  <text x="134" y="35" fontSize="9" textAnchor="middle" fill="#fff" fontFamily="var(--mono)">main</text>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Landing(): React.JSX.Element {
  useDocumentTitle('TermTrek: learn Git by using it')
  const { hash } = useLocation()

  // Links such as "Back to course" arrive as /#course: scroll there once the page is drawn.
  useEffect(() => {
    if (!hash) return
    let id: string
    try {
      id = decodeURIComponent(hash.slice(1))
    } catch {
      return // a malformed link like /#% just shows the top of the page
    }
    const el = document.getElementById(id)
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'instant' })
  }, [hash])

  return (
    <>
      <Nav />
      <main id="main" className="landing" tabIndex={-1}>
        <section className="hero" aria-labelledby="hero-title">
          <div className="wrap">
            <div>
              <h1 id="hero-title">
                <span>Learn Git</span> <span>by using it.</span>
              </h1>
              <p className="lede">
                A free, hands-on course that runs in your browser. Type real Git commands, watch your project's history take shape, and get comfortable with the tool every team expects you to know.
              </p>
              <div className="ctas">
                <Link className="btn btn-p" to="/learn">
                  Start the course
                </Link>
                <a className="btn btn-s" href="#course">
                  See what you'll learn
                </a>
              </div>
              <ul className="promise">
                <li><Tick />No account, no install, free forever</li>
                <li><Tick />Your progress never leaves your device</li>
                <li><Tick />Open source</li>
              </ul>
            </div>
            <HeroDemo />
          </div>
        </section>

        <section className="who" aria-labelledby="who-title">
          <h2 id="who-title" className="sr-only">Who it's for</h2>
          <div className="wrap">
            <div>
              <h3>Never used Git</h3>
              <p>Start from zero. Every command comes with a plain-language reason for why it exists.</p>
            </div>
            <div>
              <h3>Used it without really getting it</h3>
              <p>Copied commands from a teammate or an AI assistant? See what they actually do, so nothing feels like magic.</p>
            </div>
            <div>
              <h3>Ready to go deeper</h3>
              <p>Rebase, recover lost work, and handle pull requests calmly. Become the person others ask.</p>
            </div>
          </div>
        </section>

        <section className="blk" id="how" aria-labelledby="how-title">
          <div className="wrap">
            <h2 id="how-title" className="h2">Short lessons that end with you doing the thing.</h2>
            <p className="sub">Each lesson takes a few minutes and works the same way, so you always know what to expect.</p>
            <div className="how">
              <ol className="steps">
                <li>
                  <h3>Understand the idea</h3>
                  <p>A few sentences on what the command does and why teams care, in plain words.</p>
                </li>
                <li>
                  <h3>Type it yourself</h3>
                  <p>Use real Git commands in a practice terminal. Any correct approach counts, not just one exact answer.</p>
                </li>
                <li>
                  <h3>See what changed</h3>
                  <p>The repo map redraws as you type, so commits, branches and merges stop being invisible.</p>
                </li>
                <li>
                  <h3>Get unstuck fast</h3>
                  <p>
                    Ask for a hint, or have it show you the command. Type <CommandPill cmd="status" /> by mistake and it asks if you meant <CommandPill cmd="git status" />.
                  </p>
                </li>
              </ol>
              <LessonShot />
            </div>
          </div>
        </section>

        <section className="blk course" id="course" aria-labelledby="course-title">
          <div className="wrap">
            <h2 id="course-title" className="h2">From your first commit to your first merged pull request.</h2>
            <p className="sub">Go in order or jump to what you need. Every lesson is open, and your progress is saved in your browser.</p>
            <CourseRail />
            <div className="guides">
              <span className="gicon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="12" rx="2" />
                  <path d="M8 20h8M12 16v4" />
                </svg>
              </span>
              <p>
                <b>Plus guides for your own computer.</b> Install Git, set your name, and sign in to GitHub on macOS or Windows, so your first real push just works.
              </p>
              <Link className="btn btn-s btn-sm" to="/guides">
                See the guides
              </Link>
            </div>
          </div>
        </section>

        <section className="priv" id="privacy" aria-labelledby="privacy-title">
          <div className="wrap">
            <div>
              <h2 id="privacy-title" className="h2">Learn in private. We couldn't watch if we wanted to.</h2>
              <p className="sub">TermTrek has no server and no sign-in. Your lessons run entirely in your browser, and the code is public so anyone can check.</p>
            </div>
            <dl>
              <div>
                <dt><Tick size={11} />No account</dt>
                <dd>Open the site and start. There's nothing to sign up for and no email to hand over.</dd>
              </div>
              <div>
                <dt><Tick size={11} />No tracking cookies</dt>
                <dd>No ads, no cookies, and nothing that follows you around the web. We only see anonymous page-visit counts from Cloudflare's privacy-first analytics.</dd>
              </div>
              <div>
                <dt><Tick size={11} />Progress stays on your device</dt>
                <dd>Your finished lessons are saved in your browser. Download a backup file to pick up on another computer.</dd>
              </div>
              <div>
                <dt><Tick size={11} />Open source</dt>
                <dd>Free under the GPL-3.0 license. Read the code, suggest a lesson, or run your own copy.</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="end" aria-labelledby="end-title">
          <div className="wrap">
            <h2 id="end-title" className="h2">Your next commit could be your first.</h2>
            <p className="sub">The first lesson takes about five minutes.</p>
            <Link className="btn btn-p" to="/learn">
              Start the course
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-foot">
        <div className="wrap">
          <span className="foot-logo">
            <Logo size={24} />
            TermTrek
          </span>
          <span>Free and open source under GPL-3.0</span>
          <nav aria-label="Footer">
            <a href="#course">Course</a>
            <Link to="/playground">Playground</Link>
            <a href="#privacy">Privacy</a>
            <a href={SOURCE}>Source code</a>
          </nav>
        </div>
      </footer>
    </>
  )
}
