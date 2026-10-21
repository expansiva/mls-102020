/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupEnterDate/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = 'groupEnterDate';

// Decisions on ambiguous cases:
// - `value`, `error`, `name` are page data — out.
// - `placeholder`: text the user reads — i18n, out.
// - `isEditing`, `disabled`, `readonly`, `required`, `loading` are page state — out.
// - `minDate`/`maxDate`: page data (e.g. "today's date" is computed at runtime) — out.
// - `locale`: written at design time to format the displayed date — in.
// - `firstDayOfWeek`: decides the calendar grid layout (0=Sunday, 1=Monday) — in as number.
// - `showWeekNumbers`: a calendar display option set at design time — in.
export const configuration: readonly IMoleculeConfigProp[] = [
  { property: 'locale', type: 'text', default: '', examples: ['pt-BR', 'en-US', 'de-DE', 'fr-FR'] },
  { property: 'firstDayOfWeek', attribute: 'first-day-of-week', type: 'number', default: 0, min: 0, max: 1 },
  { property: 'showWeekNumbers', attribute: 'show-week-numbers', type: 'boolean', default: false },
] as const;
