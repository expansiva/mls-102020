/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupNavigateSteps/usage.ts" enhancement="_blank"/>

export const skill = `
# navigate + steps — Usage

> Quick reference for using molecules in the **navigate + steps** group.
> Use this when the user needs to **advance through a sequential multi-step process**.
> The component renders the step indicators; the page is responsible for displaying each step's content.

---

## Slot Tags

| Tag | Description |
|-----|-------------|
| \`Label\` | Title displayed above the stepper |
| \`Step\` | One step in the process. Attributes: \`title\` (required), \`description\` (optional), \`completed\` (presence), \`disabled\` (presence) |

---

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`value\` | \`number\` | \`0\` | Index of the current active step (0-based) |
| \`linear\` | \`boolean\` | \`true\` | Steps must be completed in order. \`false\` = can jump freely |
| \`disabled\` | \`boolean\` | \`false\` | Disables all navigation |
| \`loading\` | \`boolean\` | \`false\` | Shows loading state |

---

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| \`change\` | \`{ value: number, title: string }\` | Fired when the active step changes |

---

## Value Format

- \`value\` is a **number** (0-based index) of the current step
- The page reads \`value\` to decide which content to show
- Navigation updates \`value\` and emits \`change\`

---

## Examples

### Checkout process (linear)

\`\`\`html
<molecules--stepper-102020
  value="{{ui.checkout.currentStep}}"
  linear="true">
  <Label>Checkout</Label>
  <Step title="Cart" completed></Step>
  <Step title="Shipping" completed></Step>
  <Step title="Payment"></Step>
  <Step title="Confirmation"></Step>
</molecules--stepper-102020>
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

The component's visual styling can be customized by overriding \`--ml-*\` CSS custom
properties on a parent element. The values below are this group's current defaults —
copy the block and change them:

\`\`\`css
.my-container {
  --ml-on-primary: #ffffff;
  --ml-success: #22c55e;
  --ml-primary: #3b82f6;
}
\`\`\`

### Available tokens

| Token | Default | Purpose |
|-------|---------|---------|
| \`--ml-border-style\` | \`solid\` | Border style |
| \`--ml-border-width\` | \`1px\` | Border width |
| \`--ml-disabled-opacity\` | \`0.5\` | Opacity of disabled elements |
| \`--ml-focus-ring-width\` | \`2px\` | Focus ring width |
| \`--ml-on-primary\` | \`#ffffff\` | Text on primary |
| \`--ml-primary\` | \`#3b82f6\` | Primary action color |
| \`--ml-success\` | \`#22c55e\` | Success color |

`;