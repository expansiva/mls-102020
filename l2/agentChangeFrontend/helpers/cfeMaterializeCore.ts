/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeCore.ts" enhancement="_blank"/>

// Pure materialization core for agentChangeFrontend (.defs.ts -> .ts). It has no fs, no mls.* and
// no DOM dependency so the Node runner and the Studio agent can reuse parser, ordering, staleness
// and prompt assembly rules.

export interface PipelineItem {
  id: string;
  type: string;                 // l2_contract | l2_shared | l2_page
  outputPath: string;           // _NNNNN_/l2/.../x.ts
  defPath?: string;             // _NNNNN_/l2/.../x.defs.ts
  dependsFiles?: string[];
  dependsOn?: string[];
  skills?: string[];
  rulesApplied?: string[];
  visualStyle?: unknown;
  agent?: string;
}

export interface ParsedDefs {
  dataExportName: string | null;
  artifact: Record<string, unknown> | unknown[] | null;
  data: unknown;
  item: PipelineItem | null;
}

export interface PlannedItem {
  item: PipelineItem;
  rank: number;
  stale: boolean;
  reason: string;
}

export interface MaterializeEnv {
  readRef(ref: string): Promise<string | null>;
  modifiedMs(ref: string): Promise<number | null>;
}

export interface GenResult { code: string; }

export interface PageQualityCheckResult {
  id: string;
  scope: 'layout' | 'render';
  passed: boolean;
  message: string;
}

export interface PageQualityResult {
  pageId: string;
  templateId: string;
  passed: boolean;
  checks: PageQualityCheckResult[];
}

