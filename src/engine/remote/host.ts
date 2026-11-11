import type { OutLine, Remote, World } from '../types';
import { err } from '../shell/fs';

export const HOST = 'https://git.example.com';

export function remoteUrl(slug: string): string {
  return `${HOST}/${slug}.git`;
}

/** The URL without a trailing slash or `.git`. */
export function fromUrl(url: string): string {
  return url.replace(/\/+$/, '').replace(/\.git$/, '').replace(/\/+$/, '');
}

export function findRemote(world: World, url: string): Remote | null {
  const remote = world.remote;
  if (!remote) return null;
  return fromUrl(url) === fromUrl(remote.url) ? remote : null;
}

export function repoNotFound(url: string): OutLine[] {
  return [err('remote: Repository not found.'), err(`fatal: repository '${url}/' not found`)];
}
