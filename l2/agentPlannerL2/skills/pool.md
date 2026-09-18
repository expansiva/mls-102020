# pool

This planner owns `pool/l2` of the module.

- Read the oldest file in `l4/<module>/pool/l2/`. Pending is a file in the folder; there is no `status` field.
- Never read `l1/`. The l4 of the module is the only source of business meaning.
- Write `l2/<module>/web/contracts`, `l2/<module>/web/shared`, `l2/<module>/pipeline/pipeline.json`, and replies in `pool/l1`.
- Trace processed messages on the **l2** pipeline (`l2/<module>/pipeline/pipeline.json`), never on the l4 pipeline.
- Delete the `pool/l2` message only after the l1 requests are written and the trace line exists.
