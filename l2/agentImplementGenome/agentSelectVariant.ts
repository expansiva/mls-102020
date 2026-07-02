/// <mls fileReference="_102020_/l2/agentImplementGenome/agentSelectVariant.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Fase B — Agent2: per-ELEMENT VARIANT selection (LLM, semantic). One per page; runs after
// agentSelectGroups (which wrote `groupSelections` = [{id, group}]).
//
// Hybrid model: the DS/layout rules FILTER the group's variants by STYLE
// (filterCompatibleVariants); the LLM then picks the one whose MEANING fits the element
// (field name / inputType / purpose × candidate descriptions), OR rejects all — even when
// there is a single candidate: a semantically wrong molecule is worse than none (the element
// keeps its plain control). Writes `variantSelections` = [{id, group, tag}] for agentGenDefs.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { buildWorkItem } from '/_102020_/l2/dsMatch/derivePaths.js';
import { resolveRulesForPage } from '/_102020_/l2/dsMatch/resolveRulesForPage.js';
import { buildMoleculeCatalog } from '/_102020_/l2/dsMatch/buildMoleculeCatalog.js';
import { filterCompatibleVariants } from '/_102020_/l2/dsMatch/filterVariants.js';
import { loadPageLayout, loadElementGroupSelections } from '/_102020_/l2/dsMatch/agent1.js';
import { listLayoutElements, indexById, type LayoutElement } from '/_102020_/l2/dsMatch/layoutElements.js';
import type { MoleculeCatalogEntry } from '/_102020_/l2/dsMatch/types.js';
import { parseStepArgs, mkCompleted, mkFail, saveFile, type StepArgs } from '/_102020_/l2/agentImplementGenome/planning.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentSelectVariant',
    agentProject: 102020,
    agentFolder: 'agentImplementGenome',
    agentDescription: 'Pick the molecule variant per element by semantic fit, or reject (Agent2)',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

interface ElementCandidates {
  el: LayoutElement;
  group: string;
  candidates: MoleculeCatalogEntry[];
}

