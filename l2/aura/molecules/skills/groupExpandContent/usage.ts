/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupExpandContent/usage.ts" enhancement="_blank"/>

export const skill = `
# expand + content — Usage

> Quick reference for using molecules in the **expand + content** group.
> Use this when the user needs to **expand or collapse content** to see more or less details.

---

## Slot Tags

| Tag | Description |
|-----|-------------|
| \`Label\` | Title displayed above the component |
| \`Section\` | One expandable section. Attributes: \`title\` (required), \`disabled\` (presence), \`expanded\` (presence). Content = the collapsible body |

---

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`multiple\` | \`boolean\` | \`true\` | Allow multiple sections open at once. \`false\` = only one (accordion mode) |
| \`disabled\` | \`boolean\` | \`false\` | Disables all sections |
| \`loading\` | \`boolean\` | \`false\` | Shows a loading placeholder |

---

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| \`toggle\` | \`{ index: number, title: string, expanded: boolean }\` | Fired when a section is expanded or collapsed |

---

## Examples

### FAQ accordion (one at a time)

\`\`\`html
<molecules--accordion-102020
  multiple="false">
  <Label>Frequently Asked Questions</Label>
  <Section title="How do I reset my password?">
    Go to Settings > Security > Reset Password and follow the instructions.
  </Section>
  <Section title="Can I change my plan?">
    Yes, you can upgrade or downgrade at any time from the Billing page.
  </Section>
  <Section title="How do I contact support?">
    Use the chat widget or email support@example.com.
  </Section>
</molecules--accordion-102020>
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
  --ml-surface-overlay: rgba(255, 255, 255, 0.9);
}
\`\`\`

### Available tokens

| Token | Default | Purpose |
|-------|---------|---------|
| \`--ml-border-style\` | \`solid\` | Border style |
| \`--ml-border-width\` | \`1px\` | Border width |
| \`--ml-disabled-opacity\` | \`0.5\` | Opacity of disabled elements |
| \`--ml-focus-ring-width\` | \`2px\` | Focus ring width |
| \`--ml-surface-overlay\` | \`rgba(255, 255, 255, 0.9)\` | Light veil over content (loading, disabled area) |

`;
