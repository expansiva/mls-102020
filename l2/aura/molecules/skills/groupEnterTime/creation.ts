/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupEnterTime/creation.ts" enhancement="_blank"/>

export const skill = `
# groupEnterTime — Creation

> Implementation reference for creating molecules in the **groupEnterTime** group.
> Follow the general Lit/Aura rules defined in \`molecule-generation2.md\`.

---

## 1. Metadata

| Field | Value |
|-------|-------|
| **Group** | \`groupEnterTime\` |
| **Category** | Data Entry |
| **Version** | \`1.0.0\` |

---

## 2. Slot Tags

| Tag | Required | Description |
|-----|:--------:|-------------|
| \`Label\` | No | Field label |
| \`Helper\` | No | Help text displayed below the field |

\`\`\`typescript
slotTags = ['Label', 'Helper'];
\`\`\`

---

## 3. Properties

### 3.1 Data

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`value\` | \`string \| null\` | \`null\` | \`@propertyDataSource\` | Time string in 24h format: \`"HH:mm"\` or \`"HH:mm:ss"\` |
| \`error\` | \`string\` | \`''\` | \`@propertyDataSource\` | Error message (empty = no error) |
| \`name\` | \`string\` | \`''\` | \`@propertyDataSource\` | Field name (for forms) |

### 3.2 Configuration

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`locale\` | \`string\` | \`''\` | \`@propertyDataSource\` | Locale for display formatting |
| \`hour12\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Display in 12-hour format (AM/PM) |
| \`showSeconds\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Include seconds in input and stored value |
| \`minuteStep\` | \`number\` | \`1\` | \`@propertyDataSource\` | Minutes increment in picker |
| \`minTime\` | \`string\` | \`''\` | \`@propertyDataSource\` | Minimum allowed time (\`"HH:mm"\`) |
| \`maxTime\` | \`string\` | \`''\` | \`@propertyDataSource\` | Maximum allowed time (\`"HH:mm"\`) |
| \`placeholder\` | \`string\` | \`''\` | \`@propertyDataSource\` | Placeholder text |

### 3.3 States

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`isEditing\` | \`boolean\` | \`true\` | \`@propertyDataSource\` | Edit mode (true) or view mode (false) |
| \`disabled\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Field is disabled |
| \`readonly\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Field is read-only |
| \`required\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Field is required |
| \`loading\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Loading state |

### 3.4 Internal State

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`isOpen\` | \`boolean\` | \`false\` | \`@state\` | Time picker panel is open |

---

## 4. Value Contract

### Storage Format

- \`value\` is always stored in **24-hour format**: \`"HH:mm"\`
- When \`showSeconds=true\`: \`"HH:mm:ss"\`
- **No date component** — never store or emit date information
- \`null\` represents no value selected

### Display Format

Display respects \`hour12\` and \`locale\`. The stored value is never modified.

| \`hour12\` | Stored | Displayed |
|----------|--------|-----------|
| \`false\` | \`"14:30"\` | \`14:30\` |
| \`true\` | \`"14:30"\` | \`02:30 PM\` |
| \`false\` | \`"08:05:30"\` | \`08:05:30\` |
| \`true\` | \`"08:05:30"\` | \`08:05:30 AM\` |

### View Mode

- If \`value\` is \`null\`, display \`"—"\` (em dash)

---

## 5. Events

| Event | Detail | Bubbles | Description |
|-------|--------|:-------:|-------------|
| \`change\` | \`{ value: string \| null }\` | ✓ | Time confirmed or cleared |
| \`blur\` | \`{}\` | ✓ | Field lost focus |
| \`focus\` | \`{}\` | ✓ | Field received focus |

### Dispatch Example

\`\`\`typescript
this.dispatchEvent(new CustomEvent('change', {
  bubbles: true,
  composed: true,
  detail: { value: this.value } // "14:30" or null
}));
\`\`\`

---

## 6. isEditing Mode

| Mode | \`isEditing\` | Behavior |
|------|-------------|----------|
| **Edit** | \`true\` | Renders time input + picker panel |
| **View** | \`false\` | Renders formatted time as static text |

- In view mode: no input, no picker, no events, no error, no helper

---

## 6.1 Portal — Time Picker Panel Rendering

> The time picker panel MUST be rendered outside the component tree, in \`<body>\`,
> using the **portal pattern** with \`litRender\`. This prevents the panel from
> being clipped or hidden behind sibling elements when any ancestor uses
> \`backdrop-filter\`, \`transform\`, \`overflow: hidden\`, or explicit \`z-index\`
> (all of which create new CSS stacking contexts).
>
> This applies only to popup time picker implementations. Inline variants
> (always visible, no \`isOpen\`) do not need a portal.

### Import

\\\`\\\`\\\`typescript
import { render as litRender } from 'lit';
\\\`\\\`\\\`

### Required members

| Member | Visibility | Description |
|--------|------------|-------------|
| \`portalContainer\` | \`protected\` | \`HTMLDivElement \\| null\` — the portal element appended to \`<body>\` |
| \`portalWidgetName\` | \`protected\` | \`string\` — value of the \`data-widget\` attribute set on the portal container (the molecule tag name; the \`.less\` targets it via \`div[data-widget="..."]\`) |
| \`getPortalTemplate()\` | \`protected\` | Returns \`TemplateResult\` with the time picker content. Subclasses override this to render themed variants |

### Lifecycle integration

| Hook | Action |
|------|--------|
| \`openPanel()\` | Call \`createPortal()\` after setting \`isOpen = true\` |
| \`closePanel()\` | Call \`destroyPortal()\` |
| \`disconnectedCallback()\` | Call \`destroyPortal()\` for cleanup |
| \`updated()\` | When \`isOpen && portalContainer\`: call \`renderPortalContent()\` + \`updatePanelPosition()\` |

### Scrollable columns inside portal

Time pickers typically contain scrollable columns (hours, minutes, seconds).
The \`overflow-auto\` must be on the **inner column containers**, not on the
portal container itself. The portal container has no overflow — it just
positions the panel.

### CSS — shared selector for portal

Panel styles must work both inside the component and in the body-level portal.
Use a shared selector in the \`.less\` file:

\\\`\\\`\\\`less
my-component,
div[data-widget="my-component"] {
  .panel { /* panel styles */ }
}
\\\`\\\`\\\`

Both selectors are TOP-LEVEL — the list is a sibling of the main
\`my-component { ... }\` block, NEVER nested inside it (nesting compiles to a
descendant selector that never matches the body-level portal, so the panel
renders unstyled). \`my-component\` is always this molecule's OWN tag.

### Reference implementation

\`mls-102040/l2/molecules/groupselectone/ml-card-selector.ts\` (same portal pattern)

---

## 7. Error Handling

| \`error\` value | Behavior |
|---------------|----------|
| \`''\` | No error — show Helper if slot exists |
| \`'any message'\` | Show error message, apply error visual state |

- Error never shown in view mode
- Page/Organism is responsible for setting the error message

---

## 8. Visual States

| State | Behavior |
|-------|----------|
| **Normal** | Default appearance |
| **Focus** | Highlighted border or outline |
| **Open** | Time picker panel visible |
| **Disabled** | Reduced opacity, no interaction |
| **Readonly** | No editing, text selectable |
| **Error** | Error border/style, error message visible |
| **Loading** | Loading indicator visible |
| **View Mode** | Formatted text only, no picker |

---

## 9. Value Handling

### minuteStep

- Only render minutes that are multiples of \`minuteStep\`
- Example: \`minuteStep=15\` → show 00, 15, 30, 45

### minTime / maxTime

- Disable hours/minutes outside the allowed range
- For boundary hours: disable only the out-of-range minutes

### showSeconds

- When \`false\`: store \`"HH:mm"\`, hide seconds column
- When \`true\`: store \`"HH:mm:ss"\`, show seconds column (always step 1)

### hour12

- Display only — never affects stored format
- Internally always convert to/from 24h

---

## 10. Accessibility (a11y)

| Requirement | Implementation |
|-------------|----------------|
| Associated label | \`aria-labelledby\` |
| Error announced | \`aria-describedby\` pointing to error element |
| Invalid state | \`aria-invalid="true"\` when error exists |
| Required field | \`aria-required="true"\` |
| Picker dialog | \`role="dialog"\`, \`aria-modal="true"\` |
| Current value | \`aria-label\` on trigger with formatted time |

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

## 12. Possible Implementations

| Component | Description |
|-----------|-------------|
| **Time Picker** | Input + scrollable columns panel |
| **Time Input** | Masked text input \`HH:mm\` |
| **Time Spinner** | Up/down arrows per segment |
| **Clock Face** | Analog clock for hour + minute selection |

---

## 13. Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-04-17 | Initial creation reference |
| 1.1.0 | 2026-06-22 | Added §6.1 Portal — time picker panel must render in \`<body>\` via \`litRender\`; scrollable columns inside portal |
| 1.2.0 | 2026-07-17 | Added CSS — shared selector for portal (top-level, never nested; own tag only) |

`;