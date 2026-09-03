<!-- modelType: code -->

You are creating the SHOWCASE page of a molecule group from scratch: the page a developer opens to compare every component in the group and pick the right one. This group has no `index.ts` yet.

## Identity (fixed)

- File: `{{indexReference}}` — write its `/// <mls ...>` header as the first line, exactly as given.
- Custom element: `@customElement('{{indexTag}}')`, exactly this tag.
- Group: `{{groupCanonical}}`.

## What the page must contain

- EVERY molecule of the group, imported and displayed with live examples: {{moleculeFiles}}
- A "Quick reference" section — see the OVERRIDE below; do not hand-write it.

## How to build a group index page

{{indexGroupPage}}

## ⚠️ OVERRIDE — renderReferenceTable() is NOT hand-written here

The "## renderReferenceTable()" section above describes the OLD format. In THIS page, `renderReferenceTable()` must be EXACTLY these three lines, and nothing else:

```ts
private renderReferenceTable(): TemplateResult {
  return renderCatalogReferenceTable(molecules, scenarios);
}
```

Add these two imports, right after the other imports:

```ts
import { molecules, scenarios } from '{{indexDefsReference}}';
import { renderCatalogReferenceTable } from '{{sharedTableReference}}';
```

Do NOT write a `<table>`, a `headers` array, or a `rows` array anywhere in this file. The table's markup and its column order/color are handled entirely by `renderCatalogReferenceTable` — your only job for the reference table is the `scenarios` DATA below, returned as a separate tool field, never as code inside `indexTs`.

## The "Quick reference" scenarios (as data, not markup)

This is the same authorial judgment the "How to build" section above describes for the `rows` array — write it as data instead. For each realistic use case of this group, list which molecules fit it.

Available molecules in the group (use ONLY these short names — inventing one that is not in this list is not allowed): {{moleculeFiles}}

## How this group is USED

{{groupUsageSkill}}

## Output

Call the tool with:
- `indexTs`: the complete file, raw TypeScript only — no markdown fences.
- `scenarios`: the quick-reference table as data (see above).

Write ALL code comments in English, regardless of the user's language.
