export type Token = { kind: 'word'; value: string } | { kind: 'op'; value: '&&' | ';' | '|' | '>' | '>>' };

export function tokenize(line: string): { ok: true; tokens: Token[] } | { ok: false; error: string } {
  const tokens: Token[] = [];
  let cur = '';
  let inWord = false;
  const flush = () => {
    if (inWord) tokens.push({ kind: 'word', value: cur });
    cur = '';
    inWord = false;
  };
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"' || ch === "'") {
      if (ch === "'") {
        const end = line.indexOf("'", i + 1);
        if (end === -1) return { ok: false, error: "unexpected EOF while looking for matching `''" };
        cur += line.slice(i + 1, end);
        i = end;
      } else {
        let j = i + 1;
        let closed = false;
        for (; j < line.length; j++) {
          const c = line[j]!;
          if (c === '\\' && (line[j + 1] === '"' || line[j + 1] === '\\')) {
            cur += line[j + 1];
            j++;
          } else if (c === '"') {
            closed = true;
            break;
          } else cur += c;
        }
        if (!closed) return { ok: false, error: "unexpected EOF while looking for matching `\"'" };
        i = j;
      }
      inWord = true;
    } else if (ch === '\\' && i + 1 < line.length) {
      cur += line[++i];
      inWord = true;
    } else if (ch === ' ' || ch === '\t' || ch === '\n') {
      flush();
    } else if (ch === '&' && line[i + 1] === '&') {
      flush();
      tokens.push({ kind: 'op', value: '&&' });
      i++;
    } else if (ch === ';' || ch === '|') {
      flush();
      tokens.push({ kind: 'op', value: ch });
    } else if (ch === '>') {
      flush();
      if (line[i + 1] === '>') {
        tokens.push({ kind: 'op', value: '>>' });
        i++;
      } else tokens.push({ kind: 'op', value: '>' });
    } else {
      cur += ch;
      inWord = true;
    }
  }
  flush();
  return { ok: true, tokens };
}
