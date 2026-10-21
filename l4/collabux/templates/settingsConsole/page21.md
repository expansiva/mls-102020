# settingsConsole — experience `sectionedForm` (page21)

> UX skill sent ALONGSIDE the page `.defs.ts` at materialization time. The defs is the
> contract (queries, commands, fields — never contradict it); this skill is the flavor:
> how the page moves, focuses and feels. Where the two seem to conflict, the defs wins on
> DATA and this skill wins on BEHAVIOR.

## Concept (stage dialect — no acts, no steps)

A console for configuration that is too large for one screen: **a fixed section map on the
left, one section's form on the right**. The map is the administrator's mental model of the
module — it never moves, never filters, never collapses. The user works section by section,
saves section by section, and always knows two things without thinking: where they are, and
whether anything is unsaved. Where `searchableSettings` starts from a question typed into a
search box, this experience starts from a place on a stable map.

## How to instantiate from the defs (the slots)

- **Sections come from the contract's natural grouping**: settings that share a subject
  (one query/command pair, one configuration area) form one section. Section names are
  business words ("Faturamento", "Notificações"), never entity or query names. If the
  contract yields only one group, the map still exists — one entry, selected — so the page
  keeps its shape as the module grows.
- **The right pane is the selected section's form**: fields in the order the contract
  declares them, each with its label above and, when the contract provides one, a short
  muted description below the label — settings deserve explanation more than most forms.
- **Field type follows the value**: booleans render as switches with the state written in
  words next to them; enumerations as selects or short choice groups; free values as
  inputs. Never a bare checkbox whose meaning lives only in a distant paragraph.
- **Session/context inputs never render as fields**: which organization, which user is
  editing — these are resolved by the system and may appear only as a quiet caption in the
  page header, never editable.
- **Ids are never typed**: any setting whose value is a reference (a default location, a
  responsible user) renders as a picker over the options the contract exposes.

## Attention hierarchy (the spine of this experience)

1. The section map — always visible, current section clearly marked.
2. The selected section's title and its dirty state.
3. The section's fields, top to bottom.
4. The section's save action, at the bottom of the section it saves.

## The dirty-state loop

- Editing any field marks the SECTION as dirty: a visible, wordless mark on the map entry
  and a "unsaved changes" note near the section's save button. The user must never have to
  remember what they touched — the page remembers out loud.
- **Save is per section**: one button per section, label naming the outcome ("Salvar
  notificações"), disabled until something changed and valid. There is no global save.
- Leaving a dirty section (clicking another map entry) asks one plain question — keep
  editing or discard — never silent loss, never auto-save pretending to be intentional.
- If the contract provides a reset/default command, it sits quietly beside save, clearly
  secondary, and confirms before acting.

## Feedback & feedforward

- Validation is field-level, at the field, at commit time — a rule the value must satisfy
  is stated before the mistake when the contract declares it (feedforward), not revealed
  after.
- Save failure renders inside the section, above its save button, in normal body color,
  with retry; the map and other sections stay untouched.
- Save success is local and brief — the dirty mark clears, a quiet inline confirmation
  appears at the section — no page-level banner, no redirect.
- While saving, the section's fields lock and its button shows a running state; the map
  remains navigable.

## Disciplines (transversal — always)

- The page title appears once, in the page header; a section title never repeats it, and
  **no heading anywhere repeats the label of a button or link near it**.
- The map is navigation, the save button is action — a control is navigation OR action,
  never both; map entries never save, save never navigates.
- Link color only on what is clickable; captions, descriptions and passive state text are
  muted.

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
Everything above holds: the stable section map as the way in, save per section, the dirty-state
loop, feedback and disciplines. Only the shape changes, because the map and the section's form can
no longer sit side by side. Where this section and the layout described above differ, this section
wins on mobile.

- **The section map becomes the home view**: a list of the sections in their fixed order, each
  entry its business name, with the dirty mark on any section holding unsaved changes. It never
  reorders, filters or collapses. With a single section the map still exists, one entry.
- **"The map never moves" holds as**: the map is always one back away, and unchanged.
- **A section opens as a view of its own**, with back, inside this page: its title and dirty state
  at the top, then its fields one per line (label above, short description below, switches with
  their state in words), then the unsaved-changes note and Save at the bottom, where the thumb
  reaches. Reset/default, when declared, sits beside Save, secondary, and confirms.
- **Back from a dirty section** asks the same plain question as leaving it on desktop — keep
  editing or discard — never silent loss.
- **After Save** the view stays on the section: the dirty mark clears and the quiet inline
  confirmation appears. Save never returns to the map by itself.
- **Touch**: every target is at least 44px high, switches included; nothing depends on hover.

Mobile attention hierarchy: 1. the map (or, inside a section, its title and dirty state),
2. the section's fields, 3. its Save, 4. the way back to the map.

Forbidden on mobile:
- the map as a drawer or menu over the form, or map and form stacked on one long screen;
- all sections as one long scrolling form, or sections opening as accordions inside the map;
- a save that leaves the section, or one save for several sections;
- section tabs scrolling sideways, or any horizontal scroll.

## Forbidden

- A search box as the primary way to reach a setting — that is the `searchableSettings`
  experience, not this one; here the map is the way in.
- A single global save for all sections, or a save that commits sections the user never
  opened.
- Collapsing all sections into one endless scrolling form — one section on stage at a time.
- Map entries that reorder, hide or appear based on data; the map is stable by design.
- Typed ids for reference-valued settings; editable fields for session/context values.
- Blocking success dialogs, page-level toasts carrying validation, or navigating away
  after save.
- Wizards or step progressions between sections — sections are places, not stages.
