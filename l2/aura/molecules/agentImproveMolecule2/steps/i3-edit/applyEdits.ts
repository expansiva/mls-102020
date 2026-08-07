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
    const occurrences = countOccurrences(current, find);
    if (occurrences === 0) {
      errors.push(
        fail(index, edit.artifact, `\`find\` does not occur in the file — copy it verbatim, whitespace included: "${quote(find)}"`),
      );
      return;
    }
    if (occurrences > 1) {
      errors.push(
        fail(index, edit.artifact, `\`find\` occurs ${occurrences} times — extend it until it is unique: "${quote(find)}"`),
      );
      return;
    }
    if (find === edit.content) {
      errors.push(fail(index, edit.artifact, '`find` and `content` are identical — this edit changes nothing'));
      return;
    }
    working.set(edit.artifact, current.replace(find, () => edit.content));
    touched.add(edit.artifact);
    applied.push(`${edit.artifact}: ${edit.why.trim() || 'replaced a block'}`);
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
