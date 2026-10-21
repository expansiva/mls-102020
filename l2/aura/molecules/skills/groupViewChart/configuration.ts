/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupViewChart/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = 'groupViewChart';

// Decisions on ambiguous cases:
// - Data properties (series, labels) and loading/error are page data/state — out.
// - `showLegend`: whether to render the legend — design-time display option — in.
// - `showValues`: whether to render data labels on the chart — design-time option — in.
export const configuration: readonly IMoleculeConfigProp[] = [
  { property: 'showLegend', attribute: 'show-legend', type: 'boolean', default: true },
  { property: 'showValues', attribute: 'show-values', type: 'boolean', default: false },
] as const;
