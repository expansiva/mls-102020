/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i3-edit/applyEdits.ts" enhancement="_blank"/>

// Applying the model's edits. PURE: text in, text out, no I/O.
//
// WHY EDITS AND NOT A REWRITTEN FILE. The model could return the whole new artifact, and
// agentNewMolecule2 does exactly that — because it is CREATING. Here the file already works, and
// a wholesale rewrite of a 300-line molecule to change a padding puts every untouched line at
// risk. n4-render's history is the evidence: its retries came back as different, shorter files
// that failed on something else (nmFs.ts:96-106).
//
// So the model returns targeted operations, and three invariants follow FOR FREE — they are not
// checked, they are impossible to violate:
//   1. read before write — a `replace` must quote text that is really there;
//   2. untouched regions stay byte-identical, headers included;
//   3. no file outside the current project is reachable — an op names an artifact KIND, and the
//      kind resolves to a path this agent owns. On route C that is what protects the parent.
//
// A `find` that matches twice is REJECTED, not applied to the first hit. Ambiguity here means the
// model was thinking of one place and code would pick another.

import { ImArtifactKind } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';

export type ImEditOperation = 'replace' | 'append' | 'create';

export interface ImEdit {
  artifact: ImArtifactKind;
  op: ImEditOperation;
  /** Required by `replace`: the exact current text, which must occur EXACTLY ONCE. */
  find?: string;
  /** The replacement, the appended block, or the whole file on `create`. */
  content: string;
  /** One line, in the user's language. It becomes the summary the user reads. */
  why: string;
}

export interface ImFileState {
  present: boolean;
  source: string;
}

export interface ImApplyResult {
  /** kind -> the new content, for the files that actually changed. */
  changed: Map<ImArtifactKind, string>;
  errors: string[];
  /** One line per applied edit, in order — the trace of what was done. */
  applied: string[];
}

function fail(index: number, artifact: string, message: string): string {
  return `edit ${index + 1} (${artifact}): ${message}`;
}

/** A short, unambiguous quote of the failing `find`, for the retry to recognise. */
function quote(text: string, max = 60): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count++;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

/**
 * WHITESPACE-TOLERANT MATCHING, and it is not a convenience — it is the difference between this
 * step working and not working.
 *
 * MEASURED 2026-08-10, after the first real run failed on exactly this: 32 of the 153 molecules in
 * mls-102040 have COLLAPSED INDENTATION — every indented line sits at exactly ONE space, whatever
 * its nesting depth. ml-hierarchy-tree.ts is one of them: 367 lines at one space, 38 at zero.
 *
 * A code model shown ` private parseNodes() {` and told to copy it verbatim re-indents it to two or
 * four spaces. That is the strongest normalization instinct such a model has, and no amount of
 * prompt insistence reliably beats it — the first run burned both attempts on it.
 *
 * So the exact match is tried FIRST (byte-precise, the common case), and only on a miss does the
 * text get matched ignoring whitespace RUNS. The span replaced is the one really found in the file,
 * so untouched bytes stay untouched either way, and an ambiguous match is still refused.
 */
