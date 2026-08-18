# E3 — access matrix

E3 turns approved journeys into a human-approved access contract without implementing users, JWTs or
authentication. Those runtime concerns remain in collab-auth.

The LLM emits a `clarification` payload containing access profiles, `domain:code` authorities,
profile-authority grants, data scopes and disclosure boundaries. The gate validates the proposal
against the approved E2 draft. Before approval only
`l4/{module}/pipeline/e3-access-matrix.draft.json` is written.

The widget is read-only except for the adjustment prompt. A change request adds the next open E3
agent step first, records the request second and completes the current clarification last. The new LLM
round receives the complete previous draft and must return a complete replacement plus
`changeSummary`. This loop has no artificial round limit and ends only on approval.

Approval writes `l4/{module}/access/access-matrix.defs.ts`, freezes the contract under `accessHash`
and advances the pipeline to `e4-ontology`.

Key invariants:

- authorities follow the lowercase collab-auth `domain:code` convention;
- every `now` journey step is protected by at least one authority;
- all E2 actor refs are represented by an access profile;
- external profiles cannot receive organization-wide scope;
- limited disclosure enumerates allowed information;
- read-only information needs may introduce safe future projections without granting a full business
  record;
- later phases may compile the approved contract but may not silently broaden it.

The live prompt/gate path can be exercised against an E2-approved module without changing its
pipeline:

```text
tsx --import ./test/register-hooks.mjs --import ./test/setup-l2.ts \
  mls-102020/l2/agentNewSolution/steps/e3/nodejsLiveE3.ts \
  <project> <module> [--write]
```

Without `--write` it performs no filesystem mutation. With `--write` it stores only diagnostic live
review/response files under the module pipeline; it never approves E3.
