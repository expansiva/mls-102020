/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i3-edit/agentIm2Edit.ts" enhancement="_102027_/l2/enhancementAgent"/>

// i3-edit — routes B and C. Applies the change to the artifacts triage named.
//
// The model returns targeted edits, never rewritten files (see applyEdits.ts for why). This step
// is the only one in the flow that writes into the molecule, so it is where the hard invariant
// lives: nothing outside the current project, and on a shell never the parent.
//
// COMPILATION IS MEASURED TWICE, before and after, because the gate judges the DELTA: a molecule
// that already fails to compile is not this run's fault, and refusing to fix a padding because of
// a pre-existing error would freeze the agent on molecules nobody asked to repair.
//
// A REJECTED ATTEMPT IS ROLLED BACK. See the comment at the failure branch: the molecule already
// works, so the run must leave it either changed and passing, or exactly as it was.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  compileStorLess,
  compileStorTs,
  isRecord,
  parseMaybeJson,
  readJsonArtifact,
  toDisplayPath,
  writeJsonArtifact,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import {
  buildVToolInstruction,
  createVToolSchema,
  extractVToolOutput,
  nmAgentStepIntent,
  nmParseStepArgs,
  nmResultStepIntent,
  nmUpdateStatusIntent,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.js';
import {
  IM_AGENT_FOLDER,
  IM_MAX_ATTEMPTS,
  ImArtifact,
  ImArtifactKind,
  ImContext,
  ImDefinitionDecision,
  ImInheritChoice,
  ImTriage,
  ImUnreachable,
  imDoneAnchor,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';
import {
  artifactOf,
  imContextFileInfo,
  imFileInfoFor,
  imTraceFileInfo,
  imTriageFileInfo,
  imWorkFile,
  readImAgentText,
  readGroupSkill,
  readParentTs,
  writeImSource,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imResolve.js';
import { getImRunKey } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imRootPlan.js';
import { ImEdit, ImFileState, applyEdits } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i3-edit/applyEdits.js';
import { ImEditedFile, runImEditGate } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i3-edit/gate.js';

const AGENT_NAME = 'agentIm2Edit';
const PLAN_ID = 'i3-edit';
const TOOL_NAME = 'submitEdits';

/** Artifacts this step is allowed to show and to write. i5 owns the playground, i6 the index. */
const EDITABLE: ImArtifactKind[] = ['defs', 'ts', 'less'];

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${IM_AGENT_FOLDER}/steps/i3-edit`,
    agentDescription: 'i3-edit — applies the change to the molecule artifacts',
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
  const { ctx, triage } = await readRun(runKey);
  // Route C only. On route B it is absent and renderInheritance falls back to the generic warning.
  const choice = await readJsonArtifact<ImInheritChoice>(imWorkFile(runKey, 'inherit'), false);

  // ROUTE C, 'parent': the human decided the fix belongs to the base component, which this agent
  // never edits. There is nothing for a model to do, so no prompt is emitted — the same declared
  // no-op shape i5-playground uses. i5, i6 and i7 follow and the run ends with the instruction.
  if (choice?.where === 'parent') {
    const summary = `nothing edited — the fix belongs to ${ctx.inheritance.parentReference || 'the base component'}`;
    return [
      nmResultStepIntent(context, parentStep, {
        planId: imDoneAnchor(PLAN_ID),
        dependsOn: [],
        stepTitle: summary,
        result: { touched: [], why: [], runKey, attempt: 1, skipped: 'parent' },
      }),
      nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', summary, 'input_output'),
    ];
  }

  const promptMd = await readImAgentText('steps/i3-edit', 'prompt', '.md', true);
  const schemaRaw = await readImAgentText('schemas', 'i3-edit.schema', '.json', true);
  const schema = parseMaybeJson(schemaRaw);
  if (!isRecord(schema)) throw new Error(`[${AGENT_NAME}] invalid i3-edit schema`);

  // ROUTE A: the definition change a human confirmed at the checkpoint. It is an instruction, not a
  // suggestion — they saw each line and dropped the ones they did not want.
  const definition = await readJsonArtifact<ImDefinitionDecision>(imWorkFile(runKey, 'definition'), false);

  // THE PARENT IS SHOWN ON EVERY SHELL, not only on route C. Until 2026-08-14 it arrived only with
  // the choice 'override', so a route-B edit on a shell was told "a local override of a parent
  // member" with the parent invisible — and the model wrote a member the parent does not have. The
  // one shell where it stays hidden is the choice 'less': that decision is about the stylesheet, and
  // the .ts is not even offered to applyEdits.
  const parentSource = await readParentSourceFor(ctx, choice);

  // THE GROUP CONTRACTS. Read, never written — see readGroupSkill for the decision and for the run
  // that measured what their absence costs.
  const groupCreation = await readGroupSkill(ctx.groupSkill.reference);
  const groupUsage = await readGroupSkill(ctx.groupSkill.usageReference);

  const systemPrompt = promptMd
    .split('{{tag}}').join(ctx.target.tag)
    .split('{{groupCanonical}}').join(ctx.target.groupCanonical)
    .split('{{userPrompt}}').join(ctx.userPrompt)
    .split('{{userLanguage}}').join(ctx.userLanguage || 'the language of the request')
    .split('{{triage}}').join(renderTriage(triage))
    .split('{{definitionChanges}}').join(renderDefinitionChanges(definition))
    .split('{{groupCreation}}').join(groupCreation || '(the group creation contract could not be read — rely on the molecule\'s own contract below)')
    .split('{{groupUsage}}').join(groupUsage || '(the group usage contract could not be read)')
    .split('{{inheritance}}').join(renderInheritance(ctx, choice))
    .split('{{files}}').join(renderFiles(ctx, triage, choice))
    .split('{{parentSource}}').join(
      parentSource
        ? `----- FILE: the PARENT, read-only (${ctx.inheritance.parentReference}) -----\n${parentSource}\n----- END FILE -----`
        : '',
    )
    .split('{{contract}}').join(ctx.contract.source.trim()
      ? (ctx.contract.inherited
        ? `The contract below belongs to this shell's PARENT (\`${ctx.contract.reference}\`) — it is what the molecule promises.\n\n${ctx.contract.source}`
        : ctx.contract.source)
      : '(the contract could not be read)')
    + `\n\n${buildVToolInstruction(TOOL_NAME, 'the change cannot be made from what is shown')}`;

  const humanPrompt = [
    `Edit ${ctx.target.tag}.`,
    parsedArgs.retryContext ? `## What the gate rejected — fix ALL of these, and re-copy every \`find\` from the files above\n${parsedArgs.retryContext}` : '',
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
    tools: [createVToolSchema(TOOL_NAME, 'Submit the targeted edits', schema as Record<string, unknown>)],
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
  const { ctx, triage } = await readRun(runKey);
  const choice = await readJsonArtifact<ImInheritChoice>(imWorkFile(runKey, 'inherit'), false);

  let edits: ImEdit[] = [];
  let extractError = '';
  try {
    const raw = extractVToolOutput(step.interaction?.payload?.[0], TOOL_NAME, ['edits']);
    if (raw.status === 'failed') extractError = `model reported failure: ${raw.trace.join('; ') || 'no reason'}`;
    else edits = normalizeEdits(raw.result.edits);
  } catch (error) {
    extractError = error instanceof Error ? error.message : String(error);
  }

  // Applying is pure and happens BEFORE anything is written: a set with one bad `find` is rejected
  // whole, so a half-applied edit never reaches the disk.
  const apply = extractError
    ? { changed: new Map<ImArtifactKind, string>(), errors: [`extract: ${extractError}`], applied: [] as string[] }
    : applyEdits(fileStates(ctx, choice), edits);

  if (apply.errors.length) {
    return retryOrFail(context, parentStep, step, hookSequential, runKey, attempt, apply.errors.join('\n'), edits);
  }

  // The compile baseline is taken from what is ON DISK, before the write. Two compiles per touched
  // file is the price of judging the delta; the alternative is refusing edits to any molecule that
  // already has an error.
  const written: ImEditedFile[] = [];
  const compileErrorsBefore: string[] = [];
  const compileErrors: string[] = [];

  for (const [kind, after] of apply.changed) {
    const artifact = artifactOf(ctx.artifacts, kind);
    const fileInfo = imFileInfoFor(ctx, kind);
    const before = artifact?.source || '';
    const created = !artifact?.present;

    if (!created) compileErrorsBefore.push(...await compileOf(kind, fileInfo, ''));
    await writeImSource(fileInfo, after);
    compileErrors.push(...await compileOf(kind, fileInfo, after));

    written.push({ kind, reference: artifact?.reference || toDisplayPath(fileInfo), before, after, created });
  }

  const gate = runImEditGate({
    files: written,
    currentProject: ctx.target.project,
    parentReference: ctx.inheritance.parentReference,
    parentSource: await readParentSourceFor(ctx, choice),
    // The route and the group's declared vocabulary: only route A may move the public surface, and
    // only the names the group already declares count as "the molecule was missing this".
    route: triage.route,
    // The union of both contracts: a name either of them declares is sanctioned by the group.
    groupSkill: [
      await readGroupSkill(ctx.groupSkill.reference),
      await readGroupSkill(ctx.groupSkill.usageReference),
    ].join('\n'),
    compileErrors,
    compileErrorsBefore,
  });
  const errorText = gate.errors.join('\n');

  await writeJsonArtifact(imTraceFileInfo(runKey, PLAN_ID, attempt), {
    savedAt: new Date().toISOString(),
    planId: PLAN_ID,
    attempt,
    ok: gate.ok,
    touched: written.map(f => f.kind),
    ...(gate.ok ? {} : { error: errorText, edits }),
  });

  if (!gate.ok) {
    // ROLLBACK, and this is where the flow deliberately differs from agentNewMolecule2. There, a
    // failed attempt leaves the file on disk so the retry can see its own broken output — the file
    // is NEW, so there is nothing to lose. Here the molecule already works. Leaving a half-applied
    // edit in it means a run that fails twice hands back a molecule in a worse state than it found,
    // which is the one outcome a tool like this must never produce.
    //
    // The retry loses nothing: it gets the gate errors, and the prompt shows the original files —
    // which is exactly the state its `find` strings have to match.
    for (const file of written) {
      await writeImSource(imFileInfoFor(ctx, file.kind), file.before);
    }
    return retryOrFail(context, parentStep, step, hookSequential, runKey, attempt, errorText, edits);
  }

  await writeJsonArtifact(imWorkFile(runKey, 'edit'), {
    savedAt: new Date().toISOString(),
    touched: written.map(f => ({ kind: f.kind, reference: f.reference, created: f.created })),
    why: edits.map(e => e.why.trim()).filter(Boolean),
    attempt,
  });

  const touched = written.map(f => f.kind);
  const summary = `edited: ${touched.join(', ')}`;
  return [
    nmResultStepIntent(context, parentStep, {
      planId: imDoneAnchor(PLAN_ID),
      dependsOn: [],
      stepTitle: summary,
      // i5-playground reads `touched` to decide whether the playground is affected.
      result: { touched, why: edits.map(e => e.why.trim()).filter(Boolean), runKey, attempt },
    }),
    nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', summary, 'input_output'),
  ];
}

// ---- helpers ----

async function readRun(runKey: string): Promise<{ ctx: ImContext; triage: ImTriage }> {
  const ctx = await readJsonArtifact<ImContext>(imContextFileInfo(runKey), true);
  if (!ctx) throw new Error(`[${AGENT_NAME}] context.json missing for ${runKey}`);
  const triage = await readJsonArtifact<ImTriage>(imTriageFileInfo(runKey), true);
  if (!triage) throw new Error(`[${AGENT_NAME}] triage.json missing for ${runKey}`);
  return { ctx, triage };
}

async function compileOf(kind: ImArtifactKind, fileInfo: ReturnType<typeof imFileInfoFor>, source: string): Promise<string[]> {
  if (kind === 'ts' || kind === 'defs') return (await compileStorTs(fileInfo, source)).errors;
  if (kind === 'less') return compileStorLess(fileInfo, source);
  return [];
}

/**
 * Only the editable artifacts are offered to applyEdits — i5 owns the playground, i6 the index.
 *
 * ⚠️ On route C the HUMAN's choice narrows this further, and it is enforced HERE rather than asked
 * of the model. 2026-08-10: with the choice 'less', the model edited the `.ts` anyway — the prompt
 * said not to, and the triage's expectedArtifacts said `ts`, and the triage won. An instruction the
 * model can lose an argument with is not an instruction; a Map it cannot reach is.
 */
function fileStates(ctx: ImContext, choice: ImInheritChoice | null): Map<ImArtifactKind, ImFileState> {
  const allowed = choice?.where === 'less' ? (['less'] as ImArtifactKind[]) : EDITABLE;
  const out = new Map<ImArtifactKind, ImFileState>();
  for (const kind of allowed) {
    const artifact = artifactOf(ctx.artifacts, kind);
    out.set(kind, { present: !!artifact?.present, source: artifact?.source || '' });
  }
  return out;
}

function normalizeEdits(raw: unknown): ImEdit[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRecord).map(item => ({
    artifact: String(item.artifact || '') as ImArtifactKind,
    op: (String(item.op || 'replace') as ImEdit['op']),
    find: typeof item.find === 'string' ? item.find : undefined,
    content: typeof item.content === 'string' ? item.content : '',
    why: typeof item.why === 'string' ? item.why : '',
  }));
}

