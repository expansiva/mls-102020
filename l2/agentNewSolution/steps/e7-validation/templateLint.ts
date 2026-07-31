/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e7-validation/templateLint.ts" enhancement="_blank"/>

// T4 — TEMPLATE-READINESS LINT (improveNewSolution, session B).
//
// Runs at e7, when every workspace and operation already exists and the SET can be judged. It asks
// one question per classified workspace: does this contract satisfy the minimum its page category
// needs, so the l2 renderer can use the category template instead of the generic fallback?
//
// THE INEGOTIABLE RULE: this lint only ever touches the FORM of the contract (a bffCall output
// envelope). It never adds, removes or edits an entity, a business rule or an operation. When the
// gap is business semantics rather than form, the answer is to DOWNGRADE the classification (or
// mark it not-ready) — never to invent the missing business.
//
// Outcomes per workspace (the spec's table):
//   ok         — the contract satisfies the minimum;
//   repaired   — a reparable FORM gap was fixed (today: a `list` output that must be `paginated`);
//   downgraded — business semantics missing: fall back to the best alternate the contract satisfies;
//   unready    — nothing satisfied: keep the best category, templateReady = false (generic fallback);
//   skipped    — the category has no `minimumRequired` block yet (or no catalog): warn, do not judge.
//
// PURE module (no fs, no mls.*): the agent reads/writes disk, this decides. Mutates the workspaces
// it repairs/downgrades in place (same contract as repairE6BffFroms) and reports which ones changed.

// Readiness gaps are ADVISORY (warnings): e7 fails the run on errors, and a page that cannot use a
// specialized template still renders with the generic fallback — that is not a broken module.
import { NsGateIssue, warningIssue } from '/_102020_/l2/agentNewSolution/helpers/nsGate.js';
import { NsCategory, NsCategoryCatalog } from '/_102020_/l2/agentNewSolution/helpers/nsCategoryCatalog.js';
import {
  isNsIdInputName,
  NsE6BffCall,
  NsE6BffField,
  NsE6Workspace,
} from '/_102020_/l2/agentNewSolution/steps/e6-journey-map/gate.js';

export type NsTemplateLintAction = 'ok' | 'repaired' | 'downgraded' | 'unready' | 'skipped' | 'unclassified';

export interface NsTemplateLintResult {
  workspaceId: string;
  categoryRef: string;      // the category AFTER a possible downgrade ('' when unclassified)
  originalCategoryRef: string;
  confidence: number;
  templateReady: boolean;
  action: NsTemplateLintAction;
  notes: string[];
}

export interface NsTemplateLintOutcome {
  results: NsTemplateLintResult[];
  issues: NsGateIssue[];
  /** workspaceIds whose defs were mutated (repair and/or downgrade) — the agent rewrites these. */
  changed: string[];
}

// The machine-checkable half of a category's template contract. Anything requiring judgment (a
// "readable label", "a price charged to the buyer") deliberately stays OUT of these blocks and is
// documented in the category's `note` — a lint that guesses semantics is worse than no lint.
interface MinimumRequired {
  query?: { outputKind?: 'object' | 'list' | 'paginated'; minCount?: number };
  itemFields?: { id?: boolean; measure?: 'number' };
  commands?: { minCount?: number };
}

/** Minimum confidence for an alternate to be worth downgrading to (the spec's "nota >= 6"). */
const MIN_DOWNGRADE_CONFIDENCE = 6;

