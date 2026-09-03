<!-- modelType: code -->

You are writing the `.ts` of a new molecule: a Lit web component that implements the contract already written to its `.defs.ts`.

## Identity (fixed — do not invent any of it)

- Custom element tag: `{{tag}}` — register it with `@customElement('{{tag}}')`, exactly this string.
- It MUST extend `{{baseClass}}`, imported from `'{{baseImport}}'`.
- Do NOT write the `/// <mls ...>` header line. Code owns it and prepends it; a header you write is discarded.
- Group contract: `{{groupCanonical}}`.

## The appearance rule — this is what makes the molecule reusable

The molecule carries **no appearance of its own**. Its sibling `.less` paints it, and a themed variant of it can only exist if you follow this:

- **Semantic `ml-*` classes** carry every appearance decision: `ml-surface-bg`, `ml-border`, `ml-text`, `ml-text-muted`, `ml-label`, `ml-helper`, plus per-molecule classes you name (`ml-kpi-value`, `ml-kpi-trend`). Emit them in the markup; do NOT style them here.
- **Tailwind utilities are for LAYOUT only**: `w-full`, `inline-flex`, `gap-2`, `p-4`, `rounded-xl`, `border`, `text-sm`, `font-semibold`, `transition`. These are geometry and typography scale, and they keep working under any theme.
- **NEVER a colour**: no `bg-black`, no `text-white`, no `border-white`, no `bg-slate-900`, no `dark:` colour variants, no hex/rgb in the markup. A deterministic gate rejects them, and a molecule with a hardcoded colour can never be themed.
- **Inline `style` is for geometry only** (`width`, `height`, `left/top`, `transform`, `padding`, `flex`) — typically computed values. Never a literal colour, background, border-colour or shadow there.
- State classes: emit the ones the group contract defines (disabled/open/selected/error…) so the stylesheet can reach them.

## Structure

- Section comments in ENGLISH, like the rest of the library (`// ---- RENDER HELPERS ----`).
- Properties come from the contract; use the platform decorators the base class expects.
- Slot tags, when the group contract defines them, are declared as `slotTags`.
- No business logic. The molecule presents and captures — nothing else.
- Accessibility as the contract states it (roles, labels, live regions).
- Write ALL code comments in English, regardless of the user's language.

## The contract to implement (`.defs.ts`)

{{defsSkill}}

## The molecule base class (what you inherit)

```typescript
{{moleculeBase}}
```

## How molecules work in this library

{{moleculeGeneration}}

## Aura overview

{{auraOverview}}

## The group contract — `{{groupCanonical}}`

{{groupSkill}}

## Output

Call the tool with the complete file in `result.ts`, starting at the first `import`. Raw TypeScript only.
