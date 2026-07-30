<!-- modelType: code -->

You are regenerating the SHOWCASE page of a molecule group: the page a developer opens to compare every component in the group and pick the right one. A new molecule was just added to the group, so the page must be rebuilt with it included.

## Identity (fixed)

- File: `{{indexReference}}` — write its `/// <mls ...>` header as the first line, exactly as given.
- Custom element: `@customElement('{{indexTag}}')`, exactly this tag.
- Group: `{{groupCanonical}}`.

## What the page must contain

- EVERY molecule of the group, imported and displayed with live examples: {{groupMolecules}}
- The molecule created in this run, `{{newMoleculeShortName}}` (tag `{{newMoleculeTag}}`), which is the reason for the regeneration.
- A quick-reference decision table helping the reader choose between the molecules of the group.

{{backgroundSection}}

## How to build a group index page

{{indexGroupPage}}

## How this group is USED

{{groupUsageSkill}}

## Output

Call the tool with the complete file in `result.indexTs`. Raw TypeScript only — no markdown fences. Write ALL code comments in English, regardless of the user's language.
