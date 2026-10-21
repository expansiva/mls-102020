/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupScanCode/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = 'groupScanCode';

// Decisions on ambiguous cases:
// - `value` (scanned code) and `error` are page data — out.
// - `loading` is page state — out.
// - `facing`: which camera to use — written at design time — in as enum.
// - `autoCapture`: whether to scan continuously — design-time UX decision — in.
// - `captureInterval`: ms between auto-captures — design-time performance config — in.
export const configuration: readonly IMoleculeConfigProp[] = [
  {
    property: 'facing',
    type: 'enum',
    values: ['environment', 'user'],
    default: 'environment',
  },
  { property: 'autoCapture', attribute: 'auto-capture', type: 'boolean', default: false },
  { property: 'captureInterval', attribute: 'capture-interval', type: 'number', default: 500, min: 100 },
] as const;