/**
 * The files, verbatim. NOT fenced with backticks: a `.defs.ts` carries a markdown skill full of
 * them, and a fence would end in the middle of the file. The model must copy `find` character for
 * character, so nothing may be added to the content — no line numbers, no indentation fixes.
 */
function renderFiles(ctx: ImContext, triage: ImTriage, choice: ImInheritChoice | null): string {
  // The human's route C choice wins over the triage's prediction: it was made at a checkpoint with
  // the cost of each option on screen.
  if (choice?.where === 'less') {
    const less = artifactOf(ctx.artifacts, 'less');
    return less
      ? `----- FILE: less (${less.reference}) -----\n${less.source}\n----- END FILE: less -----`
      : '----- FILE: less — DOES NOT EXIST YET, use op "create" -----';
  }
  // ROUTE A names no artifacts — the i2 gate forbids it, because on a rebuild the plan decided what
  // to write. Here the confirmed definition change decides, and it always lands in the same two
  // files: the contract that states the promise and the code that keeps it.
  const wanted = triage.route === 'A'
    ? (['defs', 'ts'] as ImArtifactKind[])
    : EDITABLE.filter(kind => triage.expectedArtifacts.includes(kind));
  // The .ts is always shown: it is what the .less styles and what the .defs.ts describes, so an
  // edit to either is decided by reading it.
  if (!wanted.includes('ts')) wanted.unshift('ts');

  const blocks: string[] = [];
  for (const kind of wanted) {
    const artifact = artifactOf(ctx.artifacts, kind);
    if (!artifact) continue;
    blocks.push(
      artifact.present
        ? `----- FILE: ${kind} (${artifact.reference}) -----\n${artifact.source}\n----- END FILE: ${kind} -----`
        : `----- FILE: ${kind} (${artifact.reference}) — DOES NOT EXIST YET, use op "create" -----`,
    );
  }
  return blocks.join('\n\n');
}

