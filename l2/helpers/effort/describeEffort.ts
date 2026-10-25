/// <mls fileReference="_102020_/l2/helpers/effort/describeEffort.ts" enhancement="_blank"/>

import { parseD2ContractV2 } from '/_102020_/l2/helpers/contractV2/render.js';
import { isTextOnlyChange, type EffortAgentRef, type EffortAnswer, type EffortInput, type EffortPromptRequest, type EffortUnitRef } from '/_102035_/l2/solution/poolPlan.js';

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

/** Ids a removed process or task looks for. A task id is `task:<processId>.<taskId>`: both the process id and the full id. */
function removedNeedles(input: EffortInput): string[] | null {
  if (input.item.op !== 'removed') return null;
  const changeId = input.item.changeId;
  if (input.item.kind === 'process') {
    const processId = changeId.startsWith('process:') ? changeId.slice('process:'.length) : '';
    return processId ? [processId] : [];
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

/** A removed rule drops its id from each citing contract and from each shared `rules` list, then rematerializes those pages. A removed process or task uses the same pages, matching the id as text in each route and in the shared source. */
function removedAnswer(input: EffortInput, contracts: Record<string, string>, shared: Record<string, string>): EffortAnswer {
  const needles = removedNeedles(input);
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
      regenerateDefs.push({ kind: 'shared', id: pageId, path: `l2/${input.module}/web/shared/${pageId}.defs.ts` });
    }
  }
  return answer(input, pages.map(pageId => pageUnit(input.module, pageId)), undefined, [], regenerateDefs);
}

/** Pure: text-only field changes materialize the screens that show the field; a changed rule cites its pages; a removed rule drops its id in code. */
export function describeEffortFrom(input: EffortInput, contracts: Record<string, string>, sources?: DescribeEffortSources): EffortAnswer {
  if (isTextOnlyChange(input.item)) return textAnswer(input, sources);
  if (Object.keys(contracts).length === 0) return answer(input, [], `no generated L2 contracts for module ${input.module}`);
  if ((input.item.kind === 'rule' || input.item.kind === 'process' || input.item.kind === 'task') && input.item.op === 'removed') {
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

/** Pure. A new rule asks the model to pick screens from the contracts. Every other item needs no call. */
export function effortPromptFrom(input: EffortInput, contracts: Record<string, string>): EffortPromptRequest | null {
  if (input.item.kind !== 'rule' || input.item.op !== 'added') return null;
  const pageIds = Object.keys(contracts).sort();
  const pages = pageIds.map(pageId => {
    const parsed = parseD2ContractV2(contracts[pageId] ?? '');
    const routes = parsed.routes.map(route => `  - ${route.route} ${route.kind} rules: ${route.rules.join(', ')}`);
    return [`- ${pageId}`, ...routes].join('\n');
  });
  const prompt = [
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
  const materialize = chosen.map(row => pageUnit(input.module, row.page));
  const regenerateDefs: EffortUnitRef[] = [];
  for (const row of chosen) {
    if (row.change !== 'newAction') continue;
    regenerateDefs.push(pageUnit(input.module, row.page));
    regenerateDefs.push({ kind: 'contract', id: row.page, path: contractPath(input.module, row.page) });
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

/** A new rule asks for a model call. Every other item returns null and does not read files. */
export async function effortPrompt(input: EffortInput): Promise<EffortPromptRequest | null> {
  if (input.item.kind !== 'rule' || input.item.op !== 'added') return null;
  const loaded = await moduleWebDefs(input);
  if (loaded.projectError) return null;
  return effortPromptFrom(input, loaded.contracts);
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
  if (isTextOnlyChange(input.item)) {
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