/** Executes independent hygiene checks plus the structured checks persisted from the selected UX template. */
export function evaluateGeneratedPageQuality(pageDefinition: unknown, sharedDefinition: unknown, pageCode = ''): PageQualityResult {
  if (!isRecord(pageDefinition) || !isRecord(sharedDefinition)) {
    return { pageId: '', templateId: '', passed: true, checks: [] };
  }
  const pageId = stringValue(pageDefinition.pageId);
  const templateId = stringValue(pageDefinition.templateId);
  const layout = isRecord(pageDefinition.layout) ? pageDefinition.layout : {};
  const sections = arrayRecords(layout.sections);
  const organisms = sections.flatMap(section => arrayRecords(section.organisms));
  const intents = organisms.flatMap(organism => arrayRecords(organism.intentions));
  const i18n = isRecord(sharedDefinition.i18n) ? sharedDefinition.i18n : {};
  const states = arrayRecords(sharedDefinition.states);
  const actions = arrayRecords(sharedDefinition.actions);
  const stateByKey = new Map(states.map(state => [stringValue(state.stateKey), state]));
  const actionById = new Map(actions.map(action => [stringValue(action.actionId), action]));
  const checks: PageQualityCheckResult[] = [];
  const add = (id: string, scope: 'layout' | 'render', passed: boolean, message: string): void => {
    checks.push({ id, scope, passed, message });
  };

  const deadLayoutStates = states.filter(state => stringValue(state.kind) === 'layoutState');
  add('hygiene.layout-state-binding', 'layout', deadLayoutStates.length === 0,
    deadLayoutStates.length ? `layoutState without binding: ${deadLayoutStates.map(state => stringValue(state.stateKey)).join(', ')}` : 'no unbound layoutState');

  for (const intent of intents) {
    const title = stringValue(intent.titleKey);
    const empty = stringValue(intent.emptyKey);
    const distinctEmpty = !title || !empty || !stringValue(i18n[title]) || stringValue(i18n[title]) !== stringValue(i18n[empty]);
    add(`hygiene.empty-state.${stringValue(intent.id)}`, 'layout', distinctEmpty,
      distinctEmpty ? 'empty state is distinct' : `empty state repeats intention title: ${stringValue(intent.id)}`);

    for (const field of [...arrayRecords(intent.fields), ...arrayRecords(intent.filters)]) {
      const fieldName = stringValue(field.field);
      const state = stateByKey.get(stringValue(field.stateKey));
      const technical = /Id$/i.test(fieldName) || Boolean(stringValue(state?.referenceEntity));
      const editable = stringValue(state?.kind) === 'input' && stringValue(state?.presentation) === 'form';
      const inputType = stringValue(field.inputType).toLowerCase();
      const safe = !technical || !editable || inputType === 'hidden' || (inputType === 'select' && Boolean(stringValue(field.source)));
      add(`hygiene.technical-input.${stringValue(field.id)}`, 'layout', safe,
        safe ? 'technical reference is contextual, hidden or lookup-backed' : `technical reference is free text: ${stringValue(intent.id)}.${fieldName}`);
    }

    const columns = arrayRecords(intent.columns);
    const hasReadableColumn = columns.some(column => !/Id$/i.test(stringValue(column.field)));
    for (const column of columns.filter(item => /Id$/i.test(stringValue(item.field)))) {
      add(`hygiene.technical-column.${stringValue(column.id)}`, 'layout', !hasReadableColumn,
        hasReadableColumn ? `technical id column has a readable alternative: ${stringValue(column.field)}` : 'technical id retained because no readable output is available');
    }

    for (const rowAction of arrayRecords(intent.rowActions)) {
      const rowRef = stringValue(rowAction.rowRef);
      const targetAction = actionById.get(stringValue(rowAction.action));
      const formStateKeys = Array.isArray(targetAction?.inputStateKeys)
        ? targetAction.inputStateKeys.filter((stateKey: unknown) => stringValue(stateByKey.get(stringValue(stateKey))?.presentation) === 'form')
        : [];
      const prefillRefs = Array.isArray(rowAction.prefillRefs) ? rowAction.prefillRefs.map(stringValue).filter(Boolean) : [];
      const contextual = stringValue(rowAction.context) === 'row' && Boolean(rowRef) && (formStateKeys.length === 0 || prefillRefs.length > 0);
      add(`hygiene.row-action.${stringValue(rowAction.id)}`, 'layout', contextual,
        contextual ? 'row action declares row identity and draft prefill' : `row action does not reference/prefill its row: ${stringValue(rowAction.id)}`);
      if (pageCode && contextual) {
        const setterNames = formStateKeys.map((stateKey: unknown) => stringValue(actions.find(action => stringValue(action.kind) === 'stateSetter' && stringValue(action.stateKey) === stringValue(stateKey))?.methodName)).filter(Boolean);
        const rendered = pageCode.includes(rowRef) && prefillRefs.every((ref: string) => pageCode.includes(ref)) && setterNames.every(name => pageCode.includes(name));
        add(`hygiene.row-action-render.${stringValue(rowAction.id)}`, 'render', rendered,
          rendered ? 'render consumes row identity and declared prefill setters' : `render does not consume row context for ${stringValue(rowAction.id)}`);
      }
    }
  }

  const mutations = actions.filter(action => stringValue(action.kind) === 'command');
  for (const action of mutations) {
    const actionId = stringValue(action.actionId);
    const feedback = isRecord(action.feedback) ? action.feedback : {};
    const successKey = stringValue(feedback.successMessageKey);
    const errorKey = stringValue(feedback.errorMessageKey);
    const dismissActionId = stringValue(feedback.dismissActionId);
    const feedbackComplete = Boolean(
      successKey && errorKey && stringValue(i18n[successKey]) && stringValue(i18n[errorKey])
      && feedback.dismissible === true && dismissActionId && actionById.has(dismissActionId)
      && stringValue(action.errorStateKey) && Array.isArray(action.clearInputStateKeys)
    );
    add(`hygiene.mutation-feedback.${actionId}`, 'layout', feedbackComplete,
      feedbackComplete ? 'mutation has textual dismissible feedback and clear wiring' : `mutation feedback wiring incomplete: ${actionId}`);
    if (pageCode) {
      const rendered = Boolean(successKey && errorKey && pageCode.includes(successKey) && pageCode.includes(errorKey)
        && pageCode.includes(stringValue(actionById.get(dismissActionId)?.handlerName)));
      add(`hygiene.mutation-feedback-render.${actionId}`, 'render', rendered,
        rendered ? 'render exposes textual dismissible feedback' : `render feedback missing: ${actionId}`);
    }
  }

  const layoutActions = intents.flatMap(intent => [
    ...arrayRecords(intent.toolbar),
    ...arrayRecords(intent.rowActions),
    ...arrayRecords(intent.actions),
  ]);
  for (const action of mutations.filter(item => stringValue(item.operationKind).toLowerCase() === 'delete')) {
    const actionId = stringValue(action.actionId);
    const occurrences = layoutActions.filter(item => stringValue(item.action) === actionId);
    const confirmed = occurrences.every(item => item.confirmation === true);
    add(`hygiene.destructive-confirmation.${actionId}`, 'layout', confirmed,
      confirmed ? 'destructive action requires confirmation' : `destructive action lacks confirmation: ${actionId}`);
    if (pageCode && occurrences.length) {
      const rendered = /\bconfirm\s*\(|<dialog\b|role=["']dialog["']/.test(pageCode);
      add(`hygiene.destructive-confirmation-render.${actionId}`, 'render', rendered,
        rendered ? 'render includes confirmation UI' : `render confirmation missing: ${actionId}`);
    }
  }

  addHierarchyChecks(sections, organisms, intents, i18n, add);
  addWiringChecks(pageDefinition.templateWiring, states, actions, intents, add);
  for (const check of arrayRecords(pageDefinition.templateValidationChecks)) {
    const id = stringValue(check.id);
    const passed = evaluateTemplateCheck(id, sections, organisms, intents, states, actions);
    add(`template.${id}`, 'layout', passed, passed ? `template check passed: ${id}` : `template check failed: ${id}`);
  }

  if (pageCode && actions.some(action => stringValue(action.kind) === 'query' || stringValue(action.kind) === 'command')) {
    const loadingVisible = /loading|skeleton|placeholder|spinner|progress/i.test(pageCode);
    add('hygiene.loading-render', 'render', loadingVisible,
      loadingVisible ? 'render exposes loading state' : 'render does not expose loading state');
  }

  return { pageId, templateId, passed: checks.every(check => check.passed), checks };
}

export function validateGeneratedPageQuality(pageDefinition: unknown, sharedDefinition: unknown, pageCode: string): string[] {
  const result = evaluateGeneratedPageQuality(pageDefinition, sharedDefinition, pageCode);
  return result.checks.filter(check => !check.passed).map(check => `${result.pageId ? `${result.pageId}: ` : ''}${check.message}`);
}

function addHierarchyChecks(
  sections: Record<string, any>[],
  _organisms: Record<string, any>[],
  _intents: Record<string, any>[],
  i18n: Record<string, any>,
  add: (id: string, scope: 'layout' | 'render', passed: boolean, message: string) => void,
): void {
  const repeated = sections.some(section => {
    const sectionTitle = stringValue(i18n[stringValue(section.titleKey)]);
    return arrayRecords(section.organisms).some(organism => {
      const organismTitle = stringValue(i18n[stringValue(organism.titleKey)]);
      const parentTitle = organismTitle || sectionTitle;
      return Boolean(organismTitle && organismTitle === sectionTitle)
        || arrayRecords(organism.intentions).some(intent => {
          const intentTitle = stringValue(i18n[stringValue(intent.titleKey)]);
          return Boolean(intentTitle && intentTitle === parentTitle);
        });
    });
  });
  add('hygiene.title-hierarchy', 'layout', !repeated,
    repeated ? 'section/organism/intention title repeats its parent' : 'title hierarchy is distinct');
}

function addWiringChecks(
  wiringValue: unknown,
  states: Record<string, any>[],
  actions: Record<string, any>[],
  intents: Record<string, any>[],
  add: (id: string, scope: 'layout' | 'render', passed: boolean, message: string) => void,
): void {
  if (!isRecord(wiringValue)) return;
  const requiredStates = Array.isArray(wiringValue.minimumStates) ? wiringValue.minimumStates.map(stringValue) : [];
  const mutations = actions.filter(action => stringValue(action.kind) === 'command');
  const selected = actions.some(action =>
    (Array.isArray(action.selectedEntityInputStateKeys) && action.selectedEntityInputStateKeys.length > 0)
    || (Array.isArray(action.routeParamInputStateKeys) && action.routeParamInputStateKeys.length > 0));
  const roles: Record<string, boolean> = {
    selectedId: selected,
    formDraft: states.some(state => stringValue(state.kind) === 'input' && stringValue(state.presentation) === 'form'),
    loading: states.some(state => stringValue(state.kind) === 'actionStatus'),
    mutationFeedback: mutations.every(action => isRecord(action.feedback)),
  };
  for (const role of requiredStates) add(`wiring.state.${role}`, 'layout', roles[role] === true,
    roles[role] ? `wiring state role available: ${role}` : `wiring state role missing: ${role}`);

  const transitions = Array.isArray(wiringValue.transitions) ? wiringValue.transitions.map(stringValue) : [];
  for (const transition of transitions) {
    const passed = transition.startsWith('rowSelect')
      ? selected && intents.some(intent => arrayRecords(intent.rowActions).some(action => stringValue(action.context) === 'row' && Boolean(stringValue(action.rowRef))))
      : mutations.length > 0 && mutations.every(action => {
        const hasQuery = actions.some(candidate => stringValue(candidate.kind) === 'query');
        return (!hasQuery || Array.isArray(action.refreshActionIds)) && Array.isArray(action.clearInputStateKeys) && isRecord(action.feedback);
      });
    add(`wiring.transition.${transition}`, 'layout', passed,
      passed ? `wiring transition available: ${transition}` : `wiring transition missing: ${transition}`);
  }
}

function evaluateTemplateCheck(
  id: string,
  sections: Record<string, any>[],
  organisms: Record<string, any>[],
  intents: Record<string, any>[],
  states: Record<string, any>[],
  actions: Record<string, any>[],
): boolean {
  const intentKinds = intents.map(intent => stringValue(intent.intent).toLowerCase());
  const organismKinds = organisms.map(organism => stringValue(organism.type).toLowerCase());
  const matches = (pattern: RegExp): boolean => intentKinds.some(kind => pattern.test(kind)) || organismKinds.some(kind => pattern.test(kind));
  const listCount = intentKinds.filter(kind => /(querylist|list|table|queue)/.test(kind)).length;
  const selected = actions.filter(action =>
    (Array.isArray(action.selectedEntityInputStateKeys) && action.selectedEntityInputStateKeys.length > 0)
    || (Array.isArray(action.routeParamInputStateKeys) && action.routeParamInputStateKeys.length > 0));
  const rowActions = intents.flatMap(intent => arrayRecords(intent.rowActions));
  const destructive = actions.filter(action => stringValue(action.kind) === 'command' && stringValue(action.operationKind).toLowerCase() === 'delete');
  const submitActions = [...new Set(intents.map(intent => stringValue(intent.submitAction)).filter(Boolean))];
  switch (id) {
    case 'one-primary-list': return listCount === 1;
    case 'has-list': return listCount > 0;
    case 'has-list-fallback': return listCount > 0;
    case 'has-card-list': return matches(/card/);
    case 'has-command-form': return matches(/commandform|form/);
    case 'has-detail-surface': return matches(/detail|summary|profile/);
    case 'has-workflow-status': return matches(/workflowstatus|queue|status/);
    case 'has-board': return matches(/board|kanban|pipeline/);
    case 'has-status-group': return matches(/status|summary|metric|dashboard/);
    case 'has-visual-fallback': return matches(/visual|map|spatial/) && listCount > 0;
    case 'has-calendar': return matches(/calendar|schedule/);
    case 'has-report': return matches(/report|aggregate|summary/);
    case 'has-bulk-selection': return selected.some(action => Array.isArray(action.selectedEntityInputStateKeys) && action.selectedEntityInputStateKeys.length > 1)
      || states.some(state => /selectedIds/i.test(stringValue(state.name)));
    case 'has-wizard-steps': return sections.length > 1 || intents.length > 1;
    case 'has-repeatable-input': return states.some(state => stringValue(state.kind) === 'input' && Array.isArray(state.defaultValue));
    case 'single-submit-action': return submitActions.length === 1;
    case 'all-form-inputs-covered': {
      const renderedStateKeys = new Set(intents.flatMap(intent => arrayRecords(intent.fields).map(field => stringValue(field.stateKey))).filter(Boolean));
      return states.filter(state => stringValue(state.kind) === 'input' && stringValue(state.presentation) === 'form' && state.required === true)
        .every(state => renderedStateKeys.has(stringValue(state.stateKey)));
    }
    case 'has-selection-context': return selected.length > 0;
    case 'has-row-action-context': return rowActions.length > 0 && rowActions.every(action => stringValue(action.context) === 'row' && Boolean(stringValue(action.rowRef)));
    case 'has-destructive-confirmation': return destructive.length === 0 || destructive.every(action => {
      const actionId = stringValue(action.actionId);
      const occurrences = rowActions.filter(item => stringValue(item.action) === actionId);
      return occurrences.length > 0 && occurrences.every(item => item.confirmation === true);
    });
    case 'has-refresh': return actions.some(action => stringValue(action.kind) === 'query');
    default: return false;
  }
}

export const CONTRACTS_102029: readonly string[] = [
  '_102029_/l2/collabLitElement.ts',
  '_102029_/l2/bffClient.ts',
  '_102029_/l2/collabState.ts',
  '_102029_/l2/interactionRuntime.ts',
];

export function expandContextRef(ref: string): string[] {
  return ref === '_102029_.d.ts' ? [...CONTRACTS_102029] : [ref];
}

const LAYER_RANK: Record<string, number> = {
  l2_contract: 0,
  l2_shared: 1,
  l2_page: 2,
};

export function layerRank(type: string): number {
  return type in LAYER_RANK ? LAYER_RANK[type] : 99;
}

export function orderItems(items: PipelineItem[]): PipelineItem[] {
  return [...items].sort((a, b) => (
    layerRank(a.type) - layerRank(b.type)
    || pageKey(a).localeCompare(pageKey(b))
    || a.id.localeCompare(b.id)
    || a.outputPath.localeCompare(b.outputPath)
  ));
}

function pageKey(item: PipelineItem): string {
  return item.outputPath.replace(/\.ts$/, '').split('/').pop() ?? item.id;
}

export function isStale(defsMs: number | null, tsMs: number | null, dependencyMs: number | null = null): boolean {
  if (tsMs == null) return true;
  if (defsMs != null && defsMs > tsMs) return true;
  if (dependencyMs != null && dependencyMs > tsMs) return true;
  return false;
}

function extractConstObject(src: string, name: string): unknown {
  const marker = `export const ${name}`;
  const at = src.indexOf(marker);
  if (at < 0) return null;
  const eq = src.indexOf('=', at);
  if (eq < 0) return null;
  let open = eq + 1;
  while (open < src.length && /\s/.test(src[open])) open++;
  const openCh = src[open];
  const closeCh = openCh === '[' ? ']' : openCh === '{' ? '}' : '';
  if (!closeCh) return null;

  let depth = 0;
  let inStr = false;
  let strCh = '';
  let i = open;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (c === '\\') { i++; continue; }
      if (c === strCh) inStr = false;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = true;
      strCh = c;
      continue;
    }
    if (c === openCh) depth++;
    else if (c === closeCh) {
      depth--;
      if (depth === 0) { i++; break; }
    }
  }

  try { return JSON.parse(src.slice(open, i)); } catch { return null; }
}

