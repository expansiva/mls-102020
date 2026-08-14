# i7-summary

One cheap call (`general`). The last step of routes B and C. Writes no file of the molecule.

## What it is for

The **coherence report**, and that is the argument for this whole agent. The two gates of
`helpers/imCoherence` run over the molecule as it stands now:

1. does the `.defs.ts` agree with the code and with the group contract;
2. is every declared slot actually read.

Both **report only** — and by the time this step runs there is nothing left to block. An improve
run is simply when these are cheapest to fix, and the user decides.

Findings the run **caused** are separated from findings it merely **noticed**: `context.json` holds
the pre-edit sources, and passing both versions to `buildCoherenceReport` is what makes the
distinction possible.

## Facts in, language out

The model is given the artifacts every step left behind — which files changed, which slots were
added, what the human chose at the route C checkpoint. It is **never asked to recall the
pipeline**: a model asked what happened invents the parts it did not see. Its only job is the
user's language.

## The route C checkpoint has THREE outcomes

`less`, `override` and `parent` — and `parent` is the one that writes nothing, on purpose. There the
**instruction is the deliverable**: the summary must name the file in the base project, because that
is the entire answer the user receives. `ImRunFacts.parentReference` carries it.

⚠️ Until 2026-08-14 this was an `if/else`, so `parent` rendered as "by overriding `` locally" — the
opposite of what happened, with an empty member, and no instruction (CHANGELOG). It shipped from the
first version because T4 was accepted on "the run wrote zero files", which was true and insufficient.

## The one check

`flow.json` said this step had no gate. It has exactly one, and it earns its place: **every finding
must survive into the summary**. A model asked to write "a short summary" of ten problems writes
about three, and a dropped finding is a defect nobody hears about — which is precisely how the
thirteen behind this agent were found, by accident, weeks later.

## When the summary itself fails

Twice-failed, the step still completes. **The run worked**: the files are written and correct, and
failing the task over its summary would tell the user the change did not happen, which is false.
The findings are emitted verbatim in English instead, with the reason stated.

## Output

- `l4/agentImproveMolecule2/<runKey>/summary.json`
- the closing message on the step, in the user's language

## Tests

`gather.test.ts` (10), pure. The two that carry the design are "THE ONE CHECK: a summary that drops
findings is caught" and "THE THIRD OUTCOME: `parent` names the file to open, and is never described as
an override".
