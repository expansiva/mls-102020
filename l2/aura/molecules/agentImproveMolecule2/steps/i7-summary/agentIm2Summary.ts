/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i7-summary/agentIm2Summary.ts" enhancement="_102027_/l2/enhancementAgent"/>

// i7-summary — the last step. One cheap call, and it writes no file of the molecule.
//
// What it delivers is the COHERENCE REPORT, and that is the argument for this whole agent: the two
// gates of imCoherence run over the molecule as it stands now, and report what the contract, the
// code and the group contract disagree about — INCLUDING problems that were already there.
//
// REPORT ONLY. It never blocks, and by the time it runs there is nothing left to block. An improve
// run is simply when these are cheapest to fix, and the user decides (flow.json.principles, last).
//
// The model is given FACTS, never asked to recall the pipeline: every step left an artifact, and a
// model asked what happened invents the parts it did not see. Its only job is the user's language.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  isRecord,
  parseMaybeJson,
  readJsonArtifact,
  readStorText,
  writeJsonArtifact,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import {
  buildVToolInstruction,
  createVToolSchema,
  extractVToolOutput,
  nmAgentStepIntent,
  nmParseStepArgs,
  nmUpdateStatusIntent,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.js';
import {
  IM_AGENT_FOLDER,
  IM_MAX_ATTEMPTS,
  ImArtifactKind,
  ImContext,
  ImInheritChoice,
  ImTriage,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';
import { buildCoherenceReport } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imCoherence.js';
import {
  imContextFileInfo,
  imFileInfoFor,
  imTraceFileInfo,
  imTriageFileInfo,
  imWorkFile,
  readImAgentText,
  sourceOf,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imResolve.js';
import { getImRunKey } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imRootPlan.js';
import {
  ImRunFacts,
  emptyRunFacts,
  findingsCarried,
  renderFindings,
  renderRunFacts,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i7-summary/gather.js';

const AGENT_NAME = 'agentIm2Summary';
const PLAN_ID = 'i7-summary';
const TOOL_NAME = 'submitSummary';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${IM_AGENT_FOLDER}/steps/i7-summary`,
    agentDescription: 'i7-summary — the final summary and the coherence report',
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
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);
  const parsedArgs = nmParseStepArgs(args ?? step.prompt);
  const runKey = getImRunKey(context, parsedArgs.runKey);
  const facts = await gatherFacts(runKey);

  const promptMd = await readImAgentText('steps/i7-summary', 'prompt', '.md', true);
  const schemaRaw = await readImAgentText('schemas', 'i7-summary.schema', '.json', true);
  const schema = parseMaybeJson(schemaRaw);
  if (!isRecord(schema)) throw new Error(`[${AGENT_NAME}] invalid i7-summary schema`);

  const ctx = await readContext(runKey);
  const systemPrompt = promptMd
    .split('{{userLanguage}}').join(ctx.userLanguage || 'the language of the request')
    .split('{{facts}}').join(renderRunFacts(facts))
    .split('{{findings}}').join(renderFindings(facts.findings))
    + `\n\n${buildVToolInstruction(TOOL_NAME, 'the run left nothing that can be summarised')}`;

  const humanPrompt = [
    `Write the closing summary for ${facts.tag}.`,
    parsedArgs.retryContext ? `## Fix this\n${parsedArgs.retryContext}` : '',
  ].filter(Boolean).join('\n\n');

  return [{
    type: 'prompt_ready',
    args: args || step.prompt || JSON.stringify({ planId: PLAN_ID, runKey }),
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task.PK,
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt,
    humanPrompt,
    tools: [createVToolSchema(TOOL_NAME, 'Submit the closing summary and the coherence report', schema as Record<string, unknown>)],
    toolChoice: { type: 'function', function: { name: TOOL_NAME } },
  } as mls.msg.AgentIntentPromptReady];
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);
  const parsedArgs = nmParseStepArgs(step.prompt);
  const attempt = parsedArgs.retryAttempt || 1;
  const runKey = getImRunKey(context, parsedArgs.runKey);
  const facts = await gatherFacts(runKey);

  let summary = '';
  let reported: string[] = [];
  let error = '';
  try {
    const raw = extractVToolOutput(step.interaction?.payload?.[0], TOOL_NAME, ['summary']);
    if (raw.status === 'failed') error = `model reported failure: ${raw.trace.join('; ') || 'no reason'}`;
    else {
      summary = String(raw.result.summary || '').trim();
      reported = Array.isArray(raw.result.findings)
        ? raw.result.findings.filter((item): item is string => typeof item === 'string')
        : [];
    }
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  }

  // The only check this step makes, and flow.json said it would make none. A model asked to write
  // "a short summary" of ten problems writes about three, and a dropped finding is a defect nobody
  // hears about — which is precisely how the thirteen behind this agent were found.
  const carried = findingsCarried(reported, facts.findings);
  if (!error && !summary) error = 'the summary came out empty';
  if (!error && !carried.ok) {
    error = `${carried.missing} of the ${facts.findings.length} coherence findings were left out — report every one, one entry each`;
  }

  await writeJsonArtifact(imTraceFileInfo(runKey, PLAN_ID, attempt), {
    savedAt: new Date().toISOString(),
    planId: PLAN_ID,
    attempt,
    ok: !error,
    findings: facts.findings.length,
    ...(error ? { error } : {}),
  });

  if (error) {
    if (attempt >= IM_MAX_ATTEMPTS) {
      // The run WORKED — the files are written and correct. Failing the whole task over a summary
      // would tell the user the change did not happen, which is false. The findings are emitted
      // verbatim instead, in English, and the step closes.
      return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', fallbackSummary(facts, error), 'input_output')];
    }
    return [
      nmAgentStepIntent(context, parentStep, {
        agentName: AGENT_NAME,
        stepTitle: `${step.stepTitle || PLAN_ID} (retry)`,
        planId: `${PLAN_ID}-retry${attempt}`,
        prompt: { planId: PLAN_ID, runKey, retryAttempt: attempt + 1, retryContext: error },
      }),
      nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `summary rejected, retrying: ${error}`, 'input_output'),
    ];
  }

  const text = [
    summary,
    facts.findings.length ? `\n### ${coherenceHeading(facts)}\n${reported.map(line => `- ${line}`).join('\n')}` : '',
  ].filter(Boolean).join('\n');

  await writeJsonArtifact(imWorkFile(runKey, 'summary'), {
    savedAt: new Date().toISOString(),
    summary,
    findings: reported,
    findingsFound: facts.findings.length,
    touched: facts.touched,
    route: facts.route,
  });

  return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', text, 'input_output')];
}

