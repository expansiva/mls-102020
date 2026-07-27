/// <mls fileReference="_102020_/l2/aura/agentTemplatesRender/agentTplPlan.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Planner (LLM, once per run). Classifies the module's workspaces against the requested style model
// and decides the reusable TEMPLATE set (dedup — many pages share one template; reuse an existing
// l4/templates/<style>/<id>.md instead of rewriting it). Then fans out the whole tree:
//
//   groups:<templateId> agentTplGroups        (useMolecules + NEW template)  parallel
//   mols:<templateId>  agentTplSelectMolecules dependsOn [groups:<t>]
//   tpl:<templateId>   agentTplWriteTemplate  (only for NEW templates)  dependsOn [mols:<t>] | []
//   defs:<page>        agentTplDefs           dependsOn [tpl:<t>] (new) | [] (existing)
//   critique:<page>    agentTplCritique       dependsOn [defs:<page>]
//   fix:<page>         agentTplFix            dependsOn [critique:<page>]
//   render:<page>      agentTplRender         dependsOn [fix:<page>]
//   register           agentTplRegister       barrier: dependsOn [render:<page> ...ALL]
//
// The planned steps are created as SIBLINGS of this plan step (parentStep = the root LLM step), so the
// register barrier's dependsOn resolves within one parent scope — the native "all pages finished" signal.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { mkAgentStep, mkFail, makePlanId } from '/_102020_/l2/aura/agentImplementGenome/planning.js';
import {
  parseTplArgs, workspaceRef, listExistingTemplates, planTraceRef, readFile, saveTextArtifact, type TplArgs,
} from '/_102020_/l2/aura/agentTemplatesRender/tplCore.js';
import { skill as classifySkill } from '/_102020_/l2/aura/agentTemplatesRender/skills/classifyWorkspaces.js';

