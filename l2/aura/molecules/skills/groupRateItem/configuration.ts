/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupRateItem/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = 'groupRateItem';

// Decisions on ambiguous cases:
// - `value` (current rating) and `error` are page data — out.
// - `disabled`, `readonly`, `loading` are page state — out.
// - `min`/`max`: decide the rating scale at design time (e.g. 1–5 stars) — in.
// - `step`: fractional ratings (e.g. 0.5 for half-star) — in.
export const configuration: readonly IMoleculeConfigProp[] = [
  { property: 'min', type: 'number', default: 0 },
  { property: 'max', type: 'number', default: 5 },
  { property: 'step', type: 'number', default: 1, min: 0 },
] as const;