function renderTriage(triage: ImTriage): string {
  return [
    `Route **${triage.route}** — ${triage.rationale}`,
    '',
    `Artifacts expected to change: ${triage.expectedArtifacts.join(', ') || '(none named)'}`,
  ].join('\n');
}

/**
 * On a shell, the one thing the model must be told it cannot do — plus, on route C, the decision a
 * HUMAN already made about where the fix goes. That decision is not advice: it was chosen at a
 * checkpoint with the cost of each option spelled out, and this step executes it.
 */
function renderInheritance(ctx: ImContext, choice: ImInheritChoice | null): string {
  const inh = ctx.inheritance;
  if (!inh.isShell) return '';

  const lines = [
    '## This molecule is a shell',
    '',
    `It extends \`${inh.parentClassName}\` from \`${inh.parentReference}\`, which lives in ANOTHER project.`,
    '',
    '**You cannot edit the parent, and you must not try.**',
  ];

  // ROUTE B ON A SHELL — no human checkpoint happened, so this text is the only thing standing
  // between the model and an invented member. Until 2026-08-14 it said "a local override of a parent
  // member" and stopped there, with the parent's source not even in the prompt.
  if (!choice) {
    lines.push(
      '',
      'The fix goes in this molecule\'s own files: the `.less` first. An override in the `.ts` only when',
      'the member you need is one the parent **actually declares** and a subclass can reach — the',
      'parent\'s source is printed further down, read-only, so you can check instead of assuming.',
      '',
      '### Members of the parent this shell CANNOT reach',
      '',
      renderUnreachable(inh.unreachableMembers),
      '',
      'Measured from the parent\'s source, not guessed.',
      '',
      '**A name the parent does not declare is not an override.** It is a new field of this class, and',
      'since every line of behaviour still runs in the parent, nothing will ever read it: the molecule',
      'keeps doing exactly what it did, and the run reports a change that did not happen. This has',
      'shipped — a duration held in a module constant, "changed" by declaring a property beside it.',
      '',
      'So if what has to change lives in one of the members above, **no edit in this shell can express',
      'it**. Report the failure with that as the reason and write nothing. That answer is correct and',
      'useful; an edit that compiles and changes no behaviour is neither.',
    );
    return lines.join('\n');
  }

  lines.push('', '### The human already decided where this fix goes', '');
  if (choice.where === 'less') {
    lines.push('**In this molecule\'s `.less`, and only there.** Do not touch the `.ts`: the decision was that');
    lines.push('this is an appearance change, and moving it into code would take the shell out of inheritance');
    lines.push('for no reason.');
  } else {
    lines.push(`**By overriding \`${choice.member}\` in this molecule's own class.** Add that member to the shell`);
    lines.push('and nothing more. Every other behaviour keeps coming from the parent, which is the point of a');
    lines.push('shell — do not copy the parent\'s implementation across to "have it here".');
    lines.push('');
    lines.push('The parent\'s source is printed below, read-only. Read it before writing the override:');
    lines.push('');
    lines.push(`- **match the parent's signature exactly** — same name, same parameter types, and the SAME`);
    lines.push('  visibility. A member the parent declares `public` cannot be overridden as `protected`, and a');
    lines.push('  parameter type that is merely similar does not compile.');
    lines.push('- **only touch what the parent exposes.** Its `private` members do not exist as far as this');
    lines.push('  class is concerned. If the behaviour you need depends on one of them, this override cannot');
    lines.push('  work — say so in the `why` and change nothing.');
    lines.push('- call `super.<member>(...)` when the parent\'s behaviour should still happen first.');
  }
  return lines.join('\n');
}

