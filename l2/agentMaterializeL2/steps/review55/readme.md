# review55 — a second LLM reviews each generated page (only with `--review`)

**Off by default** (Guilherme, 05/10/2026). It is planned only when the run has `--review`, and it is **report only**: it rewrites nothing, refuses nothing and never fails the run because of a finding.

**Input per page and device:** the page file pages50 approved, the design answer its author gave (from the pages50 receipt), the page11 of the device, the collabux template (with `## On mobile` and `Forbidden`), the L4 slice and the shared declaration.

**LLM:** the tool `submitPageReview { summary, findings }`, system prompt `prompt.md`, model type `code` (not the `design` type that generated the page). Each finding has:
- a `severity`: `blocker`, `major` or `minor`;
- an `area`, a `message` and a `fix`;
- a `where` in the page;
- a quoted `basis` from the template, the page intent or the L4. A preference with no basis is not a finding.

**Output:** `pipeline/agentMaterializeL2/review55/<pageId><Device>.json`. The step trace prints one line per finding, worst first. `review55-done` carries the counts per severity.

**Reuse:** a review is kept while its context (page file, design answer, defs, template, L4, prompt) is unchanged. An unusable answer is recorded as `failed`: it lets the step finish and is reviewed again on the next run. `--force` reviews again the units in scope.

**Later:** blocker and major findings may drive one repair round of pages50, once the reports are trusted.
