/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupEnterNumberInterval/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = 'groupEnterNumberInterval';

// Decisions on ambiguous cases:
// - `value`, `error`, `name` are page data — out.
// - `isEditing`, `disabled`, `readonly`, `required`, `loading` are page state — out.
// - `min`/`max`: validation bounds set at design time — in, nullable.
// - `step`/`decimals`/`locale`: same rationale as groupEnterNumber — in.
// - `minGap`/`maxGap`: design constraints on the difference between start and end — in.
export const configuration: readonly IMoleculeConfigProp[] = [
  { property: 'decimals', type: 'number', default: 0, min: 0 },
  { property: 'step', type: 'number', default: 1, min: 0 },
  { property: 'min', type: 'number', default: null },
  { property: 'max', type: 'number', default: null },
  { property: 'locale', type: 'text', default: '', examples: ['pt-BR', 'en-US', 'de-DE'] },
  { property: 'minGap', attribute: 'min-gap', type: 'number', default: 0, min: 0 },
  { property: 'maxGap', attribute: 'max-gap', type: 'number', default: 0, min: 0 },
] as const;