/**
 * The parent's source, on every shell except the route-C choice 'less'.
 *
 * Both consumers need it for the same reason: without the parent, an invented member and a real
 * override are indistinguishable — to the model writing one, and to the gate judging it.
 */
async function readParentSourceFor(ctx: ImContext, choice: ImInheritChoice | null): Promise<string> {
  if (!ctx.inheritance.isShell || !ctx.inheritance.parentReference) return '';
  if (choice?.where === 'less') return '';
  return readParentTs(ctx.inheritance.parentReference);
}

/**
 * What the shell cannot reach. Capped like i4-inherit's copy of this: on a molecule with an i18n
 * block the list runs long, and the first names are the ones the request is about.
 */
function renderUnreachable(members: ImUnreachable[] | undefined): string {
  const list = members || [];
  if (!list.length) return '- (none detected — every member of the parent is reachable, or its source could not be read)';
  const shown = list.slice(0, 12).map(m => m.why === 'private'
    ? `- \`${m.name}\` — private: an override does not compile`
    : `- \`${m.name}\` — module-scope constant: not a class member, no subclass can change it`);
  if (list.length > shown.length) shown.push(`- (and ${list.length - shown.length} more)`);
  return shown.join('\n');
}

/**
 * ROUTE A — the confirmed definition change, as an instruction.
 *
 * Empty on every other route, and that is what makes the section conditional in the prompt: on B and
 * C the contract may only be corrected for wording, and on A it is the thing being changed.
 */
