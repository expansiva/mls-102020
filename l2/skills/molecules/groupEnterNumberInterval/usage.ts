/// <mls fileReference="_102020_/l2/skills/molecules/groupEnterNumberInterval/usage.ts" enhancement="_blank"/>

export const skill = `

# enter + number-interval — Usage

> Quick reference for using molecules in the **enter + number-interval** group.
> Use this when you need the user to provide a **numeric range (lower and upper value)**.

---

## Slot Tags

| Tag | Description |
|-----|-------------|
| \`Label\` | Overall label for the range field |
| \`LabelStart\` | Label shown above the lower-value control |
| \`LabelEnd\` | Label shown above the upper-value control |
| \`Helper\` | Descriptive text shown below the field when there is no error |
| \`Prefix\` | Content rendered before each value (e.g. unit symbol \`R$\`) |
| \`Suffix\` | Content rendered after each value (e.g. unit label \`%\`, \`kg\`) |

---

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`startValue\` | \`number \| null\` | \`null\` | Lower bound of the interval |
| \`endValue\` | \`number \| null\` | \`null\` | Upper bound of the interval |
| \`error\` | \`string\` | \`''\` | Error message. Empty string means no error |
| \`name\` | \`string\` | \`''\` | Field name for form identification |
| \`min\` | \`number \| null\` | \`null\` | Absolute floor for both controls |
| \`max\` | \`number \| null\` | \`null\` | Absolute ceiling for both controls |
| \`step\` | \`number\` | \`1\` | Increment for both controls |
| \`decimals\` | \`number\` | \`0\` | Number of decimal places allowed |
| \`locale\` | \`string\` | \`''\` | Display locale, e.g. \`'en-US'\`, \`'pt-BR'\` |
| \`placeholder\` | \`string\` | \`''\` | Placeholder text when the interval is unset |
| \`minGap\` | \`number\` | \`0\` | Minimum distance between the two values (0 = no minimum) |
| \`maxGap\` | \`number\` | \`0\` | Maximum distance between the two values (0 = no maximum) |
| \`isEditing\` | \`boolean\` | \`true\` | \`true\` = input mode, \`false\` = read-only formatted text |
| \`disabled\` | \`boolean\` | \`false\` | Disables the field entirely |
| \`readonly\` | \`boolean\` | \`false\` | Prevents editing but keeps the field focusable |
| \`required\` | \`boolean\` | \`false\` | Marks both values as required |
| \`loading\` | \`boolean\` | \`false\` | Shows a loading indicator inside the field |

---

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| \`change\` | \`{ startValue: number \| null, endValue: number \| null }\` | Fired when the interval is confirmed |
| \`input\` | \`{ startValue: number \| null, endValue: number \| null }\` | Fired continuously while either control is adjusted |
| \`blur\` | \`{}\` | Fired when the field loses focus |
| \`focus\` | \`{}\` | Fired when the field receives focus |

---

## Value Format

- Both values stored and emitted as native **JavaScript numbers**
- \`null\` when not yet provided
- \`startValue\` never exceeds \`endValue\` (the pair is clamped)
- Display format respects \`decimals\`, \`locale\`, and Prefix/Suffix; stored value is always a plain number

---

## Examples

### Basic — price band

\`\`\`html
<groupenternumberinterval--ml-range-slider
  startValue="{{ui.filter.priceMin}}"
  endValue="{{ui.filter.priceMax}}"
  error="{{ui.filter.priceError}}"
  min="0"
  max="1000"
  step="50"
  locale="pt-BR">
  <Label>Faixa de preço</Label>
  <LabelStart>De</LabelStart>
  <LabelEnd>Até</LabelEnd>
  <Prefix>R$</Prefix>
</groupenternumberinterval--ml-range-slider>
\`\`\`

### With decimals and a minimum gap

\`\`\`html
<groupenternumberinterval--ml-range-slider
  startValue="{{ui.config.weightMin}}"
  endValue="{{ui.config.weightMax}}"
  min="0"
  max="100"
  step="0.5"
  decimals="1"
  locale="pt-BR"
  minGap="5">
  <Label>Faixa de peso</Label>
  <LabelStart>Mínimo</LabelStart>
  <LabelEnd>Máximo</LabelEnd>
  <Suffix>kg</Suffix>
  <Helper>Diferença mínima de 5 kg entre os limites</Helper>
</groupenternumberinterval--ml-range-slider>
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
