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
      if (state.present) {
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
      working.set(edit.artifact, current.replace(find, () => edit.content));
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
    // file's indentation is left exactly as odd as it was.
    working.set(
      edit.artifact,
      current.slice(0, loose.start) + edit.content.trim() + current.slice(loose.end),
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
