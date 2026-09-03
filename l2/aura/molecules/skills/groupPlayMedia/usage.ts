/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupPlayMedia/usage.ts" enhancement="_blank"/>

export const skill = `
# play + media — Usage

> Quick reference for using molecules in the **play + media** group.
> Use this when the user needs to **play audio or video content**.
> All implementations share the same slot tag contract — swap the tag for a different player style.

---

## Slot Tags

| Tag | Description |
|-----|-------------|
| \`Label\` | Title or description displayed alongside the player |
| \`Source\` | Media source. Attributes: \`src\` (required), \`type\` (e.g. \`"video/mp4"\`, \`"audio/mpeg"\`). Multiple allowed for fallback formats |
| \`Track\` | Subtitle/caption track. Attributes: \`src\`, \`kind\` (\`"subtitles"\`, \`"captions"\`), \`lang\`, \`label\` |

---

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`poster\` | \`string\` | \`''\` | Thumbnail image URL (video only, ignored by audio) |
| \`autoplay\` | \`boolean\` | \`false\` | Start playback automatically |
| \`loop\` | \`boolean\` | \`false\` | Restart playback when ended |
| \`muted\` | \`boolean\` | \`false\` | Start muted |
| \`preload\` | \`string\` | \`'metadata'\` | Preload strategy: \`'none'\`, \`'metadata'\`, \`'auto'\` |
| \`disabled\` | \`boolean\` | \`false\` | Disables all controls |
| \`loading\` | \`boolean\` | \`false\` | Shows a loading indicator |

---

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| \`play\` | \`{}\` | Playback started |
| \`pause\` | \`{}\` | Playback paused |
| \`ended\` | \`{}\` | Playback reached the end |
| \`timeUpdate\` | \`{ currentTime: number, duration: number }\` | Playback position changed |
| \`error\` | \`{ message: string }\` | Media failed to load or play |

---

## Examples


\`\`\`html
<molecules--video-player-102020
  poster="thumbnail.jpg"
  preload="metadata">
  <Label>Product Demo</Label>
  <Source src="demo.webm" type="video/webm" />
  <Source src="demo.mp4" type="video/mp4" />
  <Track src="subs-en.vtt" kind="subtitles" lang="en" label="English" />
  <Track src="subs-pt.vtt" kind="subtitles" lang="pt" label="Português" />
</molecules--video-player-102020>
\`\`\`

---

## Customization via data-class

### On the component host

Pass extra CSS classes via \`data-class\`:

\`\`\`html
<component data-class="w-full mt-4">
  <Label>Text</Label>
</component>
\`\`\`

### On slot tags

Pass CSS classes on slot tags via \`data-class\`:

\`\`\`html
<component>
  <Label data-class="uppercase tracking-wide">Text</Label>
  <Helper data-class="italic">Help text</Helper>
</component>
\`\`\`

---

## Design Tokens

The component's visual styling can be customized by overriding \`--ml-*\` CSS custom properties on a parent element:

\`\`\`css
.my-container {
  --ml-primary: #7c3aed;
  --ml-radius-sm: 10px;
  --ml-font-family: 'Inter', sans-serif;
}
\`\`\`

### Available tokens

| Token | Default | Purpose |
|-------|---------|---------|
| \`--ml-surface\` | \`#ffffff\` | Component background |
| \`--ml-surface-dim\` | \`#f5f5f5\` | Hover background |
| \`--ml-on-surface\` | \`#1c1b1f\` | Primary text |
| \`--ml-on-surface-muted\` | \`#49454f\` | Secondary text |
| \`--ml-on-surface-faint\` | \`#79747e\` | Placeholder |
| \`--ml-primary\` | \`#3b82f6\` | Primary action color |
| \`--ml-on-primary\` | \`#ffffff\` | Text on primary |
| \`--ml-error\` | \`#ef4444\` | Error color |
| \`--ml-on-error\` | \`#ffffff\` | Text on error |
| \`--ml-outline-variant\` | \`#e2e8f0\` | Default border |
| \`--ml-outline-focus\` | \`#3b82f6\` | Focus border |
| \`--ml-outline-error\` | \`#ef4444\` | Error border |
| \`--ml-radius-sm\` | \`6px\` | Default radius |
| \`--ml-shadow-1\` | \`0 1px 3px rgba(0,0,0,0.1)\` | Subtle shadow |
| \`--ml-font-family\` | \`system-ui, sans-serif\` | Font family |
| \`--ml-font-weight-medium\` | \`500\` | Medium weight |
| \`--ml-transition\` | \`200ms ease\` | Transition |
| \`--ml-focus-ring-color\` | \`rgba(59,130,246,0.4)\` | Focus ring |
| \`--ml-disabled-opacity\` | \`0.5\` | Disabled opacity |

`;