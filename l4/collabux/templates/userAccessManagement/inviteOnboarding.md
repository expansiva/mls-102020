# userAccessManagement — experience `inviteOnboarding`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

A **guest list being written**: the admin brings several people in at once — one line per
person, each with the role they will hold already chosen — sends the batch, and then watches
the pending invites until they are accepted. The question is "who is joining, as what, and
have they arrived yet?". Where `memberDirectory` administers people already inside, one at a
time, and `roleMatrix` designs what each role grants, this page is the front door: it only
adds people and follows them in. Target: a team onboarded in one sitting, nobody invited
without a role, and every pending invite visible until it resolves.

## How to instantiate from the defs (the slots)

- **The composer is the invite command's inputs, repeated as lines**: one line per person
  with the declared identifier (email) and the declared role picker; other declared inputs
  (team, a message) appear once for the batch when the command treats them as shared,
  otherwise per line. Never a field the command does not declare.
- **The role is chosen per line**, from the contract's declared roles; a default role for new
  lines may be set once at the top, and each line can change it. No line is sendable without
  a role when the command requires one.
- **Pasting several addresses** into the identifier of an empty line splits them into one
  line each, all with the current default role.
- **Sending** calls the invite command once per line (or once with the list, when the command
  takes a list). The send button counts lines: "Send 6 invites".
- **The pending list is the users query narrowed to the invited status** the contract
  declares: identifier, role, invited since. Resend and revoke invite appear on a pending row
  only when declared. Without an invited status in the contract, the pending list shows only
  this session's sent lines, labeled as such.
- **Session/context inputs never render as fields**: the inviter is known. Ids are never typed
  — people are written as addresses, roles are picked.

## Attention hierarchy (the spine of this experience)

1. The composer lines — who, and as what.
2. The send control with its count.
3. The pending invites — who has not arrived yet.
4. The default role and shared inputs, demoted.

## Loops

- Compose loop: type or paste an address → the line takes the default role → adjust the role
  if needed → Enter adds a new empty line with focus in it → repeat → send.
- After sending, each line reports its own outcome in place: sent lines move into the pending
  list (newest on top), failed lines stay in the composer with their reason and keep their
  values. The composer is left with only what still needs fixing.
- Follow-up loop: the pending list shows age; resend (when declared) on one invite, revoke
  (when declared) with a confirm naming the address. An accepted invite leaves the list on
  the next refresh.

## Feedback & feedforward

- Each line validates its address and role at the field, in words; duplicates within the
  batch, and addresses the contract reports as already members, are marked on the line.
- The send button stays disabled while any line is invalid and says why ("1 line needs a
  role"); empty trailing lines are ignored, not errors.
- While sending, lines lock one by one with a running state; partial failure never hides the
  successes.
- Revoking a pending invite confirms once, naming the address; danger style lives there only.
- An empty pending list says once, quietly, that nobody is waiting to join.

## Disciplines (transversal — always)

- The page name appears once, in the header, and **no heading anywhere repeats the label of
  a button or link near it** (the pending section is not titled "Invite").
- A control is navigation OR action, never both: lines are edited, send acts, pending rows
  carry their own declared actions only.
- One line anatomy for the whole composer; one row anatomy for the pending list.
- Link color only on real links; roles and ages are muted.
- Pagination and sorting parameters (`page`, `pageSize`, `sortBy`) are wiring, not
  decisions: they NEVER render as form fields — the pending list loads more by itself.
- Danger style is reserved for genuinely destructive actions: at most one per surface,
  never a default per-row button, and always behind a confirmation that names the record.
- Contract-internal vocabulary (displayHint values, intent ids, state keys, bff names) is
  never rendered as visible text, heading or label — if a region has no business name, it
  has no heading.

## On mobile

Same experience, translated to a narrow fluid column (about 390px, still usable at 360px and 430px).
This section applies only when the page's device is `mobile`; on desktop, ignore it.
Everything above holds: many people at once, a role on every line, per-line outcomes, the pending
list as follow-up, and the disciplines. A line can no longer hold address and role side by side,
so each person becomes a small stacked block. Where this section and the layout described above
differ, this section wins on mobile.

- **Composer first**: the default role picker on top, then one block per person — address on one
  line, role picker under it, a quiet remove control at the block's edge.
- **Add person** is a full-width control under the last block; pasting several addresses still
  splits into blocks.
- **Send sits at the bottom**, where the thumb reaches, with its count and its reason when
  disabled.
- **Pending invites** follow below the composer as a list of rows: address, then role and age
  small under it; resend and revoke open from the row as plain controls, never by swipe only.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the composer blocks, 2. the send control, 3. the pending invites.

Forbidden on mobile:
- address and role squeezed side by side, or any horizontal scroll;
- one invite per screen, forcing a send for each person;
- swipe as the only way to resend or revoke;
- clearing failed blocks after a send.

## Forbidden

- A directory of all members with a person panel — that is `memberDirectory`; this page
  holds only people being invited and pending.
- A role × permission matrix or role editing — that is `roleMatrix`.
- A one-person invite form that must be submitted again for each person.
- Lines without a role when the command requires one; typed role names.
- Clearing the composer after a partial failure, or reporting outcomes only as a toast.
- Inventing invite statuses, resend or revoke commands the contract does not declare.

## Signals (how to check the generated page)

1. **S1 many lines:** the composer holds several person lines at once, with a control to add
   another.
2. **S2 role per line:** each line has its own role picker next to the address.
3. **S3 counted send:** one send control whose label carries the number of invites.
4. **S4 per-line outcome:** after sending, results appear on each line, and failed lines keep
   their values.
