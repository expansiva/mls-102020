/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chTypes.ts" enhancement="_blank"/>

// Types, constants and the PURE helpers of agentChooseMolecules. No I/O, no mls.* access — which is
// what makes every gate and the report renderer node-testable (skills/agentTest.md, category B).
//
// Plumbing that already exists is imported, not restated: intents and l4 mechanics come from
// agentNewMolecule2/helpers (nmSteps, nmFs) and the strict tool wrapper from shared/llmTool. This file
// only declares what is specific to CHOOSING from the catalog. See flow.json.

export const CH_AGENT_NAME = 'agentChooseMolecules';
export const CH_AGENT_FOLDER = 'aura/molecules/agentChooseMolecules';
/** The agent lives in 102020 whatever project's catalog it reads. */
export const CH_AGENT_PROJECT = 102020;

/** One retry with the gate errors in the prompt, then stop. Same budget as agentImproveMolecule2. */
export const CH_MAX_ATTEMPTS = 2;

/** Steps whose planId is fixed. The c2 steps are one per chosen group — see chGroupPlanId. */
export const CH_PLAN_C1 = 'c1-groups';
export const CH_PLAN_FANOUT = 'c1r-fanout';
export const CH_PLAN_C3 = 'c3-report';

/**
 * 'c1-groups' -> 'c1-done'. Same convention as the rest of the family.
 *
 * ⚠️ NOT USABLE FOR THE c2 STEPS, and that is the whole reason chGroupDoneAnchor exists: splitting on
 * '-' would give every group's step the same 'c2-done' anchor, so a c3 that dependsOn it would be
 * waiting on an anchor several steps write — and the first one to land would unlock it.
 */
export function chDoneAnchor(planId: string): string {
  return `${planId.split('-')[0]}-done`;
}

/** The folder spelling of a group: the catalog publishes 'groupSelectOne', the folder is lowercase. */
export function chGroupFolder(groupName: string): string {
  return (groupName || '').trim().toLowerCase();
}

export function chGroupPlanId(groupName: string): string {
  return `c2-${chGroupFolder(groupName)}`;
}

export function chGroupDoneAnchor(groupName: string): string {
  return `${chGroupPlanId(groupName)}-done`;
}

/**
 * The catalog's own spelling for a group the model named, or '' when it named one that does not exist.
 *
 * Case-insensitive on purpose: 'groupselectone' for 'groupSelectOne' is a spelling slip, and spending a
 * retry on it would teach nothing about the catalog. The TAG is the opposite case — there the exact
 * spelling is the thing being measured (flow.json.decisions.tagSpelling).
 */
export function chCanonicalGroup(groupName: string, known: string[]): string {
  const wanted = (groupName || '').trim().toLowerCase();
  if (!wanted) return '';
  return known.find(name => name.trim().toLowerCase() === wanted) || '';
}

export interface ChGateResult {
  ok: boolean;
  errors: string[];
}

export function chGateOk(): ChGateResult {
  return { ok: true, errors: [] };
}

export function chGateFail(...errors: string[]): ChGateResult {
  return { ok: false, errors: errors.filter(Boolean) };
}

export function chIssue(code: string, message: string): string {
  return `${code}: ${message}`;
}

// ---- what the two LLM steps produce ----

export interface ChRegion {
  /** The join key between c1 and c2. Unique within a run; c2 echoes it verbatim. */
  region: string;
  /** What the region has to do, in the user's words — this is what c2 reads, not the whole definition. */
  need: string;
  /** The catalog's spelling of the group, or null when no published group covers the need. */
  group: string | null;
  reason: string;
}

export interface ChGroupsArtifact {
  schemaVersion: 1;
  savedAt: string;
  runKey: string;
  level1Reference: string;
  regions: ChRegion[];
  /** Distinct groups, in the catalog's spelling — what the fan-out plants from. */
  groups: string[];
}

export interface ChChoice {
  region: string;
  group: string;
  /** The FULL published tag, or null when no molecule of this group serves the region. */
  tag: string | null;
  /** Which quick-reference scenario was used, or null when none applied. */
  scenarioUsed: string | null;
  reason: string;
}

export interface ChGroupArtifact {
  schemaVersion: 1;
  savedAt: string;
  runKey: string;
  group: string;
  indexDefsReference: string;
  choices: ChChoice[];
  /** false = the gate never accepted an answer for this group. The run still reports. */
  ok: boolean;
  /** How many attempts the anti-invention gate refused. Zero is the acceptance criterion. */
  gateHits: number;
  /** Tags chosen whose catalog entry has no .defs (the ml-table-multi-select case). */
  chosenWithoutDefs: string[];
  errors: string[];
}

