/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/steps/s3-indexts/agentSyIndexTs.ts" enhancement="_102027_/l2/enhancementAgent"/>

// s3-indexts: two modes, one step, decided by whether the group's index.ts exists when the step runs
// (flow.json decisions.e8bCreation_sameStepTwoModes) — never a flag the root passes.
//
// MIGRATION (G3, index.ts exists): deterministic text surgery, no LLM. Unchanged since E8a — see
// readme.md and CHANGELOG.md.
//
// CREATION (G1, no index.ts at all — E8b): the ONLY LLM call in this whole agent, one tool-call turn per
// group, same shape as agentNewMolecule2/steps/n7-index (prompt_ready + strict tool schema +
// afterPromptStep + a structural gate + retry up to NM_MAX_ATTEMPTS). The page must be born already in
// the migrated shape (never hand-written table markup — decisions.e8bCreation_pageIsBornMigrated); the
// model's scenarios are written into the group's index.defs.ts via the SAME renderer s1 uses
// (decisions.e8bCreation_rewriteViaRendererNotTextEdit), never a text edit.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  compileStorTs,
  isRecord,
  nmDefsFile,
  nmDestProject,
  nmFileExists,
  nmTsFile,
  parseMaybeJson,
  readJsonArtifact,
  readStorText,
  toDisplayPath,
  writeJsonArtifact,
  writeStorTextAtomic,
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
import { NM_MAX_ATTEMPTS } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTypes.js';
import {
  SY_AGENT_PROJECT,
  SY_SHARED_TABLE_IMPORT,
  SyIndexTsArtifact,
  SyMoleculeEntry,
  syGroupFolder,
  syIndexTsDoneAnchor,
  syIndexTsPlanId,
} from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syTypes.js';
import { syMigrateIndexTs } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syMigrateIndexTs.js';
import {
  syExtractMoleculeDefs,
  syExtractTag,
  syPublishedLayout,
  syVaryingAxes,
} from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syExtract.js';
import { syRenderIndexDefs } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syRenderDefs.js';
import { syResolveCreationScenarios } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syCreateIndexTs.js';
import {
  nmGroupDefsFile,
  nmGroupIndexFile,
  readSyAgentText,
  syIndexTsArtifactFileInfo,
  syIndexTsTraceFileInfo,
  syPublishToCache,
  syScanGroupMoleculeShortNames,
} from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syFs.js';
import { runSyCreateIndexTsGate } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/steps/s3-indexts/createGate.js';
import { skill as indexGroupPageSkill } from '/_102020_/l2/aura/molecules/skills/indexGroupPage.js';

const AGENT_NAME = 'agentSyIndexTs';
const TOOL_NAME = 'submitGroupIndex';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: SY_AGENT_PROJECT,
    agentFolder: 'aura/molecules/agentSyncMoleculeCatalog/steps/s3-indexts',
    agentDescription: "s3-indexts — migrates (G3, no LLM) or creates (G1, one LLM call) one group's index.ts.",
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

interface SyIndexTsStepArgs {
  group: string;
  purpose: string;
  usageContract: string;
}

function parseGroupArg(prompt: unknown): SyIndexTsStepArgs | null {
  const raw = typeof prompt === 'string' ? prompt : '';
  if (!raw.trim().startsWith('{')) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const group = typeof parsed.group === 'string' ? parsed.group.trim() : '';
    if (!group) return null;
    return {
      group,
      purpose: typeof parsed.purpose === 'string' ? parsed.purpose : '',
      usageContract: typeof parsed.usageContract === 'string' ? parsed.usageContract : '',
    };
  } catch {
    return null;
  }
}

