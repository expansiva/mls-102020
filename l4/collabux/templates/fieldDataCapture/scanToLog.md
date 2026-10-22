# fieldDataCapture — experience `scanToLog`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

The item is in front of the worker and has a label on it: a meter, an asset tag, a bin, a
work order sheet. The page is **one code field, always ready**, and reading a code (scanner,
camera, or typing the printed code) **opens the entry form for that item**, target already
filled and its name shown large, so the worker only enters the values and goes to the next
label. Where `rapidEntryWorkbench` puts every capture card on one bench and the worker picks
the target inside each form, and `guidedCaptureFlow` walks one capture beat by beat starting
from a tile picker, here the question is **"what is this item, and what do I log on it?"** —
the code IS the first answer, and it never has to be chosen from a list. Target: walk a route
of thirty labeled items, scan and log each in a few seconds, without picking anything by
hand.

## How to instantiate from the defs (the slots)

- **The code field comes from the target input of the capture command(s)**: the selection
  input whose lookup can be searched (meter, asset, location, order). The field searches that
  lookup by the code the person reads; it is NOT a command input and the code is never sent
  as an id — the match resolves the id.
- **Reading a code**: a hardware scanner types into the always-focused field; a camera
  control beside it scans when the device has one; typing the printed code works the same.
  Exactly one match opens the entry; several matches show a short pick list (name and code);
  none says so at the field and keeps the field ready.
- **The entry for the item** is the capture command's remaining inputs, the target filled:
  the item's name and code as the form's title, the facts the lookup returns (last reading,
  unit, location) as a quiet caption when present, then the value fields, then optional
  notes. When several commands accept the same kind of target, the entry opens with one
  large choice per command ("Log reading", "Report issue") above the form — verb-first.
- **Commands with no searchable target** stay out of the scan path: each is one quiet
  action under the code field, opening its own plain form, so the contract's
  minimum is always reachable.
- **Degrade**: when no command has a searchable target, the code field becomes a
  type-to-find picker over the target lookup, still the page's first control.
- Session/context values (who, site, shift) never render as fields — a quiet caption at
  most; ids are never typed — codes are business labels, matches carry the id.

## Attention hierarchy (the spine of this experience)

1. The code field — focused whenever no entry is open.
2. The item's name and code on the open entry — the guard against logging on the wrong item.
3. The value fields and the commit.
4. The last logged item and the other commands — quiet frame.

## Loops

- Scan → the entry opens with the item named → enter the value → commit → a brief "logged"
  line naming the item and value → the entry closes and the code field is focused again →
  the next label.
- Wrong item: one control closes the entry without committing and returns to the code
  field; nothing is saved. Scanning a new code while an entry is open with values asks once
  before discarding them.

## Feedback & feedforward

- The code field states what it accepts ("Scan or type the code on the label"); the camera
  control appears only when the device can scan.
- "No item matches this code" at the field, in words, field ready to retry — never a dialog.
- Required values visibly required; the commit stays disabled until valid and names the
  outcome and item ("Log reading on Pump 3").
- A failed command reports inside the entry, above the commit, values kept, retry.
- Success is the "logged" line under the code field, showing the last item and value — one
  line, replaced by the next; no toast, no banner.

## Disciplines (transversal — always)

- The page name appears once, in the header; the entry's title is the item's name, and **no
  heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: the code field finds, pick rows select,
  the commit commits, the close control only closes.
- Link color only on real links; captions muted.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: the code field as the only door, the entry opening for the scanned item,
the return to the field after each log. On a phone the camera is the scanner, so the scan control
is the largest thing on the home view. Where this section and the layout described above differ,
this section wins on mobile.

- **The home view is the code field and a large scan control** at the top, the last "logged" line
  under them; the other commands quietly below.
- **The entry is a view of its own** inside this page, the item's name and code on top, then one
  field per line; numeric values raise the numeric keypad.
- **The commit is fixed at the bottom** where the thumb reaches, riding above the on-screen
  keyboard; close sits at the top.
- **After a commit** the home view returns with the scan control ready; the camera reopens only on
  a tap, never by itself.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the scan control and code field, 2. the item's name on the entry,
3. the commit.

Forbidden on mobile:
- a list of items to pick from as the home view;
- the commit hidden behind the on-screen keyboard;
- the entry in a sheet over part of the home view;
- anything that scrolls sideways.

## Forbidden

- Every capture card on one bench with the target picked inside each form — that is the
  `rapidEntryWorkbench` experience, not this one.
- A beat-by-beat corridor opening on a tile picker of targets — that is the
  `guidedCaptureFlow` experience, not this one.
- A browsable list of items as the way in; the code is the way in.
- Sending the scanned code as an id, or asking the person to type an id.
- Logging without the item's name visible on the entry.
- Toasts or dialogs for "not found"; redirects after a commit.

## Signals (how to check the generated page)

1. **S1 Code first:** with no entry open, the first and focused control is a code field (scan or
   type).
2. **S2 Item opens entry:** a matching code opens a capture form with the target already filled
   and the item's name shown; the form has no target picker to fill.
3. **S3 Back to the field:** after a successful commit the form closes and the code field is
   ready again.
4. **S4 No browsing:** no list of items is shown before a code is read (only a short pick list
   for several matches).
