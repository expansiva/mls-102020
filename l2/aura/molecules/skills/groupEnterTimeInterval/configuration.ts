/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupEnterTimeInterval/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = 'groupEnterTimeInterval';

// Decisions on ambiguous cases:
// - `value`, `error`, `name` are page data — out.
// - `isEditing`, `disabled`, `readonly`, `required`, `loading` are page state — out.
// - `locale`, `hour12`, `showSeconds`, `minuteStep`, `minTime`, `maxTime`: same as groupEnterTime — in.
// - `minDurationMinutes`/`maxDurationMinutes`: design constraints on the interval length — in.
// - `allowOvernight`: whether the interval can span midnight — in.
// - `allowSameTime`: whether start and end can be equal — in.
export const configuration: readonly IMoleculeConfigProp[] = [
  { property: 'locale', type: 'text', default: '', examples: ['pt-BR', 'en-US', 'de-DE'] },
  { property: 'hour12', attribute: 'hour12', type: 'boolean', default: false },
  { property: 'showSeconds', attribute: 'show-seconds', type: 'boolean', default: false },
  { property: 'minuteStep', attribute: 'minute-step', type: 'number', default: 1, min: 1 },
  { property: 'minTime', attribute: 'min-time', type: 'text', default: '', examples: ['08:00', '09:00'] },
  { property: 'maxTime', attribute: 'max-time', type: 'text', default: '', examples: ['17:00', '18:00'] },
  { property: 'minDurationMinutes', attribute: 'min-duration-minutes', type: 'number', default: 0, min: 0 },
  { property: 'maxDurationMinutes', attribute: 'max-duration-minutes', type: 'number', default: 0, min: 0 },
  { property: 'allowOvernight', attribute: 'allow-overnight', type: 'boolean', default: false },
  { property: 'allowSameTime', attribute: 'allow-same-time', type: 'boolean', default: false },
] as const;
