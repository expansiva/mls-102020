/// <mls fileReference="_102020_/l2/agentMaterializeL2v3/helpers/m3TsLineBreaks.ts" enhancement="_blank"/>

// ---------------------------------------------------------------------------
// Deterministic line breaks for generated code (cf_format_codigo_gerado, 27/ago).
//
// run02/102047: taskCatalogue.ts came back as 13KB in 35 lines (whole render* methods on one
// 3.6K-char line) while its siblings came back formatted — per-call LLM variation, so the model's
// output cannot be the only source of formatting. The TypeScript formatter (Monaco formatDocument
// and the ts languageService alike) only edits EXISTING whitespace — it never splits a jammed line —
// so both runtimes first run this pure pass, then hand indentation to their formatter
// (formatGeneratedTsInStudio / formatGeneratedTsCli).
//
// Whitespace-only BY CONSTRUCTION: it only inserts '\n' between tokens and drops the spaces the
// break replaces — never inside a string, template text, comment or regex, so the AST is identical
// (proven in nodejsFormatTs.test.ts) and the i18n markers stay recognizable by @@addLanguage.
// Conservative: any construct the scanner cannot classify (unterminated literal, unbalanced
// braces) returns the input UNCHANGED — an unformatted file is a degraded result, a broken one is
// a defect.
// ---------------------------------------------------------------------------

/** Brace groups whose single-line span is at most this stay inline (`{ page: 1 }`); longer ones break. */
const LINE_BREAK_MAX_INLINE_SPAN = 100;

interface LineBreakFrame {
  kind: 'block' | 'literal' | 'sub';
  open: number;
  paren: number;
  bracket: number;
  /** Candidate member separators (after `,`/`;`), committed only when the frame qualifies. */
  separators: number[];
}

const REGEX_CONTEXT_WORDS = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);
const NO_BREAK_AFTER_BLOCK_WORDS = new Set(['else', 'catch', 'finally', 'while', 'instanceof', 'in', 'of', 'as', 'satisfies']);

