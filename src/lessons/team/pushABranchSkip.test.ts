import { initRunner, runnerReducer } from '../runner'
import type { RunnerAction } from '../runner'
import { pushABranch } from './push-a-branch'

const run = (line: string): RunnerAction => ({ type: 'run', line })

describe('push-a-branch skipping ahead', () => {
  it('passes the plain-push step when the learner already pushed with -u', () => {
    let s = initRunner(pushABranch)
    for (const step of pushABranch.steps.slice(0, 4)) {
      for (const line of step.solution) s = runnerReducer(s, run(line))
      s = runnerReducer(s, { type: 'next' })
    }
    expect(pushABranch.steps[s.stepIndex]!.id).toBe('push-fails')
    s = runnerReducer(s, run('git push -u origin homepage'))
    expect(s.status).toBe('step-done')
  })
})
