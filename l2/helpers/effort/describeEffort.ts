/// <mls fileReference="_102020_/l2/helpers/effort/describeEffort.ts" enhancement="_blank"/>

import { parseD2ContractV2 } from '/_102020_/l2/helpers/contractV2/render.js';
import { isTextOnlyChange, L4_TEXT_ATTRIBUTES, type EffortAgentRef, type EffortAnswer, type EffortInput, type EffortPromptRequest, type EffortUnitRef } from '/_102035_/l2/solution/poolPlan.js';

const MASTER = { project: '102020', kind: 'l2', device: 'web' } as const;
const NO_LANGUAGES = 'module has no declared languages';

export interface DescribeEffortSources {
  /** `l4/<module>/pool/l1/web/needs.json` body. Absent abends with that path. */
  needsSource?: string;
  /** `l4/<module>/module.defs.ts` body. Absent is the same as a file with no languages. */
  moduleSource?: string;
  /** `l5/config.json` body. Absent means the module has no `userLanguage` there. */
  configSource?: string;
  /** `l2/<module>/web/shared/<pageId>.defs.ts` bodies, keyed by page id. */
  shared?: Record<string, string>;
}

function answer(
  input: EffortInput,
  materialize: EffortUnitRef[],
  reason?: string,
  runAgents: EffortAgentRef[] = [],
  regenerateDefs: EffortUnitRef[] = [],
  create: EffortUnitRef[] = [],
  contract: 'keep' | 'change' = 'keep',
): EffortAnswer {
  return {
    master: { ...MASTER },
    item: input.item.changeId,
    status: reason ? 'abend' : 'computed',
    create,
    regenerateDefs,
    materialize,
    remove: [],
    runAgents,
    contract,
    ...(reason ? { abend: { reason } } : {}),
  };
}

function fieldPath(input: EffortInput): string {
  const fieldId = input.item.changeId.startsWith('field:') ? input.item.changeId.slice('field:'.length) : '';
  return `${input.item.entity}.${fieldId}`;
}

function needsPath(moduleName: string): string {
  return `l4/${moduleName}/pool/l1/web/needs.json`;
}

function quoted(source: string, name: string): string | undefined {
  const match = new RegExp(`"${name}"\\s*:\\s*"([^"]*)"`, 'u').exec(source);
  return match && match[1].length > 0 ? match[1] : undefined;
}

function quotedList(source: string, name: string): string[] {
  const match = new RegExp(`"${name}"\\s*:\\s*\\[([^\\]]*)\\]`, 'u').exec(source);
  if (!match) return [];
  return [...match[1].matchAll(/"([^"]*)"/gu)].map(item => item[1]).filter(code => code.length > 0);
}

function configUserLanguage(source: string | undefined, project: number, moduleName: string): { code?: string; error?: string } {
  if (!source) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: `l5/config.json: ${message}` };
  }
  if (!parsed || typeof parsed !== 'object') return {};
  const projects = (parsed as { projects?: unknown }).projects;
  if (!projects || typeof projects !== 'object') return {};
  const row = (projects as Record<string, unknown>)[String(project)];
  if (!row || typeof row !== 'object') return {};
  const modules = (row as { modules?: unknown }).modules;
  if (!Array.isArray(modules)) return {};
  for (const item of modules) {
    if (!item || typeof item !== 'object') continue;
    const moduleRow = item as { moduleId?: unknown; userLanguage?: unknown };
    if (moduleRow.moduleId !== moduleName) continue;
    if (typeof moduleRow.userLanguage === 'string' && moduleRow.userLanguage.length > 0) return { code: moduleRow.userLanguage };
    return {};
  }
  return {};
}

/** `defaultLanguage`, then `productLanguages`, then the module `userLanguage` in `l5/config.json`. */
function moduleLanguages(moduleSource: string | undefined, configSource: string | undefined, project: number, moduleName: string): { codes: string[]; error?: string } {
  const fromConfig = configUserLanguage(configSource, project, moduleName);
  if (fromConfig.error) return { codes: [], error: fromConfig.error };
  const codes: string[] = [];
  const push = (code: string | undefined): void => {
    if (code && !codes.includes(code)) codes.push(code);
  };
  if (moduleSource) {
    push(quoted(moduleSource, 'defaultLanguage'));
    for (const code of quotedList(moduleSource, 'productLanguages')) push(code);
  }
  push(fromConfig.code);
  return { codes };
}

