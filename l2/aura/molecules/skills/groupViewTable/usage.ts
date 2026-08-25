/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupViewTable/usage.ts" enhancement="_blank"/>

export const skill = `
# view + table — Usage

> Quick reference for using molecules in the **view + table** group — tabular data, optionally with
> per-row edit/save/cancel/delete and a "new record" draft row. Same slot tag contract for all.

---

## Slot Tags

| Tag | Description |
|-----|-------------|
| \`Caption\` | Table caption/title |
| \`TableHeader\` | Header section container |
| \`TableBody\` | Body section container |
| \`TableRow\` | A table row. Optional \`key\` — row identity, **key not index**, changes when sorted |
| \`TableHead\` | Header cell. Attributes: \`key\` (required), \`sortable\` (presence) |
| \`TableCell\` | Data cell, text or web components. Optional \`sort-value\` — see **Sorting** |
| \`TableFooter\` | Footer section container |
| \`Empty\` | Content shown when no rows exist |
| \`Loading\` | Content shown during loading state |
| \`Detail\` | Shown when a record expands, inside \`<TableRow>\`. Optional \`label\` names it for a scene. Only expansion-capable molecules read it |
| \`RowActions\` | Optional, row-lifecycle only. Child of a body \`<TableRow>\`, or of \`<NewRecordRow>\` |
| \`RowAction\` | Optional. Inside \`RowActions\`, or direct child of \`TableFooter\` (new-record trigger) |
| \`NewRecordRow\` | Optional. Draft row for creating a record, one at a time |

---

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`value\` | \`string\` | \`''\` | Comma-separated selected row indices (\`"0,2,5"\`). Drives the highlight **independently of \`selectable\`** — set it to mark a row with no checkbox |
| \`error\` | \`string\` | \`''\` | Error message; empty means no error |
| \`selectable\` | \`boolean\` | \`false\` | Renders the checkbox column. Does NOT gate the highlight |
| \`is-editing\` | \`boolean\` | \`false\` | Propagates \`is-editing\` to web components inside the cells of each editing row (the whole table when set) |
| \`editing-rows\` | \`string\` | unset | Optional. Row keys YOU want open, comma-separated. **Presence hands you the mode** — empty-but-present is valid. Omit it and the molecule owns the mode — see below |
| \`page\` | \`number\` | \`1\` | Current page (1-based) |
| \`page-size\` | \`number\` | \`0\` | Rows per page (0 = no pagination) |
| \`total-items\` | \`number\` | \`0\` | Total items. **Leaving it at 0 selects INTERNAL mode** — see below |
| \`disabled\` | \`boolean\` | \`false\` | Disables all interaction |
| \`loading\` | \`boolean\` | \`false\` | Shows loading state |
| \`fit-height\` | \`boolean\` | \`false\` | Optional. Fills the parent's height, body-only scroll; needs a parent with a defined height. In 1 of 12 today |

### Pagination and sorting: pick one of the two modes

| | write all rows in \`<TableBody>\`, leave \`total-items\` at \`0\` | write only the current page, set \`total-items\` to the full count |
|---|---|---|
| mode | **INTERNAL** | **EXTERNAL** |
| who sorts | the molecule, over the whole set | **you**, over the whole set |
| who slices the page | the molecule | you, on \`pageChange\` |
| what you write | everything once | requery on \`sort\` and on \`pageChange\` |

**Do not mix them.** In EXTERNAL mode the molecule does not reorder — it holds one page, and
reordering there would order 10 rows out of 60. It still emits \`sort\` so you can requery; sorting
in your page **and** expecting the molecule to sort too orders rows by one criterion with content
from another.

---

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| \`change\` | \`{ value: string }\` | Selection changed (comma-separated row indices) |
| \`sort\` | \`{ key: string, direction: string }\` | Sort triggered |
| \`pageChange\` | \`{ page: number }\` | Page navigation triggered |
| \`rowClick\` | \`{ index: number }\` | Row clicked. Not from selection or a row action; echo the choice through \`value\` or the row stays unmarked |
| \`edit\` | \`{ key }\` | Optional. Row entered edit mode |
| \`save\` | \`{ key }\` · draft: \`{ key, isNew: true }\` | Optional. Molecule closed the row; YOU persist the value |
| \`cancel\` | \`{ key }\` · draft: \`{ key, isNew: true }\` | Optional. Molecule closed the row; YOU discard the draft |
| \`delete\` | \`{ key }\` | Optional. Does NOT close the row; removal is yours |
| \`newRecord\` | \`{}\` | Optional. Draft opened, or requested with none supplied |
| \`rowAction\` | \`{ key, action }\` | Optional. Generic route for \`action\` outside the vocabulary |

---

## Row actions & the draft row — MODE × VALUE

**The molecule never owns the VALUE — only the MODE, and only when you don't claim it.** Same rule
both sides; it's what makes "cancel without changing anything" work.

|  | **you** own the mode | **the molecule** owns the mode |
|---|---|---|
| declare | pass \`editing-rows\` | omit it; put \`<RowAction action="edit">\` in the row |
| opens the row | you, rewriting \`editing-rows\` | the molecule, on click — no round trip |
| you write per row | action column in a \`<TableCell>\`, ternary | \`<RowActions>\` with one \`<RowAction>\` per action |
| track state | you already know | from the \`edit\`/\`save\`/\`cancel\` events |

**Pick ONE per instance.** \`editing-rows\` **and** \`<RowAction action="edit">\` in the same table do
not add up: with the attribute present the molecule reads the mode from it, so the click only emits
and the row never opens.

\`action\` vocabulary: \`edit\` (opens), \`delete\` (no mode change), \`save\`/\`cancel\` (close), \`new\`
(footer, opens the draft); \`when\` (\`view\`\\|\`edit\`\\|\`always\`) infers from \`action\` when omitted.
**A row offering \`edit\` MUST also offer \`save\` and \`cancel\`** — the \`when\` inference hides
\`edit\`/\`delete\` while that row edits, so without them the row opens with no way back. **And the
editor is yours**: the molecule never creates an input — \`is-editing\` only reaches web components
in the cell, so a plain-text \`<TableCell>\` does nothing when the row opens.
The molecule injects the actions column, only when some row/\`<NewRecordRow>\` supplies
\`<RowActions>\` — never declare it in \`<TableHeader>\`:

\`\`\`html
<TableRow key="123">
  <TableCell><groupentertext--ml-enter-text value="Ana Silva"></groupentertext--ml-enter-text></TableCell>
  <RowActions>
    <RowAction action="edit">…</RowAction><RowAction action="delete">…</RowAction>
    <RowAction action="save">…</RowAction><RowAction action="cancel">…</RowAction>
  </RowActions>
</TableRow>
\`\`\`

**Draft row**: \`<NewRecordRow key="...">\`, one editable \`<TableCell>\` per column, its own
\`<RowActions>\` (\`save\`/\`cancel\`); trigger in the footer:
\`<TableFooter><RowAction action="new">…</RowAction></TableFooter>\`. One at a time, not sorted,
paginated or selectable. \`newRecord\` fires even with none supplied.

### Mapping \`rowActions[]\` to \`action\`

\`rowActions[]\` and this vocabulary don't share one wordlist — map what matches, route the rest
through \`rowAction\`: \`update\`→\`edit\` · \`delete\`→\`delete\` · \`editLine\`→\`edit\` ·
\`removeLine\`→\`delete\` · else **no match**: declare it verbatim and read \`rowAction.detail.action\`
back. **Never invent a name in this vocabulary.**

---

## Examples

### Simple data table with sorting

\`\`\`html
<groupviewtable--ml-data-table>
  <Caption>Order List</Caption>
  <TableHeader>
    <TableRow>
      <TableHead key="id" sortable>ID</TableHead>
      <TableHead key="total" sortable>Total</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow><TableCell>#001</TableCell><TableCell>$150.00</TableCell></TableRow>
  </TableBody>
  <Empty>No orders found</Empty>
</groupviewtable--ml-data-table>
\`\`\`

### Sorting a column whose text does not sort like the data

Sorting reads the cell's text — wrong whenever the text doesn't order like the value (masked
currency, \`dd/mm/yyyy\` dates, status labels). Declare the real value and the molecule sorts by it:

\`\`\`html
<TableCell sort-value="987">R$ 987,00</TableCell>
\`\`\`

Numbers already formatted in pt-BR/en-US sort fine without it (\`R$ 1.234,50\` reads as 1234.5); use
\`sort-value\` when the ORDER differs from the text, not merely its format.

### Table with on-demand record detail

Molecules with expansion accept a \`<Detail>\` per row, **empty** until filled: the molecule emits
\`rowClick\` with the index, you load what's needed and write inside. Live slot — buttons keep
firing, a nested table is real.

\`\`\`html
<groupviewtable--ml-lazy-record-detail-table>
  <TableRow>
    <TableCell>John Doe</TableCell>
    <Detail label="John Doe"><!-- empty until rowClick --></Detail>
  </TableRow>
</groupviewtable--ml-lazy-record-detail-table>
\`\`\`

One \`<Detail>\` per \`<TableRow>\`, as a direct child; molecules without expansion ignore it. **Same markup, both
presentations** — a row below the record, or a scene replacing the list; change the tag, not the
markup. \`label\` is the scene's heading, ignored by a detail-row presentation.

> ⚠️ Use \`label\`, never \`title\` — \`title\` is a global HTML attribute and becomes a tooltip.

---

## Customization

\`data-class\` passes extra CSS classes, on the host (\`<component data-class="w-full mt-4">\`) or on
a slot tag. Override \`--ml-*\` tokens on a parent element (e.g. \`--ml-primary: #7c3aed;\`):

\`--ml-surface\` #fff · \`--ml-surface-dim\` #f5f5f5 · \`--ml-on-surface\` #1c1b1f ·
\`--ml-on-surface-muted\` #49454f · \`--ml-on-surface-faint\` #79747e · \`--ml-primary\` #3b82f6 ·
\`--ml-on-primary\` #fff · \`--ml-error\` #ef4444 · \`--ml-on-error\` #fff ·
\`--ml-outline-variant\` #e2e8f0 · \`--ml-outline-focus\` #3b82f6 · \`--ml-outline-error\` #ef4444 ·
\`--ml-radius-sm\` 6px · \`--ml-shadow-1\` 0 1px 3px rgba(0,0,0,.1) · \`--ml-font-family\` system-ui ·
\`--ml-font-weight-medium\` 500 · \`--ml-transition\` 200ms ease ·
\`--ml-focus-ring-color\` rgba(59,130,246,.4) · \`--ml-disabled-opacity\` 0.5
`;
