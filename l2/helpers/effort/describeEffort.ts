/// <mls fileReference="_102020_/l2/helpers/effort/describeEffort.ts" enhancement="_blank"/>

import { parseD2ContractV2 } from '/_102020_/l2/helpers/contractV2/render.js';
import { parseD2SharedV2 } from '/_102020_/l2/helpers/sharedV2/format.js';
import { isTextOnlyChange, type EffortAgentRef, type EffortAnswer, type EffortInput, type EffortUnitRef } from '/_102035_/l2/solution/poolPlan.js';

const MASTER = { project: '102020', kind: 'l2', device: 'web' } as const;
const SHARED_FIELDS = 'shared has no field index; regenerate the L2 defs';
const NO_LANGUAGES = 'module has no declared languages';

export interface DescribeEffortSources {
  /** `l2/<module>/web/shared/<pageId>.defs.ts` bodies, keyed by page id. */
  shared: Record<string, string>;
  /** `l4/<module>/module.defs.ts` body. Absent is the same as a file with no languages. */
  moduleSource?: string;
  /** `l5/config.json` body. Absent means the module has no `userLanguage` there. */
  configSource?: string;
}

function answer(
  input: EffortInput,
  materialize: EffortUnitRef[],
  reason?: string,
  runAgents: EffortAgentRef[] = [],
): EffortAnswer {
  return {
    master: { ...MASTER },
    item: input.item.changeId,
    status: reason ? 'abend' : 'computed',
    regenerateDefs: [],
    materialize,
    runAgents,
    ...(reason ? { abend: { reason } } : {}),
  };
}

function fieldPath(input: EffortInput): string {
  const fieldId = input.item.changeId.startsWith('field:') ? input.item.changeId.slice('field:'.length) : '';
  return `${input.item.entity}.${fieldId}`;
}

/** The screen shows the field when `fields` has the path or an ancestor. */
function sharedShowsField(fields: Record<string, string[]>, path: string): boolean {
  return Object.keys(fields).some(key => key === path || path.startsWith(`${key}.`));
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

function pagesShowingField(input: EffortInput, sources: DescribeEffortSources | undefined): { pages: string[]; error?: string } {
  const path = fieldPath(input);
  const pages: string[] = [];
  const shared = sources?.shared ?? {};
  for (const pageId of Object.keys(shared).sort()) {
    let fields: Record<string, string[]>;
    try {
      fields = parseD2SharedV2(shared[pageId]).definition.fields;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('missing field fields')) return { pages: [], error: SHARED_FIELDS };
      return { pages: [], error: `${pageId}.defs.ts: ${message}` };
    }
    if (sharedShowsField(fields, path)) pages.push(pageId);
  }
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
      path: `l2/${input.module}/web/contracts/${pageId}.defs.ts`,
    })),
    undefined,
    [{ agent: 'agentAddLanguage', command }],
  );
}

/** Pure: text-only field changes materialize the screens that show the field; a changed rule cites its pages. */
export function describeEffortFrom(input: EffortInput, contracts: Record<string, string>, sources?: DescribeEffortSources): EffortAnswer {
  if (isTextOnlyChange(input.item)) return textAnswer(input, sources);
  if (Object.keys(contracts).length === 0) return answer(input, [], `no generated L2 contracts for module ${input.module}`);
  if (input.item.kind !== 'rule' || input.item.op !== 'changed') {
    return answer(input, [], `v1 computes only rule changed; ${input.item.kind} ${input.item.op} is not handled`);
  }
  const ruleId = input.item.changeId.startsWith('rule:') ? input.item.changeId.slice('rule:'.length) : '';
  const pages: string[] = [];
  for (const pageId of Object.keys(contracts).sort()) {
    const parsed = parseD2ContractV2(contracts[pageId]);
    if (parsed.routes.some(route => route.rules.includes(ruleId))) pages.push(pageId);
  }
  if (pages.length === 0) return answer(input, [], `no route of any contract cites rule ${ruleId}`);
  return answer(input, pages.map(pageId => ({
    kind: 'page' as const,
    id: pageId,
    path: `l2/${input.module}/web/contracts/${pageId}.defs.ts`,
  })));
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

/** Reads shared defs, `module.defs.ts` and `l5/config.json`, then classifies the item. */
export async function describeEffort(input: EffortInput): Promise<EffortAnswer> {
  const project = projectId(input);
  if (project === undefined) return answer(input, [], `cannot resolve the project of base ${input.base.baseId}`);
  if (isTextOnlyChange(input.item)) {
    const shared: Record<string, string> = {};
    let moduleSource: string | undefined;
    let configSource: string | undefined;
    const sharedFolder = `${input.module}/web/shared`;
    for (const file of Object.values(mls.stor.files) as StorFile[]) {
      if (!file || file.project !== project || file.status === 'deleted') continue;
      if (file.level === 2 && file.folder === sharedFolder && file.extension === '.defs.ts') {
        const body = await fileBody(file);
        if (body) shared[file.shortName] = body;
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
    return describeEffortFrom(input, {}, { shared, moduleSource, configSource });
  }
  const folder = `${input.module}/web/contracts`;
  const contracts: Record<string, string> = {};
  for (const file of Object.values(mls.stor.files) as StorFile[]) {
    if (!file || file.project !== project || file.level !== 2 || file.status === 'deleted') continue;
    if (file.folder !== folder || file.extension !== '.defs.ts') continue;
    const body = await fileBody(file);
    if (body) contracts[file.shortName] = body;
  }
  return describeEffortFrom(input, contracts);
}
