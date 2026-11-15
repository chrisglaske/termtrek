import { initRunner, runnerReducer } from '../runner'
import type { RunnerAction } from '../runner'
import { updateYourBranch } from './update-your-branch'

const run = (line: string): RunnerAction => ({ type: 'run', line })

function toAddStep() {
  let s = initRunner(updateYourBranch)
  for (const step of updateYourBranch.steps) {
    if (step.id === 'add') break
    for (const a of step.solve ?? step.solution.map(run)) s = runnerReducer(s, a)
    s = runnerReducer(s, { type: 'next' })
  }
  return s
}

describe('update-your-branch: marking the conflict fixed', () => {
  it('does not accept an add that failed or staged another file', () => {
    let s = toAddStep()
    expect(updateYourBranch.steps[s.stepIndex]!.id).toBe('add')
    s = runnerReducer(s, run('git add nope.txt'))
    expect(s.status).not.toBe('step-done')
    s = runnerReducer(s, run('git add agenda.txt'))
    expect(s.status).toBe('step-done')
  })
})
