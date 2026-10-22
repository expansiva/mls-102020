# masterDataManagement — experience `duplicateResolver`

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

Master data rots by duplication: "Kg" and "KG", two cost centers for the same team, a tax
code typed twice. This page exists to **find likely duplicates and resolve them, one group
at a time**, putting the candidates side by side so the person can choose which record
survives and what happens to the others. Where `compactCrudTable` is a calm reading
surface edited through a side panel, and `inlineGridEdit` is a typing bench for bulk
upkeep, this page edits nothing field by field; its question is "which of these are the
same thing, and which one stays?". Target: every duplicate group resolved deliberately,
never by accident.

## How to instantiate from the defs (the slots)

- **Groups come from the contract first**: when it declares a duplicates or similarity
  query, its groups are used as given, with any score it returns shown in its own words.
  Otherwise the page groups records of the main list whose identity field (name or code) is
  equal after ignoring case, accents, spacing and punctuation — a deterministic rule, stated
  once in a quiet caption. Never a fuzzy score the contract does not compute.
- **The group list**: one row per group — the shared identity as the group's name, the
  number of records, and the usage count per record when the contract exposes one. Largest
  or most used groups first.
- **The comparison**: an opened group shows its records side by side as columns, one per
  record, every contract field as a row; **values that differ are marked**, equal values
  stay quiet. Usage, status and creation date head each column when the data carries them.
- **Choosing the survivor** is a single choice across the columns ("Keep this one"), none
  preselected unless the contract defaults it; the most used record carries a quiet hint.
- **Resolution uses the merge command** when declared: the others merge into the survivor,
  and the confirmation says in plain words what happens ("2 records will merge into 'Kg';
  everything that uses them will use 'Kg'"). Without merge, **deactivate** the redundant
  records when declared, worded as such. With neither, the page reads groups only, and says
  so once.
- **"Not duplicates"** dismisses a group for this session; when the contract declares a way
  to record that decision, it is used, otherwise the dismissal is labeled as temporary.
- Session/context inputs never render as fields; ids are never typed — survivor and targets
  are chosen in the comparison. Never invent usage counts or merge rules.

## Attention hierarchy (the spine of this experience)

1. The open comparison — the differing values, marked.
2. The survivor choice and the resolve action.
3. The group list with counts — what is left.
4. The grouping caption and "Not duplicates" — quiet.

## Loops

- Open the top group → read the marked differences → choose the survivor → resolve →
  confirm → the group leaves the list, the count drops → the next group opens.
- A group with a record that is not a duplicate: remove that record from the group in the
  comparison (it returns to normal data), then resolve the rest.
- When no group remains, the page says so calmly — one sentence ("No likely duplicates
  found") — with the grouping rule beside it. Design this state.

## Feedback & feedforward

- The resolve button stays disabled until a survivor is chosen; its label names the
  outcome and the survivor ("Merge into 'Kg'", "Deactivate 2 others").
- The confirmation is mandatory, names every record affected and the consequence; merge is
  styled as the single danger action of the comparison.
- A failed resolution reports inside the comparison, above its button, normal body color,
  with retry; the group stays intact and nothing is half-shown as merged.
- Success: the group row leaves with a brief inline note naming the survivor. No toast.

## Disciplines (transversal — always)

- The page name appears once, in the header; the comparison's title is the group's shared
  identity, and **no heading anywhere repeats the label of a button or link near it**.
- A control is navigation OR action, never both: group rows open, the survivor choice
  selects, only the resolve button writes.
- Difference marks are a neutral highlight, never alarm color; alarm only on a failure.
- No resolution happens in bulk across groups; each group is decided on its own.

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
Everything above holds: groups of likely duplicates, marked differences, one chosen survivor, a
confirmed resolution per group. Records can no longer stand as columns side by side, so the
comparison becomes a stack of record blocks. Where this section and the layout described above
differ, this section wins on mobile.

- **The home view is the group list**: one row per group, shared identity first, then the count
  of records. Tapping opens the group as a view of its own, with back.
- **The comparison stacks the records**: one block per record, its differing fields first and
  marked, its equal fields folded into one quiet line ("4 fields equal").
- **Each block carries "Keep this one"** as a large choice at its top; the chosen block is marked
  and moves nothing.
- **The resolve button sits at the bottom where the thumb reaches**, naming the survivor; it opens
  the confirmation naming every record affected.
- **After resolving**, back to the group list at the same place, the group gone.
- **Touch**: every target is at least 44px high; nothing depends on hover.

Mobile attention hierarchy: 1. the differing fields, 2. the survivor choice, 3. the resolve
button, 4. the way back.

Forbidden on mobile:
- record columns side by side, or any horizontal scroll;
- swipe to merge or dismiss a group;
- resolving from the group list without opening the comparison;
- a survivor preselected against the contract.

## Forbidden

- A table of records with a side panel to edit one at a time — that is the
  `compactCrudTable` experience, not this one.
- Editable cells and row commits — that is `inlineGridEdit`; here no field is edited.
- Merge without a chosen survivor, without confirmation, or in bulk across groups.
- Similarity percentages, confidence scores or fuzzy matches the contract does not compute.
- Deleting duplicates when the contract offers merge or deactivate.
- Typed ids for anything the defs marks as selection/session/context.

## Signals (how to check the generated page)

1. **S1 groups:** the main list shows groups of records (each with a count), not single records.
2. **S2 comparison:** an opened group shows its records together with differing values marked.
3. **S3 survivor:** resolution requires an explicit single choice of the record that stays.
4. **S4 confirmed:** the resolve action names the survivor and opens a confirmation listing the
   affected records.

## Molecule rules

```json
{
  "axes": { "feedback": "inline" },
  "groups": { "prefer": ["groupViewTable", "groupSelectOne"], "forbid": [] }
}
```