async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);
  const stepArgs = nmParseStepArgs(step.prompt);
  const groupArgs = parseGroupArg(step.prompt);
  if (!stepArgs.runKey || !groupArgs) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `[${AGENT_NAME}] step args missing runKey/group`)];
  }
  const runKey = stepArgs.runKey;
  const canonical = groupArgs.group;
  const folder = syGroupFolder(canonical);
  const indexTsInfo = nmGroupIndexFile(folder, '.ts');

  // ⚠️ A retry continuation must NOT re-check file existence: creation mode writes index.ts
  // SPECULATIVELY, before the gate runs (same shape as n7-index, so gate + compile issues report
  // together) — so after a failed attempt the file exists on disk with BROKEN/incomplete content. Without
  // this check, the retry step's own beforePromptStep would see an existing index.ts and misroute into
  // migration mode, silently ending the retry loop instead of continuing it. retryAttempt is only ever
  // present on a step this agent itself planted via nmAgentStepIntent below (buildCreationPromptReady's
  // own retry branch never sets it), so its presence alone means "keep going in creation mode."
  const isRetryContinuation = typeof stepArgs.retryAttempt === 'number';
  if (!isRetryContinuation && nmFileExists(indexTsInfo)) {
    return runMigration(context, parentStep, step, hookSequential, runKey, canonical, folder, indexTsInfo);
  }

  return buildCreationPromptReady(context, parentStep, step, hookSequential, runKey, canonical, folder, groupArgs, stepArgs.retryAttempt || 1, stepArgs.retryContext || '');
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  // Only reached for creation mode: migration mode never returns a prompt_ready intent, so the
  // platform never invokes afterPromptStep for it (confirmed against every step-only agent in this
  // family — decisions.e8bCreation_sameStepTwoModes).
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);
  const stepArgs = nmParseStepArgs(step.prompt);
  const groupArgs = parseGroupArg(step.prompt);
  if (!stepArgs.runKey || !groupArgs) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `[${AGENT_NAME}] step args missing runKey/group`)];
  }
  return finishCreation(context, parentStep, step, hookSequential, stepArgs.runKey, groupArgs, stepArgs.retryAttempt || 1);
}

// =========================================================================== MIGRATION (G3, no LLM)

async function runMigration(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  runKey: string,
  canonical: string,
  folder: string,
  indexTsInfo: ReturnType<typeof nmGroupIndexFile>,
): Promise<mls.msg.AgentIntent[]> {
  const source = await readStorText(indexTsInfo, true);
  // The group's own level-2 file, by ABSOLUTE path — the house convention for every module in l2, and
  // the reason the first build's relative './index.defs' did not resolve in the Studio.
  const indexDefsReference = `/_${nmDestProject()}_/l2/molecules/${folder}/index.defs.js`;
  const result = syMigrateIndexTs(source, SY_SHARED_TABLE_IMPORT, indexDefsReference);

  const savedAt = new Date().toISOString();
  let artifact: SyIndexTsArtifact;

  if (result.changed) {
    // `true` = also set the editor model. Without it the migration reported 'migrated' and the page on
    // disk stayed unmigrated — measured 2026-08-26 (see s1-group for the full note).
    await writeStorTextAtomic(indexTsInfo, result.migrated, true);
    // Compiling publishes the page into the cache the preview bundles from, and is this step's only
    // compile gate — a migration that breaks the file must not report success (2026-08-26).
    const compiled = await compileStorTs(indexTsInfo, result.migrated);
    if (compiled.errors.length) {
      artifact = { schemaVersion: 1, savedAt, runKey, folder, canonical, status: 'failed', reason: `migrado, mas não compila: ${compiled.errors.slice(0, 3).join(' | ')}`, indexTsFile: toDisplayPath(indexTsInfo) };
      await writeJsonArtifact(syIndexTsArtifactFileInfo(runKey, folder), artifact);
      return [
        nmResultStepIntent(context, parentStep, { planId: syIndexTsDoneAnchor(canonical), dependsOn: [], stepTitle: artifact.reason as string, result: artifact }),
        nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', artifact.reason as string, 'input_output'),
      ];
    }
    artifact = { schemaVersion: 1, savedAt, runKey, folder, canonical, status: 'migrated', indexTsFile: toDisplayPath(indexTsInfo) };
  } else {
    artifact = { schemaVersion: 1, savedAt, runKey, folder, canonical, status: 'failed', reason: result.reason || 'unknown', indexTsFile: toDisplayPath(indexTsInfo) };
  }

  await writeJsonArtifact(syIndexTsArtifactFileInfo(runKey, folder), artifact);

  const note = artifact.status === 'migrated' ? `${folder}: index.ts migrado` : `${folder}: index.ts NÃO migrado — ${artifact.reason}`;
  return [
    nmResultStepIntent(context, parentStep, {
      planId: syIndexTsDoneAnchor(canonical),
      dependsOn: [],
      stepTitle: note,
      result: artifact,
    }),
    // A migration that could not apply is not a step failure — todo §3 gate list has no "must succeed"
    // requirement, and the group's catalog (s1/s2) is already written regardless (analysis §3: the
    // derivable must never be refém of the authored). The run reports it; it does not fail the batch.
    nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', note, 'input_output'),
  ];
}

