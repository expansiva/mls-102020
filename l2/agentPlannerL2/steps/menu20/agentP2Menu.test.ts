/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/menu20/agentP2Menu.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { createAgent } from '/_102020_/l2/agentPlannerL2/agentPlannerL2.js';
import { P2_STEP_HOOKS } from '/_102020_/l2/agentPlannerL2/helpers/p2Dispatch.js';
import { ownerStepId, p2DraftFile, p2MenuFile, p2PipelineFile } from '/_102020_/l2/agentPlannerL2/helpers/p2Core.js';
import {
  afterP2MenuPromptStep,
  beforeP2MenuPromptStep,
  buildP2MenuHumanPrompt,
} from '/_102020_/l2/agentPlannerL2/steps/menu20/agentP2Menu.js';
import {
  P2_MENU_SCHEMA_VERSION,
  buildP2MenuFile,
  buildP2MenuTool,
  normalizeP2MenuPayload,
  parseP2Grants,
  parseP2Processes,
  type P2MenuDraft,
} from '/_102020_/l2/agentPlannerL2/steps/menu20/contracts.js';
import { validateP2Menu } from '/_102020_/l2/agentPlannerL2/steps/menu20/gate.js';
import {
  parseP2L4Sources,
  type P2L4Sources,
} from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const L4_FIXTURE = path.join(HERE, '../workspaces20/fixtures/mensalidadesAcademia');
const WORKFLOWS_FIXTURE = path.join(HERE, 'fixtures/workflows.defs.ts');
const REAL_WORKFLOWS = path.resolve(HERE, '../../../../../mls-102047/l4/mensalidadesAcademia/workflows.defs.ts');
const DRAFT_PATH = path.join(HERE, 'fixtures/menu20-draft.json');
const SCHEMA_PATH = path.join(HERE, '../../schemas/menu.schema.json');
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

function loadSources(): { sources: P2L4Sources; grants: ReturnType<typeof parseP2Grants>; processes: ReturnType<typeof parseP2Processes> } {
  const journeyDir = path.join(L4_FIXTURE, 'journeys');
  const ontologyDir = path.join(L4_FIXTURE, 'ontology');
  const journeys = readdirSync(journeyDir)
    .filter(name => name.endsWith('.defs.ts') && name !== 'index.defs.ts')
    .sort()
    .map(name => readDefs(L4_FIXTURE, `journeys/${name}`));
  const ontologyEntities = readdirSync(ontologyDir)
    .filter(name => name.endsWith('.defs.ts') && name !== 'index.defs.ts')
    .sort()
    .map(name => readDefs(L4_FIXTURE, `ontology/${name}`));
  const moduleArtifact = readDefs(L4_FIXTURE, 'module.defs.ts') as { userLanguage?: string; moduleName?: string };
  const access = readDefs(L4_FIXTURE, 'access.defs.ts');
  const workflows = extractDefsJson(readFileSync(WORKFLOWS_FIXTURE, 'utf8'));
  return {
    sources: parseP2L4Sources({
      moduleName: moduleArtifact.moduleName,
      userLanguage: moduleArtifact.userLanguage,
      journeyIndex: readDefs(L4_FIXTURE, 'journeys/index.defs.ts'),
      journeys,
      access,
      ontologyIndex: readDefs(L4_FIXTURE, 'ontology/index.defs.ts'),
      ontologyEntities,
    }),
    grants: parseP2Grants(access),
    processes: parseP2Processes(workflows),
  };
}

function loadDraft(): P2MenuDraft {
  return JSON.parse(readFileSync(DRAFT_PATH, 'utf8')) as P2MenuDraft;
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
type Host = { files: Record<string, Stored>; deleted: string[] };

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
  const host: Host = { files: {}, deleted: [] };
  (globalThis as unknown as Record<string, unknown>).mls = {
    actualProject: PROJECT,
    events: { addEventListener() {}, removeEventListener() {}, dispatch() {} },
    stor: {
      files: host.files,
      getKeyToFile: keyOf,
      localStor: {
        setContent: async (file: Stored, value: { content: string }) => { file.content = value.content; },
        listFolder: () => [],
        deleteFile: (file: { folder: string; shortName: string; extension?: string }) => {
          host.deleted.push(`${file.folder}/${file.shortName}`);
          const key = keyOf({ project: PROJECT, level: 2, folder: file.folder, shortName: file.shortName, extension: file.extension || '.json' });
          const stored = host.files[key];
          if (stored) stored.status = 'deleted';
        },
      },
    },
  };
  return host;
}

