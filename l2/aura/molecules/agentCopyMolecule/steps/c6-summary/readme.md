# c6-summary

The only judgment call of the pipeline, and a cheap one: the closing message in the user's
language (`modelType: general`).

## Input / Output

- `context.json` + what is actually on disk (`cFileExists` per artifact, so the message never
  claims a file that was not written);
- the closing message; the step completes the task.

## What the message must carry

1. **what was copied**, per molecule, and what was **ignored for already existing**;
2. **that the molecule now belongs to the project**, in one sentence — including that its text block
   arrived exactly as it is in the library. It must NOT teach i18n: since 2026-08-20 adding languages
   is another Studio agent's job, and a recipe here would compete with it;
3. **freezing** — the copy no longer receives library fixes; the `copiedFrom` line records where
   and when it came from;
4. **shadowing** — same tag, wins resolution in this project, so pages keep working; but an
   explicit import of the library module (including through the library group's `index.ts`) loads
   both and breaks with a duplicate `customElements.define`;
5. **demo pending**, only when some demo failed.

## What the message must NOT do

> **Quando o agente de idiomas existir**: ele ainda não foi construído e não tem nome (20/08), por isso
> a mensagem não aponta ninguém. Quando existir, **este arquivo e o `prompt.md` são o único lugar que
> muda**: uma frase no fim do bloco 2, nomeando o agente. Nada no pipeline depende disso — a garantia
> que o Copy dá ao agente seguinte é o bloco `collab_i18n` byte a byte, que o gate do `c3` já protege.

**It does not mention the group index page and does not suggest generating one** (control decision
3, confirmed by the user on 2026-08-19), and **it does not teach i18n** — no `message_pt` snippet, no
language named (2026-08-20). It also does not suggest running other agents by name, and never invents
a path: everything comes from the JSON the step assembles.
