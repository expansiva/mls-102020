/// <mls fileReference="_102020_/l2/skills/molecules/groupSelectOne.ts" enhancement="_blank"/>

export const skill = `

# Skill: select + one

## Metadata

- **Name:** selectOne
- **Version:** 1.0.0
- **Category:** Data Entry
- **Last Updated:** 04/01/2026

---

## Definition

### Essence

Allow the user to choose **exactly one option** from several available.

### When to Use

- User must make an exclusive choice
- Only one answer is valid at a time
- Options are mutually exclusive

### When NOT to Use

- User can select multiple options → use **select + many**
- There is only one option (on/off) → use **toggle + state**
- Input is free/textual → use **enter + text**

### Possible Implementations

- Select (Dropdown)
- Radio Group
- Segmented Control
- Native Select
- Toggle Group (exclusive)
- Combobox
- List Picker
- Selectable Cards

---

## Contract

### Component Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'value' | 'string \| number \| null' | 'null' | ✓ | '@propertyDataSource' | Value of the selected option |
| 'disabled' | 'boolean' | 'false' | | '@property' | Disables the entire component |
| 'readonly' | 'boolean' | 'false' | | '@property' | Displays value but prevents changes |
| 'loading' | 'boolean' | 'false' | | '@property' | Indicates asynchronous loading |
| 'error' | 'boolean \| string' | 'false' | | '@property' | Error state or message |
| 'required' | 'boolean' | 'false' | | '@property' | Indicates mandatory selection |
| 'name' | 'string' | '''' | | '@property' | Field name for forms |

#### Decorator Reference

| Decorator | Purpose | Binding Example |
|-----------|---------|-----------------|
| '@propertyDataSource' | Binds to a single dynamic state | '{{page1.selectedId}}' |
| '@propertyCompositeDataSource' | Binds to multiple composed states | 'Select a {{page1.itemType}}' |
| '@property' | Static configuration or local UI state | Direct value assignment |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| 'change' | '{ value: string \| number, option: Object }' | Fired when selection changes |
| 'blur' | — | Fired when component loses focus |

---

## Slot Tags

Slot tags are **unknown HTML elements** (not registered Custom Elements). The parent component reads and interprets these tags to build its structure.

### Summary

| Tag | Required | Description |
|-----|:--------:|-------------|
| '<Trigger>' | | Element that opens/activates the selection |
| '<Value>' | | Displays the selected value |
| '<Content>' | ✓ | Container for options |
| '<Group>' | | Groups options with a label |
| '<Item>' | ✓ (min. 1) | A selectable option |
| '<Empty>' | | Displayed when no options available |

---

### '<Trigger>'

Element that opens/activates the selection.

| Attribute | Type | Required | Description |
|-----------|------|:--------:|-------------|
| 'placeholder' | 'string' | | Text when nothing selected |

**Accepts:** Any content (text, icons, '<Value>')

'''html
<Trigger placeholder="Select...">
  <Icon name="chevron-down" />
  <Value />
</Trigger>
'''

---

### '<Value>'

Displays the selected value. Usually used inside '<Trigger>'.

| Attribute | Type | Required | Description |
|-----------|------|:--------:|-------------|
| 'placeholder' | 'string' | | Text when nothing selected |

**Accepts:** None (self-closing)

'''html
<Value placeholder="None selected" />
'''

---

### '<Content>'

Container for options. **Required.**

**Accepts:** '<Group>', '<Item>', '<Empty>'

'''html
<Content>
  <Item value="a">Option A</Item>
  <Item value="b">Option B</Item>
</Content>
'''

---

### '<Group>'

Groups options with a label.

| Attribute | Type | Required | Description |
|-----------|------|:--------:|-------------|
| 'label' | 'string' | ✓ | Group title |

**Accepts:** '<Item>'

'''html
<Group label="Fruits">
  <Item value="apple">Apple</Item>
  <Item value="banana">Banana</Item>
</Group>
'''

---

### '<Item>'

A selectable option. **Required** (minimum 1).

| Attribute | Type | Required | Description |
|-----------|------|:--------:|-------------|
| 'value' | 'string \| number' | ✓ | Unique option value |
| 'disabled' | 'boolean' | | Disables this option |

**Accepts:** Any content (text, icons, images, badges)

'''html
<Item value="user-1">
  <Avatar src="photo.jpg" />
  <span>John Doe</span>
  <Badge>Admin</Badge>
</Item>

<Item value="user-2" disabled>
  <Avatar src="photo2.jpg" />
  <span>Jane (inactive)</span>
</Item>
'''

---

### '<Empty>'

Displayed when no options available or search has no results.

**Accepts:** Any content

'''html
<Empty>
  <Icon name="search-x" />
  <span>No results found</span>
</Empty>
'''

---

## Slot Hierarchy

'''
component (root)
├── <Trigger>
│   └── <Value>
└── <Content>
    ├── <Group>
    │   └── <Item>
    ├── <Item>
    └── <Empty>
'''

| Tag | Valid Parents |
|-----|---------------|
| '<Trigger>' | root |
| '<Value>' | '<Trigger>' |
| '<Content>' | root |
| '<Group>' | '<Content>' |
| '<Item>' | '<Content>', '<Group>' |
| '<Empty>' | '<Content>' |

---

## Validation Rules

### Slot Validation

| Rule | Type | Message |
|------|------|---------|
| '<Content>' missing | error | 'Missing required slot <Content>' |
| No '<Item>' present | error | 'At least 1 <Item> is required inside <Content>' |
| '<Item>' without 'value' | error | '<Item> requires attribute "value"' |
| '<Group>' without 'label' | error | '<Group> requires attribute "label"' |
| Unknown tag found | warning | 'Unknown slot <TagName> ignored' |
| Tag in invalid position | warning | '<TagName> is not valid inside <ParentTag>, ignored' |

### Data Validation

| Rule | Condition | Suggested Message |
|------|-----------|-------------------|
| required | 'required === true && value === null' | "Please select an option" |
| invalidOption | 'value' not found in '<Item>' values | "Invalid option" |

---

## Visual States

### Component States

| State | Description | Expected Behavior |
|-------|-------------|-------------------|
| **default** | Initial/neutral state | Interactive, awaiting action |
| **hover** | Cursor over the component | Visual feedback of interactivity |
| **focus** | Component has focus | Visual focus indicator (outline) |
| **disabled** | Component is disabled | Non-interactive, visually dimmed |
| **readonly** | Read-only mode | Displays value, prevents changes |
| **loading** | Loading options | Displays loading indicator |
| **error** | Error state | Visual error feedback (color, icon) |

### Item States

| State | Description |
|-------|-------------|
| **default** | Option available for selection |
| **selected** | Currently selected option |
| **disabled** | Option cannot be selected |
| **hover** | Cursor over the option |
| **focus** | Option has focus (keyboard navigation) |

---

## Accessibility (Recommended)

### Keyboard Navigation

| Key | Action |
|-----|--------|
| 'Tab' | Moves focus to/from the component |
| 'Arrow Up/Down' | Navigates between options |
| 'Arrow Left/Right' | Navigates between options (horizontal variants) |
| 'Enter' / 'Space' | Selects focused option |
| 'Escape' | Closes dropdown (if applicable) |
| 'Home' | Moves to first option |
| 'End' | Moves to last option |

### ARIA

| Attribute | Application |
|-----------|-------------|
| 'role="listbox"' | Options container |
| 'role="option"' | Each individual option |
| 'aria-selected' | Indicates selected option |
| 'aria-disabled' | Indicates disabled option/component |
| 'aria-required' | Indicates required field |
| 'aria-invalid' | Indicates error state |
| 'aria-expanded' | Indicates if dropdown is open |

---

## Interchangeability

All components implementing 'select + one' accept the same slot tag structure. To switch the visual implementation, simply change the parent component tag:

Each implementation decides internally:
- Which tags it uses
- Which tags it ignores
- How it renders each tag

The contract ensures **structural compatibility** across all implementations in the group.

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 04/01/2026 | Initial contract with slot tags definition |

`
