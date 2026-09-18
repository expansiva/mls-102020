/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/workspaces20/agentP2Workspaces.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { liveTestsEnabled } from '/_102025_/l2/testLlmClient.js';
import { createAgent } from '/_102020_/l2/agentPlannerL2/agentPlannerL2.js';
import { P2_STEP_HOOKS } from '/_102020_/l2/agentPlannerL2/helpers/p2Dispatch.js';
import { ownerStepId, p2DraftFile, p2PipelineFile } from '/_102020_/l2/agentPlannerL2/helpers/p2Core.js';
import {
  afterP2WorkspacesPromptStep,
  beforeP2WorkspacesPromptStep,
  buildP2WorkspacesHumanPrompt,
} from '/_102020_/l2/agentPlannerL2/steps/workspaces20/agentP2Workspaces.js';
import {
  P2_WORKSPACES_SCHEMA_VERSION,
  buildP2WorkspacesTool,
  collectP2WorkspaceCandidates,
  normalizeP2WorkspacesPayload,
  parseP2L4Sources,
  suggestedWorkspaceKind,
  type P2L4Sources,
  type P2WorkspacesDraft,
} from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';
import { validateP2Workspaces } from '/_102020_/l2/agentPlannerL2/steps/workspaces20/gate.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MLS_BASE = path.resolve(HERE, '../../../../../');
const FIXTURE_ROOT = path.join(HERE, 'fixtures/mensalidadesAcademia');
const REAL_ROOT = path.join(MLS_BASE, 'mls-102047/l4/mensalidadesAcademia');
const DRAFT_PATH = path.join(HERE, 'fixtures/workspaces20-draft.json');
const SCHEMA_PATH = path.join(HERE, '../../schemas/workspaces.schema.json');
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

function loadDraft(): P2WorkspacesDraft {
  return JSON.parse(readFileSync(DRAFT_PATH, 'utf8')) as P2WorkspacesDraft;
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
    project: 102020, level: 2, folder: 'agentPlannerL2/skills', shortName: 'workspaces', extension: '.md',
    content: readFileSync(path.join(HERE, '../../skills/workspaces.md'), 'utf8'),
  });
  seed(host, {
    project: 102020, level: 2, folder: 'agentPlannerL2/steps/workspaces20', shortName: 'prompt', extension: '.md',
    content: readFileSync(path.join(HERE, 'prompt.md'), 'utf8'),
  });
  seed(host, {
    project: 102020, level: 2, folder: 'agentPlannerL2/schemas', shortName: 'workspaces.schema', extension: '.json',
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
    steps: { entry10: { status: 'approved', updatedAt: '2026-09-18T10:30:00.000Z' } },
    thread: 'mensalidadesAcademia-20260918103000',
    round: 1,
    messageFile: 'l4/mensalidadesAcademia/pool/l2/x.json',
    updatedAt: '2026-09-18T10:30:00.000Z',
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

function workspacesStep(): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId: 20,
    interaction: null,
    stepTitle: 'Workspaces',
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: 'agentPlannerL2',
    prompt: JSON.stringify({ planId: 'workspaces20', moduleName: MODULE, thread: 't', file: 'f' }),
    rags: [],
    planning: { planId: 'workspaces20', dependsOn: ['entry10-done'], executionMode: 'sequential', executionHost: 'client' },
  };
}

void test('mensalidadesAcademia fixtures are byte-for-byte copies of the l4', () => {
  assert.equal(existsSync(REAL_ROOT), true, `missing ${REAL_ROOT}`);
  const walk = (dir: string, rel = ''): string[] => {
    const out: string[] = [];
    for (const name of readdirSync(path.join(dir, rel)).sort()) {
      const child = rel ? `${rel}/${name}` : name;
      const full = path.join(dir, child);
      if (full.endsWith('.defs.ts')) out.push(child);
      else if (!name.includes('.')) out.push(...walk(dir, child));
    }
    return out;
  };
  const files = walk(FIXTURE_ROOT);
  assert.ok(files.includes('journeys/matricularAluno.defs.ts'));
  for (const rel of files) {
    const fixture = readFileSync(path.join(FIXTURE_ROOT, rel));
    const real = readFileSync(path.join(REAL_ROOT, rel));
    assert.equal(Buffer.compare(fixture, real), 0, rel);
  }
});

