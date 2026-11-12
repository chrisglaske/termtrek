export interface DiffLine { op: ' ' | '+' | '-'; text: string }

export function splitLines(s: string): string[] {
  if (s === '') return [];
  const parts = s.split('\n');
  if (parts[parts.length - 1] === '') parts.pop();
  return parts;
}

/** LCS-based line diff; deletions come before insertions within a changed run. */
export function lineDiff(a: string, b: string): DiffLine[] {
  const x = splitLines(a);
  const y = splitLines(b);
  const n = x.length;
  const m = y.length;
  if (n * m > 4_000_000) {
    return [...x.map((text) => ({ op: '-' as const, text })), ...y.map((text) => ({ op: '+' as const, text }))];
  }
  const w = m + 1;
  const dp = new Uint32Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i * w + j] = x[i] === y[j] ? dp[(i + 1) * w + j + 1]! + 1 : Math.max(dp[(i + 1) * w + j]!, dp[i * w + j + 1]!);
    }
  }
  const res: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (x[i] === y[j]) {
      res.push({ op: ' ', text: x[i]! });
      i++;
      j++;
    } else if (dp[(i + 1) * w + j]! >= dp[i * w + j + 1]!) {
      res.push({ op: '-', text: x[i++]! });
    } else {
      res.push({ op: '+', text: y[j++]! });
    }
  }
  while (i < n) res.push({ op: '-', text: x[i++]! });
  while (j < m) res.push({ op: '+', text: y[j++]! });
  return res;
}
