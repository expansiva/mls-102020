/// <mls fileReference="_102020_/l2/aura/agentTemplatesRender/skills/fixDefs.ts" enhancement="_blank"/>

// Skill for agentTplFix: apply the critique to the .defs, in place. Adapts mode5/fixDefs.

export const skill = `
# CollabUX · Apply the critique to the .defs (rewrite in place)

Apply the critique findings to the .defs, preserving what is already good and staying faithful to the
TEMPLATE and the shared surface. Re-emit the COMPLETE .defs.ts via the submit tool.

## You receive
- The current .defs (brief + uiSpec + pipeline).
- The critique report (findings with severity + suggested fix).
- The TEMPLATE.md and the shared/contracts (to keep fixes faithful to the guide + real surface).

## What to do
- Apply each actionable finding to \`definition\` (adjust uiSpec.fields/display/collections/metrics/
  actions/feedback/layout, businessRules, interactions, scenarios, uxClassification as pointed).
  Prioritize HIGH severity.
- Fix template-adherence gaps (missing regions, failed acceptance criteria, labels policy, footer
  pagination, flow rules) AND shared-anchoring gaps (invented fields/actions, wrong option sets, derived
  values treated as inputs).
- Never introduce a field/action/route absent from shared/contracts.
- If the critique says "no fixes needed", re-emit the .defs unchanged.
- Keep the file shape intact: the two exports \`definition\` and \`pipeline\` (keep the template in every
  pipeline item's dependsFiles).

Return ONLY the complete corrected .defs.ts body via the submit tool.
`;
