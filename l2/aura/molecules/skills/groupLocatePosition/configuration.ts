/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupLocatePosition/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp, IMoleculeSlotOrder } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = 'groupLocatePosition';

// Decisions on ambiguous cases:
// - `value`, `error`, `name` are page data — out.
// - `placeholder`: text the user reads — i18n, out.
// - `isEditing`, `disabled`, `readonly`, `required`, `loading` are page state — out.
// - `showMap`: decides whether to render a map view at design time — in.
// - `allowGeolocation`: whether to offer the browser's geolocation API — in.
export const configuration: readonly IMoleculeConfigProp[] = [
  { property: 'showMap', attribute: 'show-map', type: 'boolean', default: false },
  { property: 'allowGeolocation', attribute: 'allow-geolocation', type: 'boolean', default: false },
] as const;

// Slot order: the suggestions are shown in the order written. Those that
// come from data (inside a `.map()`) are never moved — their order is the data's.
export const slotOrder: readonly IMoleculeSlotOrder[] = [
  { slot: 'Item' },
] as const;
