/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupViewHierarchy/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = 'groupViewHierarchy';

// Decisions on ambiguous cases:
// - `value` (selected nodes), `error` are page data — out.
// - `disabled`, `loading` are page state — out.
// - `multiple`: whether multiple nodes can be selected — design-time UX decision — in.
// - `expandAll`: whether all nodes start expanded — design-time default — in.
export const configuration: readonly IMoleculeConfigProp[] = [
  { property: 'multiple', type: 'boolean', default: true },
  { property: 'expandAll', attribute: 'expand-all', type: 'boolean', default: false },
] as const;
