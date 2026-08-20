# c6-summary

The only judgment call of the pipeline, and a cheap one: the closing message in the user's
language (`modelType: general`).

## Input / Output

- `context.json` + what is actually on disk (`cFileExists` per artifact, so the message never
  claims a file that was not written);
- the closing message; the step completes the task.

## What the message must carry

1. **what was copied**, per molecule, and what was **ignored for already existing**;
2. **where the translation goes** — the `collab_i18n` block of the copied `.ts`, with the concrete
   recipe (duplicate `message_en` as `message_pt`, translate the values, add `pt` to the record).
   This is THE reason the agent exists, so it is not a footnote;
3. **freezing** — the copy no longer receives library fixes; the `copiedFrom` line records where
   and when it came from;
4. **shadowing** — same tag, wins resolution in this project, so pages keep working; but an
   explicit import of the library module (including through the library group's `index.ts`) loads
   both and breaks with a duplicate `customElements.define`;
5. **demo pending**, only when some demo failed.

## What the message must NOT do

**It does not mention the group index page and does not suggest generating one** (control decision
3, confirmed by the user on 2026-08-19). It also does not suggest running other agents, and never
invents a path: everything comes from the JSON the step assembles.