function seedAgentFiles(host: Host): void {
  seed(host, {
    project: 102020, level: 2, folder: 'agentPlannerL2/skills', shortName: 'menu', extension: '.md',
    content: readFileSync(path.join(HERE, '../../skills/menu.md'), 'utf8'),
  });
  seed(host, {
    project: 102020, level: 2, folder: 'agentPlannerL2/steps/menu20', shortName: 'prompt', extension: '.md',
    content: readFileSync(path.join(HERE, 'prompt.md'), 'utf8'),
  });
  seed(host, {
    project: 102020, level: 2, folder: 'agentPlannerL2/schemas', shortName: 'menu.schema', extension: '.json',
    content: readFileSync(SCHEMA_PATH, 'utf8'),
  });
}

function seedL4(host: Host): void {
  const put = (folder: string, shortName: string, rel: string, extension = '.defs.ts', root = L4_FIXTURE) => {
    seed(host, { folder, shortName, extension, content: readFileSync(path.join(root, rel), 'utf8') });
  };
  put(MODULE, 'module', 'module.defs.ts');
  put(MODULE, 'access', 'access.defs.ts');
  put(MODULE, 'workflows', 'workflows.defs.ts', '.defs.ts', path.dirname(WORKFLOWS_FIXTURE));
  put(`${MODULE}/journeys`, 'index', 'journeys/index.defs.ts');
  for (const name of readdirSync(path.join(L4_FIXTURE, 'journeys')).filter(item => item.endsWith('.defs.ts') && item !== 'index.defs.ts')) {
    put(`${MODULE}/journeys`, name.replace(/\.defs\.ts$/, ''), `journeys/${name}`);
  }
  put(`${MODULE}/ontology`, 'index', 'ontology/index.defs.ts');
  for (const name of readdirSync(path.join(L4_FIXTURE, 'ontology')).filter(item => item.endsWith('.defs.ts') && item !== 'index.defs.ts')) {
    put(`${MODULE}/ontology`, name.replace(/\.defs\.ts$/, ''), `ontology/${name}`);
  }
}

function seedPipeline(host: Host, extra: Record<string, unknown> = {}): void {
  const pipeline = {
    schemaVersion: '2026-09-18-p2-pipeline-v2',
    flowId: 'agentPlannerL2',
    moduleName: MODULE,
    status: 'inProgress',
    steps: { entry10: { status: 'approved', updatedAt: '2026-09-18T10:30:00.000Z' } },
    thread: 'mensalidadesAcademia-20260918201156',
    round: 1,
    messageFile: 'l4/mensalidadesAcademia/pool/l2/20260918201156_mensalidadesAcademia-20260918201156_1.json',
    sourceMessages: ['20260918201156_mensalidadesAcademia-20260918201156_1.json'],
    webDir: 'empty-left: deleteFile does not remove directories',
    updatedAt: '2026-09-18T10:30:00.000Z',
    ...extra,
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
    shortName: 'menu20-draft',
    extension: '.json',
    content: '{}\n',
  });
  seed(host, {
    folder: `${MODULE}/pool/l2`,
    shortName: 'menu',
    extension: '.json',
    content: '',
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

function menuStep(): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId: 20,
    interaction: null,
    stepTitle: 'Menu',
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: 'agentPlannerL2',
    prompt: JSON.stringify({ planId: 'menu20', moduleName: MODULE, thread: 't', file: 'f' }),
    rags: [],
    planning: { planId: 'menu20', dependsOn: ['entry10-done'], executionMode: 'sequential', executionHost: 'client' },
  };
}

void test('workflows fixture is a byte-for-byte copy of the l4', () => {
  assert.equal(existsSync(REAL_WORKFLOWS), true, `missing ${REAL_WORKFLOWS}`);
  assert.equal(
    Buffer.compare(readFileSync(WORKFLOWS_FIXTURE), readFileSync(REAL_WORKFLOWS)),
    0,
  );
});

void test('accepted mensalidadesAcademia menu draft passes the gate', () => {
  const loaded = loadSources();
  const draft = normalizeP2MenuPayload(loadDraft());
  const gate = validateP2Menu(draft, loaded.sources, loaded.processes);
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.equal(draft.workflows.length, 0);
  const cited = new Set(draft.menu.flatMap(entry => entry.items.flatMap(item => item.origins.journeys)));
  for (const journey of loaded.sources.journeys) {
    assert.ok(cited.has(journey.journeyId), `missing journey ${journey.journeyId}`);
  }
});

