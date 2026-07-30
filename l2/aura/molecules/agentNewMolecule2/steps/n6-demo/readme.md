# n6-demo

Writes the molecule's playground page: the page a developer opens to see the component working in
every relevant scenario. **Not a shell** — it is the demonstration.

## Deterministic parts

- The literal `playgroundDinamicState` token in the state widget is replaced by the state assembled
  from the model's `examples` (port of `agentNewMoleculePlayground.generatePlaygroundState`). The model
  never writes a state object.
- In a themed project the page container must carry `themeInfo.background.css` **verbatim** — a
  translucent style over white shows nothing.

## Gate (`gate.ts`) — 12 codes, 14 tests

It runs on the model's html **before** the substitution; that is the only moment the placeholder check
means anything.

| code | when |
|---|---|
| `empty` / `fence` | nothing came back, or markdown fences |
| `document` | `<!DOCTYPE>`/`<html>`/`<head>`/`<body>`/`<style>`/`<link>` — the demo is a FRAGMENT |
| `script` / `footer` | a `<script>`, or an attribution `<footer>` |
| `state_widget` / `state_placeholder` | the playground state widget, carrying the literal token |
| `examples_count` | fewer than 6 distinct examples |
| `tag_uses` | the tag appears fewer times than the number of declared examples (floor 6) |
| `state_shape` | a state name that is not `playground.<key>.<property>` — the substitution drops it silently |
| `state_binding` | a `{{playground.<key>.…}}` binding no example declares — it renders empty |
| `background` | themed project whose page container lacks the theme background |

## Calibrated over the 146 real playground pages of mls-102040

| fact | measured | consequence |
|---|---|---|
| carry the playground state widget | 146 / 146 | required |
| contain a document tag or `<script>` | 0 / 146 | both bans hold |
| contain a `<footer>` | 1 / 146 | the ban holds (it is the outlier the Variant's P2 lesson names) |
| tag uses | median 12, min 6, none below 6 | "at least one instance per declared example, floor 6" matches the library |

Two notes the tests pin down:

1. **`<header>` must not trip the document check.** Every real page opens with one; a naive `/<head/`
   regex would reject all 146. The check uses `<head[\s>]`.
2. **The appearance rules of `n4-render`/`n5-less` do NOT apply here.** This is a page, not a
   component: the library's own pages use `bg-white dark:bg-slate-900` and coloured headings.

## Failure does not block the pipeline

After a failed retry the step still emits `n6-done` with `ok:false`, so `n7-index` and `n8-summary`
run and the summary reports the gap. A molecule that compiles and has a stylesheet is delivered work.
