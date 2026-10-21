/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupSelectFileForUpload/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = 'groupSelectFileForUpload';

// Decisions on ambiguous cases:
// - `value` (selected files), `error`, `name` are page data — out.
// - `disabled`, `loading` are page state — out.
// - `multiple`: decides whether multiple files can be selected at design time — in.
// - `accept`: written at design time (e.g. ".pdf,.docx" for a document uploader) — in as text+examples.
// - `maxSizeKb`: file size constraint set at design time — in.
// - `maxFiles`: maximum number of files, set at design time — in.
export const configuration: readonly IMoleculeConfigProp[] = [
  { property: 'multiple', type: 'boolean', default: false },
  {
    property: 'accept',
    type: 'text',
    default: '',
    examples: ['image/*', '.pdf', '.pdf,.docx', 'image/*,video/*'],
  },
  { property: 'maxSizeKb', attribute: 'max-size-kb', type: 'number', default: 0, min: 0 },
  { property: 'maxFiles', attribute: 'max-files', type: 'number', default: 0, min: 0 },
] as const;
