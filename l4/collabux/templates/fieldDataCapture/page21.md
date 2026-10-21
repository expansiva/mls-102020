# fieldDataCapture — experience `rapidEntryWorkbench` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (commands, fields, bindings — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect)

A workbench for a worker who logs the same kinds of entries many times per shift, often on
a phone, under time pressure. **Everything is on stage at once**: one capture card per
command, side by side on wide screens, stacked on narrow — plus a session strip proving
what was already logged. There is no navigation and no wizard: the page is a bench, not a
corridor. Target: a complete entry in under 60 seconds, then the bench is instantly ready
for the next one.

## How to instantiate from the defs (the slots)

- **One capture card per command.** The card title is the command's business name — short,
  verb-first. If there is only one command, the single card takes center stage at a
  comfortable reading width; never stretch a lone form to full width.
- **Fields inside a card, in this order:** target pickers first (inputs whose value is a
  selection — a task, a project), then the measure/value fields (numbers, quantities,
  dates), then optional free text (notes) last and visually quiet.
- **Inputs resolved by the system never render as inputs:** session-derived values (who is
  logging) and context-derived ids stay out of the form — show them, if useful, as a quiet
  caption on the card ("Logging as Maria · Site A"), never as an editable field.
- **Required fields are visibly required before any mistake is made** (feedforward), not
  discovered on submit.

## The capture loop (the heart of this experience)

1. The worker taps into the first field — on mobile, numeric fields raise the numeric
   keypad; touch targets are one step larger than desktop default.
2. The card's single primary button stays disabled until required fields are filled; its
   label names the outcome ("Log hours", not "Submit").
3. On success: a brief inline confirmation ON the card (not a blocking dialog), the form
   resets to empty, focus returns to the card's first field, and the new entry slides into
   the top of the **session strip**.
4. The loop repeats. Zero navigation between entries.

## The session strip

A compact list of this session's entries (most recent first, capped to the last handful)
below or beside the cards: what, how much, moments ago. It exists for confidence and for
catching mistakes — each row offers one quiet **Undo** for a short window when the contract
provides a way to revert; otherwise rows are read-only evidence. The strip is NOT a data
table: no columns header, no pagination, no sorting.

## Feedback & feedforward

- Validation is field-level, at the field, at commit time — never a toast.
- Command failure renders inside the card, above its button, in normal body color, with
  retry; the other cards stay untouched.
- Success is quick and local (inline check + strip insertion). No page-level banners.
- While a command runs, its button shows a running state; the card's fields lock; the
  OTHER cards remain usable.

## Disciplines (transversal — always)

- The page name appears once, in the page header. Cards never repeat the page title, and a
  card never repeats its own button label as a heading.
- A control is navigation OR action, never both; nothing on this page navigates.
- Link color only on real links; the strip and captions use muted text, not blue.

- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — paging belongs to the collection surface
  itself, and the user never chooses the page size.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: every card on the bench, the field order, the capture loop, the session
strip, feedback and disciplines. This bench was drawn for a phone already; this section only fixes
where things sit in one column. Where this section and the layout described above differ, this
section wins on mobile.

- **Cards stack in one column**, full width, in the contract's order; fields inside a card stack
  too, labels above inputs. No card is collapsed or hidden behind another to save space.
- **Keyboards match the field**: numbers raise the numeric keypad, dates the native date picker;
  the keyboard's next key moves field to field, and leaving the last field brings the card's
  button into view, full width at the card's foot.
- **After a success**, the card stays where it is on screen and its first field is focused again;
  the inline confirmation names what was logged, so the worker never has to scroll to check.
- **The session strip sits after the last card**: with one card it is right under it; rows stay
  one line each (what, how much, when), wrapping rather than cutting the amount, Undo at the end
  of the row.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the card in use, 2. its primary button, 3. the inline
confirmation, 4. the session strip.

Forbidden on mobile:
- cards side by side, or swiped through as a carousel; anything that scrolls sideways;
- the session strip placed above the cards, pushing the first card down;
- a card's button hidden behind the on-screen keyboard with no way to reach it;
- amounts truncated in the card or in the strip.

## Forbidden

- Wizard, steps, tabs or accordion to reach a capture form — all forms are on the bench.
- A shared submit for multiple cards, or one card's action affecting another card.
- Typed ids for anything the defs marks as selection/session/context.
- Blocking success dialogs, page-level toasts carrying validation, redirects after submit.
- Desktop-dense inputs on the narrow shape — touch targets never shrink below comfortable.
- Empty session strip inventing placeholder rows; when empty it says, once and quietly,
  what will appear there.
