# Changelog

## 2026-10-04 — d2_73 BFF per page (experiment branch)

- New `bff55`: one LLM call per page designs the endpoints (types, input, output with origins, rules, JSDoc); code checks facts only (B.1–B.4).
- `shared60` writes the shared v2 over the approved endpoints; requests, rules and access are copied from them; the gate checks facts only (D).
- `contracts70` renders the contract of the approved BFF with the JSDoc of A above each route.
- Removed the derivation by organism and entity (`helpers/d2PageRequests.ts`) and its tests.

## 2026-09-30 — page11 v2 foundation

- Recreated `agentDefsL2` with a public page11 renderer/parser and an internal needs draft.
- Added deterministic category experience selection and pure gates for menu, sections, actions, ontology/grants, templates, molecules and prompt size.
- Removed the previous generation flow. Preserved the frozen contracts30 compatibility chain for L1.
- Promoted input snapshot code and hashing to `l2/helpers/`; M2 now uses the shared hash helper.
