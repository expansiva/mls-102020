/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/contracts30/agentP2Contracts.test.ts" enhancement="_blank"/>

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
  afterP2ContractsPromptStep,
  beforeP2ContractsPromptStep,
  buildP2ContractsHumanPrompt,
} from '/_102020_/l2/agentPlannerL2/steps/contracts30/agentP2Contracts.js';
import {
  P2_CONTRACTS_SCHEMA_VERSION,
  buildP2ContractsTool,
  collectP2CallSlots,
  collectP2EntityFields,
  collectP2FieldCatalog,
  countP2CallsByKind,
  emitP2ContractDefs,
  fieldByPath,
  normalizeP2ContractsPayload,
  p2ContractFile,
  type P2ContractsDraft,
} from '/_102020_/l2/agentPlannerL2/steps/contracts30/contracts.js';
import { emittedContractIsClean, validateP2Contracts } from '/_102020_/l2/agentPlannerL2/steps/contracts30/gate.js';
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
const DRAFT_PATH = path.join(HERE, 'fixtures/contracts30-draft.json');
const SCHEMA_PATH = path.join(HERE, '../../schemas/contracts.schema.json');
const FIXTURE_CONTRACTS = path.join(HERE, 'fixtures/contracts');
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

function loadDraft(): P2ContractsDraft {
  return JSON.parse(readFileSync(DRAFT_PATH, 'utf8')) as P2ContractsDraft;
}

function loadSchema(): Record<string, unknown> {
  return JSON.parse(readFileSync(SCHEMA_PATH, 'utf8')) as Record<string, unknown>;
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

function emitAll(draft: P2ContractsDraft, sources: P2L4Sources): Record<string, string> {
  const catalog = fieldByPath(collectP2FieldCatalog(sources));
  const files: Record<string, string> = {};
  for (const workspace of draft.workspaces) {
    files[`${workspace.workspaceId}.defs.ts`] = emitP2ContractDefs({
      project: PROJECT,
      moduleName: draft.moduleName,
      workspaceId: workspace.workspaceId,
      calls: workspace.calls,
      catalog,
    });
  }
  return files;
}

function compileDefs(files: Record<string, string>): { status: number; stderr: string } {
  const dir = path.join(tmpdir(), `p2-contracts-${Date.now()}-${Math.random().toString(16).slice(2)}`);
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
    project: 102020, level: 2, folder: 'agentPlannerL2/skills', shortName: 'contracts', extension: '.md',
    content: readFileSync(path.join(HERE, '../../skills/contracts.md'), 'utf8'),
  });
  seed(host, {
    project: 102020, level: 2, folder: 'agentPlannerL2/steps/contracts30', shortName: 'prompt', extension: '.md',
    content: readFileSync(path.join(HERE, 'prompt.md'), 'utf8'),
  });
  seed(host, {
    project: 102020, level: 2, folder: 'agentPlannerL2/schemas', shortName: 'contracts.schema', extension: '.json',
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
    },
    thread: 'mensalidadesAcademia-20260918103000',
    round: 1,
    messageFile: 'l4/mensalidadesAcademia/pool/l2/x.json',
    updatedAt: '2026-09-18T10:40:00.000Z',
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

function contractsStep(): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId: 30,
    interaction: null,
    stepTitle: 'Contracts',
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: 'agentPlannerL2',
    prompt: JSON.stringify({ planId: 'contracts30', moduleName: MODULE, thread: 't', file: 'f' }),
    rags: [],
    planning: { planId: 'contracts30', dependsOn: ['workspaces20-done'], executionMode: 'sequential', executionHost: 'client' },
  };
}