void test('gate rejects unknown refs, missing placeRef and duplicate itemId; unused journey is a warning', () => {
  const loaded = loadSources();
  const draft = structuredClone(normalizeP2MenuPayload(loadDraft()));

  draft.menu[0].actorRef = 'fantasma';
  assert.ok(validateP2Menu(draft, loaded.sources, loaded.processes).issues.some(issue => issue.code === 'P2_MENU_ACTOR_UNKNOWN'));

  const place = structuredClone(normalizeP2MenuPayload(loadDraft()));
  const action = place.menu[1].items.find(item => item.kind === 'action')!;
  action.placeRef = 'inexistente';
  assert.ok(validateP2Menu(place, loaded.sources, loaded.processes).issues.some(issue => issue.code === 'P2_MENU_PLACE_REF_UNKNOWN'));

  const missingPlace = structuredClone(normalizeP2MenuPayload(loadDraft()));
  const action2 = missingPlace.menu[1].items.find(item => item.kind === 'action')!;
  delete action2.placeRef;
  assert.ok(validateP2Menu(missingPlace, loaded.sources, loaded.processes).issues.some(issue => issue.code === 'P2_MENU_PLACE_REF'));

  const dup = structuredClone(normalizeP2MenuPayload(loadDraft()));
  dup.menu[0].items[1].itemId = dup.menu[0].items[0].itemId;
  assert.ok(validateP2Menu(dup, loaded.sources, loaded.processes).issues.some(issue => issue.code === 'P2_MENU_ITEM_ID_DUPLICATE'));

  const unknownJourney = structuredClone(normalizeP2MenuPayload(loadDraft()));
  unknownJourney.menu[0].items[0].origins.journeys = ['jornadaFantasma'];
  assert.ok(validateP2Menu(unknownJourney, loaded.sources, loaded.processes).issues.some(issue => issue.code === 'P2_MENU_JOURNEY_UNKNOWN'));

  const unused = structuredClone(normalizeP2MenuPayload(loadDraft()));
  unused.menu[2].items[0].origins.journeys = [];
  const unusedGate = validateP2Menu(unused, loaded.sources, loaded.processes);
  assert.equal(unusedGate.ok, true);
  assert.ok(unusedGate.issues.some(issue => issue.severity === 'warning' && issue.code === 'P2_MENU_JOURNEY_UNUSED'));
});

void test('menu20 tool schema is provider-clean and has no optional single-value fields', () => {
  const schema = loadSchema();
  const tool = buildP2MenuTool(schema);
  assert.equal(tool.function.name, 'submitP2Menu');
  assert.equal(lintToolSchema(JSON.stringify(tool.function.parameters)), null);
  assert.deepEqual(requiredIncludesAllProperties(schema), []);
  assert.deepEqual(requiredIncludesAllProperties(tool.function.parameters), []);
});

void test('createAgent registers menu20 on the dispatch table', () => {
  createAgent();
  assert.equal(P2_STEP_HOOKS.menu20?.beforePromptStep, beforeP2MenuPromptStep);
  assert.equal(ownerStepId('menu20-repair-1'), 'menu20');
});

void test('beforePromptStep emits prompt_ready with candidates labelled as not the answer', async () => {
  const host = installHost();
  seedAgentFiles(host);
  seedL4(host);
  seedPipeline(host);
  const step = menuStep();
  const intents = await beforeP2MenuPromptStep(agentMeta(), contextWith(step), step, step, 1);
  assert.equal(intents.length, 1);
  assert.equal(intents[0].type, 'prompt_ready');
  const ready = intents[0] as mls.msg.AgentIntentPromptReady;
  assert.match(String(ready.humanPrompt || ''), /candidates, not the answer/);
  assert.match(String(ready.humanPrompt || ''), /gerenciaMensalidadeCommand/);
  assert.match(String(ready.systemPrompt || ''), /submitP2Menu/);
  assert.equal(ready.tools?.[0]?.function.name, 'submitP2Menu');
  assert.doesNotMatch(String(ready.systemPrompt || ''), /Matrículas/);
  assert.doesNotMatch(String(ready.systemPrompt || ''), /recepcao/);
});

void test('afterPromptStep schedules repair when the gate fails', async () => {
  const host = installHost();
  seedAgentFiles(host);
  seedL4(host);
  seedPipeline(host);
  const step = menuStep();
  const bad = {
    type: 'flexible',
    result: {
      menu: [{
        actorRef: 'recepcao',
        items: [{
          itemId: 'onlyOne',
          kind: 'action',
          label: 'Only',
          placeRef: '',
          origins: { journeys: ['matricularAluno'], entities: ['Matricula'], processes: [] },
          description: 'Broken action without a place.',
        }],
      }],
      workflows: [],
    },
  };
  const intents = await afterP2MenuPromptStep(agentMeta(), contextWith(step, bad), step, step, 1);
  const add = intents.find(intent => intent.type === 'add-step') as mls.msg.AgentIntentAddStep | undefined;
  assert.ok(add, `intents: ${intents.map(intent => intent.type).join(',')}`);
  assert.equal((add.step as mls.msg.AIAgentStep).planning?.planId, 'menu20-repair-1');
  const draft = host.files[keyOf(p2DraftFile(MODULE, 'menu20'))];
  assert.ok(draft, 'gate failure still writes the draft');
  assert.notEqual(draft.content.trim(), '');
  assert.equal(host.files[keyOf(p2MenuFile(MODULE))].content, '');
  assert.equal(JSON.parse(host.files[keyOf(p2PipelineFile(MODULE))].content).status, 'inProgress');
});