/** Pages whose `reads[].entity` is the entity of the field (`fieldPath` up to the first `.`). */
function pagesShowingField(input: EffortInput, sources: DescribeEffortSources | undefined): { pages: string[]; error?: string } {
  const entity = fieldPath(input).split('.')[0] ?? '';
  const path = needsPath(input.module);
  const source = sources?.needsSource;
  if (!source) return { pages: [], error: path };
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { pages: [], error: `${path}: ${message}` };
  }
  const pagesRaw = parsed && typeof parsed === 'object' ? (parsed as { pages?: unknown }).pages : undefined;
  if (!Array.isArray(pagesRaw)) return { pages: [], error: `${path}: pages` };
  const pages: string[] = [];
  for (const page of pagesRaw) {
    if (!page || typeof page !== 'object') continue;
    const pageId = (page as { pageId?: unknown }).pageId;
    const reads = (page as { reads?: unknown }).reads;
    if (typeof pageId !== 'string' || !Array.isArray(reads)) continue;
    const shows = reads.some(read => !!read && typeof read === 'object' && (read as { entity?: unknown }).entity === entity);
    if (shows && !pages.includes(pageId)) pages.push(pageId);
  }
  pages.sort();
  return { pages };
}

function textAnswer(input: EffortInput, sources: DescribeEffortSources | undefined): EffortAnswer {
  const shown = pagesShowingField(input, sources);
  if (shown.error) return answer(input, [], shown.error);
  if (shown.pages.length === 0) return answer(input, []);
  const project = projectId(input);
  if (project === undefined) return answer(input, [], `cannot resolve the project of base ${input.base.baseId}`);
  const languages = moduleLanguages(sources?.moduleSource, sources?.configSource, project, input.module);
  if (languages.error) return answer(input, [], languages.error);
  if (languages.codes.length === 0) return answer(input, [], NO_LANGUAGES);
  const command = '@@agentAddLanguage ' + JSON.stringify([{
    languages: languages.codes.map(code => ({ code, name: code })),
    projectId: project,
    moduleName: input.module,
  }]);
  return answer(
    input,
    shown.pages.map(pageId => ({
      kind: 'page' as const,
      id: pageId,
      path: contractPath(input.module, pageId),
    })),
    undefined,
    [{ agent: 'agentAddLanguage', command }],
  );
}

function ruleIdOf(input: EffortInput): string {
  return input.item.changeId.startsWith('rule:') ? input.item.changeId.slice('rule:'.length) : '';
}

function contractPath(moduleName: string, pageId: string): string {
  return `l2/${moduleName}/web/contracts/${pageId}.defs.ts`;
}

function pageUnit(moduleName: string, pageId: string): EffortUnitRef {
  return { kind: 'page', id: pageId, path: contractPath(moduleName, pageId) };
}

/** Ids a process, task or published event looks for in contracts and shared. A task id is `task:<processId>.<taskId>`: both the process id and the full id. A published event uses the whole id after `outbound:`. */
function citeNeedles(input: EffortInput): string[] | null {
  const changeId = input.item.changeId;
  if (input.item.kind === 'process') {
    const processId = changeId.startsWith('process:') ? changeId.slice('process:'.length) : '';
    return processId ? [processId] : [];
  }
  if (input.item.kind === 'outbound') {
    const eventId = changeId.startsWith('outbound:') ? changeId.slice('outbound:'.length) : '';
    return eventId ? [eventId] : [];
  }
  if (input.item.kind !== 'task') return null;
  const full = changeId.startsWith('task:') ? changeId.slice('task:'.length) : '';
  const dot = full.indexOf('.');
  const processId = dot > 0 ? full.slice(0, dot) : '';
  return [...new Set([processId, full].filter(id => id.length > 0))];
}

function textCites(text: string, ids: string[]): boolean {
  return ids.some(id => text.includes(id));
}

const SHAPE_KEYS = new Set(['type', 'values', 'required', 'collection', 'to']);

function fieldRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** A single differing key is text when the shared classifier says so, including an enum whose codes stay. */
function keyIsText(key: string, before: unknown, after: unknown): boolean {
  return isTextOnlyChange({
    changeId: 'field:x',
    kind: 'field',
    op: 'changed',
    entity: 'E',
    source: '',
    before: { [key]: before },
    after: { [key]: after },
  });
}

type FieldClass = 'added' | 'removed' | 'shape' | 'validation';

/** `added` and `removed` come from `op`. A `changed` field is shape when a shape key differs, otherwise validation. Text keys are ignored. Shape wins when both differ. */
function fieldClass(item: EffortInput['item']): FieldClass | undefined {
  if (item.kind !== 'field') return undefined;
  if (item.op === 'added') return 'added';
  if (item.op === 'removed') return 'removed';
  if (item.op !== 'changed') return undefined;
  const before = fieldRecord(item.before);
  const after = fieldRecord(item.after);
  if (!before || !after) return undefined;
  let shape = false;
  let validation = false;
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (sameJson(before[key], after[key])) continue;
    if (SHAPE_KEYS.has(key)) {
      if (key === 'values' && keyIsText(key, before[key], after[key])) continue;
      shape = true;
      continue;
    }
    if (keyIsText(key, before[key], after[key])) continue;
    validation = true;
  }
  if (shape) return 'shape';
  if (validation) return 'validation';
  return undefined;
}