function renderDefinitionChanges(definition: ImDefinitionDecision | null): string {
  if (!definition?.changes?.length) return '';
  const lines = definition.changes.map(change => {
    const what = change.op === 'rename'
      ? `RENAME ${change.kind} \`${change.previousName}\` to \`${change.name}\``
      : `${change.op.toUpperCase()} ${change.kind} \`${change.name}\``;
    return `- **${what}** — ${change.purpose}`;
  });
  return [
    '## The definition change a HUMAN confirmed',
    '',
    'This is route A: the molecule\'s public surface moves, and these are the movements that were',
    'confirmed at a checkpoint. They are an instruction, not a suggestion — every line was shown and',
    'the ones the user did not want were dropped before you were called.',
    '',
    ...lines,
    '',
    '**Do exactly these and nothing more.** Two files change together and neither may lag the other:',
    '',
    '- the **`.defs.ts`** — the sentence that states the promise. Write it in the contract\'s own',
    '  voice, next to the sentences already there; do not restate the whole contract and do not',
    '  reformat what you are not changing;',
    '- the **`.ts`** — the code that keeps it: `slotTags` for a slot, an `@propertyDataSource`',
    '  declaration for a property, a `new CustomEvent` dispatch for an event, plus the render that',
    '  actually uses it. A slot declared and never read is the defect this library already has 9 of.',
    '',
    'A later step regenerates the playground from the surface you leave behind, so the surface has to',
    'be real: a promise in the contract with no code behind it produces a demo of something that does',
    'not work.',
  ].join('\n');
}

function retryOrFail(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  runKey: string,
  attempt: number,
  errorText: string,
  edits: ImEdit[],
): mls.msg.AgentIntent[] {
  if (attempt >= IM_MAX_ATTEMPTS) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `${PLAN_ID} failed after ${attempt} attempts:\n${errorText}`)];
  }
  return [
    nmAgentStepIntent(context, parentStep, {
      agentName: AGENT_NAME,
      stepTitle: `${step.stepTitle || PLAN_ID} (retry)`,
      planId: `${PLAN_ID}-retry${attempt}`,
      prompt: { planId: PLAN_ID, runKey, retryAttempt: attempt + 1, retryContext: errorText },
    }),
    nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `gate failed after ${edits.length} edit(s), retrying:\n${errorText}`, 'input_output'),
  ];
}
