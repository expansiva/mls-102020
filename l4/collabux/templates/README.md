# UX templates — how to create one

This folder holds the **UX templates** (also called experiences): one markdown file per way of working
on a page of a given category. This guide is the brief for creating a new one, whether a person or an
agent writes it. Follow it end to end. The checklist at the bottom is the definition of done.

## 1. What a template is, and who reads it

- A template is a **UX skill**. When the materializer (`agentMaterializeL2`, step `pages50`) generates
  a page, it sends the page's `.defs.ts` together with the **whole text** of the template that the
  defs names in `template.category`.
- **The defs is the contract and the template is the behavior.** Queries, commands and fields come
  from the defs. How the page moves, focuses and feels comes from the template. If they seem to
  conflict, the defs wins on DATA and the template wins on BEHAVIOR.
- **The same file serves both devices.** The prompt carries `- device: desktop` or
  `- device: mobile`, and the `## On mobile` section is what changes the shape on a phone.
- **Every word costs and counts.** The template goes into the prompt as it is, so write only what
  steers the page. Its hash is part of the cache key of every page that uses it. Editing a template
  means those pages, desktop and mobile, will be regenerated.

## 2. Files in this folder

| file | role | who reads it |
|---|---|---|
| `categoryList.json` | the **category catalog**: what each category is, typical entities and operations, `minimumRequired`, and the default experience (`experiences.page11` or `page21`) | the LLM of `agentDefsL2`, to choose a page's category. **Do not register new experiences here.** |
| `<category>/<experience>.md` | one template | the materializer, through `template.category` in the defs |
| `experienceIndex.json` | user-facing details of **every** template, grouped by category (label, description, bestFor, in pt and en) | the Studio screen where the user picks another template to generate a variation of a page. Never sent to the LLM. |
| `README.md` | this guide | people and agents creating templates |

**How a template gets used:**
- `agentDefsL2` asks the LLM only for the **category**. The experience is derived in code:
  `experiences.page11 ?? experiences.page21` (`templateContext.ts`, `page11Gate.ts`).
- Any other template is used only by a **variant**: a `.defs.ts` under `web/<device>/page21|page31…/`
  whose `template.category` points at it, for example
  `_102020_/l4/collabux/templates/inventoryControl/stockCountSession.md`.
- A new template therefore changes nothing until someone picks it.

## 3. Naming

- **Path:** `<category>/<experienceName>.md`, where `<category>` is an existing `categoryId` of
  `categoryList.json` and `<experienceName>` is camelCase, descriptive and English. The name says the
  way of working (`stockCountSession`, `slotPicker`, `decisionFirst`), never the look (`blueCards`) or
  a number.
- **Legacy files** `page11.md` / `page21.md` / `page31.md` are the older templates. They keep these
  names until a separate rename. Do not create new `pageNN.md` files.
- **The experience name must be unique** within the category. Check `experienceIndex.json`.

## 4. Before writing: design the experience

1. **Read the category.** Read its entry in `categoryList.json`: description, `typicalEntities`,
   `commonOperations` and `minimumRequired` when present. The template must work for ANY contract of
   that category, and must still satisfy `minimumRequired`.
2. **Read every existing template of the category.** They are the siblings, and also the reference
   for tone, density and length.
3. **Find the axis.** A new experience must change the **way of working**: the question the page
   answers, the unit of attention, the loop. A visual variant of a sibling (cards instead of rows,
   another color) is not a new experience. Write one sentence: *"Where `x` does A and `y` does B,
   this page does C."* If you cannot write it, there is no new experience.
4. **Stay defs-driven.** Never require a field, metric, command, threshold or status the category
   does not guarantee. When the experience leans on something optional (a due date, an image, a
   measure, a "return" command), decide how it **degrades** when the contract lacks it. Never invent
   data to fill the gap. A derived number, such as a sum, a count or a rank of returned rows, is
   acceptable only if the page labels what it is.

## 5. Required structure

English only. Sections in exactly this order:

```
# <category> — experience `<experienceName>`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (<dialect>)
## How to instantiate from the defs (the slots)
## Attention hierarchy (the spine of this experience)
## Loops
## Feedback & feedforward
## Disciplines (transversal — always)
## On mobile
## Forbidden
## Signals (how to check the generated page)
```

What goes in each section:

- **Concept.** One paragraph.
  - Name the dialect in the heading. Use "stage dialect — no acts, no steps" when everything is on
    one stage, or "corridor dialect" when it moves through acts or steps. Another dialect is fine if
    it is accurate.
  - Name **every sibling** by its experience name in backticks and say what this page answers that
    they do not.
  - End with `Target: <a measurable outcome>`.
- **How to instantiate from the defs (the slots).** How each contract element becomes a part of the
  page: main query → the collection or record; commands → buttons, modes or inline actions; filters
  → the filter surface; fields → which ones lead and which are secondary. Also cover:
  - the degradation rule for every optional dependency;
  - always this line: session/context inputs never render as fields, and ids are never typed.
- **Attention hierarchy.** 3 to 5 numbered items, from what dominates down to what is quiet.
- **Loops.** The repeated cycle of work, and where the page lands after each commit.
- **Feedback & feedforward.**
  - Validation at the field, in words.
  - A failure renders where the action was, with retry.
  - Commit buttons are disabled until valid, and labeled by outcome ("Record entry", never
    "Submit").
  - Success is local.
