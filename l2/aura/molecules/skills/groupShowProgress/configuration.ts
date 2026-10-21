/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupShowProgress/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = 'groupShowProgress';

// Decisions on ambiguous cases:
// - `value` (progress 0–100), `error` are page data — out.
// - `loading` is page state — out.
// - `label`: accessible text for the progress bar — i18n-equivalent, out.
// - `size`: visual size of the component — decided at design time — in as enum.
// - `showValue`: whether to display the numeric value alongside the bar — design-time decision — in.
export const configuration: readonly IMoleculeConfigProp[] = [
  { property: 'size', type: 'enum', values: ['xs', 'sm', 'md', 'lg'], default: 'md' },
  { property: 'showValue', attribute: 'show-value', type: 'boolean', default: false },
] as const;