function fieldSegments(changeId: string): string[] {
  const rest = changeId.startsWith('field:') ? changeId.slice('field:'.length) : '';
  return rest.split('.').filter(part => part.length > 0);
}

function citesSegment(text: string, segment: string): boolean {
  const escaped = segment.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return new RegExp(`(?<![A-Za-z0-9_])${escaped}\\??:`, 'u').test(text);
}

/** A projection belongs to the entity when its name is the entity, or the entity plus a capital letter. */
function projectionOfEntity(name: string, entity: string): boolean {
  if (!entity || !name.startsWith(entity)) return false;
  const rest = name.slice(entity.length);
  return rest.length === 0 || rest[0] !== rest[0].toLowerCase();
}

function contractUnits(moduleName: string, pageIds: string[]): EffortUnitRef[] {
  const units: EffortUnitRef[] = [];
  for (const pageId of pageIds) {
    units.push(pageUnit(moduleName, pageId));
    units.push({ kind: 'contract', id: pageId, path: contractPath(moduleName, pageId) });
  }
  return units;
}

/** Pages for a field change, read from each contract: a projection body or a route `input` (a write is a `cmd` input). */
function fieldAnswer(input: EffortInput, contracts: Record<string, string>, kind: FieldClass): EffortAnswer {
  const segments = fieldSegments(input.item.changeId);
  const leaf = segments[segments.length - 1] ?? '';
  const parent = segments.length > 1 ? segments[0] : undefined;
  const pages: string[] = [];
  for (const pageId of Object.keys(contracts).sort()) {
    const parsed = parseD2ContractV2(contracts[pageId] ?? '');
    const hit = kind === 'validation'
      ? parsed.routes.some(route => route.kind === 'cmd' && citesSegment(route.input, leaf))
      : kind === 'added'
        ? parsed.projections.some(projection => projectionOfEntity(projection.name, input.item.entity) && (parent === undefined || citesSegment(projection.body, parent)))
        : parsed.projections.some(projection => citesSegment(projection.body, leaf)) || parsed.routes.some(route => citesSegment(route.input, leaf));
    if (hit) pages.push(pageId);
  }
  if (pages.length === 0) return answer(input, []);
  const materialize = pages.map(pageId => pageUnit(input.module, pageId));
  if (kind === 'validation') return answer(input, materialize);
  return answer(input, materialize, undefined, [], contractUnits(input.module, pages), [], 'change');
}

function grantIdOf(input: EffortInput): string {
  return input.item.changeId.startsWith('grant:') ? input.item.changeId.slice('grant:'.length) : '';
}

/** The id is a whole quoted token. A shorter id does not match a longer one. */
function citesQuotedId(text: string, id: string): boolean {
  if (!id) return false;
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return new RegExp(`['"]${escaped}['"]`, 'u').test(text);
}

/** Prose on a journey or a step, beyond `L4_TEXT_ATTRIBUTES`. Local to this master. */
const JOURNEY_TEXT_KEYS = ['goal', 'outcome'] as const;

/** Text when every differing key of `before`/`after` is `title`, `description`, `goal` or `outcome`. Any other key, or a value that is not a record, is a real change. */
function textOnlyKeys(item: EffortInput['item']): boolean {
  const before = fieldRecord(item.before);
  const after = fieldRecord(item.after);
  if (!before || !after) return false;
  const textKeys = new Set<string>([...L4_TEXT_ATTRIBUTES, ...JOURNEY_TEXT_KEYS]);
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (sameJson(before[key], after[key])) continue;
    if (!textKeys.has(key)) return false;
  }
  return true;
}

function sharedPath(moduleName: string, pageId: string): string {
  return `l2/${moduleName}/web/shared/${pageId}.defs.ts`;
}

/** A grant whose text changed, or a new grant, changes nothing. A changed or removed grant regenerates the contract and the shared of each page that quotes the id. */
function grantAnswer(input: EffortInput, contracts: Record<string, string>, shared: Record<string, string>): EffortAnswer {
  const op = input.item.op;
  if (op === 'added' || (op === 'changed' && textOnlyKeys(input.item))) return answer(input, []);
  const grantId = grantIdOf(input);
  const contractPages: string[] = [];
  for (const pageId of Object.keys(contracts).sort()) {
    if (citesQuotedId(contracts[pageId] ?? '', grantId)) contractPages.push(pageId);
  }
  const sharedPages: string[] = [];
  for (const pageId of Object.keys(shared).sort()) {
    if (citesQuotedId(shared[pageId] ?? '', grantId)) sharedPages.push(pageId);
  }
  const pages = [...new Set([...contractPages, ...sharedPages])].sort();
  const regenerateDefs: EffortUnitRef[] = [];
  for (const pageId of pages) {
    if (contractPages.includes(pageId)) {
      regenerateDefs.push({ kind: 'contract', id: pageId, path: contractPath(input.module, pageId) });
    }
    if (sharedPages.includes(pageId)) {
      regenerateDefs.push({ kind: 'shared', id: pageId, path: sharedPath(input.module, pageId) });
    }
  }
  return answer(input, [], undefined, [], regenerateDefs);
}

