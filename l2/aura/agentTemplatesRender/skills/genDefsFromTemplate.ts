/// <mls fileReference="_102020_/l2/aura/agentTemplatesRender/skills/genDefsFromTemplate.ts" enhancement="_blank"/>

// Skill for agentTplDefs: author the page .defs.ts (definition brief + uiSpec anchored to the template
// regions + pipeline referencing the template). Adapts mode6 genDefs + mode5 refine (uiSpec upfront).

export const skill = `
# CollabUX · Generate the page .defs.ts (template-guided)

Author the COMPLETE .defs.ts for one page. It is guided by a UX TEMPLATE (the guide) and anchored to the
REAL surface (shared + contracts). Emit the whole file body via the submit tool.

## You receive
- The generation parameters (pageId, moduleName, genome, style, template, exact pipeline paths to emit).
- The L4 workspace, the TEMPLATE.md, the shared runtime (base class, @property, handlers, actions,
  this.msg keys, DTO types) and all contracts (real fields).

## File shape (exactly two exports)
\`\`\`ts
export const definition = { /* see below */ };
export const pipeline = [ /* see below */ ] as const;
\`\`\`
(The mls header is added by the tooling — you may omit it.)

## definition
- Identity: pageId, pageName, moduleName, actor, genome (the given one, e.g. "page31"), baseClassName
  (from the shared), routePattern, purpose.
- uxClassification: { family, style: <style>, template: <templateId>, layout: <the template's layout> }.
- brief: goal, actorContext, primaryAction, userFlow[], scenarios[], interactions[], businessRules[],
  dataNeeds[] (id/kind/does), notes, and **uiSpec** (below).
- Do NOT invent fields/actions/routes absent from shared/contracts. Derived/session values are display,
  never inputs.

## uiSpec — ANCHOR IT TO THE TEMPLATE REGIONS
Fill the template's "Page structure" regions with the workspace's real data. Compose:
- fields[]: per shared input → { stateName, label, control (text|number|tel|select|textarea|date),
  required, placeholder, help, mask/format, validation (min/max/pattern/step), options (closed sets from
  businessRules) }.
- display[]: per output field/column → format (BRL, date pt-BR, boolean ✓/—, badge), truncation.
- collections[]: primary list/grid → columns, onRowClick (selection), source query.
- metrics[]: KPI/summary items (label + derived value) when the template has a summary strip.
- actions[]: id, label, handler (real shared handler), primary?, loadingFrom (real state), requires[].
- feedback[]: per action → success/error/loading; per query → loading/empty/error.
- layout: a sentence per template region, in the template's order, saying what fills it here.
- a11y/microcopy: labels via this.msg keys where they exist.
Respect the template's labels policy (business labels; never raw BFF/page/pageSize; pagination in the
grid footer, not the toolbar).

## pipeline — reference the TEMPLATE (this is "which template" for the render)
Emit these items (use the EXACT refs given in the parameters). The TEMPLATE md path goes in dependsFiles
of EVERY item — that is the template reference the render consumes.
\`\`\`ts
export const pipeline = [
  { "id": "<pageId>__defs_critique", "type": "l2_defs", "outputPath": "<critique .md>", "defPath": "<defs .defs.ts>",
    "dependsFiles": ["<defs .defs.ts>", "<template .md>", "<shared .ts>"],
    "skills": ["_102020_/l2/aura/agentTemplatesRender/skills/critiqueDefsVsTemplate.ts"], "agent": "agentTplCritique" },
  { "id": "<pageId>__defs_fix", "type": "l2_defs", "outputPath": "<defs .defs.ts>", "defPath": "<defs .defs.ts>",
    "dependsFiles": ["<defs .defs.ts>", "<critique .md>", "<template .md>", "<shared .ts>"],
    "skills": ["_102020_/l2/aura/agentTemplatesRender/skills/fixDefs.ts"], "agent": "agentTplFix" },
  { "id": "<pageId>__l2_page", "type": "l2_page", "outputPath": "<page .ts>", "defPath": "<defs .defs.ts>",
    "dependsFiles": ["<defs .defs.ts>", "<template .md>", "<shared .ts>", "<contract .ts>", "<designSystem.ts>"],
    "skills": ["_102020_/l2/aura/agentTemplatesRender/skills/renderFromTemplate.ts"], "agent": "agentTplRender" }
] as const;
\`\`\`
(The pipeline is documentation of the chain; the group's agents drive execution. Keep the template in
every dependsFiles.)

Return ONLY the complete .defs.ts body via the submit tool.
`;
