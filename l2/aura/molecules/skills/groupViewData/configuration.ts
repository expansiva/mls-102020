/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupViewData/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp, IMoleculeSlotOrder } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = 'groupViewData';

// Decisions on ambiguous cases:
// - `loading` is page state — out.
// - `selectable`: whether rows can be selected — design-time UX decision — in.
// - `hoverable`: whether rows highlight on hover — design-time option — in.
export const configuration: readonly IMoleculeConfigProp[] = [
  { property: 'selectable', type: 'boolean', default: false },
  { property: 'hoverable', type: 'boolean', default: true },
] as const;

// Slot order. The card grid, the timeline and the vertical list read a row's cells BY POSITION against
// the columns (`columns[cellIndex]`, `row.cells[colIndex]`), so a column moves with its cells.
// Left out on purpose: the calendar (it finds an event's date INSIDE the cells, not by column) and the
// kanban (rows become lanes and cells become cards) — in neither is the order of the columns what the
// user would be moving.
export const slotOrder: readonly IMoleculeSlotOrder[] = [
  {
    slot: 'Column',
    pairs: [{ slot: 'Cell', within: 'Row' }],
    only: [
      'groupviewdata--ml-card-grid',
      'groupviewdata--ml-timeline-view',
      'groupviewdata--ml-vertical-record-list',
    ],
  },
] as const;
