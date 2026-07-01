/// <mls fileReference="_102020_/l2/skills/molecules/groupSelectOne/usage.ts" enhancement="_blank"/>

export const skill = `
# select + one — Usage

> Quick reference for using molecules in the **select + one** group.
> Use this when you need the user to **choose exactly one option** from a list.

---

## Slot Tags

| Tag | Used by variant | Description |
|-----|-----------------|-------------|
| \`Label\` | all | Label displayed above or beside the field |
| \`Helper\` | all | Descriptive text shown below the field when there is no error |
| \`Trigger\` | \`dropdown\` only | Custom content for the trigger button. When no item is selected, this content acts as the placeholder |
| \`Item\` | all | One selectable option (one **row** in \`table\`). Attributes: \`value\` (required), \`disabled\` |
| \`Cell\` | \`table\` only | A data cell inside an \`Item\`, one per column, in column order. May contain text or web components |
| \`Column\` | \`table\` only | A single column header, as a direct child of the component (no wrapper), in column order |
| \`Group\` | \`dropdown\`, \`radio\`, \`list\` | Groups items under a named heading. Attribute: \`label\` |
| \`Empty\` | all | Content shown when no items are available |

---

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`value\` | \`string \| null\` | \`null\` | Value of the selected item. \`null\` = nothing selected |
| \`error\` | \`string\` | \`''\` | Error message. Empty string means no error |
| \`name\` | \`string\` | \`''\` | Field name for form identification |
| \`variant\` | \`string\` | \`'dropdown'\` | Layout: \`dropdown\` (combobox), \`radio\`, \`segmented\`, \`list\`, or \`table\`. The selected value is the same in every variant |
| \`placeholder\` | \`string\` | \`''\` | Text shown when no item is selected (\`dropdown\`; in \`table\` view mode it is the empty fallback) |
| \`searchable\` | \`boolean\` | \`false\` | Show a search input to filter items (\`dropdown\`, \`list\`, \`table\`) |
| \`isEditing\` | \`boolean\` | \`true\` | \`true\` = interactive selector, \`false\` = read-only label |
| \`disabled\` | \`boolean\` | \`false\` | Disables the field entirely |
| \`readonly\` | \`boolean\` | \`false\` | Prevents selection but keeps the field focusable |
| \`required\` | \`boolean\` | \`false\` | Marks a selection as required |
| \`loading\` | \`boolean\` | \`false\` | Shows a loading indicator (in \`dropdown\`, the panel does not open) |


---

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| \`change\` | \`{ value: string \| null }\` | Fired when an item is selected |
| \`blur\` | \`{}\` | Fired when the field loses focus |
| \`focus\` | \`{}\` | Fired when the field receives focus |

---

## Value Format

- Value is a plain **string** matching the \`value\` attribute of the selected \`<Item>\`
- \`null\` when nothing is selected
- The displayed label comes from the \`<Item>\` inner content (its \`<Cell>\`s in the \`table\` variant) — not stored in \`value\`
- The same contract holds for every variant — switching layout never changes the stored value

---

## Examples

### Simple dropdown

\`\`\`html
<molecules--dropdown-102020
  value="{{ui.form.country}}"
  error="{{ui.form.countryError}}"
  required>
  <Label>Country</Label>
  <Trigger>Select a country...</Trigger>
  <Item value="br">Brazil</Item>
  <Item value="us">United States</Item>
  <Item value="de">Germany</Item>
</molecules--dropdown-102020>
\`\`\`

### Grouped options

\`\`\`html
<molecules--dropdown-102020
  value="{{ui.form.category}}"
  error="{{ui.form.categoryError}}">
  <Label>Category</Label>
  <Trigger>Select a category...</Trigger>
  <Group label="Electronics">
    <Item value="phones">Phones</Item>
    <Item value="laptops">Laptops</Item>
  </Group>
  <Group label="Clothing">
    <Item value="shirts">Shirts</Item>
    <Item value="shoes">Shoes</Item>
  </Group>
  <Empty>No categories available</Empty>
</molecules--dropdown-102020>
\`\`\`

### Table variant (compare options across columns)

> Use \`variant="table"\` when each option has several comparable attributes. Declare the
> column headers as flat \`<Column>\` children (in order), then one \`<Item value="...">\` per
> row with one \`<Cell>\` per column. Selecting a row stores that \`Item\`'s \`value\`.

\`\`\`html
<groupselectone--ml-table-single-select
  value="{{ui.form.plan}}"
  error="{{ui.form.planError}}"
  name="plan"
  required>
  <Label>Choose a plan</Label>
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
  <Item value="enterprise" disabled>
    <Cell>Enterprise</Cell>
    <Cell>Contact us</Cell>
    <Cell>Unlimited</Cell>
  </Item>
  <Empty>No plans available</Empty>
  <Helper>You can change your plan later.</Helper>
</groupselectone--ml-table-single-select>
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

`