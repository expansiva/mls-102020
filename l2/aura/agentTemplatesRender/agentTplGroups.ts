/// <mls fileReference="_102020_/l2/aura/agentTemplatesRender/agentTplGroups.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Cascade step 1/2 of the molecule mode (useMolecules): pick the INTENT GROUPS a NEW template needs.
// LLM, once per new template. Reads only the group CATALOG (names + descriptions, statically imported) —
// the molecule library itself is only read by the next step, for the few groups chosen here.
//
// Writes trace/templatesRender/<genome>/<templateId>.groups.md, which agentTplSelectMolecules consumes
// (steps are siblings created by the planner, so they talk through deterministic artifacts).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { mkFail, mkCompleted } from '/_102020_/l2/aura/agentImplementGenome/planning.js';
import {
  parseTplArgs, workspaceRef, groupsTraceRef, readFile, saveTextArtifact, renderGroupCatalog,
  findMoleculeGroup, type TplArgs,
} from '/_102020_/l2/aura/agentTemplatesRender/tplCore.js';
import { skill as selectGroupsSkill } from '/_102020_/l2/aura/agentTemplatesRender/skills/selectGroups.js';

interface PlannedElement {
  element: string;
  region?: string;
  intent: string;
  group: string | null;
  why?: string;
}

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentTplGroups',
    agentProject: 102020,
    agentFolder: 'aura/agentTemplatesRender',
    agentDescription: 'Pick the molecule intent groups a template needs (cascade step 1: elements → groups)',
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
    if (!a.templateId) throw new Error('missing templateId');
    const project = mls.actualProject || 0;
    console.info(`[agentTplGroups] ▶ ${a.templateId} (${a.styleModel})`);

    // Same evidence the write-template step gets: a few representative workspaces of this template.
    const sampleBlocks: string[] = [];
    for (const page of (a.pages ?? []).slice(0, 3)) {
      const src = await readFile(workspaceRef(project, a.module, page));
      if (src) sampleBlocks.push(`### ${page}\n\`\`\`ts\n${src}\n\`\`\``);
    }

    const humanPrompt = [
      `## Template`,
      `Style: **${a.styleModel}**. Template id: **${a.templateId}**.`,
      `Decide the intent GROUPS this reusable template needs (no molecules/TagNames here).`,
      '',
      `## Group catalog (use these names verbatim)`,
      renderGroupCatalog(),
      '',
      `## Workspace evidence (shape only — the template is reusable)`,
      sampleBlocks.join('\n\n') || '(none)',
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
      systemPrompt: `<!-- modelType: classifier -->\n\n${selectGroupsSkill}`,
      humanPrompt,
    };
    return [continueParallel];
  } catch (error) {
    return [mkFail(context, parentStep, step, hookSequential, `[agentTplGroups] ${error instanceof Error ? error.message : String(error)}`)];
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
    const outPath = groupsTraceRef(project, a.module, a.genome, a.templateId!);

    const payload = step.interaction?.payload?.[0] as any;
    if (payload?.type !== 'flexible' || !payload.result) {
      throw new Error(`invalid groups payload: ${JSON.stringify(payload)?.slice(0, 200)}`);
    }
    const { elements, groups } = normalizeGroups(payload.result);
    console.info(`[agentTplGroups] ${a.templateId}: ${elements.length} element(s), ${groups.length} group(s):`, groups);

    if (!context.isTest) {
      const ok = await saveTextArtifact(outPath, renderGroupsMd(a, elements, groups));
      if (!ok) return [mkFail(context, parentStep, step, hookSequential, `save failed: ${outPath}`)];
      console.info(`[agentTplGroups] ✓ ${a.templateId}: groups written`);
    }
    return [mkCompleted(context, parentStep, step, hookSequential)];
  } catch (error) {
    return [mkFail(context, parentStep, step, hookSequential, `[agentTplGroups] ${error instanceof Error ? error.message : String(error)}`)];
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Keep only groups that exist in the catalog (an unknown name has no molecules to read). */
function normalizeGroups(raw: any): { elements: PlannedElement[]; groups: string[] } {
  const elements: PlannedElement[] = [];
  for (const item of Array.isArray(raw?.elements) ? raw.elements : []) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const element = typeof r.element === 'string' ? r.element.trim() : '';
    if (!element) continue;
    const known = typeof r.group === 'string' ? findMoleculeGroup(r.group) : undefined;
    if (typeof r.group === 'string' && r.group.trim() && !known) {
      console.warn(`[agentTplGroups] unknown group "${r.group}" for element "${element}" → treated as no group`);
    }
    elements.push({
      element,
      region: typeof r.region === 'string' ? r.region : undefined,
      intent: typeof r.intent === 'string' ? r.intent : '',
      group: known?.name ?? null,
      why: typeof r.why === 'string' ? r.why : undefined,
    });
  }
  const declared = (Array.isArray(raw?.groups) ? raw.groups : [])
    .filter((g: unknown): g is string => typeof g === 'string')
    .map((g: string) => findMoleculeGroup(g)?.name)
    .filter((g: string | undefined): g is string => !!g);
  // The elements are the source of truth; the declared list only adds order.
  const fromElements = elements.map(e => e.group).filter((g): g is string => !!g);
  return { elements, groups: [...new Set([...declared, ...fromElements])] };
}

function renderGroupsMd(a: TplArgs, elements: PlannedElement[], groups: string[]): string {
  const lines = [
    `# Molecule groups — ${a.templateId} (${a.styleModel})`,
    '',
    `Genome ${a.genome} · module ${a.module}.`,
    '',
    `| element | region | intent | group | why |`,
    `| --- | --- | --- | --- | --- |`,
  ];
  for (const e of elements) {
    lines.push(`| ${cell(e.element)} | ${cell(e.region)} | ${cell(e.intent)} | ${e.group ?? '—'} | ${cell(e.why)} |`);
  }
  lines.push('', '## Groups', '');
  lines.push(groups.length ? groups.map(g => `- ${g}`).join('\n') : '- (none — the whole template is hand-drawn)');
  lines.push('');
  return lines.join('\n');
}

function cell(v: string | undefined): string {
  return (v ?? '').replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim() || '—';
}
