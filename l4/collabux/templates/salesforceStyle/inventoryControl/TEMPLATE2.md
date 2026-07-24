# Inventory Control Template 2 — Using Existing 102040 Molecules

Use this variant when the generator must produce a Salesforce-style inventory control page using the molecules that already exist in:

`mls-base/mls-102040/l2/molecules`

Keep the original `TEMPLATE.md` as the ideal UX target. This file adapts that target to the current molecule inventory. When an exact molecule does not exist, keep the original semantic molecule and mark it as missing/fallback.

## Input shape

This template expects an L4 workspace with:

- one paginated query returning an item array and a total count;
- an entity representing a stock item, inventory item, SKU, ingredient, supply, or material;
- optional boolean alert field such as `isLowStock`;
- commands for create, update, delete, and optionally adjustment/movement.

## Classification

```ts
uxClassification: {
  family: "enterpriseSaas",
  style: "salesforceStyle",
  template: "inventoryControl",
  layout: "listViewWithRecordPanel",
  moleculeStrategy: "reuseExisting102040First"
}
```

## Existing molecule mapping

| Original semantic molecule | Existing molecule to use | Fit | Notes |
| --- | --- | --- | --- |
| `collab-object-header` | raw page markup + `grouptriggeraction--ml-button-standard` | partial | No object-header molecule found. Build the header with normal page markup and place the primary action button on the right. |
| `collab-kpi-card` | `groupviewmetric--ml-metric-card` | strong | Use for total items, low-stock count, and optional freshness/pending metrics. |
| `collab-kpi-strip` | raw layout container wrapping `groupviewmetric--ml-metric-card` | partial | No strip molecule found. Use responsive CSS/grid/flex only as layout glue. |
| `collab-filter-toolbar` | raw toolbar layout + `groupsearchcontent--ml-search-bar` + `groupenterboolean--ml-toggle-switch` | partial | Search and boolean controls exist; toolbar container itself does not. |
| `collab-data-grid` | `groupviewtable--ml-data-table` | strong | Full-featured table with sorting, row click, optional selection, pagination, loading, empty, and error states. |
| `collab-grid-column` | `TableHeader` / `TableHead` / `TableBody` / `TableRow` / `TableCell` slots inside `groupviewtable--ml-data-table` | strong | Column structure is declarative slot markup, not a separate molecule. |
| `collab-row-action-menu` | `grouptriggeraction--ml-kebab-action-trigger` + external/raw menu | partial | Kebab trigger exists; menu rendering/placement/action list must be owned by the parent until a menu molecule exists. |
| `collab-pagination-footer` | built-in pagination in `groupviewtable--ml-data-table` | partial | Table has built-in pagination below the table. If the UX requires range label and page-size selector, add raw footer or extend the table molecule later. |
| `collab-status-badge` | raw badge markup | missing | No status badge molecule found. Use a small semantic `<span>`/chip fallback for `isLowStock`. |
| `collab-record-panel` | raw right-side `<aside>` + `groupviewcard--ml-vertical-card` / `groupexpandcontent--ml-collapsible-panel` | partial | No persistent side panel/drawer molecule found. Use raw layout shell and existing card/collapsible molecules inside it. |
| `collab-field-group` | `groupexpandcontent--ml-collapsible-panel` or raw section | partial | Use collapsible sections for `Detalhes`, `Saldo`, `Ajuste`; otherwise raw section markup. |
| `collab-form-field` | existing input molecules | strong | Use field-specific molecules directly: text, multiline text, number, dropdown, boolean. |
| `collab-inline-alert` | `groupnotifyuser--ml-contextual-feedback` | strong | Use for command validation and local panel/list feedback. |
| `collab-empty-state` | built into `groupviewtable--ml-data-table` via `Empty` slot | partial | No standalone empty-state molecule needed for the grid. Use table `Empty` slot. |
| `collab-skeleton-table` | built into `groupviewtable--ml-data-table` via loading/default skeleton | strong | Use the table `loading` property. |
| `collab-danger-zone` | raw separated danger area + `grouptriggeraction--ml-button-standard` danger style | partial | No danger-zone molecule found. Keep destructive action separated visually. |

## Existing molecules by responsibility

### Page and action header

Use raw page markup for the object header:

- eyebrow/module label;
- title from `workspace.title`;
- purpose from `workspace.purpose`;
- primary action button using `grouptriggeraction--ml-button-standard`.

Do not create a custom object-header component yet.

