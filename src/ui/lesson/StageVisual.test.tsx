import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { createWorld } from '../../engine/world'
import { runLine } from '../../engine/interpreter'
import { firstCommit } from '../../lessons/foundations/first-commit'
import { StageVisual } from './StageVisual'

// Where things sit on screen: the page scroll moves everything; a chip in the Staged box sits 200px to the right.
let scroll = 0
const rect = (left: number, top: number) => ({ left, top, right: left + 100, bottom: top + 20, width: 100, height: 20, x: left, y: top, toJSON: () => ({}) })

describe('StageVisual file changes', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    scroll = 0
  })

  const setup = () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return rect(this.closest('.sv-staged') && this.dataset.fly ? 200 : 0, 300 - scroll)
    })
    const animate = vi.fn((..._args: unknown[]) => ({ onfinish: null, oncancel: null }))
    HTMLElement.prototype.animate = animate as unknown as HTMLElement['animate']
    return animate
  }

  it('does not fly the chips when only the page scrolled', () => {
    const animate = setup()
    const world = createWorld(firstCommit.setup)
    const { rerender } = render(<StageVisual world={world} show={['folder', 'staged']} />)
    scroll = 400
    rerender(<StageVisual world={world} show={['folder', 'staged']} hot="folder" />)
    expect(animate).not.toHaveBeenCalled()
  })

  it('keeps a chip still when only its box shifted', () => {
    const animate = setup()
    const world = createWorld(firstCommit.setup)
    const { rerender } = render(<StageVisual world={world} show={['folder', 'staged']} />)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return rect(0, this.dataset.fly ? 312 : 300)
    })
    rerender(<StageVisual world={world} show={['folder', 'staged']} hot="folder" />)
    expect(animate).not.toHaveBeenCalled()
  })

  it('fades a file out of the Folder and into Staged when it is staged, even after a scroll', () => {
    const animate = setup()
    const world = createWorld(firstCommit.setup)
    const { container, rerender } = render(<StageVisual world={world} show={['folder', 'staged']} />)
    scroll = 250
    rerender(<StageVisual world={runLine(world, 'git add notes.txt').world} show={['folder', 'staged']} />)
    const leaving = container.querySelector('.sv-folder .sv-leaving')
    expect(leaving?.textContent).toContain('notes.txt')
    expect(leaving?.getAttribute('aria-hidden')).toBe('true')
    const arrived = container.querySelector('.sv-staged [data-fly]')
    const fadeIn = animate.mock.contexts.indexOf(arrived as never)
    expect(fadeIn).toBeGreaterThanOrEqual(0)
    const [frames] = animate.mock.calls[fadeIn] as [Keyframe[]]
    expect(frames[0]?.opacity).toBe(0)
    expect(animate.mock.calls.every(([f]) => !(f as Keyframe[]).some((k) => String(k.transform ?? '').includes('translate(-')))).toBe(true)
  })
})

describe('StageVisual ignored files', () => {
  it('strikes the file name but not its "ignored" tag', () => {
    let world = createWorld(firstCommit.setup)
    world = runLine(world, 'touch debug.log').world
    world = runLine(world, 'echo "debug.log" > .gitignore').world
    const { container } = render(<StageVisual world={world} show={['folder', 'staged']} />)
    const row = container.querySelector('.sv-ignored')!
    expect(row).not.toBeNull()
    expect(row.querySelector('s')).toHaveTextContent('debug.log')
    expect(row.querySelector('s .sv-tag')).toBeNull()
    expect(row.querySelector('.sv-tag')).toHaveTextContent('ignored')
  })
})
