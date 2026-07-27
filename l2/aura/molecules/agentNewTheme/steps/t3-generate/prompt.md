<!-- modelType: design -->

You are authoring a project's theme file from scratch. Follow the authoring skill below
to the letter, then return the COMPLETE file plus a structured summary of it.

{{themeAuthoringSkill}}

## The file you must produce

Return the whole `theme.ts` as ONE string (`themeTs`), raw TypeScript, no markdown fences.
A deterministic gate reads the three exports straight out of your text, so keep EXACTLY this
skeleton — one field per line, single-quoted values, no type annotations, no imports:

```
/// <mls fileReference="{{headerRef}}" enhancement="_blank"/>

// Theme skill (contract v1): themeInfo + skill (payload only) + examples.
// <one or two more English comment lines about this theme>

export const themeInfo = {
    name: '<kebab id>',
    suffix: '-<kebab id>',
    displayName: '<Human Name>',
    description: '<one line describing the visual system>',
    background: {
        kind: '<light|dark|image>',
        css: '<the page background CSS declaration>',
        note: '<the backdrop contract + text color stance>',
    },
};

export const skill = `
# Theme — <Human Name>

## 1. Visual Signature
...
## 2. Tokens
...
## 3. Canonical CSS Rules
...
## 4. Theme Nuances
...
`;

export const examples = [];
```

Hard requirements the gate enforces:

- Exactly ONE `/// <mls ...>` header, referencing `{{headerRef}}`.
- No `import` statements — the theme is a self-contained data module.
- `suffix` is exactly `'-' + name`.
- The `skill` string is ONE template literal; any backtick inside it MUST be escaped as
  `` \` `` and there must be no `${` interpolation.
- Sections `## 1. Visual Signature`, `## 2. Tokens` and `## 3. Canonical CSS Rules` are
  mandatory and appear in that order; `## 4. Theme Nuances` is optional but recommended.
- `examples` starts EMPTY.
- All comments and prose inside the file are in ENGLISH, whatever the user's language.

## The structured summary

Also return `summary` — it drives the confirmation screen the human sees and the generated
`theme.html` documentation page. It must describe the file you just wrote:

- `name` / `displayName`: identical to `themeInfo`.
- `background`: `kind` and `css` identical to `themeInfo.background`.
- `palette`: one entry per COLOR token you defined, `{ token: '--ml-*', label, color }`.
  Every token must appear in your `## 2. Tokens` table, and `color` must be a plain CSS
  color the UI can paint as a swatch (`#rrggbb` or `rgb()/rgba()`), not a `var()`.
- `signature`: the layout decisions as `{ aspect, value }` rows — at least Corners, Border,
  Shadow, Motion, Typography (add Blur/Extras when the style has them).

## Inputs

The human message carries the user's original description, the fields already decided
(`known`), and the checkpoint answers when the user was asked. Honor all of them:
`known` and the answers are DECISIONS, not suggestions. Fill any remaining gap with a
coherent choice for the style described, and mention it in the `description`.
