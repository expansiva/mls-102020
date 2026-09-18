/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/shared40/agentP2Shared.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { liveTestsEnabled } from '/_102025_/l2/testLlmClient.js';
import { createAgent } from '/_102020_/l2/agentPlannerL2/agentPlannerL2.js';
import { P2_STEP_HOOKS } from '/_102020_/l2/agentPlannerL2/helpers/p2Dispatch.js';
import { ownerStepId, p2PipelineFile } from '/_102020_/l2/agentPlannerL2/helpers/p2Core.js';
import {
  afterP2SharedPromptStep,
  beforeP2SharedPromptStep,
  buildP2SharedHumanPrompt,
} from '/_102020_/l2/agentPlannerL2/steps/shared40/agentP2Shared.js';
import {
  P2_SHARED_KEY_READERS,
  P2_SHARED_KEYS,
  P2_SHARED_SCHEMA_VERSION,
  assembleP2SharedDefinition,
  buildP2SharedTool,
  callsOf,
  deriveP2SharedBase,
  emitP2SharedDefs,
  isDestructiveCommandName,
  normalizeP2SharedPayload,
  p2SharedFile,
  sourceKindOf,
  suggestP2SharedJudgment,
  toPascalCase,
  type P2SharedDraft,
  type P2SharedJudgment,
} from '/_102020_/l2/agentPlannerL2/steps/shared40/contracts.js';
import { emittedSharedIsClean, parseEmittedDefinition, validateP2Shared } from '/_102020_/l2/agentPlannerL2/steps/shared40/gate.js';
import {
  collectP2FieldCatalog,
  fieldByPath,
  type P2ContractsDraft,
} from '/_102020_/l2/agentPlannerL2/steps/contracts30/contracts.js';
import {
  parseP2L4Sources,
  type P2L4Sources,
  type P2WorkspacesDraft,
} from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MLS_BASE = path.resolve(HERE, '../../../../../');
const L4_FIXTURE = path.join(HERE, '../workspaces20/fixtures/mensalidadesAcademia');
const REAL_ROOT = path.join(MLS_BASE, 'mls-102047/l4/mensalidadesAcademia');
const WORKSPACES_DRAFT_PATH = path.join(HERE, '../workspaces20/fixtures/workspaces20-draft.json');
const CONTRACTS_DRAFT_PATH = path.join(HERE, '../contracts30/fixtures/contracts30-draft.json');
const DRAFT_PATH = path.join(HERE, 'fixtures/shared40-draft.json');
const SCHEMA_PATH = path.join(HERE, '../../schemas/shared.schema.json');
const FIXTURE_SHARED = path.join(HERE, 'fixtures/shared');
const ATENDENTE_DEFS = path.join(MLS_BASE, 'mls-102039/l2/controleChamados/web/shared/atendenteCatalogue.defs.ts');
const PROJECT = 102047;
const MODULE = 'mensalidadesAcademia';

function extractDefsJson(source: string): unknown {
  const assignment = source.search(/export\s+const\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=/);
  const start = source.indexOf('{', Math.max(0, assignment));
  if (assignment < 0 || start < 0) throw new Error('no json object in defs');
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') { inString = true; continue; }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return JSON.parse(source.slice(start, index + 1));
    }
  }
  throw new Error('unbalanced defs json');
}

function readDefs(root: string, rel: string): unknown {
  return extractDefsJson(readFileSync(path.join(root, rel), 'utf8'));
}

function loadSources(root: string): P2L4Sources {
  const journeyDir = path.join(root, 'journeys');
  const ontologyDir = path.join(root, 'ontology');
  const journeys = readdirSync(journeyDir)
    .filter(name => name.endsWith('.defs.ts') && name !== 'index.defs.ts')
    .sort()
    .map(name => readDefs(root, `journeys/${name}`));
  const ontologyEntities = readdirSync(ontologyDir)
    .filter(name => name.endsWith('.defs.ts') && name !== 'index.defs.ts')
    .sort()
    .map(name => readDefs(root, `ontology/${name}`));
  const moduleArtifact = readDefs(root, 'module.defs.ts') as { userLanguage?: string; moduleName?: string };
  return parseP2L4Sources({
    moduleName: moduleArtifact.moduleName,
    userLanguage: moduleArtifact.userLanguage,
    journeyIndex: readDefs(root, 'journeys/index.defs.ts'),
    journeys,
    access: readDefs(root, 'access.defs.ts'),
    ontologyIndex: readDefs(root, 'ontology/index.defs.ts'),
    ontologyEntities,
  });
}

