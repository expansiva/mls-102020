/// <mls fileReference="_102020_/l2/skills/molecules/groupViewData/usage.ts" enhancement="_blank"/>

export const skill = `
# view + data — Usage

> Quick reference for using molecules in the **view + data** group.
> Use this when you need to display a collection of records with defined fields.
> All implementations share the same slot tag contract — swap the component tag to change the visualization.

---

## Slot Tags

| Tag | Required | Description |
|-----|:--------:|-------------|
| \`Columns\` | ✓ | Container for column definitions |
| \`Column\` | ✓ (min. 1) | Defines a column — attributes: \`field\`, \`header\`, \`width\`, \`align\`, \`hidden\` |
| \`Rows\` | ✓ | Container for data rows |
| \`Row\` | ✓ (min. 1) | A data row — attributes: \`selected\`, \`disabled\` |
| \`Cell\` | ✓ | A data cell — accepts any content; attribute: \`colspan\` |
| \`Empty\` | No | Content shown when there are no rows |
| \`Loading\` | No | Content shown when \`loading\` is true |

---

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`loading\` | \`boolean\` | \`false\` | Shows loading state |
| \`selectable\` | \`boolean\` | \`false\` | Enables row/item selection |
| \`hoverable\` | \`boolean\` | \`true\` | Highlights row/item on hover |

---

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| \`row-click\` | \`{ index: number, data: Element }\` | Fired when a row/item is clicked |
| \`selection-change\` | \`{ selected: number[] }\` | Fired when the selection changes |

---

## Examples

### Simple data table

\`\`\`html
<molecules--data-table-102020 .hoverable=\${true}>
  <Columns>
    <Column field="name" header="Name" />
    <Column field="email" header="Email" />
    <Column field="status" header="Status" align="center" width="120px" />
  </Columns>
  <Rows>
    <Row>
      <Cell>Alice Souza</Cell>
      <Cell>alice@example.com</Cell>
      <Cell>Active</Cell>
    </Row>
    <Row>
      <Cell>Bruno Lima</Cell>
      <Cell>bruno@example.com</Cell>
      <Cell>Inactive</Cell>
    </Row>
  </Rows>
  <Empty>
    <div class="text-center py-8 text-slate-500">No records found</div>
  </Empty>
</molecules--data-table-102020>
\`\`\`

### Selectable rows

\`\`\`html
<molecules--data-table-102020
  .selectable=\${true}
  @selection-change=\${(e) => { this.selectedRows = e.detail.selected; }}>
  <Columns>
    <Column field="id" header="ID" width="80px" />
    <Column field="product" header="Product" />
    <Column field="price" header="Price" align="right" />
  </Columns>
  <Rows>
    <Row>
      <Cell>001</Cell>
      <Cell>Widget Pro</Cell>
      <Cell>R$ 199,00</Cell>
    </Row>
    <Row selected>
      <Cell>002</Cell>
      <Cell>Gadget Plus</Cell>
      <Cell>R$ 349,00</Cell>
    </Row>
    <Row disabled>
      <Cell>003</Cell>
      <Cell>Legacy Item</Cell>
      <Cell>R$ 59,00</Cell>
    </Row>
  </Rows>
</molecules--data-table-102020>
\`\`\`

### Rich cell content

\`\`\`html
<molecules--data-table-102020>
  <Columns>
    <Column field="user" header="User" />
    <Column field="role" header="Role" align="center" />
    <Column field="actions" header="" width="100px" align="right" />
  </Columns>
  <Rows>
    <Row>
      <Cell>
        <div class="font-medium">William Little</div>
        <div class="text-sm text-slate-500">william@email.com</div>
      </Cell>
      <Cell>
        <span class="px-2 py-0.5 rounded-full text-xs bg-sky-100 text-sky-700">Admin</span>
      </Cell>
      <Cell>
        <div class="flex gap-2 justify-end">
          <button>Edit</button>
          <button>Delete</button>
        </div>
      </Cell>
    </Row>
  </Rows>
</molecules--data-table-102020>
\`\`\`

### Loading state

\`\`\`html
<molecules--data-table-102020 .loading=\${true}>
  <Columns>
    <Column field="name" header="Name" />
    <Column field="status" header="Status" />
  </Columns>
  <Rows></Rows>
  <Loading>
    <div class="text-center py-10 text-slate-400">Loading records...</div>
  </Loading>
</molecules--data-table-102020>
\`\`\`

### Card grid — same contract, different component

\`\`\`html
<molecules--card-grid-102020 .hoverable=\${true} @row-click=\${this.onCardClick}>
  <Columns>
    <Column field="title" header="Title" />
    <Column field="description" header="Description" />
    <Column field="category" header="Category" />
  </Columns>
  <Rows>
    <Row>
      <Cell>Annual Report 2025</Cell>
      <Cell>Summary of key financial metrics for the fiscal year</Cell>
      <Cell>Finance</Cell>
    </Row>
    <Row>
      <Cell>Q1 Marketing Plan</Cell>
      <Cell>Campaign strategy and budget allocation for Q1</Cell>
      <Cell>Marketing</Cell>
    </Row>
  </Rows>
  <Empty>
    <div class="text-center py-12 text-slate-400">No items to display</div>
  </Empty>
</molecules--card-grid-102020>
\`\`\`

`
