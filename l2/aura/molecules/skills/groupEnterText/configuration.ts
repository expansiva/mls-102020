/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupEnterText/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = 'groupEnterText';

// Decisions on ambiguous cases:
// - `value`, `error`, `name` are page data — out.
// - `placeholder`: text the user reads — i18n, out.
// - `isEditing`, `disabled`, `readonly`, `required`, `loading` are page state — out.
// - `autocomplete`: open list (examples in the contract: 'email', 'name', 'off'); type=text with examples.
// - `mask`: open format string (examples: '(##) #####-####'); type=text with examples.
// - `inputType`: closed list from the contract — type=enum.
// - `rows`: decides input vs textarea layout — type=number, min=1.
// - `maxLength`/`minLength`: set at design time to enforce field constraints — type=number, null default.
export const configuration: readonly IMoleculeConfigProp[] = [
  // ml-phone-input does not support multi-line input; rows only applies to text-input molecules.
  {
    property: 'rows',
    type: 'number',
    default: 1,
    min: 1,
    only: [
      'groupentertext--ml-address-field',
      'groupentertext--ml-cpf-input',
      'groupentertext--ml-enter-text',
      'groupentertext--ml-floating-text-input',
      'groupentertext--ml-multiline-text',
      'groupentertext--ml-password-strength-input',
      'groupentertext--ml-tag-input',
    ],
  },
  // ml-address-field and ml-phone-input have a fixed input type; inputType only applies where the
  // host can change the HTML input type at design time.
  {
    property: 'inputType',
    attribute: 'input-type',
    type: 'enum',
    values: ['text', 'email', 'password', 'search', 'url', 'tel'],
    default: 'text',
    defaults: { 'groupentertext--ml-password-strength-input': 'password' },
    only: [
      'groupentertext--ml-cpf-input',
      'groupentertext--ml-enter-text',
      'groupentertext--ml-floating-text-input',
      'groupentertext--ml-multiline-text',
      'groupentertext--ml-password-strength-input',
      'groupentertext--ml-tag-input',
    ],
  },
  {
    property: 'autocomplete',
    type: 'text',
    default: '',
    examples: ['email', 'name', 'off', 'given-name', 'family-name', 'tel', 'new-password'],
  },
  {
    property: 'mask',
    type: 'text',
    default: '',
    defaults: { 'groupentertext--ml-cpf-input': '###.###.###-##' },
    examples: ['(##) #####-####', '###.###.###-##', '##.###.###/####-##'],
  },
  { property: 'maxLength', attribute: 'max-length', type: 'number', default: null, min: 0 },
  { property: 'minLength', attribute: 'min-length', type: 'number', default: null, min: 0 },
] as const;