function loadWorkspaces(): P2WorkspacesDraft {
  return JSON.parse(readFileSync(WORKSPACES_DRAFT_PATH, 'utf8')) as P2WorkspacesDraft;
}

function loadContracts(): P2ContractsDraft {
  return JSON.parse(readFileSync(CONTRACTS_DRAFT_PATH, 'utf8')) as P2ContractsDraft;
}

function loadSchema(): Record<string, unknown> {
  return JSON.parse(readFileSync(SCHEMA_PATH, 'utf8')) as Record<string, unknown>;
}

function overlayCancel(judgment: P2SharedJudgment): P2SharedJudgment {
  if (judgment.workspaceId !== 'cancelarPropriaMatricula') return judgment;
  const scenaries = judgment.scenaries.filter(scene => scene.commandName !== 'cmdCancelarMatricula');
  return {
    ...judgment,
    destructiveCommandIds: ['cmdCancelarMatricula'],
    scenaries,
    states: judgment.states.map(state => state.kind === 'uiScenary'
      ? { ...state, valueSet: scenaries.map(scene => scene.value) }
      : state),
  };
}

function acceptedDraft(sources = loadSources(L4_FIXTURE)): P2SharedDraft {
  const workspaces = loadWorkspaces();
  const contracts = loadContracts();
  const catalog = fieldByPath(collectP2FieldCatalog(sources));
  return {
    schemaVersion: P2_SHARED_SCHEMA_VERSION,
    moduleName: MODULE,
    workspaces: workspaces.workspaces.map(workspace => overlayCancel(suggestP2SharedJudgment(
      workspace,
      callsOf(contracts, workspace.workspaceId),
      catalog,
      MODULE,
    ))),
  };
}

function emitAll(draft: P2SharedDraft, sources: P2L4Sources): Record<string, string> {
  const workspaces = loadWorkspaces();
  const contracts = loadContracts();
  const files: Record<string, string> = {};
  for (const judgment of draft.workspaces) {
    const cut = workspaces.workspaces.find(item => item.workspaceId === judgment.workspaceId);
    if (!cut) continue;
    const definition = assembleP2SharedDefinition(
      deriveP2SharedBase({
        project: PROJECT,
        moduleName: MODULE,
        workspace: cut,
        calls: callsOf(contracts, judgment.workspaceId),
        sources,
      }),
      judgment,
    );
    files[`${judgment.workspaceId}.defs.ts`] = emitP2SharedDefs({
      project: PROJECT,
      moduleName: MODULE,
      workspaceId: judgment.workspaceId,
      definition,
    });
  }
  return files;
}

