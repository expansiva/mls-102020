/// <mls fileReference="_102020_/l2/skills/molecules/groupEnterDate/creation.ts" enhancement="_blank"/>

export const skill = `

# groupEnterDate — Creation

> Implementation reference for creating molecules in the **groupEnterDate** group.
> Follow the general Lit/Aura rules defined in \`molecule-generation2.md\`.

---

## 1. Metadata

| Field | Value |
|-------|-------|
| **Group** | \`groupEnterDate\` |
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
| \`value\` | \`string \| null\` | \`null\` | \`@propertyDataSource\` | ISO 8601 date string (\`"YYYY-MM-DD"\`) |
| \`error\` | \`string\` | \`''\` | \`@propertyDataSource\` | Error message (empty = no error) |
| \`name\` | \`string\` | \`''\` | \`@propertyDataSource\` | Field name (for forms) |

### 3.2 Configuration

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`locale\` | \`string\` | \`''\` | \`@propertyDataSource\` | Locale for display formatting |
| \`minDate\` | \`string\` | \`''\` | \`@propertyDataSource\` | Minimum allowed date (\`"YYYY-MM-DD"\`) |
| \`maxDate\` | \`string\` | \`''\` | \`@propertyDataSource\` | Maximum allowed date (\`"YYYY-MM-DD"\`) |
| \`placeholder\` | \`string\` | \`''\` | \`@propertyDataSource\` | Placeholder text |
| \`firstDayOfWeek\` | \`number\` | \`0\` | \`@propertyDataSource\` | First day of week: 0=Sunday, 1=Monday |
| \`showWeekNumbers\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Show week numbers in the calendar |

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
| \`isOpen\` | \`boolean\` | \`false\` | \`@state\` | Calendar panel is open |
| \`viewMonth\` | \`number\` | current | \`@state\` | Month currently displayed in calendar |
| \`viewYear\` | \`number\` | current | \`@state\` | Year currently displayed in calendar |

---

## 4. Value Contract

### Storage Format

- \`value\` is always stored as **ISO 8601 date**: \`"YYYY-MM-DD"\`
- **No time component** — never store or emit time information
- \`null\` represents no value selected

### Display Format

| Locale | Stored | Displayed |
|--------|--------|-----------|
| \`en-US\` | \`"2026-04-17"\` | \`04/17/2026\` |
| \`pt-BR\` | \`"2026-04-17"\` | \`17/04/2026\` |
| \`de-DE\` | \`"2026-04-17"\` | \`17.04.2026\` |
| \`en-GB\` | \`"2026-04-17"\` | \`17/04/2026\` |

### View Mode

- If \`value\` is \`null\`, display \`"—"\` (em dash)

---

## 5. Events

| Event | Detail | Bubbles | Description |
|-------|--------|:-------:|-------------|
| \`change\` | \`{ value: string \| null }\` | ✓ | User selected or cleared a date |
| \`monthChange\` | \`{ year: number, month: number }\` | ✓ | Calendar navigated to a different month |
| \`blur\` | \`{}\` | ✓ | Field lost focus |
| \`focus\` | \`{}\` | ✓ | Field received focus |

### Dispatch Example

\`\`\`typescript
this.dispatchEvent(new CustomEvent('change', {
  bubbles: true,
  composed: true,
  detail: { value: this.value } // "2026-04-17" or null
}));
\`\`\`

---

## 6. isEditing Mode

| Mode | \`isEditing\` | Behavior |
|------|-------------|----------|
| **Edit** | \`true\` | Renders input trigger + calendar panel |
| **View** | \`false\` | Renders formatted date as static text |

- In view mode: no input, no calendar, no events, no error, no helper

---

## 6.1 Portal — Calendar Panel Rendering

> The calendar panel MUST be rendered outside the component tree, in \`<body>\`,
> using the **portal pattern** with \`litRender\`. This prevents the calendar from
> being clipped or hidden behind sibling elements when any ancestor uses
> \`backdrop-filter\`, \`transform\`, \`overflow: hidden\`, or explicit \`z-index\`
> (all of which create new CSS stacking contexts).
>
> This applies only to popup calendar implementations. Inline calendar variants
> (always visible, no \`isOpen\`) do not need a portal.

### Import

\\\`\\\`\\\`typescript
import { render as litRender } from 'lit';
\\\`\\\`\\\`

### Required members

| Member | Visibility | Description |
|--------|------------|-------------|
| \`portalContainer\` | \`protected\` | \`HTMLDivElement \\| null\` — the portal element appended to \`<body>\` |
| \`portalClassName\` | \`protected\` | \`string\` — CSS class added to the portal (subclasses set it for scoped styling) |
| \`getPortalTemplate()\` | \`protected\` | Returns \`TemplateResult\` with the calendar panel content. Subclasses override this to render themed variants |

### Lifecycle integration

| Hook | Action |
|------|--------|
| \`openPanel()\` | Call \`createPortal()\` after setting \`isOpen = true\` |
| \`closePanel()\` | Call \`destroyPortal()\` |
| \`disconnectedCallback()\` | Call \`destroyPortal()\` for cleanup |
| \`updated()\` | When \`isOpen && portalContainer\`: call \`renderPortalContent()\` + \`updatePanelPosition()\` — this keeps the calendar in sync when \`viewMonth\`/\`viewYear\` change (month navigation) |

### Portal methods

\\\`\\\`\\\`typescript
private createPortal() {
  if (this.portalContainer) return;
  this.portalContainer = document.createElement('div');
  if (this.portalClassName) this.portalContainer.classList.add(this.portalClassName);
  document.body.appendChild(this.portalContainer);
  this.updatePanelPosition();
  this.renderPortalContent();
  window.addEventListener('scroll', this.boundUpdatePosition, true);
  window.addEventListener('resize', this.boundUpdatePosition);
}

private destroyPortal() { /* same pattern */ }

private updatePanelPosition() {
  if (!this.portalContainer) return;
  const trigger = this.querySelector('button, input') as HTMLElement;
  if (!trigger) return;
  const rect = trigger.getBoundingClientRect();
  Object.assign(this.portalContainer.style, {
    position: 'fixed',
    top: \\\`\\\${rect.bottom + 8}px\\\`,
    left: \\\`\\\${rect.left}px\\\`,
    zIndex: '9999',
  });
  // Note: width is NOT set to trigger width — the calendar has its own
  // natural width which is typically wider than the input field.
}
\\\`\\\`\\\`

### Keyboard navigation in portal

The calendar has its own keyboard navigation (arrows for days, month
navigation). The \`@keydown\` handler must be attached to the portal
template so it works when focus is inside the portal:

\\\`\\\`\\\`typescript
protected getPortalTemplate(): TemplateResult {
  return html\\\`
    <div role="dialog" aria-modal="true" @keydown=\\\${this.handleCalendarKeyDown}>
      ... calendar grid ...
    </div>
  \\\`;
}
\\\`\\\`\\\`

### Outside click — include portal

\\\`\\\`\\\`typescript
if (!this.contains(target) && !this.portalContainer?.contains(target)) {
  this.closePanel();
}
\\\`\\\`\\\`

### render() — no inline calendar

The main \`render()\` includes only the input trigger, label, helper, and error.
The calendar panel is rendered exclusively via \`renderPortalContent()\`.

### CSS — shared selector for portal

\\\`\\\`\\\`less
my-component,
.my-portal-class {
  .calendar-panel { /* panel styles */ }
  .calendar-day   { /* day cell styles */ }
}
\\\`\\\`\\\`

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
| **Hover** | Subtle visual feedback |
| **Open** | Calendar panel visible |
| **Disabled** | Reduced opacity, no interaction |
| **Readonly** | No editing, text selectable |
| **Error** | Error border/style, error message visible |
| **Loading** | Loading indicator visible |
| **View Mode** | Formatted text only, no calendar |

---

## 9. Value Handling

### Parsing

- Calendar day selection → \`"YYYY-MM-DD"\` string
- Never derive or append a time component

### minDate / maxDate

- Disable calendar days that fall outside the allowed range
- Prevent navigation to months entirely before \`minDate\` or after \`maxDate\`

---

## 10. Accessibility (a11y)

| Requirement | Implementation |
|-------------|----------------|
| Associated label | \`aria-labelledby\` |
| Error announced | \`aria-describedby\` pointing to error element |
| Invalid state | \`aria-invalid="true"\` when error exists |
| Required field | \`aria-required="true"\` |
| Calendar dialog | \`role="dialog"\`, \`aria-modal="true"\` |
| Day cells | \`role="gridcell"\`, \`aria-selected\`, \`aria-disabled\` |
| Month heading | \`aria-live="polite"\` |

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
| **Date Picker** | Input trigger + calendar popup |
| **Date Input** | Masked text input (\`MM/DD/YYYY\`) |
| **Calendar Inline** | Always-visible calendar, no popup |
| **Month Picker** | Select month + year only, no day |

---

## 13. Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-04-17 | Initial creation reference |
| 1.1.0 | 2026-06-22 | Added §6.1 Portal — calendar panel must render in \`<body>\` via \`litRender\`; calendar width independent of trigger; keyboard navigation in portal |

`