function firstExportName(src: string): string | null {
  const re = /export const\s+([A-Za-z0-9_$]+)\s*=/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (m[1] !== 'pipeline') return m[1];
  }
  return null;
}

export function parseDefs(src: string): ParsedDefs {
  const dataExportName = firstExportName(src);
  const artifact = dataExportName ? extractConstObject(src, dataExportName) as Record<string, unknown> | unknown[] | null : null;
  const pipelineArr = extractConstObject(src, 'pipeline');
  const item = Array.isArray(pipelineArr) && pipelineArr.length ? pipelineArr[0] as PipelineItem : null;
  const data = artifact && typeof artifact === 'object' && !Array.isArray(artifact) && 'data' in artifact
    ? (artifact as { data: unknown }).data
    : artifact;
  return { dataExportName, artifact, data, item };
}

export const GEN_TOOL_NAME = 'submitGeneratedTs';

export const GEN_TOOL = {
  type: 'function',
  function: {
    name: GEN_TOOL_NAME,
    description: 'Submit the complete generated TypeScript file content.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['code'],
      properties: {
        code: { type: 'string', description: 'Complete TypeScript file content. Must start with the MLS header.' },
      },
    },
  },
} as const;

export const DEFAULT_MODEL_TYPE = 'codehigh';
export const MATERIALIZE_REPAIR_ATTEMPTS = 1;