interface PlanTemplate {
  templateId: string;
  status: 'new' | 'existing';
  layout: string;
  pages: string[];
  rationale?: string;
}

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentTplPlan',
    agentProject: 102020,
    agentFolder: 'aura/agentTemplatesRender',
    agentDescription: 'Classify workspaces and plan the reusable template set (dedup + reuse)',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {

  try {
    const a = parseTplArgs(args ?? step.prompt);
    const project = mls.actualProject || 0;
    const pages = a.pages ?? [];
    console.info(`[agentTplPlan] ▶ planning ${pages.length} workspace(s) for style ${a.styleModel}`);

    const existing = listExistingTemplates(project, a.styleModel);
    const workspaceBlocks: string[] = [];
    for (const page of pages) {
      const src = await readFile(workspaceRef(project, a.module, page));
      if (src) workspaceBlocks.push(`### workspace: ${page}\n\`\`\`ts\n${src}\n\`\`\``);
    }

    const humanPrompt = [
      `## Request`,
      `Style model: **${a.styleModel}**. Module: **${a.module}**. Target genome: **${a.genome}**.`,
      `Plan the reusable UX templates that will guide these workspaces.`,
      '',
      `## Existing templates for this style (reuse — do NOT rewrite)`,
      existing.length ? existing.map(t => `- ${t}`).join('\n') : '(none yet)',
      '',
      `## Workspaces (${pages.length})`,
      '',
      ...workspaceBlocks,
      '',
      `## Output`,
      `Return ONLY the JSON described in the output format.`,
    ].join('\n');

    const continueParallel: mls.msg.AgentIntentPromptReady = {
      type: 'prompt_ready',
      args: args ?? step.prompt ?? '',
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task?.PK || '',
      hookSequential,
      parentStepId: parentStep.stepId,
      systemPrompt: `<!-- modelType: classifier -->\n\n${classifySkill}`,
      humanPrompt,
    };
    return [continueParallel];
  } catch (error) {
    return [mkFail(context, parentStep, step, hookSequential, `[agentTplPlan] ${error instanceof Error ? error.message : String(error)}`)];
  }
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {

  try {
    const a = parseTplArgs(step.prompt);
    const project = mls.actualProject || 0;
    const runPages = a.pages ?? [];

    const payload = step.interaction?.payload?.[0] as any;
    if (payload?.type !== 'flexible' || !payload.result) throw new Error(`invalid plan payload: ${JSON.stringify(payload)?.slice(0, 200)}`);
    const templates = normalizePlan(payload.result?.templates, runPages, a.styleModel);
    if (!templates.length) throw new Error('planner returned no templates');

    // page → template map (a page belongs to exactly one template; first wins).
    const pageTemplate = new Map<string, PlanTemplate>();
    for (const t of templates) for (const p of t.pages) if (!pageTemplate.has(p)) pageTemplate.set(p, t);
    const orphans = runPages.filter(p => !pageTemplate.has(p));
    if (orphans.length) throw new Error(`planner left pages without a template: ${orphans.join(', ')}`);

    // Persist the plan (audit) — best-effort.
    if (!context.isTest) {
      await saveTextArtifact(planTraceRef(project, a.module, a.genome), renderPlanMd(a, templates));
    }

    const baseArgs = (extra: Partial<TplArgs>): TplArgs => ({
      module: a.module, styleModel: a.styleModel, layout: a.layout, ds: a.ds, device: a.device, genome: a.genome,
      useMolecules: a.useMolecules, ...extra,
    });

    // Steps are added as CHILDREN of THIS plan step (`step`), created DURING its own afterPromptStep —
    // the only step whose children can be added right now. Parenting to an ancestor (parentStep/root)
    // fails: "Parent step cannot be modified" (it already completed). Mirrors agentImplementGenome,
    // which parents its planned tree to its own `step`. We do NOT self-complete: the framework closes
    // this step once its children finish (it becomes the group parent, like the root confirm step).
    const intents: mls.msg.AgentIntentAddStep[] = [];

    // Write-template steps (NEW templates only). With useMolecules, the guide is written only AFTER the
    // molecule cascade (groups → molecules), so it can embed the chosen molecules as a section.
    // Existing templates are used as they are — they never gain molecules retroactively.
    for (const t of templates.filter(t => t.status === 'new')) {
      const tplArgs = baseArgs({ templateId: t.templateId, pages: t.pages });
      let tplDeps: string[] = [];
      if (a.useMolecules) {
        intents.push(mkAgentStep(context, step, makePlanId('groups', t.templateId), `Molecule groups: ${t.templateId}`,
          'agentTplGroups', tplArgs as any, [], 'waiting_human_input', 'parallel_static'));

        intents.push(mkAgentStep(context, step, makePlanId('mols', t.templateId), `Select molecules: ${t.templateId}`,
          'agentTplSelectMolecules', tplArgs as any, [makePlanId('groups', t.templateId)],
          'waiting_dependency', 'parallel_static'));

        tplDeps = [makePlanId('mols', t.templateId)];
      }
      intents.push(mkAgentStep(context, step, makePlanId('tpl', t.templateId), `Write template: ${t.templateId}`,
        'agentTplWriteTemplate', tplArgs as any, tplDeps,
        tplDeps.length ? 'waiting_dependency' : 'waiting_human_input', 'parallel_static'));
    }

    // Per-page chain: defs → critique → fix → render.
    const renderIds: string[] = [];
    for (const page of runPages) {
      const t = pageTemplate.get(page)!;
      const defsDeps = t.status === 'new' ? [makePlanId('tpl', t.templateId)] : [];
      const perPage = (group: string) => makePlanId(group, page);
      const pageArgs = (extra: Partial<TplArgs>) => baseArgs({ page, templateId: t.templateId, templateStatus: t.status, ...extra });

      intents.push(mkAgentStep(context, step, perPage('defs'), `Defs: ${page}`,
        'agentTplDefs', pageArgs({}) as any, defsDeps,
        defsDeps.length ? 'waiting_dependency' : 'waiting_human_input', 'parallel_static'));

      intents.push(mkAgentStep(context, step, perPage('critique'), `Critique: ${page}`,
        'agentTplCritique', pageArgs({}) as any, [perPage('defs')], 'waiting_dependency', 'parallel_static'));

      intents.push(mkAgentStep(context, step, perPage('fix'), `Fix defs: ${page}`,
        'agentTplFix', pageArgs({}) as any, [perPage('critique')], 'waiting_dependency', 'parallel_static'));

      intents.push(mkAgentStep(context, step, perPage('render'), `Render: ${page}`,
        'agentTplRender', pageArgs({}) as any, [perPage('fix')], 'waiting_dependency', 'parallel_static'));
      renderIds.push(perPage('render'));
    }

    // Terminal barrier — register once, after every render finished.
    intents.push(mkAgentStep(context, step, makePlanId('register'), 'Register variations',
      'agentTplRegister', baseArgs({ pages: runPages }) as any, renderIds, 'waiting_dependency', 'sequential'));

    const newCount = templates.filter(t => t.status === 'new').length;
    const molecules = a.useMolecules ? ` (molecule cascade on ${newCount} new template(s))` : '';
    console.info(`[agentTplPlan] ✓ planned ${newCount} new template(s) + ${runPages.length} page chain(s) (defs→critique→fix→render) + 1 register${molecules}`);
    return intents;
  } catch (error) {
    return [mkFail(context, parentStep, step, hookSequential, `[agentTplPlan] ${error instanceof Error ? error.message : String(error)}`)];
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function normalizePlan(raw: unknown, runPages: string[], styleModel: string): PlanTemplate[] {
  void styleModel;
  const arr = Array.isArray(raw) ? raw : [];
  const pageSet = new Set(runPages);
  const out: PlanTemplate[] = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const templateId = typeof r.templateId === 'string' ? r.templateId.trim() : '';
    if (!templateId) continue;
    const status: 'new' | 'existing' = r.status === 'existing' ? 'existing' : 'new';
    const layout = typeof r.layout === 'string' ? r.layout : '';
    const pages = Array.isArray(r.pages) ? r.pages.filter((p): p is string => typeof p === 'string' && pageSet.has(p)) : [];
    if (!pages.length) continue;
    out.push({ templateId, status, layout, pages, rationale: typeof r.rationale === 'string' ? r.rationale : undefined });
  }
  return out;
}

function renderPlanMd(a: TplArgs, templates: PlanTemplate[]): string {
  const lines = [
    `# Templates plan — ${a.styleModel} → ${a.genome} (${a.module})`,
    '',
    `Layout ${a.layout} · DS ${a.ds} · device ${a.device}.`,
    '',
  ];
  for (const t of templates) {
    lines.push(`## ${t.templateId} (${t.status})`, '');
    if (t.layout) lines.push(`- layout: ${t.layout}`);
    lines.push(`- pages: ${t.pages.join(', ')}`);
    if (t.rationale) lines.push(`- rationale: ${t.rationale}`);
    lines.push('');
  }
  return lines.join('\n');
}