void test('candidates group mensalidadesAcademia journeys by entity, actor and kind', () => {
  const sources = loadSources(FIXTURE_ROOT);
  const candidates = collectP2WorkspaceCandidates(sources);
  const byId = Object.fromEntries(candidates.map(candidate => [candidate.candidateId, candidate]));

  assert.equal(sources.journeys.length, 5);
  assert.equal(suggestedWorkspaceKind(sources.journeys.find(item => item.journeyId === 'gerarMensalidadesDoMes')!, sources.entities), 'command');
  assert.equal(suggestedWorkspaceKind(sources.journeys.find(item => item.journeyId === 'acompanharIndicadoresAcademia')!, sources.entities), 'hub');
  assert.equal(suggestedWorkspaceKind(sources.journeys.find(item => item.journeyId === 'cancelarPropriaMatricula')!, sources.entities), 'catalogue');

  assert.deepEqual(
    candidates.map(candidate => candidate.candidateId),
    [
      'alunoMatriculaCatalogue',
      'gerenciaMensalidadeCommand',
      'gerenciaMensalidadeHub',
      'recepcaoAlunoCatalogue',
      'recepcaoMatriculaCatalogue',
      'recepcaoMensalidadeCatalogue',
      'recepcaoPagamentoCatalogue',
      'recepcaoPlanoCatalogue',
    ],
  );
  assert.equal(byId.gerenciaMensalidadeCommand.kind, 'command');
  assert.equal(byId.gerenciaMensalidadeHub.kind, 'hub');
  assert.equal(byId.recepcaoPlanoCatalogue.kind, 'catalogue');
  assert.deepEqual(byId.gerenciaMensalidadeCommand.journeyRefs, ['gerarMensalidadesDoMes']);
  assert.deepEqual(byId.alunoMatriculaCatalogue.actorRef, 'aluno');
  assert.ok(sources.entities.some(entity => entity.entityId === 'IndicadoresAcademia' && entity.storageKind === 'timeSeries'));
});

void test('accepted mensalidadesAcademia draft passes the gate', () => {
  const sources = loadSources(FIXTURE_ROOT);
  const draft = loadDraft();
  const gate = validateP2Workspaces(draft, sources);
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.equal(draft.schemaVersion, P2_WORKSPACES_SCHEMA_VERSION);
  assert.equal(draft.workspaces.length, 5);
  assert.deepEqual(
    draft.workspaces.map(workspace => `${workspace.workspaceId}:${workspace.kind}`).sort(),
    [
      'cancelarPropriaMatricula:catalogue',
      'gerarMensalidadesDoMes:command',
      'indicadoresAcademiaHub:hub',
      'matriculaCatalogue:catalogue',
      'mensalidadeCatalogue:catalogue',
    ],
  );
});

void test('gate rejects unknown refs, split journeys and invented kind', () => {
  const sources = loadSources(FIXTURE_ROOT);
  const draft = loadDraft();
  const cloned = structuredClone(draft) as P2WorkspacesDraft;

  cloned.workspaces[0].entityRef = 'Inexistente';
  assert.ok(validateP2Workspaces(cloned, sources).issues.some(issue => issue.code === 'P2_WORKSPACE_ENTITY_UNKNOWN'));

  const split = structuredClone(draft) as P2WorkspacesDraft;
  split.workspaces[1].journeyRefs = ['matricularAluno'];
  assert.ok(validateP2Workspaces(split, sources).issues.some(issue => issue.code === 'P2_WORKSPACE_JOURNEY_DUP'));

  const missing = structuredClone(draft) as P2WorkspacesDraft;
  missing.workspaces = missing.workspaces.filter(workspace => workspace.workspaceId !== 'gerarMensalidadesDoMes');
  assert.ok(validateP2Workspaces(missing, sources).issues.some(issue => issue.code === 'P2_WORKSPACE_JOURNEY_MISSING'));

  const command = structuredClone(draft) as P2WorkspacesDraft;
  const cancel = command.workspaces.find(workspace => workspace.workspaceId === 'cancelarPropriaMatricula')!;
  cancel.kind = 'command';
  assert.ok(validateP2Workspaces(command, sources).issues.some(issue => issue.code === 'P2_WORKSPACE_KIND_CANDIDATE'));

  const invented = structuredClone(draft) as P2WorkspacesDraft;
  invented.workspaces[0].actorRefs = ['fantasma'];
  assert.ok(validateP2Workspaces(invented, sources).issues.some(issue => issue.code === 'P2_WORKSPACE_ACTOR_UNKNOWN'));
});

void test('workspaces20 tool schema is provider-clean and has no optional single-value fields', () => {
  const schema = loadSchema();
  const tool = buildP2WorkspacesTool(schema);
  assert.equal(tool.function.name, 'submitP2Workspaces');
  assert.equal(lintToolSchema(JSON.stringify(tool.function.parameters)), null);
  assert.deepEqual(requiredIncludesAllProperties(schema), []);
  assert.deepEqual(requiredIncludesAllProperties(tool.function.parameters), []);
});

