/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/agentSyncMoleculeCatalog.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Root of agentSyncMoleculeCatalog (spec: flow.json / spec.md in this folder).
// Entry: '@@agentSyncMoleculeCatalog [atualizar [grupo(s)] <lista ou all>] [incluindo o arquivo index.ts]'
//
// ⚠️ THIS ROOT SPENDS NO LLM CALL, EVER. Which groups to generate, and which of them need index.ts
// migrated (G3) or created (G1 — E8b), are ALL deterministic — word matching (helpers/syEntry), a stor
// scan (helpers/syDiscover + helpers/syFs), and a text check (helpers/syMigrateIndexTs), never a
// classifier. So this root's own bootstrap uses AgentIntentAddMessageAI.skipRootLLM (the same mechanism
// agentChangeFrontend already ships with) to get the step tree the platform needs without spending a
// call on a decision that was never a classification to begin with. The ONE LLM call this agent ever
// spends (E8b, creation mode) happens INSIDE the planted s3 step, per G1 group — never here.
//
// ⚠️ SINCE E8, BOTH index.ts MIGRATION (G3) AND CREATION (G1, E8b) ARE AUTOMATIC — the mention's opt-in
// phrase ('incluindo o arquivo index.ts') no longer gates either. Migration is deterministic, safe and
// reversible (the gate in helpers/syMigrateIndexTs.ts either applies cleanly or changes nothing);
// creation is a single gated, retried LLM turn with the same safe-failure shape as
// agentNewMolecule2/n7-index (a group that cannot be created is reported, never left half-written) — see
// flow.json `decisions.migrationIsAutomatic` / `decisions.e8bCreation_targetChanged`. The opt-in phrase
// is still parsed and still recorded (SyRunInput.includeIndexTsRequested) for s4's summary line, but no
// longer changes what runs.
//
// ⚠️ NO TWO-PHASE PLANTING, unlike agentChooseMolecules. That family's fan-out needs a second phase
// because c1's answer (which groups an LLM chose) is not known until c1 runs. Here discovery is a stor
// scan this root can do itself, synchronously, so every step — s1 per group, s3 per G3-or-G1 group, s2,
// s4 — is planted in this single batch, dependency edges and all.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { isBareMention, stripAgentMention } from '/_102020_/l2/aura/molecules/shared/mentionEntry.js';
import { nmFileExists, readStorText, writeJsonArtifact } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { nmUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.js';
import { syParseEntry } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syEntry.js';
import { syDiscoverGroups, syResolveRequested, syUnknownGroupsMessage } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syDiscover.js';
import { syMoleculesNotShown, syNeedsIndexTsCreation, syNeedsIndexTsMigration, syNeedsIndexTsRegeneration } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syMigrateIndexTs.js';
import {
  SY_AGENT_PROJECT,
  SY_PLAN_S2,
  SY_PLAN_S4,
  SyRegenerationTrigger,
  SyRunInput,
  syDoneAnchor,
  syGroupDoneAnchor,
  syGroupPlanId,
  syIndexTsDoneAnchor,
  syIndexTsPlanId,
} from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syTypes.js';
import { nmGroupIndexFile, syInputFileInfo, syScanGroupMoleculeShortNames, syScanProjectGroupFolders, sySkillList } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syFs.js';

const AGENT_NAME = 'agentSyncMoleculeCatalog';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: SY_AGENT_PROJECT,
    agentFolder: 'aura/molecules/agentSyncMoleculeCatalog',
    agentDescription:
      "Generates l2/molecules/skill.ts (level 1) and each group's index.defs.ts + index.html (level 2) from the molecule files already in the project. Deterministic — no LLM in the default path. '@@agentSyncMoleculeCatalog [atualizar grupo(s) <lista ou all>] [incluindo o arquivo index.ts]'.",
    visibility: 'public',
    beforePromptImplicit,
    afterPromptStep,
  };
}

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const text = stripAgentMention(userPrompt, agent.agentName);
  const raw = isBareMention(text) ? '' : text;

  // ⚠️ NOTHING HERE THROWS, and that is the point. The platform's executeBeforePromptStream has no
  // try/catch around beforePromptImplicit, so a throw becomes an uncaught promise rejection in the
  // browser console and the user sees an EMPTY SCREEN — measured on a real Studio run, 2026-08-26, on
  // '@@agentSyncMoleculeCatalog atualizar grupo groupEnterDate' in a project without that group. The
  // message was correct and reached nobody.
  //
  // So every user-input problem becomes a `refusal` carried in input.json, the run is created anyway,
  // and s4 alone is planted: the report is the only channel that reaches the human. This also makes the
  // unknown-group path the report was ALREADY built for (`unknown`) reachable for the first time.
  const entry = syParseEntry(raw);
  const discovery = syDiscoverGroups(syScanProjectGroupFolders(), sySkillList());
  const resolved = entry.error ? { selected: [], requestedButIgnored: [], unknown: [] } : syResolveRequested(discovery, entry);

  let refusal = '';
  if (entry.error) {
    refusal = entry.error;
  } else if (!resolved.selected.length) {
    refusal = resolved.unknown.length
      ? syUnknownGroupsMessage(resolved.unknown, discovery)
      : resolved.requestedButIgnored.length
        ? `todos os grupos pedidos estão fora do catálogo: ${resolved.requestedButIgnored.map(group => `${group.folder} (${group.reason})`).join('; ')}`
        : 'nenhum grupo com entrada em skills/index.ts foi encontrado no projeto';
  }

  // E8 triggers, per matched group: G1 (no index.ts at all) gets its page CREATED automatically since
  // E8b (one LLM call, planted below); G3 (index.ts exists and still has the pre-migration code table)
  // migrates AUTOMATICALLY, no opt-in needed — flow.json `decisions.migrationIsAutomatic` explains why
  // neither is gated behind entry.includeIndexTs. G4 (decision of 2026-08-27): G1 and G3
  // both false (the page exists AND is already migrated) but renderShowcaseCards() — still static Lit
  // code, unlike the reference table — doesn't show every molecule of the group. Checked only once G1/G3
  // are ruled out, since a G1/G3 group already gets a full rewrite (creation) or has nothing to say yet
  // about its cards (migration only touches the reference table).
  const migrationGroups: string[] = [];
  const creationGroups: string[] = [];
  const regenerationGroups: SyRegenerationTrigger[] = [];
  for (const group of resolved.selected) {
    const indexTsInfo = nmGroupIndexFile(group.folder, '.ts');
    const exists = nmFileExists(indexTsInfo);
    if (syNeedsIndexTsCreation(exists)) {
      creationGroups.push(group.canonical);
      continue;
    }
    const source = await readStorText(indexTsInfo, false);
    if (syNeedsIndexTsMigration(exists, source)) {
      migrationGroups.push(group.canonical);
      continue;
    }
    const missing = syMoleculesNotShown(source, group.folder, syScanGroupMoleculeShortNames(group.folder));
    if (syNeedsIndexTsRegeneration(missing)) {
      regenerationGroups.push({ canonical: group.canonical, missingMoleculeCount: missing.length });
    }
  }

  const runKey = syRunKeyFromNow();
  const input: SyRunInput = {
    schemaVersion: 1,
    savedAt: new Date().toISOString(),
    runKey,
    mentionRaw: raw,
    wantsAll: entry.wantsAll,
    includeIndexTsRequested: entry.includeIndexTs,
    matchedGroups: resolved.selected.map(group => group.canonical),
    indexTsMigrationGroups: migrationGroups,
    indexTsCreationGroups: creationGroups,
    indexTsRegenerationGroups: regenerationGroups,
    // Batch-only (D4): naming every OTHER ignored group in the project is noise on a targeted request —
    // requestedButIgnored already covers what the human asked about.
    ignoredGroups: entry.wantsAll ? discovery.ignored : [],
    requestedButIgnoredGroups: resolved.requestedButIgnored,
    // Reported by s4, never thrown. A name the mention got wrong is information, not a crash — and when
    // OTHER named groups were valid, the run generates those and reports this one alongside.
    unknownGroups: resolved.unknown,
    // Every group of the project, so s2 can rewrite level 1 WHOLE without deleting the groups this run
    // did not target. See SyRunInput.catalogGroups for what that cost before it existed.
    catalogGroups: discovery.matched,
    ...(refusal ? { refusal } : {}),
  };
  await writeJsonArtifact(syInputFileInfo(runKey), input);

  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    skipRootLLM: true,
    request: {
      action: 'addMessageAI',
      agentName: AGENT_NAME,
      inputAI: [
        {
          type: 'system',
          content: `${AGENT_NAME} deterministic bootstrap. The root LLM is skipped by AgentIntentAddMessageAI.skipRootLLM — scope was decided by helpers/syEntry.ts and helpers/syDiscover.ts, both pure word/data matching.`,
        },
        { type: 'human', content: raw || AGENT_NAME },
      ],
      taskTitle: refusal
        ? 'Sync molecule catalog: nada a gerar'
        : `Sync molecule catalog: ${resolved.selected.length === 1 ? resolved.selected[0].canonical : `${resolved.selected.length} grupos`}`,
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: { flowName: AGENT_NAME, runKey },
    },
  };

  const intents: mls.msg.AgentIntent[] = [addMessageAI];

  // Nothing to generate: s4 alone, and it runs immediately. The report is the only thing that reaches
  // the human, so a refused run is still a run — it just produces a report and no files.
  if (refusal) {
    intents.push(
      bootstrapAddStepIntent(context, {
        planId: SY_PLAN_S4,
        agentName: 'agentSyReport',
        title: 's4 · relatório',
        dependsOn: [],
        status: 'waiting_human_input',
        prompt: { planId: SY_PLAN_S4, runKey },
      }),
    );
    return intents;
  }

  for (const group of resolved.selected) {
    intents.push(
      bootstrapAddStepIntent(context, {
        planId: syGroupPlanId(group.canonical),
        agentName: 'agentSyGroup',
        title: `s1 · ${group.canonical}`,
        dependsOn: [],
        status: 'waiting_human_input',
        prompt: { planId: syGroupPlanId(group.canonical), runKey, group: group.canonical, purpose: group.purpose, usageContract: group.usageContract },
      }),
    );
  }
  // s3: planted for a G3 (migration), G1 (creation, E8b) or G4 (regeneration) group — dependsOn just
  // that group's own s1 anchor (index.defs.ts must exist before index.ts starts importing it, and
  // creation/regeneration mode re-renders it with the model's scenarios), not the whole batch. Never
  // planted for a group with no trigger at all — a group without a trigger does not get a step, it is
  // not a step that runs and decides to do nothing (the brief §1 / §5). All three triggers plant the SAME
  // agent/step (decisions.e8bCreation_sameStepTwoModes); purpose/usageContract are passed through
  // exactly like s1 gets them, so s3 does not need to re-read skills/index.ts.
  //
  // ⚠️ THE MODE IS DECIDED HERE, NOT INSIDE s3 (G4 the brief §3.1). s3 used to infer migrate-vs-create from
  // whether index.ts exists on disk — correct for G1/G3, but a G4 group's file DOES exist, so that
  // inference would pick migration (a no-op on an already-migrated page) and the run would report
  // success without ever touching the missing cards. The root already knows which trigger fired, so it
  // passes the mode explicitly instead of asking s3 to re-derive it.
  const purposeByCanonical = new Map(resolved.selected.map(group => [group.canonical, group]));
  const indexTsPlantings: Array<{ canonical: string; mode: 'migrate' | 'create'; regenerationMissingCount?: number }> = [
    ...migrationGroups.map(canonical => ({ canonical, mode: 'migrate' as const })),
    ...creationGroups.map(canonical => ({ canonical, mode: 'create' as const })),
    ...regenerationGroups.map(g => ({ canonical: g.canonical, mode: 'create' as const, regenerationMissingCount: g.missingMoleculeCount })),
  ];
  for (const planting of indexTsPlantings) {
    const group = purposeByCanonical.get(planting.canonical);
    intents.push(
      bootstrapAddStepIntent(context, {
        planId: syIndexTsPlanId(planting.canonical),
        agentName: 'agentSyIndexTs',
        title: `s3 · ${planting.canonical}`,
        dependsOn: [syGroupDoneAnchor(planting.canonical)],
        status: 'waiting_dependency',
        prompt: {
          planId: syIndexTsPlanId(planting.canonical),
          runKey,
          group: planting.canonical,
          purpose: group?.purpose || '',
          usageContract: group?.usageContract || '',
          mode: planting.mode,
          ...(planting.regenerationMissingCount !== undefined ? { regenerationMissingCount: planting.regenerationMissingCount } : {}),
        },
      }),
    );
  }

  intents.push(
    bootstrapAddStepIntent(context, {
      planId: SY_PLAN_S2,
      agentName: 'agentSyProject',
      title: 's2 · skill.ts',
      dependsOn: resolved.selected.map(group => syGroupDoneAnchor(group.canonical)),
      status: 'waiting_dependency',
      prompt: { planId: SY_PLAN_S2, runKey },
    }),
  );
  intents.push(
    bootstrapAddStepIntent(context, {
      planId: SY_PLAN_S4,
      agentName: 'agentSyReport',
      title: 's4 · relatório',
      dependsOn: [
        syDoneAnchor(SY_PLAN_S2),
        ...migrationGroups.map(syIndexTsDoneAnchor),
        ...creationGroups.map(syIndexTsDoneAnchor),
        ...regenerationGroups.map(g => syIndexTsDoneAnchor(g.canonical)),
      ],
      status: 'waiting_dependency',
      prompt: { planId: SY_PLAN_S4, runKey },
    }),
  );

  return intents;
}

