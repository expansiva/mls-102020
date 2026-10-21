/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupPlayMedia/configuration.ts" enhancement="_blank"/>

import type { IMoleculeConfigProp } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = 'groupPlayMedia';

// Decisions on ambiguous cases:
// - `src` (media URL) and `currentTime` are page data — out.
// - `disabled`, `loading` are page state — out.
// - `poster`: written at design time (the video thumbnail URL is fixed for a given embed) — in.
// - `autoplay`: design-time decision — in.
// - `loop`: design-time decision — in.
// - `muted`: design-time decision (important for autoplay) — in.
// - `preload`: design-time performance choice — in as enum.
export const configuration: readonly IMoleculeConfigProp[] = [
  // ml-image-gallery shows a series of images, not a video — poster does not apply.
  {
    property: 'poster',
    type: 'text',
    default: '',
    examples: ['/images/video-poster.jpg'],
    only: [
      'groupplaymedia--ml-audio-player',
      'groupplaymedia--ml-pdf-viewer',
      'groupplaymedia--ml-video-player',
    ],
  },
  // ml-image-gallery renders static images; autoplay/loop/muted/preload are media controls only.
  { property: 'autoplay', type: 'boolean', default: false, only: ['groupplaymedia--ml-audio-player', 'groupplaymedia--ml-pdf-viewer', 'groupplaymedia--ml-video-player'] },
  { property: 'loop', type: 'boolean', default: false, only: ['groupplaymedia--ml-audio-player', 'groupplaymedia--ml-pdf-viewer', 'groupplaymedia--ml-video-player'] },
  { property: 'muted', type: 'boolean', default: false, only: ['groupplaymedia--ml-audio-player', 'groupplaymedia--ml-pdf-viewer', 'groupplaymedia--ml-video-player'] },
  {
    property: 'preload',
    type: 'enum',
    values: ['none', 'metadata', 'auto'],
    default: 'metadata',
    only: ['groupplaymedia--ml-audio-player', 'groupplaymedia--ml-pdf-viewer', 'groupplaymedia--ml-video-player'],
  },
] as const;