export function lintNsTemplateReadiness(
  workspaces: NsE6Workspace[],
  catalog: NsCategoryCatalog | null,
): NsTemplateLintOutcome {
  const results: NsTemplateLintResult[] = [];
  const issues: NsGateIssue[] = [];
  const changed = new Set<string>();

  for (const workspace of workspaces) {
    // Universal rule, category-independent: a REQUIRED id input with no resolvable source. This is
    // the 102045 billingWorkspace defect (`projectId required` with no picker became a typed-in
    // text box). Reported, never auto-repaired: the fix is either a picker query reusing a browse
    // operation of ANOTHER workspace — which would break the e6 map/detail equality and coverage
    // gates if injected here — or a navigation contract. Both are site-map (phase 1) decisions, not
    // contract form. The e6 prompt now asks for the source up front; this is the net.
    for (const call of workspace.bffCalls) {
      if (call.kind !== 'command') continue;
      for (const input of call.input || []) {
        if (input.required !== true || !isNsIdInputName(input.name)) continue;
        if (input.source && input.source !== 'userDecision') continue;
        issues.push(warningIssue(
          'template.input.idWithoutSource',
          `workspace ${workspace.workspaceId}: required id "${input.name}" of command ${call.bffId} has ${input.source ? `source "${input.source}"` : 'no declared source'} — an id must be selected, derived or carried by the page, never typed`,
          workspace.workspaceId,
        ));
      }
    }

    const presentation = workspace.presentation;
    if (!presentation) {
      results.push(unclassifiedResult(workspace));
      continue;
    }
    if (!catalog) {
      results.push(baseResult(workspace, presentation.categoryRef, presentation.confidence, 'skipped', ['catalog unavailable — readiness not judged']));
      continue;
    }

    const evaluation = evaluateCategory(workspace, catalog.byId.get(presentation.categoryRef));
    if (evaluation.kind === 'noContract') {
      issues.push(warningIssue(
        'template.category.noMinimum',
        `workspace ${workspace.workspaceId}: category ${presentation.categoryRef} has no minimumRequired block yet — readiness not judged`,
        workspace.workspaceId,
      ));
      results.push(baseResult(workspace, presentation.categoryRef, presentation.confidence, 'skipped', [evaluation.reason]));
      continue;
    }
    if (evaluation.kind === 'unjudgeable') {
      issues.push(warningIssue('template.contract.unjudgeable', `workspace ${workspace.workspaceId}: ${evaluation.reason}`, workspace.workspaceId));
      results.push(baseResult(workspace, presentation.categoryRef, presentation.confidence, 'skipped', [evaluation.reason]));
      continue;
    }
    if (evaluation.kind === 'satisfied') {
      presentation.templateReady = true;
      changed.add(workspace.workspaceId);
      results.push(baseResult(workspace, presentation.categoryRef, presentation.confidence, 'ok', []));
      continue;
    }

    // Gap found. Form gaps are repairable HERE; business gaps are not.
    const repair = evaluation.formGap ? tryRepairForm(workspace, evaluation.formGap) : null;
    if (repair) {
      const after = evaluateCategory(workspace, catalog.byId.get(presentation.categoryRef));
      if (after.kind === 'satisfied') {
        presentation.templateReady = true;
        changed.add(workspace.workspaceId);
        issues.push(warningIssue('template.contract.repaired', `workspace ${workspace.workspaceId}: ${repair}`, workspace.workspaceId));
        results.push(baseResult(workspace, presentation.categoryRef, presentation.confidence, 'repaired', [repair]));
        continue;
      }
      // The repair was applied (it is a legitimate improvement) but did not close every gap.
      changed.add(workspace.workspaceId);
      issues.push(warningIssue('template.contract.repaired', `workspace ${workspace.workspaceId}: ${repair}`, workspace.workspaceId));
    }

    // Business semantics missing => downgrade to the best alternate the contract DOES satisfy.
    const downgrade = pickDowngrade(workspace, catalog);
    if (downgrade) {
      const from = presentation.categoryRef;
      const note = `templateLint: downgraded from ${from} to ${downgrade.categoryRef} — ${evaluation.reason}`;
      presentation.categoryRef = downgrade.categoryRef;
      presentation.confidence = downgrade.confidence;
      presentation.templateReady = true;
      presentation.classificationNote = appendNote(presentation.classificationNote, note);
      presentation.alternates = (presentation.alternates || []).filter(alternate => alternate.categoryRef !== downgrade.categoryRef);
      if (!presentation.alternates.length) delete presentation.alternates;
      changed.add(workspace.workspaceId);
      issues.push(warningIssue('template.category.downgraded', `workspace ${workspace.workspaceId}: ${note}`, workspace.workspaceId));
      results.push({ ...baseResult(workspace, downgrade.categoryRef, downgrade.confidence, 'downgraded', [note]), originalCategoryRef: from });
      continue;
    }

    // Nothing satisfied: keep the best category and tell the renderer to use the generic fallback.
    presentation.templateReady = false;
    presentation.classificationNote = appendNote(presentation.classificationNote, `templateLint: not template-ready — ${evaluation.reason}`);
    changed.add(workspace.workspaceId);
    issues.push(warningIssue(
      'template.notReady',
      `workspace ${workspace.workspaceId}: ${presentation.categoryRef} not satisfied (${evaluation.reason}) and no alternate fits — l2 uses the generic fallback`,
      workspace.workspaceId,
    ));
    results.push(baseResult(workspace, presentation.categoryRef, presentation.confidence, 'unready', [evaluation.reason]));
  }

  return { results, issues, changed: [...changed] };
}

