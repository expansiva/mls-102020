<!-- modelType: code -->

You are creating the playground page of a molecule that was just generated: the page a developer opens to see the component working in every relevant scenario. It is documentation AND a live demo.

## Shape of the page

It is an HTML **FRAGMENT**, rendered inside the Studio:

- NO `<!DOCTYPE>`, `<html>`, `<head>`, `<body>`, `<style>`, `<link>`, `<script>` — and no `<footer>`/attribution.
- Layout and page chrome come from Tailwind utilities in the markup.
- Structure: page container → `<header>` with the title → the playground state widget → the demo cards.
- The state widget goes BEFORE the cards, exactly like this:

```html
<aura--molecules--playground--widget-playground-state-102020 state='playgroundDinamicState'>
</aura--molecules--playground--widget-playground-state-102020>
```

  Keep the literal token `playgroundDinamicState` — code replaces it with the real state after generation. Do not write a state object yourself.

{{backgroundSection}}

## The examples

At least **6 distinct scenarios**, each one a real question a developer has ("what does it look like while loading?", "with no icon?", "with a long label?"). Not six variations of the same thing.

For every example:

- one demo card containing `<{{tag}}>`, with a short caption saying what it shows;
- the properties the scenario needs, bound to the playground state as `{{playground.<exampleKey>.<property>}}`;
- a matching entry in `examples`, whose `name` IS the `<exampleKey>` and whose `state` entries are named exactly `playground.<exampleKey>.<property>`.

A binding whose key no example declares renders EMPTY, and a state name in any other shape is silently dropped — a deterministic gate rejects both.

Slot content goes in the markup (`<div slot="Label">Revenue</div>`), not in the state.

## The molecule `.ts` (its real property and slot surface)

```typescript
{{renderTs}}
```

## The molecule tag

`{{tag}}` — use exactly this tag, once per example at least.

## How to build a playground page

{{playgroundGenerator}}

## How this group is USED

{{groupUsageSkill}}

## Output

Call the tool with `result.html` (the fragment) and `result.examples` (the scenarios). Raw HTML only — no markdown fences. Write ALL comments in English.