void test('afterPromptStep approves the draft, overwrites menu.json and leaves pool messages', async () => {
  const host = installHost();
  seedAgentFiles(host);
  seedL4(host);
  seedPipeline(host);
  const poolShort = '20260918201156_mensalidadesAcademia-20260918201156_1';
  const poolContent = readFileSync(path.join(HERE, '../entry10/fixtures/pool-l2-20260918201156.json'), 'utf8');
  seed(host, {
    folder: `${MODULE}/pool/l2`,
    shortName: poolShort,
    extension: '.json',
    content: poolContent,
  });
  host.files[keyOf(p2MenuFile(MODULE))].content = '{"stale":true}\n';
  const step = menuStep();
  const payload = { type: 'flexible', result: loadDraft() };
  const first = await afterP2MenuPromptStep(agentMeta(), contextWith(step, payload), step, step, 1);
  assert.ok(first.some(intent => intent.type === 'add-step' && (intent as mls.msg.AgentIntentAddStep).step.planning?.planId === 'menu20-done'));
  const firstWritten = JSON.parse(host.files[keyOf(p2MenuFile(MODULE))].content) as { generatedAt: string; sourceMessages: string[] };
  assert.equal(firstWritten.sourceMessages[0], '20260918201156_mensalidadesAcademia-20260918201156_1.json');
  const approved = JSON.parse(host.files[keyOf(p2PipelineFile(MODULE))].content) as { status: string; steps: { menu20: { status: string }; entry10: { status: string } } };
  assert.equal(approved.steps.entry10.status, 'approved');
  assert.equal(approved.steps.menu20.status, 'approved');
  assert.equal(approved.status, 'complete');

  const step2 = menuStep();
  const again = await afterP2MenuPromptStep(agentMeta(), contextWith(step2, payload), step2, step2, 1);
  assert.ok(again.some(intent => intent.type === 'add-step' && (intent as mls.msg.AgentIntentAddStep).step.planning?.planId === 'menu20-done'));
  const secondWritten = JSON.parse(host.files[keyOf(p2MenuFile(MODULE))].content) as { generatedAt: string; schemaVersion: string; workflows: unknown[]; sourceMessages: string[]; menu: unknown[] };
  assert.equal(secondWritten.schemaVersion, P2_MENU_SCHEMA_VERSION);
  assert.deepEqual(secondWritten.workflows, []);
  assert.equal(host.files[keyOf({ project: PROJECT, level: 4, folder: `${MODULE}/pool/l2`, shortName: poolShort, extension: '.json' })].content, poolContent);
  assert.ok(Array.isArray((secondWritten as { menu?: unknown }).menu));
  assert.notEqual(host.files[keyOf(p2MenuFile(MODULE))].content, '{"stale":true}\n');
  assert.equal(firstWritten.sourceMessages[0], secondWritten.sourceMessages[0]);
});

void test('human prompt carries journeys, grants, processes and candidates', () => {
  const loaded = loadSources();
  const human = buildP2MenuHumanPrompt({ menuSources: { sources: loaded.sources, grants: loaded.grants, processes: loaded.processes } });
  assert.match(human, /## Candidates \(deterministic; candidates, not the answer\)/);
  assert.match(human, /matricularAluno/);
  assert.match(human, /lembrarGeracaoMensalidades/);
  assert.match(human, /goal:/);
  assert.ok(loaded.grants.length > 0);
});

void test('buildP2MenuFile fills the envelope from code, not the model', () => {
  const draft = normalizeP2MenuPayload(loadDraft());
  const file = buildP2MenuFile({
    moduleName: MODULE,
    userLanguage: 'pt-BR',
    sourceMessages: ['a.json', 'b.json'],
    generatedAt: '2026-09-18T20:00:00.000Z',
    draft,
  });
  assert.equal(file.schemaVersion, P2_MENU_SCHEMA_VERSION);
  assert.deepEqual(file.sourceMessages, ['a.json', 'b.json']);
  assert.equal(file.userLanguage, 'pt-BR');
  assert.deepEqual(file.workflows, []);
});