function flexiblePattern(find: string): RegExp {
  const escaped = find
    .trim()
    .split(/\s+/)
    .map(chunk => chunk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s+');
  return new RegExp(escaped, 'g');
}

interface FlexibleMatch {
  count: number;
  start: number;
  end: number;
}

export interface ImAlignedSpan {
  /** Where the replacement starts — the beginning of the anchor's LINE, not of the match. */
  start: number;
  text: string;
}

function lineStartOf(text: string, index: number): number {
  const newline = text.lastIndexOf('\n', Math.max(0, index - 1));
  return newline === -1 ? 0 : newline + 1;
}

function leadingWhitespaceOf(line: string): string {
  return (line.match(/^[ \t]*/) || [''])[0];
}

/**
 * INDENTATION IS THE FILE'S, NOT THE MODEL'S.
 *
 * ⚠️ MEASURED 2026-08-13, twice in the same molecule. The written block came out flush left:
 *
 *     private getCopyText(): string {
 *   return this.getLabelText();      // ← column 0
 *   }                                // ← column 0
 *
 * The mechanism: a match starts at the first non-whitespace character, so the anchor line's
 * indentation is never part of the span — it stays in the file and the first line looks right. Lines
 * 2..n came from the model verbatim, and the model sent them flush.
 *
 * The model was not being careless. `prompt.md` told it "indentation does not have to match", meaning
 * the `find`, and it generalised to the `content`. The second occurrence happened with "keep the
 * file's indentation" written in the user's own request — which is the week's lesson again: prose
 * asks, code imposes.
 *
 * So code imposes. The span is expanded to the start of the anchor's line, the first line of the
 * content is placed at the anchor's own indentation, and every line after it is shifted by the same
 * amount, keeping the block's RELATIVE structure exactly as the model sent it.
 *
 * What this deliberately does NOT do is invent structure. A block that arrives flush comes out
 * uniformly at the anchor's depth — consistent, no longer breaking the next run's exact match, and
 * not reformatted by guesswork. Reindenting a body one level deeper would be a formatter's job, and
 * this is a text writer.
 *
 * Returns null when there is nothing to align: single-line content (its own line prefix is already
 * the file's), or a match that begins mid-line, where the indentation is not ours to touch.
 */
export function alignReplacement(current: string, matchStart: number, content: string): ImAlignedSpan | null {
  if (!content.includes('\n')) return null;

  const start = lineStartOf(current, matchStart);
  // Anything other than whitespace before the match means it starts mid-line: `foo(bar)` where only
  // `bar` was quoted. Re-indenting there would eat real code.
  if (!/^[ \t]*$/.test(current.slice(start, matchStart))) return null;

  // The base is the ANCHOR LINE's own indentation, read from the file — not the gap before the match.
  // A `find` that quotes its own leading spaces starts AT the line break, leaving that gap empty, and
  // taking the gap as the base would shift the whole block to column 0.
  const lineEnd = current.indexOf('\n', start);
  const base = leadingWhitespaceOf(current.slice(start, lineEnd === -1 ? current.length : lineEnd));

  const lines = content.split('\n');
  const rest = lines.slice(1);
  const nonBlank = rest.filter(line => line.trim());
  const common = nonBlank.length
    ? Math.min(...nonBlank.map(line => leadingWhitespaceOf(line).length))
    : 0;

  const body = rest.map(line => (line.trim() ? base + line.slice(common) : ''));
  return { start, text: [base + lines[0].trimStart(), ...body].join('\n') };
}

function findFlexible(haystack: string, find: string): FlexibleMatch {
  const matches = [...haystack.matchAll(flexiblePattern(find))];
  const first = matches[0];
  return {
    count: matches.length,
    start: first?.index ?? -1,
    end: first ? first.index + first[0].length : -1,
  };
}

/**
 * Which artifacts a `create` may OVERWRITE, and it is opt-in for one reason.
 *
 * ⚠️ 2026-08-18, and the whole first attempt of the first route E run was spent on it. Route E is a
 * REGENERATION: the page on disk is the broken thing, so quoting `find` strings out of it is pointless
 * and i5's own instruction says "prefer op: create with the whole fragment" — which this function then
 * refused, because `create` on an existing file is exactly how i3 catches a model that lost track of
 * what exists.
 *
 * So the ban stays the default and the exception is named by the CALLER: i5 passes `['html']` only when
 * route E's integrity precondition already established the page is broken. i3 never passes anything, so
 * for the molecule's own sources — authored files, where a wholesale overwrite discards work nobody
 * recovers — nothing changed.
 */
export interface ImApplyOptions {
  overwrite?: ImArtifactKind[];
}

/**
 * Applies the edits in order onto a copy of the current files.
 *
 * Order matters and is the model's: a later `replace` sees the result of an earlier one. That is
 * what lets two edits touch neighbouring lines without one invalidating the other's `find`.
 *
 * Nothing is written on any error — the caller gets the full error list and retries the whole set.
 */
export function applyEdits(
  files: Map<ImArtifactKind, ImFileState>,
  edits: ImEdit[],
  options?: ImApplyOptions,
): ImApplyResult {
  const working = new Map<ImArtifactKind, string>();
  const touched = new Set<ImArtifactKind>();
  const errors: string[] = [];
  const applied: string[] = [];

  if (!edits.length) return { changed: new Map(), errors: ['no edits were produced'], applied };

  edits.forEach((edit, index) => {
    const state = files.get(edit.artifact);
    if (!state) {
      errors.push(fail(index, edit.artifact, `'${edit.artifact}' is not an artifact of this molecule`));
      return;
    }
    const current = working.has(edit.artifact) ? working.get(edit.artifact)! : state.source;

    if (edit.op === 'create') {
      if (state.present && !options?.overwrite?.includes(edit.artifact)) {
        errors.push(fail(index, edit.artifact, 'the file already exists — use replace or append, never create'));
        return;
      }
      if (!edit.content.trim()) {
        errors.push(fail(index, edit.artifact, 'create with empty content'));
        return;
      }
      working.set(edit.artifact, edit.content);
      touched.add(edit.artifact);
      applied.push(`${edit.artifact}: created`);
      return;
    }

    if (!state.present) {
      errors.push(fail(index, edit.artifact, `the file does not exist — ${edit.op} needs something to ${edit.op === 'append' ? 'append to' : 'find'}`));
      return;
    }

    if (edit.op === 'append') {
      if (!edit.content.trim()) {
        errors.push(fail(index, edit.artifact, 'append with empty content'));
        return;
      }
      const separator = current.endsWith('\n') ? '' : '\n';
      working.set(edit.artifact, `${current}${separator}${edit.content.replace(/\n*$/, '\n')}`);
      touched.add(edit.artifact);
      applied.push(`${edit.artifact}: appended ${edit.content.split('\n').length} line(s)`);
      return;
    }

    // replace
    const find = edit.find || '';
    if (!find) {
      errors.push(fail(index, edit.artifact, 'replace without `find`'));
      return;
    }
    if (find.trim() === edit.content.trim()) {
      errors.push(fail(index, edit.artifact, '`find` and `content` are identical — this edit changes nothing'));
      return;
    }

    const exact = countOccurrences(current, find);
    if (exact === 1) {
      const at = current.indexOf(find);
      const aligned = alignReplacement(current, at, edit.content);
      working.set(
        edit.artifact,
        aligned
          ? current.slice(0, aligned.start) + aligned.text + current.slice(at + find.length)
          : current.replace(find, () => edit.content),
      );
      touched.add(edit.artifact);
      applied.push(`${edit.artifact}: ${edit.why.trim() || 'replaced a block'}`);
      return;
    }
    if (exact > 1) {
      errors.push(
        fail(index, edit.artifact, `\`find\` occurs ${exact} times — extend it until it is unique: "${quote(find)}"`),
      );
      return;
    }

    // No exact hit. Try again ignoring whitespace runs — see flexiblePattern for why this is the
    // normal case and not the exception.
    const loose = findFlexible(current, find);
    if (loose.count === 0) {
      errors.push(
        fail(
          index,
          edit.artifact,
          `\`find\` does not occur in the file, not even ignoring whitespace — the text itself is not there: "${quote(find)}"`,
        ),
      );
      return;
    }
    if (loose.count > 1) {
      errors.push(
        fail(index, edit.artifact, `\`find\` occurs ${loose.count} times — extend it until it is unique: "${quote(find)}"`),
      );
      return;
    }

    // Only the span really found is replaced, so everything around it keeps its own bytes — the
    // file's indentation is left exactly as odd as it was. The block being written is aligned to the
    // anchor's line, which is where flush-left content used to land (see alignReplacement).
    const alignedLoose = alignReplacement(current, loose.start, edit.content);
    working.set(
      edit.artifact,
      alignedLoose
        ? current.slice(0, alignedLoose.start) + alignedLoose.text + current.slice(loose.end)
        : current.slice(0, loose.start) + edit.content.trim() + current.slice(loose.end),
    );
    touched.add(edit.artifact);
    applied.push(`${edit.artifact}: ${edit.why.trim() || 'replaced a block'} (whitespace-tolerant match)`);
  });

  if (errors.length) return { changed: new Map(), errors, applied: [] };

  // A file whose content came out identical is not reported as changed: writing it would bump its
  // timestamp and make the summary claim work that did not happen.
  const changed = new Map<ImArtifactKind, string>();
  for (const kind of touched) {
    const after = working.get(kind)!;
    if (after !== files.get(kind)!.source) changed.set(kind, after);
  }
  if (!changed.size) return { changed, errors: ['every edit applied but the content is unchanged'], applied };

  return { changed, errors: [], applied };
}

/** The `/// <mls …>` line, which must survive every edit byte-for-byte. */
export function mlsHeaderOf(source: string): string {
  return (source.match(/^\s*\/\/\/\s*<mls\b.*$/m) || [''])[0].trim();
}
