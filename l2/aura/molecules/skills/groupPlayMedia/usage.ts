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

The component's visual styling can be customized by overriding \`--ml-*\` CSS custom
properties on a parent element. The values below are this group's current defaults —
copy the block and change them:

\`\`\`css
.my-container {
  --ml-outline-focus: #3b82f6;
  --ml-outline-error: #ef4444;
}
\`\`\`

### Available tokens

| Token | Default | Purpose |
|-------|---------|---------|
| \`--ml-disabled-opacity\` | \`0.5\` | Opacity of disabled elements |
| \`--ml-focus-ring-width\` | \`2px\` | Focus ring width |
| \`--ml-outline-error\` | \`#ef4444\` | Error border |
| \`--ml-outline-focus\` | \`#3b82f6\` | Focus border |

`;