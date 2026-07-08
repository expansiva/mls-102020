/// <mls fileReference="_102020_/l2/agentImplementGenome/agentReconcileTokens.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Reconcile molecule tokens (--ml-*) to the design-system tokens (--ds-*). ONE per DS
// (barrier over all gen:<page> steps) — NOT per page: the --ml-* vocabulary is shared across
// groups and the mapping is semantic (role→role), so it's a property of (DS, used-groups).
//
// beforePromptStep → collect the used groups' --ml-* vocabulary + the DS's theme entry from
//   designSystem.ts; if the version (theme signature/mlVocabHash) is unchanged, skip the LLM.
//   Otherwise prompt the LLM to map each --ml-* → a --ds-* expression (direct/derived/keep).
// afterPromptStep  → validate the picks against the vocab + the DS's real --ds-* vars, merge the
//   manual `pinned` overrides, write the resulting ml-* tokens INTO the designSystem.ts entry
//   (single home of the tokens) and keep the agent state in designSystems[ds].tokenReconciliation.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { buildWorkItem } from '/_102020_/l2/dsMatch/derivePaths.js';
import { readThemes, writeTheme } from '/_102020_/l2/dsMatch/buildDesignSystemTs.js';
import { IDesignSystemTokens } from '/_102029_/l2/designSystemBase.js';
import {
  buildMlVocab, readPageGroups, mlVocabHash, dsTokensHash,
  type MlToken, type DsTokenReconciliation,
} from '/_102020_/l2/dsMatch/mlTokenVocab.js';
import { getConfigProject, updateConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { parseStepArgs, mkCompleted, mkFail } from '/_102020_/l2/agentImplementGenome/planning.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentReconcileTokens',
    agentProject: 102020,
    agentFolder: 'agentImplementGenome',
    agentDescription: 'Map molecule tokens (--ml-*) to the DS tokens (--ds-*), once per DS',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
  };
}

// ─── shared derivation (deterministic; recomputed in before + after) ─────────

interface ReconInputs {
  theme: IDesignSystemTokens;
  existing: DsTokenReconciliation | undefined;
  usedGroups: string[];
  vocab: MlToken[];
  dsVars: Set<string>;
  version: string;
}

/** The DS's --ds-* vars, derived from its theme entry (skips _dark-/ml-/custom keys). */
function themeDsVars(theme: IDesignSystemTokens): string[] {
  const names: string[] = [];
  for (const k of Object.keys(theme.color ?? {})) if (/^ds-/.test(k)) names.push(`--${k}`);
  for (const k of Object.keys(theme.typography ?? {})) if (/^ds-font-/.test(k)) names.push(`--${k}`);
  for (const k of Object.keys(theme.global ?? {})) if (k === 'ds-radius' || k === 'ds-border-w') names.push(`--${k}`);
  return [...new Set(names)];
}

/** Staleness signature of the DS styling — EXCLUDES the ml-* tokens this agent writes,
 *  otherwise every reconciliation would invalidate its own version. */
function themeSignature(theme: IDesignSystemTokens): string {
  const global = Object.fromEntries(Object.entries(theme.global ?? {}).filter(([k]) => !/^ml-/.test(k)));
  return dsTokensHash({ color: theme.color, typography: theme.typography, global, fonts: theme.fonts });
}

async function deriveInputs(project: number, a: ReturnType<typeof parseStepArgs>): Promise<ReconInputs | null> {
  const config: any = await getConfigProject(project);
  const dsEntry = config?.designSystems?.[String(a.ds)];
  const dsName = dsEntry?.name;
  if (!dsName) return null;
  const theme = (await readThemes(project)).find(t => t.themeName === dsName);
  if (!theme) return null; // DS without styling tokens (no entry in designSystem.ts) → nothing to reconcile
  const existing: DsTokenReconciliation | undefined = dsEntry.tokenReconciliation;

  // Used groups = groups of THIS run's pages ∪ groups already reconciled (accumulates per DS).
  const runPages = Array.isArray(a.pages) ? a.pages : (a.page ? [a.page] : []);
  const runGroups = (await Promise.all(
    runPages.map(p => readPageGroups(buildWorkItem(project, a.module, a.layout, a.ds, p, a.device).defsDestino)),
  )).flat();
  const usedGroups = [...new Set([...(existing?.usedGroups ?? []), ...runGroups])].sort();

  const vocab = await buildMlVocab(usedGroups);
  const dsVars = new Set(themeDsVars(theme));
  const version = `${themeSignature(theme)}/${mlVocabHash(vocab)}`;
  return { theme, existing, usedGroups, vocab, dsVars, version };
}

