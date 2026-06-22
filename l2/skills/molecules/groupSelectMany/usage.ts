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

`;