```html
<header class="inventory-object-header">
  <div>
    <p class="inventory-object-eyebrow">cafeFlow · Estoque</p>
    <h1>Controlar estoque</h1>
    <p>Gerente mantém o cadastro de insumos, revisa alertas de estoque baixo e registra ajustes manuais de saldo.</p>
  </div>

  <grouptriggeraction--ml-button-standard size="md" type="button">
    <Label>Criar item de estoque</Label>
  </grouptriggeraction--ml-button-standard>
</header>
```

### Summary strip

Use `groupviewmetric--ml-metric-card` inside a raw responsive layout container.

```html
<section class="inventory-kpi-strip">
  <groupviewmetric--ml-metric-card loading="{{listStockItemsLoading}}">
    <Label>Total de itens</Label>
    <Value>{{listStockItems.total}}</Value>
    <Helper>Itens cadastrados</Helper>
  </groupviewmetric--ml-metric-card>

  <groupviewmetric--ml-metric-card loading="{{listStockItemsLoading}}">
    <Label>Estoque baixo</Label>
    <Value>{{lowStockCount}}</Value>
    <Trend direction="down">Atenção</Trend>
    <Helper>Itens abaixo do nível mínimo</Helper>
  </groupviewmetric--ml-metric-card>
</section>
```

If the L4 query does not provide `lowStockCount`, derive it client-side from the current page rows only and label it clearly as page-local, or omit the KPI.

### Filter toolbar

Use raw layout plus:

- `groupsearchcontent--ml-search-bar` for `nameFilter`;
- `groupenterboolean--ml-toggle-switch` for `lowStockOnly`;
- `grouptriggeraction--ml-button-standard` for refresh/clear filters if needed.

```html
<section class="inventory-filter-toolbar">
  <groupsearchcontent--ml-search-bar
    value="{{filters.nameFilter}}"
    placeholder="Buscar insumo..."
    debounce="300"
    loading="{{listStockItemsLoading}}">
    <Label>Buscar por nome</Label>
    <Empty>Nenhum insumo encontrado</Empty>
  </groupsearchcontent--ml-search-bar>

  <groupenterboolean--ml-toggle-switch value="{{filters.lowStockOnly}}">
    <Label>Somente estoque baixo</Label>
  </groupenterboolean--ml-toggle-switch>

  <grouptriggeraction--ml-button-standard size="sm" type="button" data-variant="secondary">
    <Label>Limpar filtros</Label>
  </grouptriggeraction--ml-button-standard>
</section>
```

Do not expose `page` or `pageSize` as raw fields in this toolbar.

### Data grid

Use `groupviewtable--ml-data-table` as the primary list/grid.

Recommended configuration:

- `loading`: bound to the query loading state;
- `error`: bound to query error message;
- `pageSize`: bound internally to the selected page size;
- row click: select item and open/update the right-side panel;
- sorting: only enable if local sorting is acceptable, or translate sort events into query parameters if the BFF supports sorting.

```html
<groupviewtable--ml-data-table
  loading="{{listStockItemsLoading}}"
  error="{{listStockItemsError}}"
  page="{{pagination.page}}"
  page-size="{{pagination.pageSize}}"
  total-items="{{listStockItems.total}}">
  <Caption>Itens de estoque</Caption>

  <TableHeader>
    <TableRow>
      <TableHead key="name" sortable>Nome</TableHead>
      <TableHead key="unit">Unidade</TableHead>
      <TableHead key="currentBalance" sortable align="right">Saldo atual</TableHead>
      <TableHead key="minimumLevel" sortable align="right">Nível mínimo</TableHead>
      <TableHead key="isLowStock">Status</TableHead>
      <TableHead key="actions" align="right">Ações</TableHead>
    </TableRow>
  </TableHeader>

  <TableBody>
    <!-- Generate one TableRow per stock item. -->
    <TableRow>
      <TableCell>{{item.name}}</TableCell>
      <TableCell>{{item.unit}}</TableCell>
      <TableCell>{{item.currentBalance}}</TableCell>
      <TableCell>{{item.minimumLevel}}</TableCell>
      <TableCell>
        <span class="inventory-status-badge inventory-status-badge--warning">Estoque baixo</span>
      </TableCell>
      <TableCell>
        <grouptriggeraction--ml-kebab-action-trigger size="sm">
          <Label>Ações do item</Label>
        </grouptriggeraction--ml-kebab-action-trigger>
      </TableCell>
    </TableRow>
  </TableBody>

  <Empty>Nenhum item de estoque encontrado.</Empty>
</groupviewtable--ml-data-table>
```

The existing table has built-in pagination below the table when `pageSize > 0`. If the desired Salesforce-like footer must show `1–25 de 120` and `25 por página`, prefer this compromise:

1. use the built-in table pagination for previous/next/page navigation;
2. add a small raw footer line outside or below the table for range and page-size selector;
3. use `groupselectone--ml-select-dropdown` for page-size selection.

```html
<footer class="inventory-grid-footer">
  <span>1–25 de {{listStockItems.total}}</span>

  <groupselectone--ml-select-dropdown value="{{pagination.pageSize}}">
    <Label>Itens por página</Label>
    <Item value="10">10</Item>
    <Item value="25">25</Item>
    <Item value="50">50</Item>
  </groupselectone--ml-select-dropdown>
</footer>
```

### Record panel

No existing molecule provides the persistent right-side record panel. Use raw `<aside>` layout and compose existing molecules inside it.

Use:

- `groupviewcard--ml-vertical-card` for selected item summary;
- `groupexpandcontent--ml-collapsible-panel` for sections;
- field molecules for edit/create/adjustment forms;
- `groupnotifyuser--ml-contextual-feedback` for validation feedback;
- `grouptriggeraction--ml-button-standard` for save/cancel/adjust/remove actions.

```html
<aside class="inventory-record-panel">
  <groupviewcard--ml-vertical-card selected="{{hasSelectedStockItem}}">
    <CardTitle>{{selectedItem.name}}</CardTitle>
    <CardDescription>{{selectedItem.unit}} · saldo {{selectedItem.currentBalance}}</CardDescription>
    <CardFooter>
      <span class="inventory-status-badge inventory-status-badge--warning">Estoque baixo</span>
    </CardFooter>
  </groupviewcard--ml-vertical-card>

  <groupnotifyuser--ml-contextual-feedback
    visible="{{commandErrorVisible}}"
    type="error">
    <Title>Não foi possível salvar</Title>
    <Message>{{commandErrorMessage}}</Message>
  </groupnotifyuser--ml-contextual-feedback>

  <section class="inventory-panel-section">
    <h2>Detalhes</h2>

    <groupentertext--ml-enter-text
      value="{{form.name}}"
      required
      error="{{fieldErrors.name}}">
      <Label>Nome</Label>
    </groupentertext--ml-enter-text>

    <groupentertext--ml-enter-text
      value="{{form.unit}}"
      required
      error="{{fieldErrors.unit}}">
      <Label>Unidade</Label>
    </groupentertext--ml-enter-text>

    <groupenternumber--ml-number-input
      value="{{form.minimumLevel}}"
      required
      error="{{fieldErrors.minimumLevel}}">
      <Label>Nível mínimo</Label>
    </groupenternumber--ml-number-input>

    <groupentertext--ml-multiline-text
      value="{{form.description}}"
      rows="3"
      error="{{fieldErrors.description}}">
      <Label>Descrição</Label>
    </groupentertext--ml-multiline-text>
  </section>

  <footer class="inventory-panel-footer">
    <grouptriggeraction--ml-button-standard size="md" type="button">
      <Label>Salvar alterações</Label>
    </grouptriggeraction--ml-button-standard>

    <grouptriggeraction--ml-button-standard size="md" type="button" data-variant="secondary">
      <Label>Cancelar</Label>
    </grouptriggeraction--ml-button-standard>
  </footer>

  <section class="inventory-danger-zone">
    <p>Remover este item pode afetar operações que dependem dele.</p>
    <grouptriggeraction--ml-button-standard size="sm" type="button" data-variant="danger">
      <Label>Remover item</Label>
    </grouptriggeraction--ml-button-standard>
  </section>
</aside>
```

### Adjustment form

Use the same record panel. Prefer a compact section below the item details.

```html
<section class="inventory-panel-section">
  <h2>Registrar ajuste</h2>

  <groupenternumber--ml-number-stepper
    value="{{adjustment.quantity}}"
    required
    min="0"
    error="{{fieldErrors.quantity}}">
    <Label>Quantidade</Label>
  </groupenternumber--ml-number-stepper>

  <groupselectone--ml-select-dropdown
    value="{{adjustment.direction}}"
    required
    error="{{fieldErrors.direction}}">
    <Label>Direção</Label>
    <Item value="IN">Entrada</Item>
    <Item value="OUT">Saída</Item>
  </groupselectone--ml-select-dropdown>

  <groupselectone--ml-select-dropdown
    value="{{adjustment.reason}}"
    required
    error="{{fieldErrors.reason}}">
    <Label>Motivo</Label>
    <Item value="count_correction">Correção de contagem</Item>
    <Item value="waste">Perda</Item>
    <Item value="purchase">Compra</Item>
  </groupselectone--ml-select-dropdown>

  <groupentertext--ml-multiline-text
    value="{{adjustment.notes}}"
    rows="2"
    error="{{fieldErrors.notes}}">
    <Label>Observações</Label>
  </groupentertext--ml-multiline-text>

  <grouptriggeraction--ml-button-standard size="md" type="button">
    <Label>Registrar ajuste</Label>
  </grouptriggeraction--ml-button-standard>
</section>
```