function requiredIncludesAllProperties(schema: unknown, pathName = '$'): string[] {
  const issues: string[] = [];
  const walk = (node: unknown, at: string) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    const record = node as Record<string, unknown>;
    if (record.type === 'object' && isRecord(record.properties)) {
      const required = Array.isArray(record.required) ? record.required.map(String) : [];
      for (const key of Object.keys(record.properties)) {
        const prop = record.properties[key];
        const unique = isRecord(prop) && (prop.const !== undefined || (Array.isArray(prop.enum) && prop.enum.length === 1));
        if (unique && !required.includes(key)) issues.push(`${at}.${key} is optional with a single allowed value`);
        walk(prop, `${at}.${key}`);
      }
    }
    if (isRecord(record.$defs)) {
      for (const [key, def] of Object.entries(record.$defs)) walk(def, `${at}.$defs.${key}`);
    }
    if (record.items) walk(record.items, `${at}.items`);
  };
  walk(schema, pathName);
  return issues;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function compileDefs(files: Record<string, string>): { status: number; stderr: string } {
  const dir = path.join(tmpdir(), `p2-shared-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  try {
    for (const [name, source] of Object.entries(files)) writeFileSync(path.join(dir, name), source);
    writeFileSync(path.join(dir, 'tsconfig.json'), `${JSON.stringify({
      compilerOptions: { strict: true, noEmit: true, target: 'ES2022', module: 'ESNext', skipLibCheck: true },
      include: ['*.defs.ts'],
    }, null, 2)}\n`);
    const tsc = path.join(MLS_BASE, 'node_modules/.bin/tsc');
    const result = spawnSync(tsc, ['--noEmit', '-p', dir], { encoding: 'utf8' });
    return { status: result.status ?? 1, stderr: `${result.stdout || ''}${result.stderr || ''}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

type Stored = {
  project: number; level: number; folder: string; shortName: string; extension: string;
  status: string; versionRef: string; content: string;
  getValueInfo: () => Promise<{ content: string }>;
  getContent: () => Promise<string>;
};
type Host = { files: Record<string, Stored> };

function keyOf(info: { project: number | string; level: number | string; folder: string; shortName: string; extension: string }): string {
  return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
}

function seed(host: Host, opts: { project?: number; level?: number; folder: string; shortName: string; extension?: string; content: string }): Stored {
  const file: Stored = {
    project: opts.project ?? PROJECT,
    level: opts.level ?? 4,
    folder: opts.folder,
    shortName: opts.shortName,
    extension: opts.extension ?? '.defs.ts',
    status: 'changed',
    versionRef: '1',
    content: opts.content,
    getValueInfo: async () => ({ content: file.content }),
    getContent: async () => file.content,
  };
  host.files[keyOf(file)] = file;
  return file;
}

function installHost(): Host {
  const host: Host = { files: {} };
  (globalThis as unknown as Record<string, unknown>).mls = {
    actualProject: PROJECT,
    events: { addEventListener() {}, removeEventListener() {}, dispatch() {} },
    stor: {
      files: host.files,
      getKeyToFile: keyOf,
      localStor: {
        setContent: async (file: Stored, value: { content: string }) => { file.content = value.content; },
        listFolder: () => [],
      },
    },
  };
  return host;
}

function seedAgentFiles(host: Host): void {
  seed(host, {
    project: 102020, level: 2, folder: 'agentPlannerL2/skills', shortName: 'shared', extension: '.md',
    content: readFileSync(path.join(HERE, '../../skills/shared.md'), 'utf8'),
  });
  seed(host, {
    project: 102020, level: 2, folder: 'agentPlannerL2/steps/shared40', shortName: 'prompt', extension: '.md',
    content: readFileSync(path.join(HERE, 'prompt.md'), 'utf8'),
  });
  seed(host, {
    project: 102020, level: 2, folder: 'agentPlannerL2/schemas', shortName: 'shared.schema', extension: '.json',
    content: readFileSync(SCHEMA_PATH, 'utf8'),
  });
}

function seedL4(host: Host, root: string): void {
  const put = (folder: string, shortName: string, rel: string, extension = '.defs.ts') => {
    seed(host, { folder, shortName, extension, content: readFileSync(path.join(root, rel), 'utf8') });
  };
  put(MODULE, 'module', 'module.defs.ts');
  put(MODULE, 'access', 'access.defs.ts');
  put(`${MODULE}/journeys`, 'index', 'journeys/index.defs.ts');
  for (const name of readdirSync(path.join(root, 'journeys')).filter(item => item.endsWith('.defs.ts') && item !== 'index.defs.ts')) {
    put(`${MODULE}/journeys`, name.replace(/\.defs\.ts$/, ''), `journeys/${name}`);
  }
  put(`${MODULE}/ontology`, 'index', 'ontology/index.defs.ts');
  for (const name of readdirSync(path.join(root, 'ontology')).filter(item => item.endsWith('.defs.ts') && item !== 'index.defs.ts')) {
    put(`${MODULE}/ontology`, name.replace(/\.defs\.ts$/, ''), `ontology/${name}`);
  }
}

function seedPipeline(host: Host): void {
  const pipeline = {
    schemaVersion: '2026-09-18-p2-pipeline-v1',
    flowId: 'agentPlannerL2',
    moduleName: MODULE,
    status: 'inProgress',
    steps: {
      entry10: { status: 'approved', updatedAt: '2026-09-18T10:30:00.000Z' },
      workspaces20: { status: 'approved', updatedAt: '2026-09-18T10:40:00.000Z' },
      contracts30: { status: 'approved', updatedAt: '2026-09-18T10:50:00.000Z' },
    },
    thread: 'mensalidadesAcademia-20260918103000',
    round: 1,
    messageFile: 'l4/mensalidadesAcademia/pool/l2/x.json',
    updatedAt: '2026-09-18T10:50:00.000Z',
  };
  seed(host, {
    level: 2,
    folder: `${MODULE}/pipeline`,
    shortName: 'pipeline',
    extension: '.json',
    content: `${JSON.stringify(pipeline, null, 2)}\n`,
  });
  seed(host, {
    level: 2,
    folder: `${MODULE}/pipeline`,
    shortName: 'workspaces20-draft',
    extension: '.json',
    content: `${JSON.stringify(loadWorkspaces(), null, 2)}\n`,
  });
  seed(host, {
    level: 2,
    folder: `${MODULE}/pipeline`,
    shortName: 'contracts30-draft',
    extension: '.json',
    content: `${JSON.stringify(loadContracts(), null, 2)}\n`,
  });
  seed(host, {
    level: 2,
    folder: `${MODULE}/pipeline`,
    shortName: 'shared40-draft',
    extension: '.json',
    content: '{}\n',
  });
}

function agentMeta(): IAgentMeta {
  return {
    agentName: 'agentPlannerL2',
    agentProject: 102020,
    agentFolder: 'agentPlannerL2',
    agentDescription: 'test',
    visibility: 'public',
  };
}

function contextWith(step: mls.msg.AIAgentStep, payload?: unknown): mls.msg.ExecutionContext {
  const root: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 1,
    interaction: null,
    stepTitle: `plan l2 ${MODULE}`,
    status: 'waiting_human_input',
    nextSteps: [step],
    agentName: 'agentPlannerL2',
    prompt: '',
    rags: [],
    planning: { planId: 'root', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
  if (payload !== undefined) {
    step.interaction = { payload: [payload] } as mls.msg.AIInteraction;
  }
  return {
    message: { orderAt: 'msg-1', threadId: 'thread-1', content: '', senderId: 'u' },
    task: { PK: 'task-1', iaCompressed: { nextSteps: [root], longMemory: { moduleName: MODULE } } },
  } as unknown as mls.msg.ExecutionContext;
}

function sharedStep(): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId: 40,
    interaction: null,
    stepTitle: 'Shared',
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: 'agentPlannerL2',
    prompt: JSON.stringify({ planId: 'shared40', moduleName: MODULE, thread: 't', file: 'f' }),
    rags: [],
    planning: { planId: 'shared40', dependsOn: ['contracts30-done'], executionMode: 'sequential', executionHost: 'client' },
  };
}

void test('derived keys follow the workspace cut and the contracts, not a guessed name', () => {
  const sources = loadSources(L4_FIXTURE);
  const workspaces = loadWorkspaces();
  const contracts = loadContracts();
  const cut = workspaces.workspaces.find(item => item.workspaceId === 'mensalidadeCatalogue')!;
  const base = deriveP2SharedBase({
    project: PROJECT,
    moduleName: MODULE,
    workspace: cut,
    calls: callsOf(contracts, cut.workspaceId),
    sources,
  });
  assert.equal(base.pageId, 'mensalidadeCatalogue');
  assert.equal(base.moduleName, MODULE);
  assert.equal(base.baseClassName, 'MensalidadesAcademiaMensalidadeCatalogueBase');
  assert.equal(base.routePattern, '/mensalidadesAcademia/mensalidadeCatalogue');
  assert.equal(base.sourceKind, 'operation');
  assert.deepEqual(base.operationIds, ['qryListMensalidade', 'qryGetMensalidade', 'cmdCreatePagamento']);
  assert.ok(base.ownerIds.includes('workspace:mensalidadeCatalogue'));
  assert.ok(base.ownerIds.includes('contract:mensalidadesAcademia.mensalidadeCatalogue.qryListMensalidade'));
  assert.equal(base.contractRef.tsPath, '_102047_/l2/mensalidadesAcademia/web/contracts/mensalidadeCatalogue.ts');
  assert.equal(base.layoutRef.defPath, '_102047_/l2/mensalidadesAcademia/web/desktop/page11/mensalidadeCatalogue.defs.ts');
  assert.equal(base.origin.actor, 'recepcao');
  assert.equal(base.origin.entity, 'Mensalidade');

  const renamed = deriveP2SharedBase({
    project: PROJECT,
    moduleName: MODULE,
    workspace: { ...cut, workspaceId: 'mensalidadePainel' },
    calls: callsOf(contracts, cut.workspaceId),
    sources,
  });
  assert.equal(renamed.pageId, 'mensalidadePainel');
  assert.equal(renamed.baseClassName, 'MensalidadesAcademiaMensalidadePainelBase');
  assert.notEqual(renamed.baseClassName, base.baseClassName);
});

void test('sourceKind maps catalogue/command to operation and hub to landing', () => {
  assert.equal(sourceKindOf('catalogue'), 'operation');
  assert.equal(sourceKindOf('command'), 'operation');
  assert.equal(sourceKindOf('hub'), 'landing');
  const sources = loadSources(L4_FIXTURE);
  const workspaces = loadWorkspaces();
  const contracts = loadContracts();
  const hub = workspaces.workspaces.find(item => item.workspaceId === 'indicadoresAcademiaHub')!;
  const base = deriveP2SharedBase({
    project: PROJECT,
    moduleName: MODULE,
    workspace: hub,
    calls: callsOf(contracts, hub.workspaceId),
    sources,
  });
  assert.equal(base.sourceKind, 'landing');
  assert.equal(base.origin.workspaceKind, 'landing');
  assert.equal(base.origin.entity, 'Mensalidade');
});

void test('every shared key has a named page11/page21 reader and matches the 102039 definition', () => {
  assert.equal(P2_SHARED_KEYS.length, 20);
  for (const key of P2_SHARED_KEYS) {
    assert.ok(P2_SHARED_KEY_READERS[key], `missing reader for ${key}`);
  }
  const sample = extractDefsJson(readFileSync(ATENDENTE_DEFS, 'utf8')) as Record<string, unknown>;
  for (const key of P2_SHARED_KEYS) {
    assert.ok(key in sample, `102039 missing ${key}`);
  }
});

void test('accepted mensalidadesAcademia shared draft passes the gate', () => {
  const sources = loadSources(L4_FIXTURE);
  const workspaces = loadWorkspaces();
  const contracts = loadContracts();
  const draft = acceptedDraft(sources);
  const gate = validateP2Shared(draft, workspaces, contracts, sources, PROJECT);
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.equal(draft.schemaVersion, P2_SHARED_SCHEMA_VERSION);
  assert.equal(draft.workspaces.length, 5);
});

void test('gate rejects an invented command scene, a missing precondition and a destructive leak', () => {
  const sources = loadSources(L4_FIXTURE);
  const workspaces = loadWorkspaces();
  const contracts = loadContracts();
  const invented = structuredClone(acceptedDraft(sources)) as P2SharedDraft;
  invented.workspaces[1].scenaries.push({
    value: 'explode',
    kind: 'command',
    commandName: 'cmdExplode',
    preconditions: [],
  });
  assert.ok(validateP2Shared(invented, workspaces, contracts, sources, PROJECT).issues.some(issue => issue.code === 'P2_SHARED_SCENARY_CMD'));

  const missing = structuredClone(acceptedDraft(sources)) as P2SharedDraft;
  missing.workspaces[1].scenaries[1].preconditions = ['ui.mensalidadeCatalogue.input.ghost.id'];
  assert.ok(validateP2Shared(missing, workspaces, contracts, sources, PROJECT).issues.some(issue => issue.code === 'P2_SHARED_PRECONDITION'));

  const leak = structuredClone(acceptedDraft(sources)) as P2SharedDraft;
  leak.workspaces[4].scenaries.push({
    value: 'cancelarMatricula',
    kind: 'command',
    commandName: 'cmdCancelarMatricula',
    preconditions: [],
  });
  assert.ok(validateP2Shared(leak, workspaces, contracts, sources, PROJECT).issues.some(issue => issue.code === 'P2_SHARED_SCENARY_DESTRUCTIVE'));
});

void test('emitter writes the 20 keys, uiScenary header, paginated list and no class', () => {
  const sources = loadSources(L4_FIXTURE);
  const files = emitAll(acceptedDraft(sources), sources);
  const catalogue = files['mensalidadeCatalogue.defs.ts'];
  assert.match(catalogue, /export const definition = /);
  assert.match(catalogue, / as const;/);
  assert.match(catalogue, /uiScenary contract/);
  assert.match(catalogue, /"pageId": "mensalidadeCatalogue"/);
  assert.match(catalogue, /"baseClassName": "MensalidadesAcademiaMensalidadeCatalogueBase"/);
  assert.match(catalogue, /"outputShape": "paginated"/);
  assert.match(catalogue, /"mensalidadeItems": \[\]/);
  assert.equal(catalogue.includes('"items":'), false);
  assert.equal(catalogue.includes('export class'), false);
  assert.equal(catalogue.includes('import '), false);

  const parsed = parseEmittedDefinition(catalogue) as Record<string, unknown>;
  assert.deepEqual(Object.keys(parsed), [...P2_SHARED_KEYS]);

  const cancel = files['cancelarPropriaMatricula.defs.ts'];
  assert.match(cancel, /"cmdCancelarMatricula"/);
  const cancelDef = parseEmittedDefinition(cancel) as { destructiveCommandIds: string[]; scenaries: { commandName: string }[] };
  assert.deepEqual(cancelDef.destructiveCommandIds, ['cmdCancelarMatricula']);
  assert.equal(cancelDef.scenaries.some(scene => scene.commandName === 'cmdCancelarMatricula'), false);
  assert.equal(isDestructiveCommandName('cmdCancelarMatricula'), false);

  const hub = files['indicadoresAcademiaHub.defs.ts'];
  const hubDef = parseEmittedDefinition(hub) as { sourceKind: string; origin: { entity: string }; operationIds: string[] };
  assert.equal(hubDef.sourceKind, 'landing');
  assert.equal(hubDef.origin.entity, 'Mensalidade');
  assert.deepEqual(hubDef.operationIds, ['qryInspectMensalidade']);

  for (const [name, source] of Object.entries(files)) {
    assert.deepEqual(emittedSharedIsClean(source), [], name);
  }
});

void test('emitted defs compile with tsc --noEmit', () => {
  const sources = loadSources(L4_FIXTURE);
  const files = emitAll(acceptedDraft(sources), sources);
  const ok = compileDefs(files);
  assert.equal(ok.status, 0, ok.stderr);

  const broken = { ...files, 'mensalidadeCatalogue.defs.ts': `${files['mensalidadeCatalogue.defs.ts']}\nexport const leak: NotAType = 1;\n` };
  const bad = compileDefs(broken);
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr, /NotAType/);
});

