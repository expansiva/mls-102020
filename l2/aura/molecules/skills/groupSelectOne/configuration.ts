/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupSelectOne/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp, IMoleculeSlotOrder } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = 'groupSelectOne';

// Decisions on ambiguous cases:
// - `value`, `error`, `name` are page data — out.
// - `placeholder`: text the user reads — i18n, out.
// - `isEditing`, `disabled`, `readonly`, `required`, `loading` are page state — out.
// - `variant`: decides the layout/presentation at design time — only ml-table-single-select uses it.
// - `searchable`: adds a search field; decided at design time — in.
export const configuration: readonly IMoleculeConfigProp[] = [
  {
    property: 'variant',
    type: 'enum',
    values: ['dropdown', 'radio', 'segmented', 'list', 'table'],
    // The only molecule that reads it is the table one, so its default IS the group's.
    default: 'table',
    only: ['groupselectone--ml-table-single-select'],
  },
  // Only list/dropdown-style implementations expose a search field; non-searchable
  // widgets (radio-group, segmented-control, dial-select, discrete-slider, select) omit it.
  {
    property: 'searchable',
    type: 'boolean',
    default: false,
    defaults: { 'groupselectone--ml-select-one-autocomplete': true },
    only: [
      'groupselectone--ml-card-selector',
      'groupselectone--ml-dial-select',
      'groupselectone--ml-listbox-sidebar-select',
      'groupselectone--ml-select-dropdown-img',
      'groupselectone--ml-select-dropdown',
      'groupselectone--ml-select-one-autocomplete',
      'groupselectone--ml-table-single-select',
    ],
  },
] as const;

// Slot order. The options (`Item`) are shown in the order written. The
// table variant also has columns: each `Item` carries one `Cell` per `Column`, matched BY POSITION
// (`item.cellCls[i]` against the headers), so a column moves with its cells.
export const slotOrder: readonly IMoleculeSlotOrder[] = [
  { slot: 'Item' },
  {
    slot: 'Column',
    pairs: [{ slot: 'Cell', within: 'Item' }],
    only: ['groupselectone--ml-table-single-select'],
  },
] as const;
