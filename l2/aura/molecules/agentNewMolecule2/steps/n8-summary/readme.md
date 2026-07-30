# n8-summary

Cheap terminal step: the human-facing summary, in the user's language.

It reports what was created and — importantly — **what was not**. `n6-demo` and `n7-index` do not block
the pipeline: they emit their anchor with `ok:false` after a failed retry. Their result payloads are
what this step reads, so a missing playground page or a stale group index is stated plainly instead of
being silently absent.

No gate: a summary that comes back malformed is reported as such, and the artifacts are on disk either
way.
