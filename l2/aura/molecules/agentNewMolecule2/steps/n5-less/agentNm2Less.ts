/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/steps/n5-less/agentNm2Less.ts" enhancement="_102027_/l2/enhancementAgent"/>

// n5-less — writes the molecule's .less. See flow.json.
//
// Consumes the SHARED skills/lessAuthoring (decision D3), the same one the Variant's v3-less uses,
// so a rule fixed once applies to both paths. What differs between the two agents is the MODE:
//
// - no theme  -> a NEUTRAL base sheet: every appearance value goes through a token with a literal
//                fallback (`var(--ml-on-surface, #1c1b1f)`), so a future theme can override it. This
//                is what the 147 base sheets of mls-102040 do.
// - a theme   -> the sheet IS the theme's appearance: it carries the token VALUES and takes an
//                explicit motion stance, like the 84 validated sheets of mls-102054/102055.
//
// The header is prepended by code (lesson M2).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { skill as lessAuthoringSkill } from '/_102020_/l2/aura/molecules/skills/lessAuthoring/index.js';
import {
  NM_AGENT_FOLDER,
  compileStorLess,
  isRecord,
  nmContextFileInfo,
  nmLessFile,
  nmPlanFileInfo,
  nmTraceFileInfo,
  nmTsFile,
  parseMaybeJson,
  readJsonArtifact,
  readNmAgentText,
  readPreviousAttemptSource,
  readStorText,
  toDisplayPath,
  writeJsonArtifact,
  writeStorTextAtomic,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { MoleculePlan, NM_MAX_ATTEMPTS } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTypes.js';
import { MoleculeContext } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmContext.js';
import { nmIdentityFromPlan, normalizeLessContent } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTemplates.js';
import { declaresPortal, extractMlClassesFromTs } from '/_102020_/l2/aura/molecules/shared/moleculeInspect.js';
import {
  buildVToolInstruction,
  createVToolSchema,
  extractVToolOutput,
  nmAgentStepIntent,
  nmDoneAnchor,
  nmParseStepArgs,
  nmResultStepIntent,
  nmUpdateStatusIntent,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.js';
import { runNm2LessGate } from '/_102020_/l2/aura/molecules/agentNewMolecule2/steps/n5-less/gate.js';
import { getNmRunKey } from '/_102020_/l2/aura/molecules/agentNewMolecule2/agentNewMolecule2.js';

const AGENT_NAME = 'agentNm2Less';
const PLAN_ID = 'n5-less';
const TOOL_NAME = 'submitMoleculeLess';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${NM_AGENT_FOLDER}/steps/n5-less`,
    agentDescription: 'n5-less — generates the molecule stylesheet',
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
  const runKey = getNmRunKey(context, parsedArgs.runKey);
  const { ctx, plan } = await readArtifacts(runKey);

  const promptMd = await readNmAgentText('steps/n5-less', 'prompt', '.md', true);
  const schemaRaw = await readNmAgentText('schemas', 'n5-less.schema', '.json', true);
  const schema = parseMaybeJson(schemaRaw);
  if (!isRecord(schema)) throw new Error(`[${AGENT_NAME}] invalid n5-less schema`);

  const renderTs = await readStorText(nmTsFile(plan.group, plan.shortName), true);
  const groupSkill = await loadGroupSkill(ctx);
  const portal = declaresPortal(renderTs);
  const inventory = extractMlClassesFromTs(renderTs);

  const systemPrompt = promptMd
    .split('{{tag}}').join(plan.tag)
    .split('{{portalSelectorHint}}').join(portal ? `,\ndiv[data-widget="${plan.tag}"]` : '')
    .split('{{portalRule}}').join(portal
      ? ` This molecule renders a PORTAL: add the second root selector \`div[data-widget="${plan.tag}"]\` at TOP level (never nested) and style the panel classes under it.`
      : ' This molecule has NO portal: do not use data-widget selectors.')
    .split('{{lessAuthoringSkill}}').join(lessAuthoringSkill)
    .split('{{modeSection}}').join(await buildModeSection(ctx))
    .split('{{renderTs}}').join(renderTs)
    .split('{{mlInventory}}').join(inventory.map(cls => `\`.${cls}\``).join(', ') || '(none — the render emits no ml-* class, which is a bug)')
    .split('{{groupCanonical}}').join(plan.groupCanonical)
    .split('{{groupSkill}}').join(groupSkill)
    + `\n\n${buildVToolInstruction(TOOL_NAME, 'the molecule source is insufficient to produce the sheet')}`;

  // F1: on a retry, hand back the sheet the model itself wrote (see readPreviousAttemptSource).
  const previousAttempt = await readPreviousAttemptSource(runKey, PLAN_ID, parsedArgs.retryAttempt || 1);

  const humanPrompt = [
    plan.visualRequirements.length ? `## Confirmed visual requirements\n${plan.visualRequirements.map(item => `- ${item}`).join('\n')}` : '',
    `## The molecule\n${plan.description}`,
    previousAttempt.trim() ? `## The sheet you wrote last time — FIX IT, do not start over\n\`\`\`less\n${previousAttempt}\n\`\`\`` : '',
    parsedArgs.retryContext ? `## What the gate rejected — fix ALL of these\n${parsedArgs.retryContext}` : '',
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
    tools: [createVToolSchema(TOOL_NAME, 'Submit the complete molecule .less', schema as Record<string, unknown>)],
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
  const runKey = getNmRunKey(context, parsedArgs.runKey);
  const { ctx, plan } = await readArtifacts(runKey);
  const identity = nmIdentityFromPlan(plan);
  const renderTs = await readStorText(nmTsFile(plan.group, plan.shortName), true);

  let less = '';
  let extractError = '';
  try {
    const output = extractVToolOutput(step.interaction?.payload?.[0], TOOL_NAME, ['lessContent']);
    if (output.status === 'failed') extractError = `model reported failure: ${output.trace.join('; ') || 'no reason'}`;
    else {
      const raw = String(output.result.lessContent || '');
      less = raw.trim() ? normalizeLessContent(raw, identity) : '';
    }
  } catch (error) {
    extractError = error instanceof Error ? error.message : String(error);
  }

  // A5b (2026-07-30): the sheet used to be written blind. A LESS syntax error compiles to nothing and
  // the molecule silently renders unstyled, which is exactly the kind of failure that survives a
  // visual review. Written first so it can be compiled, like n4-render does with the .ts.
  const fileInfo = nmLessFile(plan.group, plan.shortName);
  let compileErrors: string[] = [];
  if (!extractError && less.trim()) {
    await writeStorTextAtomic(fileInfo, less, true);
    compileErrors = await compileStorLess(fileInfo, less);
  }

  const issues = extractError
    ? [{ code: 'extract', message: extractError }]
    : [
      ...runNm2LessGate(less, plan, ctx, { renderTs }),
      ...compileErrors.map(message => ({ code: 'compile', message })),
    ];
  const errorText = issues.map(issue => `${issue.code}: ${issue.message}`).join('\n');

  await writeJsonArtifact(nmTraceFileInfo(runKey, PLAN_ID, attempt), {
    savedAt: new Date().toISOString(),
    planId: PLAN_ID,
    attempt,
    ok: issues.length === 0,
    chars: less.length,
    themed: ctx.theme.present,
    ...(issues.length ? { error: errorText, source: less } : {}),
  });

  if (issues.length === 0) {
    const display = toDisplayPath(fileInfo);
    return [
      nmResultStepIntent(context, parentStep, {
        planId: nmDoneAnchor(PLAN_ID),
        dependsOn: [],
        stepTitle: display,
        result: { file: display, attempt },
      }),
      nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `stylesheet written (attempt ${attempt})`, 'input_output'),
    ];
  }

  if (attempt >= NM_MAX_ATTEMPTS) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `${PLAN_ID} failed after ${attempt} attempts:\n${errorText}`)];
  }

  return [
    nmAgentStepIntent(context, parentStep, {
      agentName: AGENT_NAME,
      stepTitle: `${step.stepTitle || PLAN_ID} (retry)`,
      planId: `${PLAN_ID}-retry${attempt}`,
      prompt: { planId: PLAN_ID, runKey, retryAttempt: attempt + 1, retryContext: errorText },
    }),
    nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `gate failed, retrying:\n${errorText}`, 'input_output'),
  ];
}