// =========================================================================== CREATION (G1, one LLM call — E8b)

async function buildCreationPromptReady(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  runKey: string,
  canonical: string,
  folder: string,
  groupArgs: SyIndexTsStepArgs,
  attempt: number,
  retryContext: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);
  const project = nmDestProject();

  const moleculeShortNames = syScanGroupMoleculeShortNames(folder);
  if (!moleculeShortNames.length) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `[${AGENT_NAME}] no molecule files found under molecules/${folder}`)];
  }

  const promptMd = await readSyAgentText('steps/s3-indexts', 'createPrompt', '.md', true);
  const schemaRaw = await readSyAgentText('schemas', 's3-indexts-create.schema', '.json', true);
  const schema = parseMaybeJson(schemaRaw);
  if (!isRecord(schema)) throw new Error(`[${AGENT_NAME}] invalid s3-indexts-create schema`);

  const groupUsageSkill = await loadGroupUsageSkill(groupArgs.usageContract);

  const indexTag = syIndexTag(folder, project);
  const headerRef = syHeaderRef(folder, project);
  const indexDefsReference = syIndexDefsReference(folder, project);

  const systemPrompt = promptMd
    .split('{{indexReference}}').join(headerRef)
    .split('{{indexTag}}').join(indexTag)
    .split('{{groupCanonical}}').join(canonical)
    .split('{{moleculeFiles}}').join(moleculeShortNames.map(name => `\`${name}\``).join(', '))
    .split('{{indexGroupPage}}').join(indexGroupPageSkill)
    .split('{{indexDefsReference}}').join(indexDefsReference)
    .split('{{sharedTableReference}}').join(SY_SHARED_TABLE_IMPORT)
    .split('{{groupUsageSkill}}').join(groupUsageSkill)
    + `\n\n${buildVToolInstruction(TOOL_NAME, 'the group cannot be showcased with the given context')}`;

  const previousAttempt = await readPreviousCreationAttempt(runKey, folder, attempt);
  const humanPrompt = [
    `## Group\n${canonical} — ${groupArgs.purpose}`,
    previousAttempt.trim() ? `## The index you wrote last time — FIX IT, do not start over\n\`\`\`typescript\n${previousAttempt}\n\`\`\`` : '',
    retryContext ? `## What the gate rejected — fix ALL of these\n${retryContext}` : '',
  ].filter(Boolean).join('\n\n');

  return [{
    type: 'prompt_ready',
    args: step.prompt || JSON.stringify({ planId: syIndexTsPlanId(canonical), runKey, group: canonical, purpose: groupArgs.purpose, usageContract: groupArgs.usageContract }),
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt,
    humanPrompt,
    tools: [createVToolSchema(TOOL_NAME, 'Submit the complete group index.ts and its quick-reference scenarios', schema as Record<string, unknown>)],
    toolChoice: { type: 'function', function: { name: TOOL_NAME } },
  } as mls.msg.AgentIntentPromptReady];
}