void test('createAgent registers workspaces20 on the dispatch table', () => {
  createAgent();
  assert.equal(P2_STEP_HOOKS.workspaces20?.beforePromptStep, beforeP2WorkspacesPromptStep);
  assert.equal(ownerStepId('workspaces20-repair-1'), 'workspaces20');
});

void test('beforePromptStep emits prompt_ready with candidates and the strict tool', async () => {
  const host = installHost();
  seedAgentFiles(host);
  seedL4(host, FIXTURE_ROOT);
  seedPipeline(host);
  const step = workspacesStep();
  const intents = await beforeP2WorkspacesPromptStep(agentMeta(), contextWith(step), step, step, 1);
  assert.equal(intents.length, 1);
  assert.equal(intents[0].type, 'prompt_ready');
  const ready = intents[0] as mls.msg.AgentIntentPromptReady;
  assert.match(String(ready.humanPrompt || ''), /gerenciaMensalidadeCommand/);
  assert.match(String(ready.humanPrompt || ''), /gerenciaMensalidadeHub/);
  assert.equal(ready.tools?.[0]?.function.name, 'submitP2Workspaces');
  assert.match(String(ready.systemPrompt || ''), /submitP2Workspaces/);
});

void test('afterPromptStep schedules repair when the gate fails', async () => {
  const host = installHost();
  seedAgentFiles(host);
  seedL4(host, FIXTURE_ROOT);
  seedPipeline(host);
  const step = workspacesStep();
  const bad = {
    type: 'flexible',
    result: {
      schemaVersion: P2_WORKSPACES_SCHEMA_VERSION,
      workspaces: [{
        workspaceId: 'onlyOne',
        title: 'Only',
        kind: 'catalogue',
        entityRef: 'Matricula',
        actorRefs: ['recepcao'],
        journeyRefs: ['matricularAluno'],
        stepRefs: ['criarMatricula'],
      }],
    },
  };
  const intents = await afterP2WorkspacesPromptStep(agentMeta(), contextWith(step, bad), step, step, 1);
  const add = intents.find(intent => intent.type === 'add-step') as mls.msg.AgentIntentAddStep | undefined;
  assert.ok(add, `intents: ${intents.map(intent => intent.type).join(',')}`);
  assert.equal((add.step as mls.msg.AIAgentStep).planning?.planId, 'workspaces20-repair-1');
  const draft = host.files[keyOf(p2DraftFile(MODULE, 'workspaces20'))];
  assert.ok(draft, 'gate failure still writes the draft');
});

void test('afterPromptStep approves the accepted draft and writes the l2 artifact', async () => {
  const host = installHost();
  seedAgentFiles(host);
  seedL4(host, FIXTURE_ROOT);
  seedPipeline(host);
  const step = workspacesStep();
  const payload = { type: 'flexible', result: loadDraft() };
  const intents = await afterP2WorkspacesPromptStep(agentMeta(), contextWith(step, payload), step, step, 1);
  assert.ok(intents.some(intent => intent.type === 'add-step' && (intent as mls.msg.AgentIntentAddStep).step.planning?.planId === 'workspaces20-done'));
  const status = intents.find(intent => intent.type === 'update-status') as mls.msg.AgentIntentUpdateStatus;
  assert.equal(status.status, 'completed');
  assert.match(String(status.traceMsg || ''), /workspaces20 approved/);
  const draftFile = host.files[keyOf(p2DraftFile(MODULE, 'workspaces20'))];
  const written = JSON.parse(draftFile.content) as P2WorkspacesDraft;
  assert.equal(written.workspaces.length, 5);
  const pipeline = JSON.parse(host.files[keyOf(p2PipelineFile(MODULE))].content) as { steps: { workspaces20: { status: string } } };
  assert.equal(pipeline.steps.workspaces20.status, 'approved');
});

void test('isolated workspaces20 on mensalidadesAcademia l4 records the candidate cut', () => {
  const sources = loadSources(existsSync(REAL_ROOT) ? REAL_ROOT : FIXTURE_ROOT);
  const candidates = collectP2WorkspaceCandidates(sources);
  const draft = normalizeP2WorkspacesPayload(loadDraft(), MODULE);
  const gate = validateP2Workspaces(draft, sources);
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.equal(candidates.length, 8);
  assert.equal(draft.workspaces.length, 5);
  const human = buildP2WorkspacesHumanPrompt({ sources });
  assert.match(human, /## Candidates/);
  assert.equal(liveTestsEnabled(), false);
});