## Missing or partial molecules to keep as original targets

These should remain in the product roadmap because the current adaptation needs raw layout or compromises:

| Missing target | Why it matters |
| --- | --- |
| `collab-object-header` | Makes page headers consistent across generated SaaS pages. |
| `collab-kpi-strip` | Avoids repeated raw layout for metric groups. |
| `collab-filter-toolbar` | Encapsulates search/filter/action alignment and responsive behavior. |
| `collab-record-panel` | Avoids every page inventing its own side panel/drawer behavior. |
| `collab-status-badge` | Standardizes warning/success/neutral/danger status chips. |
| `collab-row-action-menu` | Current kebab trigger does not render/manage menu content. |
| `collab-pagination-footer` | Existing table pagination is useful, but does not fully model range label + page-size selector as a reusable molecule. |
| `collab-danger-zone` | Standardizes destructive action separation and confirmation copy. |

## Query mapping

- Use the paginated BFF query as the grid data source.
- Map the first array field in the query output to the table rows.
- Map a `total` output field to the metric count and optional footer range label.
- Map string filters to `groupsearchcontent--ml-search-bar`.
- Map boolean filters such as `lowStockOnly` to `groupenterboolean--ml-toggle-switch`.
- Do not expose `page` as a raw top-toolbar field.
- Do not expose `pageSize` as a raw top-toolbar field.
- If page size must be user-controlled, use `groupselectone--ml-select-dropdown` in the grid footer area.

## Grid rules

- First visible column: item name.
- Show unit, current balance, minimum level, and low-stock status when available.
- Use raw status badge fallback for `isLowStock` until a badge molecule exists.
- Use `grouptriggeraction--ml-kebab-action-trigger` for row-level contextual actions.
- Keep destructive row actions inside the external menu or panel danger area, not as a prominent inline button.
- Let `groupviewtable--ml-data-table` own loading, empty, error, sorting, and built-in pagination where possible.

## Record panel rules

- Use raw layout for the right-side panel shell.
- Use existing input molecules directly; do not wrap every input in custom markup unless layout requires it.
- Put `groupnotifyuser--ml-contextual-feedback` near the failed command or section.
- Put save/cancel actions in the panel footer.
- Put remove/delete in a visually separated raw danger zone.
- Keep the panel open on validation or command failure.

## Create flow

- The object-header primary action opens the right panel in create mode.
- Required command inputs from L4 must be marked `required` on the relevant field molecule.
- On success, refresh the table and select the created item.
- On validation error, preserve input and map backend field errors to the field molecule `error` property.

## Adjustment flow

- Use the selected item record panel.
- Use `groupenternumber--ml-number-stepper` or `groupenternumber--ml-number-input` for quantity.
- Use `groupselectone--ml-select-dropdown` for direction and reason when finite options exist.
- On success, refresh the selected item and the table.

## Labels

Generate business labels in the application language. For Portuguese:

- `New/Create item`: `Criar item de estoque`
- `Search`: `Buscar por nome`
- `Low stock only`: `Somente estoque baixo`
- `Current balance`: `Saldo atual`
- `Minimum level`: `Nível mínimo`
- `Adjust stock`: `Registrar ajuste`
- `Delete/remove`: `Remover item`
- `Save`: `Salvar alterações`
- `Cancel`: `Cancelar`
- `Page size`: `Itens por página`

Avoid showing raw names such as `listStockItems`, `editStockItem`, `registerStockAdjustment`, `page`, or `pageSize`.

## Acceptance criteria

- Only `TEMPLATE2.md` may depend on the current `102040` molecule inventory.
- The top filter row must not contain raw pagination fields.
- The main grid must use `groupviewtable--ml-data-table`.
- KPI cards must use `groupviewmetric--ml-metric-card`.
- Search must use `groupsearchcontent--ml-search-bar`.
- Low-stock boolean filter must use `groupenterboolean--ml-toggle-switch`.
- Primary, secondary, and destructive actions must use `grouptriggeraction--ml-button-standard` where possible.
- Row action entry point must use `grouptriggeraction--ml-kebab-action-trigger`.
- Field-level validation must use each field molecule's `error` property.
- Section/page validation feedback must use `groupnotifyuser--ml-contextual-feedback`.
- Missing molecules must be explicitly identified instead of silently replaced by inconsistent one-off components.