// ─── before: staleness gate + prompt ─────────────────────────────────────────

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
    const runPagesDiag = Array.isArray(a.pages) ? a.pages : (a.page ? [a.page] : []);
    const inputs = await deriveInputs(project, a);

    if (!inputs) {
      console.info(`[agentReconcileTokens] ds=${a.ds}: DS sem entrada de tokens no designSystem.ts → nada a reconciliar. pages=${JSON.stringify(runPagesDiag)}`);
      return [mkCompleted(context, parentStep, step, hookSequential)];
    }
    if (inputs.vocab.length === 0) {
      console.info(`[agentReconcileTokens] ds=${a.ds}: 0 token(s) --ml-* · usedGroups=[${inputs.usedGroups.join(',') || '—'}] · pages=${JSON.stringify(runPagesDiag)} → nada a reconciliar (grupos não coletados do defs?)`);
      return [mkCompleted(context, parentStep, step, hookSequential)];
    }
    if (!a.forceReconcile && inputs.existing?.version === inputs.version) {
      console.info(`[agentReconcileTokens] ds=${a.ds}: reconciliação em cache (version=${inputs.version}) → skip LLM (use forceReconcile p/ refazer)`);
      return [mkCompleted(context, parentStep, step, hookSequential)];
    }

    console.info(`[agentReconcileTokens] ▶ ds=${a.ds}${a.forceReconcile ? ' [FORCE]' : ''}: ${inputs.vocab.length} token(s) --ml-* de ${inputs.usedGroups.length} grupo(s) → ${inputs.dsVars.size} var(s) --ds-*`);
    const humanPrompt = buildHumanPrompt(inputs.theme, inputs.vocab);

    const continueParallel: mls.msg.AgentIntentPromptReady = {
      type: 'prompt_ready',
      args: args ?? step.prompt ?? '',
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task?.PK || '',
      hookSequential,
      parentStepId: parentStep.stepId,
      humanPrompt,
      systemPrompt: system1,
    };
    return [continueParallel];
  } catch (error) {
    const msg = `[agentReconcileTokens] ${error instanceof Error ? error.message : String(error)}`;
    console.error('✗', msg);
    return [mkFail(context, parentStep, step, hookSequential, msg)];
  }
}

