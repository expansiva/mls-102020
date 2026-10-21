/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupViewTable/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = 'groupViewTable';

// Decisions on ambiguous cases:
// - `page`, `totalItems` are page data (current page and total count) — out.
// - `isEditing` propagates edit mode to cells — page state, out.
// - `editingRows` holds which row keys are open — page state, out.
// - `value` (selected row indices) and `error` are page data — out.
// - `disabled`, `loading` are page state — out.
// - `selectable`: written at design time; decides the table layout (adds checkboxes) — in.
// - `pageSize`: written at design time; decides how many rows per page are shown — in.
// - `fitHeight`: written at design time; changes table layout to fill parent — in.
export const configuration: readonly IMoleculeConfigProp[] = [
  { property: 'selectable', type: 'boolean', default: false },
  { property: 'pageSize', attribute: 'page-size', type: 'number', default: 0, min: 0 },
  // fitHeight is only implemented in three table variants; most tables scroll instead.
  {
    property: 'fitHeight',
    attribute: 'fit-height',
    type: 'boolean',
    default: false,
    only: [
      'groupviewtable--ml-data-table-minimal',
      'groupviewtable--ml-record-form-table',
      'groupviewtable--ml-side-detail-table',
    ],
  },
] as const;
