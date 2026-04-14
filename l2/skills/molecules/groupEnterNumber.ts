/// <mls fileReference="_102020_/l2/skills/molecules/groupEnterNumber.ts" enhancement="_blank"/>

export const skill = `
# Skill Group Contract: \`enter + number\`

> Official contract for molecules in the **enter + number** group in the Collab Aura system.

---

## 1. Metadata

| Field | Value |
|-------|-------|
| **Group** | \`enter + number\` |
| **Category** | Data Entry |
| **Intent** | User wants to provide a **numeric value** |
| **Version** | \`1.0.0\` |

---

## 2. When to Use

- Quantity input
- Monetary values
- Measurements and dimensions
- Numeric configurations
- Percentages
- Ages, weights, heights

---

## 3. When NOT to Use

| Scenario | Use instead |
|----------|-------------|
| Free-form text | \`enter + text\` |
| Date/time | \`enter + datetime\` |
| Rating/scoring | \`rate + item\` |
| Phone numbers (formatted) | \`enter + text\` with mask |

---

## 4. Slot Tags

| Tag | Required | Description |
|-----|:--------:|-------------|
| \`Label\` | No | Field label |
| \`Prefix\` | No | Content before input (currency symbol, icons) |
| \`Suffix\` | No | Content after input (unit, buttons) |
| \`Helper\` | No | Help text displayed below the field |
| \`Error\` | No | Error message  |

### HTML Structure

\`\`\`html
<molecules--number-input-102020 value="1500.00" min="0" step="0.01" required>
  <Label>Price</Label>
  <Prefix>$</Prefix>
  <Suffix>USD</Suffix>
  <Helper>Minimum value is $10.00</Helper>
  <Error>Invalid value</Error>
</molecules--number-input-102020>
\`\`\`

---

## 5. Properties

### 5.1 Data

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`value\` | \`number \| null\` | \`null\` | \`@propertyDataSource\` | Current numeric value |
| \`name\` | \`string\` | \`''\` | \`@property\` | Field name (for forms) |

### 5.2 Configuration

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`min\` | \`number\` | \`undefined\` | \`@property\` | Minimum allowed value |
| \`max\` | \`number\` | \`undefined\` | \`@property\` | Maximum allowed value |
| \`step\` | \`number\` | \`1\` | \`@property\` | Increment/decrement step |
| \`precision\` | \`number\` | \`undefined\` | \`@property\` | Decimal places (auto-format) |
| \`placeholder\` | \`string\` | \`''\` | \`@property\` | Placeholder text |
| \`inputmode\` | \`string\` | \`'decimal'\` | \`@property\` | Virtual keyboard mode |

#### Valid values for \`inputmode\`

| Value | Description |
|-------|-------------|
| \`numeric\` | Numeric keyboard (integers) |
| \`decimal\` | Numeric keyboard with decimal separator |

### 5.3 States

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`disabled\` | \`boolean\` | \`false\` | \`@property\` | Field is disabled |
| \`readonly\` | \`boolean\` | \`false\` | \`@property\` | Field is read-only |
| \`required\` | \`boolean\` | \`false\` | \`@property\` | Field is required |
| \`loading\` | \`boolean\` | \`false\` | \`@property\` | Loading state |

---

## 6. Events

| Event | Detail | Bubbles | Description |
|-------|--------|:-------:|-------------|
| \`change\` | \`{ value: number \| null }\` | ✓ | Value changed (after blur, enter, or stepper) |
| \`input\` | \`{ value: number \| null }\` | ✓ | Value changed (on each keystroke) |
| \`blur\` | \`{}\` | ✓ | Field lost focus |
| \`focus\` | \`{}\` | ✓ | Field received focus |
| \`enter\` | \`{ value: number \| null }\` | ✓ | User pressed Enter |
| \`step\` | \`{ value: number \| null, direction: 'up' \| 'down' }\` | ✓ | Stepper button clicked |

### Event Dispatch Example

\`\`\`typescript
this.dispatchEvent(new CustomEvent('change', {
  bubbles: true,
  composed: true,
  detail: { value: this.value }
}));
\`\`\`

---

## 7. Visual States

| State | Behavior |
|-------|----------|
| **Normal** | Default appearance, text cursor |
| **Focus** | Highlighted border or outline |
| **Hover** | Subtle visual feedback |
| **Disabled** | Reduced opacity, no interaction |
| **Readonly** | No editing allowed, text selectable |
| **Error** | Error visual indicator |
| **Loading** | Loading indicator visible |

---

## 8. Rendering Logic

\`\`\`
RENDER:

1. Main container
   - Apply state styles (disabled, etc.)

2. IF hasSlot('Label'):
   - Render label above input
   - IF required: add visual indicator (*)

3. Input wrapper:
   a. IF hasSlot('Prefix'):
      - Render Prefix content on the left
   
   b. Input element:
      - type="text" with numeric filtering
      - value, placeholder, min, max, step
      - Events: input, change, blur, focus, keydown
   
   c. IF loading:
      - Render loading indicator
   ELSE IF hasSlot('Suffix'):
      - Render Suffix content on the right

4. Below input:
   IF error AND (error is string OR hasSlot('Error')):
      - Render error message
   ELSE IF hasSlot('Helper'):
      - Render help text
\`\`\`

---

## 9. Value Handling

### Input Filtering

- Allow only: digits, decimal separator, minus sign (if min < 0)
- Prevent multiple decimal separators
- Prevent minus sign except at start

### Value Parsing

- Parse input string to number on blur/change
- Return \`null\` for empty or invalid input
- Apply precision formatting if defined

### Validation

| Rule | Condition | Behavior |
|------|-----------|----------|
| Min | \`value < min\` | Show error, clamp on blur (optional) |
| Max | \`value > max\` | Show error, clamp on blur (optional) |
| Required | \`value === null && required\` | Show error |

---

## 10. Accessibility (a11y)

| Requirement | Implementation |
|-------------|----------------|
| Associated label | \`aria-labelledby\` or \`<label for>\` |
| Error announced | \`aria-describedby\` pointing to error |
| Invalid state | \`aria-invalid="true"\` when error |
| Required field | \`aria-required="true"\` |
| Value bounds | \`aria-valuemin\`, \`aria-valuemax\` |
| Current value | \`aria-valuenow\` |
| Helper text | \`aria-describedby\` including helper |

### ID Structure

\`\`\`html
<label id="number-label-{uid}">...</label>
<input 
  type="text"
  inputmode="decimal"
  aria-labelledby="number-label-{uid}"
  aria-describedby="number-helper-{uid} number-error-{uid}"
  aria-invalid="true"
  aria-required="true"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-valuenow="50"
/>
<div id="number-helper-{uid}">...</div>
<div id="number-error-{uid}">...</div>
\`\`\`

## 12. Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-04-14 | Initial contract version |


`