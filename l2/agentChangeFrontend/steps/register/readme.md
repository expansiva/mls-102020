<!-- mls fileReference="_102020_/l2/agentChangeFrontend/steps/register/readme.md" enhancement="_blank" -->

# register

## Role

`agentCfeRegisterFrontend` writes page preview HTML files, registers generated pages and signs `l5/project.json` with the frontend master signature.

## Input

- Materialized page files.
- Generated page metadata and frontend create markers.

## Output

- `l2/{module}/web/desktop/page11/{page}.html`.
- `l2/{module}/trace/frontend-register-pages/{page}.json`.
- Updated `l5/project.json`.

## Invariants

- `config.json` is not written in this register step; it is merged in the final frontend step and publish only validates it.
- Registration happens after materialization barriers complete.
