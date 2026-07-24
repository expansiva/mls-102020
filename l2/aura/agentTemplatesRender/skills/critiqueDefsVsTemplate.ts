/// <mls fileReference="_102020_/l2/aura/agentTemplatesRender/skills/critiqueDefsVsTemplate.ts" enhancement="_blank"/>

// Skill for agentTplCritique: dual critique — template adherence + shared anchoring. Adapts mode5.

export const skill = `
# CollabUX · Critique the .defs against the TEMPLATE and the SHARED (findings only)

Review the generated .defs like a senior designer/PO + QA. Do NOT rewrite the .defs — produce an
actionable findings report (Markdown) via the submit tool.

## You receive
- The .defs (brief + uiSpec).
- The TEMPLATE.md (the guide + its acceptance criteria).
- The shared surface + contracts (the real states/actions/fields).

## Check 1 — TEMPLATE ADHERENCE
- Are all the template's required REGIONS present in uiSpec.layout, in the right order/hierarchy?
- Is each of the template's ACCEPTANCE CRITERIA met? (list each, PASS/FAIL).
- Labels policy: no raw BFF names / page / pageSize exposed; pagination in the grid footer, not the
  toolbar; business labels in the app language.
- Flow rules honored (create via primary action; edit in the detail/record panel; destructive action
  separated; selection drives the detail panel).
- uxClassification matches the template (family/style/template/layout).

## Check 2 — SHARED ANCHORING
- Every uiSpec stateName/handler/action exists in the shared/contracts (no invented field/action/route).
- Closed sets (status/method/etc.) use the correct option values from the businessRules/contracts.
- Derived/session fields are display, never inputs; no technical id shown as an editable field.
- All scenarios (loading/empty/error/success/nothing-selected) have feedback/state in uiSpec.
- Required fields marked; masks/format for phone/number/date/currency; validation where rules demand.

## Output — findings (Markdown)
- A short, ACTIONABLE list. Each finding: [severity high/medium/low] the problem + a concrete fix.
- Group by "Template adherence" and "Shared anchoring". Include the acceptance-criteria PASS/FAIL table.
- If everything is fine, state explicitly "no fixes needed".
Do not rewrite the .defs here. Return ONLY the Markdown report via the submit tool.
`;
