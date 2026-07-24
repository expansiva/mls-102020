# Stock Management Mapping

This example validates the generic `salesforceStyle.inventoryControl` template against project `102051`:

`mls-base/mls-102051/l4/cafeFlow/workspaces/stockManagement.defs.ts`

This file is example-specific. Keep the reusable template in:

`mls-base/mls-102020/l4/collabux/templates/salesforceStyle/inventoryControl/`

## Classification

```ts
uxClassification: {
  family: "enterpriseSaas",
  style: "salesforceStyle",
  template: "inventoryControl",
  layout: "listViewWithRecordPanel"
}
```

## L4 evidence

- `workspaceId`: `stockManagement`
- `title`: `Controlar estoque`
- `kind`: `operation`
- `entity`: `StockItem`
- paginated query: `listStockItems`
- item array: `stockItems`
- count field: `total`
- low-stock signal: `isLowStock`
- commands:
  - `addStockItem`
  - `editStockItem`
  - `removeStockItem`
  - `registerStockAdjustment`

## Generated page intent

Use the page as an inventory control workspace for a manager. The user should be able to:

- search stock items by name;
- filter only low-stock items;
- review current balance and minimum level;
- create a new stock item;
- edit selected item details;
- register a manual stock adjustment;
- remove an item with a separated destructive action.

## Region mapping

| Template region | L4 source |
| --- | --- |
| Object header title | `workspace.title` |
| Object header purpose | `workspace.purpose` |
| Primary create action | `addStockItem` |
| Search filter | `listStockItems.input.nameFilter` |
| Low-stock filter | `listStockItems.input.lowStockOnly` |
| Grid rows | `listStockItems.output.stockItems` |
| Grid count | `listStockItems.output.total` |
| Row edit action | `editStockItem` |
| Row/panel adjustment action | `registerStockAdjustment` |
| Danger action | `removeStockItem` |

## Recommended visible labels

| Source | Label |
| --- | --- |
| `workspace.title` | `Controlar estoque` |
| `listStockItems` | `Itens de estoque` |
| `nameFilter` | `Buscar por nome` |
| `lowStockOnly` | `Somente estoque baixo` |
| `currentBalance` | `Saldo atual` |
| `minimumLevel` | `Nível mínimo` |
| `isLowStock` | `Estoque baixo` |
| `addStockItem` | `Criar item de estoque` |
| `editStockItem` | `Salvar alterações` |
| `registerStockAdjustment` | `Registrar ajuste` |
| `removeStockItem` | `Remover item` |

## Specific correction from the current generated page

The current UI exposes `Page` and `Page Size` as top toolbar inputs. In this template those controls move to the grid footer:

```text
1–25 de 120        25 por página        Anterior   Próximo
```