async function finishCreation(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  runKey: string,
  groupArgs: SyIndexTsStepArgs,
  attempt: number,
): Promise<mls.msg.AgentIntent[]> {
  const canonical = groupArgs.group;
  const folder = syGroupFolder(canonical);
  const project = nmDestProject();
  const indexTsInfo = nmGroupIndexFile(folder, '.ts');
  const display = toDisplayPath(indexTsInfo);

  let indexTs = '';
  let rawScenarios: unknown = [];
  let extractError = '';
  try {
    const output = extractVToolOutput(step.interaction?.payload?.[0], TOOL_NAME, ['indexTs', 'scenarios']);
    if (output.status === 'failed') extractError = `model reported failure: ${output.trace.join('; ') || 'no reason'}`;
    else {
      indexTs = String(output.result.indexTs || '');
      rawScenarios = output.result.scenarios;
    }
  } catch (error) {
    extractError = error instanceof Error ? error.message : String(error);
  }

  // Written speculatively (same shape as n7-index): a structurally invalid attempt still gets compiled,
  // so gate + compile issues are reported TOGETHER in one retry round trip instead of two.
  let compileErrors: string[] = [];
  if (!extractError && indexTs.trim()) {
    await writeStorTextAtomic(indexTsInfo, indexTs, true);
    compileErrors = (await compileStorTs(indexTsInfo, indexTs)).errors;
  }

  const moleculeShortNames = syScanGroupMoleculeShortNames(folder);
  const gateIssues = extractError
    ? [{ code: 'extract', message: extractError }]
    : [
      ...runSyCreateIndexTsGate(indexTs, {
        indexTag: syIndexTag(folder, project),
        headerRef: syHeaderRef(folder, project),
        indexDefsReference: syIndexDefsReference(folder, project),
        sharedTableReference: SY_SHARED_TABLE_IMPORT,
        groupMoleculeShortNames: moleculeShortNames,
        groupFolder: folder,
      }),
      ...compileErrors.map(message => ({ code: 'compile', message })),
    ];
  const errorText = gateIssues.map(issue => `${issue.code}: ${issue.message}`).join('\n');

  await writeJsonArtifact(syIndexTsTraceFileInfo(runKey, folder, attempt), {
    savedAt: new Date().toISOString(),
    folder,
    attempt,
    ok: gateIssues.length === 0,
    ...(gateIssues.length ? { error: errorText, source: indexTs } : {}),
  });

  if (gateIssues.length > 0) {
    if (attempt >= NM_MAX_ATTEMPTS) {
      const artifact: SyIndexTsArtifact = { schemaVersion: 1, savedAt: new Date().toISOString(), runKey, folder, canonical, status: 'failed', reason: errorText, indexTsFile: display };
      await writeJsonArtifact(syIndexTsArtifactFileInfo(runKey, folder), artifact);
      return [
        nmResultStepIntent(context, parentStep, { planId: syIndexTsDoneAnchor(canonical), dependsOn: [], stepTitle: `${display} (not created)`, result: artifact }),
        nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `index.ts creation skipped after retry:\n${errorText}`, 'input_output'),
      ];
    }
    return [
      nmAgentStepIntent(context, parentStep, {
        agentName: AGENT_NAME,
        stepTitle: `${step.stepTitle || syIndexTsPlanId(canonical)} (retry)`,
        planId: `${syIndexTsPlanId(canonical)}-retry${attempt}`,
        prompt: { planId: syIndexTsPlanId(canonical), runKey, group: canonical, purpose: groupArgs.purpose, usageContract: groupArgs.usageContract, retryAttempt: attempt + 1, retryContext: errorText },
      }),
      nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `gate failed, retrying:\n${errorText}`, 'input_output'),
    ];
  }

  // Structurally valid AND compiles. Now the model's scenarios go into the group's index.defs.ts — the
  // SAME renderer s1 used to write it a moment ago, everything unchanged except scenarios[]
  // (decisions.e8bCreation_rewriteViaRendererNotTextEdit), never a text edit of the existing file.
  const { molecules, warnings } = await deriveGroupMolecules(folder, project);
  const { scenarios, droppedNames } = syResolveCreationScenarios(
    rawScenarios as Array<{ scenario?: unknown; recommended?: unknown }>,
    molecules.map(m => ({ shortName: m.shortName, tag: m.tag })),
  );

  const indexDefsText = syRenderIndexDefs({
    project,
    groupCanonical: canonical,
    groupFolder: folder,
    usageContract: groupArgs.usageContract,
    purpose: groupArgs.purpose,
    molecules,
    scenarios,
    generatedAt: new Date().toISOString(),
  });
  await writeStorTextAtomic(nmGroupDefsFile(folder), indexDefsText, true);
  const defsCompile = await compileStorTs(nmGroupDefsFile(folder), indexDefsText);
  const defsWarnings = [...warnings];
  if (defsCompile.errors.length) defsWarnings.push(`index.defs.ts não compila após gravar os cenários: ${defsCompile.errors.slice(0, 3).join(' | ')}`);
  // index.ts is never cached (nothing imports it by name — decisions.e8bCreation_indexTsNeverCached);
  // index.defs.ts IS, because index.ts (just written above) imports it by name and s1 already cached the
  // pre-scenario version earlier in this same run.
  const defsCache = await syPublishToCache(nmGroupDefsFile(folder));
  if (defsCache.error) defsWarnings.push(`index.defs.ts não entrou no cache (${defsCache.error}) — a página não vai conseguir importar molecules/scenarios`);

  const artifact: SyIndexTsArtifact = {
    schemaVersion: 1,
    savedAt: new Date().toISOString(),
    runKey,
    folder,
    canonical,
    status: 'created',
    indexTsFile: display,
    scenarioCount: scenarios.length,
    ...(droppedNames.length ? { droppedScenarioNames: droppedNames } : {}),
  };
  await writeJsonArtifact(syIndexTsArtifactFileInfo(runKey, folder), artifact);

  const note = [
    `${folder}: index.ts criado, ${scenarios.length} cenário(s)`,
    droppedNames.length ? `${droppedNames.length} nome(s) inventado(s) descartado(s): ${droppedNames.join(', ')}` : '',
    defsWarnings.length ? `⚠️ ${defsWarnings.join(' | ')}` : '',
  ].filter(Boolean).join(' — ');

  return [
    nmResultStepIntent(context, parentStep, { planId: syIndexTsDoneAnchor(canonical), dependsOn: [], stepTitle: note, result: { ...artifact, warnings: defsWarnings } }),
    nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', note, 'input_output'),
  ];
}

