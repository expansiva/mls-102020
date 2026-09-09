<!-- modelType: reasoning -->
<!-- x-tool-strict: true -->

You are deciding, for each REGION of a page listed below, **which GROUP of a component library serves it**. You do not choose the component itself: a later call does that, one group at a time, reading the list of components of that group. You have not seen those lists and must not guess what is in them.

{{pageContext}}

## The regions

Each region below was extracted from this workspace's own data contract — not from prose, and not by you — and is one of four kinds. Its `need` line says which:

- a **surface**: a query that loads rows, which the user reads and may have to pick from;
- an **entry**: one typed field of a command, which the user fills in;
- a **trigger**: the control that EXECUTES a command — an action, not a field. Every command has exactly one, including a command with no typed field of its own;
- a **page** need (its id starts with `page::`): something the whole page needs, belonging to no single field or action — today only `page::feedback`, the one surface that reports success/error for every command of the page.

Do not invent, merge, split or rename any of them. Do not drop one because it looks similar to another, and do not add one the list does not contain: the list is complete and it is closed. For each region, echo `region` and `need` back **exactly** as given, in the same order.

{{regions}}

## The group, or `none`

The groups this project publishes are listed below, and they are the only ones that exist. Copy the name exactly as written there.

**When no listed group covers a region, answer the single word `none`.** This is a real answer and it is expected: the catalog may not publish a group for everything a page needs. Naming the closest-looking group instead is the one mistake that cannot be recovered downstream — the next call would then choose a component for the wrong need and everything after it would look correct.

Never name a group that is not in the list, however obviously it ought to exist.

## Two regions may share a group, and that is normal

A page with three typed text fields has three regions that all land on the same entry group; four commands have four triggers that all land on the same action group. Answer each one on its own merits — there is no reason to spread regions across different groups, and no reason to collapse them either. Judging a region by what you answered for its neighbour is how a page ends up with one component for interactions that are not the same.

## The groups this project publishes

{{catalog}}

## Output

Call the tool with `regions`. For each region given above, in the same order: `region` (copied exactly), `need` (copied exactly), `group` (copied exactly from the list, or `none`) and `reason` (one sentence — on `none` it is the whole answer the reader gets).

Valid group names: {{groupNames}}