// ---- helpers ----

async function readArtifacts(runKey: string): Promise<{ ctx: MoleculeContext; plan: MoleculePlan }> {
  const ctx = await readJsonArtifact<MoleculeContext>(nmContextFileInfo(runKey), true);
  if (!ctx) throw new Error(`[${AGENT_NAME}] context.json missing for ${runKey}`);
  const plan = await readJsonArtifact<MoleculePlan>(nmPlanFileInfo(runKey), true);
  if (!plan || !plan.confirmedAt) throw new Error(`[${AGENT_NAME}] plan.json missing or not confirmed for ${runKey}`);
  return { ctx, plan };
}

async function loadGroupSkill(ctx: MoleculeContext): Promise<string> {
  const mod = await import(ctx.groupSkill.reference) as { skill?: unknown };
  if (typeof mod.skill !== 'string' || !mod.skill.trim()) {
    throw new Error(`[${AGENT_NAME}] group creation skill unreadable: ${ctx.groupSkill.reference}`);
  }
  return mod.skill;
}

// The two modes the gate enforces, stated as instructions. With no theme NOTHING theme-related may
// appear in the artifact — that is acceptance 3.11.
// A7 (2026-07-31): the NEUTRAL branch demanded "every appearance value goes through a token" and then
// showed TWO examples, never the vocabulary — while the THEMED branch gets the theme's whole token
// table from loadThemeSkill. That asymmetry made compliance luck, and the two runs of 2026-07-31 show
// both outcomes: one invented `var(--ml-primary-dim-bg, rgba(...))` and PASSED (wrapping is all the
// gate checks), the next wrote `rgba(59,130,246,0.08)` bare and failed twice, stopping the pipeline.
// The token it needed already exists — `--ml-primary-container`, which is what
// groupselectmany/ml-table-multi-select.less:19 uses for a selected row.
//
// Table MEASURED over the base sheets of mls-102040, by how many FILES use each token. The tail of
// that measurement also settled an open question: the vocabulary CANNOT be closed. Tokens used in
// exactly one file are molecule-specific ON PURPOSE (`--ml-nrs-knob-size` belongs to the number range
// slider, `--ml-gradient-1..7` to the charts), so a gate rejecting unknown tokens would reject good
// molecules. Hence: the prompt teaches the shared names, and inventing a prefixed one stays legal.
const NM_NEUTRAL_TOKEN_VOCABULARY = [
  '### The token vocabulary of the base sheets',
  '',
  'These are the `--ml-*` names the library already shares (the number is how many of the ~147 base',
  'sheets use each one). **Use the token of the role when one exists** — do not coin a new name for a',
  'role that is already covered.',
  '',
  '| role | tokens |',
  '|---|---|',
  '| surface | `--ml-surface` (145), `--ml-surface-dim` (113) — the recessed surface of rails, footers and empty states, `--ml-surface-variant`, `--ml-surface-overlay` |',
  '| text on surface | `--ml-on-surface` (146), `--ml-on-surface-muted` (143), `--ml-on-surface-faint` (82) |',
  '| outline | `--ml-outline-variant` (144), `--ml-outline-focus` (86), `--ml-outline-error` (99) |',
  '| focus ring | `--ml-focus-ring-color` (122), `--ml-focus-ring-width` (121) |',
  '| primary | `--ml-primary` (116), `--ml-on-primary` (68), `--ml-primary-container` (8) — **the tinted background of a SELECTED row/item**, `--ml-on-primary-container` |',
  '| semantic | `--ml-error` (126), `--ml-success` (12), `--ml-warning` (6), each with `-dim` (tinted background) and `-border` variants |',
  '| shape | `--ml-radius-sm` (31), `--ml-radius-md` (15), `--ml-radius-full` (4), `--ml-border-width` (59), `--ml-border-style` (59) |',
  '| elevation | `--ml-shadow-0` (2), `--ml-shadow-1` (11), `--ml-shadow-2` (13) |',
  '| motion | `--ml-transition` (51) |',
  '| typography | `--ml-font-family` (144), `--ml-font-weight-medium` (140) |',
  '| state | `--ml-disabled-opacity` (138) |',
  '',
  'If the molecule genuinely needs a value no role above covers — a knob size, a track height, a chart',
  'gradient — coin a token PREFIXED with the molecule, as the library does: `--ml-nrs-knob-size`,',
  '`--ml-spinner-duration`, `--ml-gradient-1`. Still consumed with a fallback:',
  '`var(--ml-nrs-knob-size, 20px)`.',
].join('\n');