export function parseModelType(systemPrompt: string): string | null {
  const m = systemPrompt.match(/<!--\s*modelType:\s*([A-Za-z0-9_-]+)\s*-->/);
  return m ? m[1] : null;
}

export function buildSystemPrompt(skillSections: string[], outputPath: string, modelType: string): string {
  const skills = skillSections.length ? skillSections.join('\n\n---\n\n') : '<!-- no skill loaded -->';
  const header = mlsHeaderForOutputPath(outputPath);
  return `<!-- modelType: ${modelType} -->
<!-- x-tool-strict: true -->

You generate one L2 frontend TypeScript file from a .defs.ts definition and context files.

Target file: ${outputPath}

The file must start with:
${header}

Follow the skill instructions exactly.
Use context files as source of truth for types, imports, states, actions, handlers and message keys.
The generated file is checked with TypeScript strict null checks and no implicit any.
Annotate callback parameters, avoid nullable assignments without guards, and do not rely on implicit any.
Return ONLY the file through the ${GEN_TOOL_NAME} tool.

---

${skills}`;
}

export function buildHumanPrompt(data: unknown, contextSections: string[], outputPath: string, repairHint?: string): string {
  const lines = ['## Definition', '', '```json', JSON.stringify(data, null, 2), '```', ''];
  if (contextSections.length) {
    lines.push('## Context files (dependsFiles)', '');
    for (const c of contextSections) lines.push(c, '');
  }
  lines.push('## Output', '', `Generate ONLY the TypeScript for: ${outputPath}`, `Call ${GEN_TOOL_NAME} with the complete code.`);
  if (repairHint) lines.push('', repairHint);
  return lines.join('\n');
}

