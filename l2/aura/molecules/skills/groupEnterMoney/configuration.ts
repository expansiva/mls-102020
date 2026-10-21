/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupEnterMoney/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = 'groupEnterMoney';

// Decisions on ambiguous cases:
// - `value`, `error`, `name` are page data — out.
// - `placeholder`: text the user reads — i18n, out.
// - `isEditing`, `disabled`, `readonly`, `required`, `loading` are page state — out.
// - `currency`: written at design time (BRL field always stays BRL) — in as text+examples.
// - `locale`: written at design time for number formatting — in.
// - `decimals`: number of decimal places for the currency — in.
// - `min`/`max`: validation bounds set at design time (e.g. positive only) — in, nullable.
// - `showSymbol`: display the currency symbol — in.
export const configuration: readonly IMoleculeConfigProp[] = [
  {
    property: 'currency', type: 'text', default: 'USD', examples: ['USD', 'BRL', 'EUR', 'JPY', 'GBP'],
    defaults: { 'groupentermoney--ml-enter-money-br': 'BRL' },
  },
  {
    property: 'locale', type: 'text', default: '', examples: ['en-US', 'pt-BR', 'de-DE', 'ja-JP'],
    defaults: { 'groupentermoney--ml-enter-money-br': 'pt-BR' },
  },
  { property: 'decimals', type: 'number', default: 2, min: 0 },
  { property: 'min', type: 'number', default: null },
  { property: 'max', type: 'number', default: null },
  {
    property: 'showSymbol', attribute: 'show-symbol', type: 'boolean', default: true,
    defaults: { 'groupentermoney--ml-enter-money-br': false },
  },
] as const;