// ---------------------------------------------------------------------------
// evaluation

type Evaluation =
  | { kind: 'satisfied' }
  | { kind: 'noContract'; reason: string }
  // The predicate cannot be decided from this contract (not "it failed"): e.g. a measure check on a
  // projection whose fields declare no `type` at all. Punishing that would blame a TYPING weakness
  // for a semantic gap, and claiming readiness would be a lie — so it is reported and not judged.
  | { kind: 'unjudgeable'; reason: string }
  | { kind: 'gap'; reason: string; formGap?: FormGap };

interface FormGap { kind: 'queryOutputKind'; want: 'object' | 'list' | 'paginated' }

function evaluateCategory(workspace: NsE6Workspace, category: NsCategory | undefined): Evaluation {
  if (!category) return { kind: 'noContract', reason: 'category not in the catalog' };
  const minimum = readMinimum(category.minimumRequired);
  if (!minimum) return { kind: 'noContract', reason: 'category has no minimumRequired block' };

  const queries = workspace.bffCalls.filter(call => call.kind === 'query');
  const commands = workspace.bffCalls.filter(call => call.kind === 'command');

  if (minimum.query?.minCount !== undefined && queries.length < minimum.query.minCount) {
    return { kind: 'gap', reason: `needs at least ${minimum.query.minCount} query bffCall, found ${queries.length}` };
  }
  if (minimum.commands?.minCount !== undefined && commands.length < minimum.commands.minCount) {
    return { kind: 'gap', reason: `needs at least ${minimum.commands.minCount} command bffCall, found ${commands.length}` };
  }

  const wantKind = minimum.query?.outputKind;
  if (wantKind) {
    const match = queries.find(call => call.output?.kind === wantKind);
    if (!match) {
      // A query whose SHAPE can be lifted into the wanted one is a FORM gap (repairable); having no
      // query at all is not.
      const repairable = wantKind === 'paginated' && queries.some(call => call.output?.kind === 'list');
      return {
        kind: 'gap',
        reason: `needs a query with output kind "${wantKind}" (found: ${queries.map(call => call.output?.kind || 'none').join(', ') || 'no query'})`,
        ...(repairable ? { formGap: { kind: 'queryOutputKind' as const, want: wantKind } } : {}),
      };
    }
    return itemEvaluation(match, minimum);
  }

  // No output-kind requirement: apply the item checks to the first query that has an output.
  const anyQuery = queries.find(call => call.output);
  if (minimum.itemFields && anyQuery) return itemEvaluation(anyQuery, minimum);
  return { kind: 'satisfied' };
}

function itemEvaluation(call: NsE6BffCall, minimum: MinimumRequired): Evaluation {
  const check = checkItemFields(call, minimum);
  if (check.unjudgeable) return { kind: 'unjudgeable', reason: check.unjudgeable };
  if (check.gap) return { kind: 'gap', reason: check.gap };
  return { kind: 'satisfied' };
}

/**
 * id/measure are checked on the ITEM, never on the envelope: `total`/`page`/`pageSize` are numbers
 * the query carries about ITSELF, and reading one as "the measure" would make every paginated list
 * satisfy the minimum (the inventoryControl template says this explicitly).
 */