void test('shared40 tool schema is provider-clean, scene kind is an enum, no optional single-value fields', () => {
  const schema = loadSchema();
  const tool = buildP2SharedTool(schema);
  assert.equal(tool.function.name, 'submitP2Shared');
  assert.equal(lintToolSchema(JSON.stringify(tool.function.parameters)), null);
  assert.deepEqual(requiredIncludesAllProperties(schema), []);
  assert.deepEqual(requiredIncludesAllProperties(tool.function.parameters), []);
  const scenary = (schema.$defs as Record<string, { properties: { kind: { enum: string[] } } }>).scenary;
  assert.deepEqual(scenary.properties.kind.enum, ['base', 'detail', 'command']);
});

void test('createAgent registers shared40 on the dispatch table', () => {
  createAgent();
  assert.equal(P2_STEP_HOOKS.shared40?.beforePromptStep, beforeP2SharedPromptStep);
  assert.equal(ownerStepId('shared40-repair-1'), 'shared40');
  assert.equal(toPascalCase('mensalidadeCatalogue'), 'MensalidadeCatalogue');
});

void test('beforePromptStep emits prompt_ready with derived base, contracts and the strict tool', async () => {
  const host = installHost();
  seedAgentFiles(host);
  seedL4(host, L4_FIXTURE);
  seedPipeline(host);
  const step = sharedStep();
  const intents = await beforeP2SharedPromptStep(agentMeta(), contextWith(step), step, step, 1);
  assert.equal(intents.length, 1);
  assert.equal(intents[0].type, 'prompt_ready');
  const ready = intents[0] as mls.msg.AgentIntentPromptReady;
  assert.match(String(ready.humanPrompt || ''), /mensalidadeCatalogue/);
  assert.match(String(ready.humanPrompt || ''), /Derived base/);
  assert.match(String(ready.humanPrompt || ''), /MensalidadesAcademiaMensalidadeCatalogueBase/);
  assert.equal(ready.tools?.[0]?.function.name, 'submitP2Shared');
  assert.match(String(ready.systemPrompt || ''), /submitP2Shared/);
});

