/// <mls fileReference="_102020_/l2/skills/molecules/groupNotifyUser/usage.ts" enhancement="_blank"/>

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