// ---- helpers ----

function syIndexTag(folder: string, project: number): string {
  return `molecules--${folder}--index-${project}`;
}
function syHeaderRef(folder: string, project: number): string {
  return `_${project}_/l2/molecules/${folder}/index.ts`;
}
function syIndexDefsReference(folder: string, project: number): string {
  return `/_${project}_/l2/molecules/${folder}/index.defs.js`;
}

async function loadGroupUsageSkill(skillReference: string): Promise<string> {
  if (!skillReference) return '(this group has no usage skill)';
  try {
    const mod = await import(skillReference) as { skill?: unknown };
    return typeof mod.skill === 'string' && mod.skill.trim() ? mod.skill : '(this group has no usage skill)';
  } catch {
    return '(this group has no usage skill)';
  }
}

async function readPreviousCreationAttempt(runKey: string, folder: string, attempt: number): Promise<string> {
  if (!attempt || attempt < 2) return '';
  const trace = await readJsonArtifact<{ source?: unknown }>(syIndexTsTraceFileInfo(runKey, folder, attempt - 1), false);
  return typeof trace?.source === 'string' ? trace.source : '';
}

/**
 * Re-derives the group's full SyMoleculeEntry[] the SAME way s1 (agentSyGroup) does — reusing the same
 * pure extraction helpers, not a new invention. Needed because syRenderIndexDefs re-renders the WHOLE
 * index.defs.ts (decisions.e8bCreation_rewriteViaRendererNotTextEdit); this agent does not read s1's own
 * SyGroupArtifact back (it does not carry the full molecule list, only short tags) to avoid widening that
 * contract for a step it does not own (todo §0.4, "não reabra o que já funciona").
 */
async function deriveGroupMolecules(folder: string, project: number): Promise<{ molecules: SyMoleculeEntry[]; warnings: string[] }> {
  const shortNames = syScanGroupMoleculeShortNames(folder);
  const warnings: string[] = [];
  const extracted: Array<{ tag: string; shortName: string; layoutConfig: Record<string, string>; objective: string | null; defsRef: string | null }> = [];

  for (const shortName of shortNames) {
    const tsSource = await readStorText(nmTsFile(folder, shortName), false);
    const tag = syExtractTag(tsSource);
    if (!tag) {
      warnings.push(`${shortName}.ts: nenhum @customElement encontrado — molécula ignorada`);
      continue;
    }
    const defsInfo = nmDefsFile(folder, shortName);
    const hasDefs = nmFileExists(defsInfo);
    const defsExtracted = hasDefs ? syExtractMoleculeDefs(await readStorText(defsInfo, false)) : null;
    if (hasDefs && !defsExtracted) warnings.push(`${shortName}.defs.ts: sem '# Objective' legível — tratada como sem contrato`);
    extracted.push({
      tag,
      shortName,
      layoutConfig: defsExtracted?.layoutConfig || {},
      objective: defsExtracted?.objective || null,
      defsRef: defsExtracted ? `/_${project}_/l2/molecules/${folder}/${shortName}.defs` : null,
    });
  }

  const varyingAxes = syVaryingAxes(extracted.filter(m => m.defsRef).map(m => m.layoutConfig));
  const molecules: SyMoleculeEntry[] = extracted
    .slice()
    .sort((a, b) => a.tag.localeCompare(b.tag))
    .map(m => ({
      tag: m.tag,
      shortName: m.shortName,
      layout: syPublishedLayout(m.layoutConfig, varyingAxes),
      defsRef: m.defsRef,
      objective: m.objective,
    }));

  return { molecules, warnings };
}
