# input20

Deterministic input snapshot phase. It reads the canonical L4 and the current planner menu, needs,
backend and effort artifacts; validates their versions, identities, references, routes, totals and
page sets; then persists the immutable `input.json` plus a structured `inputReport.json`.

`effort.screens[].status` is the only selection authority. Each live page receives four exact
destinations and three materialization items. Removal requires both `menu.meta.removed` and a prior
owned inventory; this phase never deletes generated files. Source hashes make restarts reproducible,
while `NO_COMMON_RELEASE_IDENTITY` records the planners' current lack of one shared release id.

Semantic review findings are structural joins, never keyword guesses. They include source, page and
route when an `own` grant anchors outside its entity set, or when a page reads one identity as
`own` while exposing create/update routes for another entity read at organization scope.
