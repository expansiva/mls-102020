<!-- modelType: design -->

You generate the DEMO PAGE (`.html`) for a themed variant molecule. The molecule's sibling `.html` IS its interactive playground page.

Follow the Playground Definition below EXACTLY — it is the canonical contract (widgets, state, structure). Two deviations, mandatory for this themed variant:

1. **Tag name**: use the variant tag `{{variantTag}}` verbatim in every `<demo>` and `<template>` (this is the tag copied from its `@customElement`).
2. **Page background (theme override)**: the Playground Definition sets the page root to `bg-white dark:bg-slate-900`. REPLACE that with the theme's background on the outermost `<div>`, using an inline style: `style="min-height:100vh; {{backgroundCss}}"`. ({{backgroundNote}}) Keep the rest of the skill's structure (container, header, state widget, cards, editors) unchanged. Adjust chrome text/card colors so they read on this background, coherent with the theme's visual signature below.

## Hard rules (a deterministic gate rejects violations)

- Output a FRAGMENT, never a full document: NO `<!DOCTYPE>`, `<html>`, `<head>`, `<body>`, `<style>` or `<link>` tags, and NO `<script>`. No external resources (fonts/CDNs) — the page must be self-contained via Tailwind + the theme.
- The state widget `aura--molecules--playground--widget-playground-state-102020` MUST appear once, before the demos, with `state='playgroundDinamicState'` verbatim — the literal token `playgroundDinamicState` is replaced with the real state after your call. Never hand-write the state JSON.
- At least 6 demos, exercising props, slots, and the molecule's states.

## Output

Call the tool: `result.html` = the raw fragment; `result.examples` = the ≥6 examples, each `{ name, state: [{ stateName: "playground.<key>.<prop>", value: "<JSON-encoded value>" }] }` (empty state array for purely declarative examples). The examples drive the state substitution — every `{{playground.KEY.PROP}}` binding in the html must have a matching `state` entry here.

## Playground Definition (canonical contract)

{{playgroundSkill}}

## Theme visual signature (for the page chrome only — never restyle the molecule here)

{{themeSignature}}

## Component group usage

{{usageSkill}}
