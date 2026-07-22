/// <mls fileReference="_102020_/l2/aura/agentImplementGenome/agentReconcileTokens.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Reconcile molecule tokens (--ml-*) to the DS's own tokens (free-form --* vars). ONE per DS
// (barrier over all gen:<page> steps) — NOT per page: the --ml-* vocabulary is shared across
// groups and the mapping is semantic (role→role), so it's a property of (DS, used-groups).
//
// beforePromptStep → collect the used groups' --ml-* vocabulary + the DS's theme entry from
//   designSystem.ts; if the version (theme signature/mlVocabHash) is unchanged, skip the LLM.
//   Otherwise prompt the LLM to map each --ml-* → a DS-token expression (direct/derived/keep).
// afterPromptStep  → validate the picks against the vocab + the DS's real token vars, merge the
//   manual `pinned` overrides, and write the resulting `tokenReconciliation` (map + version +
//   usedGroups + pinned) INTO the designSystem.ts entry — the single home of both the tokens
//   and their reconciliation (the render applies the map at :root, see designSystemBase.ts).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { buildWorkItem } from '/_102020_/l2/aura/helpers/dsMatch/derivePaths.js';
import { themeByIndex, writeTheme } from '/_102020_/l2/aura/helpers/dsMatch/buildDesignSystemTs.js';
import { IDesignSystemTokens } from '/_102029_/l2/designSystemBase.js';
import {
  buildMlVocab, readPageGroups, mlVocabHash, dsTokensHash,
  type MlToken, type DsTokenReconciliation,
} from '/_102020_/l2/aura/helpers/dsMatch/mlTokenVocab.js';
import { parseStepArgs, mkCompleted, mkFail } from '/_102020_/l2/aura/agentImplementGenome/planning.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentReconcileTokens',
    agentProject: 102020,
    agentFolder: 'aura/agentImplementGenome',
    agentDescription: 'Map molecule tokens (--ml-*) to the DS tokens, once per DS',
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

/** The DS's token vars — the CSS custom properties the entry actually defines, derived from
 *  its real (free-form) token names across color/typography/global. Token names are the
 *  single source of truth in the unified model (no fixed `ds-*` prefix); dark values live under
 *  `_dark-<name>` (same var, overridden in the dark block) so they are skipped, and any `ml-*`
 *  (reconciliation outputs) are skipped so the agent never targets its own results. */
function themeDsVars(theme: IDesignSystemTokens): string[] {
  const names: string[] = [];
  const collect = (map?: Record<string, string>) => {
    for (const k of Object.keys(map ?? {})) {
      if (k.startsWith('_dark-') || k.startsWith('ml-')) continue;
      names.push(`--${k}`);
    }
  };
  collect(theme.color);
  collect(theme.typography);
  collect(theme.global);
  return [...new Set(names)];
}

/** Staleness signature of the DS styling. The reconciliation now lives in its own
 *  `tokenReconciliation` field (not flattened into `global`), so the styling tokens can be
 *  hashed as-is — writing the reconciliation never invalidates its own version. */
function themeSignature(theme: IDesignSystemTokens): string {
  return dsTokensHash({ color: theme.color, typography: theme.typography, global: theme.global, fonts: theme.fonts });
}

async function deriveInputs(project: number, a: ReturnType<typeof parseStepArgs>): Promise<ReconInputs | null> {
  const theme = await themeByIndex(project, a.ds);
  if (!theme) return null; // DS without an entry in designSystem.ts → nothing to reconcile
  const existing: DsTokenReconciliation | undefined = theme.tokenReconciliation;

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

    console.info(`[agentReconcileTokens] ▶ ds=${a.ds}${a.forceReconcile ? ' [FORCE]' : ''}: ${inputs.vocab.length} token(s) --ml-* de ${inputs.usedGroups.length} grupo(s) → ${inputs.dsVars.size} token(s) do DS`);
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
      if (!refsOnlyKnownDsVars(dsExpr, inputs.dsVars)) { map[mlToken] = null; dropped++; continue; } // unknown var → keep default
      map[mlToken] = dsExpr;
      if (kind === 'derived') derived++; else direct++;
    }

    const pinned = inputs.existing?.pinned;
    const reconciliation: DsTokenReconciliation = { version: inputs.version, usedGroups: inputs.usedGroups, map, ...(pinned ? { pinned } : {}) };

    if (!context.isTest) {
      // Single home: the whole reconciliation (map + version + usedGroups + pinned) rides on
      // the DS entry; the render applies the map at :root (designSystemBase.getMlTokensCss).
      await writeTheme(project, { ...inputs.theme, tokenReconciliation: reconciliation });
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

/** True if every `--…` custom property referenced by the expression is a real var of this DS. */
function refsOnlyKnownDsVars(expr: string, dsVars: Set<string>): boolean {
  const refs = expr.match(/--[a-z0-9-]+/gi) ?? [];
  if (refs.length === 0) return false; // must lean on the DS (raw-only exprs are rejected here)
  return refs.every(r => dsVars.has(r));
}

/** Human prompt: the DS's real token targets (name + value, grouped) + the --ml-* vocabulary. */
function buildHumanPrompt(theme: IDesignSystemTokens, vocab: MlToken[]): string {
  const section = (title: string, map?: Record<string, string>): string => {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(map ?? {})) {
      if (key.startsWith('_dark-') || key.startsWith('ml-')) continue; // dark override / own output
      lines.push(`- var(--${key})${value ? `: ${value}` : ''}`);
    }
    return lines.length ? `### ${title}\n${lines.join('\n')}` : '';
  };
  const dsTargets = [
    section('Colors', theme.color),
    section('Typography', theme.typography),
    section('Global (spacing/radius/transition/…)', theme.global),
  ].filter(Boolean).join('\n\n');

  const mlList = vocab.map(t => `- ${t.token} (default ${t.default || '—'}): ${t.description || ''}`.trimEnd());

  return [
    `## Design system tokens — the ONLY vars you may reference\n${dsTargets}`,
    `## Molecule tokens (--ml-*) — map EACH one\n${mlList.join('\n')}`,
  ].join('\n\n');
}

const system1 = `
<!-- modelType: design -->

You must return ONLY a valid JSON object. No preamble, no markdown fences. Start with { and end with }

## Task
Map each molecule design token (--ml-*) to the project's design-system tokens (the --* vars
listed in the human prompt), so the molecules follow the design system. For EACH --ml-* token
pick the best expression:
- direct  → "var(--<token>)" when a DS token matches the meaning (e.g. primary text → var(--text-primary-color)).
- derived → a CSS expression built ONLY from the listed --* vars for shades / hover / dim / on-color
            contrast when no single token fits (e.g. color-mix(in srgb, var(--bg-primary-color) 92%, #000)).
- keep    → dsExpr = null, when NO DS token fits (the molecule keeps its own default).

## Rules
- Reference the DS var names EXACTLY as listed. NEVER invent a var that is not in the list.
- Prefer a var() whenever a token fits; raw color is tolerated ONLY inside a derived expression
  for on-color contrast (e.g. text on primary) when the DS has no matching token.
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
