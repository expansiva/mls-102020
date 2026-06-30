/// <mls fileReference="_102020_/l2/agentChangeFrontend/cfeMaterializeCore.ts" enhancement="_blank"/>

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

export const DEFAULT_MODEL_TYPE = 'codeinstruct';

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
Return ONLY the file through the ${GEN_TOOL_NAME} tool.

---

${skills}`;
}

export function buildHumanPrompt(data: unknown, contextSections: string[], outputPath: string): string {
  const lines = ['## Definition', '', '```json', JSON.stringify(data, null, 2), '```', ''];
  if (contextSections.length) {
    lines.push('## Context files (dependsFiles)', '');
    for (const c of contextSections) lines.push(c, '');
  }
  lines.push('## Output', '', `Generate ONLY the TypeScript for: ${outputPath}`, `Call ${GEN_TOOL_NAME} with the complete code.`);
  return lines.join('\n');
}

export function applyHeader(outputPath: string, code: string): string {
  const header = mlsHeaderForOutputPath(outputPath);
  const trimmed = code.trimStart();
  const existingHeader = /^\/\/\/\s*<mls\b[^>]*\/>\s*/;
  if (existingHeader.test(trimmed)) return trimmed.replace(existingHeader, `${header}\n\n`);
  return `${header}\n\n${trimmed}`;
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
      declarations.push(`type ${expectedOutputName} = ${expectedOutputItemName}[];`);
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

  const states = Array.isArray(data.states) ? data.states.filter(isRecord) : [];
  for (const state of states) {
    const propertyName = typeof state.name === 'string' && state.name ? state.name : camelCaseFromKey(String(state.stateKey ?? ''));
    if (!propertyName) continue;
    const expectedType = stateAssertionType(state);
    stateAssertions.push(`type ${assertName(`State_${propertyName}`, propertyName)} = Assert<Assignable<typeof page${propertyAccess(propertyName)}, ${expectedType}>>;`);
  }

  const actions = Array.isArray(data.actions) ? data.actions.filter(isRecord) : [];
  for (const action of actions) {
    if (typeof action.methodName === 'string' && action.methodName) {
      const fnType = action.kind === 'query' || action.kind === 'command' ? '(...args: any[]) => Promise<void>' : '(...args: any[]) => void';
      actionAssertions.push(`type ${assertName(`Action_${action.methodName}`, action.methodName)} = Assert<Assignable<typeof page${propertyAccess(action.methodName)}, ${fnType}>>;`);
    }
    if (typeof action.handlerName === 'string' && action.handlerName) {
      actionAssertions.push(`type ${assertName(`Handler_${action.handlerName}`, action.handlerName)} = Assert<Assignable<typeof page${propertyAccess(action.handlerName)}, (...args: any[]) => void>>;`);
    }
  }

  if (!stateAssertions.length && !actionAssertions.length) return null;
  const testPath = testPathForOutputPath(outputPath);
  return [
    mlsHeaderForOutputPath(testPath),
    '',
    `import type { ${className} } from './${fileBaseName(outputPath)}.js';`,
    '',
    'type Assignable<Actual, Expected> = Actual extends Expected ? true : false;',
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

function stateAssertionType(state: Record<string, unknown>): string {
  if (Array.isArray(state.valueSet) && state.valueSet.length > 0 && state.valueSet.every(item => typeof item === 'string')) {
    return state.valueSet.map(item => JSON.stringify(item)).join(' | ');
  }
  if (state.collection === true || Array.isArray(state.defaultValue)) return 'unknown[]';
  const value = state.defaultValue;
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'string') return 'string';
  return 'unknown';
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
