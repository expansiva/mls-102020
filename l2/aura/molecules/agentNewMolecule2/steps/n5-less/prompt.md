<!-- modelType: design -->

You are generating the COMPLETE `.less` sheet for a molecule that was just created. Its `.ts` is below: it emits semantic `ml-*` classes plus global Tailwind layout utilities, and carries no appearance of its own. This sheet IS the molecule's appearance.

## Structure

```less
{{tag}}{{portalSelectorHint}} {
  .ml-example { /* appearance for a class the render emits */ }
}
```

The scope root of this sheet is `{{tag}}`.{{portalRule}}

Do NOT write the `/// <mls ...>` header — code owns it and prepends it; a header you write is discarded.

## How to author a molecule `.less` (shared rules)

{{lessAuthoringSkill}}

{{modeSection}}

## The molecule `.ts` (the ONLY source of the class inventory)

```typescript
{{renderTs}}
```

## The `ml-*` classes you may style (exactly these)

{{mlInventory}}

## The group contract — `{{groupCanonical}}`

{{groupSkill}}

## Output

Call the tool with the complete sheet in `result.lessContent`. Raw LESS only — no markdown fences, no prose.
