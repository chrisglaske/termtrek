import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Nav } from '../layout/Nav'
import { Logo } from '../layout/Logo'
import { ISSUES_URL, SOURCE_URL } from '../layout/links'
import { BackupDialog } from '../BackupDialog'
import { useDocumentTitle } from '../layout/useDocumentTitle'
import { HeroDemo } from './HeroDemo'
import { CourseRail } from './CourseRail'
import { Faq } from './Faq'
import { HowItWorks } from './LessonPreview'
import { courseStats, formatHoursShort } from '../../lessons/courseStats'
import '../buttons.css'
import './Landing.css'

function Tick({ size = 10 }: { size?: number }): React.JSX.Element {
  return (
    <span className="tick" aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 12 12">
        <path d="M2.5 6.3l2.2 2.2L9.5 3.7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

export function Landing(): React.JSX.Element {
  useDocumentTitle('TermTrek: learn Git by using it')
  const { hash } = useLocation()
  const stats = courseStats()
  const [backup, setBackup] = useState(false)
  const backupButton = useRef<HTMLButtonElement>(null)

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
                <span>See what Git</span> <span>is doing.</span>
              </h1>
              <p className="lede">
                <strong>Learn Git by using it.</strong> Type real commands and watch your project's history change on the map. A free, hands-on course in your browser, from your first commit to your first merged pull request.
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
            <HowItWorks />
          </div>
        </section>

        <section className="blk course" id="course" aria-labelledby="course-title">
          <div className="wrap">
            <h2 id="course-title" className="h2">From your first commit to your first merged pull request.</h2>
            <p className="sub">Go in order or jump to what you need. Every lesson is open, and your progress is saved in your browser.</p>
            <ul className="stats" role="list" aria-label="Course size">
              <li>
                <b>{stats.lessons}</b>{' '}lessons
              </li>
              <li>
                <b>{formatHoursShort(stats.minutes)}</b>{' '}at your own pace
              </li>
              <li>
                <b>{stats.live}</b>{' '}sections live, {stats.later} coming
              </li>
            </ul>
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

        <Faq />

        <section className="priv" id="privacy" aria-labelledby="privacy-title">
          <div className="wrap">
            <div>
              <h2 id="privacy-title" className="h2">Learn in private.</h2>
              <p className="sub">No sign-in and no account. Your lessons run entirely in your browser, and all we see is an anonymous count of page visits. The code is public, so anyone can check.</p>
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
                <dd>Free under the AGPL-3.0 license. Read the code, suggest a lesson, or run your own copy.</dd>
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
          <div className="fg">
            <div>
              <span className="foot-logo">
                <Logo size={24} />
                TermTrek
              </span>
              <p>A free, hands-on Git course that runs in your browser. No account, no tracking cookies.</p>
            </div>
            <nav aria-labelledby="foot-learn">
              <h2 id="foot-learn">Learn</h2>
              <a href="#course">Course</a>
              <Link to="/playground">Playground</Link>
              <Link to="/guides">Guides</Link>
            </nav>
            <nav aria-labelledby="foot-project">
              <h2 id="foot-project">Project</h2>
              <a href={SOURCE_URL}>Source on GitHub</a>
              <a href={ISSUES_URL}>Report a problem</a>
              <a href={ISSUES_URL}>Suggest a lesson</a>
            </nav>
            <nav aria-labelledby="foot-about">
              <h2 id="foot-about">About</h2>
              <a href="#privacy">Privacy</a>
              <a href={`${SOURCE_URL}/blob/main/LICENSE`}>License (AGPL-3.0)</a>
              <button ref={backupButton} type="button" onClick={() => setBackup(true)}>
                Back up progress
              </button>
            </nav>
          </div>
          <div className="fine">
            <span>© 2026 TermTrek · Free and open source</span>
            <span>Made for people learning Git, at any level.</span>
          </div>
        </div>
      </footer>
      {backup && <BackupDialog returnFocusTo={backupButton} onClose={() => setBackup(false)} />}
    </>
  )
}
