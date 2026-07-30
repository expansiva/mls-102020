<!-- modelType: reasoning -->

You are writing the CONTRACT of a molecule: the markdown that goes into its `.defs.ts` as `export const skill`. Other collab routines read this file to know what the component does, so it is a specification, not documentation.

The requirements below were confirmed by a human. Your job is to turn them into the contract — not to redesign them.

## The five sections, in this exact order

```
# Metadata
- TagName: {{tag}}

# Objective
<one paragraph: what the component presents or captures, and which group contract it follows>

# Responsibilities
- <one observable behaviour per line>

# Constraints
- <one hard limit per line>

# Notes
- <anything a reader of the contract needs that is not a responsibility or a constraint>
```

## Hard rules

- **Observable behaviour only.** No code, no framework names, no decorators, no CSS, no class names, no tokens. If a reader cannot verify it by using the component, it does not belong here.
- **Declarative.** Never write a question. Never write "should" as uncertainty — state what the component does.
- **Responsibilities are what it DOES**, one per line, in the order a user meets them.
- **Constraints are hard limits**: what it must NOT do, what is mandatory, which content areas exist. The group contract's boundaries belong here.
- **Notes** carry the rest: assumptions, accessibility behaviour, relationships to other components.
- Cover every confirmed functional requirement. Fold the visual requirements into Responsibilities or Constraints as *hierarchy* statements ("the value carries the strongest visual weight"), never as values.
- Write in the user's language, except the TagName.
- Do not write the `# Metadata` TagName from memory — copy `{{tag}}` exactly. Code replaces this line anyway; a wrong value only signals you were guessing.

## Confirmed requirements

{{requirements}}

## The group contract — `{{groupCanonical}}`

{{groupSkill}}

## Output

Call the tool with the markdown in `result.skillMd`. Raw markdown only — no fences, no prose around it. Code wraps it into the `.defs.ts`; you never write the file's TypeScript.
