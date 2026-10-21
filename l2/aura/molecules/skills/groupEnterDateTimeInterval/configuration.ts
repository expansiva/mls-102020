/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupEnterDateTimeInterval/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = 'groupEnterDateTimeInterval';

// Decisions on ambiguous cases:
// - `value`, `error`, `name` are page data — out.
// - `isEditing`, `disabled`, `readonly`, `required`, `loading` are page state — out.
// - `minDatetime`/`maxDatetime`: page data (dynamic runtime values) — out.
// - `locale`, `timezone`: written at design time — in.
// - `minuteStep`: decides calendar granularity at design time — in.
// - `minDurationMinutes`/`maxDurationMinutes`: design constraints set literally — in.
// - `allowSameInstant`: whether start and end can be the same moment — in.
export const configuration: readonly IMoleculeConfigProp[] = [
  { property: 'locale', type: 'text', default: '', examples: ['pt-BR', 'en-US', 'de-DE'] },
  {
    property: 'timezone',
    type: 'text',
    default: '',
    examples: ['America/Sao_Paulo', 'America/New_York', 'UTC'],
  },
  { property: 'minuteStep', attribute: 'minute-step', type: 'number', default: 1, min: 1 },
  { property: 'minDurationMinutes', attribute: 'min-duration-minutes', type: 'number', default: 0, min: 0 },
  { property: 'maxDurationMinutes', attribute: 'max-duration-minutes', type: 'number', default: 0, min: 0 },
  { property: 'allowSameInstant', attribute: 'allow-same-instant', type: 'boolean', default: false },
] as const;
