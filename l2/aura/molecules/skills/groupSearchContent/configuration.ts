/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupSearchContent/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = 'groupSearchContent';

// Decisions on ambiguous cases:
// - `value` (search query), `error` are page data — out.
// - `placeholder`: text the user reads — i18n, out.
// - `disabled`, `loading` are page state — out.
// - `debounce`: ms to wait before emitting the search event — design-time performance config — in.
export const configuration: readonly IMoleculeConfigProp[] = [
  { property: 'debounce', type: 'number', default: 300, min: 0 },
] as const;
