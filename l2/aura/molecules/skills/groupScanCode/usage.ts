/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupScanCode/usage.ts" enhancement="_blank"/>

export const skill = `

# scan + code — Usage

> Quick reference for using molecules in the **scan + code** group.
> Use this when the user needs to **capture information via camera** (QR code, barcode, document).
> The component captures image frames; the page is responsible for decoding via BFF.

---

## Slot Tags

| Tag | Description |
|-----|-------------|
| \`Label\` | Label displayed above the scanner area |
| \`Helper\` | Descriptive text shown below the scanner |
| \`Trigger\` | Custom content for the button that opens the camera |
| \`Result\` | Custom content for displaying the decoded result |

---

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`value\` | \`string \| null\` | \`null\` | Decoded result, set by the page after processing |
| \`error\` | \`string\` | \`''\` | Error message. Empty string means no error |
| \`name\` | \`string\` | \`''\` | Field name for form identification |
| \`facing\` | \`string\` | \`'environment'\` | Camera facing: \`'environment'\` (rear) or \`'user'\` (front) |
| \`auto-capture\` | \`boolean\` | \`false\` | Continuously capture frames for real-time scanning |
| \`capture-interval\` | \`number\` | \`500\` | Interval in ms between auto captures |
| \`disabled\` | \`boolean\` | \`false\` | Disables the scanner |
| \`loading\` | \`boolean\` | \`false\` | Shows processing indicator while page decodes |

---

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| \`capture\` | \`{ image: string }\` | Frame captured — image is a base64 data URL |
| \`open\` | \`{}\` | Camera opened |
| \`close\` | \`{}\` | Camera closed |
| \`change\` | \`{ value: string \| null }\` | Value changed (result set by page) |

---

## Capture Flow

\`\`\`
1. User clicks trigger → camera opens → emits \`open\`
2. Component captures frame → emits \`capture\` with { image: base64 }
3. Page processes image via BFF → sets \`value\` with decoded text
4. Component displays result → camera closes → emits \`close\`
\`\`\`

---

## Examples

### QR code scanner

\`\`\`html
<molecules--qr-scanner-102020
  value="{{ui.payment.qrResult}}"
  error="{{ui.payment.scanError}}"
  loading="{{ui.payment.isDecoding}}"
  auto-capture="true"
  capture-interval="300">
  <Label>Scan QR Code</Label>
  <Trigger>📷 Open Camera</Trigger>
  <Helper>Point at a QR code to scan automatically</Helper>
</molecules--qr-scanner-102020>
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
  --ml-primary: #3b82f6;
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
| \`--ml-primary\` | \`#3b82f6\` | Primary action color |

`;