/** Deterministic: per element (from Agent1's groups), the STYLE-compatible candidate variants. */
async function deriveElementCandidates(project: number, a: StepArgs): Promise<ElementCandidates[]> {
  const item = buildWorkItem(project, a.module, a.layout, a.ds, a.page!, a.device);
  const groups = await loadElementGroupSelections(item.defsDestino);
  if (!groups.length) return [];
  const byId = indexById(listLayoutElements(await loadPageLayout(item.defsOrigem)));
  const { rules, configuredAxes } = await resolveRulesForPage(project, a.module, a.page!, a.layout); // layout-scoped rules
  const catalog = await buildMoleculeCatalog();

  const out: ElementCandidates[] = [];
  for (const { id, group } of groups) {
    const el = byId.get(id);
    if (!el) continue;
    const candidates = filterCompatibleVariants(group, rules, configuredAxes, catalog);
    if (!candidates.length) continue; // DS/layout leaves no compatible variant → element keeps plain control
    out.push({ el, group, candidates });
  }
  return out;
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
    const a = parseStepArgs(args ?? step.prompt);
    const project = mls.actualProject || 0;
    const elements = await deriveElementCandidates(project, a);
    console.info(`[agentSelectVariant] ▶ ${a.page}: ${elements.length} elemento(s) com candidatas de estilo`);

    if (!elements.length) return [mkCompleted(context, parentStep, step, hookSequential)]; // nothing to pick

    const continueParallel: mls.msg.AgentIntentPromptReady = {
      type: 'prompt_ready',
      args: args || step.prompt || '',
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task?.PK || '',
      hookSequential,
      parentStepId: parentStep.stepId,
      humanPrompt: buildHumanPrompt(elements),
      systemPrompt: system1,
    };
    return [continueParallel];
  } catch (error) {
    const msg = `[agentSelectVariant] ${error instanceof Error ? error.message : String(error)}`;
    console.error('✗', msg);
    return [mkFail(context, parentStep, step, hookSequential, msg)];
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
    const payload = step.interaction?.payload?.[0];
    if (payload?.type !== 'flexible' || !payload.result) throw new Error(`invalid payload: ${JSON.stringify(payload)}`);

    const a = parseStepArgs(step.prompt);
    const project = mls.actualProject || 0;
    const item = buildWorkItem(project, a.module, a.layout, a.ds, a.page!, a.device);
    const elements = await deriveElementCandidates(project, a);

    // Validate each pick against that element's candidate tags; drop unknown/none.
    const candTagsById = new Map(elements.map(e => [e.el.id, { group: e.group, tags: new Set(e.candidates.map(c => c.tag)) }]));
    const raw = Array.isArray((payload.result as any)?.selections) ? (payload.result as any).selections : [];

    const selections: Array<{ id: string; group: string; tag: string }> = [];
    let picked = 0, rejected = 0, dropped = 0;
    const seen = new Set<string>();
    for (const s of raw) {
      const id = typeof s?.id === 'string' ? s.id : '';
      const info = candTagsById.get(id);
      if (!info || seen.has(id)) { dropped++; continue; }
      seen.add(id);
      const tag = typeof s?.tag === 'string' ? s.tag : null;
      if (!tag) { rejected++; continue; }           // LLM chose "none" → element keeps plain control
      if (!info.tags.has(tag)) { dropped++; continue; } // hallucinated tag → treat as none
      selections.push({ id, group: info.group, tag });
      picked++;
    }
    // Elements the LLM omitted entirely also count as "no molecule" (rejected by silence).
    const elementsWithoutPick = elements.length - picked - rejected - dropped;

    if (!context.isTest) await saveFile(item.defsDestino, buildVariantSelectionsDefs(item.defsDestino, selections));
    console.info(`[agentSelectVariant] ✓ ${a.page}: ${picked} molécula(s) escolhida(s) · ${rejected} rejeitada(s)(none) · ${dropped} descartada(s) · ${elementsWithoutPick} sem resposta`);
    return [mkCompleted(context, parentStep, step, hookSequential)];
  } catch (error) {
    const msg = `[agentSelectVariant] ${error instanceof Error ? error.message : String(error)}`;
    console.error('✗', msg);
    return [mkFail(context, parentStep, step, hookSequential, msg)];
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildHumanPrompt(elements: ElementCandidates[]): string {
  const blocks = elements.map(({ el, candidates }) => {
    const ctx = [
      `id=${el.id}`,
      el.kind,
      `intent=${el.intent}`,
      el.field ? `field=${el.field}` : '',
      el.inputType ? `inputType=${el.inputType}` : '',
      el.organismName ? `organism=${el.organismName}` : '',
      el.labelKey ? `labelKey=${el.labelKey}` : '',
    ].filter(Boolean).join(' | ');
    const cands = candidates.map(c => `    - ${c.tag}: ${c.objective || c.variant}`).join('\n');
    return `- ${ctx}\n  candidates:\n${cands}`;
  }).join('\n');

  return [
    `## Elements — for EACH, pick the ONE candidate whose meaning fits the element, or "none"`,
    blocks,
  ].join('\n\n');
}

function buildVariantSelectionsDefs(defsRef: string, selections: unknown): string {
  const cleanRef = defsRef.startsWith('/') ? defsRef.slice(1) : defsRef;
  return [
    `/// <mls fileReference="${cleanRef}" enhancement="_blank"/>`,
    '',
    '// Generated by agentSelectVariant (Agent2). Variant chosen semantically by the LLM from the',
    '// style-compatible candidates (or "none"). Consumed by agentGenDefs, which places the molecule.',
    '',
    `export const variantSelections = ${JSON.stringify(selections, null, 2)} as const;`,
    '',
  ].join('\n');
}

const system1 = `
<!-- modelType: codeinstruct3 -->

You must return ONLY a valid JSON object. No preamble, no markdown fences. Start with { and end with }

## Task
For each UI element you are given its context (field name, inputType, intent, organism) and a
list of CANDIDATE molecules (already filtered to be style-compatible), each with a description.
Pick the ONE candidate whose PURPOSE best matches what the element actually IS.

## Rules
- Decide by MEANING: e.g. a field "customerName" → a generic text input, NOT an address/CPF/phone
  molecule; "postalCode"/"cep" → an address molecule; "email" → an email molecule.
- Choose the \`tag\` EXACTLY as listed for that element. Never invent a tag.
- Reject when nothing fits: set \`tag\` to null — EVEN IF there is only one candidate. A semantically
  wrong molecule is worse than none (the element keeps its plain control).
- One entry per element id.

## Output format
[[OutputSection]]
`;

//#region OutputSection
export type Output = {
  type: 'flexible';
  result: {
    selections: Array<{ id: string; tag: string | null }>;
  };
};
//#endregion
