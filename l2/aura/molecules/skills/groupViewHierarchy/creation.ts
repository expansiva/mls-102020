/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupViewHierarchy/creation.ts" enhancement="_blank"/>

export const skill = `

# groupViewHierarchy — Creation

> Implementation reference for creating molecules in the **groupViewHierarchy** group.
> Follow the general Lit/Aura rules defined in \`molecule-generation2.md\`.

---

## 1. Metadata

| Field | Value |
|-------|-------|
| **Group** | \`groupViewHierarchy\` |
| **Category** | Data Display |
| **Version** | \`1.0.0\` |

---

## 2. Slot Tags

| Tag | Required | Description |
|-----|:--------:|-------------|
| \`Label\` | No | Title displayed above the hierarchy |
| \`Node\` | Yes | A hierarchy node. Can contain free content (text, icons, HTML, web components) and nested \`<Node>\` children |
| \`Empty\` | No | Content shown when no nodes exist |

\`\`\`typescript
slotTags = ['Label', 'Node', 'Empty'];
\`\`\`

### Slot Hierarchy

\`\`\`
component (root)
├── <Label>
├── <Node>
│   ├── ...free content...
│   ├── <Node>
│   │   ├── ...free content...
│   │   └── <Node>
│   │       └── ...free content...
│   └── <Node>
│       └── ...free content...
├── <Node>
│   └── <Node>
└── <Empty>
\`\`\`

### Node Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| \`value\` | \`string\` (optional) | Identifier for the node, emitted on \`nodeClick\` |
| \`expanded\` | \`boolean\` (presence) | Node starts expanded |
| \`disabled\` | \`boolean\` (presence) | Node cannot be toggled or clicked |

### Node Content

The direct content of a \`<Node>\` (excluding nested \`<Node>\` children) is the node's visual label. It can be free HTML:

\`\`\`html
<Node>
  <img src="icon.png" /> Engineering Department
  <Node>Frontend</Node>
  <Node>Backend</Node>
</Node>
\`\`\`

---

## 3. Properties

### 3.1 Configuration

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`multiple\` | \`boolean\` | \`true\` | \`@propertyDataSource\` | Allow multiple nodes open simultaneously. \`false\` = only one per level |
| \`expandAll\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Start with all nodes expanded |

### 3.2 States

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`disabled\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Disables all expand/collapse interaction |
| \`loading\` | \`boolean\` | \`false\` | \`@propertyDataSource\` | Show loading placeholder |

---

## 4. Value Contract

This component has **no \`value\` property**. It is a display-only component with expand/collapse interaction.

---

## 5. Events

| Event | Detail | Bubbles | Description |
|-------|--------|:-------:|-------------|
| \`nodeClick\` | \`{ value: string \| null }\` | ✓ | Fired when a node is clicked |
| \`toggle\` | \`{ value: string \| null, expanded: boolean }\` | ✓ | Fired when a node is expanded or collapsed |

### Dispatch Example

\`\`\`typescript
this.dispatchEvent(new CustomEvent('nodeClick', {
  bubbles: true,
  composed: true,
  detail: { value: 'frontend' }
}));

this.dispatchEvent(new CustomEvent('toggle', {
  bubbles: true,
  composed: true,
  detail: { value: 'eng', expanded: true }
}));
\`\`\`

---

## 6. Expand/Collapse Behavior

- Nodes that have nested \`<Node>\` children are expandable
- Nodes without children (leaf nodes) have no toggle
- Clicking a node's toggle area expands/collapses its children
- When \`multiple=false\`: expanding a node at a given level collapses siblings at that same level
- When \`expandAll=true\`: all nodes start expanded, overriding individual \`expanded\` attributes
- When \`disabled\` (component or individual node): toggle is blocked

---

## 7. Visual States

| State | Behavior |
|-------|----------|
| **Collapsed** | Only node content visible, children hidden |
| **Expanded** | Node content + children visible, with indent |
| **Leaf** | No toggle icon, no expand/collapse |
| **Disabled (node)** | Individual node dimmed, cannot toggle |
| **Disabled (component)** | All nodes dimmed, no interaction |
| **Loading** | Placeholder instead of hierarchy |

---

## 8. Accessibility (a11y)

| Requirement | Implementation |
|-------------|----------------|
| Container | \`role="tree"\` |
| Node with children | \`role="treeitem"\`, \`aria-expanded\` |
| Leaf node | \`role="treeitem"\` (no \`aria-expanded\`) |
| Children group | \`role="group"\` |
| Disabled | \`aria-disabled="true"\` |
| Keyboard | \`ArrowDown\`/\`ArrowUp\` navigate nodes; \`ArrowRight\` expands; \`ArrowLeft\` collapses; \`Enter\` toggles |


---

## 9. Design Tokens

### Tokens

This group uses CSS custom properties (tokens) for all visual styling.
All tokens are consumed in the .less file via var(--ml-token, fallback).
The fallback ensures the component renders without external configuration.

#### Surface and text
- --ml-surface (#ffffff) — background
- --ml-surface-dim (#f5f5f5) — hover background
- --ml-on-surface (#1c1b1f) — primary text
- --ml-on-surface-muted (#49454f) — secondary text
- --ml-on-surface-faint (#79747e) — placeholder

#### Action and feedback
- --ml-primary (#3b82f6) — primary action color
- --ml-on-primary (#ffffff) — text on primary
- --ml-error (#ef4444) — error color
- --ml-on-error (#ffffff) — text on error

#### Border and shape
- --ml-outline-variant (#e2e8f0) — default border
- --ml-outline-focus (#3b82f6) — focus border
- --ml-outline-error (#ef4444) — error border
- --ml-radius-sm (6px) — default radius
- --ml-radius-full (9999px) — circular radius
- --ml-border-width (1px) — border thickness
- --ml-border-style (solid) — border style

#### Elevation, typography, motion, focus, state
- --ml-shadow-0 (none) — no shadow
- --ml-shadow-1 (0 1px 3px rgba(0,0,0,0.1)) — subtle shadow
- --ml-shadow-2 (0 4px 6px rgba(0,0,0,0.1)) — medium shadow
- --ml-font-family (system-ui, -apple-system, sans-serif) — font
- --ml-font-weight-medium (500) — medium weight
- --ml-transition (200ms ease) — default transition
- --ml-focus-ring-color (rgba(59,130,246,0.4)) — focus ring color
- --ml-focus-ring-width (2px) — focus ring width
- --ml-disabled-opacity (0.5) — disabled opacity

### data-class

The component accepts \`data-class\` for consumer-provided CSS classes:
- On host: \`<component data-class="w-full mt-4">\`
- On slots: \`<Label data-class="uppercase tracking-wide">\`

### Shared semantic classes

| Class | Purpose |
|-------|---------|
| ml-label | Field label |
| ml-helper | Helper text |
| ml-error-text | Error message |
| ml-text | Default text |
| ml-text-muted | Secondary text |
| ml-text-faint | Placeholder text |
| ml-disabled | Disabled state |
| ml-skeleton | Loading placeholder |
| ml-spinner | Loading spinner |

Group-specific semantic classes will be defined during component migration.

---

## 10. Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-04-21 | Initial creation reference |
| 1.1.0 | 2026-04-21 | Added value attribute on Node and nodeClick event |
`;