void test('ontologyPaths lists Mensalidade fields with derived and types from the entity file', () => {
  const sources = loadSources(L4_FIXTURE);
  const mensalidade = sources.ontologyEntities.find(entity => entity.entityId === 'Mensalidade');
  assert.ok(mensalidade);
  const fields = collectP2EntityFields(mensalidade);
  const byPath = Object.fromEntries(fields.map(field => [field.path, field]));

  assert.equal(fields.some(field => field.path === 'Mensalidade'), false);
  assert.equal(byPath['Mensalidade.id']?.derived, true);
  assert.equal(byPath['Mensalidade.id']?.tsType, 'string');
  assert.equal(byPath['Mensalidade.details.valorCobranca']?.derived, false);
  assert.equal(byPath['Mensalidade.details.valorCobranca']?.tsType, 'number');
  assert.equal(byPath['Mensalidade.details.situacao']?.derived, true);
  assert.equal(byPath['Mensalidade.matriculaId']?.tsType, 'string');

  const matricula = sources.ontologyEntities.find(entity => entity.entityId === 'Matricula');
  assert.ok(matricula);
  const status = collectP2EntityFields(matricula).find(field => field.path === 'Matricula.status');
  assert.equal(status?.tsType, "'active' | 'canceled'");
  assert.deepEqual(status?.enumValues, ['active', 'canceled']);
});

void test('call slots follow locate/inspect/act of the mensalidadesAcademia workspace cut', () => {
  const sources = loadSources(L4_FIXTURE);
  const workspaces = loadWorkspaces();
  const slots = collectP2CallSlots(workspaces, sources);
  assert.equal(slots.length, 11);
  const byStep = Object.fromEntries(slots.map(slot => [slot.stepRef + (slot.transitionRef ? `:${slot.transitionRef}` : ''), slot]));
  assert.equal(byStep.localizarAluno.shape, 'list');
  assert.equal(byStep.localizarAluno.kind, 'query');
  assert.equal(byStep.inspecionarMensalidade.shape, 'get');
  assert.equal(byStep.criarMatricula.shape, 'create');
  assert.equal(byStep.criarMatricula.kind, 'command');
  assert.equal(byStep.inspecionarIndicadores.shape, 'ddm');
  assert.equal(byStep['cancelarMatricula:cancelarMatricula']?.shape, 'transition');
  assert.equal(byStep['cancelarMatricula:cancelarMatricula']?.transitionRef, 'cancelarMatricula');
});

void test('decide expands to one command slot per branching origin', () => {
  const sources: P2L4Sources = {
    moduleName: 'compras',
    userLanguage: 'en',
    actors: [{ actorId: 'gerente', title: 'Manager', kind: 'internal' }],
    journeys: [{
      journeyId: 'decidirPedido',
      actorRef: 'gerente',
      title: 'Decide',
      steps: [{ stepId: 'decidir', kind: 'decide', entity: 'Pedido' }],
    }],
    entities: [{
      entityId: 'Pedido',
      kind: 'entity',
      capabilities: [],
      transitions: [
        { transitionId: 'aprovar', from: ['submitted'], to: 'approved' },
        { transitionId: 'rejeitar', from: ['submitted'], to: 'rejected' },
      ],
    }],
    ontologyEntities: [],
  };
  const workspaces: P2WorkspacesDraft = {
    schemaVersion: '2026-09-18-p2-workspaces-v1',
    moduleName: 'compras',
    workspaces: [{
      workspaceId: 'pedidoCommand',
      title: 'Decide',
      kind: 'command',
      entityRef: 'Pedido',
      actorRefs: ['gerente'],
      journeyRefs: ['decidirPedido'],
      stepRefs: ['decidir'],
    }],
  };
  const slots = collectP2CallSlots(workspaces, sources);
  assert.equal(slots.length, 2);
  assert.deepEqual(slots.map(slot => slot.transitionRef).sort(), ['aprovar', 'rejeitar']);
  assert.ok(slots.every(slot => slot.kind === 'command' && slot.shape === 'transition'));
});

void test('accepted mensalidadesAcademia contracts draft passes the gate', () => {
  const sources = loadSources(L4_FIXTURE);
  const workspaces = loadWorkspaces();
  const draft = loadDraft();
  const gate = validateP2Contracts(draft, workspaces, sources);
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.equal(draft.schemaVersion, P2_CONTRACTS_SCHEMA_VERSION);
  assert.equal(draft.workspaces.length, 5);
  const counts = countP2CallsByKind(draft);
  assert.equal(counts.query, 7);
  assert.equal(counts.command, 4);
});

