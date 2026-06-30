/// <mls fileReference="_102020_/l2/skills/molecules/groupSelectMany/usage.ts" enhancement="_blank"/>

export const skill = `
# select + many — Usage

> Quick reference for using molecules in the **select + many** group.
> Use this when you need the user to **choose one or more options** from a list.

---

## Slot Tags

| Tag | Used by variant | Description |
|-----|-----------------|-------------|
| \`Label\` | all | Label displayed above or beside the field |
| \`Helper\` | all | Descriptive text shown below the field when there is no error |
| \`Trigger\` | \`dropdown\` only | Custom content for the trigger button |
| \`Item\` | all | One selectable option (one **row** in \`table\`). Attributes: \`value\` (required), \`disabled\` |
| \`Cell\` | \`table\` only | A data cell inside an \`Item\`, one per column, in column order |
| \`Column\` | \`table\` only | A single column header, direct child of the component, in column order |
| \`Group\` | \`dropdown\`, \`checkbox\` | Groups items under a named heading. Attribute: \`label\` |
| \`Empty\` | all | Content shown when no items are available |

---

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`value\` | \`string\` | \`''\` | Comma-separated selected values (e.g. \`"apple,banana,grape"\`) |
| \`error\` | \`string\` | \`''\` | Error message. Empty string means no error |
| \`name\` | \`string\` | \`''\` | Field name for form identification |
| \`placeholder\` | \`string\` | \`''\` | Text shown when no items are selected |
| \`searchable\` | \`boolean\` | \`false\` | Show a search input to filter items |
| \`min-selection\` | \`number\` | \`0\` | Minimum selected items (0 = no minimum) |
| \`max-selection\` | \`number\` | \`0\` | Maximum selected items (0 = no limit) |
| \`is-editing\` | \`boolean\` | \`true\` | \`true\` = interactive selector, \`false\` = read-only labels |
| \`disabled\` | \`boolean\` | \`false\` | Disables the field entirely |
| \`readonly\` | \`boolean\` | \`false\` | Prevents selection but keeps the field focusable |
| \`required\` | \`boolean\` | \`false\` | At least one selection is required |
| \`loading\` | \`boolean\` | \`false\` | Shows a loading indicator; panel does not open |

---

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| \`change\` | \`{ value: string }\` | Fired when selection changes. Value is comma-separated string |
| \`blur\` | \`{}\` | Fired when the field loses focus |
| \`focus\` | \`{}\` | Fired when the field receives focus |

---

## Value Format

- Comma-separated **string** of selected item values
- Empty string \`''\` when nothing is selected
- Example: \`"read,write,execute"\`
- Item values must not contain commas

---

## Examples

### Checkbox group — permissions

\`\`\`html
<molecules--checkbox-group-102020
  value="{{ui.user.permissions}}"
  error="{{ui.user.permissionsError}}"
  required>
  <Label>Permissions</Label>
  <Item value="read">Read</Item>
  <Item value="write">Write</Item>
  <Item value="execute">Execute</Item>
  <Item value="admin" disabled>Admin (restricted)</Item>
</molecules--checkbox-group-102020>
\`\`\`

### Table variant (compare and select multiple rows)

> Use the \`table\` variant when each option has several comparable attributes. Declare
> column headers as flat \`<Column>\` children (in order), then one \`<Item value="...">\` per
> row with one \`<Cell>\` per column. Selecting a row toggles that \`Item\`'s \`value\` in the
> comma-separated string.

\`\`\`html
<groupselectmany--ml-table-multi-select
  value="{{ui.form.selectedPlans}}"
  error="{{ui.form.plansError}}"
  name="plans"
  max-selection="3"
  required>
  <Label>Select plans to compare</Label>
  <Column>Plan</Column>
  <Column>Price</Column>
  <Column>Seats</Column>
  <Item value="basic">
    <Cell>Basic</Cell>
    <Cell>$10/mo</Cell>
    <Cell>3</Cell>
  </Item>
  <Item value="pro">
    <Cell>Pro</Cell>
    <Cell>$25/mo</Cell>
    <Cell>10</Cell>
  </Item>
  <Item value="business">
    <Cell>Business</Cell>
    <Cell>$50/mo</Cell>
    <Cell>25</Cell>
  </Item>
  <Item value="enterprise" disabled>
    <Cell>Enterprise</Cell>
    <Cell>Contact us</Cell>
    <Cell>Unlimited</Cell>
  </Item>
  <Empty>No plans available</Empty>
  <Helper>Choose up to 3 plans.</Helper>
</groupselectmany--ml-table-multi-select>
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

The component's visual styling can be customized by overriding \`--ml-*\` CSS custom properties on a parent element:

\`\`\`css
.my-container {
  --ml-primary: #7c3aed;
  --ml-radius-sm: 10px;
  --ml-font-family: 'Inter', sans-serif;
}
\`\`\`

### Available tokens

| Token | Default | Purpose |
|-------|---------|---------|
| \`--ml-surface\` | \`#ffffff\` | Component background |
| \`--ml-surface-dim\` | \`#f5f5f5\` | Hover background |
| \`--ml-on-surface\` | \`#1c1b1f\` | Primary text |
| \`--ml-on-surface-muted\` | \`#49454f\` | Secondary text |
| \`--ml-on-surface-faint\` | \`#79747e\` | Placeholder |
| \`--ml-primary\` | \`#3b82f6\` | Primary action color |
| \`--ml-on-primary\` | \`#ffffff\` | Text on primary |
| \`--ml-error\` | \`#ef4444\` | Error color |
| \`--ml-on-error\` | \`#ffffff\` | Text on error |
| \`--ml-outline-variant\` | \`#e2e8f0\` | Default border |
| \`--ml-outline-focus\` | \`#3b82f6\` | Focus border |
| \`--ml-outline-error\` | \`#ef4444\` | Error border |
| \`--ml-radius-sm\` | \`6px\` | Default radius |
| \`--ml-shadow-1\` | \`0 1px 3px rgba(0,0,0,0.1)\` | Subtle shadow |
| \`--ml-font-family\` | \`system-ui, sans-serif\` | Font family |
| \`--ml-font-weight-medium\` | \`500\` | Medium weight |
| \`--ml-transition\` | \`200ms ease\` | Transition |
| \`--ml-focus-ring-color\` | \`rgba(59,130,246,0.4)\` | Focus ring |
| \`--ml-disabled-opacity\` | \`0.5\` | Disabled opacity |

`;