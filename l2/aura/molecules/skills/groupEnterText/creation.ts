/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupEnterText/creation.ts" enhancement="_blank"/>

export const skill = `
# groupEnterText — Creation

> Implementation reference for creating molecules in the **groupEnterText** group.
> Follow the general Lit/Aura rules defined in \`molecule-generation2.md\`.

---

## 1. Metadata

| Field | Value |
|-------|-------|
| **Group** | \`groupEnterText\` |
| **Category** | Data Entry |
| **Version** | \`1.0.0\` |

---

## 2. Slot Tags

| Tag | Required | Description |
|-----|:--------:|-------------|
| \`Label\` | No | Label displayed above or beside the field |
| \`Helper\` | No | Help text displayed below the field |
| \`Prefix\` | No | Content rendered before the input (e.g. icon, static text) |
| \`Suffix\` | No | Content rendered after the input (e.g. icon, action button) |

\`\`\`typescript
slotTags = ['Label', 'Helper', 'Prefix', 'Suffix'];
\`\`\`

---

## 3. Properties

### 3.1 Data

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`value\` | \`string\` | \`''\` | \`@propertyDataSource\` | Current text value |
| \`error\` | \`string\` | \`''\` | \`@propertyDataSource\` | Error message (empty = no error) |
| \`name\` | \`string\` | \`''\` | \`@propertyDataSource\` | Field name (for forms) |

### 3.2 Configuration

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`placeholder\` | \`string\` | \`''\` | \`@propertyDataSource\` | Placeholder text when value is empty |
| \`maxLength\` | \`number \| null\` | \`null\` | \`@propertyDataSource\` | Maximum number of characters (null = no limit) |
| \`minLength\` | \`number \| null\` | \`null\` | \`@propertyDataSource\` | Minimum number of characters (null = no minimum) |
| \`rows\` | \`number\` | \`1\` | \`@propertyDataSource\` | Number of visible rows (>1 renders a textarea) |
| \`autocomplete\` | \`string\` | \`''\` | \`@propertyDataSource\` | HTML autocomplete attribute value (e.g. \`'email'\`, \`'name'\`, \`'off'\`) |
| \`inputType\` | \`string\` | \`'text'\` | \`@propertyDataSource\` | HTML input type: \`'text'\`, \`'email'\`, \`'password'\`, \`'search'\`, \`'url'\`, \`'tel'\` |
| \`mask\` | \`string\` | \`''\` | \`@propertyDataSource\` | Input mask pattern (e.g. \`'(##) #####-####'\` for phone). \`#\` = digit, \`A\` = letter, \`*\` = any |

### 3.3 States

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`isEditing\` | \`boolean\` | \`true\` | \`@propertyDataSource\` | Edit mode (true) or view mode (false) |
| \`disabled\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Field is disabled |
| \`readonly\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Field is read-only |
| \`required\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Value is required |
| \`loading\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Loading state |

---

## 4. Value Contract

### Storage Format

- Value stored and emitted as a plain **string**
- Empty string \`''\` means no value entered
- When \`mask\` is set, \`value\` always stores the **raw unmasked string** — the mask is display only
- When \`inputType='password'\`, value is never displayed back to the user

### View Mode

- If value is \`''\`: display \`"—"\`
- If \`inputType='password'\`: display \`"••••••••"\` regardless of value length
- Otherwise: display value as plain text
- Prefix/Suffix slots are rendered in view mode

---

## 5. Events

| Event | Detail | Bubbles | Description |
|-------|--------|:-------:|-------------|
| \`change\` | \`{ value: string }\` | ✓ | Value confirmed on blur |
| \`input\` | \`{ value: string }\` | ✓ | Value changed on each keystroke |
| \`blur\` | \`{}\` | ✓ | Field lost focus |
| \`focus\` | \`{}\` | ✓ | Field received focus |

### Dispatch Example

\`\`\`typescript
this.dispatchEvent(new CustomEvent('change', {
  bubbles: true,
  composed: true,
  detail: { value: this.value }
}));
\`\`\`

---

## 6. isEditing Mode

| Mode | \`isEditing\` | Behavior |
|------|-------------|----------|
| **Edit** | \`true\` | Renders input or textarea |
| **View** | \`false\` | Renders value as static text |

- In view mode: no input, no events, no error, no helper

---

## 7. Input vs Textarea

| Condition | Element rendered |
|-----------|-----------------|
| \`rows = 1\` | \`<input>\` |
| \`rows > 1\` | \`<textarea>\` |

- \`<textarea>\` does not support \`inputType\` or \`mask\`
- When \`rows > 1\` and \`maxLength\` is set: display a character counter below the field (e.g. \`42 / 200\`)

---

## 8. Mask Logic

When \`mask\` is set:

- Apply mask on every \`@input\` event before updating \`value\`
- \`value\` stores only the raw digits/letters extracted from the masked string
- Display shows the formatted mask string in \`rawDisplay\`
- Mask characters: \`#\` = digit only, \`A\` = letter only, \`*\` = any character
- Literal characters in the mask (e.g. \`(\`, \`)\`, \`-\`, space) are inserted automatically

\`\`\`
Example: mask="(##) #####-####"
User types: "11987654321"
rawDisplay:  "(11) 98765-4321"
value:       "11987654321"
\`\`\`

---

## 9. Validation Rules

| Rule | Behavior |
|------|----------|
| \`value.length < minLength\` | Error state; Page sets the error message |
| \`value.length > maxLength\` | Block input beyond the limit |
| \`required\` and \`value === ''\` | Error state until text is entered |
| \`inputType='email'\` | Page is responsible for format validation |

---

## 10. Error Handling

| \`error\` value | Behavior |
|---------------|----------|
| \`''\` | No error — show Helper if slot exists |
| \`'any message'\` | Show error message, apply error visual state |

- Error never shown in view mode
- Page/Organism is responsible for setting the error message

---

## 11. Visual States

| State | Behavior |
|-------|----------|
| **Normal** | Default appearance |
| **Focused** | Input border highlighted |
| **Filled** | Value present |
| **Disabled** | Reduced opacity, no interaction |
| **Readonly** | No editing, text selectable |
| **Error** | Error border/style, error message visible |
| **Loading** | Loading indicator visible, input blocked |
| **View Mode** | Plain text only |

---

## 12. Accessibility (a11y)

| Requirement | Implementation |
|-------------|----------------|
| Label | \`aria-labelledby\` pointing to rendered label |
| Error | \`aria-describedby\` pointing to error element |
| Invalid | \`aria-invalid="true"\` when error exists |
| Required | \`aria-required="true"\` |
| Password | Never \`aria-label\` the actual value |
| Character counter | \`aria-live="polite"\` so screen readers announce remaining characters |

---

## 13. Design Tokens

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

### Semantic classes

| Class | Purpose |
|-------|---------|
| ml-input-container | Input wrapper (background, border, radius, focus ring) |
| ml-input-container-error | Error state border |
| ml-input | Input text (color, font, placeholder) |
| ml-label | Field label |
| ml-helper | Helper text |
| ml-error-text | Error message |
| ml-text | Default text |
| ml-text-muted | Secondary text (prefix, suffix) |
| ml-text-faint | Tertiary text (inline label) |
| ml-spinner | Loading spinner |
| ml-disabled | Disabled state |

---

## 14. Possible Implementations

| Component | Description |
|-----------|-------------|
| **Text Input** | Single-line plain text field |
| **Textarea** | Multi-line text field with optional character counter |
| **Password Input** | Single-line input with show/hide toggle |
| **Masked Input** | Input with automatic formatting (phone, CPF, ZIP) |
| **Search Input** | Input with search icon and clear button |
| **Tag Input** | Input that converts entries into removable tags |

---

## 15. Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-04-20 | Initial creation reference |

`;