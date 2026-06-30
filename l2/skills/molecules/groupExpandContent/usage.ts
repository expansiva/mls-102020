/// <mls fileReference="_102020_/l2/skills/molecules/groupExpandContent/usage.ts" enhancement="_blank"/>

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
