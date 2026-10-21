/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupEnterTime/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = 'groupEnterTime';

// Decisions on ambiguous cases:
// - `value`, `error`, `name` are page data — out.
// - `placeholder`: text the user reads — i18n, out.
// - `isEditing`, `disabled`, `readonly`, `required`, `loading` are page state — out.
// - `locale`: written at design time — in.
// - `hour12`: clock format decided at design time — in.
// - `showSeconds`: display option decided at design time — in.
// - `minuteStep`: decides picker granularity at design time — in.
// - `minTime`/`maxTime`: time constraints (e.g. business hours) are almost always static literals,
//   unlike date constraints which are often "today". Written as "08:00", "17:00" — in as text+examples.
export const configuration: readonly IMoleculeConfigProp[] = [
  { property: 'locale', type: 'text', default: '', examples: ['pt-BR', 'en-US', 'de-DE'] },
  { property: 'hour12', attribute: 'hour12', type: 'boolean', default: false },
  { property: 'showSeconds', attribute: 'show-seconds', type: 'boolean', default: false },
  { property: 'minuteStep', attribute: 'minute-step', type: 'number', default: 1, min: 1 },
  { property: 'minTime', attribute: 'min-time', type: 'text', default: '', examples: ['08:00', '09:00', '00:00'] },
  { property: 'maxTime', attribute: 'max-time', type: 'text', default: '', examples: ['17:00', '18:00', '23:59'] },
] as const;