/** The root's own "LLM" step never called a model (skipRootLLM) — nothing to read from its payload. */
async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);
  return [
    nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'Root bootstrap completed without using the model payload (deterministic scope, no classifier).'),
  ];
}

// ---- helpers ----

/**
 * Planted with `parentStepId: 1`, same as agentChangeFrontend's bootstrap: there is no real parent step
 * object yet at this point in beforePromptImplicit — the addMessageAI intent in the same batch is what
 * creates it, and the platform's own convention for "the step this message became" is id 1.
 */
function bootstrapAddStepIntent(
  context: mls.msg.ExecutionContext,
  args: { planId: string; agentName: string; title: string; dependsOn: string[]; status: mls.msg.AIStepStatus; prompt: Record<string, unknown> },
): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: '',
    parentStepId: 1,
    step: {
      type: 'agent',
      stepId: 0,
      interaction: null,
      stepTitle: args.title,
      status: args.status,
      nextSteps: [],
      agentName: args.agentName,
      prompt: JSON.stringify(args.prompt),
      rags: [],
      planning: { planId: args.planId, dependsOn: args.dependsOn, executionMode: 'sequential', executionHost: 'client' },
    } as mls.msg.AIAgentStep,
  } as mls.msg.AgentIntentAddStep;
}

/** Timestamp-based, always unique — a slug proposed from prose can collide across similar runs. */
function syRunKeyFromNow(): string {
  const iso = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '');
  return `sync-${iso.toLowerCase()}`;
}
