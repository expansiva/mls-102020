# Skill: a molecule group's `configuration.ts`

Use this when you create a **molecule group**, add a **molecule** to a group, or add, rename or remove
a **slot or property** of a molecule. In every one of these cases the group's `configuration.ts` must be
updated in the same change.

## The file

```
mls-102020/l2/aura/molecules/skills/<group>/configuration.ts
```

One per group, next to the group's `creation.ts`. It is required — create it with the group, even if
both lists are empty. It describes, for the Studio, what is decided when designing a page with the
group's molecules. It exports:

```ts
import type { IMoleculeConfigProp, IMoleculeSlotOrder } from '/_102020_/l2/aura/molecules/shared/configuration.js';

export const group = '<group>';

export const configuration: readonly IMoleculeConfigProp[] = [
  // the design-time properties
] as const;

export const slotOrder: readonly IMoleculeSlotOrder[] = [
  // the slots that can be reordered (optional export)
] as const;
```

## `configuration` — the design-time properties

One entry per property that is **written as a literal attribute when designing the page** (`size="sm"`,
`data-variant="ghost"`, `page-size="20"`).

```ts
{ property: 'pageSize', attribute: 'page-size', type: 'number', default: 0, min: 0 }
```

| field | rule |
|---|---|
| `property` | the Lit property name; the attribute itself when it is not a Lit property (`data-variant`) |
| `attribute` | only when the HTML attribute differs from the property (`icon-position`, `page-size`) |
| `type` | `enum` (closed list), `boolean`, `number`, `text` |
| `values` | `enum` only: the CLOSED list. An open list is `text` with `examples` |
| `default` | what the molecule uses when the attribute is absent; `null` = none |
| `defaults` | per-tag default when a molecule differs from the group (`{ 'groupentermoney--ml-enter-money-br': 'BRL' }`) |
| `examples` | `text` only: suggestions for the field, never a restriction |
| `min` / `max` | `number` only |
| `only` | the tags that read it; absent = every molecule of the group |

**In or out** — is it decided at design time, or is it the page's state/data?

- **In:** layout and look decided once (`selectable`, `pageSize`, `fitHeight`, `size`, `data-variant`).
- **Out:** page data (`page`, `totalItems`, `value`), page state (`disabled`, `loading`, `error`,
  `isEditing`), anything bound with `${…}` in a real page.

Every property you put in `configuration` must also appear in the Configuration table of the group's
`creation.ts`. Write the reason for each ambiguous case in a comment above the list.

## `slotOrder` — which slots can be reordered, and what moves with them

One entry per slot whose **order among its same-name siblings is what the molecule shows** — a column,
a tab, a step, an option. A slot that is not listed can never be reordered.

```ts
{ slot: 'TableHead', pairs: [{ slot: 'TableCell', within: 'TableRow' }] }
```

| field | rule |
|---|---|
| `slot` | the slot tag exactly as the molecule declares it in `slotTags` |
| `pairs` | slots matched to it **by position**: the one at the same index among its same-name siblings inside each `within` element. Moving `TableHead` 2 moves the 2nd `TableCell` of every `TableRow` |
| `only` | the tags it applies to; absent = every molecule of the group |

**Read the molecule's code before declaring a slot**, and confirm:

1. it reads that slot **in order** (`getSlots('Tab')`, `querySelectorAll('Item')`) and shows it in that
   order;
2. whether another slot is matched to it **by position** — that is a pair. Look for an index used across
   two lists: `cells[columnIndex]`, `columns[cellIndex]`, `row.cells[colIndex]`. A slot matched by a
   **name** (`key`, `field`) is not a pair;
3. when only some molecules of the group behave like this, list them in `only`.

A wrong pair moves the wrong content, so never declare one without finding that index in the code.

**Leave a slot out** (and say why in the comment) when its order is not what the user would be moving:

- the molecule finds things **inside** the slot instead of by position (a calendar that looks for the
  date in the cells' content);
- the molecule **transforms** the slots into something else (a kanban that turns rows into lanes and
  cells into cards);
- the slot is almost always **data** (`Point`, `Node`, `Suggestion`, a `Row` inside a `${…map()}`).

## What to do

**A new group**

1. Create `skills/<group>/configuration.ts` with `group` and `configuration` (an empty list is valid).
2. List its design-time properties, each one also in the `creation.ts` Configuration table.
3. If its molecules have slots that repeat with meaningful order, add `slotOrder`.

**A new molecule in an existing group**

1. Properties: check it reads every configured property under the same attribute and with the same
   default. If it does not read one, narrow that entry with `only`; if its default differs, add it to
   `defaults`.
2. Slot order: every `slotOrder` entry **without `only`** now applies to it, so it must declare those
   slots (and their pair slots and `within`) and read them the same way. If it does not, narrow the
   entry with `only`.
3. A new repeatable slot whose order matters: add it to `slotOrder`.

**A slot or property renamed or removed in a molecule** — update every entry of the group's
`configuration.ts` that names it.

## Comments in the file

Say **what** holds and **why**, from the code: "every table reads the cells of a row by position against
the headers (`cells[columnIndex]`)". No task ids and no dates.
