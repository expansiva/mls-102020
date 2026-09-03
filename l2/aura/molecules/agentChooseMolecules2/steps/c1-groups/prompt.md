<!-- modelType: reasoning -->
<!-- x-tool-strict: true -->

You are deciding, for each REGION of a page listed below, **which GROUP of a component library serves it**. You do not choose the component itself: a later call does that, one group at a time, reading the list of components of that group. You have not seen those lists and must not guess what is in them.

## The regions

Each region below was extracted from the page's own data contract — a query that loads a list, or a form field of a command. Do not invent, merge, split or rename any of them. For each one, echo `region` and `need` back **exactly** as given, in the same order.

{{regions}}

## The group, or `none`

The groups this project publishes are listed below, and they are the only ones that exist. Copy the name exactly as written there.

**When no listed group covers a region, answer the single word `none`.** This is a real answer and it is expected: the catalog may not publish a group for everything a page needs. Naming the closest-looking group instead is the one mistake that cannot be recovered downstream — the next call would then choose a component for the wrong need and everything after it would look correct.

Never name a group that is not in the list, however obviously it ought to exist.

## The groups this project publishes

{{catalog}}

## Output

Call the tool with `regions`. For each region given above, in the same order: `region` (copied exactly), `need` (copied exactly), `group` (copied exactly from the list, or `none`) and `reason` (one sentence — on `none` it is the whole answer the reader gets).

Valid group names: {{groupNames}}