/** Pages whose contract route or shared source cites the published event id. Each one regenerates its page and its shared, then materializes. The contract stays. */
function outboundAnswer(input: EffortInput, contracts: Record<string, string>, shared: Record<string, string>): EffortAnswer {
  const needles = citeNeedles(input) ?? [];
  const pages: string[] = [];
  for (const pageId of Object.keys(contracts).sort()) {
    const parsed = parseD2ContractV2(contracts[pageId] ?? '');
    if (parsed.routes.some(route => textCites(JSON.stringify(route), needles))) pages.push(pageId);
  }
  for (const pageId of Object.keys(shared).sort()) {
    if (pages.includes(pageId)) continue;
    if (textCites(shared[pageId] ?? '', needles)) pages.push(pageId);
  }
  pages.sort();
  if (pages.length === 0) return answer(input, []);
  const regenerateDefs: EffortUnitRef[] = [];
  for (const pageId of pages) {
    regenerateDefs.push(pageUnit(input.module, pageId));
    regenerateDefs.push({ kind: 'shared', id: pageId, path: sharedPath(input.module, pageId) });
  }
  return answer(input, pages.map(pageId => pageUnit(input.module, pageId)), undefined, [], regenerateDefs);
}

/** A removed rule drops its id from each citing contract and from each shared `rules` list, then rematerializes those pages. A process or task uses the same pages, matching the id as text in each route and in the shared source. */
function removedAnswer(input: EffortInput, contracts: Record<string, string>, shared: Record<string, string>): EffortAnswer {
  const needles = citeNeedles(input);
  const ruleId = needles ? '' : ruleIdOf(input);
  const contractPages: string[] = [];
  for (const pageId of Object.keys(contracts).sort()) {
    const source = contracts[pageId] ?? '';
    const parsed = parseD2ContractV2(source);
    const cites = needles
      ? parsed.routes.some(route => textCites(JSON.stringify(route), needles))
      : parsed.routes.some(route => route.rules.includes(ruleId));
    if (cites) contractPages.push(pageId);
  }
  const sharedPages: string[] = [];
  for (const pageId of Object.keys(shared).sort()) {
    const source = shared[pageId] ?? '';
    const cites = needles ? textCites(source, needles) : quotedList(source, 'rules').includes(ruleId);
    if (cites) sharedPages.push(pageId);
  }
  const pages = [...new Set([...contractPages, ...sharedPages])].sort();
  const regenerateDefs: EffortUnitRef[] = [];
  for (const pageId of pages) {
    if (contractPages.includes(pageId)) {
      regenerateDefs.push({ kind: 'contract', id: pageId, path: contractPath(input.module, pageId) });
    }
    if (sharedPages.includes(pageId)) {
      regenerateDefs.push({ kind: 'shared', id: pageId, path: sharedPath(input.module, pageId) });
    }
  }
  return answer(input, pages.map(pageId => pageUnit(input.module, pageId)), undefined, [], regenerateDefs);
}

/** A whole double-quoted token. A shorter id does not match a longer one. */
function citesDoubleQuoted(text: string, id: string): boolean {
  if (!id) return false;
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return new RegExp(`"${escaped}"`, 'u').test(text);
}

/** `"<journeyId>/` in shared source. The id is whole: the next character is the slash. */
function citesJourney(text: string, journeyId: string): boolean {
  if (!journeyId) return false;
  const escaped = journeyId.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return new RegExp(`"${escaped}/`, 'u').test(text);
}

function sharedPageIds(shared: Record<string, string>, cites: (text: string) => boolean): string[] {
  const pages: string[] = [];
  for (const pageId of Object.keys(shared).sort()) {
    if (cites(shared[pageId] ?? '')) pages.push(pageId);
  }
  return pages;
}

function stepAct(item: EffortInput['item']): boolean {
  const after = fieldRecord(item.after);
  return after?.kind === 'act';
}

/**
 * Journey and step, except a new journey (that one asks the model).
 * Citation is a double-quoted step in shared source. A new step whose journey is absent from every shared returns empty.
 */
