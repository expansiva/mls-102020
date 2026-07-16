/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupEnterNumberInterval/creation.ts" enhancement="_blank"/>

export const skill = `
# groupEnterNumberInterval — Creation

> Implementation reference for creating molecules in the **groupEnterNumberInterval** group.
> Follow the general Lit/Aura rules defined in \`molecule-generation2.md\`.

---

## 1. Metadata

| Field | Value |
|-------|-------|
| **Group** | \`groupEnterNumberInterval\` |
| **Category** | Data Entry |
| **Version** | \`1.0.0\` |

---

## 2. Slot Tags

| Tag | Required | Description |
|-----|:--------:|-------------|
| \`Label\` | No | Overall label for the range field |
| \`LabelStart\` | No | Label for the lower-value control |
| \`LabelEnd\` | No | Label for the upper-value control |
| \`Helper\` | No | Help text displayed below the field |
| \`Prefix\` | No | Content rendered before each value (e.g. unit symbol \`R$\`) |
| \`Suffix\` | No | Content rendered after each value (e.g. unit label \`%\`, \`kg\`) |

\`\`\`typescript
slotTags = ['Label', 'LabelStart', 'LabelEnd', 'Helper', 'Prefix', 'Suffix'];
\`\`\`

---

## 3. Properties

### 3.1 Data

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`startValue\` | \`number \| null\` | \`null\` | \`@propertyDataSource\` | Lower bound of the interval |
| \`endValue\` | \`number \| null\` | \`null\` | \`@propertyDataSource\` | Upper bound of the interval |
| \`error\` | \`string\` | \`''\` | \`@propertyDataSource\` | Error message (empty = no error) |
| \`name\` | \`string\` | \`''\` | \`@propertyDataSource\` | Field name (for forms) |

### 3.2 Configuration

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`min\` | \`number \| null\` | \`null\` | \`@propertyDataSource\` | Absolute floor for both controls (null = no minimum) |
| \`max\` | \`number \| null\` | \`null\` | \`@propertyDataSource\` | Absolute ceiling for both controls (null = no maximum) |
| \`step\` | \`number\` | \`1\` | \`@propertyDataSource\` | Increment for both controls |
| \`decimals\` | \`number\` | \`0\` | \`@propertyDataSource\` | Number of decimal places allowed |
| \`locale\` | \`string\` | \`''\` | \`@propertyDataSource\` | Locale for display formatting (e.g. \`'en-US'\`, \`'pt-BR'\`) |
| \`placeholder\` | \`string\` | \`''\` | \`@propertyDataSource\` | Placeholder text when the interval is unset |
| \`minGap\` | \`number\` | \`0\` | \`@propertyDataSource\` | Minimum distance between \`startValue\` and \`endValue\` (0 = no minimum) |
| \`maxGap\` | \`number\` | \`0\` | \`@propertyDataSource\` | Maximum distance between \`startValue\` and \`endValue\` (0 = no maximum) |

### 3.3 States

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`isEditing\` | \`boolean\` | \`true\` | \`@propertyDataSource\` | Edit mode (true) or view mode (false) |
| \`disabled\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Field is disabled |
| \`readonly\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Field is read-only |
| \`required\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Both values are required |
| \`loading\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Loading state |

### 3.4 Internal State

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`activeHandle\` | \`string \| null\` | \`null\` | \`@state\` | Which control is being adjusted: \`'start'\`, \`'end'\`, or \`null\` |

---

## 4. Value Contract

### Storage Format

- Both values stored and emitted as native **JavaScript numbers**
- \`null\` means not yet provided
- \`startValue\` must never exceed \`endValue\` (the pair is clamped — see §7)
- Decimal precision controlled by \`decimals\`; display respects \`locale\` and Prefix/Suffix
- When \`decimals = 0\`, only integers are accepted

### Display Format

| \`locale\` | \`decimals\` | Interval | Displayed |
|----------|------------|----------|-----------|
| \`'pt-BR'\` | \`0\` | \`200\` → \`750\` | \`200 – 750\` |
| \`'pt-BR'\` | \`2\` | \`19.9\` → \`199.9\` | \`19,90 – 199,90\` |
| \`''\` | \`0\` | \`0\` → \`100\` | \`0 – 100\` (browser default) |

### View Mode

- If both are \`null\`: display \`"—"\`
- If only \`startValue\` is set: display \`"startValue – —"\`
- If both set: display full formatted interval (with Prefix/Suffix)

---

## 5. Events

| Event | Detail | Bubbles | Description |
|-------|--------|:-------:|-------------|
| \`change\` | \`{ startValue: number \| null, endValue: number \| null }\` | ✓ | Interval confirmed (on release or blur) |
| \`input\` | \`{ startValue: number \| null, endValue: number \| null }\` | ✓ | Fired continuously while either control is adjusted |
| \`blur\` | \`{}\` | ✓ | Field lost focus |
| \`focus\` | \`{}\` | ✓ | Field received focus |

### Dispatch Example

\`\`\`typescript
this.dispatchEvent(new CustomEvent('change', {
  bubbles: true,
  composed: true,
  detail: {
    startValue: this.startValue, // 200
    endValue: this.endValue      // 750
  }
}));
\`\`\`

---

## 6. isEditing Mode

| Mode | \`isEditing\` | Behavior |
|------|-------------|----------|
| **Edit** | \`true\` | Renders two adjustable controls (slider handles or from/to inputs) |
| **View** | \`false\` | Renders the formatted interval as static text |

- In view mode: no controls, no events, no error, no helper

---

## 7. Gap / Clamp Logic

Keep the pair ordered and within bounds and gap constraints:

\`\`\`typescript
function clampToBounds(value: number, min: number | null, max: number | null): number {
  let next = value;
  if (min !== null) next = Math.max(next, min);
  if (max !== null) next = Math.min(next, max);
  return next;
}

// When the lower control moves: never let it pass the upper one (respecting minGap).
function clampPair(start: number, end: number, minGap: number, maxGap: number): { start: number; end: number } {
  let s = start;
  let e = end;
  if (s > e) e = s;                       // keep order
  if (minGap > 0 && e - s < minGap) e = s + minGap;
  if (maxGap > 0 && e - s > maxGap) e = s + maxGap;
  return { start: s, end: e };
}
\`\`\`

---

## 8. Validation Rules

| Rule | Behavior |
|------|----------|
| Value < \`min\` | Clamp to \`min\` |
| Value > \`max\` | Clamp to \`max\` |
| \`startValue > endValue\` | Reorder/clamp so \`startValue ≤ endValue\` |
| Gap < \`minGap\` | Push the opposite control to satisfy the minimum gap |
| Gap > \`maxGap\` | Push the opposite control to satisfy the maximum gap |
| Decimals > \`decimals\` | Round to the configured precision |
| \`required\` and either \`null\` | Error state until both values are provided |

---

## 9. Error Handling

| \`error\` value | Behavior |
|---------------|----------|
| \`''\` | No error — show Helper if slot exists |
| \`'any message'\` | Show error message, apply error visual state |

- Error never shown in view mode
- Page/Organism is responsible for setting the error message

---

## 10. Visual States

| State | Behavior |
|-------|----------|
| **Normal** | Default appearance |
| **Active (start)** | Lower control being adjusted |
| **Active (end)** | Upper control being adjusted |
| **Complete** | Both values selected |
| **Disabled** | Reduced opacity, no interaction |
| **Readonly** | No editing, text selectable |
| **Error** | Error border/style, error message visible |
| **Loading** | Loading indicator visible, controls blocked |
| **View Mode** | Formatted text only |

---

## 11. Accessibility (a11y)

| Requirement | Implementation |
|-------------|----------------|
| Labels | \`aria-labelledby\` for each control |
| Error | \`aria-describedby\` pointing to error element |
| Invalid | \`aria-invalid="true"\` when error exists |
| Required | \`aria-required="true"\` |
| Min/Max | \`aria-valuemin\` / \`aria-valuemax\` on each control |
| Current value | \`aria-valuenow\` on each control |
| Readonly | \`aria-readonly="true"\` when read-only |

---

## 12. Design Tokens

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

## 13. Possible Implementations

| Component | Description |
|-----------|-------------|
| **Number Range Slider** | Dual-handle slider over a bounded numeric track |
| **Number Range Inputs** | Two numeric inputs (from / to) |
| **Histogram Range** | Dual-handle slider laid over a distribution histogram |

---

## 14. Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-06-30 | Initial creation reference |

`
