/// <mls fileReference="_102020_/l2/agentNewSolution2/ns2Plan.ts" enhancement="_blank"/>

// Plan-id vocabulary + initial-plan shape for agentNewSolution2 (Stage 1: the behavior contract).
// planIds mirror agentNewSolution2/flow.json exactly; the tree builder (agentNewSolution2.ts) maps
// each one to a regenerated agent. Stage 1 stops at the durable business model (ontology + rules +
// workflows + operations) and never plans screens/tables/persistence (Stage 2/3).

export const PLAN_IDS = [
  // requirements
  'org-requirements',
  'req-clarification-answer',
  'req-discover-scope',
  'req-recommend-implementations',
  'req-implementation-decisions',
  // domain (ontology + rules)
  'org-domain',
  'plan-solution-blueprint',
  'plan-blueprint-review',
  'plan-finalize-solution-plan',
  'plan-entity-definition',
  'plan-mdm',
  'plan-horizontals',
  'plan-plugins',
  // behavior (workflows + operations) — the heart of Stage 1
  'org-behavior',
  'plan-behavior-classification',
  'plan-workflow-index',
  'plan-workflow-definition',
  'plan-operation-index',
  'plan-operation-definition',
  'plan-journey-map',
  // handoff
  'org-handoff',
  'behavior-validate',
  'final-resume',
] as const;

export type NewSolution2PlanId = typeof PLAN_IDS[number];

// Internal result-step planId carrying the module name confirmed by the blueprint. Not in the
// flow.json tree (it is an output marker), so it is kept apart from the planned plan-ids.
export const MODULE_NAME_FINAL_PLAN_ID = 'module-name-final';

export interface InitialNewSolution2Plan {
  userLanguage: string;
  requestKind: 'module' | 'solution' | 'module_solution';
  moduleName: string;
  userPrompt: string;
  titles: Partial<Record<NewSolution2PlanId, string>>;
  todoItems: { planId: NewSolution2PlanId; done: boolean; title: string; description: string }[];
  openDetails: { title: string; description: string }[];
}

/** camelCase, ASCII, no leading digits — usable as an l4/{module} folder name. */
export function normalizeModuleFolderName(value: unknown, fallback = 'module'): string {
  const source = `${typeof value === 'string' && value.trim() ? value : fallback}` || 'module';
  const ascii = source
    .normalize('NFD')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, ' ') // also drops NFD-separated combining marks
    .trim();
  const words = ascii.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'module';
  const camel = words
    .map((word, index) => (index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .join('');
  return (camel.replace(/^[0-9]+/, '') || 'module').slice(0, 60);
}

/** Pick an unused folder name (suffix on collision) from the existing top-level folders. */
export function reserveModuleNameFromFolders(requestedName: unknown, fallbackPrompt: string, existingFolders: Iterable<string>): string {
  const folders = new Set(existingFolders);
  const base = normalizeModuleFolderName(requestedName, fallbackPrompt);
  if (!folders.has(base)) return base;
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${base}${index}`;
    if (!folders.has(candidate)) return candidate;
  }
  throw new Error(`[reserveModuleNameFromFolders] no available folder name for ${base}`);
}

export function normalizeInitialPlan(result: InitialNewSolution2Plan, existingFolders: Iterable<string> = []): InitialNewSolution2Plan {
  if (!result || typeof result !== 'object') throw new Error('[normalizeInitialPlan] invalid result');
  if (!result.userLanguage || typeof result.userLanguage !== 'string') throw new Error('[normalizeInitialPlan] missing userLanguage');
  if (!['module', 'solution', 'module_solution'].includes(result.requestKind)) throw new Error(`[normalizeInitialPlan] invalid requestKind: ${result.requestKind}`);
  if (!result.userPrompt || typeof result.userPrompt !== 'string') throw new Error('[normalizeInitialPlan] missing userPrompt');
  result.moduleName = reserveModuleNameFromFolders(result.moduleName, result.userPrompt, existingFolders);
  if (!result.titles || typeof result.titles !== 'object') result.titles = {};
  if (!Array.isArray(result.todoItems)) result.todoItems = [];
  if (!Array.isArray(result.openDetails)) result.openDetails = [];
  return result;
}