// ---- helpers ----

async function readContext(runKey: string): Promise<ImContext> {
  const ctx = await readJsonArtifact<ImContext>(imContextFileInfo(runKey), true);
  if (!ctx) throw new Error(`[${AGENT_NAME}] context.json missing for ${runKey}`);
  return ctx;
}

/**
 * Every step's artifact, plus the coherence report computed over the molecule AS IT STANDS NOW.
 *
 * `context.json` holds the pre-edit sources, so passing both to buildCoherenceReport is what lets
 * it mark a finding as caused by this run rather than merely noticed by it.
 */
async function gatherFacts(runKey: string): Promise<ImRunFacts> {
  const ctx = await readContext(runKey);
  const facts = emptyRunFacts();
  facts.tag = ctx.target.tag;
  facts.groupCanonical = ctx.target.groupCanonical;
  facts.request = ctx.userPrompt;

  const triage = await readJsonArtifact<ImTriage>(imTriageFileInfo(runKey), false);
  if (triage) {
    facts.route = triage.route;
    facts.rationale = triage.rationale;
  }

  const edit = await readJsonArtifact<{ touched?: Array<{ kind: ImArtifactKind }>; why?: string[] }>(imWorkFile(runKey, 'edit'), false);
  if (edit) {
    facts.touched = (edit.touched || []).map(item => item.kind);
    facts.why = edit.why || [];
  }

  const playground = await readJsonArtifact<{ playgroundChanged?: boolean; addedSlots?: string[] }>(imWorkFile(runKey, 'playground'), false);
  if (playground?.playgroundChanged) {
    facts.playgroundChanged = true;
    facts.addedSlots = playground.addedSlots || [];
    if (!facts.touched.includes('html')) facts.touched.push('html');
  }

  const index = await readJsonArtifact<{ indexUpdated?: boolean }>(imWorkFile(runKey, 'index'), false);
  if (index?.indexUpdated) {
    facts.indexUpdated = true;
    if (!facts.touched.includes('groupIndex')) facts.touched.push('groupIndex');
  }

  const inherit = await readJsonArtifact<ImInheritChoice>(imWorkFile(runKey, 'inherit'), false);
  if (inherit) {
    facts.inheritWhere = inherit.where;
    facts.inheritMember = inherit.member || '';
  }

  facts.findings = (await coherence(ctx)).findings;
  return facts;
}

async function coherence(ctx: ImContext) {
  const groupCreationSkill = await loadGroupSkill(ctx);
  return buildCoherenceReport(
    {
      // A shell has no .defs.ts of its own; the contract that governs it is the parent's, and
      // gate 1 must be judged against THAT — reading an empty local defs would report every slot
      // as undocumented.
      defsSource: ctx.contract.inherited
        ? ctx.contract.source
        : await readStorText(imFileInfoFor(ctx, 'defs'), false),
      tsSource: await readStorText(imFileInfoFor(ctx, 'ts'), false),
      groupCreationSkill,
      reference: ctx.target.fileReference,
      // The pre-edit snapshot. Without both, every finding is reported as pre-existing.
      previousTsSource: sourceOf(ctx.artifacts, 'ts'),
      previousDefsSource: ctx.contract.inherited ? ctx.contract.source : sourceOf(ctx.artifacts, 'defs'),
    },
    new Date().toISOString(),
  );
}

/** Best effort: an unreadable group skill costs the contract check, not the run. */
async function loadGroupSkill(ctx: ImContext): Promise<string> {
  if (!ctx.groupSkill.reference) return '';
  try {
    const mod = await import(ctx.groupSkill.reference) as { skill?: unknown };
    return typeof mod.skill === 'string' ? mod.skill : '';
  } catch {
    return '';
  }
}

function coherenceHeading(facts: ImRunFacts): string {
  return facts.findings.some(f => f.severity === 'introduced')
    ? 'Coherence — including problems this change introduced'
    : 'Coherence — problems that were already there';
}

/**
 * When the model fails twice, the RUN still succeeded: the files are written and correct. Failing
 * the task over its summary would tell the user the change did not happen, which is false.
 */
function fallbackSummary(facts: ImRunFacts, error: string): string {
  return [
    `${facts.tag} — ${facts.touched.length ? `changed: ${facts.touched.join(', ')}` : 'no file was changed'}.`,
    '',
    `(the closing summary could not be written: ${error} — the findings below are verbatim)`,
    '',
    renderFindings(facts.findings),
  ].join('\n');
}