function journeyAnswer(input: EffortInput, shared: Record<string, string>): EffortAnswer | undefined {
  const kind = input.item.kind;
  if (kind !== 'journey' && kind !== 'step') return undefined;
  const changeId = input.item.changeId;
  const op = input.item.op;
  if (kind === 'journey' && op === 'added') return undefined;
  const prefix = kind === 'journey' ? 'journey:' : 'step:';
  const rest = changeId.startsWith(prefix) ? changeId.slice(prefix.length) : '';
  const slash = rest.indexOf('/');
  const journeyId = kind === 'journey' ? rest : rest.slice(0, slash);
  const stepId = kind === 'step' && slash > 0 ? rest.slice(slash + 1) : '';
  if (!journeyId || (kind === 'step' && !stepId)) {
    return answer(input, [], `v1 computes only rule changed; ${kind} ${op} is not handled`);
  }
  if (kind === 'journey' && op === 'changed' && textOnlyKeys(input.item)) return answer(input, []);
  const stepToken = `${journeyId}/${stepId}`;
  const journeyKnown = Object.values(shared).some(text => citesJourney(text, journeyId));
  if (kind === 'step' && op === 'added' && !journeyKnown) return answer(input, []);
  const citeStep = kind === 'step' && op !== 'added';
  const pages = sharedPageIds(shared, text => citeStep ? citesDoubleQuoted(text, stepToken) : citesJourney(text, journeyId));
  const textStep = kind === 'step' && op === 'changed' && textOnlyKeys(input.item);
  const withContract = (kind === 'journey' && op === 'removed') || (kind === 'step' && op === 'added');
  const contract = withContract && (kind === 'journey' || stepAct(input.item)) ? 'change' : 'keep';
  const regenerateDefs: EffortUnitRef[] = [];
  if (!textStep) {
    for (const pageId of pages) {
      regenerateDefs.push(pageUnit(input.module, pageId));
      if (withContract) regenerateDefs.push({ kind: 'contract', id: pageId, path: contractPath(input.module, pageId) });
      regenerateDefs.push({ kind: 'shared', id: pageId, path: sharedPath(input.module, pageId) });
    }
  }
  return answer(input, pages.map(pageId => pageUnit(input.module, pageId)), undefined, [], regenerateDefs, [], contract);
}

function transitionIdOf(input: EffortInput): string {
  return input.item.changeId.startsWith('transition:') ? input.item.changeId.slice('transition:'.length) : '';
}

/** Pages whose contract has a route `writes: '<entity>.<transitionId>'`. */
function pagesWritingTransition(contracts: Record<string, string>, entity: string, transitionId: string): string[] {
  if (!entity || !transitionId) return [];
  const writes = `${entity}.${transitionId}`;
  const pages: string[] = [];
  for (const pageId of Object.keys(contracts).sort()) {
    const parsed = parseD2ContractV2(contracts[pageId] ?? '');
    if (parsed.routes.some(route => route.writes === writes)) pages.push(pageId);
  }
  return pages;
}

/**
 * A new transition asks for a page choice. A removed one regenerates page, contract and shared of each writing page.
 * A real change regenerates page and shared of those pages and keeps the contract.
 */
function transitionAnswer(input: EffortInput, contracts: Record<string, string>): EffortAnswer {
  if (input.item.op === 'added') {
    return answer(input, [], 'a new transition needs a page choice; not handled yet');
  }
  const pages = pagesWritingTransition(contracts, input.item.entity, transitionIdOf(input));
  const withContract = input.item.op === 'removed';
  const regenerateDefs: EffortUnitRef[] = [];
  for (const pageId of pages) {
    regenerateDefs.push(pageUnit(input.module, pageId));
    if (withContract) regenerateDefs.push({ kind: 'contract', id: pageId, path: contractPath(input.module, pageId) });
    regenerateDefs.push({ kind: 'shared', id: pageId, path: sharedPath(input.module, pageId) });
  }
  return answer(input, pages.map(pageId => pageUnit(input.module, pageId)), undefined, [], regenerateDefs, [], withContract ? 'change' : 'keep');
}

