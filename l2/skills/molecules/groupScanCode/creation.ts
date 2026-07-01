/// <mls fileReference="_102020_/l2/skills/molecules/groupScanCode/creation.ts" enhancement="_blank"/>

export const skill = `
# groupScanCode — Creation

> Implementation reference for creating molecules in the **groupScanCode** group.
> Follow the general Lit/Aura rules defined in \`molecule-generation2.md\`.

---

## 1. Metadata

| Field | Value |
|-------|-------|
| **Group** | \`groupScanCode\` |
| **Category** | Data Entry |
| **Version** | \`1.0.0\` |

---

## 2. Slot Tags

| Tag | Required | Description |
|-----|:--------:|-------------|
| \`Label\` | No | Label displayed above the scanner area |
| \`Helper\` | No | Help text displayed below the scanner |
| \`Trigger\` | No | Custom content for the button that opens the camera |
| \`Result\` | No | Custom content for displaying the decoded result |

\`\`\`typescript
slotTags = ['Label', 'Helper', 'Trigger', 'Result'];
\`\`\`

### Slot Hierarchy

\`\`\`
component (root)
├── <Label>
├── <Trigger>
├── <Result>
└── <Helper>
\`\`\`

---

## 3. Properties

### 3.1 Data

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`value\` | \`string \| null\` | \`null\` | \`@propertyDataSource\` | Decoded result set by the page after processing |
| \`error\` | \`string\` | \`''\` | \`@propertyDataSource\` | Error message (empty = no error) |
| \`name\` | \`string\` | \`''\` | \`@propertyDataSource\` | Field name (for forms) |

### 3.2 Configuration

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`facing\` | \`string\` | \`'environment'\` | \`@propertyDataSource\` | Camera facing: \`'environment'\` (rear) or \`'user'\` (front) |
| \`autoCapture\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Continuously capture frames while camera is open (for real-time scanning) |
| \`captureInterval\` | \`number\` | \`500\` | \`@propertyDataSource\` | Interval in ms between auto captures (used when \`autoCapture=true\`) |

### 3.3 States

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`disabled\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Disables the scanner |
| \`loading\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Loading state (e.g. page is processing a captured frame) |

### 3.4 Internal State

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`isOpen\` | \`boolean\` | \`false\` | \`@state\` | Whether the camera viewfinder is active |

---

## 4. Value Contract

### Storage Format

- \`value\` is a plain **string** containing the decoded result (text from QR, barcode number, OCR text, etc.)
- \`null\` means no result yet
- The **page** is responsible for decoding — the component only captures and emits image data
- When the page finishes processing, it sets \`value\` with the decoded text

### Capture Flow

\`\`\`
1. User opens the camera (click trigger or auto-open)
2. Component activates camera via navigator.mediaDevices.getUserMedia()
3. User frames the target OR autoCapture sends frames periodically
4. Component captures frame as base64 image → emits \`capture\` event
5. Page receives image, processes via BFF (QR decode, barcode read, OCR)
6. Page sets \`value\` with the decoded result
7. Component displays the result (via Result slot or default display)
8. Camera closes (manual or auto on successful decode)
\`\`\`

### View After Capture

- If \`value\` is set: display decoded result text
- If \`hasSlot('Result')\`: use custom result layout
- Camera viewfinder is replaced by the result display

---

## 5. Events

| Event | Detail | Bubbles | Description |
|-------|--------|:-------:|-------------|
| \`capture\` | \`{ image: string }\` | ✓ | Frame captured — \`image\` is a base64 data URL |
| \`open\` | \`{}\` | ✓ | Camera opened |
| \`close\` | \`{}\` | ✓ | Camera closed |
| \`change\` | \`{ value: string \| null }\` | ✓ | Value changed (result set by page) |

### Dispatch Example

\`\`\`typescript
this.dispatchEvent(new CustomEvent('capture', {
  bubbles: true,
  composed: true,
  detail: { image: base64DataUrl }
}));
\`\`\`

---

## 6. Camera Management

- Open camera via \`navigator.mediaDevices.getUserMedia({ video: { facingMode: this.facing } })\`
- Stream is rendered to a \`<video>\` element inside the component
- Capture a frame by drawing the video to an offscreen \`<canvas>\` and calling \`canvas.toDataURL()\`
- On close: stop all tracks via \`stream.getTracks().forEach(t => t.stop())\`
- Handle permission denied gracefully — set \`error\` with appropriate message

---

## 7. Visual States

| State | Behavior |
|-------|----------|
| **Idle** | Trigger button visible, no camera |
| **Open** | Camera viewfinder active, capture button visible |
| **Capturing** | Flash or pulse animation on capture |
| **Loading** | Processing indicator while page decodes |
| **Result** | Decoded value displayed, camera closed |
| **Disabled** | Trigger dimmed, no interaction |
| **Error** | Error message (permission denied, camera unavailable, decode failed) |

---

## 8. Accessibility (a11y)

| Requirement | Implementation |
|-------------|----------------|
| Trigger | \`role="button"\`, \`aria-label="Open camera scanner"\` |
| Video | \`aria-hidden="true"\` (visual-only element) |
| Capture button | \`aria-label="Capture"\` |
| Result | \`aria-live="polite"\` to announce decoded result |
| Error | \`aria-describedby\` pointing to error element |
| Keyboard | \`Enter\`/\`Space\` on trigger opens camera; \`Escape\` closes |

---

## 9. Design Tokens

### Tokens

This group uses CSS custom properties (tokens) for all visual styling.
All tokens are consumed in the .less file via var(--ml-token, fallback).
The fallback ensures the component renders without external configuration.

#### Surface and text
- --ml-surface (#ffffff) — background
- --ml-surface-dim (#f5f5f5) — hover background
- --ml-on-surface (#1c1b1f) — primary text
- --ml-on-surface-muted (#49454f) — secondary text
- --ml-on-surface-faint (#79747e) — placeholder

#### Action and feedback
- --ml-primary (#3b82f6) — primary action color
- --ml-on-primary (#ffffff) — text on primary
- --ml-error (#ef4444) — error color
- --ml-on-error (#ffffff) — text on error

#### Border and shape
- --ml-outline-variant (#e2e8f0) — default border
- --ml-outline-focus (#3b82f6) — focus border
- --ml-outline-error (#ef4444) — error border
- --ml-radius-sm (6px) — default radius
- --ml-radius-full (9999px) — circular radius
- --ml-border-width (1px) — border thickness
- --ml-border-style (solid) — border style

#### Elevation, typography, motion, focus, state
- --ml-shadow-0 (none) — no shadow
- --ml-shadow-1 (0 1px 3px rgba(0,0,0,0.1)) — subtle shadow
- --ml-shadow-2 (0 4px 6px rgba(0,0,0,0.1)) — medium shadow
- --ml-font-family (system-ui, -apple-system, sans-serif) — font
- --ml-font-weight-medium (500) — medium weight
- --ml-transition (200ms ease) — default transition
- --ml-focus-ring-color (rgba(59,130,246,0.4)) — focus ring color
- --ml-focus-ring-width (2px) — focus ring width
- --ml-disabled-opacity (0.5) — disabled opacity

### data-class

The component accepts \`data-class\` for consumer-provided CSS classes:
- On host: \`<component data-class="w-full mt-4">\`
- On slots: \`<Label data-class="uppercase tracking-wide">\`

### Shared semantic classes

| Class | Purpose |
|-------|---------|
| ml-label | Field label |
| ml-helper | Helper text |
| ml-error-text | Error message |
| ml-text | Default text |
| ml-text-muted | Secondary text |
| ml-text-faint | Placeholder text |
| ml-disabled | Disabled state |
| ml-skeleton | Loading placeholder |
| ml-spinner | Loading spinner |

Group-specific semantic classes will be defined during component migration.

---

## 10. Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-04-21 | Initial creation reference |
`;