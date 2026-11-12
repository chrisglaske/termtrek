import type { World, WorldSetup } from './types';
import { createWorld } from './world';
import { runLine } from './interpreter';
import { createRemote } from './remote/model';

/** createWorld plus the scripted `run` lines. Throws when a line fails, so authoring mistakes fail tests. */
export function buildWorld(setup: WorldSetup = {}): World {
  let world = createWorld(setup);
  if (setup.remote) {
    const made = createRemote(setup.remote, world.seq);
    world = { ...world, remote: made.remote, seq: made.seq };
  }
  for (const line of setup.run ?? []) {
    if (typeof line === 'function') {
      world = line(world);
      continue;
    }
    const result = runLine(world, line);
    if (result.exitCode !== 0) throw new Error(`setup line failed: ${line}`);
    world = result.world;
  }
  return world;
}