/** Pure: text-only field changes materialize the screens that show the field; a changed rule cites its pages; a removed rule drops its id in code; a grant follows its class. A journey or a step follows its class. A process, task or transition follows its class. A published event regenerates page and shared where its id is cited. An inbound change abends. Text-only on any other kind is an empty computed answer. */
export function describeEffortFrom(input: EffortInput, contracts: Record<string, string>, sources?: DescribeEffortSources): EffortAnswer {
  if (input.item.kind === 'inbound') return answer(input, [], 'inbound integration change is not handled yet');
  if (input.item.kind === 'grant') return grantAnswer(input, contracts, sources?.shared ?? {});
  if (input.item.kind === 'field' && isTextOnlyChange(input.item)) return textAnswer(input, sources);
  const journey = journeyAnswer(input, sources?.shared ?? {});
  if (journey) return journey;
  if (input.item.op === 'changed' && input.item.kind !== 'rule' && input.item.kind !== 'field' && textOnlyKeys(input.item)) {
    return answer(input, []);
  }
  if (input.item.kind === 'transition') return transitionAnswer(input, contracts);
  if (input.item.kind === 'process' || input.item.kind === 'task') {
    return removedAnswer(input, contracts, sources?.shared ?? {});
  }
  if (input.item.kind === 'outbound') return outboundAnswer(input, contracts, sources?.shared ?? {});
  if (Object.keys(contracts).length === 0) return answer(input, [], `no generated L2 contracts for module ${input.module}`);
  const changedField = fieldClass(input.item);
  if (input.item.kind === 'field') {
    if (!changedField) return answer(input, [], `v1 computes only rule changed; ${input.item.kind} ${input.item.op} is not handled`);
    return fieldAnswer(input, contracts, changedField);
  }
  if (input.item.kind === 'rule' && input.item.op === 'removed') {
    return removedAnswer(input, contracts, sources?.shared ?? {});
  }
  if (input.item.kind !== 'rule' || input.item.op !== 'changed') {
    return answer(input, [], `v1 computes only rule changed; ${input.item.kind} ${input.item.op} is not handled`);
  }
  const ruleId = ruleIdOf(input);
  const pages: string[] = [];
  for (const pageId of Object.keys(contracts).sort()) {
    const parsed = parseD2ContractV2(contracts[pageId] ?? '');
    if (parsed.routes.some(route => route.rules.includes(ruleId))) pages.push(pageId);
  }
  if (pages.length === 0) return answer(input, [], `no route of any contract cites rule ${ruleId}`);
  return answer(input, pages.map(pageId => pageUnit(input.module, pageId)));
}

function rulePhrase(input: EffortInput): string {
  const after = input.item.after;
  if (!after || typeof after !== 'object' || Array.isArray(after)) return '';
  const description = (after as { description?: unknown }).description;
  return typeof description === 'string' ? description : '';
}

function promptSchema(pageIds: string[]): object {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['pages', 'create', 'reason'],
    properties: {
      pages: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['page', 'change'],
          properties: {
            page: { type: 'string', enum: pageIds },
            change: { type: 'string', enum: ['materialize', 'newAction'] },
          },
        },
      },
      create: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['page'],
          properties: { page: { type: 'string' } },
        },
      },
      reason: { type: 'string' },
    },
  };
}

