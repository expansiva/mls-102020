/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupTriggerAction/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = 'groupTriggerAction';

// Decisions on ambiguous cases:
// - `disabled` and `loading` are page state — out.
// - `type` enters: it is written literal at design time (submit, reset) and the molecule reads it.
//   A lost `type="submit"` silently breaks form submission (noted in adopt.ts).
// - `iconPosition`: attribute name is `icon-position` — `attribute` field set accordingly.
// - `data-variant`: not a Lit property; the molecule reads `getAttribute('data-variant')`.
//   Only `grouptriggeraction--ml-button-standard` reads it (from adopt.ts, VARIANTS constant).
export const configuration: readonly IMoleculeConfigProp[] = [
  { property: 'size', type: 'enum', values: ['xs', 'sm', 'md', 'lg'], default: 'md' },
  { property: 'type', type: 'enum', values: ['button', 'submit', 'reset'], default: 'button' },
  {
    property: 'iconPosition',
    attribute: 'icon-position',
    type: 'enum',
    values: ['start', 'end'],
    default: 'start',
  },
  {
    property: 'data-variant',
    type: 'enum',
    values: ['primary', 'secondary', 'danger', 'ghost', 'link'],
    default: 'primary',
    only: ['grouptriggeraction--ml-button-standard'],
  },
] as const;