void test('gate rejects unknown fields, derived command input and dropped slots', () => {
  const sources = loadSources(L4_FIXTURE);
  const workspaces = loadWorkspaces();
  const draft = structuredClone(loadDraft()) as P2ContractsDraft;

  draft.workspaces[0].calls[0].inputFields = ['Aluno.fantasma'];
  assert.ok(validateP2Contracts(draft, workspaces, sources).issues.some(issue => issue.code === 'P2_CONTRACT_FIELD_UNKNOWN'));

  const derived = structuredClone(loadDraft()) as P2ContractsDraft;
  const create = derived.workspaces[0].calls.find(call => call.callName === 'cmdCreateMatricula')!;
  create.inputFields = [...create.inputFields, 'Matricula.version'];
  assert.ok(validateP2Contracts(derived, workspaces, sources).issues.some(issue => issue.code === 'P2_CONTRACT_DERIVED_INPUT'));

  const dropped = structuredClone(loadDraft()) as P2ContractsDraft;
  dropped.workspaces[0].calls = dropped.workspaces[0].calls.slice(0, 1);
  assert.ok(validateP2Contracts(dropped, workspaces, sources).issues.some(issue => issue.code === 'P2_CONTRACT_SLOT_MISSING'));
});

void test('emitter writes paginated list, enum unions, identity on transition, and no any/import', () => {
  const sources = loadSources(L4_FIXTURE);
  const draft = loadDraft();
  const files = emitAll(draft, sources);
  const list = files['mensalidadeCatalogue.defs.ts'];
  assert.match(list, /export interface QryListMensalidadeInput/);
  assert.match(list, /page\?: number;/);
  assert.match(list, /mensalidadeItems: QryListMensalidadeOutputItem\[\];/);
  assert.match(list, /total: number;/);
  assert.equal(list.includes(' items:'), false);
  assert.match(list, /export const qryListMensalidadeRoute = 'mensalidadesAcademia.mensalidadeCatalogue.qryListMensalidade' as const;/);
  assert.match(list, /formaPagamento: 'cash' \| 'pix' \| 'debitCard' \| 'creditCard' \| 'bankTransfer';/);

  const cancel = files['cancelarPropriaMatricula.defs.ts'];
  assert.match(cancel, /export interface CmdCancelarMatriculaInput/);
  assert.match(cancel, /id: string;/);
  assert.match(cancel, /status: 'active' \| 'canceled';/);

  const hub = files['indicadoresAcademiaHub.defs.ts'];
  assert.match(hub, /export interface QryInspectMensalidadeOutput/);
  assert.match(hub, /totalPago: number;/);
  assert.equal(hub.includes('IndicadoresAcademia'), false);

  for (const [name, source] of Object.entries(files)) {
    assert.deepEqual(emittedContractIsClean(source), [], name);
  }
});

void test('emitted defs compile with tsc --noEmit', () => {
  const sources = loadSources(L4_FIXTURE);
  const files = emitAll(loadDraft(), sources);
  const ok = compileDefs(files);
  assert.equal(ok.status, 0, ok.stderr);

  const broken = { ...files, 'mensalidadeCatalogue.defs.ts': `${files['mensalidadeCatalogue.defs.ts']}\nexport const leak: NotAType = 1;\n` };
  const bad = compileDefs(broken);
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr, /NotAType/);
});

void test('contracts30 tool schema is provider-clean and has no optional single-value fields', () => {
  const schema = loadSchema();
  const tool = buildP2ContractsTool(schema);
  assert.equal(tool.function.name, 'submitP2Contracts');
  assert.equal(lintToolSchema(JSON.stringify(tool.function.parameters)), null);
  assert.deepEqual(requiredIncludesAllProperties(schema), []);
  assert.deepEqual(requiredIncludesAllProperties(tool.function.parameters), []);
});

void test('createAgent registers contracts30 on the dispatch table', () => {
  createAgent();
  assert.equal(P2_STEP_HOOKS.contracts30?.beforePromptStep, beforeP2ContractsPromptStep);
  assert.equal(ownerStepId('contracts30-repair-1'), 'contracts30');
});

void test('beforePromptStep emits prompt_ready with slots, catalog and the strict tool', async () => {
  const host = installHost();
  seedAgentFiles(host);
  seedL4(host, L4_FIXTURE);
  seedPipeline(host);
  const step = contractsStep();
  const intents = await beforeP2ContractsPromptStep(agentMeta(), contextWith(step), step, step, 1);
  assert.equal(intents.length, 1);
  assert.equal(intents[0].type, 'prompt_ready');
  const ready = intents[0] as mls.msg.AgentIntentPromptReady;
  assert.match(String(ready.humanPrompt || ''), /localizarAluno/);
  assert.match(String(ready.humanPrompt || ''), /Mensalidade\.details\.valorCobranca/);
  assert.equal(ready.tools?.[0]?.function.name, 'submitP2Contracts');
  assert.match(String(ready.systemPrompt || ''), /submitP2Contracts/);
});

