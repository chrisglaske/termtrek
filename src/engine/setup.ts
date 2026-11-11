import type { World, WorldSetup } from './types';
import { createWorld } from './world';
import { runLine } from './interpreter';

/** createWorld plus the scripted `run` lines. Throws when a line fails, so authoring mistakes fail tests. */
export function buildWorld(setup: WorldSetup = {}): World {
  let world = createWorld(setup);
  for (const line of setup.run ?? []) {
    const result = runLine(world, line);
    if (result.exitCode !== 0) throw new Error(`setup line failed: ${line}`);
    world = result.world;
  }
  return world;
}
