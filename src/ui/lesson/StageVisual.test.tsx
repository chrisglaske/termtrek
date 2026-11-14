import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { createWorld } from '../../engine/world'
import { runLine } from '../../engine/interpreter'
import { firstCommit } from '../../lessons/foundations/first-commit'
import { StageVisual } from './StageVisual'

// Where things sit on screen: the page scroll moves everything; a chip in the Staged box sits 200px to the right.
let scroll = 0
const rect = (left: number, top: number) => ({ left, top, right: left + 100, bottom: top + 20, width: 100, height: 20, x: left, y: top, toJSON: () => ({}) })

describe('StageVisual file moves', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    scroll = 0
  })

  const setup = () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return rect(this.closest('.sv-staged') && this.dataset.fly ? 200 : 0, 300 - scroll)
    })
    const animate = vi.fn()
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

  it('flies a file that really moved to Staged, even after a scroll', () => {
    const animate = setup()
    const world = createWorld(firstCommit.setup)
    const { rerender } = render(<StageVisual world={world} show={['folder', 'staged']} />)
    scroll = 250
    rerender(<StageVisual world={runLine(world, 'git add notes.txt').world} show={['folder', 'staged']} />)
    expect(animate).toHaveBeenCalled()
    const [frames] = animate.mock.calls[0] as [Keyframe[]]
    expect(frames[0]?.transform).toBe('translate(-200px, 0px)')
  })
})
