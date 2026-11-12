interface Rule { negate: boolean; dirOnly: boolean; re: RegExp }

function globToRegex(glob: string): string {
  let out = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]!;
    if (c === '*') {
      if (glob[i + 1] === '*') {
        if (glob[i + 2] === '/') {
          out += '(?:.*/)?';
          i += 2;
        } else {
          out += '.*';
          i += 1;
        }
      } else out += '[^/]*';
    } else if (c === '?') out += '[^/]';
    else out += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return out;
}

function parseRule(raw: string): Rule | null {
  let line = raw.replace(/\r$/, '').replace(/(?<!\\)\s+$/, '');
  if (line === '' || line.startsWith('#')) return null;
  let negate = false;
  if (line.startsWith('!')) {
    negate = true;
    line = line.slice(1);
  }
  let dirOnly = false;
  if (line.endsWith('/')) {
    dirOnly = true;
    line = line.replace(/\/+$/, '');
  }
  if (line === '') return null;
  const anchored = line.startsWith('/') || line.slice(0, -1).includes('/');
  if (line.startsWith('/')) line = line.slice(1);
  const body = globToRegex(line);
  const re = new RegExp(anchored ? `^${body}$` : `(?:^|/)${body}$`);
  return { negate, dirOnly, re };
}

/** Last matching rule wins for one path; null when no rule matches. */
function verdict(rules: Rule[], path: string, isDir: boolean): boolean | null {
  let result: boolean | null = null;
  for (const r of rules) {
    if (r.dirOnly && !isDir) continue;
    if (r.re.test(path)) result = !r.negate;
  }
  return result;
}

/** Whether a repo-relative file path is ignored. An ignored parent directory ignores everything inside. */
export function isIgnored(patterns: string[], relPath: string): boolean {
  const rules = patterns.map(parseRule).filter((r): r is Rule => r !== null);
  if (rules.length === 0) return false;
  const parts = relPath.split('/').filter(Boolean);
  for (let i = 1; i <= parts.length; i++) {
    const isDir = i < parts.length;
    if (verdict(rules, parts.slice(0, i).join('/'), isDir) === true) return true;
  }
  return false;
}