function checkItemFields(call: NsE6BffCall, minimum: MinimumRequired): { gap?: string; unjudgeable?: string } {
  const wanted = minimum.itemFields;
  if (!wanted) return {};
  const fields = itemFieldsOf(call);
  if (wanted.id && !fields.some(field => isNsIdInputName(field.name))) {
    return { gap: 'the item has no identifier field' };
  }
  if (wanted.measure === 'number') {
    if (fields.some(field => field.type === 'number' && !isNsIdInputName(field.name))) return {};
    // `type` is optional in the e6 schema and models do omit it (102045 dashboardWorkspace declares
    // budget/actualCost/budgetVariance with no type at all). A projection where NOTHING is typed
    // cannot answer "is there a numeric measure?" — report, do not judge.
    if (fields.every(field => field.type === undefined)) {
      return { unjudgeable: 'the projection declares no field types, so a numeric measure cannot be verified' };
    }
    return { gap: 'the item has no numeric measure field' };
  }
  return {};
}

/** The record columns: an item.fields block when present (paginated), else the top fields (list/object). */
function itemFieldsOf(call: NsE6BffCall): NsE6BffField[] {
  const output = call.output;
  if (!output) return [];
  const arrayField = output.fields.find(field => field.item?.fields?.length);
  return arrayField?.item?.fields || output.fields;
}

// ---------------------------------------------------------------------------
// form repair (the ONLY mutation this lint may make to a contract)

/**
 * list -> paginated: the list's fields ARE the item columns, so they move under an array field
 * whose `from` is the collection itself. The envelope stays MINIMAL on purpose — a scalar `total`
 * is only added when the projection already carries one, because inventing `<op>.total` would
 * produce a `from` the e6 gate cannot resolve when the operation does not return it.
 */
function tryRepairForm(workspace: NsE6Workspace, gap: FormGap): string | null {
  if (gap.kind !== 'queryOutputKind' || gap.want !== 'paginated') return null;
  const call = workspace.bffCalls.find(item => item.kind === 'query' && item.output?.kind === 'list');
  if (!call || !call.output) return null;

  const columns = call.output.fields;
  if (!columns.length) return null;
  // Every column must come from the same collection for the envelope to be derivable.
  const collectionPaths = new Set(columns.map(field => collectionPathOf(field.from)).filter((path): path is string => !!path));
  if (collectionPaths.size !== 1) return null;
  const collectionPath = [...collectionPaths][0];

  call.output = {
    kind: 'paginated',
    fields: [{ name: pluralNameFor(call), type: 'array', from: collectionPath, item: { fields: columns } }],
  };
  return `query ${call.bffId}: list output lifted into a paginated envelope (form repair; the item columns are unchanged)`;
}

/** "op.$items.col" -> "op.$items"; "op.array.$items.col" -> "op.array". Null when not a column path. */
function collectionPathOf(from: string): string | null {
  const marker = from.indexOf('.$items.');
  if (marker < 0) return null;
  const head = from.slice(0, marker);
  const rest = from.slice(marker + '.$items.'.length);
  if (!head || !rest || rest.includes('.')) return null;
  return `${head}.$items`;
}

function pluralNameFor(call: NsE6BffCall): string {
  const base = call.uses[0]?.operationId || call.bffId;
  const stripped = base.replace(/^(list|query|browse|search|get|view|fetch)/, '');
  const name = stripped ? `${stripped.charAt(0).toLowerCase()}${stripped.slice(1)}` : base;
  return /s$/.test(name) ? name : `${name}Items`;
}

// ---------------------------------------------------------------------------
// downgrade

