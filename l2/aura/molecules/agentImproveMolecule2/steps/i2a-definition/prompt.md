<!-- modelType: reasoning -->

The triage decided this request changes the molecule's **public definition** — route A. Your job is to say **exactly which elements of the surface move**, and nothing else.

A human confirms your proposal in a checkpoint, line by line, and can drop any line before it runs. So each line has to stand on its own.

## The surface is three things, and only three

**Slots**, **properties** and **events**. That is everything a consumer writes, and therefore everything a definition change can move. Anything that is not one of these three is not a definition change — internal helpers, wording, appearance, timings, the way something is implemented.

Three operations, and they are not equal:

- **add** — a slot, property or event that does not exist yet. Every page already written keeps working, because it simply did not use the new thing;
- **remove** — it exists and stops existing. **This breaks pages already written against it**;
- **rename** — it exists under one name and starts answering to another. **This also breaks them**, and it is the one most often proposed when `add` was meant.

Prefer `add`. Propose `remove` or `rename` only when the request actually says the old thing must go: "rename Label to Caption" is a rename; "I want a caption too" is an add.

## The hard boundary: the GROUP contract

The surface of every molecule in a group is declared by the **group contract**, and that file is edited
**by hand**, outside this agent. So a name the group does not declare **cannot be added here by any
route** — not by you, not by the human at the checkpoint. The gate refuses it.

That leaves two legitimate shapes for a proposal:

- **a name the group already declares** and this molecule does not implement — use its exact spelling,
  the contract is case-sensitive;
- **blocked**, and this is a first-class answer, not a failure: if what the user wants needs a name the
  group does not have, return `"blocked": true` with **no changes** and a `reason` that says which name
  is missing and that the group contract is edited by hand. The run then ends with your reason as the
  answer the user reads. Do NOT invent a change to fill the list — and in particular do not propose
  REMOVING something so that the list is non-empty.

⚠️ Measured 2026-08-17: asked to "define the label by attribute" on a metric molecule, this step was
ready to add a public property `label` that `groupViewMetric` declares nowhere — the group defines the
label as the **slot** `Label`. The route that exists to change one molecule's promise was the one route
that could widen a whole group by accident.

## What you must not do

- **Do not propose something the molecule already declares.** Its current surface is printed below. If the element is already there and does not work, that is a **defect**, and a defect is not a definition change — it is a route B edit, and saying so is a valid answer here.
- **Do not invent elements the request does not ask for.** A request for a footer area is one slot, not a footer slot plus a footer event plus an alignment property. The human will drop what they did not ask for, and every line you add that they drop is a line that made the checkpoint harder to read.
- **Do not describe HOW it will be implemented.** No method names, no render details. A later step reads the code and writes the change.
- **Do not restate the whole contract.** The `.defs.ts` sentence is written afterwards, from your `purpose` line.

## The molecule

**Tag**: `{{tag}}`

### Its public surface today, as the code declares it

{{surface}}

### The request

{{userPrompt}}

### What the triage concluded

{{triage}}

The triage named these elements: {{definitionElements}}

Treat that list as a starting point, not as an instruction — it was written before anyone looked at the surface printed above. If one of those elements already exists, say so by leaving it out.

## Output

Return JSON only. Do not call tools. Do not explain. The exact payload:

```json
{
  "type": "clarification",
  "json": {
    "planId": "i2a-definition",
    "title": "<short title in {{userLanguage}}>",
    "reason": "<one or two sentences in {{userLanguage}}: why the definition has to move at all. The human weighs this>",
    "blocked": false,
    "changes": [
      {
        "kind": "slot | property | event",
        "op": "add | remove | rename",
        "name": "<the name; on a rename, the NEW name>",
        "previousName": "<ONLY on a rename: the name it has today; omit otherwise>",
        "purpose": "<one line in {{userLanguage}}: what it is for. The human reads it, and the contract sentence is written from it>"
      }
    ]
  }
}
```
