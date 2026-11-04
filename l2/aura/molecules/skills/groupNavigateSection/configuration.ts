/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupNavigateSection/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp, IMoleculeSlotOrder } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = 'groupNavigateSection';

// No design-time configuration for this group.
// All properties are page state (value, error, disabled, loading).
export const configuration: readonly IMoleculeConfigProp[] = [] as const;

// Slot order: the tabs are shown in the order written. No pair — a tab's content lives INSIDE its own
// `Tab`, there is no panel matched by position.
export const slotOrder: readonly IMoleculeSlotOrder[] = [
  { slot: 'Tab' },
] as const;