function pickDowngrade(workspace: NsE6Workspace, catalog: NsCategoryCatalog): { categoryRef: string; confidence: number } | null {
  const alternates = [...(workspace.presentation?.alternates || [])]
    .filter(alternate => alternate.confidence >= MIN_DOWNGRADE_CONFIDENCE)
    .sort((left, right) => right.confidence - left.confidence);
  for (const alternate of alternates) {
    const category = catalog.byId.get(alternate.categoryRef);
    // An alternate with no minimumRequired cannot be VERIFIED, so it is not a safe landing place:
    // downgrading into an unverifiable category would only move the problem and claim readiness.
    if (!category || !readMinimum(category.minimumRequired)) continue;
    if (evaluateCategory(workspace, category).kind === 'satisfied') {
      return { categoryRef: alternate.categoryRef, confidence: alternate.confidence };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// helpers

/** Reads the closed vocabulary this lint understands; anything else in the block is ignored. */
function readMinimum(raw: unknown): MinimumRequired | null {
  if (!isRecord(raw)) return null;
  const minimum: MinimumRequired = {};
  if (isRecord(raw.query)) {
    const query: NonNullable<MinimumRequired['query']> = {};
    if (raw.query.outputKind === 'object' || raw.query.outputKind === 'list' || raw.query.outputKind === 'paginated') {
      query.outputKind = raw.query.outputKind;
    }
    if (typeof raw.query.minCount === 'number') query.minCount = raw.query.minCount;
    if (query.outputKind || query.minCount !== undefined) minimum.query = query;
  }
  if (isRecord(raw.itemFields)) {
    const itemFields: NonNullable<MinimumRequired['itemFields']> = {};
    if (raw.itemFields.id === true) itemFields.id = true;
    if (raw.itemFields.measure === 'number') itemFields.measure = 'number';
    if (itemFields.id || itemFields.measure) minimum.itemFields = itemFields;
  }
  if (isRecord(raw.commands) && typeof raw.commands.minCount === 'number') {
    minimum.commands = { minCount: raw.commands.minCount };
  }
  return minimum.query || minimum.itemFields || minimum.commands ? minimum : null;
}

function baseResult(
  workspace: NsE6Workspace,
  categoryRef: string,
  confidence: number,
  action: NsTemplateLintAction,
  notes: string[],
): NsTemplateLintResult {
  return {
    workspaceId: workspace.workspaceId,
    categoryRef,
    originalCategoryRef: categoryRef,
    confidence,
    templateReady: action === 'ok' || action === 'repaired' || action === 'downgraded',
    action,
    notes,
  };
}

function unclassifiedResult(workspace: NsE6Workspace): NsTemplateLintResult {
  return {
    workspaceId: workspace.workspaceId,
    categoryRef: '',
    originalCategoryRef: '',
    confidence: 0,
    templateReady: false,
    action: 'unclassified',
    notes: ['workspace has no presentation block'],
  };
}

function appendNote(current: string | undefined, note: string): string {
  return current ? `${current} | ${note}` : note;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ---------------------------------------------------------------------------
// T6 — coverage telemetry

export interface NsTemplateCategoryCoverage {
  categoryRef: string;
  workspaces: number;
  templateReady: number;
  downgradedInto: number;   // times another category fell back to this one
  downgradedAway: number;   // times THIS category could not hold a workspace
  skipped: number;
  lowConfidence: number;    // orphan signal: confidence < 6
  avgConfidence: number;
}

export interface NsTemplateCoverage {
  moduleName: string;
  totals: { workspaces: number; templateReady: number; downgraded: number; repaired: number; skipped: number; unclassified: number; lowConfidence: number };
  /**
   * Aggregation keyed by CATEGORY, not workspaceId: a replan renames workspaces between runs (the
   * 102045 went from 9 to 14), so a workspace-keyed series breaks. The category id is the stable
   * key across runs and across projects — the one that answers "is this category an orphan magnet
   * (new category) or a downgrade magnet (split)?".
   */
  byCategory: NsTemplateCategoryCoverage[];
  rows: NsTemplateLintResult[];
}

/**
 * Per-run coverage (workspace x category x confidence x templateReady). Aggregated across projects
 * it answers the two catalog-evolution questions from the analysis: an orphan page (confidence < 6)
 * appearing in 2+ projects is a candidate for a NEW category, and a category that keeps being
 * downgraded is a candidate for a split.
 */
export function buildNsTemplateCoverage(moduleName: string, results: NsTemplateLintResult[]): NsTemplateCoverage {
  const byCategory = new Map<string, NsTemplateCategoryCoverage>();
  const bucket = (categoryRef: string): NsTemplateCategoryCoverage => {
    const existing = byCategory.get(categoryRef);
    if (existing) return existing;
    const created: NsTemplateCategoryCoverage = { categoryRef, workspaces: 0, templateReady: 0, downgradedInto: 0, downgradedAway: 0, skipped: 0, lowConfidence: 0, avgConfidence: 0 };
    byCategory.set(categoryRef, created);
    return created;
  };
  const confidenceSum = new Map<string, number>();
  for (const row of results) {
    if (row.action === 'unclassified') continue;
    const entry = bucket(row.categoryRef);
    entry.workspaces += 1;
    if (row.templateReady) entry.templateReady += 1;
    if (row.action === 'skipped') entry.skipped += 1;
    if (row.confidence < MIN_DOWNGRADE_CONFIDENCE) entry.lowConfidence += 1;
    confidenceSum.set(row.categoryRef, (confidenceSum.get(row.categoryRef) || 0) + row.confidence);
    if (row.action === 'downgraded') {
      entry.downgradedInto += 1;
      bucket(row.originalCategoryRef).downgradedAway += 1;
    }
  }
  for (const entry of byCategory.values()) {
    entry.avgConfidence = entry.workspaces ? Math.round(((confidenceSum.get(entry.categoryRef) || 0) / entry.workspaces) * 10) / 10 : 0;
  }

  return {
    moduleName,
    byCategory: [...byCategory.values()].sort((left, right) => right.workspaces - left.workspaces || left.categoryRef.localeCompare(right.categoryRef)),
    totals: {
      workspaces: results.length,
      templateReady: results.filter(row => row.templateReady).length,
      downgraded: results.filter(row => row.action === 'downgraded').length,
      repaired: results.filter(row => row.action === 'repaired').length,
      skipped: results.filter(row => row.action === 'skipped').length,
      unclassified: results.filter(row => row.action === 'unclassified').length,
      lowConfidence: results.filter(row => row.action !== 'unclassified' && row.confidence < MIN_DOWNGRADE_CONFIDENCE).length,
    },
    rows: results,
  };
}

/** Markdown table for the e7 summary (T6). */
export function renderNsTemplateCoverage(coverage: NsTemplateCoverage): string {
  const lines = [
    '## Template readiness (category coverage)',
    '',
    `- Workspaces: ${coverage.totals.workspaces} | template-ready: ${coverage.totals.templateReady} | repaired: ${coverage.totals.repaired} | downgraded: ${coverage.totals.downgraded} | not judged: ${coverage.totals.skipped} | unclassified: ${coverage.totals.unclassified}`,
    '',
    '| Workspace | Category | Confidence | Template-ready | Outcome |',
    '| --- | --- | --- | --- | --- |',
  ];
  for (const row of coverage.rows) {
    const category = row.action === 'downgraded' ? `${row.categoryRef} (was ${row.originalCategoryRef})` : row.categoryRef || '—';
    lines.push(`| ${row.workspaceId} | ${category} | ${row.action === 'unclassified' ? '—' : row.confidence} | ${row.templateReady ? 'yes' : 'no'} | ${row.action} |`);
  }
  // Keyed by CATEGORY: this is the row that survives a replan (workspace names do not) and the one
  // to aggregate across projects.
  if (coverage.byCategory.length) {
    lines.push('', '### By category (the key that survives a replan)', '');
    lines.push('| Category | Workspaces | Ready | Avg. confidence | Low confidence | Downgraded into | Downgraded away | Not judged |');
    lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const entry of coverage.byCategory) {
      lines.push(`| ${entry.categoryRef} | ${entry.workspaces} | ${entry.templateReady} | ${entry.avgConfidence} | ${entry.lowConfidence} | ${entry.downgradedInto} | ${entry.downgradedAway} | ${entry.skipped} |`);
    }
  }
  lines.push('');
  return lines.join('\n');
}
