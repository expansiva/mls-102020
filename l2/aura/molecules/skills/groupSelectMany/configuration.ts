/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupSelectMany/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp } from '/_102020_/l2/aura/molecules/shared/configuration.js';

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
