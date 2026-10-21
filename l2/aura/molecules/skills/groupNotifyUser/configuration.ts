/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupNotifyUser/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = 'groupNotifyUser';

// Decisions on ambiguous cases:
// - `visible` is page state (the page shows/hides the notification) — out.
// - `type` is listed under "Data" in the contract but is written literal at design time
//   (an error notification is always 'error') — in as enum.
// - `position`: the contract lists `'top'`, `'bottom'`, `'top-right'`, `'bottom-right'`, `etc.`
//   The "etc." marks it as an open list; type=text with examples, not a closed enum.
// - `duration`: written at design time as a fixed millisecond value — type=number, min=0.
// - `dismissible`: decides whether the user can close the notification — type=boolean.
export const configuration: readonly IMoleculeConfigProp[] = [
  { property: 'type', type: 'enum', values: ['info', 'success', 'warning', 'error'], default: 'info' },
  { property: 'dismissible', type: 'boolean', default: true },
  { property: 'duration', type: 'number', default: 0, min: 0 },
  {
    property: 'position',
    type: 'text',
    default: '',
    examples: ['top', 'bottom', 'top-right', 'bottom-right', 'top-left', 'bottom-left'],
  },
] as const;
