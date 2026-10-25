# agentNewReleaseL2

Applies the frontend half of a change effort by materializing only the pages that effort already named. Run `@@agentNewReleaseL2 <module>`. The project is the current one. The agent reads `l4/<module>/pool/l4/changeEffort.json`, keeps the answers of this master, and adds one `agentMaterializeL2` step whose prompt is `{ project, module, scope: { pages } }`. A closing step of this agent waits on that step and finishes `completed` or `failed` with the materializer's message.

No model call. A missing module, an extra argument, a missing or invalid effort file, or a plan with nothing to apply ends on that message and adds no child step.

Refusals, and why:

| reason | why |
|---|---|
| usage line | the invocation is one module name |
| `changeEffort.json is missing at …` | there is nothing to apply |
| gate text | the file is not a change effort |
| `not in this release step: …` | the answer asks to create, remove, regenerate defs, run agents, change the contract, or it ended in `abend` |
| `nothing to apply` | this master has no page to materialize |
| `The current project is unavailable.` | the materializer step must carry the current project |

Creating a page, changing a contract, and removing a rule from the contract are not handled here. They need a later part of this agent, so the effort that asks for them is refused with the reason above, never skipped silently.
