/// <mls fileReference="_102020_/l2/agentChangeFrontend/skills/genCfeContractTs.ts" enhancement="_blank"/>

export const skill = `
# agentChangeFrontend Contract TS Skill

Generate the TypeScript contract file for one Stage 2 frontend page.

This skill is only for the new agentChangeFrontend format:
- Input Definition is an array of BFF command descriptors.
- Each command has commandName, optional bffName/routeKey/origin metadata, purpose, kind, input[], output[] and outputShape.
- Each field has name, type, required, enum and description when available.
- The contract is frontend-facing BFF shape only. It must not depend on backend metadata such as entity/table refs, usecase refs, layer contracts, rulesApplied or source field provenance. bffName/routeKey/origin are .defs.ts maintenance metadata; do not emit them into the .ts types.

## Output

Generate one complete TypeScript file and submit it as code.
The file must start with the exact MLS header required by the system prompt.
Do not include markdown.
Do not generate runtime code.
Do not import anything.

## Naming

Derive moduleName and pageName from the target outputPath:
- outputPath pattern: _{project}_/l2/{moduleName}/web/contracts/{pageName}.ts
- Prefix is moduleName converted to PascalCase by uppercasing the first character.
- CommandPascal is commandName converted to PascalCase by uppercasing the first character.
- Input interface: {Prefix}{CommandPascal}Input
- Output interface/type: {Prefix}{CommandPascal}Output
- Query item interface: {Prefix}{CommandPascal}OutputItem

Use only commandName values from Definition.

## Type mapping

Map field arrays mechanically:
- field.name becomes the TypeScript property name.
- Input fields are optional unless field.required === true.
- Output fields are required unless field.required === false.
- If field.enum is a non-empty string array, the type is a string literal union using those values.
- Do not widen enum fields to string.

Primitive mapping:
- string, uuid, guid, email, url, uri, date, datetime, dateTime, date-time, time, timestamp, timestamptz -> string
- number, integer, int, int32, int64, float, double, decimal, money, currency -> number
- boolean -> boolean
- json, object, any -> unknown
- unknown input -> unknown

## Command output shape

**If command.canonicalOutputShape is present, it is AUTHORITATIVE — use it and IGNORE the heuristics
below.** It is the canonical wire shape declared by l4 and copied verbatim by the backend; the Output
type MUST match it EXACTLY (same field names, same required-ness, same array/object nesting) so the
frontend and backend contracts agree by construction. canonicalOutputShape is { kind, fields[] };
each field is { name, type, required, fieldRef?, item? }:
- kind "object" -> generate Output as an interface with exactly these fields.
- kind "list" -> generate Output as {Prefix}{CommandPascal}OutputItem[] where OutputItem has the
  declared fields.
- kind "paginated" -> generate Output as an interface with exactly the declared fields (the array field
  keeps its DECLARED name — e.g. stockItems: ...[], NOT "items" — do not rename it).
- For any field with type "array", its element type is a named interface built from item.fields
  (name it after the field, e.g. orders -> {Prefix}Order / DashboardOrder); for type "object",
  a named nested interface from item.fields. Scalar types map directly (string/number/boolean).
- Fields with no fieldRef are computed/aggregate values — still emit them with their declared type.
- Preserve field order; property required unless required === false; do NOT add, drop or rename fields.

Otherwise (legacy, no canonicalOutputShape) use command.outputShape as the source of truth. Defaults:
- query without outputShape -> "array"
- command without outputShape -> "object"

For command.kind === "query":
- Generate an OutputItem interface with fields from command.output[].
- If outputShape is "array", generate Output as an array type alias of OutputItem.
- If outputShape is "paginated", generate Output as an interface with:
  - items: OutputItem[]
  - total: number
  - page?: number
  - pageSize?: number
- If outputShape is "object", generate Output as a type alias of OutputItem.

For command.kind !== "query":
- Generate Output as a plain interface with fields from command.output[].

Always generate an Input interface, even if it is empty.

## Quality bar

- Preserve command order.
- Preserve field order.
- Use 2-space indentation.
- End every property line with semicolon.
- Separate top-level declarations with one blank line.
- Do not emit comments for descriptions or source metadata.
- Do not invent fields, helper types, commands, imports or values.
`;
