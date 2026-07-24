# Inventory Control Template

Use this generic CollabUX template for inventory or stock-management workspaces across client projects.

## Input shape

This template expects an L4 workspace with:

- one paginated query returning an item array and a total count;
- an entity representing a stock item, inventory item, SKU, ingredient, supply, or material;
- optional boolean alert field such as `isLowStock`;
- commands for create, update, delete, and optionally adjustment/movement.

## Classification

Set:

```ts
uxClassification: {
  family: "enterpriseSaas",
  style: "salesforceStyle",
  template: "inventoryControl",
  layout: "listViewWithRecordPanel"
}
```

## Scope

This template is reusable. Do not encode project-specific names, routes, screenshots, seed data, or generated `page31` implementation details here.

Keep project-specific evidence and mappings in `collabux/examples/<projectId>/<workspaceId>/`.

## Page structure

```text
Object Header
  module eyebrow
  title
  purpose
  primary action: New/Create item

Summary Strip
  total items
  low stock count
  optional last updated / pending adjustment count

List View Card
  title + count
  search/filter toolbar
  data grid
  footer pagination

Record Panel
  selected item summary
  editable details
  adjustment action
  destructive action separated from primary save
```

## Suggested molecules

Before generating new UI markup, search the existing collab.codes frontend libraries and generated pages for molecules or web components that satisfy these responsibilities. Prefer reusing or adapting an existing molecule over creating a new one.

Use the names below as semantic targets. They do not require the exact implementation name to already exist.

| Suggested molecule | Responsibility | Required capabilities | Typical placement |
| --- | --- | --- | --- |
| `collab-object-header` | Enterprise object/page header | title, subtitle/purpose, eyebrow/module label, primary action slot, optional secondary actions | Top of page content |
| `collab-kpi-card` | Compact operational metric | label, value, optional status/tone, optional help text | Summary strip |
| `collab-kpi-strip` | Horizontal group of KPI cards | responsive card layout, consistent spacing, optional wrapping | Below object header |
| `collab-filter-toolbar` | List filter/search controls | search input, boolean filter/toggle, optional advanced filters, clear filters action | Top of list card |
| `collab-data-grid` | Primary tabular list surface | rows, typed columns, row selection, row actions, loading state, empty state, error state | Main list card |
| `collab-grid-column` | Declarative data-grid column definition | label, field binding, formatter, optional alignment, optional status renderer | Inside/config for data grid |
| `collab-row-action-menu` | Contextual row actions | primary row action, secondary actions, danger action separation | Right side of each grid row |
| `collab-pagination-footer` | Grid pagination controls | range label, page-size selector, previous/next buttons, disabled states | Footer of list card/grid |
| `collab-status-badge` | Compact state indicator | neutral/success/warning/danger tone, short label, optional icon | Grid cell, panel header, KPI card |
| `collab-record-panel` | Persistent right-side detail/action panel | selected record summary, mode switching for view/edit/create, footer actions, close/cancel behavior | Right side of page |
| `collab-field-group` | Grouped form fields | label, description, required marker support, validation state propagation | Inside record panel |
| `collab-form-field` | Single editable field wrapper | label, input slot/control, required marker, field-level error text | Inside field group |
| `collab-inline-alert` | Local feedback message | validation/system tones, concise message, optional retry/action slot | Inside list card or record panel |
| `collab-empty-state` | Empty list/card state | message, explanation, primary action slot | Data grid body when no rows exist |
| `collab-skeleton-table` | Loading placeholder for a grid | configurable row/column count, no fake data | Data grid body while loading |
| `collab-danger-zone` | Visually separated destructive action area | warning copy, destructive button, optional confirmation | Bottom of record panel |

### Molecule selection rules

- If an existing component covers at least 70% of a molecule responsibility, prefer that component and adapt configuration/labels.
- If several existing components match, choose the one already used by generated `page31` screens or shared frontend libraries.
- If no existing component matches, emit a clear missing-molecule note for the generator instead of inventing inconsistent one-off markup.
- Keep molecule names semantic in the template output, even when the underlying implementation name differs.
- Do not expose BFF names as molecule labels.
- Do not let the LLM create raw table, pagination, form, and alert markup repeatedly when reusable molecules exist.

## Query mapping

- Use the paginated BFF query as the grid data source.
- Map the first array field in the query output to the grid rows.
- Map a `total` output field to the list count and footer pagination count.
- Map string filters to a search input.
- Map boolean filters such as `lowStockOnly` to a checkbox or pill toggle.
- Do not expose `page` as a raw input field.
- Do not expose `pageSize` as a raw input field.
- Use footer controls:
  - `"1–25 de 120"`;
  - `"25 por página"`;
  - `"Anterior"`;
  - `"Próximo"`.

## Grid rules

- First visible column: item name.
- Show unit, current balance, minimum level, and low-stock status when available.
- Use a badge/chip for low stock.
- Use row highlight sparingly; prefer a status badge over a fully colored row.
- Put row actions at the right edge:
  - View/Edit;
  - Adjust stock;
  - Delete/remove in a menu or separated danger area.

## Record panel rules

- Open the panel when a row is selected.
- Panel header shows the item name and a compact status badge.
- Use sections:
  - `Detalhes`;
  - `Saldo`;
  - `Ajuste`;
  - `Auditoria` only if timestamps or audit fields exist.
- Keep save/cancel actions inside the panel footer.
- Show delete/remove as a danger action separated from save.

## Create flow

- The primary header action opens the same record panel in create mode.
- Required fields from the L4 command input must be visibly marked.
- On success, refresh the grid and select the created item.
- On validation error, keep user input and show field-level messages.

## Adjustment flow

- Use a compact action inside the record panel or row action menu.
- Required fields should usually be:
  - quantity;
  - direction;
  - reason;
  - optional notes.
- After success, refresh the selected item and list.

## Empty/loading/error states

- Loading: use skeleton rows or a neutral inline state inside the grid.
- Empty: show a short message and the primary create action.
- Query error: show a retry action in the list card.
- Command validation error: show field-level errors plus one concise alert.
- Command system error: show a non-field alert and keep the panel open.

## Labels

Generate business labels in the application language. For Portuguese:

- `New/Create item`: `Criar item de estoque`
- `Search`: `Buscar por nome`
- `Low stock only`: `Somente estoque baixo`
- `Current balance`: `Saldo atual`
- `Minimum level`: `Nível mínimo`
- `Adjust stock`: `Registrar ajuste`
- `Delete/remove`: `Remover`
- `Save`: `Salvar`
- `Cancel`: `Cancelar`

Avoid showing raw names such as `listStockItems`, `editStockItem`, `registerStockAdjustment`, `page`, or `pageSize`.

## Acceptance criteria

- The top filter row must not contain raw pagination fields.
- The grid footer must contain pagination.
- The primary action must create a new item.
- Edit/update must happen in the right record panel.
- Delete/remove must be visually separated as a destructive action.
- Low-stock information must be visible without requiring row expansion.
- Validation errors must be visible and actionable.
