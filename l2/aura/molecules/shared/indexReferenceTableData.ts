/// <mls fileReference="_102020_/l2/aura/molecules/shared/indexReferenceTableData.ts" enhancement="_blank"/>

// The DATA a group's "Quick reference" scenario table needs — column order, color, which rows survive
// D-E3 — computed apart from indexReferenceTable.ts on purpose: importing `lit` at module scope (even
// without ever calling `html`) reaches for `document.createTreeWalker` during lit-html's own
// initialization, which this repo's node:test environment does not provide (confirmed by running it —
// a real DOM error, not a guess; `test/setup-l2.ts` stubs only `document.documentElement.lang`). This
// file imports nothing from 'lit', so it is unit-testable directly; indexReferenceTable.ts is then a
// thin, mechanical map from this data into markup, verified by hand and by the migrated pages
// compiling — see agentSyncMoleculeCatalog's E8a acceptance record.

import { syPaletteColor, syShortLabel } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syLabels.js';

export interface IndexReferenceTableMolecule {
  tag: string;
}

export interface IndexReferenceTableScenario {
  scenario: string;
  recommended: string[];
}

export interface ReferenceTableHeader {
  tag: string;
  label: string;
  cls: string;
}

export interface ReferenceTableRow {
  scenario: string;
  cells: boolean[];
}

/**
 * One literal entry per SY_PALETTE color (helpers/syLabels.ts) — every class Tailwind's build must see
 * as source TEXT. `text-${color}-600` template interpolation would be invisible to Tailwind's scanner
 * and silently render with no color at all; this map is why that risk does not apply here.
 */
export const COLOR_CLASSES: Record<string, string> = {
  violet: 'text-violet-600 dark:text-violet-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
  rose: 'text-rose-600 dark:text-rose-400',
  sky: 'text-sky-600 dark:text-sky-400',
  indigo: 'text-indigo-600 dark:text-indigo-400',
  purple: 'text-purple-600 dark:text-purple-400',
  teal: 'text-teal-600 dark:text-teal-400',
  orange: 'text-orange-600 dark:text-orange-400',
  pink: 'text-pink-600 dark:text-pink-400',
};

/**
 * ⚠️ COLUMN ORDER AND COLOR are BOTH derived from `molecules[]`'s own (alphabetical) order — a
 * deliberate change from the pre-migration pages, where color paired with the cards' historical import
 * order and could differ from the table's column order (D-E2/D-E2b of E8's decision record). Reproducing
 * the historical pairing would need a color harvested per group and passed at the call site, and the
 * call site is meant to stay a thin, generated 3 lines.
 */
export function buildReferenceTableData(
  molecules: IndexReferenceTableMolecule[],
  scenarios: IndexReferenceTableScenario[],
): { headers: ReferenceTableHeader[]; rows: ReferenceTableRow[] } {
  const headers: ReferenceTableHeader[] = molecules.map((molecule, index) => ({
    tag: molecule.tag,
    label: syShortLabel(molecule.tag),
    cls: COLOR_CLASSES[syPaletteColor(index)],
  }));

  // D-E3: a scenario left with no in-group recommendation (its only match, if any, belonged to another
  // group and s1 already dropped it — helpers/syExtract.syHarvestScenarios) is OMITTED from the
  // rendered table, not shown as an all-empty row. It stays in scenarios[] in the .defs.ts either way.
  const rows: ReferenceTableRow[] = scenarios
    .filter(scenario => scenario.recommended.length > 0)
    .map(scenario => ({
      scenario: scenario.scenario,
      cells: molecules.map(molecule => scenario.recommended.includes(molecule.tag)),
    }));

  return { headers, rows };
}
