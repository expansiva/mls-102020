/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupEnterDateTime/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = 'groupEnterDateTime';

// Decisions on ambiguous cases:
// - `value`, `error`, `name` are page data — out.
// - `placeholder`: text the user reads — i18n, out.
// - `isEditing`, `disabled`, `readonly`, `required`, `loading` are page state — out.
// - `minDatetime`/`maxDatetime`: page data (dynamic runtime values) — out.
// - `locale`: written at design time — in.
// - `timezone`: written at design time (e.g. "America/Sao_Paulo" always) — in as text+examples.
// - `minuteStep`: decides calendar granularity at design time — in.
export const configuration: readonly IMoleculeConfigProp[] = [
  { property: 'locale', type: 'text', default: '', examples: ['pt-BR', 'en-US', 'de-DE'] },
  {
    property: 'timezone',
    type: 'text',
    default: '',
    examples: ['America/Sao_Paulo', 'America/New_York', 'Europe/London', 'UTC'],
  },
  { property: 'minuteStep', attribute: 'minute-step', type: 'number', default: 1, min: 1 },
] as const;
