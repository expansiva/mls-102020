# aiAssistedAuthoring — experience `conversationalRefine`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (commands, inputs, artifacts — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

Authoring as **a conversation about the artifact, with the artifact always in view**: on one
side a thread where the person says what they want changed ("shorter", "lead with the
delays", "more formal"), on the other the live preview of the current version, updated after
every turn. Each turn produces a new version; the thread is the history of how the artifact
got here, and any earlier version can be brought back. The person never edits the text
directly — they direct. Publishing comes after a deliberate review of the current version.
Where `generateReviewShare` generates once from a configuration and reviews, and
`draftCanvas` has the human writing with AI suggestions at the side, this answers "how do I
get this draft to say what I mean, by telling the AI?". Target: every change is one sentence
away, and the preview never lies about the current version.

## How to instantiate from the defs (the slots)

- **The message box comes from the contract's instruction input** — the free-text prompt of
  the generate or refine command. Each sent message runs that command with the current
  version as its base when the contract accepts one. When the contract declares no free-text
  input, the box is replaced by quick-choice chips built from the command's declared options
  (tone, length, audience), one chip per value; never a free box the contract cannot carry.
- **The first turn is the brief**: the generate command's other inputs as a compact row
  above the thread (pickers, ids never typed); session/context inputs never render as fields.
- **The preview renders ONLY what the latest command returned**, at reading width, with a
  quiet version line ("Version 4 · after: lead with the delays").
- **The thread lists the turns**: the person's request in their words, then one short line
  for the result ("Version 4 ready") — never fabricated AI chatter or explanations the
  contract does not return. Notes the contract returns per version appear under that line.
- **Each result line has "Show this version"**; viewing an older version marks the preview
  "Viewing version 2" with "Use this version" and "Back to latest".
- **Publish comes from the publish/share command**: one button beside the preview, publishing
  the version shown, its confirmation naming the version and what goes where.

## Attention hierarchy (the spine of this experience)

1. The preview — the current version, the largest region.
2. The message box — always ready for the next instruction.
3. The thread — the history of turns, quieter.
4. Publish, beside the preview, contextual.

## Loops

- Brief → first version → read the preview → write one instruction → new version → read →
  repeat. Each turn is seconds; nothing navigates.
- Look back: show an older version → compare by reading → use it (it becomes the new latest,
  as a turn in the thread) or return to latest.
- Satisfied → review the preview once more → publish → the published version is marked in
  the thread; further turns start a next version.

## Feedback & feedforward

- While a turn runs, the preview keeps the previous version visibly marked "Updating…" and
  the box locks; the running state is honest, never streamed fake text.
- A failed turn reports in the thread at that turn, with retry; the preview stays on the last
  good version and the message is kept in the box.
- A failed publish reports beside its button, with retry.
- Success is local: the thread marks the published version. No banners, no redirect.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label of a
  button or link near it**.
- A control is navigation OR action, never both: send sends, "Show this version" shows,
  publish publishes.
- Link color only on real links; thread lines and version lines are muted.
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
Everything above holds: the conversation directs, every turn makes a version, the preview shows
only the current version, earlier versions can return, publish after review, feedback and
disciplines. Preview and thread can no longer sit side by side, so they become two views of the
same page. Where this section and the layout described above differ, this section wins on mobile.

- **The preview is the home view**, full width, its version line at the top.
- **The message box is fixed at the bottom of the preview view** and rides above the keyboard;
  sending keeps the preview in view and updates it in place.
- **The thread is a view of its own**, reached from "History (4)" in the version line, with back
  to the preview at the same scroll position.
- **Showing an older version from the thread** returns to the preview marked with that version,
  with "Use this version" and "Back to latest" full width under the version line.
- **Publish sits at the foot of the preview**, after its full text.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the preview, 2. the message box, 3. the version line with history.

Forbidden on mobile:
- preview and thread squeezed side by side, or anything that scrolls sideways;
- the thread as the home view, hiding the artifact behind a chat;
- a drawer or sheet covering the preview while typing;
- a publish control fixed on screen before the text was scrolled past.

## Forbidden

- A configure → generate → review corridor with one generation — that is `generateReviewShare`.
- An editable canvas where the human types the artifact — that is `draftCanvas`; here the
  person directs and the preview is read-only.
- Fabricated assistant replies, reasoning or chatter the contract does not return.
- A preview that shows anything but the version the contract last returned (or the one chosen).
- Losing earlier versions, or publishing a version the person is not looking at.
- Typed ids for anything the defs marks as selection/session/context; redirects after publish.

## Signals (how to check the generated page)

1. **S1 Preview beside the thread:** the artifact preview and the request history are both part
   of the page (side by side on desktop, two views on mobile).
2. **S2 Turn makes a version:** each sent request adds a turn to the thread and a new version
   line on the preview.
3. **S3 Read-only preview:** the artifact text is not directly editable; changes come only from
   turns.
4. **S4 Versions return:** an earlier version can be shown and made current from the thread.
5. **S5 Publish the shown version:** the publish confirmation names the version being published.

## Molecule rules

```json
{
  "axes": {
    "recordsView": "list",
    "feedback": "inline"
  },
  "groups": {
    "prefer": ["groupEnterText", "groupTriggerAction"],
    "forbid": []
  }
}
```
