/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupEnterNumber/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = 'groupEnterNumber';

// Decisions on ambiguous cases:
// - `value`, `error`, `name` are page data — out.
// - `placeholder`: text the user reads — i18n, out.
// - `isEditing`, `disabled`, `readonly`, `required`, `loading` are page state — out.
// - `min`/`max`: may be dynamic but are listed in Configuration and commonly literal — in.
// - `step`: decides the stepper/slider granularity at design time — in.
// - `decimals`: determines decimal precision at design time — in.
// - `locale`: determines display format at design time — in.
export const configuration: readonly IMoleculeConfigProp[] = [
  { property: 'decimals', type: 'number', default: 0, min: 0 },
  { property: 'step', type: 'number', default: 1, min: 0 },
  { property: 'min', type: 'number', default: null },
  { property: 'max', type: 'number', default: null },
  { property: 'locale', type: 'text', default: '', examples: ['pt-BR', 'en-US', 'de-DE'] },
] as const;
