# aiAssistedAuthoring — experience `optionsGallery`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (commands, inputs, artifacts — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

Authoring by **choosing among alternatives**: the AI produces several candidate drafts laid
out side by side as comparable cards; the person reads them against each other, picks one,
refines the chosen one, and publishes. Judging between options is easier than judging one
draft in a vacuum — differences in tone, length or emphasis become visible only by
comparison. Built for artifacts where taste matters more than facts: a summary's framing, a
proposal's opening, a message to a client. Where `generateReviewShare` produces ONE draft
and walks it to publication and `draftCanvas` has the human write with suggestions at the
side, this answers "which of these is closest to what I want?". Target: the decision is a
comparison, made once, then the page narrows to the winner.

## How to instantiate from the defs (the slots)

- **The brief comes from the generate command's inputs**: a compact row above the gallery,
  pickers for selections, ids never typed; session/context inputs never render as fields, at
  most a quiet caption. One button names the outcome ("Generate options").
- **The gallery holds the candidates the contract returns**: when generation returns several
  drafts, each becomes one card; when it returns one per run, the gallery fills run by run —
  each "Another option" adds a card and never replaces one. Cards are equal in size and show
  the draft's opening at the same length, so they compare fairly.
- **Each card offers exactly two moves**: "Choose this" and "Remove". A card opens to its
  full text in place for reading, without choosing it.
- **Facts the contract returns per candidate** (a tone, a length, a note) appear as one
  muted line on the card; nothing returned means nothing shown — never invented scores,
  rankings or a "recommended" badge.
- **Choosing narrows the page**: the chosen draft takes center stage; the other cards fold
  into one quiet line ("3 other options") that reopens the gallery. Refining uses the
  contract's refine/regenerate command with the chosen draft as its base when declared;
  otherwise the draft is edited directly when the contract accepts edited content.
- **Publish comes from the publish/share command**: one contextual button, present only once a
  draft is chosen, its confirmation stating in plain words what goes where.

## Attention hierarchy (the spine of this experience)

1. The gallery — candidates side by side, equal weight.
2. The chosen draft, once there is one, center stage.
3. Refinement on the chosen draft.
4. Publish, contextual and last.

## Loops

- Brief → generate → read the cards against each other → remove the weak ones → ask for
  another if none fits → choose.
- Chosen → refine → read → publish. Reopening the gallery keeps the remaining cards and the
  chosen one marked; choosing another replaces the chosen draft after one plain confirm when
  refinements would be lost.
- Changing the brief generates a new set; the old cards stay until the person removes them.

## Feedback & feedforward

- While generating, each pending card shows an honest running state — never fake text.
- A failed generation reports in its own card slot, with retry; other cards stay.
- A failed refine or publish reports beside its control, with retry; the chosen draft stays.
- Success is local: the published state replaces the publish button in place. No banners.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label of a
  button or link near it**; cards are titled by their content, never "Option 1".
- A control is navigation OR action, never both: "Choose this" chooses, Remove removes,
  publish publishes — nothing navigates.
- Link color only on real links; card notes and captions are muted.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not decisions:
  they NEVER render as form fields.
- Danger style is reserved for genuinely destructive actions: at most one per surface, never a
  default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is never
  rendered as visible text, heading or label — if a region has no business name, it has no
  heading.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: several candidates compared, one chosen, refine then publish, honest
running states, feedback and disciplines. Cards can no longer sit side by side, so they stack and
the comparison becomes a scroll through equal cards. Where this section and the layout described
above differ, this section wins on mobile.

- **The brief folds after generating** into one line of its real values with "change".
- **Candidates stack as full-width cards** of equal height, each showing the same length of
  opening text and its two moves; a count above says how many there are ("4 options").
- **Opening a card shows its full text as a view of its own**, with back to the gallery at the
  same card, and "Choose this" at the bottom where the thumb reaches.
- **After choosing**, the chosen draft takes the full width; "3 other options" sits above it.
- **Publish sits at the foot of the chosen draft**, after its full text.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the candidate cards, 2. the chosen draft, 3. publish.

Forbidden on mobile:
- candidates in a sideways carousel or anything that scrolls horizontally;
- cards of different lengths that make the comparison unfair;
- a publish control visible before a draft is chosen;
- the full brief form left open above the gallery after generating.

## Forbidden

- A single generated draft walked through review to publish — that is `generateReviewShare`.
- An editable canvas the human writes with suggestion cards beside it — that is `draftCanvas`.
- Invented scores, rankings, "best" badges or differences the contract does not return.
- New options silently replacing existing cards, or auto-choosing a candidate.
- Publishing before a draft is chosen, or auto-publish on generation.
- Typed ids for anything the defs marks as selection/session/context; redirects after publish.

## Signals (how to check the generated page)

1. **S1 Several candidates:** after generating, more than one candidate draft can be on screen at
   once as equal cards (directly, or via "Another option" adding cards).
2. **S2 Explicit choice:** each card has a "Choose this" control; nothing is chosen automatically.
3. **S3 Narrowing:** after choosing, the chosen draft leads and the others fold into one line
   that reopens them.
4. **S4 Publish after choice:** the publish control exists only once a draft is chosen.
