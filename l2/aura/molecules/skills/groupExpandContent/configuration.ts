/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupExpandContent/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = 'groupExpandContent';

// Decisions on ambiguous cases:
// - `disabled`, `loading` are page state — out.
// - `multiple`: decides whether multiple sections can be open (accordion vs. free-expansion) — in.
export const configuration: readonly IMoleculeConfigProp[] = [
  { property: 'multiple', type: 'boolean', default: true },
] as const;
