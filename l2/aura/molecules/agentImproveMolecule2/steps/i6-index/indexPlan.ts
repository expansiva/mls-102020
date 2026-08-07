/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i6-index/indexPlan.ts" enhancement="_blank"/>

// What the group index needs, decided in code. PURE.
//
// ⚠️ THIS STEP IS NOT FULLY DETERMINISTIC, and flow.json originally said it was. Building it
// showed the claim was wrong, and the correction is recorded here rather than hidden:
//
//   - the IMPORT line is derivable — one line, fixed shape, insert position derivable. Code does it.
//   - the SHOWCASE CARD is not. A group index is a hand-written Lit page (groupviewtable/index.ts
//     is 782 lines, with per-molecule cards carrying real sample data). Adding a `<Detail>` to a
//     card means writing markup that fits the card that is already there. No derivation produces it.
//
// So the plan below splits the work: what code can do, code does; the model is called ONLY when a
// card has to change, and it is not called at all otherwise. That is "deterministic first" applied
// honestly — the alternative was a step that claimed to update the index and only ever fixed the
// import, which is the failure mode of 2026-08-05 wearing a different hat.

import { slotIsExercised } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imSurface.js';

export interface ImIndexPlan {
  /** Nothing to do: the playground did not change. */
  noop: boolean;
  /** The import line to add, or '' when it is already there. */
  missingImport: string;
  /** Added slots the showcase does not exercise — these need the model. */
  missingSlots: string[];
  /** True when the index imports the molecule more than once. */
  duplicateImport: boolean;
  needsModel: boolean;
}

/** `import '/_102040_/l2/molecules/groupviewtable/ml-data-table';` — the library's exact shape. */
export function importLineFor(project: number, groupFolder: string, shortName: string): string {
  return `import '/_${project}_/l2/molecules/${groupFolder}/${shortName}';`;
}

export function countImports(indexSource: string, project: number, groupFolder: string, shortName: string): number {
  // Matched by PATH, not by the whole line: the library writes these without the .js extension,
  // but a hand-edited index could carry one, and either spelling is the same import.
  const path = `/_${project}_/l2/molecules/${groupFolder}/${shortName}`;
  const re = new RegExp(`import\\s+'${path.replace(/[/]/g, '\\/')}(?:\\.js)?'`, 'g');
  return (indexSource.match(re) || []).length;
}

/**
 * Where a new molecule import belongs: right after the last existing one, so the block stays
 * together. Returns '' when there is no molecule import to anchor to — then the caller appends
 * after the last import of any kind.
 */
export function lastMoleculeImport(indexSource: string, project: number, groupFolder: string): string {
  const re = new RegExp(`import\\s+'\\/_${project}_\\/l2\\/molecules\\/${groupFolder}\\/[^']+';`, 'g');
  const all = indexSource.match(re) || [];
  return all.length ? all[all.length - 1] : '';
}

export function planIndexWork(input: {
  indexSource: string;
  project: number;
  groupFolder: string;
  shortName: string;
  tag: string;
  addedSlots: string[];
  playgroundChanged: boolean;
}): ImIndexPlan {
  const empty: ImIndexPlan = { noop: true, missingImport: '', missingSlots: [], duplicateImport: false, needsModel: false };
  if (!input.playgroundChanged) return empty;

  const imports = countImports(input.indexSource, input.project, input.groupFolder, input.shortName);
  const missingImport = imports === 0 ? importLineFor(input.project, input.groupFolder, input.shortName) : '';

  // Only the slots this run ADDED. A slot the showcase never exercised is pre-existing debt: i7
  // reports it, and blocking on it would freeze the run on a page nobody asked to repair.
  const missingSlots = input.addedSlots.filter(slot => !slotIsExercised(input.indexSource, slot));

  return {
    noop: false,
    missingImport,
    missingSlots,
    duplicateImport: imports > 1,
    needsModel: missingSlots.length > 0,
  };
}

/** Inserts the import line deterministically, keeping the molecule imports together. */
export function insertImport(indexSource: string, importLine: string, anchor: string): string {
  if (anchor && indexSource.includes(anchor)) {
    return indexSource.replace(anchor, `${anchor}\n${importLine}`);
  }
  const imports = indexSource.match(/^import\s.*$/gm) || [];
  const last = imports[imports.length - 1];
  if (last) return indexSource.replace(last, `${last}\n${importLine}`);
  // No imports at all: after the mls header, which is always the first line.
  const lines = indexSource.split('\n');
  lines.splice(1, 0, importLine);
  return lines.join('\n');
}
