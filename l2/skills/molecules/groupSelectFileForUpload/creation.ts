/// <mls fileReference="_102020_/l2/skills/molecules/groupSelectFileForUpload/creation.ts" enhancement="_blank"/>

export const skill = `
# groupSelectFileForUpload — Creation

> Implementation reference for creating molecules in the **groupSelectFileForUpload** group.
> Follow the general Lit/Aura rules defined in \`molecule-generation2.md\`.

---

## 1. Metadata

| Field | Value |
|-------|-------|
| **Group** | \`groupSelectFileForUpload\` |
| **Category** | Data Entry |
| **Version** | \`1.0.1\` |

---

## 2. Slot Tags

| Tag | Required | Description |
|-----|:--------:|-------------|
| \`Label\` | No | Label displayed above or beside the field |
| \`Helper\` | No | Help text displayed below the field |
| \`Trigger\` | No | Custom content for the file selection button or drop zone |

\`\`\`typescript
slotTags = ['Label', 'Helper', 'Trigger'];
\`\`\`

### Slot Hierarchy

\`\`\`
component (root)
├── <Label>
├── <Trigger>
└── <Helper>
\`\`\`

---


## 3. Properties

### 3.1 Data

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`value\` | \`File[]\` | \`[]\` | \`@propertyDataSource\` | Currently selected files |
| \`error\` | \`string\` | \`''\` | \`@propertyDataSource\` | Error message (empty = no error) |

### 3.2 Configuration

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`multiple\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Allow selecting more than one file |
| \`accept\` | \`string\` | \`''\` | \`@propertyDataSource\` | Accepted file types (e.g. \`'image/*'\`, \`'.pdf,.docx'\`) |
| \`maxSizeKb\` | \`number\` | \`0\` | \`@propertyDataSource\` | Maximum file size in KB per file (0 = no limit) |
| \`maxFiles\` | \`number\` | \`0\` | \`@propertyDataSource\` | Maximum number of files when \`multiple=true\` (0 = no limit) |

### 3.3 States

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`disabled\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Field is disabled |
| \`loading\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Loading state (e.g. upload in progress, controlled by page) |

### 3.4 Internal State

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`isDragging\` | \`boolean\` | \`false\` | \`@state\` | Whether a file is being dragged over the drop zone |

---

## 4. Value Contract

- \`value\` holds the current \`File[]\` bound to the global state via \`@propertyDataSource\`
- Default is \`[]\` (empty array)
- When the user selects or drops files, they are validated and merged into \`value\`
- When the user removes a file, it is removed from \`value\`
- The page reads \`value\` from the state and is responsible for uploading via BFF

---

## 5. Events

| Event | Detail | Bubbles | Description |
|-------|--------|:-------:|-------------|
| \`reject\` | \`{ files: File[], reason: 'size' \| 'type' \| 'count' }\` | ✓ | Fired when files are rejected due to validation |

### Dispatch Example

\`\`\`typescript
this.dispatchEvent(new CustomEvent('reject', {
  bubbles: true,
  composed: true,
  detail: { files: rejectedFiles, reason: 'size' }
}));
\`\`\`

---

## 6. File Validation

Validation happens before adding files to \`value\`. Invalid files are emitted via \`reject\`.

| Rule | Condition | Reject reason |
|------|-----------|---------------|
| File type | \`accept\` is set and file type does not match | \`'type'\` |
| File size | \`maxSizeKb > 0\` and file size exceeds limit | \`'size'\` |
| File count | \`maxFiles > 0\` and total count would exceed limit | \`'count'\` |

- Valid files are merged into \`value\`
- Invalid files are emitted via \`reject\` event
- If all files are invalid, \`value\` remains unchanged

---

## 7. Drag and Drop

When the implementation supports drag and drop:

\`\`\`
@dragover: preventDefault(), set isDragging = true
@dragleave: set isDragging = false
@drop: preventDefault(), set isDragging = false
        extract files from event.dataTransfer.files
        run validation, add valid files to value, emit reject for invalid
\`\`\`

- \`isDragging\` drives the visual highlight of the drop zone
- Drop zone must call \`event.preventDefault()\` on \`dragover\` to allow dropping

---

## 8. Error Handling

| \`error\` value | Behavior |
|---------------|----------|
| \`''\` | No error — show Helper if slot exists |
| \`'any message'\` | Show error message, apply error visual state |

- Page/Organism is responsible for setting the error message
- Validation rejections are surfaced via the \`reject\` event — page decides how to display them

---

## 9. Visual States

| State | Behavior |
|-------|----------|
| **Normal** | Default appearance |
| **Dragging** | Drop zone highlighted, visual feedback |
| **Disabled** | Reduced opacity, no interaction, drag ignored |
| **Error** | Error border/style, error message visible |
| **Loading** | Loading indicator visible, interaction blocked |

---

## 10. Accessibility (a11y)

| Requirement | Implementation |
|-------------|----------------|
| Input | \`<input type="file">\` always present (visually hidden) |
| Label | \`aria-labelledby\` pointing to rendered label |
| Error | \`aria-describedby\` pointing to error element |
| Invalid | \`aria-invalid="true"\` when error exists |
| Drop zone | \`role="button"\`, \`tabindex="0"\`, \`aria-label\` describing action |
| Keyboard | \`Enter\`/\`Space\` on drop zone triggers file picker |

---

## 11. Design Tokens

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

## 12. Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-04-20 | Initial creation reference |
`;
