/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupViewCard/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = 'groupViewCard';

// Decisions on ambiguous cases:
// - `selected`, `disabled`, `loading` are page state — out.
// - `isEditing` propagates the edit mode to child web components — page state, out.
// - `clickable` is a design-time decision (makes the whole card interactive) — in.
export const configuration: readonly IMoleculeConfigProp[] = [
  { property: 'clickable', type: 'boolean', default: false },
] as const;
