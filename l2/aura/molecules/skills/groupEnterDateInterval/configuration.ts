/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupEnterDateInterval/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = 'groupEnterDateInterval';

// Decisions on ambiguous cases:
// - `value`, `error`, `name` are page data — out.
// - `isEditing`, `disabled`, `readonly`, `required`, `loading` are page state — out.
// - `minDate`/`maxDate`: page data (often runtime-computed, e.g. "today") — out.
// - `locale`: written at design time — in.
// - `firstDayOfWeek`: calendar layout choice — in.
// - `minRangeDays`/`maxRangeDays`: design constraints set literally (e.g. "min 7 days") — in.
// - `allowSameDay`: whether start and end can be the same day — in.
export const configuration: readonly IMoleculeConfigProp[] = [
  { property: 'locale', type: 'text', default: '', examples: ['pt-BR', 'en-US', 'de-DE'] },
  // ml-month-year-range picks month+year, not a day — firstDayOfWeek does not apply.
  {
    property: 'firstDayOfWeek',
    attribute: 'first-day-of-week',
    type: 'number',
    default: 0,
    min: 0,
    max: 1,
    only: [
      'groupenterdateinterval--ml-date-interval-drag',
      'groupenterdateinterval--ml-date-interval-presets',
      'groupenterdateinterval--ml-date-range-dual-calendar',
    ],
  },
  { property: 'minRangeDays', attribute: 'min-range-days', type: 'number', default: 0, min: 0 },
  { property: 'maxRangeDays', attribute: 'max-range-days', type: 'number', default: 0, min: 0 },
  { property: 'allowSameDay', attribute: 'allow-same-day', type: 'boolean', default: true },
] as const;