async function buildModeSection(ctx: MoleculeContext): Promise<string> {
  if (!ctx.theme.present || !ctx.theme.info) {
    return [
      '## Mode: NEUTRAL (this project has no theme)',
      '',
      'This is a BASE sheet: it must be overridable by a theme added later. So every appearance value',
      'goes through a token, with a sensible literal as the FALLBACK:',
      '',
      '```less',
      '.ml-text { color: var(--ml-on-surface, #1c1b1f); }',
      '.ml-surface-bg { background: var(--ml-surface, #ffffff); }',
      '```',
      '',
      'Never write a bare colour (`color: #1c1b1f`) — a deterministic gate rejects it, because nothing',
      'could ever override it. Do NOT define the tokens (`--ml-x: value`) and do NOT invent a visual',
      'style: pick neutral, conventional values as fallbacks. Mentioning themes, palettes or a named',
      'style anywhere in this file is wrong.',
      '',
      NM_NEUTRAL_TOKEN_VOCABULARY,
    ].join('\n');
  }
  const info = ctx.theme.info;
  const themeSkill = await loadThemeSkill(ctx);
  return [
    `## Mode: THEMED — ${info.displayName || info.name}`,
    '',
    'This sheet IS the molecule\'s appearance in this theme, so it must:',
    '',
    `- DEFINE at the top of the scope the \`--ml-*\` tokens the molecule consumes, with the theme's values;`,
    '- take an EXPLICIT motion stance (`transition: none` is a valid stance);',
    '- use the theme\'s literal values where the theme prescribes them (shadows, borders, radii).',
    '',
    '## Theme skill (the ONLY source of visual values)',
    '',
    themeSkill,
  ].join('\n');
}

async function loadThemeSkill(ctx: MoleculeContext): Promise<string> {
  const mod = await import(`/_${ctx.destination.project}_/l2/skills/theme.js`) as { skill?: unknown };
  if (typeof mod.skill !== 'string' || !mod.skill.trim()) {
    throw new Error(`[${AGENT_NAME}] theme skill unreadable for project ${ctx.destination.project}`);
  }
  return mod.skill;
}
