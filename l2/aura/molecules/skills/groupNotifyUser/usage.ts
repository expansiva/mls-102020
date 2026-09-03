/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupNotifyUser/usage.ts" enhancement="_blank"/>

export const skill = `
# notify + user — Usage

> Quick reference for using molecules in the **notify + user** group.
> Use this when the system needs to **inform the user** about an event, status, or result.
> Controlled via the \`visible\` property — page sets it to show/hide.

---

## Slot Tags

| Tag | Description |
|-----|-------------|
| \`Title\` | Notification title/heading |
| \`Message\` | Notification body content |
| \`Action\` | Actionable element (button, link) inside the notification |
| \`Icon\` | Custom icon content |

---

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`type\` | \`string\` | \`'info'\` | Notification type: \`'info'\`, \`'success'\`, \`'warning'\`, \`'error'\` |
| \`visible\` | \`boolean\` | \`false\` | Show or hide the notification |
| \`dismissible\` | \`boolean\` | \`true\` | Show a close/dismiss button |
| \`duration\` | \`number\` | \`0\` | Auto-dismiss after N ms (0 = manual dismiss only) |
| \`position\` | \`string\` | \`''\` | Position hint: \`'top'\`, \`'bottom'\`, \`'top-right'\`, etc. Empty = inline |

### Choosing inline or floating

\`position\` is not cosmetic — it changes the box model:

- **Omit it** (the default) and the banner is \`relative\`: it takes space in the document, right where
  you placed it. This is what a **persistent** message wants — a system error that stays until
  dismissed, reported at the top of the page content.
- **Set it** and the banner becomes \`fixed\` against the **viewport**, floating over everything at
  \`z-50\`. This suits a **transient** message. Beware: it overlaps whatever chrome sits at that edge
  (app header, toolbar), and it leaves empty the space you reserved for it in the layout.

A page-design document asking for a "top banner" usually means *top of the page content*, in flow —
not \`position="top"\`, which means *floating at the top of the screen*. Read which one is intended.

---

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| \`dismiss\` | \`{}\` | Fired when the notification is dismissed |
| \`action\` | \`{}\` | Fired when the Action slot is clicked |

---

## Examples

### Warning banner with action

\`\`\`html
<molecules--banner-102020
  type="warning"
  visible="{{ui.system.showUpdateBanner}}"
  position="top"
  dismissible="true">
  <Icon>⚠️</Icon>
  <Message>A new version is available.</Message>
  <Action>
    <button>Update Now</button>
  </Action>
</molecules--banner-102020>
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
| \`--ml-disabled-opacity\` | \`0.5\` | Opacity of disabled elements |
| \`--ml-focus-ring-width\` | \`2px\` | Focus ring width |
| \`--ml-info-border\` | \`#bae6fd\` | Info border |
| \`--ml-outline-error\` | \`#ef4444\` | Error border |
| \`--ml-success-border\` | \`#a7f3d0\` | Success border |
| \`--ml-warning-border\` | \`#fde68a\` | Warning border |

---

## Design System Roles

These are roles of the **project design system**. The client defines them in
\`l2/designSystem.ts\` (through the Design System plugin), with night mode and the
\`-hover\`/\`-focus\`/\`-disabled\` variants — and the molecule follows the theme
automatically. The Default column is what the molecule renders when the project has
**no** design system.

The \`--ml-*\` in the \`## Design Tokens\` section, by contrast, have **no** place in
\`designSystem.ts\` — they can only be adjusted by overriding the variable in CSS.

| Role | Default (no DS) | Purpose |
|------|-----------------|---------|
| \`--border-default\` | \`#e2e8f0\` | Structural border — inputs, tables, cards, floating panels |
| \`--button-primary-bg\` | \`#3b82f6\` | Primary action fill |
| \`--button-primary-text\` | \`#ffffff\` | Label on the primary action |
| \`--focus-ring\` | \`rgba(59, 130, 246, 0.4)\` | Keyboard focus ring |
| \`--font-family-primary\` | \`system-ui, -apple-system, sans-serif\` | Primary font stack |
| \`--font-weight-bold\` | \`500\` | Emphasis font weight |
| \`--link-text\` | \`#3b82f6\` | Link colour |
| \`--selected-bg\` | \`#f5f5f5\` | Selected item fill |
| \`--selected-border\` | \`#3b82f6\` | Selected / focused border |
| \`--status-error-bg\` | \`#f5f5f5\` | Error surface |
| \`--status-error-text\` | \`#ef4444\` | Error text and icon |
| \`--status-success-bg\` | \`#ecfdf5\` | Success surface |
| \`--status-success-text\` | \`#16a34a\` | Success text and icon |
| \`--status-warning-bg\` | \`#fffbeb\` | Warning surface |
| \`--status-warning-text\` | \`#d97706\` | Warning text and icon |
| \`--surface-alt-bg\` | \`#f5f5f5\` | Subtle surface — zebra rows, row hover, skeleton, section headers |
| \`--surface-bg\` | \`#ffffff\` | Elevated surface — cards, panels, modals, floating menus |
| \`--text-muted\` | \`#49454f\` | Secondary text and placeholders |
| \`--text-muted-disabled\` | \`#79747e\` | Secondary text and placeholders — disabled state |
| \`--text-strong\` | \`#1c1b1f\` | Most prominent text — titles, emphasized labels |

`;