void test('afterPromptStep schedules repair when the gate fails', async () => {
  const host = installHost();
  seedAgentFiles(host);
  seedL4(host, L4_FIXTURE);
  seedPipeline(host);
  const step = sharedStep();
  const bad = {
    type: 'flexible',
    result: {
      schemaVersion: P2_SHARED_SCHEMA_VERSION,
      workspaces: [{
        workspaceId: 'matriculaCatalogue',
        pageName: 'X',
        scenaries: [{ value: 'base', kind: 'base', commandName: 'qryListAluno', preconditions: [] }],
        states: [{ stateKey: 'ui.matriculaCatalogue.status', name: 'status', kind: 'pageStatus', defaultValue: '' }],
        dataBindings: [],
        initialLoads: [],
        actions: [],
        destructiveCommandIds: [],
      }],
    },
  };
  const intents = await afterP2SharedPromptStep(agentMeta(), contextWith(step, bad), step, step, 1);
  const add = intents.find(intent => intent.type === 'add-step') as mls.msg.AgentIntentAddStep | undefined;
  assert.ok(add, `intents: ${intents.map(intent => intent.type).join(',')}`);
  assert.equal((add.step as mls.msg.AIAgentStep).planning?.planId, 'shared40-repair-1');
});

void test('afterPromptStep approves the accepted draft and writes defs.ts per workspace', async () => {
  const host = installHost();
  seedAgentFiles(host);
  seedL4(host, L4_FIXTURE);
  seedPipeline(host);
  const step = sharedStep();
  const payload = { type: 'flexible', result: acceptedDraft() };
  const intents = await afterP2SharedPromptStep(agentMeta(), contextWith(step, payload), step, step, 1);
  assert.ok(intents.some(intent => intent.type === 'add-step' && (intent as mls.msg.AgentIntentAddStep).step.planning?.planId === 'shared40-done'));
  const status = intents.find(intent => intent.type === 'update-status') as mls.msg.AgentIntentUpdateStatus;
  assert.equal(status.status, 'completed');
  assert.match(String(status.traceMsg || ''), /shared40 approved/);
  const pipeline = JSON.parse(host.files[keyOf(p2PipelineFile(MODULE))].content) as { steps: { shared40: { status: string } } };
  assert.equal(pipeline.steps.shared40.status, 'approved');
  const written = host.files[keyOf(p2SharedFile(MODULE, 'mensalidadeCatalogue'))];
  assert.ok(written?.content.includes('export const definition ='));
  assert.ok(written.content.includes('"pageId": "mensalidadeCatalogue"'));
  assert.equal(written.content.includes('export class'), false);
});

