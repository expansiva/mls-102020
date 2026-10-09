# pages50 — desktop and mobile page per accepted page

**Input:**
- the shared40 receipt (the page waits until the shared is reusable) and its declaration `web/shared/<pageId>Dts.txt`;
- the page11 of the device, the Row types of the contract and the journeys;
- the L4 slice of the page;
- the collabux template, the design tokens, the molecule usage contracts and the scene host contract.

**Output per page and device:**
- `web/<device>/page11/<pageId>.ts`;
- the receipt `pipeline/agentMaterializeL2/pages50/<pageId><Device>.json`, with the design answer and the design observations.

**LLM:** one call per page and device, with the tool `submitPageTs { design, source }` and the system prompt `prompt.md` (model type design). Repairs are focused and use `promptRepair.md`.

**Gate:** it refuses only what breaks the app, even while the design gate is off:
- hand-made view switching;
- an unguarded scene host;
- `any`;
- a broken header, class or import contract.

Design observations are recorded and never refuse. The Studio compile runs after the gate.