void test('afterPromptStep schedules repair when the gate fails', async () => {
  const host = installHost();
  seedAgentFiles(host);
  seedL4(host, L4_FIXTURE);
  seedPipeline(host);
  const step = contractsStep();
  const bad = {
    type: 'flexible',
    result: {
      schemaVersion: P2_CONTRACTS_SCHEMA_VERSION,
      workspaces: [{
        workspaceId: 'matriculaCatalogue',
        calls: [{
          callName: 'qryListAluno',
          kind: 'query',
          stepRef: 'localizarAluno',
          entityRef: 'Aluno',
          shape: 'list',
          transitionRef: '',
          inputFields: [],
          outputFields: ['Aluno.id'],
        }],
      }],
    },
  };
  const intents = await afterP2ContractsPromptStep(agentMeta(), contextWith(step, bad), step, step, 1);
  const add = intents.find(intent => intent.type === 'add-step') as mls.msg.AgentIntentAddStep | undefined;
  assert.ok(add, `intents: ${intents.map(intent => intent.type).join(',')}`);
  assert.equal((add.step as mls.msg.AIAgentStep).planning?.planId, 'contracts30-repair-1');
});

void test('afterPromptStep approves the accepted draft and writes defs.ts per workspace', async () => {
  const host = installHost();
  seedAgentFiles(host);
  seedL4(host, L4_FIXTURE);
  seedPipeline(host);
  const step = contractsStep();
  const payload = { type: 'flexible', result: loadDraft() };
  const intents = await afterP2ContractsPromptStep(agentMeta(), contextWith(step, payload), step, step, 1);
  assert.ok(intents.some(intent => intent.type === 'add-step' && (intent as mls.msg.AgentIntentAddStep).step.planning?.planId === 'contracts30-done'));
  const status = intents.find(intent => intent.type === 'update-status') as mls.msg.AgentIntentUpdateStatus;
  assert.equal(status.status, 'completed');
  assert.match(String(status.traceMsg || ''), /contracts30 approved/);
  const pipeline = JSON.parse(host.files[keyOf(p2PipelineFile(MODULE))].content) as { steps: { contracts30: { status: string } } };
  assert.equal(pipeline.steps.contracts30.status, 'approved');
  const written = host.files[keyOf(p2ContractFile(MODULE, 'matriculaCatalogue'))];
  assert.ok(written?.content.includes('export interface QryListAlunoInput'));
  assert.equal(written.content.includes('import '), false);
});

void test('isolated contracts30 on mensalidadesAcademia emits one defs.ts per workspace', () => {
  const sources = loadSources(existsSync(REAL_ROOT) ? REAL_ROOT : L4_FIXTURE);
  const workspaces = loadWorkspaces();
  const draft = normalizeP2ContractsPayload(loadDraft(), MODULE);
  const gate = validateP2Contracts(draft, workspaces, sources);
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  const files = emitAll(draft, sources);
  assert.deepEqual(Object.keys(files).sort(), [
    'cancelarPropriaMatricula.defs.ts',
    'gerarMensalidadesDoMes.defs.ts',
    'indicadoresAcademiaHub.defs.ts',
    'matriculaCatalogue.defs.ts',
    'mensalidadeCatalogue.defs.ts',
  ]);
  for (const [name, source] of Object.entries(files)) {
    const committed = readFileSync(path.join(FIXTURE_CONTRACTS, name), 'utf8');
    assert.equal(committed, source, name);
  }
  const human = buildP2ContractsHumanPrompt({ sources, workspaces });
  assert.match(human, /## Call slots/);
  assert.equal(liveTestsEnabled(), false);
  const hub = files['indicadoresAcademiaHub.defs.ts'];
  assert.match(hub, /QryInspectMensalidade/);
  assert.equal(hub.includes('IndicadoresAcademia'), false);
});