/** Actors inside each `access: { actors: [...] }`. Stops at the first `]`, so a later `grants` list on the same line stays out. */
function pageActors(source: string): string[] {
  const actors: string[] = [];
  for (const match of source.matchAll(/access: \{ actors: \[([^\]]*)\]/gu)) {
    for (const part of (match[1] ?? '').split(',')) {
      const actor = part.trim().replace(/^['"]|['"]$/gu, '');
      if (actor && !actors.includes(actor)) actors.push(actor);
    }
  }
  actors.sort();
  return actors;
}

/** `"step": "<journey>/<step>"` tokens in one shared source, once each, sorted. */
function sharedStepTokens(text: string): string[] {
  const steps: string[] = [];
  for (const match of text.matchAll(/"step": "([^"]+)"/gu)) {
    const step = match[1] ?? '';
    if (step && !steps.includes(step)) steps.push(step);
  }
  steps.sort();
  return steps;
}

function journeySteps(after: Record<string, unknown> | undefined): string[] {
  if (!after || !Array.isArray(after.steps)) return [];
  const lines: string[] = [];
  for (const step of after.steps) {
    const row = fieldRecord(step);
    if (!row) continue;
    const stepId = typeof row.stepId === 'string' ? row.stepId : '';
    const entity = typeof row.entity === 'string' ? row.entity : '';
    const effect = typeof row.effect === 'string' ? row.effect : '';
    if (!stepId) continue;
    lines.push(`- ${stepId} entity ${entity} effect ${effect}`);
  }
  return lines;
}

function rulePrompt(input: EffortInput, contracts: Record<string, string>, pageIds: string[]): string {
  const pages = pageIds.map(pageId => {
    const parsed = parseD2ContractV2(contracts[pageId] ?? '');
    const routes = parsed.routes.map(route => `  - ${route.route} ${route.kind} rules: ${route.rules.join(', ')}`);
    return [`- ${pageId}`, ...routes].join('\n');
  });
  return [
    `Rule ${ruleIdOf(input)}: ${rulePhrase(input)}`,
    '',
    'Pages of the module. Each route lists its id, kind (qry or cmd) and rules:',
    pages.join('\n'),
    '',
    'For an existing page, choose one:',
    '- materialize: only rematerialize the screen. It rereads the rule. The screen def and the contract stay.',
    '- newAction: the screen needs an action or data the contract does not have. The contract changes.',
    'A new screen goes in create. Nothing to do is pages: [] and create: [].',
  ].join('\n');
}

function journeyPrompt(input: EffortInput, contracts: Record<string, string>, shared: Record<string, string>, pageIds: string[]): string {
  const after = fieldRecord(input.item.after);
  const actor = typeof after?.actorRef === 'string' ? after.actorRef : '';
  const goal = typeof after?.goal === 'string' ? after.goal : '';
  const journeyId = input.item.changeId.startsWith('journey:') ? input.item.changeId.slice('journey:'.length) : '';
  const steps = journeySteps(after);
  const pages = pageIds.map(pageId => {
    const actors = pageActors(contracts[pageId] ?? '').join(', ');
    const cited = sharedStepTokens(shared[pageId] ?? '').join(', ');
    return `- ${pageId}\n  actors: ${actors}\n  steps: ${cited}`;
  });
  return [
    `Journey ${journeyId}. Actor ${actor}. Goal ${goal}.`,
    steps.length > 0 ? ['Steps:', ...steps].join('\n') : 'Steps: none listed.',
    '',
    'Pages of the module. Each page lists its id, the actors of its access, and the journey steps its shared already has:',
    pages.join('\n'),
    '',
    'For an existing page, choose one:',
    '- materialize: only rematerialize the screen. The screen def and the contract stay.',
    '- newAction: the screen offers the journey as a new action. The contract changes.',
    'A new screen goes in create. Nothing to do is pages: [] and create: [], with a reason.',
  ].join('\n');
}

/** Pure. A new rule or a new journey asks the model to pick screens. Every other item needs no call. */
export function effortPromptFrom(input: EffortInput, contracts: Record<string, string>, shared: Record<string, string> = {}): EffortPromptRequest | null {
  const addedRule = input.item.kind === 'rule' && input.item.op === 'added';
  const addedJourney = input.item.kind === 'journey' && input.item.op === 'added';
  if (!addedRule && !addedJourney) return null;
  const pageIds = Object.keys(contracts).sort();
  const prompt = addedRule ? rulePrompt(input, contracts, pageIds) : journeyPrompt(input, contracts, shared, pageIds);
  return { prompt, schema: promptSchema(pageIds) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

const PAGE_CHANGES = ['materialize', 'newAction'] as const;

/** Pure. A model reply outside the schema, or a page id that does not match the contracts, abends. */
export function finishEffortFrom(input: EffortInput, contracts: Record<string, string>, modelOutput: unknown): EffortAnswer {
  if (!isRecord(modelOutput)) return answer(input, [], 'model output is outside the schema');
  for (const key of Object.keys(modelOutput)) {
    if (key !== 'pages' && key !== 'create' && key !== 'reason') {
      return answer(input, [], `model output is outside the schema: ${key}`);
    }
  }
  if (!Array.isArray(modelOutput.pages) || !Array.isArray(modelOutput.create) || typeof modelOutput.reason !== 'string') {
    return answer(input, [], 'model output is outside the schema');
  }
  const known = new Set(Object.keys(contracts));
  const chosen: Array<{ page: string; change: (typeof PAGE_CHANGES)[number] }> = [];
  for (const item of modelOutput.pages) {
    if (!isRecord(item)) return answer(input, [], 'model output is outside the schema: pages');
    for (const key of Object.keys(item)) {
      if (key !== 'page' && key !== 'change') return answer(input, [], `model output is outside the schema: ${key}`);
    }
    const change = item.change;
    if (typeof item.page !== 'string' || item.page.length === 0 || (change !== 'materialize' && change !== 'newAction')) {
      return answer(input, [], 'model output is outside the schema: pages');
    }
    if (!known.has(item.page)) return answer(input, [], `page ${item.page} does not exist`);
    const prior = chosen.find(row => row.page === item.page);
    if (!prior) chosen.push({ page: item.page, change });
    else if (change === 'newAction') prior.change = 'newAction';
  }
  const created: string[] = [];
  for (const item of modelOutput.create) {
    if (!isRecord(item)) return answer(input, [], 'model output is outside the schema: create');
    for (const key of Object.keys(item)) {
      if (key !== 'page') return answer(input, [], `model output is outside the schema: ${key}`);
    }
    if (typeof item.page !== 'string' || item.page.length === 0) {
      return answer(input, [], 'model output is outside the schema: create');
    }
    if (known.has(item.page)) return answer(input, [], `page ${item.page} already exists`);
    if (!created.includes(item.page)) created.push(item.page);
  }
  chosen.sort((a, b) => a.page.localeCompare(b.page));
  created.sort();
  if (chosen.length === 0 && created.length === 0 && modelOutput.reason.trim().length === 0 && input.item.kind === 'journey') {
    return answer(input, [], 'empty answer needs a reason');
  }
  const materialize = chosen.map(row => pageUnit(input.module, row.page));
  const journeyAdded = input.item.kind === 'journey' && input.item.op === 'added';
  const regenerateDefs: EffortUnitRef[] = [];
  for (const row of chosen) {
    if (row.change !== 'newAction') continue;
    regenerateDefs.push(pageUnit(input.module, row.page));
    regenerateDefs.push({ kind: 'contract', id: row.page, path: contractPath(input.module, row.page) });
    if (journeyAdded) regenerateDefs.push({ kind: 'shared', id: row.page, path: sharedPath(input.module, row.page) });
  }
  const create = created.map(pageId => pageUnit(input.module, pageId));
  const contract = regenerateDefs.length > 0 || create.length > 0 ? 'change' : 'keep';
  return answer(input, materialize, undefined, [], regenerateDefs, create, contract);
}

function projectId(input: EffortInput): number | undefined {
  const fromBase = /^mls-(\d+)$/u.exec(input.base.baseId);
  if (fromBase) {
    const id = Number(fromBase[1]);
    if (id > 0) return id;
  }
  const actual = mls.actualProject;
  if (typeof actual === 'number' && actual > 0) return actual;
  return undefined;
}

interface StorFile {
  project: number;
  level: number;
  status: string;
  folder: string;
  extension: string;
  shortName: string;
  getContent(encoding: string): Promise<string>;
}

async function fileBody(file: StorFile): Promise<string | undefined> {
  const content = await file.getContent('');
  return typeof content === 'string' && content.length > 0 ? content : undefined;
}

async function moduleWebDefs(input: EffortInput): Promise<{ projectError?: string; contracts: Record<string, string>; shared: Record<string, string> }> {
  const project = projectId(input);
  if (project === undefined) {
    return { projectError: `cannot resolve the project of base ${input.base.baseId}`, contracts: {}, shared: {} };
  }
  const contractsFolder = `${input.module}/web/contracts`;
  const sharedFolder = `${input.module}/web/shared`;
  const contracts: Record<string, string> = {};
  const shared: Record<string, string> = {};
  for (const file of Object.values(mls.stor.files) as StorFile[]) {
    if (!file || file.project !== project || file.level !== 2 || file.status === 'deleted') continue;
    if (file.extension !== '.defs.ts') continue;
    const body = await fileBody(file);
    if (!body) continue;
    if (file.folder === contractsFolder) contracts[file.shortName] = body;
    else if (file.folder === sharedFolder) shared[file.shortName] = body;
  }
  return { contracts, shared };
}

/** A new rule or a new journey asks for a model call. Every other item returns null and does not read files. */
export async function effortPrompt(input: EffortInput): Promise<EffortPromptRequest | null> {
  const asks = (input.item.kind === 'rule' || input.item.kind === 'journey') && input.item.op === 'added';
  if (!asks) return null;
  const loaded = await moduleWebDefs(input);
  if (loaded.projectError) return null;
  return effortPromptFrom(input, loaded.contracts, loaded.shared);
}

/** Checks a recorded or live model reply for a new rule. Does not call a model. */
export async function finishEffort(input: EffortInput, modelOutput: unknown): Promise<EffortAnswer> {
  const loaded = await moduleWebDefs(input);
  if (loaded.projectError) return answer(input, [], loaded.projectError);
  return finishEffortFrom(input, loaded.contracts, modelOutput);
}

/** Reads shared defs, `module.defs.ts` and `l5/config.json`, then classifies the item. */
export async function describeEffort(input: EffortInput): Promise<EffortAnswer> {
  const project = projectId(input);
  if (project === undefined) return answer(input, [], `cannot resolve the project of base ${input.base.baseId}`);
  if (input.item.kind === 'field' && isTextOnlyChange(input.item)) {
    let needsSource: string | undefined;
    let moduleSource: string | undefined;
    let configSource: string | undefined;
    const needsFolder = `${input.module}/pool/l1/web`;
    for (const file of Object.values(mls.stor.files) as StorFile[]) {
      if (!file || file.project !== project || file.status === 'deleted') continue;
      if (file.level === 4 && file.folder === needsFolder && file.extension === '.json' && file.shortName === 'needs') {
        needsSource = await fileBody(file);
        continue;
      }
      if (file.level === 4 && file.folder === input.module && file.extension === '.defs.ts' && file.shortName === 'module') {
        moduleSource = await fileBody(file);
        continue;
      }
      if (file.level === 5 && file.shortName === 'config' && file.extension === '.json' && (file.folder === '' || file.folder === '.')) {
        configSource = await fileBody(file);
      }
    }
    return describeEffortFrom(input, {}, { needsSource, moduleSource, configSource });
  }
  const loaded = await moduleWebDefs(input);
  return describeEffortFrom(input, loaded.contracts, { shared: loaded.shared });
}
