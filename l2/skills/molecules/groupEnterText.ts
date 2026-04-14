/// <mls fileReference="_102020_/l2/skills/molecules/groupEnterText.ts" enhancement="_blank"/>

export const skill = `
# Skill Group Contract: \`enter + text\`

> Official contract for molecules in the **enter + text** group in the Collab Aura system.

---

## 1. Metadata

| Field | Value |
|-------|-------|
| **Group** | \`enter + text\` |
| **Category** | Data Entry |
| **Intent** | User wants to provide **free-form text** |
| **Version** | \`1.0.0\` |

---

## 2. When to Use

- Arbitrary text input
- Names, descriptions, comments
- Any textual data
- Emails, passwords, phone numbers
- Short text (single-line) or long text (multi-line)

---

## 3. When NOT to Use

| Scenario | Use instead |
|----------|-------------|
| Selection from predefined options | \`select + one\` or \`select + many\` |
| Numbers only | \`enter + number\` |
| Date/time | \`enter + datetime\` |
| Rating/scoring | \`rate + item\` |

---

## 4. Slot Tags

| Tag | Required | Description |
|-----|:--------:|-------------|
| \`Label\` | No | Field label |
| \`Prefix\` | No | Content before input (icons, fixed text) |
| \`Suffix\` | No | Content after input (buttons, icons, actions) |
| \`Helper\` | No | Help text displayed below the field |
| \`Error\` | No | Error message 

### HTML Structure

\`\`\`html
<molecules--input-102020 value="john@email.com" type="email" required>
  <Label>Email</Label>
  <Prefix><Icon name="mail" /></Prefix>
  <Suffix><Button size="sm">Verify</Button></Suffix>
  <Helper>We'll use this to send notifications</Helper>
  <Error>Invalid email</Error>
</molecules--input-102020>
\`\`\`

---

## 5. Properties

### 5.1 Data

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`value\` | \`string\` | \`''\` | \`@propertyDataSource\` | Current field value |
| \`name\` | \`string\` | \`''\` | \`@property\` | Field name (for forms) |

### 5.2 Configuration

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`type\` | \`string\` | \`'text'\` | \`@property\` | Input type |
| \`placeholder\` | \`string\` | \`''\` | \`@property\` | Placeholder text |
| \`maxlength\` | \`number\` | \`undefined\` | \`@property\` | Maximum character count |
| \`minlength\` | \`number\` | \`undefined\` | \`@property\` | Minimum character count |
| \`pattern\` | \`string\` | \`undefined\` | \`@property\` | Regex for validation |
| \`autocomplete\` | \`string\` | \`undefined\` | \`@property\` | HTML autocomplete value |
| \`inputmode\` | \`string\` | \`undefined\` | \`@property\` | Virtual keyboard mode |

#### Valid values for \`type\`

| Value | Description |
|-------|-------------|
| \`text\` | Standard text |
| \`email\` | Email with validation |
| \`password\` | Password (hidden characters) |
| \`tel\` | Phone number |
| \`url\` | URL |
| \`search\` | Search field |

#### Valid values for \`inputmode\`

| Value | Description |
|-------|-------------|
| \`text\` | Standard text keyboard |
| \`email\` | Email-optimized keyboard |
| \`tel\` | Numeric keyboard for phone |
| \`url\` | URL-optimized keyboard |
| \`numeric\` | Numeric keyboard |
| \`decimal\` | Numeric keyboard with decimal |
| \`search\` | Keyboard with search button |

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
| \`change\` | \`{ value: string }\` | ✓ | Value changed (after blur or enter) |
| \`input\` | \`{ value: string }\` | ✓ | Value changed (on each keystroke) |
| \`blur\` | \`{}\` | ✓ | Field lost focus |
| \`focus\` | \`{}\` | ✓ | Field received focus |
| \`enter\` | \`{ value: string }\` | ✓ | User pressed Enter |

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
   - Apply state styles (disabled, error, etc.)

2. IF hasSlot('Label'):
   - Render label above input
   - IF required: add visual indicator (*)

3. Input wrapper:
   a. IF hasSlot('Prefix'):
      - Render Prefix content on the left
   
   b. Input element:
      - type, value, placeholder, maxlength, etc.
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

## 9. Accessibility (a11y)

| Requirement | Implementation |
|-------------|----------------|
| Associated label | \`aria-labelledby\` or \`<label for>\` |
| Error announced | \`aria-describedby\` pointing to error |
| Invalid state | \`aria-invalid="true"\` when error |
| Required field | \`aria-required="true"\` |
| Helper text | \`aria-describedby\` including helper |
| Disabled | \`aria-disabled="true"\` + \`disabled\` attr |
| Readonly | \`aria-readonly="true"\` + \`readonly\` attr |

### ID Structure

\`\`\`html
<label id="input-label-{uid}">...</label>
<input 
  aria-labelledby="input-label-{uid}"
  aria-describedby="input-helper-{uid} input-error-{uid}"
  aria-invalid="true"
  aria-required="true"
/>
<div id="input-helper-{uid}">...</div>
<div id="input-error-{uid}">...</div>
\`\`\`

---

## 10. Type Variations

| Type | Mobile Keyboard | Validation | Special Behavior |
|------|-----------------|------------|------------------|
| \`text\` | Standard | None | - |
| \`email\` | Email (with @) | Email format | Email autocomplete |
| \`password\` | Standard | None | Hidden characters, visibility toggle |
| \`tel\` | Numeric | Phone format | Optional mask |
| \`url\` | URL (with .com) | URL format | URL autocomplete |
| \`search\` | With search | None | Clear button, search icon |

---
## 12. Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-04-14 | Initial contract version |

`