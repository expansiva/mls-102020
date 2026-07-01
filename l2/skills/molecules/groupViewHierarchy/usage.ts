/// <mls fileReference="_102020_/l2/skills/molecules/groupViewHierarchy/usage.ts" enhancement="_blank"/>

export const skill = `
# view + hierarchy — Usage

> Quick reference for using molecules in the **view + hierarchy** group.
> Use this when the user needs to **visualize hierarchical data structures**.
> All implementations share the same slot tag contract.

---

## Slot Tags

| Tag | Description |
|-----|-------------|
| \`Label\` | Title displayed above the hierarchy |
| \`Node\` | A hierarchy node. Free content (text, icons, HTML). Nest \`<Node>\` inside \`<Node>\` for children. Attributes: \`expanded\` (presence), \`disabled\` (presence) |
| \`Empty\` | Content shown when no nodes exist |

---

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`multiple\` | \`boolean\` | \`true\` | Allow multiple nodes open at once. \`false\` = one per level |
| \`expand-all\` | \`boolean\` | \`false\` | Start with all nodes expanded |
| \`disabled\` | \`boolean\` | \`false\` | Disables all interaction |
| \`loading\` | \`boolean\` | \`false\` | Shows loading placeholder |

---

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| \`toggle\` | \`{ expanded: boolean }\` | Fired when a node is expanded or collapsed |
| \`nodeClick\` | \`{ value: string \| null }\` | Fired when a node is clicked |
---

## Examples

### Folder structure (tree view)

\`\`\`html
<molecules--tree-view-102020>
  <Label>Project Files</Label>
  <Node>
    📁 src
    <Node>
      📁 components
      <Node>📄 Header.tsx</Node>
      <Node>📄 Footer.tsx</Node>
    </Node>
    <Node>
      📁 pages
      <Node>📄 Home.tsx</Node>
      <Node>📄 About.tsx</Node>
    </Node>
  </Node>
  <Node>
    📁 public
    <Node>📄 index.html</Node>
  </Node>
  <Node>📄 package.json</Node>
</molecules--tree-view-102020>
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
