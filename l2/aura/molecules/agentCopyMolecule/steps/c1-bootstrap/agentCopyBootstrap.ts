/// <mls fileReference="_102020_/l2/aura/molecules/agentCopyMolecule/steps/c1-bootstrap/agentCopyBootstrap.ts" enhancement="_102027_/l2/enhancementAgent"/>

// c1-bootstrap (NO LLM): admission of the WHOLE list + context assembly. See flow.json.
// It writes NOTHING into l2 — the first byte of a molecule is written by c3, after the
// collision checkpoint. A collision here is data, not a failure.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  C_AGENT_FOLDER,
  C_MOLECULE_EXTENSIONS,
  cContextFileInfo,
  cDestMoleculeFile,
  cDestProject,
  cFileExists,
  cMoleculeFile,
  cTraceFileInfo,
  listGroupMolecules,
  readStorText,
  toDisplayPath,
  writeJsonArtifact,
} from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cFs.js';
import {
  CopyContext,
  CopyItem,
  copyContextSummary,
} from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cContext.js';
import {
  CopyRef,
  copyModeForRefs,
  detectChain,
  expandRefs,
  extractExtendedClassName,
  extractOriginClassName,
  parseCopyRefs,
  refTag,
  MOLECULE_BASE_CLASS,
} from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cOrigin.js';
import { extractCopiedFrom } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cTemplates.js';
import { cDoneAnchor, cParseStepArgs, cResultStepIntent, cUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cSteps.js';
import { CBootstrapInputs, CItemProbe, formatIssues, runBootstrapGate } from '/_102020_/l2/aura/molecules/agentCopyMolecule/steps/c1-bootstrap/gate.js';
import { getCInput, getCRootPlan, getCRunKey } from '/_102020_/l2/aura/molecules/agentCopyMolecule/agentCopyMolecule.js';

const AGENT_NAME = 'agentCopyBootstrap';
const PLAN_ID = 'c1-bootstrap';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${C_AGENT_FOLDER}/steps/c1-bootstrap`,
    agentDescription: 'c1-bootstrap — deterministic admission of the whole list + context assembly',
    visibility: 'private',
    beforePromptStep,
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

  const input = getCInput(context);
  const rootPlan = getCRootPlan(context);
  const runKey = getCRunKey(context, cParseStepArgs(args || step.prompt).runKey);
  const destProject = cDestProject();

  // 1. parse the mention into references, 2. expand group references. Both deterministic.
  const parsed = parseCopyRefs(input.entryText);
  const mode = copyModeForRefs(parsed.refs);
  const expanded = expandRefs(parsed.refs, listGroupMolecules);

  // 3. probe every item BEFORE building anything: origin readable, chain resolved, depth <= 1.
  const probes: CItemProbe[] = [];
  const items: CopyItem[] = [];
  const copiedFromDate = new Date().toISOString().slice(0, 10);

  for (const ref of expanded.refs) {
    const probe = await probeItem(ref);
    probes.push(probe);
    if (!probe.tsFound || probe.chainError) continue;

    items.push(await buildItem(ref, probe));
  }

  const ctx: CopyContext | null = items.length || expanded.refs.length ? {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    runKey,
    destProject,
    mode,
    userLanguage: rootPlan.userLanguage,
    userNotes: input.notes,
    copiedFromDate,
    items,
  } : null;

  const gateInputs: CBootstrapInputs = {
    parseErrors: parsed.errors,
    expandErrors: expanded.errors,
    refsFound: parsed.refs.length,
    probes,
    context: ctx,
  };
  const issues = runBootstrapGate(gateInputs);

  if (issues.length || !ctx) {
    const message = formatIssues(issues) || 'admissão falhou';
    // The trace is written even on failure: it is the record of WHY nothing was copied.
    await writeJsonArtifact(cTraceFileInfo(runKey, PLAN_ID, 1), {
      savedAt: new Date().toISOString(),
      planId: PLAN_ID,
      entryText: input.entryText,
      refs: expanded.refs.map(ref => ref.ref),
      issues,
    });
    return [cUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }

  await writeJsonArtifact(cContextFileInfo(runKey), ctx);
  await writeJsonArtifact(cTraceFileInfo(runKey, PLAN_ID, 1), {
    savedAt: new Date().toISOString(),
    planId: PLAN_ID,
    summary: copyContextSummary(ctx),
    items: ctx.items.map(item => ({
      origin: item.origin.ref,
      shell: item.origin.chain.isShell ? item.origin.chain.parentRef : null,
      collision: item.collision?.files || null,
    })),
  });

  return [
    cResultStepIntent(context, parentStep, {
      planId: cDoneAnchor(PLAN_ID),
      dependsOn: [],
      stepTitle: copyContextSummary(ctx),
      result: {
        contextFile: toDisplayPath(cContextFileInfo(runKey)),
        runKey,
        mode: ctx.mode,
        items: ctx.items.length,
        collisions: ctx.items.filter(item => !!item.collision).length,
      },
    }),
    cUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', copyContextSummary(ctx), 'input_output'),
  ];
}

// Everything the gate needs to judge one item, read from the stor.
async function probeItem(ref: CopyRef): Promise<CItemProbe> {
  const originTs = await readStorText(cMoleculeFile(ref.project, ref.group, ref.shortName, '.ts'));
  const originLess = await readStorText(cMoleculeFile(ref.project, ref.group, ref.shortName, '.less'));
  const probe: CItemProbe = {
    ref: ref.ref,
    tsFound: !!originTs.trim(),
    className: extractOriginClassName(originTs) || '',
    chain: { isShell: false },
    parentTsFound: false,
    parentIsShell: false,
    lessFound: !!originLess.trim(),
  };
  if (!probe.tsFound) return probe;

  const { chain, error } = detectChain(originTs);
  probe.chain = chain;
  if (error) {
    probe.chainError = error;
    return probe;
  }
  if (!chain.isShell) return probe;

  const parentTs = await readStorText(cMoleculeFile(chain.parentProject as number, chain.parentGroup as string, chain.parentShortName as string, '.ts'));
  probe.parentTsFound = !!parentTs.trim();
  if (probe.parentTsFound) {
    probe.parentIsShell = extractExtendedClassName(parentTs) !== MOLECULE_BASE_CLASS;
  }
  return probe;
}

// The chain comes from the probe (read once, above) — never re-derived here.
async function buildItem(ref: CopyRef, probe: CItemProbe): Promise<CopyItem> {
  const files = {
    ts: toDisplayPath(cDestMoleculeFile(ref.group, ref.shortName, '.ts')),
    defs: toDisplayPath(cDestMoleculeFile(ref.group, ref.shortName, '.defs.ts')),
    less: toDisplayPath(cDestMoleculeFile(ref.group, ref.shortName, '.less')),
    html: toDisplayPath(cDestMoleculeFile(ref.group, ref.shortName, '.html')),
  };

  // Collision = ANY of the 4 destination files already exists (the Variant's criterion): a
  // leftover .less from an earlier copy surviving under a fresh .ts is the worse outcome.
  const existing: string[] = [];
  for (const extension of C_MOLECULE_EXTENSIONS) {
    const fileInfo = cDestMoleculeFile(ref.group, ref.shortName, extension);
    if (cFileExists(fileInfo)) existing.push(toDisplayPath(fileInfo));
  }
  let collisionCopiedFrom: string | undefined;
  if (existing.length) {
    // WHEN the existing copy was made is what makes 'replace' an informed choice.
    const existingTs = await readStorText(cDestMoleculeFile(ref.group, ref.shortName, '.ts'));
    collisionCopiedFrom = extractCopiedFrom(existingTs) || undefined;
  }

  return {
    origin: {
      ref: ref.ref,
      project: ref.project,
      group: ref.group,
      shortName: ref.shortName,
      tag: refTag(ref),
      className: probe.className,
      chain: probe.chain,
    },
    destination: { group: ref.group, files },
    collision: existing.length ? { files: existing, ...(collisionCopiedFrom ? { copiedFrom: collisionCopiedFrom } : {}) } : null,
    rename: null,
    skip: false,
  };
}
