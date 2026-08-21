# c3-report

**No LLM call.** Deterministic aggregation and rendering; the arithmetic lives in the pure `report.ts`.

## Input

Everything the run wrote to `l4/agentChooseMolecules/<runKey>/`: `input.json`, `c1-groups.json`, one
`c2-<groupfolder>.json` per group, and the per-attempt `prompt-*.json` / `trace-*.json`. The file set a
run can have written is known, so the files are enumerated from the plan ids and the attempt budget
rather than by listing the folder.

## Output

- `report.json` — **the file the battery is scored from**: the joined table (one row per region, with the
  group, the molecule, the scenario and both reasons), the totals, the gate history, the prompt sizes and
  the real cost of each call;
- the readable summary, in the step trace.

## Why it spends no call

Two reasons, both in `flow.json`: a fourth LLM call would pollute the token measurement the run exists
to take, and a summary is exactly where a metric nobody measured gets invented.

The labels of the summary are fixed in Portuguese — the audience is the team running the battery, and
the control it is scored against is in Portuguese. The parts the model wrote (the reasons) stay in the
language the user wrote in.

## Invariants

**It always runs.** With no group chosen there is no c2 step, and the report — two regions, no group,
the reasons — IS the result being measured (battery case #10).

**Nothing is dropped silently.** A group whose step died without writing its artifact is reported as
unanswered; `agentsBestPractices` calls silent truncation reading as coverage.

**Two token numbers, never one.** The estimate sizes what the agent assembles (the catalog block is the
part the design is about); `usage` is what the provider counted, read from each attempt's trace. The
report also carries the ratio, because the platform adds ~6× on its own and only the real number is what a
consumer pays. A step whose trace carried no provider line is listed as **not measured**, never as zero.

**`inventedTagsInArtifacts` is zero by construction** — the gate is what makes it zero. The number worth
reading beside it is `attemptsRefused`: a gate that fired is a model that tried.

## Tests

`report.test.ts` (7, pure): the join, the difference between "no group" and "the group had nothing", the
notes, the size totals, and the rendered summary.
