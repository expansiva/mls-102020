/// <mls fileReference="_102020_/l2/agentDefsL2/skills/genD2SharedDefinition.ts" enhancement="_blank"/>

export const skill = `# D2 shared definition — declarative behavior only

Describe the device-independent intent and behavior of exactly one page as a
sharedDefinitionV1 document. This is a semantic definition, not TypeScript, a
component class, a pipeline item, or an expanded DTO catalog. Do not emit code,
class names, property/setter/method names, source hashes, output-field maps, or
execution metadata.

The contract is authoritative. Every operation, parameter, output type, enum,
required flag, origin, and writable field must resolve to a real symbol in the
page contract. Never invent fields or broaden an operation's bindings. Required
and enum values come from the contract and its operation binding. Preserve
literal values including zero and false.

Declare each semantic state once with a stable id and purpose. Use contract
references for input/output types and parameter paths. Record input origin as
userInput, selectedEntity, routeParam, or session. A selected value must link to
an existing query result and its real identity field. A write-version token is
a hidden, non-editable snapshot captured on selection from that selected result;
when it is missing, block the command and preserve the user's edits. Never
create a second read, a default token, or an automatic retry.

Declare each contract operation once as an action. Bind parameters to state
references and connect result, status, and error states. Preserve initial-load
intent, successful refreshes, confirmation meaning, every actor's authority
references, and operation transition payloads. Authority references explain
the server-owned policy; they do not grant permission in the browser.

Declare shared content once by id and intent. Scenarios refer to those content
ids and to existing actions; preconditions refer only to declared state
contracts. Content outside the active scenario remains mounted but hidden,
inert, and outside the focus order. Keep base scenario behavior and never make
a destructive operation a scenario.

All references must resolve exactly once. Reject unknown contract symbols,
denied fields, missing bindings, missing required selection preconditions, or
removed write-version snapshots. Keep source digests and freshness evidence in
the internal receipt; they never belong in the public definition.
`;