// ---- prompt size, which is how "tokens per step" is measured here ----

/**
 * 4 chars per token, the usual ratio for prose in English and Portuguese.
 *
 * ⚠️ IT IS AN ESTIMATE AND IT IS THE METRIC (decision of 2026-08-19). There is no token telemetry on
 * this platform: the step contract carries no provider `usage`, so a step cannot read what its own call
 * consumed. The estimate errs by roughly ±20%, and the §11.4 question — does one level per prompt stay
 * in the 1–2k range? — has 2× to 4× of margin on the measured files, so the error cannot flip it.
 */
export const CH_CHARS_PER_TOKEN = 4;

export function chEstTokens(chars: number): number {
  return Math.ceil(Math.max(0, chars) / CH_CHARS_PER_TOKEN);
}

export interface ChPromptSize {
  planId: string;
  attempt: number;
  /** The `<!-- modelType: X -->` marker actually shipped in the prompt, parsed from it. */
  modelType: string;
  /** The prompt.md, after substitution, WITHOUT the catalog block. */
  instructionChars: number;
  /** The catalog level injected into this call — the number §11.4 is about. */
  catalogChars: number;
  /** The human prompt: the definition, or the regions of one group. */
  inputChars: number;
  totalChars: number;
  instructionTokensEst: number;
  catalogTokensEst: number;
  inputTokensEst: number;
  totalTokensEst: number;
}

export function chMeasurePrompt(args: {
  planId: string;
  attempt: number;
  /** The assembled system prompt, catalog included — the catalog is subtracted here. */
  systemPrompt: string;
  catalog: string;
  humanPrompt: string;
}): ChPromptSize {
  const catalogChars = args.catalog.length;
  const instructionChars = Math.max(0, args.systemPrompt.length - catalogChars);
  const inputChars = args.humanPrompt.length;
  const totalChars = args.systemPrompt.length + inputChars;
  return {
    planId: args.planId,
    attempt: args.attempt,
    modelType: chParseModelType(args.systemPrompt),
    instructionChars,
    catalogChars,
    inputChars,
    totalChars,
    instructionTokensEst: chEstTokens(instructionChars),
    catalogTokensEst: chEstTokens(catalogChars),
    inputTokensEst: chEstTokens(inputChars),
    totalTokensEst: chEstTokens(totalChars),
  };
}

/** The marker skills/modelTypes.md makes mandatory. Reported, so the run says which model type ran. */
export function chParseModelType(prompt: string): string {
  const match = /<!--\s*modelType:\s*([a-zA-Z]+)\s*-->/.exec(prompt || '');
  return match ? match[1] : '';
}

/**
 * The "nothing fits" sentinel, at both levels.
 *
 * The strict tool schema cannot express a nullable string — a `["string","null"]` union is refused by
 * the strictest providers (agentsBestPractices §9) — so the schema asks for the word 'none' and the
 * gates turn it into null here. The accepted spellings include the Portuguese ones on purpose: the
 * prompts are answered in the user's language, and refusing 'nenhum' would spend a retry on a slip
 * that says nothing about the catalog.
 */
const CH_NONE_WORDS = ['', 'none', 'null', 'nenhum', 'nenhuma', 'nenhum grupo', 'n/a'];

export function chIsNone(value: unknown): boolean {
  return CH_NONE_WORDS.includes(String(value ?? '').trim().toLowerCase());
}

/**
 * The GROUP a c2 step is about, read from its own args.
 *
 * nmParseStepArgs is the shared reader of step args (planId, runKey, retry) and knows nothing about a
 * group — widening a shared helper for one agent's field is the boundary agentsBestPractices §2 warns
 * about, so this reads the one extra field and the shared helper keeps reading the rest. Parsing the
 * same short string twice costs nothing.
 */
export function chGroupArg(value: unknown): string {
  if (typeof value !== 'string') {
    return isPlainRecord(value) && typeof value.group === 'string' ? value.group.trim() : '';
  }
  const trimmed = value.trim();
  if (!trimmed.startsWith('{')) return '';
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return isPlainRecord(parsed) && typeof parsed.group === 'string' ? parsed.group.trim() : '';
  } catch {
    return '';
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
