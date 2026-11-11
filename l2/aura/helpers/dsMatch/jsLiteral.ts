/// <mls fileReference="_102020_/l2/aura/helpers/dsMatch/jsLiteral.ts" enhancement="_blank" />

// Read a JS literal (objects, arrays, strings, numbers, true/false/null) from source text without
// evaluating it — the editor may reformat a data file (unquoted keys, single quotes, trailing
// commas, comments), and `eval`/`new Function` is not available under a CSP without unsafe-eval.
// Anything that is not a plain literal (a call, a variable, a template with `${}`) is refused.

export function parseJsLiteral(text: string): unknown {
  let i = 0;
  const fail = (what: string): never => { throw new Error(`[jsLiteral] ${what} at ${i}`); };

  const skip = (): void => {
    for (;;) {
      const ch = text[i];
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') { i++; continue; }
      if (ch === '/' && text[i + 1] === '/') { while (i < text.length && text[i] !== '\n') i++; continue; }
      if (ch === '/' && text[i + 1] === '*') { const end = text.indexOf('*/', i + 2); if (end < 0) fail('open comment'); i = end + 2; continue; }
      return;
    }
  };

  const str = (): string => {
    const quote = text[i++];
    let out = '';
    while (i < text.length && text[i] !== quote) {
      let ch = text[i++];
      if (quote === '`' && ch === '$' && text[i] === '{') fail('template expression');
      if (ch === '\\') {
        const esc = text[i++];
        const map: Record<string, string> = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', '0': '\0' };
        if (esc === 'u') {
          const hex = text[i] === '{' ? text.slice(i + 1, text.indexOf('}', i)) : text.slice(i, i + 4);
          i += text[i] === '{' ? hex.length + 2 : 4;
          ch = String.fromCodePoint(parseInt(hex, 16));
        } else if (esc === 'x') {
          ch = String.fromCharCode(parseInt(text.slice(i, i + 2), 16));
          i += 2;
        } else if (esc === '\n') {
          ch = '';
        } else {
          ch = map[esc] ?? esc;
        }
      }
      out += ch;
    }
    if (text[i] !== quote) fail('open string');
    i++;
    return out;
  };

  const ident = (): string => {
    const m = /^[A-Za-z_$][\w$]*/.exec(text.slice(i));
    if (!m) fail('expected a name');
    i += m![0].length;
    return m![0];
  };

  const value = (): unknown => {
    skip();
    const ch = text[i];
    if (ch === '{') {
      i++;
      const obj: Record<string, unknown> = {};
      for (;;) {
        skip();
        if (text[i] === '}') { i++; return obj; }
        const key = text[i] === '"' || text[i] === "'" || text[i] === '`' ? str()
          : /[0-9]/.test(text[i]) ? String(num()) : ident();
        skip();
        if (text[i++] !== ':') fail('expected :');
        obj[key] = value();
        skip();
        if (text[i] === ',') { i++; continue; }
        if (text[i] === '}') { i++; return obj; }
        fail('expected , or }');
      }
    }
    if (ch === '[') {
      i++;
      const arr: unknown[] = [];
      for (;;) {
        skip();
        if (text[i] === ']') { i++; return arr; }
        arr.push(value());
        skip();
        if (text[i] === ',') { i++; continue; }
        if (text[i] === ']') { i++; return arr; }
        fail('expected , or ]');
      }
    }
    if (ch === '"' || ch === "'" || ch === '`') return str();
    if (ch === '-' || ch === '+' || ch === '.' || /[0-9]/.test(ch ?? '')) return num();
    const word = ident();
    if (word === 'true') return true;
    if (word === 'false') return false;
    if (word === 'null') return null;
    if (word === 'undefined') return undefined;
    return fail(`not a literal: ${word}`);
  };

  const num = (): number => {
    const m = /^[+-]?(0[xX][0-9a-fA-F]+|(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?)/.exec(text.slice(i));
    if (!m) fail('bad number');
    i += m![0].length;
    return Number(m![0]);
  };

  const result = value();
  skip();
  if (i < text.length) fail('trailing text');
  return result;
}
