/// <mls fileReference="_102020_/l2/agentChangeFrontend/skills/genCfeContractTs.ts" enhancement="_blank"/>

export const skill = `
# agentChangeFrontend Contract TS Skill

Generate the TypeScript contract file for one Stage 2 frontend page.

This skill is only for the new agentChangeFrontend format:
- Input Definition is an array of BFF command descriptors.
- Each command has commandName, purpose, kind, input[], output[], readsEntities, writesEntities, usecaseRefs and rulesApplied.
- Each field has name, type, required, enum, description, sourceEntity, sourceField, sourceType and lifecycleStates when available.

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

For command.kind === "query":
- Generate an OutputItem interface with fields from command.output[].
- Generate Output as an array type alias of OutputItem.

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

