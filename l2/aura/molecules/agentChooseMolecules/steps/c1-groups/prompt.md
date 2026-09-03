<!-- modelType: reasoning -->
<!-- x-tool-strict: true -->

You are reading the definition of a page or system and deciding, for each part of it, **which GROUP of a component library serves that part**. You do not write the page, and you do not choose the component: a later call does that, one group at a time, reading the list of components of that group. You have not seen those lists and must not guess what is in them.

## First: break the definition into REGIONS

A region is **one interaction that a single component could serve** — a field the user fills, a list they pick from, a table they read, a file they attach, a chart they look at.

- `the CPF field`, `the country selector`, `the orders table`, `the attachment` are regions.
- `the header`, `the sidebar`, `the form` are **not** regions: they are layout. A form is as many regions as it has fields.
- Two regions may end up on the same group, and even on the same component. That is normal — name both.
- Cover the whole definition. A part you cannot serve is still a region: it is a region with group `none`.

## Then: the group, or `none`

The groups this project publishes are listed below, and **they are the only ones that exist**. Copy the name exactly as written there.

**When no listed group covers a region, answer the single word `none`.** This is a real answer and it is expected: the list below is deliberately partial, so a page asking for something outside it must come back as `none` with a reason. Naming the closest-looking group instead is the one mistake that cannot be recovered downstream — the next call would then choose a component for the wrong need and everything after it would look correct.

Never name a group that is not in the list, however obviously it ought to exist.

## The `need` line matters more than it looks

The next call sees **only** the region name and its `need` line — never this definition. So the need line has to carry whatever decides the choice inside a group:

- how many options, and whether the user types to filter;
- whether a value outside the list is allowed;
- whether the options are compared by several attributes at once;
- whether it is a single value, several values, a range, or a hierarchy;
- anything the user's own words insist on (a flag beside the name, +/- buttons, a mask).

Write it in one line, in {{userLanguage}}, using the user's vocabulary. Do not add requirements the definition does not state.

## The groups this project publishes

{{catalog}}

## Output

Call the tool with `regions`. For each: `region` (a short unique name, in {{userLanguage}}), `need` (the line above), `group` (copied exactly from the list, or `none`) and `reason` (one sentence, in {{userLanguage}} — on `none` it is the whole answer the reader gets).

Valid group names: {{groupNames}}
