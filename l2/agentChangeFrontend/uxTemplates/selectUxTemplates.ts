/// <mls fileReference="_102020_/l2/agentChangeFrontend/uxTemplates/selectUxTemplates.ts" enhancement="_blank"/>

// Deterministic UX template selection (registry selectionPolicy = deterministicScore).
// Scores the 14 uxTemplates against machine-derivable screen signals and returns up to
// maxRecommendedTemplates candidates. The LLM then picks the final template (single page)
// or one template per variant (item 4). Prose signals (requiredSignals / rejectsWhen) are
// NOT scored here — they are passed to the LLM as context.

import type { UxTemplateDefinition } from "/_102020_/l2/agentChangeFrontend/uxTemplates/uxTemplateTypes.defs.js";
import { uxTemplates, uxTemplateRegistry } from "/_102020_/l2/agentChangeFrontend/uxTemplates/index.defs.js";

// Machine-derivable signals for one screen. Derived in cfeCreateShared from the page plan + L4.
export interface UxScreenSignals {
  workspaceKind: string;      // raw journey workspace kind (may be '')
  accessPatterns: string[];   // list | detail | commandInput | dashboard | queue | calendar | report | board
  selection: string;          // none | single | multiple
  operationKinds: string[];   // query | view | create | update | delete | adjust | transition | report | command
  hasStatusOrLifecycle: boolean;
  hasQueryList: boolean;
  isMultiStep: boolean;
}

export interface UxTemplateCandidate {
  id: string;
  title: string;
  score: number;              // 0..1
  highConfidence: boolean;    // score >= registry threshold
  userJourney: string;
  layoutGuidance: string[];
  llmGuidance: string[];
  validationChecks: string[];
  appliesWhen: UxTemplateDefinition["appliesWhen"];
  rejectsWhen: string[];
}

// Journey workspace.kind is a free string; map common spellings to the UxWorkspaceKind enum.
const WORKSPACE_KIND_ALIASES: Record<string, string> = {
  entitymanagement: "entityManagement",
  entity: "entityManagement",
  management: "entityManagement",
  crud: "entityManagement",
  workflow: "workflow",
  process: "workflow",
  lifecycle: "workflow",
  dashboard: "dashboard",
  report: "report",
  reporting: "report",
  adjustment: "adjustment",
  detail: "detail",
  form: "form",
  calendar: "calendar",
  schedule: "calendar",
};

function normalizeWorkspaceKind(raw: string): string {
  const key = String(raw || "").trim().toLowerCase();
  return WORKSPACE_KIND_ALIASES[key] || String(raw || "").trim();
}

function overlapRatio(derived: string[], templateValues: string[]): number {
  if (derived.length === 0 || templateValues.length === 0) return 0;
  const set = new Set(templateValues.map(value => value.toLowerCase()));
  const hits = derived.filter(value => set.has(value.toLowerCase())).length;
  return hits / derived.length;
}

function includesInsensitive(values: string[], target: string): boolean {
  if (!target) return false;
  return values.map(value => value.toLowerCase()).includes(target.toLowerCase());
}

// Deterministic weighted score of a template against derived signals.
function scoreTemplate(template: UxTemplateDefinition, signals: UxScreenSignals): number {
  const applies = template.appliesWhen;
  const workspaceKind = normalizeWorkspaceKind(signals.workspaceKind);

  const workspaceMatch = includesInsensitive(applies.workspaceKinds, workspaceKind) ? 1 : 0;
  const accessMatch = overlapRatio(signals.accessPatterns, applies.accessPatterns);
  const operationMatch = overlapRatio(signals.operationKinds, applies.operationKinds);
  const selectionMatch = includesInsensitive(applies.selection, signals.selection) ? 1 : 0;

  // Workspace kind is the strongest structural signal, then access pattern and operations.
  const score = 0.4 * workspaceMatch + 0.25 * accessMatch + 0.25 * operationMatch + 0.1 * selectionMatch;
  return Math.max(0, Math.min(1, score));
}

function toCandidate(template: UxTemplateDefinition, score: number, threshold: number): UxTemplateCandidate {
  return {
    id: template.id,
    title: template.title,
    score: Number(score.toFixed(3)),
    highConfidence: score >= threshold,
    userJourney: template.userJourney,
    layoutGuidance: template.layoutGuidance,
    llmGuidance: template.llmGuidance,
    validationChecks: template.validationChecks,
    appliesWhen: template.appliesWhen,
    rejectsWhen: template.rejectsWhen,
  };
}

// Deterministic fallback when nothing scores: a form-ish screen gets single_form, otherwise
// tabular_classic. Guarantees at least one candidate so page generation never stalls.
function fallbackTemplate(signals: UxScreenSignals): UxTemplateDefinition {
  const wantsForm = !signals.hasQueryList
    && signals.operationKinds.some(kind => ["create", "update", "adjust"].includes(kind.toLowerCase()));
  const preferredId = wantsForm ? "single_form" : "tabular_classic";
  return uxTemplates.find(template => template.id === preferredId) || uxTemplates[0];
}

// Ranked candidates (up to maxRecommendedTemplates). Never empty.
export function selectUxTemplateCandidates(signals: UxScreenSignals, limit?: number): UxTemplateCandidate[] {
  const threshold = uxTemplateRegistry.selectionPolicy.highConfidenceThreshold;
  const max = Math.max(1, limit ?? uxTemplateRegistry.selectionPolicy.maxRecommendedTemplates);

  const scored = uxTemplates
    .map(template => ({ template, score: scoreTemplate(template, signals) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    const fallback = fallbackTemplate(signals);
    return [toCandidate(fallback, 0, threshold)];
  }

  return scored.slice(0, max).map(entry => toCandidate(entry.template, entry.score, threshold));
}
