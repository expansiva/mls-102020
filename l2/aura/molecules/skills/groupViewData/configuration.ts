/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupViewData/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = 'groupViewData';

// Decisions on ambiguous cases:
// - `loading` is page state — out.
// - `selectable`: whether rows can be selected — design-time UX decision — in.
// - `hoverable`: whether rows highlight on hover — design-time option — in.
export const configuration: readonly IMoleculeConfigProp[] = [
  { property: 'selectable', type: 'boolean', default: false },
  { property: 'hoverable', type: 'boolean', default: true },
] as const;
