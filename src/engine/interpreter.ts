import type { Explain, OutLine, RunResult, World } from './types';
import { registry } from './registry';
import { resolvePath } from './paths';
import { tokenize } from './tokenize';
import { expandGlob } from './glob';
import type { Token } from './tokenize';
import { didYouMean } from './suggest';
import { err, insideHome, isDir, parentOf } from './shell/fs';
import { EDITOR_WAITING } from './git/editor';

interface Segment {
  /** How this segment was joined to the previous one: `&&` runs only after success, `;` always runs. */
  after: '&&' | ';' | null;
  words: string[];
  /** Indexes into `words` that held an unquoted wildcard; expanded when the segment runs. */
  globs: Set<number>;
  redirect?: { op: '>' | '>>'; target: string };
}

const syntax = (tok: string): string => `bash: syntax error near unexpected token \`${tok}'`;

const PIPES = "termtrek: pipes (|) aren't supported here";

function parse(tokens: Token[]): { ok: true; segments: Segment[] } | { ok: false; message: string; code: number } {
  const segments: Segment[] = [];
  let cur: Segment = { after: null, words: [], globs: new Set() };
  let started = false; // current segment has any word or redirect
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.kind === 'word') {
      if (t.glob) cur.globs.add(cur.words.length);
      cur.words.push(t.value);
      started = true;
    } else if (t.value === '|') {
      return { ok: false, message: PIPES, code: 1 };
    } else if (t.value === '&&' || t.value === ';') {
      if (!started) return { ok: false, message: syntax(t.value), code: 2 };
      segments.push(cur);
      cur = { after: t.value, words: [], globs: new Set() };
      started = false;
    } else {
      const next = tokens[i + 1];
      if (!next) return { ok: false, message: syntax('newline'), code: 2 };
      if (next.kind === 'op') return { ok: false, message: next.value === '|' ? PIPES : syntax(next.value), code: next.value === '|' ? 1 : 2 };
      cur.redirect = { op: t.value, target: next.value };
      started = true;
      i++;
    }
  }
  if (tokens.length > 0) {
    // A trailing `;` is fine in bash; a trailing `&&` is not.
    if (!started && cur.after === '&&') return { ok: false, message: syntax('newline'), code: 2 };
    if (!started && cur.after === null) return { ok: false, message: syntax('newline'), code: 2 };
    if (started) segments.push(cur);
  }
  return { ok: true, segments };
}

const fail = (world: World, message: string, exitCode: number): RunResult => ({
  world,
  lines: [err(message)],
  exitCode,
});

const quote = (w: string): string => (w === '' || /[\s"']/.test(w) ? `"${w.replace(/"/g, '\\"')}"` : w);

function suggestion(words: string[], rawLine?: string): Explain | undefined {
  const fix = didYouMean(rawLine ?? words.map(quote).join(' '));
  if (!fix) return undefined;
  const bare = words[0] !== 'git' && fix.startsWith('git ');
  return {
    kind: 'warn',
    text: bare
      ? `Did you mean \`${fix}\`? Git commands always start with **git**.`
      : `Did you mean \`${fix}\`? Click it to run it.`,
  };
}

function runUnsafe(start: World, line: string): RunResult {
  const tk = tokenize(line);
  if (!tk.ok) return fail(start, `bash: ${tk.error}`, 2);
  const parsed = parse(tk.tokens);
  if (!parsed.ok) return fail(start, parsed.message, parsed.code);

  let world = start;
  const lines: OutLine[] = [];
  let explain: Explain | undefined;
  let clear = false;
  let open: string | undefined;
  let exitCode = 0;

  for (const seg of parsed.segments) {
    if (seg.after === '&&' && exitCode !== 0) continue;
    // Like bash, expand wildcards when this command runs, against the world as the earlier commands left it.
    const words = seg.words.flatMap((w, i) => {
      if (!seg.globs.has(i)) return [w];
      const hits = expandGlob(world, w);
      return hits.length > 0 ? hits : [w];
    });
    const [name, ...args] = words;
    let segLines: OutLine[] = [];
    let segCode = 0;
    if (name !== undefined) {
      const fn = Object.prototype.hasOwnProperty.call(registry, name) ? registry[name] : undefined;
      if (!fn) {
        segLines = [err(`bash: ${name}: command not found`)];
        segCode = 127;
        explain = suggestion(words, parsed.segments.length === 1 ? line : undefined) ?? explain;
      } else {
        const r = fn(world, args, {});
        if (r.world) world = r.world;
        segLines = r.lines;
        segCode = r.exitCode;
        if (r.explain) explain = r.explain;
        else if (name === 'git' && r.exitCode === 1 && /is not a git command/.test(r.lines[0]?.[0]?.text ?? '')) {
          explain = suggestion(words, parsed.segments.length === 1 ? line : undefined) ?? explain;
        }
        if (r.clear) clear = true;
        if (r.open) open = r.open;
      }
    }
    if (seg.redirect) {
      const { op, target } = seg.redirect;
      const abs = resolvePath(world, target);
      const stdout = segLines.filter((l) => !l.some((s) => s.tone === 'error'));
      const errors = segLines.filter((l) => l.some((s) => s.tone === 'error'));
      let problem: string | null = null;
      if (isDir(world, abs)) problem = 'Is a directory';
      else if (!insideHome(world, abs)) problem = 'Permission denied';
      else if (!isDir(world, parentOf(abs))) problem = 'No such file or directory';
      if (problem) {
        segLines = [...errors, err(`bash: ${target}: ${problem}`)];
        segCode = 1;
      } else {
        const body = stdout.map((l) => l.map((s) => s.text).join('') + '\n').join('');
        const prev = op === '>>' ? (world.files[abs] ?? '') : '';
        world = { ...world, files: { ...world.files, [abs]: prev + body } };
        segLines = errors;
      }
    }
    lines.push(...segLines);
    exitCode = segCode;
  }
  const result: RunResult = { world, lines, exitCode };
  if (explain) result.explain = explain;
  if (clear) result.clear = true;
  if (open) result.open = open;
  return result;
}

export function runLine(world: World, line: string): RunResult {
  if (world.pending) {
    return { world, lines: [[{ text: EDITOR_WAITING, tone: 'muted' }]], exitCode: 1 };
  }
  try {
    return runUnsafe(world, line);
  } catch {
    return fail(world, 'bash: internal error', 1);
  }
}
