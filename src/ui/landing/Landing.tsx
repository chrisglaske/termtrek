import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Nav } from '../layout/Nav'
import { Logo } from '../layout/Logo'
import { ISSUES_URL, SOURCE_URL } from '../layout/links'
import { BackupDialog } from '../BackupDialog'
import { LANDING_TITLE } from '../../seo/staticMeta'
import { useDocumentTitle } from '../layout/useDocumentTitle'
import { HeroLesson } from './HeroLesson'
import { CourseRail } from './CourseRail'
import { Faq } from './Faq'
import { HowItWorks, HowSteps } from './LessonPreview'
import { SendToComputer } from '../phone/SendToComputer'
import { usePhone } from '../phone/usePhone'
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
  useDocumentTitle(LANDING_TITLE)
  const { hash } = useLocation()
  const stats = courseStats()
  // Phones get a shorter page to read: no live lesson, and a way to send the site to a computer.
  const phone = usePhone()
  const home = () => `${window.location.origin}/`
  const [backup, setBackup] = useState(false)
  const backupButton = useRef<HTMLButtonElement>(null)
  // "Scroll for more" is pinned to the bottom-right corner while the page sits at the top and the
  // next section is still out of sight, at every screen height. It fades out once the visitor scrolls,
  // or starts typing in the hero, where on a short screen it would cover the terminal's output.
  const [more, setMore] = useState(true)
  useEffect(() => {
    let typed = false
    const check = () => {
      const who = document.getElementById('who')
      setMore(!typed && window.scrollY < 40 && (!who || who.getBoundingClientRect().top > window.innerHeight * 0.8))
    }
    const onInput = (e: Event) => {
      if (!(e.target instanceof Element) || !e.target.closest('.hl-wrap')) return
      typed = true
      check()
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    document.addEventListener('input', onInput)
    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
      document.removeEventListener('input', onInput)
    }
  }, [])

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
                <strong>Learn Git by using it.</strong> Type real commands and see exactly what each one does to your files. A free, hands-on course in your browser, from your first commit to your first merged pull request.
              </p>
              {phone ? (
                <div className="pc">
                  <div className="pc-h">
                    <span className="pc-i" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" focusable="false">
                        <rect x="3" y="4" width="18" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                        <path d="M2 20h20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </span>
                    <div>
                      <h2 className="pc-t">Made for an iPad or a computer</h2>
                      <p>You type real commands and watch a picture change, so you'll want a keyboard and a bigger screen. Send yourself the link and start on a tablet or computer.</p>
                    </div>
                  </div>
                  <SendToComputer url={home} />
                  <p className="pc-fine">Opens your phone's share menu. Nothing is sent to us.</p>
                  <p className="pc-fine">On a computer? Make the window bigger.</p>
                </div>
              ) : (
                <div className="ctas">
                  <Link className="btn btn-p" to="/learn">
                    Start the course
                  </Link>
                  <a className="btn btn-s" href="#course">
                    See what you'll learn
                  </a>
                </div>
              )}
              <ul className="promise">
                <li><Tick />No account, no install, free forever</li>
                <li><Tick />Your progress never leaves your device</li>
                <li><Tick />Open source</li>
              </ul>
            </div>
            {!phone && <HeroLesson />}
          </div>
          {!phone && (
            <a
              className={more ? 'more' : 'more more-off'}
              href="#who"
              tabIndex={more ? undefined : -1}
              onClick={(e) => {
                // Scroll smoothly to the next section instead of jumping, and leave the address as it is.
                const who = document.getElementById('who')
                if (!who || typeof who.scrollIntoView !== 'function') return
                e.preventDefault()
                const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
                who.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' })
              }}
            >
              Scroll for more
              <svg className="more-i" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 5v14M6 13l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          )}
        </section>

        <section className="who" id="who" aria-labelledby="who-title">
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
            {phone ? <HowSteps /> : <HowItWorks />}
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
            <h2 id="end-title" className="h2">
              {phone ? "Ready when you're at your computer." : 'Your next commit could be your first.'}
            </h2>
            <p className="sub">The first lesson takes about five minutes.</p>
            {phone ? (
              <div className="end-send">
                <SendToComputer url={home} />
              </div>
            ) : (
              <Link className="btn btn-p" to="/learn">
                Start the course
              </Link>
            )}
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
              <Link to="/guides">Setup guides</Link>
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
