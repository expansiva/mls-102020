# Changelog

## 2026-10-04 — d2_77 (experiment branch)

- The approved BFF design is reread as written (hash of the receipt), never parsed again; a missing, unreadable or
  changed file names its cause.
- The prompt of A states the coverage the page owes, with derived fields marked.
- Offline replay of r4: the whole stage runs over recorded answers in the suite.

## 2026-10-04 — d2_76 (experiment branch)

- Format the code can fix is normalized before any check (case of names and ids, identical duplicates, references, the
  reserved type name); what the strict schema guarantees is `D2_BFF_ASSERT` (no repair cycle).
- A refused page does not stop the others in bff55, shared60 or contracts70; finalize80 compiles what was generated and
  fails the pipeline once, listing `pageId: stage: code`.

## 2026-10-04 — d2_74/d2_75 BFF per page, r3 (experiment branch)

- d2_74: the tool schemas say what the parsers require; a query write the host filled in is dropped, not refused.
- d2_75: A also designs the page bindings; field leaves take the ontology name and type; the shared is derived by code
  (the LLM call of shared60 is gone); contract meta comes from the origins.

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