export function buildMissingCodeRepairHint(outputPath: string, detail: string): string {
  return [
    '## Repair',
    `The previous attempt did not produce a complete tool response for ${outputPath}.`,
    detail ? `Reason: ${detail}` : '',
    `Return ONLY the ${GEN_TOOL_NAME} tool call with the COMPLETE TypeScript file.`,
    'Do not write analysis, markdown or partial code before calling the tool.',
  ].filter(Boolean).join('\n');
}

export function buildCompileRepairHint(outputPath: string, errors: string[]): string {
  return [
    '## Repair',
    `The previous generated file for ${outputPath} failed TypeScript checking.`,
    '',
    'Compiler errors:',
    '```text',
    errors.slice(0, 20).join('\n'),
    '```',
    '',
    `Return the COMPLETE corrected TypeScript file through the ${GEN_TOOL_NAME} tool.`,
    'Fix exactly these syntax/type errors while preserving the .defs.ts contract and the existing context.',
  ].join('\n');
}

export function applyHeader(outputPath: string, code: string): string {
  const header = mlsHeaderForOutputPath(outputPath);
  const trimmed = code.trimStart();
  const existingHeader = /^\/\/\/\s*<mls\b[^>]*\/>\s*/;
  if (existingHeader.test(trimmed)) return trimmed.replace(existingHeader, `${header}\n\n`);
  return `${header}\n\n${trimmed}`;
}

/**
 * Repair deterministic seams that are part of the generated-file contract, not presentation.
 * The model still owns the implementation; it cannot choose a different shared import extension
 * or base class name because both are already fixed by the page/shared definitions.
 */
