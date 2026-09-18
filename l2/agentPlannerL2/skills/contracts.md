# Contracts

One TypeScript contract file per workspace. The file is `.defs.ts` (types and route constants only).

Reuse the naming and type-mapping rules of the frontend contract skill:

- CommandPascal is callName with the first character uppercased.
- Input interface: `{CommandPascal}Input`
- Output interface: `{CommandPascal}Output`
- Query list item interface: `{CommandPascal}OutputItem`
- Do not prefix type names with the module.
- field.name (last segment of the ontology path) becomes the TypeScript property name.
- Input fields are optional unless the ontology field is required.
- Output fields are required unless the ontology field is required === false.
- A non-empty ontology enum becomes a string literal union. Do not widen it to string.
- Primitive mapping: string/uuid/guid/email/url/uri/date/datetime/time/timestamp → string; number/integer/float/decimal/money → number; boolean → boolean; json/object → unknown. Never emit `any`.
- Always generate an Input interface, even if it is empty.
- Preserve call order and field order. 2-space indent. Semicolon after every property. One blank line between top-level declarations.
- Do not import. Do not emit runtime code. Do not invent fields.

This planner adds:

- One file `web/contracts/{workspaceId}.defs.ts` holding every call of that workspace.
- Route constant: `export const {callName}Route = '{module}.{workspace}.{callName}' as const`.
- `locate` → query shape `list` (paginated: declared collection `{entity}Items` + `total` / `page` / `pageSize`; `page` / `pageSize` optional on Input). Never name the array `items`.
- `inspect` → query shape `get`, or `ddm` when the workspace is a hub (derived fields belong on Output).
- `act` → command shape `create` / `update` / `transition` from the step `effect`.
- `decide` → one command per branching transition of the same origin.
- Fields are ontology paths from the catalog. `derived: true` never enters command Input except the identity `{Entity}.id`.