// ─── after: validate + merge pinned + persist ────────────────────────────────

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
    const inputs = await deriveInputs(project, a);
    if (!inputs) return [mkCompleted(context, parentStep, step, hookSequential)];

    const vocabTokens = new Set(inputs.vocab.map(t => t.token));
    const raw = Array.isArray((payload.result as any)?.mappings) ? (payload.result as any).mappings : [];

    // Start every vocab token at keep-default (null); the LLM's valid picks override.
    const map: Record<string, string | null> = {};
    for (const t of inputs.vocab) map[t.token] = null;

    let direct = 0, derived = 0, kept = 0, dropped = 0;
    for (const m of raw) {
      const mlToken = typeof m?.mlToken === 'string' ? m.mlToken : '';
      if (!vocabTokens.has(mlToken)) { dropped++; continue; }
      const kind = m?.kind;
      const dsExpr = typeof m?.dsExpr === 'string' ? m.dsExpr.trim() : null;
      if (kind === 'keep' || !dsExpr) { map[mlToken] = null; kept++; continue; }
      if (!refsOnlyKnownDsVars(dsExpr, inputs.dsVars)) { map[mlToken] = null; dropped++; continue; } // unknown --ds-* → keep default
      map[mlToken] = dsExpr;
      if (kind === 'derived') derived++; else direct++;
    }

    const pinned = inputs.existing?.pinned;
    const reconciliation: DsTokenReconciliation = { version: inputs.version, usedGroups: inputs.usedGroups, map, ...(pinned ? { pinned } : {}) };

    if (!context.isTest) {
      await persistReconciliation(project, a.ds, reconciliation);          // agent state (staleness/pinning)
      await writeMlTokens(project, inputs.theme, map, pinned);             // result → designSystem.ts entry
    }
    console.info(`[agentReconcileTokens] ✓ ds=${a.ds}: ${direct} direct · ${derived} derived · ${kept} keep · ${dropped} descartado(s) · gravado (version=${inputs.version})`);
    return [mkCompleted(context, parentStep, step, hookSequential)];
  } catch (error) {
    const msg = `[agentReconcileTokens] ${error instanceof Error ? error.message : String(error)}`;
    console.error('✗', msg);
    return [mkFail(context, parentStep, step, hookSequential, msg)];
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────

/** True if every `--ds-…` referenced by the expression is a real var of this DS. */
function refsOnlyKnownDsVars(expr: string, dsVars: Set<string>): boolean {
  const refs = expr.match(/--ds-[a-z0-9-]+/gi) ?? [];
  if (refs.length === 0) return false; // must lean on the DS (raw-only exprs are rejected here)
  return refs.every(r => dsVars.has(r));
}

/** Persist designSystems[ds].tokenReconciliation (merge into the DS entry, keep other buckets). */
async function persistReconciliation(project: number, ds: number | string, reconciliation: DsTokenReconciliation): Promise<void> {
  const config: any = await getConfigProject(project);
  if (!config) throw new Error('project config not found');
  const designSystems = (config.designSystems && typeof config.designSystems === 'object') ? config.designSystems : {};
  const key = String(ds);
  designSystems[key] = { ...(designSystems[key] ?? {}), tokenReconciliation: reconciliation };
  config.designSystems = designSystems;
  await updateConfigProject(project, config);
}

/** Write the reconciled ml-* tokens into the DS's theme entry (replacing previous ml-*).
 *  `pinned` overrides win; null/absent = molecule keeps its default (no token emitted). */
async function writeMlTokens(
  project: number,
  theme: IDesignSystemTokens,
  map: Record<string, string | null>,
  pinned: Record<string, string> | undefined,
): Promise<void> {
  const final: Record<string, string | null> = { ...map, ...(pinned ?? {}) };
  const global: Record<string, string> = Object.fromEntries(
    Object.entries(theme.global ?? {}).filter(([k]) => !/^ml-/.test(k)),
  );
  for (const [k, v] of Object.entries(final)) {
    if (typeof v !== 'string' || !v.trim()) continue;
    global[k.replace(/^--/, '')] = v;
  }
  await writeTheme(project, { ...theme, global }, { merge: false });
}

/** Human prompt: the DS's --ds-* targets (with values) + the --ml-* vocabulary to map. */
function buildHumanPrompt(theme: IDesignSystemTokens, vocab: MlToken[]): string {
  const dsTargets: string[] = [];
  for (const [key, light] of Object.entries(theme.color ?? {})) {
    if (!/^ds-/.test(key)) continue; // skip _dark- pairs and custom tokens
    dsTargets.push(`- var(--${key}): ${key.replace(/^ds-/, '')}${light ? ` — ${light}` : ''}`);
  }
  for (const key of Object.keys(theme.typography ?? {})) {
    if (/^ds-font-/.test(key)) dsTargets.push(`- var(--${key}): ${key.replace(/^ds-font-/, '')} font`);
  }
  if (theme.global?.['ds-radius']) dsTargets.push('- var(--ds-radius): corner radius');
  if (theme.global?.['ds-border-w']) dsTargets.push('- var(--ds-border-w): border width');

  const mlList = vocab.map(t => `- ${t.token} (default ${t.default || '—'}): ${t.description || ''}`.trimEnd());

  return [
    `## Design system tokens (--ds-*) — the ONLY vars you may reference\n${dsTargets.join('\n')}`,
    `## Molecule tokens (--ml-*) — map EACH one\n${mlList.join('\n')}`,
  ].join('\n\n');
}

const system1 = `
<!-- modelType: codeinstruct -->

You must return ONLY a valid JSON object. No preamble, no markdown fences. Start with { and end with }

## Task
Map each molecule design token (--ml-*) to the project's design-system tokens (--ds-*), so the
molecules follow the design system. For EACH --ml-* token pick the best expression:
- direct  → "var(--ds-<role>)" when a DS role matches the token's meaning (e.g. primary text → var(--ds-text)).
- derived → a CSS expression built ONLY from --ds-* vars for shades / hover / dim / on-color contrast
            when there is no exact DS role (e.g. color-mix(in srgb, var(--ds-surface) 92%, #000)).
- keep    → dsExpr = null, when NO DS token fits (the molecule keeps its own default).

## Rules
- Reference --ds-* var names EXACTLY as listed. NEVER invent a --ds-* var.
- Prefer var(--ds-*) whenever a role fits; raw color is tolerated ONLY inside a derived expression
  for on-color contrast (e.g. text on primary) when the DS has no matching role.
- Decide by MEANING (the token's description), not by name similarity.
- Exactly one entry per --ml-* token given. kind must match dsExpr (keep ⇔ dsExpr null).

## Output format
[[OutputSection]]
`;

//#region OutputSection
export type Output = {
  type: 'flexible';
  result: {
    mappings: Array<{ mlToken: string; dsExpr: string | null; kind: 'direct' | 'derived' | 'keep'; reason?: string }>;
  };
};
//#endregion
