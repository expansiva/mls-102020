# fieldDataCapture — experience `photoFirstReport`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (two-part dialect — evidence, then details)

Occurrences in the field: a leak, a damaged pallet, a safety issue. The worker sees it and
must **capture the evidence before it changes or before they walk away** — so the page opens
on the camera, not on a form. The report has two parts: **evidence first** (one or more
photos, shown large as they are taken), **details after** (what kind, where, how serious, a
note), filled with the photos still in view as the reference. Where `rapidEntryWorkbench`
keeps every capture form on a bench, fields first, and `guidedCaptureFlow` asks one input
per beat starting from the target, here the question is **"what did I see?"** — the picture
leads and the classification follows it. Target: from noticing the problem to a sent report
with a photo in under a minute, one hand, without typing more than a short note.

## How to instantiate from the defs (the slots)

- **The evidence part comes from the command's file/image input**: a large "Take photo"
  control (camera on devices that have one, file pick otherwise), and the photos taken as
  large thumbnails, each with remove. Several photos only when the input accepts several;
  the contract's limits (count, size) are stated before they are hit.
- **The details part is the command's other inputs**, in this order: the occurrence type or
  category as large choices when it is a short declared list, the target or location as a
  picker, severity as large choices when declared, then the free-text note, then any
  remaining fields. Required ones visibly required.
- **When the contract has several commands**, only those with a file/image input open on the
  camera; the others are offered as quiet actions below and open as plain forms, so the
  contract's minimum is always reachable.
- **Degrade**: when no command has a file/image input, the page never shows a photo slot.
  The evidence part becomes the description — a large free-text field ("What did you see?")
  as the first and focused input — and the details follow it the same way. With no free-text
  input either, the page opens on the details with the occurrence type first.
- **Time and place** come from the contract only: session/context values (who, site, time)
  render as a quiet caption, never as fields; no location is invented from the device.
- Ids are never typed — the target is picked, the photo is attached.

## Attention hierarchy (the spine of this experience)

1. The evidence — the camera control, then the photos taken, largest on screen.
2. The occurrence type — the first decision about the evidence.
3. The rest of the details and the send action.
4. Context caption and other commands — quiet.

## Loops

- Open → take photo → (another) → details: type, place, severity, note → send → a brief
  confirmation naming the report → the page is back on the camera control, empty, for the
  next occurrence.
- Correcting: remove a photo or retake it from its thumbnail; editing a detail never drops
  the photos. Leaving with photos or values asks once before discarding them.

## Feedback & feedforward

- The camera control says what it will do ("Take photo"); while a photo uploads, its
  thumbnail shows progress, and the send action waits for it.
- A photo that fails (too large, wrong type) says so on its thumbnail in words, with retake;
  the other photos stay.
- The send action stays disabled until the required evidence and details are present; its
  label names the outcome ("Send report").
- A failed command reports above the send action with retry; photos and values are kept.
- No toasts, no blocking dialogs; the success line names what was reported.

## Disciplines (transversal — always)

- The page name appears once, in the header; the two parts carry plain titles, and **no
  heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: the camera control captures, thumbnails
  open a larger view, choices select, send commits.
- Link color only on real links; captions muted.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
  Removing a photo before sending is an edit, not a danger action.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: evidence first, details after, the photos in view while classifying, the
reset to the camera. A phone is the natural device here, so the camera control owns the first
screen. Where this section and the layout described above differ, this section wins on mobile.

- **The first screen is the camera control**, large, full width, and the photos taken as a grid
  of two columns under it.
- **The details follow below in one column**, one field per line; type and severity as large
  stacked choices, never dropdowns when the list is short.
- **The photos stay in view as a compact row of thumbnails** at the top of the details while
  scrolling; this row is the only thing that may scroll sideways.
- **Send is fixed at the bottom** where the thumb reaches, riding above the on-screen keyboard.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the camera control and the photos, 2. the occurrence type, 3. send.

Forbidden on mobile:
- a form above the camera control, pushing it below the first screen;
- horizontal scroll of anything but the row of thumbnails;
- send hidden behind the on-screen keyboard;
- the details as separate pages that drop the photos on back.

## Forbidden

- Every capture form on a bench, fields first — that is the `rapidEntryWorkbench` experience,
  not this one.
- One input per beat in a corridor that opens on the target — that is the `guidedCaptureFlow`
  experience, not this one.
- Classification or target fields before the evidence.
- A photo slot, camera control or "attach" button when the contract has no file/image input.
- Invented location, timestamp or severity fields not in the contract.
- Typed ids for anything the defs marks as selection/session/context.

## Signals (how to check the generated page)

1. **S1 Evidence first:** the first input on the capture screen is the evidence — the photo
   control when declared, otherwise the free-text description.
2. **S2 Details after:** type, target and other detail fields come after the evidence, never
   before it.
3. **S3 Evidence in view:** while the details are filled, the evidence (photos or description)
   stays visible on the same screen.
4. **S4 Reset to evidence:** after a successful send, the page returns empty to the evidence
   input.
