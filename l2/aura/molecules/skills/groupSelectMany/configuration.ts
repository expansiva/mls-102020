/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupSelectMany/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp, IMoleculeSlotOrder } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = 'groupSelectMany';

// Decisions on ambiguous cases:
// - `value`, `error`, `name` are page data — out.
// - `placeholder`: text the user reads — i18n, out.
// - `isEditing`, `disabled`, `readonly`, `required`, `loading` are page state — out.
// - `searchable`: written at design time; determines whether the dropdown has a search field — in.
// - `minSelection`/`maxSelection`: written at design time to enforce count constraints — in.
export const configuration: readonly IMoleculeConfigProp[] = [
  { property: 'searchable', type: 'boolean', default: false },
  { property: 'minSelection', attribute: 'min-selection', type: 'number', default: 0, min: 0 },
  { property: 'maxSelection', attribute: 'max-selection', type: 'number', default: 0, min: 0 },
] as const;

// Slot order. The options (`Item`) are shown in the order written. The
// table variant also has columns: each `Item` carries one `Cell` per `Column`, matched BY POSITION
// (`item.cellCls[i]` against the headers), so a column moves with its cells.
export const slotOrder: readonly IMoleculeSlotOrder[] = [
  { slot: 'Item' },
  {
    slot: 'Column',
    pairs: [{ slot: 'Cell', within: 'Item' }],
    only: ['groupselectmany--ml-table-multi-select'],
  },
] as const;