- **Disciplines.** Carry the transversal set, then add any specific to this experience:
  - the page name appears once, and no heading repeats the label of a button or link near it;
  - a control is navigation OR action, never both;
  - link color only on real links; alarm color only on what is truly in alarm;
  - pagination and sorting params (`page`, `pageSize`, `sortBy`) never render as fields;
  - danger style is reserved for destructive actions, at most one per surface, always confirmed,
    naming the record;
  - contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is never
    visible text.
- **On mobile.** Use the skeleton in section 6, exactly.
- **Forbidden.**
  - The shapes that would turn this page into a sibling, named: "Splitting list and detail side by
    side — that is `x`".
  - The anti-patterns specific to this experience.
- **Signals.** 3 to 5 numbered, verifiable facts about the generated page
  (`**S1 <name>:** ...`), each about the **distinguishing** shape. Prefer signals that hold for any
  contract of the category. When one depends on an optional command, say so ("wherever the contract
  declares X").

Format:
- lines wrapped at about 100 characters;
- **CRLF** line endings, like every file here;
- about 90 to 150 lines. Longer usually means it is explaining instead of steering.

## 6. The `## On mobile` skeleton (frozen — copy and fill)

```
## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: <the parts that hold>. <What changes, and why, in one sentence>. Where this
section and the layout described above differ, this section wins on mobile.

- **<bold lead>**: ... (3 to 7 bullets that translate the shape of THIS experience)
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. ..., 2. ..., 3. ...

Forbidden on mobile:
- ...; (3 to 5 items)
```

Rules:
- **Side by side becomes a sequence of views**, each with back, inside the same page, never another
  page. Back returns to the same place: scroll, filters, page.
- **Tables become lists of rows.** Identity first, then one or two facts, numbers right-aligned and
  never truncated.
- **Forms take one field per line**, with the primary action at the bottom where the thumb reaches.
- **Drag is never the only way.** Moving between columns, slots or parents happens through an
  explicit control on the item.
- **No horizontal scroll**, unless ONE exception is named in the bullets AND repeated in
  `Forbidden on mobile`, such as a row of status chips.
- **Say how a desktop rule survives.** When a rule above cannot hold on a phone ("both on stage",
  "never leaves the page"), the section says how it survives, e.g. "the list is one tap away,
  exactly where it was".

## 7. Register it in `experienceIndex.json`

Add one entry under the category, in the category's array:

```json
{
  "experience": "<experienceName>",
  "file": "<category>/<experienceName>.md",
  "label":       { "pt": "2 a 4 palavras", "en": "2 to 4 words" },
  "description": { "pt": "1–2 frases simples: como a página é e como se trabalha nela.", "en": "..." },
  "bestFor":     { "pt": "a situação ou pessoa para quem serve", "en": "..." }
}
```

Write for the **user**, who builds ERP pages and is not a UX expert:
- no camelCase ids and no jargon ("master-detail", "split view");
- the texts of one category must make the differences between its experiences obvious, because the
  user is choosing between them;
- the label must be unique within the category;
- **pt-BR is the main language.**

## 8. Prove that it steers

A template is not done until it has changed a real page.

1. In a test module (e.g. `mls-102047`), copy an existing page's defs of this category into a variant
   folder, `web/desktop/page21/<page>.defs.ts` and `web/mobile/page21/<page>.defs.ts`. Set
   `template.category` to `_102020_/l4/collabux/templates/<category>/<experienceName>.md` and
   `template.experience` to the name.
2. Materialize the variant for both devices.
3. Check every **Signal** in the generated page, on desktop and on mobile.
4. If a signal fails, fix the template's wording (usually Slots or Forbidden), not the generated page.

## 9. Checklist (definition of done)

- [ ] `<category>/<experienceName>.md`: the category exists and the name is camelCase, descriptive,
      unique in the category.
- [ ] The title is `# <category> — experience \`<experienceName>\``, followed by the blockquote
      verbatim.
- [ ] All nine sections are present, in order.
- [ ] Concept names every sibling in backticks, states the axis and ends with `Target:`.
- [ ] Nothing is invented beyond the category's guarantees, and every optional dependency has its
      degradation written down.
- [ ] `minimumRequired` of the category is still satisfied.
- [ ] Exactly one `## On mobile`: the frozen skeleton with the device line, **Touch**,
      `Mobile attention hierarchy`, `Forbidden on mobile`, and any horizontal-scroll exception named
      twice.
- [ ] Forbidden names the siblings' shapes.
- [ ] 3 to 5 Signals about the distinguishing shape.
- [ ] English, lines of about 100 characters or fewer, CRLF.
- [ ] The entry in `experienceIndex.json` has label, description and bestFor in pt and en, and the
      label is unique in the category.
- [ ] `categoryList.json` is untouched, unless the category's DEFAULT experience is deliberately
      changing. That changes what `agentDefsL2` picks for every new page of the category, so it is a
      decision of its own.
- [ ] Proven on a variant page (section 8), desktop and mobile.