void test('isolated shared40 on mensalidadesAcademia emits one defs.ts per workspace', () => {
  const sources = loadSources(existsSync(REAL_ROOT) ? REAL_ROOT : L4_FIXTURE);
  const workspaces = loadWorkspaces();
  const contracts = loadContracts();
  const draft = normalizeP2SharedPayload(acceptedDraft(sources), MODULE);
  const gate = validateP2Shared(draft, workspaces, contracts, sources, PROJECT);
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  const files = emitAll(draft, sources);
  assert.deepEqual(Object.keys(files).sort(), [
    'cancelarPropriaMatricula.defs.ts',
    'gerarMensalidadesDoMes.defs.ts',
    'indicadoresAcademiaHub.defs.ts',
    'matriculaCatalogue.defs.ts',
    'mensalidadeCatalogue.defs.ts',
  ]);
  mkdirSync(FIXTURE_SHARED, { recursive: true });
  if (!existsSync(DRAFT_PATH)) writeFileSync(DRAFT_PATH, `${JSON.stringify(draft, null, 2)}\n`);
  assert.equal(readFileSync(DRAFT_PATH, 'utf8'), `${JSON.stringify(draft, null, 2)}\n`);
  for (const [name, source] of Object.entries(files)) {
    const dest = path.join(FIXTURE_SHARED, name);
    if (!existsSync(dest)) writeFileSync(dest, source);
    assert.equal(readFileSync(dest, 'utf8'), source, name);
  }
  const human = buildP2SharedHumanPrompt({
    sources, workspaces, contracts, project: PROJECT,
  });
  assert.match(human, /## Derived base/);
  assert.equal(liveTestsEnabled(), false);
  const hub = files['indicadoresAcademiaHub.defs.ts'];
  assert.match(hub, /qryInspectMensalidade/);
  assert.match(hub, /"entity": "Mensalidade"/);
  assert.equal(hub.includes('"entity": "IndicadoresAcademia"'), false);
});