export function normalizeGeneratedCode(item: PipelineItem, data: unknown, code: string): string {
  if (!isRecord(data)) return code;
  if (item.type === 'l2_shared') {
    const baseClassName = typeof data.baseClassName === 'string' ? data.baseClassName : '';
    if (!baseClassName) return code;
    return code.replace(/export\s+class\s+[A-Za-z_$][A-Za-z0-9_$]*\s+extends\s+CollabLitElement\b/, `export class ${baseClassName} extends CollabLitElement`);
  }
  if (item.type !== 'l2_page') return code;

  const baseClassName = typeof data.baseClassName === 'string' ? data.baseClassName : '';
  return code
    .replace(/(from\s+['"][^'"]+\/web\/shared\/[^'"]+)\.ts(['"])/g, '$1.js$2')
    .replace(/(import\s*\{\s*)[A-Za-z_$][A-Za-z0-9_$]*(\s*\}\s*from\s*['"][^'"]+\/web\/shared\/[^'"]+\.js['"])/g, (_match, start, end) => baseClassName ? `${start}${baseClassName}${end}` : _match);
}

export function testPathForOutputPath(outputPath: string): string {
  return outputPath.replace(/\.ts$/, '.test.ts');
}

export function buildMaterializeTypecheckTest(item: PipelineItem, data: unknown): string | null {
  if (item.type === 'l2_contract') return buildContractTypecheckTest(item.outputPath, data);
  if (item.type === 'l2_shared') return buildSharedTypecheckTest(item.outputPath, data);
  return null;
}

export function mlsHeaderForOutputPath(outputPath: string): string {
  return `/// <mls fileReference="${outputPath}" enhancement="${headerEnhancementForOutputPath(outputPath)}"/>`;
}

export function headerEnhancementForOutputPath(outputPath: string): string {
  if (/^_\d+_\/l2\/[^/]+\/web\/shared\/[^/]+\.ts$/.test(outputPath)) return '_102020_/l2/enhancementAura';
  if (/^_\d+_\/l2\/[^/]+\/web\/(?:desktop|mobile)\/page\d+\/[^/]+\.ts$/.test(outputPath)) return '_102020_/l2/enhancementAura';
  return '_blank';
}

function buildContractTypecheckTest(outputPath: string, data: unknown): string | null {
  if (!Array.isArray(data)) return null;

  const moduleName = moduleNameFromOutputPath(outputPath);
  if (!moduleName) return null;
  const modulePrefix = toPascalCase(moduleName);
  const imports = new Set<string>();
  const declarations: string[] = [];
  const assertions: string[] = [];

  for (const command of data) {
    if (!isRecord(command) || typeof command.commandName !== 'string') continue;
    const commandName = command.commandName;
    const commandPrefix = `${modulePrefix}${toPascalCase(commandName)}`;
    const inputName = `${commandPrefix}Input`;
    const outputName = `${commandPrefix}Output`;
    const outputItemName = `${commandPrefix}OutputItem`;
    const isQuery = command.kind === 'query';
    const outputShape = commandOutputShape(command);
    const inputFields = Array.isArray(command.input) ? command.input.filter(isRecord) : [];
    const outputFields = Array.isArray(command.output) ? command.output.filter(isRecord) : [];

    imports.add(inputName);
    imports.add(outputName);
    if (isQuery) imports.add(outputItemName);

    const expectedInputName = `Expected${inputName}`;
    const expectedOutputName = `Expected${outputName}`;
    const expectedOutputItemName = `Expected${outputItemName}`;

    declarations.push(`type ${expectedInputName} = ${objectType(inputFields, 'input')};`);
    assertions.push(`type ${assertName(inputName, commandName)} = Assert<Equal<${inputName}, ${expectedInputName}>>;`);

    if (isQuery) {
      declarations.push(`type ${expectedOutputItemName} = ${objectType(outputFields, 'output')};`);
      if (outputShape === 'paginated') {
        declarations.push(`type ${expectedOutputName} = { items: ${expectedOutputItemName}[]; total: number; page?: number; pageSize?: number; };`);
      } else if (outputShape === 'object') {
        declarations.push(`type ${expectedOutputName} = ${expectedOutputItemName};`);
      } else {
        declarations.push(`type ${expectedOutputName} = ${expectedOutputItemName}[];`);
      }
      assertions.push(`type ${assertName(outputItemName, commandName)} = Assert<Equal<${outputItemName}, ${expectedOutputItemName}>>;`);
      assertions.push(`type ${assertName(outputName, commandName)} = Assert<Equal<${outputName}, ${expectedOutputName}>>;`);
    } else {
      declarations.push(`type ${expectedOutputName} = ${objectType(outputFields, 'output')};`);
      assertions.push(`type ${assertName(outputName, commandName)} = Assert<Equal<${outputName}, ${expectedOutputName}>>;`);
    }
  }

  if (!imports.size) return null;
  const testPath = testPathForOutputPath(outputPath);
  return [
    mlsHeaderForOutputPath(testPath),
    '',
    `import type { ${[...imports].sort().join(', ')} } from './${fileBaseName(outputPath)}.js';`,
    '',
    'type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;',
    'type Assert<T extends true> = T;',
    '',
    '// This file is generated from .defs.ts so tsc catches contract drift in the generated .ts.',
    ...declarations,
    '',
    ...assertions,
    '',
    'export {};',
  ].join('\n');
}

function buildSharedTypecheckTest(outputPath: string, data: unknown): string | null {
  if (!isRecord(data)) return null;
  const moduleName = typeof data.moduleName === 'string' ? data.moduleName : moduleNameFromOutputPath(outputPath);
  const pageId = typeof data.pageId === 'string' ? data.pageId : fileBaseName(outputPath);
  if (!moduleName || !pageId) return null;

  const className = `${toPascalCase(moduleName)}${toPascalCase(pageId)}Base`;
  const stateAssertions: string[] = [];
  const actionAssertions: string[] = [];
  const contractImports = new Map<string, Set<string>>();

  const states = Array.isArray(data.states) ? data.states.filter(isRecord) : [];
  for (const state of states) {
    const propertyName = typeof state.name === 'string' && state.name ? state.name : camelCaseFromKey(String(state.stateKey ?? ''));
    if (!propertyName) continue;
    const expectedType = stateAssertionType(state, sharedStateContractType(outputPath, data, state, contractImports));
    stateAssertions.push(`type ${assertName(`State_${propertyName}`, propertyName)} = Assert<Assignable<typeof page${propertyAccess(propertyName)}, ${expectedType}>>;`);
  }

  const actions = Array.isArray(data.actions) ? data.actions.filter(isRecord) : [];
  for (const action of actions) {
    // Assert only that the action/handler EXISTS and is callable — never its return type.
    // Return types (void / boolean / Promise<void>) are LLM implementation choices, not contract-
    // governed, so pinning them produced false failures (e.g. a handler written as `(): boolean`
    // checked against `void`, or sync/async mismatches). `(...args: any[]) => unknown` accepts any
    // function shape; accessing a missing/renamed method still fails to compile (TS2339), which is
    // the check worth keeping. Property/state types remain fully asserted above (contract-governed).
    if (typeof action.methodName === 'string' && action.methodName) {
      actionAssertions.push(`type ${assertName(`Action_${action.methodName}`, action.methodName)} = Assert<Assignable<typeof page${propertyAccess(action.methodName)}, (...args: any[]) => unknown>>;`);
    }
    if (typeof action.handlerName === 'string' && action.handlerName) {
      actionAssertions.push(`type ${assertName(`Handler_${action.handlerName}`, action.handlerName)} = Assert<Assignable<typeof page${propertyAccess(action.handlerName)}, (...args: any[]) => unknown>>;`);
    }
  }

  if (!stateAssertions.length && !actionAssertions.length) return null;
  const testPath = testPathForOutputPath(outputPath);
  return [
    mlsHeaderForOutputPath(testPath),
    '',
    `import type { ${className} } from './${fileBaseName(outputPath)}.js';`,
    ...contractImportLines(contractImports),
    '',
    'type IsAny<T> = 0 extends (1 & T) ? true : false;',
    'type Assignable<Actual, Expected> = IsAny<Actual> extends true ? false : [Actual] extends [Expected] ? true : false;',
    'type Assert<T extends true> = T;',
    '',
    `declare const page: ${className};`,
    '',
    '// This file is generated from .defs.ts. Add narrower state/action assertions here as materialization rules evolve.',
    ...stateAssertions,
    ...actionAssertions,
    '',
    'export {};',
  ].join('\n');
}

function objectType(fields: Record<string, unknown>[], direction: 'input' | 'output'): string {
  if (fields.length === 0) return '{}';
  const lines = ['{'];
  for (const field of fields) {
    const name = typeof field.name === 'string' && field.name ? field.name : null;
    if (!name) continue;
    const optional = direction === 'input' ? field.required !== true : field.required === false;
    lines.push(`  ${propertyKey(name)}${optional ? '?' : ''}: ${fieldType(field)};`);
  }
  lines.push('}');
  return lines.join('\n');
}

function fieldType(field: Record<string, unknown>): string {
  if (Array.isArray(field.enum) && field.enum.length > 0 && field.enum.every(item => typeof item === 'string')) {
    return field.enum.map(item => JSON.stringify(item)).join(' | ');
  }

  const rawType = String(field.type ?? 'unknown').trim();
  const t = rawType.toLowerCase();
  if (t.endsWith('[]')) return `${primitiveType(t.slice(0, -2))}[]`;
  if (t === 'array' || t === 'list') return 'unknown[]';
  return primitiveType(t);
}

function primitiveType(type: string): string {
  if (['string', 'uuid', 'guid', 'email', 'url', 'uri', 'date', 'datetime', 'date-time', 'time', 'timestamp', 'timestamptz'].includes(type)) return 'string';
  if (['number', 'integer', 'int', 'int32', 'int64', 'float', 'double', 'decimal', 'money', 'currency'].includes(type)) return 'number';
  if (type === 'boolean' || type === 'bool') return 'boolean';
  if (type === 'json' || type === 'object' || type === 'any' || type === 'unknown') return 'unknown';
  return 'unknown';
}

function stateAssertionType(state: Record<string, unknown>, contractType?: string | null): string {
  const types: string[] = [];
  if (Array.isArray(state.valueSet) && state.valueSet.length > 0 && state.valueSet.every(item => typeof item === 'string')) {
    types.push(...state.valueSet.map(item => JSON.stringify(item)));
  } else if (state.collection === true || Array.isArray(state.defaultValue)) {
    types.push('unknown[]');
  } else {
    const value = state.defaultValue;
    if (typeof value === 'number') types.push('number');
    else if (typeof value === 'boolean') types.push('boolean');
    else if (typeof value === 'string') types.push('string');
    else types.push('unknown');
  }
  if (contractType) {
    if (types.length === 1 && types[0] === 'unknown') types[0] = contractType;
    else types.push(contractType);
  }
  // A state initialized with null (the async-loaded contract data pattern: `T | null = null`)
  // is nullable, so the expected type must include null — otherwise Assignable<T | null, T>
  // fails with TS2344 on EVERY contract state (cafeFlow bug_changeFrontend1). 'unknown' already
  // absorbs null, so skip in that case.
  if ((state.defaultValue === null || state.nullable === true) && !types.includes('unknown')) {
    types.push('null');
  }
  return uniqueTypeUnion(types);
}

function sharedStateContractType(outputPath: string, data: Record<string, unknown>, state: Record<string, unknown>, imports: Map<string, Set<string>>): string | null {
  const ref = isRecord(state.contractRef) ? state.contractRef : null;
  if (!ref || (ref.direction !== 'input' && ref.direction !== 'output')) return null;
  const commandName = typeof ref.commandName === 'string' && ref.commandName ? ref.commandName : null;
  const moduleName = typeof data.moduleName === 'string' && data.moduleName ? data.moduleName : moduleNameFromOutputPath(outputPath);
  const contractPath = sharedContractTsPath(outputPath, data);
  if (!commandName || !moduleName || !contractPath) return null;

  const inputType = `${toPascalCase(moduleName)}${toPascalCase(commandName)}Input`;
  const outputType = `${toPascalCase(moduleName)}${toPascalCase(commandName)}Output`;
  const importPath = relativeJsImportPath(outputPath, contractPath);
  const names = imports.get(importPath) ?? new Set<string>();
  if (ref.direction === 'output') {
    names.add(outputType);
    imports.set(importPath, names);
    return outputType;
  }

  const field = typeof ref.field === 'string' && ref.field ? ref.field : null;
  if (!field) return null;
  names.add(inputType);
  imports.set(importPath, names);
  return `${inputType}[${JSON.stringify(field)}]`;
}

function commandOutputShape(command: Record<string, unknown>): 'array' | 'paginated' | 'object' {
  if (command.outputShape === 'paginated') return 'paginated';
  if (command.outputShape === 'object') return 'object';
  return 'array';
}

function sharedContractTsPath(outputPath: string, data: Record<string, unknown>): string | null {
  const ref = isRecord(data.contractRef) ? data.contractRef : null;
  if (ref && typeof ref.tsPath === 'string' && ref.tsPath) return ref.tsPath;
  if (outputPath.includes('/web/shared/')) return outputPath.replace('/web/shared/', '/web/contracts/');
  return null;
}

function contractImportLines(imports: Map<string, Set<string>>): string[] {
  return [...imports.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([importPath, names]) => `import type { ${[...names].sort().join(', ')} } from '${importPath}';`);
}

function relativeJsImportPath(fromPath: string, toPath: string): string {
  const fromParts = fromPath.split('/');
  fromParts.pop();
  const toParts = toPath.replace(/\.ts$/, '.js').split('/');
  let i = 0;
  while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) i++;
  const parts = [...Array(fromParts.length - i).fill('..'), ...toParts.slice(i)];
  const rel = parts.join('/') || '.';
  return rel.startsWith('.') ? rel : `./${rel}`;
}

function uniqueTypeUnion(types: string[]): string {
  if (types.includes('unknown')) return 'unknown';
  return [...new Set(types)].join(' | ') || 'unknown';
}

function moduleNameFromOutputPath(outputPath: string): string | null {
  const match = /^_\d+_\/l2\/([^/]+)\//.exec(outputPath);
  return match ? match[1] : null;
}

function fileBaseName(outputPath: string): string {
  const filename = outputPath.split('/').pop() ?? outputPath;
  return filename.replace(/\.ts$/, '');
}

function toPascalCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function camelCaseFromKey(value: string): string {
  const parts = value.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (!parts.length) return '';
  const [first, ...rest] = parts;
  return first.charAt(0).toLowerCase() + first.slice(1) + rest.map(toPascalCase).join('');
}

function propertyKey(value: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value) ? value : JSON.stringify(value);
}

function propertyAccess(value: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value) ? `.${value}` : `[${JSON.stringify(value)}]`;
}

function assertName(rawName: string, fallback: string): string {
  const clean = rawName.replace(/[^A-Za-z0-9_$]+/g, '_').replace(/^([^A-Za-z_$])/, '_$1');
  return `_${clean || toPascalCase(fallback)}`;
}

function isRecord(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function arrayRecords(value: unknown): Record<string, any>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}