export function insertGeneratedTsLineBreaks(source: string): string {
  const n = source.length;
  const committed: number[] = [];
  const commit = (pos: number) => { committed.push(pos); };
  const committedInside = (open: number, close: number) => committed.some(pos => pos > open && pos < close);

  const root: LineBreakFrame = { kind: 'block', open: -1, paren: 0, bracket: 0, separators: [] };
  const frames: LineBreakFrame[] = [root];
  const mode: Array<'code' | 'template'> = ['code'];
  let lastSig = '';
  let lastWord = '';
  let i = 0;

  const closeBraceFrame = (frame: LineBreakFrame, closeIdx: number): boolean => {
    if (frame.paren !== 0 || frame.bracket !== 0) return false;
    const empty = source.slice(frame.open + 1, closeIdx).trim() === '';
    const qualifies = !empty && (closeIdx - frame.open > LINE_BREAK_MAX_INLINE_SPAN || committedInside(frame.open, closeIdx));
    if (!qualifies) return true;
    commit(frame.open + 1);
    commit(closeIdx);
    for (const pos of frame.separators) commit(pos);
    if (frame.kind === 'block') {
      // A new member/statement jammed right after the `}` gets its own line — but never split
      // `} else {`, `}.then(`, `})`, `};` and friends, where the `}` does not end the construct.
      let after = closeIdx + 1;
      while (after < n && (source[after] === ' ' || source[after] === '\t')) after++;
      if (after < n && /[A-Za-z_$@]/u.test(source[after])) {
        let end = after;
        while (end < n && /[A-Za-z0-9_$]/u.test(source[end])) end++;
        if (!NO_BREAK_AFTER_BLOCK_WORDS.has(source.slice(after, end))) commit(closeIdx + 1);
      }
    }
    return true;
  };

  while (i < n) {
    if (mode[mode.length - 1] === 'template') {
      const ch = source[i];
      if (ch === '\\') { i += 2; continue; }
      if (ch === '`') { mode.pop(); lastSig = '`'; lastWord = ''; i++; continue; }
      if (ch === '$' && source[i + 1] === '{') {
        mode.push('code');
        frames.push({ kind: 'sub', open: i + 1, paren: 0, bracket: 0, separators: [] });
        lastSig = '{'; lastWord = '';
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    const ch = source[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') { i++; continue; }

    if (/[A-Za-z0-9_$]/u.test(ch)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_$]/u.test(source[j])) j++;
      lastWord = source.slice(i, j);
      lastSig = source[j - 1];
      i = j;
      continue;
    }

    if (ch === '/' && source[i + 1] === '/') {
      while (i < n && source[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      if (end < 0) return source;
      i = end + 2;
      continue;
    }

    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < n && source[j] !== ch) {
        if (source[j] === '\\') { j += 2; continue; }
        if (source[j] === '\n') return source;
        j++;
      }
      if (j >= n) return source;
      lastSig = ch; lastWord = '';
      i = j + 1;
      continue;
    }

    if (ch === '`') { mode.push('template'); lastSig = ''; lastWord = ''; i++; continue; }

    if (ch === '/') {
      const valueBefore = /[A-Za-z0-9_$)\]"'`]/u.test(lastSig) && !REGEX_CONTEXT_WORDS.has(lastWord);
      if (!valueBefore) {
        let j = i + 1;
        let inClass = false;
        while (j < n) {
          const c = source[j];
          if (c === '\\') { j += 2; continue; }
          if (c === '\n') return source;
          if (inClass) { if (c === ']') inClass = false; }
          else if (c === '[') inClass = true;
          else if (c === '/') break;
          j++;
        }
        if (j >= n) return source;
        j++;
        while (j < n && /[a-z]/iu.test(source[j])) j++;
        lastSig = '"'; lastWord = '';
        i = j;
        continue;
      }
      lastSig = '/'; lastWord = '';
      i++;
      continue;
    }

    const frame = frames[frames.length - 1];
    if (ch === '(') frame.paren++;
    else if (ch === ')') { frame.paren--; if (frame.paren < 0) return source; }
    else if (ch === '[') frame.bracket++;
    else if (ch === ']') { frame.bracket--; if (frame.bracket < 0) return source; }
    else if (ch === '{') {
      const literal = ['=', '(', '[', ',', ':', '?', '&', '|'].includes(lastSig) || lastWord === 'return';
      frames.push({ kind: literal ? 'literal' : 'block', open: i, paren: 0, bracket: 0, separators: [] });
    } else if (ch === '}') {
      const closed = frames.pop();
      if (!closed || closed === root) return source;
      if (closed.kind === 'sub') {
        if (closed.paren !== 0 || closed.bracket !== 0) return source;
        mode.pop();
        if (mode[mode.length - 1] !== 'template') return source;
        i++;
        continue;
      }
      if (!closeBraceFrame(closed, i)) return source;
    } else if (ch === ';') {
      if (frame.paren === 0 && frame.bracket === 0) {
        if (frame.kind === 'block') commit(i + 1);
        else if (frame.kind === 'literal') frame.separators.push(i + 1);
      }
    } else if (ch === ',') {
      if (frame.kind === 'literal' && frame.paren === 0 && frame.bracket === 0) frame.separators.push(i + 1);
    }

    lastSig = ch; lastWord = '';
    i++;
  }

  if (frames.length !== 1 || mode.length !== 1) return source;

  const positions = [...new Set(committed)].sort((left, right) => left - right);
  const merged = positions.filter((pos, index) => {
    const next = positions[index + 1];
    return next === undefined || source.slice(pos, next).trim() !== '';
  });
  const finalPositions = merged.filter(pos => {
    let back = pos - 1;
    while (back >= 0 && (source[back] === ' ' || source[back] === '\t')) back--;
    if (back < 0 || source[back] === '\n') return false;
    let ahead = pos;
    while (ahead < n && (source[ahead] === ' ' || source[ahead] === '\t')) ahead++;
    return ahead < n && source[ahead] !== '\n';
  });
  if (!finalPositions.length) return source;

  let out = '';
  let prev = 0;
  for (const pos of finalPositions) {
    out += source.slice(prev, pos).replace(/[ \t]+$/u, '');
    out += '\n';
    prev = pos;
    while (prev < n && (source[prev] === ' ' || source[prev] === '\t')) prev++;
  }
  out += source.slice(prev);

  // Whitespace-only by construction; this seals it against any scanner bug — on ANY doubt, unformatted.
  return stripAllWhitespace(out) === stripAllWhitespace(source) ? out : source;
}

/** Whitespace-blind view of a source, the byte-safety guard both formatters compare against. */
export function stripAllWhitespace(text: string): string {
  return text.replace(/\s+/gu, '');
}
