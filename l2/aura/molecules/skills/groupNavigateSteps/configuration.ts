/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupNavigateSteps/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = 'groupNavigateSteps';

// Decisions on ambiguous cases:
// - `value` (current step), `error`, `disabled`, `loading` are page state — out.
// - `linear`: decides whether steps must be completed in order — in (design-time UX decision).
export const configuration: readonly IMoleculeConfigProp[] = [
  { property: 'linear', type: 'boolean', default: true },
] as const;
