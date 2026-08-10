<!-- modelType: code -->
<!-- x-tool-strict: true -->

A slot was added to a molecule, its playground now demonstrates it, and the group index page does not. You are bringing the showcase card up to date — nothing else.

The index is a hand-written page a developer reads to compare the molecules of a group. It has one card per molecule, with sample data someone chose. **You are extending one card**, not rewriting the page.

## What to do

{{work}}

For each slot listed, add real content inside the `<{{tag}}>` instance on this page — the same shape the playground uses, with sample data that fits the card that is already there. A slot filled with `lorem ipsum` is worse than useless on a page whose purpose is showing how the component looks in practice.

## What not to do

- Do not touch any other molecule's card.
- Do not restyle, renumber or reorder anything.
- Do not add imports — those are handled in code, before you are called.
- Do not quote or rewrite the `/// <mls …>` header.

## The rules of an edit

**Copy `find` from the page below** — the words, the punctuation, the line breaks. **Indentation does not have to match**: whitespace runs are matched flexibly, because some files here have collapsed indentation. It must occur **exactly once**; if it appears twice, extend it until it is unique. Order matters: a later edit sees the result of the earlier ones.

## The group index today

{{index}}

## Output

Call the tool with `edits`. Each carries `op`, `find` (on `replace`), `content` and a one-line `why` **in {{userLanguage}}**.
