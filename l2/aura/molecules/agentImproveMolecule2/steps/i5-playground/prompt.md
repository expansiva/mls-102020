<!-- modelType: code -->
<!-- x-tool-strict: true -->

The molecule's public surface just changed, and its playground page no longer demonstrates it. You are bringing the page up to date.

Return **targeted edits**, the same way the molecule itself was edited: quote the exact text to replace and give the replacement. The page has examples someone wrote and a developer relies on — you are adding to it, not replacing it.

## What actually moved

{{regenerate}}

{{surfaceDiff}}

Cover **every added slot** with at least one example that really uses it — `<Detail>…</Detail>` inside the molecule instance — a NAMED TAG, never `slot="Detail"`: this project has no Shadow DOM, the molecule reads slots by tag name, and the attribute form renders empty. The `<Detail>…</Detail>` element form. A slot the page does not exercise is a slot nobody can see working, which is the exact defect this step exists to prevent.

Remove or repoint any binding to a property the molecule no longer has: it renders empty.

## The rules of the page

- It is an HTML **fragment**: no `<!DOCTYPE>`, `<html>`, `<head>`, `<body>`, `<style>`, `<link>`, `<script>`.
- The playground state widget stays where it is. Every `{{playground.*}}` binding on the page depends on it.
- A binding is written `{{playground.<exampleKey>.<property>}}`, and the `<exampleKey>` must be one the page already declares — a key nothing declares renders empty.
- Slot content goes in the markup, never in the state.
- Add examples for what changed. Do not restyle, renumber or reorder the examples that are already there.

## The rules of an edit

- **Copy `find` from the text below** — the words, the punctuation, the line breaks. **Indentation does not have to match.** Some files in this library have collapsed indentation (every nested line at a single space, whatever its depth), and whitespace runs are matched flexibly, so do not try to reproduce odd spacing and do not let it stop you.
- **`find` must occur exactly once.** If the text you want appears twice, extend it upwards or downwards until it is unique. An ambiguous `find` is rejected, never applied to the first hit.
- Never quote or rewrite the `/// <mls …>` header.
- Order matters: a later edit sees the result of the earlier ones.

## The molecule

**Tag**: `{{tag}}` · **Group**: `{{groupCanonical}}`

### Its public surface now

{{surface}}

### The playground page today

{{page}}

## Output

Call the tool with `edits`. Each carries `op`, `find` (on `replace`), `content` and a one-line `why` **in {{userLanguage}}**.
