# i2-triage

One LLM call (`reasoning`). Runs on every route, because it is what chooses the route.

## Input

- `context.json` from i1-locate
- the user's prose, carried in `context.userPrompt`

What the model actually sees: the tag, the group, which artifacts exist, the inheritance block, the
**derived public surface** (slots, properties with their real attribute names, events) and the full
`.defs.ts`. It does **not** see the molecule's source — `ml-data-table` is 300+ lines and its
surface is 20, and the other 280 cannot answer the routing question.

## Output

- `l4/agentImproveMolecule2/<runKey>/triage.json`
- result step `i2-done` carrying `{ route, rationale, expectedArtifacts, definitionElements, ... }`
  — the root reads this to plant the branch, so it never has to open the artifact.

## The decision

**Would a page that uses this molecule today have to be WRITTEN DIFFERENTLY?** Yes → A. No → B. The
public surface is exactly slots, attributes and events.

⚠️ The question used to have a second half — *"or observe something different"* — and it was dropped on
2026-08-13, because it cannot discriminate: fixing any defect changes what you observe, and that is what
fixing is. It had cost a run (CHANGELOG). Two readings are explicitly NOT route A: a repaired defect,
and a **corrected description** — a contract sentence that described the defect as if it were intended,
which is the normal case, since NM2 writes the contract and the component in the same run.

Size is not the criterion either, and the prompt says so twice: adding one slot is three lines and is a
rebuild; rewriting a whole render to fix a layout bug is an edit.

| route | when |
|---|---|
| A | the definition changes — rebuild through `agentNewMolecule2` |
| B | appearance, a code defect, wording — edit in place |
| C | shell **and** the behaviour to change lives in the parent |
| D | not a request to change this molecule; the rationale is the whole answer |

## Invariants

**The gate never second-guesses the judgement.** It cannot tell whether A or B was right — that is
what the prompt is for. It refuses only the mechanically impossible: route C on a molecule that is
not a shell, route A naming nothing that changes, an artifact list that contradicts the route.

**Route C is not "this is a shell".** Most shells are fixed entirely in their own `.less`. The
measured half of the condition is enforced; the other half is judgement.

**Never propose changing the parent.** Not a route, not an outcome. If the model concludes the base
should be fixed, the route is still C and the user decides in i4.

**`html` pulls in `groupIndex` automatically** (`flow.json.conventions.playgroundThenIndex`), as a
normalization and not a gate failure — spending a retry to make the model re-say something
derivable is exactly the cost `agentsBestPractices` §3 warns about. It runs *after* the gate, so
the artifact records what will be done without overwriting what the model said.

## Failure modes

Retry 1 with the gate errors in the prompt; a 2nd failure fails the step.

| code | means |
|---|---|
| `route_invalid` | not A/B/C/D — reported alone, every other message would be misleading |
| `route_c_not_shell` | route C on a molecule with no parent in another project |
| `route_a_no_elements` | route A naming nothing; the message offers route B |
| `definition_elements_off_route` | elements named on B or C — the likeliest real mis-route |
| `artifacts_empty` / `artifacts_off_route` | the artifact list contradicts the route |
| `artifact_unknown` / `artifact_absent` | not an artifact, or one nothing can create |
| `rationale_missing` | on route D this is the only answer the user gets |

## Tests

`gate.test.ts` (16) and `surface.test.ts` (6), both pure. Two of the gate tests pin a shape the gate
must keep **accepting** — route B with `defs` + `ts` and no definition elements — so the 13/08 confusion
is not "fixed" later by refusing it. The surface tests exist because the
default attribute of a Lit property is the name **lowercased**, not kebab-cased — reporting
`my-value` for `myValue` would have the model reason about markup that does nothing.
