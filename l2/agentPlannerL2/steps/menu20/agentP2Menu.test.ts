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
import {
  P2_MENU_DEVICE,
  P2_PREVIOUS_MENU_NONE,
  ownerStepId,
  p2DraftFile,
  p2LegacyMenuFile,
  p2MenuFile,
  p2PipelineFile,
} from '/_102020_/l2/agentPlannerL2/helpers/p2Core.js';
import {
  afterP2MenuPromptStep,
  beforeP2MenuPromptStep,
  buildP2MenuHumanPrompt,
} from '/_102020_/l2/agentPlannerL2/steps/menu20/agentP2Menu.js';
import {
  P2_MENU_SCHEMA_VERSION,
  buildP2MenuFile,
  buildP2MenuTool,
  collectRecordsMaintained,
  menuActionCounts,
  menuCandidates,
  normalizeMenuV2,
  parseP2Grants,
  parseP2Processes,
  parsePreviousMenuTree,
  type MenuPageNode,
  type MenuStampedNode,
  type MenuV2,
} from '/_102020_/l2/agentPlannerL2/steps/menu20/contracts.js';
import { validateP2Menu } from '/_102020_/l2/agentPlannerL2/steps/menu20/gate.js';
import {
  parseP2L4Sources,
  type P2L4Sources,
} from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const L4_FIXTURE = path.join(HERE, '../workspaces20/fixtures/mensalidadesAcademia');
const WORKFLOWS_FIXTURE = path.join(HERE, 'fixtures/workflows.defs.ts');
const HIRING_FIXTURE = path.join(HERE, 'fixtures/hiringPipeline');
const COMPRAS_FIXTURE = path.join(HERE, 'fixtures/compras');
const LOCACAO_FIXTURE = path.join(HERE, 'fixtures/locacaoEquipamentos');
const REAL_L4 = path.resolve(HERE, '../../../../../mls-102047/l4');
const REAL_WORKFLOWS = path.join(REAL_L4, 'mensalidadesAcademia/workflows.defs.ts');
const DRAFT_PATH = path.join(HERE, 'fixtures/menu20-draft.json');
const HIRING_DRAFT_PATH = path.join(HERE, 'fixtures/hiringPipeline-draft.json');
const COMPRAS_DRAFT_PATH = path.join(HERE, 'fixtures/compras-draft.json');
const CANDIDATES_PATH = path.join(HERE, 'fixtures/candidates.json');
const SCHEMA_PATH = path.join(HERE, '../../schemas/menu.schema.json');
const PREVIOUS_COMPRAS_PATH = path.join(HERE, 'fixtures/previous-compras.json');
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

function loadModuleSources(root: string, workflowsPath = path.join(root, 'workflows.defs.ts')): {
  sources: P2L4Sources;
  grants: ReturnType<typeof parseP2Grants>;
  processes: ReturnType<typeof parseP2Processes>;
} {
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
  const access = readDefs(root, 'access.defs.ts');
  const workflows = extractDefsJson(readFileSync(workflowsPath, 'utf8'));
  return {
    sources: parseP2L4Sources({
      moduleName: moduleArtifact.moduleName,
      userLanguage: moduleArtifact.userLanguage,
      journeyIndex: readDefs(root, 'journeys/index.defs.ts'),
      journeys,
      access,
      ontologyIndex: readDefs(root, 'ontology/index.defs.ts'),
      ontologyEntities,
    }),
    grants: parseP2Grants(access),
    processes: parseP2Processes(workflows),
  };
}

function loadSources(): ReturnType<typeof loadModuleSources> {
  return loadModuleSources(L4_FIXTURE, WORKFLOWS_FIXTURE);
}

function loadAccessOntology(root: string): {
  sources: P2L4Sources;
  grants: ReturnType<typeof parseP2Grants>;
} {
  const ontologyDir = path.join(root, 'ontology');
  const ontologyEntities = readdirSync(ontologyDir)
    .filter(name => name.endsWith('.defs.ts') && name !== 'index.defs.ts')
    .sort()
    .map(name => readDefs(root, `ontology/${name}`));
  const moduleArtifact = readDefs(root, 'module.defs.ts') as { userLanguage?: string; moduleName?: string };
  const access = readDefs(root, 'access.defs.ts');
  return {
    sources: parseP2L4Sources({
      moduleName: moduleArtifact.moduleName,
      userLanguage: moduleArtifact.userLanguage,
      journeyIndex: { journeys: [] },
      journeys: [],
      access,
      ontologyIndex: readDefs(root, 'ontology/index.defs.ts'),
      ontologyEntities,
    }),
    grants: parseP2Grants(access),
  };
}

function loadDraft(): unknown {
  return JSON.parse(readFileSync(DRAFT_PATH, 'utf8'));
}

function loadSchema(): Record<string, unknown> {
  return JSON.parse(readFileSync(SCHEMA_PATH, 'utf8')) as Record<string, unknown>;
}

function collectActions(nodes: readonly MenuStampedNode[]): string[] {
  const out: string[] = [];
  const walk = (list: readonly MenuStampedNode[]) => {
    for (const node of list) {
      out.push(node.action);
      if (node.kind === 'hub' || node.kind === 'group') walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

function firstPage(draft: MenuV2): MenuPageNode {
  const hub = draft.tree[0];
  assert.equal(hub.kind, 'hub');
  if (hub.kind !== 'hub') throw new Error('expected hub');
  const page = hub.children[0];
  assert.equal(page.kind, 'page');
  if (page.kind !== 'page') throw new Error('expected page');
  return page;
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
    if (Array.isArray(record.oneOf)) record.oneOf.forEach((item, index) => walk(item, `${at}.oneOf[${index}]`));
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
        deleteFile: (file: Stored) => {
          host.deleted.push(`${file.folder}/${file.shortName}`);
          const stored = host.files[keyOf(file)];
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
    folder: `${MODULE}/pool/l2/${P2_MENU_DEVICE}`,
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

void test('l4 fixtures are byte-for-byte copies of the real modules', () => {
  assert.equal(existsSync(REAL_WORKFLOWS), true, `missing ${REAL_WORKFLOWS}`);
  assert.equal(Buffer.compare(readFileSync(WORKFLOWS_FIXTURE), readFileSync(REAL_WORKFLOWS)), 0);
  const full = ['hiringPipeline', 'compras', 'locacaoEquipamentos'] as const;
  const accessOntology = [
    'agendaClinica', 'comandaRestaurante', 'controleEstoque', 'financeiro',
    'inscricaoEvento', 'manutencaoFrota', 'ordenServicio', 'reembolsoDespesas',
  ] as const;
  for (const mod of [...full, ...accessOntology]) {
    const fixtureRoot = path.join(HERE, 'fixtures', mod);
    const realRoot = path.join(REAL_L4, mod);
    const walk = (dir: string, rel = ''): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
      const next = path.join(rel, entry.name);
      return entry.isDirectory() ? walk(path.join(dir, entry.name), next) : [next];
    });
    for (const rel of walk(fixtureRoot)) {
      const a = path.join(fixtureRoot, rel);
      const b = path.join(realRoot, rel);
      assert.equal(existsSync(b), true, `missing ${b}`);
      assert.equal(Buffer.compare(readFileSync(a), readFileSync(b)), 0, `${mod}/${rel}`);
    }
  }
});

void test('normalizeMenuV2 accepts the mensalidadesAcademia v2 fixture', () => {
  const draft = normalizeMenuV2(loadDraft());
  assert.equal(draft.tree[0].kind, 'hub');
  assert.equal(draft.tree[0].id, 'aluno');
  assert.deepEqual(Object.keys(draft.authorities), ['actor:recepcao', 'actor:gerencia', 'actor:aluno']);
  assert.deepEqual(draft.meta.processes.lembrarGeracaoMensalidades, ['painel', 'mensalidades_mes']);
  const painel = draft.tree.find(node => node.id === 'painel');
  assert.equal(painel?.kind, 'page');
  if (painel?.kind === 'page') {
    assert.ok(painel.organisms.some(organism => organism.kind === 'alerts'));
  }
});

void test('normalizeMenuV2 rejects each shape violation', () => {
  const valid = loadDraft() as Record<string, unknown>;
  const page = (((valid.tree as unknown[])[0] as Record<string, unknown>).children as unknown[])[0] as Record<string, unknown>;

  assert.throws(() => normalizeMenuV2({ ...valid, extra: true }), /unexpected field 'extra'/);

  const withText = { ...page, text: 'no' };
  const treeText = structuredClone(valid);
  (((treeText.tree as unknown[])[0] as Record<string, unknown>).children as unknown[])[0] = withText;
  assert.throws(() => normalizeMenuV2(treeText), /unexpected field 'text'/);

  const withChildren = { ...page, children: [] };
  const treeChildren = structuredClone(valid);
  (((treeChildren.tree as unknown[])[0] as Record<string, unknown>).children as unknown[])[0] = withChildren;
  assert.throws(() => normalizeMenuV2(treeChildren), /unexpected field 'children'/);

  const hub = (valid.tree as unknown[])[0] as Record<string, unknown>;
  const hubOrganisms = { ...hub, organisms: [] };
  const treeOrg = structuredClone(valid);
  (treeOrg.tree as unknown[])[0] = hubOrganisms;
  assert.throws(() => normalizeMenuV2(treeOrg), /unexpected field 'organisms'/);

  const withContext = { ...page, context: 'Aluno' };
  const treeContext = structuredClone(valid);
  (((treeContext.tree as unknown[])[0] as Record<string, unknown>).children as unknown[])[0] = withContext;
  assert.throws(() => normalizeMenuV2(treeContext), /unexpected field 'context'/);

  const badKind = structuredClone(valid);
  ((badKind.tree as unknown[])[0] as Record<string, unknown>).kind = 'place';
  assert.throws(() => normalizeMenuV2(badKind), /must be hub, page or group/);

  const emptyOrg = structuredClone(valid);
  const emptyPage = (((emptyOrg.tree as unknown[])[0] as Record<string, unknown>).children as unknown[])[0] as Record<string, unknown>;
  (emptyPage.organisms as Record<string, unknown>[])[0] = { kind: 'detail', text: '' };
  assert.throws(() => normalizeMenuV2(emptyOrg), /must be a non-empty string/);

  const missing = { ...page };
  delete missing.organisms;
  const treeMissing = structuredClone(valid);
  (((treeMissing.tree as unknown[])[0] as Record<string, unknown>).children as unknown[])[0] = missing;
  assert.throws(() => normalizeMenuV2(treeMissing), /missing field 'organisms'/);

  const withAction = { ...page, action: 'new' };
  const treeAction = structuredClone(valid);
  (((treeAction.tree as unknown[])[0] as Record<string, unknown>).children as unknown[])[0] = withAction;
  assert.throws(() => normalizeMenuV2(treeAction), /unexpected field 'action'/);

  const camel = structuredClone(valid);
  ((camel.tree as unknown[])[0] as Record<string, unknown>).id = 'alunoHub';
  assert.throws(() => normalizeMenuV2(camel), /must be snake_case/);

  const badProcess = structuredClone(valid);
  (badProcess.meta as Record<string, unknown>).processes = { 'Lembrar': [] };
  assert.throws(() => normalizeMenuV2(badProcess), /must be lowerCamel/);
});

void test('normalizeMenuV2 accepts the tool array form of authorities and journeys', () => {
  const objectForm = normalizeMenuV2(loadDraft());
  const arrayForm = normalizeMenuV2({
    tree: objectForm.tree,
    authorities: [
      { actorRef: 'recepcao', nodes: ['aluno', 'mensalidades_mes'] },
      { actorRef: 'gerencia', nodes: ['painel', 'mensalidades_mes', 'aluno'] },
      { actorRef: 'aluno', nodes: ['aluno'] },
    ],
    meta: {
      journeys: [
        { journeyId: 'matricularAluno', pages: ['matricula_aluno'] },
        { journeyId: 'registrarPagamentoMensalidade', pages: ['mensalidades_aluno'] },
        { journeyId: 'gerarMensalidadesDoMes', pages: ['mensalidades_mes'] },
        { journeyId: 'acompanharIndicadoresAcademia', pages: ['painel'] },
        { journeyId: 'cancelarPropriaMatricula', pages: ['matricula_aluno'] },
      ],
      processes: [
        { processId: 'lembrarGeracaoMensalidades', pages: ['painel', 'mensalidades_mes'] },
      ],
      entities: [
        { entityId: 'Plano', pages: ['matricula_aluno'] },
      ],
    },
  });
  assert.deepEqual(arrayForm, objectForm);
});

void test('menuCandidates from the mensalidadesAcademia l4 fixture is byte-for-byte the golden file', () => {
  const loaded = loadSources();
  const got = menuCandidates(loaded.sources, loaded.grants, loaded.processes);
  const serialized = `${JSON.stringify({ hubs: got.hubs, pages: got.pages }, null, 2)}\n`;
  assert.equal(serialized, readFileSync(CANDIDATES_PATH, 'utf8'));
  assert.deepEqual(got.hubs, [{ entityRef: 'Aluno', actorRefs: ['aluno'] }]);
  assert.ok(got.pages.some(page => page.candidateId === 'gerenciaMensalidadeCommand'));
});

void test('accepted mensalidadesAcademia menu draft passes the gate', () => {
  const loaded = loadSources();
  const draft = normalizeMenuV2(loadDraft());
  const gate = validateP2Menu(draft, loaded);
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.deepEqual(gate.issues.filter(issue => issue.severity === 'warning'), []);
  assert.ok(draft.meta.processes.lembrarGeracaoMensalidades.length > 0);
  for (const journey of loaded.sources.journeys) {
    assert.ok(Object.prototype.hasOwnProperty.call(draft.meta.journeys, journey.journeyId), `missing journey ${journey.journeyId}`);
    assert.ok(draft.meta.journeys[journey.journeyId].length > 0, `empty journey ${journey.journeyId}`);
  }
});

void test('gate rejects empty hub, duplicate id, unknown actor, unknown organism; unmapped journey is a warning', () => {
  const loaded = loadSources();

  const emptyHub = structuredClone(normalizeMenuV2(loadDraft()));
  assert.equal(emptyHub.tree[0].kind, 'hub');
  if (emptyHub.tree[0].kind === 'hub') emptyHub.tree[0].children = [];
  assert.ok(validateP2Menu(emptyHub, loaded).issues.some(issue => issue.code === 'P2_MENU_HUB_EMPTY'));

  const dup = structuredClone(normalizeMenuV2(loadDraft()));
  dup.tree[1].id = 'aluno';
  assert.ok(validateP2Menu(dup, loaded).issues.some(issue => issue.code === 'P2_MENU_ID_DUPLICATE'));

  const unknownActor = structuredClone(normalizeMenuV2(loadDraft()));
  unknownActor.authorities['actor:fantasma'] = ['painel'];
  assert.ok(validateP2Menu(unknownActor, loaded).issues.some(issue => issue.code === 'P2_MENU_ACTOR_UNKNOWN'));

  const badOrganism = structuredClone(normalizeMenuV2(loadDraft()));
  const page = firstPage(badOrganism);
  (page.organisms[0] as { kind: string }).kind = 'widget';
  assert.ok(validateP2Menu(badOrganism, loaded).issues.some(issue => issue.code === 'P2_MENU_ORGANISM_KIND'));

  const unused = structuredClone(normalizeMenuV2(loadDraft()));
  unused.meta.journeys.acompanharIndicadoresAcademia = [];
  const unusedGate = validateP2Menu(unused, loaded);
  assert.equal(unusedGate.ok, true);
  assert.ok(unusedGate.issues.some(issue => issue.severity === 'warning' && issue.code === 'P2_MENU_JOURNEY_UNMAPPED'));
});

void test('menu20 tool schema is provider-clean and has no optional single-value fields', () => {
  const schema = loadSchema();
  const tool = buildP2MenuTool(schema);
  assert.equal(tool.function.name, 'submitP2Menu');
  assert.equal(lintToolSchema(JSON.stringify(tool.function.parameters)), null);
  assert.deepEqual(requiredIncludesAllProperties(schema), []);
  assert.deepEqual(requiredIncludesAllProperties(tool.function.parameters), []);
  const defs = schema.$defs as Record<string, { properties?: Record<string, unknown> }>;
  const hasProp = (value: unknown, key: string): boolean => isRecord(value) && key in value;
  assert.equal(hasProp(defs.hubNode.properties, 'action'), false);
  assert.equal(hasProp(defs.pageNode.properties, 'action'), false);
  assert.equal(hasProp(defs.groupNode.properties, 'action'), false);
  assert.equal(hasProp(schema.properties, 'device'), false);
  assert.equal(hasProp(defs.meta.properties, 'removed'), false);
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
  assert.match(String(ready.humanPrompt || ''), /What this actor must see, beyond journeys/);
  assert.match(String(ready.humanPrompt || ''), /gerenciaMensalidadeCommand/);
  assert.match(String(ready.humanPrompt || ''), /"entityRef": "Aluno"/);
  assert.match(String(ready.systemPrompt || ''), /submitP2Menu/);
  assert.match(String(ready.systemPrompt || ''), /a record an actor maintains \(crud, granted\)/);
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
      tree: [{
        id: 'only',
        kind: 'hub',
        label: 'Only',
        context: 'Aluno',
        text: 'picks a student',
        children: [],
      }],
      authorities: { 'actor:recepcao': ['only'] },
      meta: { journeys: {}, processes: {}, entities: {} },
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
  const step = menuStep();
  const payload = { type: 'flexible', result: loadDraft() };
  const first = await afterP2MenuPromptStep(agentMeta(), contextWith(step, payload), step, step, 1);
  assert.ok(first.some(intent => intent.type === 'add-step' && (intent as mls.msg.AgentIntentAddStep).step.planning?.planId === 'menu20-done'));
  const firstWritten = JSON.parse(host.files[keyOf(p2MenuFile(MODULE))].content) as {
    schemaVersion: string;
    device: string;
    tree: MenuStampedNode[];
    meta: { removed: unknown[] };
  };
  assert.equal(firstWritten.schemaVersion, P2_MENU_SCHEMA_VERSION);
  assert.equal(firstWritten.device, P2_MENU_DEVICE);
  assert.ok(Array.isArray(firstWritten.tree));
  assert.deepEqual(firstWritten.meta.removed, []);
  assert.ok(collectActions(firstWritten.tree).every(action => action === 'new'));
  const approved = JSON.parse(host.files[keyOf(p2PipelineFile(MODULE))].content) as {
    status: string;
    sourceMessages: string[];
    warnings: string[];
    device: string;
    previousMenu: string;
    actionCounts: { new: number; change: number; keep: number; remove: number };
    steps: { menu20: { status: string }; entry10: { status: string } };
  };
  assert.equal(approved.steps.entry10.status, 'approved');
  assert.equal(approved.steps.menu20.status, 'approved');
  assert.equal(approved.status, 'complete');
  assert.equal(approved.sourceMessages[0], '20260918201156_mensalidadesAcademia-20260918201156_1.json');
  assert.deepEqual(approved.warnings, []);
  assert.equal(approved.device, P2_MENU_DEVICE);
  assert.equal(approved.previousMenu, P2_PREVIOUS_MENU_NONE);
  assert.ok(approved.actionCounts.new > 0);
  assert.equal(approved.actionCounts.keep, 0);
  assert.equal(approved.actionCounts.remove, 0);

  const step2 = menuStep();
  const again = await afterP2MenuPromptStep(agentMeta(), contextWith(step2, payload), step2, step2, 1);
  assert.ok(again.some(intent => intent.type === 'add-step' && (intent as mls.msg.AgentIntentAddStep).step.planning?.planId === 'menu20-done'));
  const secondWritten = JSON.parse(host.files[keyOf(p2MenuFile(MODULE))].content) as {
    schemaVersion: string;
    tree: MenuStampedNode[];
  };
  assert.equal(secondWritten.schemaVersion, P2_MENU_SCHEMA_VERSION);
  assert.ok(collectActions(secondWritten.tree).every(action => action === 'keep'));
  const secondPipeline = JSON.parse(host.files[keyOf(p2PipelineFile(MODULE))].content) as {
    previousMenu: string;
    actionCounts: { new: number; change: number; keep: number; remove: number };
  };
  assert.equal(secondPipeline.previousMenu, `l4/${MODULE}/pool/l2/${P2_MENU_DEVICE}/menu.json`);
  assert.ok(secondPipeline.actionCounts.keep > 0);
  assert.equal(secondPipeline.actionCounts.new, 0);
  assert.equal(host.files[keyOf({ project: PROJECT, level: 4, folder: `${MODULE}/pool/l2`, shortName: poolShort, extension: '.json' })].content, poolContent);
});

void test('human prompt carries journeys, grants, processes and candidates', () => {
  const loaded = loadSources();
  const human = buildP2MenuHumanPrompt({ menuSources: { sources: loaded.sources, grants: loaded.grants, processes: loaded.processes } });
  assert.match(human, /## Candidates \(deterministic; candidates, not the answer\)/);
  assert.match(human, /matricularAluno/);
  assert.match(human, /lembrarGeracaoMensalidades/);
  assert.match(human, /goal:/);
  assert.match(human, /What this actor must see, beyond journeys/);
  assert.match(human, /alertarGerenciaGeracao/);
  assert.match(human, /recordsMaintained/);
  assert.match(human, /"entityRef": "Plano"/);
  assert.ok(loaded.grants.length > 0);
});

void test('buildP2MenuFile fills the envelope from code, not the model', () => {
  const draft = normalizeMenuV2(loadDraft());
  const file = buildP2MenuFile({
    moduleName: MODULE,
    userLanguage: 'pt-BR',
    draft,
  });
  assert.equal(file.schemaVersion, P2_MENU_SCHEMA_VERSION);
  assert.equal(file.userLanguage, 'pt-BR');
  assert.equal(file.moduleName, MODULE);
  assert.equal(file.device, P2_MENU_DEVICE);
  assert.equal('sourceMessages' in file, false);
  assert.equal('generatedAt' in file, false);
  assert.deepEqual(file.meta.processes.lembrarGeracaoMensalidades, ['painel', 'mensalidades_mes']);
  assert.deepEqual(file.meta.removed, []);
  assert.ok(collectActions(file.tree).every(action => action === 'new'));
  assert.deepEqual(menuActionCounts(file), {
    new: collectActions(file.tree).length,
    change: 0,
    keep: 0,
    remove: 0,
  });
});

void test('menuCandidates from the four real processes classify by actor', () => {
  const mens = loadSources();
  const hiring = loadModuleSources(HIRING_FIXTURE);
  const compras = loadModuleSources(COMPRAS_FIXTURE);

  const mensSee = menuCandidates(mens.sources, mens.grants, mens.processes).beyondJourneys;
  const gerencia = mensSee.find(row => row.actorRef === 'gerencia');
  assert.ok(gerencia, 'gerencia missing from beyondJourneys');
  assert.ok(gerencia.alerts.some(task => (
    task.processId === 'lembrarGeracaoMensalidades' && task.taskId === 'alertarGerenciaGeracao'
  )));
  assert.equal(gerencia.human.length, 0);
  assert.ok(gerencia.derived.some(item => item.entityRef === 'IndicadoresAcademia' && !item.fieldId));
  assert.ok(gerencia.derived.some(item => item.entityRef === 'Mensalidade' && item.fieldId === 'details.situacao'));

  const hiringSee = menuCandidates(hiring.sources, hiring.grants, hiring.processes).beyondJourneys;
  const hiringManager = hiringSee.find(row => row.actorRef === 'hiringManager');
  const recruiter = hiringSee.find(row => row.actorRef === 'recruiter');
  assert.ok(hiringManager && recruiter);
  assert.ok(hiringManager.human.some(task => (
    task.processId === 'applicationDecisionProcess' && task.taskId === 'decideOffer'
  )));
  assert.ok(hiringManager.human.some(task => task.taskId === 'decideHiringOutcome'));
  assert.ok(recruiter.human.some(task => (
    task.processId === 'applicationDecisionProcess' && task.taskId === 'recordApplicationRejection'
  )));
  assert.ok(recruiter.mechanicalEffects.some(task => (
    task.processId === 'closeFilledPositionProcess'
    && task.taskId === 'closeFilledPosition'
    && task.entityRef === 'JobPosition'
    && task.effect === 'transition'
  )));
  assert.ok(hiringManager.mechanicalEffects.some(task => task.processId === 'closeFilledPositionProcess'));
  assert.ok(recruiter.derived.some(item => item.entityRef === 'JobPosition' && item.fieldId === 'details.filledHeadcount'));

  const comprasSee = menuCandidates(compras.sources, compras.grants, compras.processes).beyondJourneys;
  const comprador = comprasSee.find(row => row.actorRef === 'comprador');
  const gerente = comprasSee.find(row => row.actorRef === 'gerenteCompras');
  assert.ok(comprador && gerente);
  assert.ok(comprador.human.some(task => (
    task.processId === 'aprovarPedidoAcimaDoLimite' && task.taskId === 'enviarEEncaminharPedido'
  )));
  assert.ok(gerente.human.some(task => (
    task.processId === 'aprovarPedidoAcimaDoLimite' && task.taskId === 'decidirPedidoEncaminhado'
  )));
  assert.ok(gerente.derived.some(item => item.entityRef === 'PurchaseOrderDashboard' && !item.fieldId));
  assert.equal(gerente.alerts.length, 0);
});

void test('v2.1 fixtures of the three modules pass the gate with no warnings', () => {
  const mens = loadSources();
  const hiring = loadModuleSources(HIRING_FIXTURE);
  const compras = loadModuleSources(COMPRAS_FIXTURE);
  const cases = [
    { name: 'mensalidadesAcademia', loaded: mens, draft: normalizeMenuV2(loadDraft()) },
    { name: 'hiringPipeline', loaded: hiring, draft: normalizeMenuV2(JSON.parse(readFileSync(HIRING_DRAFT_PATH, 'utf8'))) },
    { name: 'compras', loaded: compras, draft: normalizeMenuV2(JSON.parse(readFileSync(COMPRAS_DRAFT_PATH, 'utf8'))) },
  ];
  for (const item of cases) {
    const gate = validateP2Menu(item.draft, item.loaded);
    assert.equal(gate.ok, true, `${item.name}: ${gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n')}`);
    assert.deepEqual(
      gate.issues.filter(issue => issue.severity === 'warning'),
      [],
      `${item.name} warnings: ${gate.issues.map(issue => issue.code).join(',')}`,
    );
  }
});

void test('gate warns when closeFilledPosition has no timeline and is silent when it has one', () => {
  const hiring = loadModuleSources(HIRING_FIXTURE);
  const withTimeline = normalizeMenuV2(JSON.parse(readFileSync(HIRING_DRAFT_PATH, 'utf8')));
  const without = structuredClone(withTimeline);
  const strip = (node: typeof without.tree[number]) => {
    if (node.kind === 'page') {
      node.organisms = node.organisms.filter(organism => organism.kind !== 'timeline');
      return;
    }
    if (node.kind === 'hub' || node.kind === 'group') node.children.forEach(strip);
  };
  without.tree.forEach(strip);

  const missing = validateP2Menu(without, hiring);
  const present = validateP2Menu(withTimeline, hiring);
  assert.equal(missing.ok, true);
  assert.ok(
    missing.issues.some(issue => issue.severity === 'warning' && issue.code === 'P2_MENU_MECHANICAL_NO_TIMELINE'),
    `expected P2_MENU_MECHANICAL_NO_TIMELINE, got ${missing.issues.map(issue => issue.code).join(',') || '(none)'}`,
  );
  assert.equal(
    present.issues.some(issue => issue.code === 'P2_MENU_MECHANICAL_NO_TIMELINE'),
    false,
    `timeline present still warned: ${present.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n')}`,
  );
});

void test('gate warns when an alert has no alerts organism and is silent when it has one', () => {
  const mens = loadSources();
  const withAlerts = normalizeMenuV2(loadDraft());
  const without = structuredClone(withAlerts);
  const painel = without.tree.find(node => node.id === 'painel');
  assert.equal(painel?.kind, 'page');
  if (painel?.kind === 'page') {
    painel.organisms = painel.organisms.filter(organism => organism.kind !== 'alerts');
  }
  const missing = validateP2Menu(without, mens);
  const present = validateP2Menu(withAlerts, mens);
  assert.ok(missing.issues.some(issue => issue.severity === 'warning' && issue.code === 'P2_MENU_ALERT_MISSING'));
  assert.equal(present.issues.some(issue => issue.code === 'P2_MENU_ALERT_MISSING'), false);
});

void test('gate warns when a human task has no inbox and errors on an unknown process id', () => {
  const compras = loadModuleSources(COMPRAS_FIXTURE);
  const withInbox = normalizeMenuV2(JSON.parse(readFileSync(COMPRAS_DRAFT_PATH, 'utf8')));
  const without = structuredClone(withInbox);
  const strip = (node: typeof without.tree[number]) => {
    if (node.kind === 'page') {
      node.organisms = node.organisms.filter(organism => organism.kind !== 'inbox');
      return;
    }
    if (node.kind === 'hub' || node.kind === 'group') node.children.forEach(strip);
  };
  without.tree.forEach(strip);
  const missing = validateP2Menu(without, compras);
  const present = validateP2Menu(withInbox, compras);
  assert.ok(missing.issues.some(issue => issue.severity === 'warning' && issue.code === 'P2_MENU_HUMAN_NO_INBOX'));
  assert.equal(present.issues.some(issue => issue.code === 'P2_MENU_HUMAN_NO_INBOX'), false);

  const unknown = structuredClone(withInbox);
  unknown.meta.processes.fantasmaProcesso = ['pedidos_e_indicadores'];
  const unknownGate = validateP2Menu(unknown, compras);
  assert.equal(unknownGate.ok, false);
  assert.ok(unknownGate.issues.some(issue => issue.severity === 'error' && issue.code === 'P2_MENU_PROCESS_UNKNOWN'));

  const empty = structuredClone(withInbox);
  empty.meta.processes.aprovarPedidoAcimaDoLimite = [];
  const emptyGate = validateP2Menu(empty, compras);
  assert.equal(emptyGate.ok, true);
  assert.ok(emptyGate.issues.some(issue => issue.severity === 'warning' && issue.code === 'P2_MENU_PROCESS_UNMAPPED'));
});

void test('parsePreviousMenuTree reads the real compras v2.1 menu and strips nothing required', () => {
  const raw = JSON.parse(readFileSync(PREVIOUS_COMPRAS_PATH, 'utf8')) as { schemaVersion: string; tree: unknown[] };
  assert.equal(raw.schemaVersion, '2026-09-19-p2-menu-v2.1');
  const tree = parsePreviousMenuTree(raw);
  assert.ok(tree.some(node => node.id === 'pedidos_de_compra'));
  assert.ok(tree.some(node => node.id === 'meu_perfil_comprador' && node.kind === 'hub'));
});

void test('afterPromptStep migrates legacy pool/l2/menu.json once', async () => {
  const host = installHost();
  seedAgentFiles(host);
  seedL4(host);
  seedPipeline(host);
  const poolShort = '20260918201156_mensalidadesAcademia-20260918201156_1';
  seed(host, {
    folder: `${MODULE}/pool/l2`,
    shortName: poolShort,
    extension: '.json',
    content: readFileSync(path.join(HERE, '../entry10/fixtures/pool-l2-20260918201156.json'), 'utf8'),
  });
  seed(host, {
    folder: `${MODULE}/pool/l2`,
    shortName: 'menu',
    extension: '.json',
    content: `${JSON.stringify(loadDraft(), null, 2)}\n`,
  });
  const step = menuStep();
  const intents = await afterP2MenuPromptStep(
    agentMeta(),
    contextWith(step, { type: 'flexible', result: loadDraft() }),
    step,
    step,
    1,
  );
  assert.ok(intents.some(intent => intent.type === 'add-step' && (intent as mls.msg.AgentIntentAddStep).step.planning?.planId === 'menu20-done'));
  const written = JSON.parse(host.files[keyOf(p2MenuFile(MODULE))].content) as { tree: MenuStampedNode[] };
  assert.ok(collectActions(written.tree).every(action => action === 'keep'));
  const pipeline = JSON.parse(host.files[keyOf(p2PipelineFile(MODULE))].content) as {
    previousMenu: string;
    actionCounts: { keep: number; new: number };
  };
  assert.equal(pipeline.previousMenu, `l4/${MODULE}/pool/l2/menu.json`);
  assert.ok(pipeline.actionCounts.keep > 0);
  assert.equal(pipeline.actionCounts.new, 0);
  assert.equal(host.files[keyOf(p2LegacyMenuFile(MODULE))].status, 'deleted');
  assert.ok(host.deleted.includes(`${MODULE}/pool/l2/menu`));
});

void test('afterPromptStep prefers the new device path over leftover legacy', async () => {
  const host = installHost();
  seedAgentFiles(host);
  seedL4(host);
  seedPipeline(host);
  const draft = loadDraft();
  host.files[keyOf(p2MenuFile(MODULE))].content = `${JSON.stringify(draft, null, 2)}\n`;
  seed(host, {
    folder: `${MODULE}/pool/l2`,
    shortName: 'menu',
    extension: '.json',
    content: '{"tree":[]}\n',
  });
  const step = menuStep();
  await afterP2MenuPromptStep(
    agentMeta(),
    contextWith(step, { type: 'flexible', result: draft }),
    step,
    step,
    1,
  );
  const pipeline = JSON.parse(host.files[keyOf(p2PipelineFile(MODULE))].content) as { previousMenu: string };
  assert.equal(pipeline.previousMenu, `l4/${MODULE}/pool/l2/${P2_MENU_DEVICE}/menu.json`);
  assert.equal(host.files[keyOf(p2LegacyMenuFile(MODULE))].status, 'changed');
});

void test('collectRecordsMaintained from locacaoEquipamentos: gerente maintains ManutencaoEquipamento', () => {
  const locacao = loadModuleSources(LOCACAO_FIXTURE);
  const got = collectRecordsMaintained(locacao.sources, locacao.grants);
  const gerente = got.filter(row => row.actorRef === 'gerente');
  assert.ok(
    gerente.some(row => row.entityRef === 'ManutencaoEquipamento' && row.writer === 'crud'),
    `gerente records: ${JSON.stringify(gerente)}`,
  );
  assert.deepEqual(
    got,
    [
      { actorRef: 'atendente', entityRef: 'Equipamento', writer: 'crud' },
      { actorRef: 'gerente', entityRef: 'Equipamento', writer: 'crud' },
      { actorRef: 'gerente', entityRef: 'ManutencaoEquipamento', writer: 'crud' },
    ],
  );
});

void test('collectRecordsMaintained across the 12 modules matches writer:crud ∩ grant', () => {
  const roots: Record<string, string> = {
    agendaClinica: path.join(HERE, 'fixtures/agendaClinica'),
    comandaRestaurante: path.join(HERE, 'fixtures/comandaRestaurante'),
    compras: COMPRAS_FIXTURE,
    controleEstoque: path.join(HERE, 'fixtures/controleEstoque'),
    financeiro: path.join(HERE, 'fixtures/financeiro'),
    hiringPipeline: HIRING_FIXTURE,
    inscricaoEvento: path.join(HERE, 'fixtures/inscricaoEvento'),
    locacaoEquipamentos: LOCACAO_FIXTURE,
    manutencaoFrota: path.join(HERE, 'fixtures/manutencaoFrota'),
    mensalidadesAcademia: L4_FIXTURE,
    ordenServicio: path.join(HERE, 'fixtures/ordenServicio'),
    reembolsoDespesas: path.join(HERE, 'fixtures/reembolsoDespesas'),
  };
  const expected: Record<string, Array<{ actorRef: string; entityRef: string; writer: 'crud' }>> = {
    agendaClinica: [
      { actorRef: 'profissional', entityRef: 'Profissional', writer: 'crud' },
      { actorRef: 'recepcionista', entityRef: 'Profissional', writer: 'crud' },
      { actorRef: 'recepcionista', entityRef: 'Recepcionista', writer: 'crud' },
    ],
    comandaRestaurante: [
      { actorRef: 'caixa', entityRef: 'Mesa', writer: 'crud' },
      { actorRef: 'garcom', entityRef: 'ItemCardapio', writer: 'crud' },
      { actorRef: 'garcom', entityRef: 'Mesa', writer: 'crud' },
    ],
    compras: [],
    controleEstoque: [],
    financeiro: [
      { actorRef: 'gerenteFinanceiro', entityRef: 'GerenteFinanceiro', writer: 'crud' },
    ],
    hiringPipeline: [],
    inscricaoEvento: [],
    locacaoEquipamentos: [
      { actorRef: 'atendente', entityRef: 'Equipamento', writer: 'crud' },
      { actorRef: 'gerente', entityRef: 'Equipamento', writer: 'crud' },
      { actorRef: 'gerente', entityRef: 'ManutencaoEquipamento', writer: 'crud' },
    ],
    manutencaoFrota: [
      { actorRef: 'gestor', entityRef: 'Driver', writer: 'crud' },
      { actorRef: 'gestor', entityRef: 'Vehicle', writer: 'crud' },
      { actorRef: 'gestor', entityRef: 'VehicleAssignment', writer: 'crud' },
      { actorRef: 'gestor', entityRef: 'Workshop', writer: 'crud' },
      { actorRef: 'motorista', entityRef: 'Vehicle', writer: 'crud' },
    ],
    mensalidadesAcademia: [
      { actorRef: 'gerencia', entityRef: 'Plano', writer: 'crud' },
      { actorRef: 'recepcao', entityRef: 'Plano', writer: 'crud' },
    ],
    ordenServicio: [],
    reembolsoDespesas: [
      { actorRef: 'gestorEquipe', entityRef: 'GestorEquipe', writer: 'crud' },
    ],
  };
  const empty: string[] = [];
  const actorAsEntity: string[] = [];
  for (const [mod, root] of Object.entries(roots)) {
    const loaded = loadAccessOntology(root);
    const got = collectRecordsMaintained(loaded.sources, loaded.grants);
    assert.deepEqual(got, expected[mod], mod);
    if (got.length === 0) empty.push(mod);
    for (const row of got) {
      if (['Recepcionista', 'GerenteFinanceiro', 'GestorEquipe', 'Driver'].includes(row.entityRef)) {
        actorAsEntity.push(`${mod}:${row.actorRef}:${row.entityRef}`);
      }
    }
  }
  assert.deepEqual(empty.sort(), [
    'compras', 'controleEstoque', 'hiringPipeline', 'inscricaoEvento', 'ordenServicio',
  ]);
  assert.ok(actorAsEntity.includes('agendaClinica:recepcionista:Recepcionista'));
  assert.ok(actorAsEntity.includes('financeiro:gerenteFinanceiro:GerenteFinanceiro'));
  assert.ok(actorAsEntity.includes('reembolsoDespesas:gestorEquipe:GestorEquipe'));
  assert.ok(actorAsEntity.includes('manutencaoFrota:gestor:Driver'));
});

void test('gate warns when a granted crud entity has no form/actions and is silent when it has one', () => {
  const locacao = loadModuleSources(LOCACAO_FIXTURE);
  const base = locacaoMenuDraft();
  const missing = validateP2Menu(normalizeMenuV2(base), locacao);
  assert.equal(missing.ok, true, missing.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  const missingCodes = missing.issues.filter(issue => issue.severity === 'warning').map(issue => `${issue.code}:${issue.message}`);
  assert.ok(
    missing.issues.some(issue => (
      issue.severity === 'warning'
      && issue.code === 'P2_MENU_ENTITY_NO_FORM'
      && issue.message.includes('ManutencaoEquipamento')
      && issue.message.includes('gerente')
    )),
    `expected NO_FORM for ManutencaoEquipamento/gerente, got ${missingCodes.join(' | ') || '(none)'}`,
  );

  const withForm = locacaoMenuDraft({
    cite: ['Equipamento', 'ManutencaoEquipamento'],
    entities: {
      Equipamento: ['equipamentos'],
      ManutencaoEquipamento: ['equipamentos'],
    },
  });
  const present = validateP2Menu(normalizeMenuV2(withForm), locacao);
  assert.equal(present.ok, true, present.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  assert.equal(
    present.issues.some(issue => issue.code === 'P2_MENU_ENTITY_NO_FORM' || issue.code === 'P2_MENU_ENTITY_UNMAPPED'),
    false,
    `form present still warned: ${present.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n')}`,
  );

  const onlyEquipamento = locacaoMenuDraft({
    cite: ['Equipamento'],
    entities: {
      Equipamento: ['equipamentos'],
      ManutencaoEquipamento: ['equipamentos'],
    },
  });
  const partial = validateP2Menu(normalizeMenuV2(onlyEquipamento), locacao);
  assert.equal(partial.ok, true);
  assert.ok(
    partial.issues.some(issue => (
      issue.code === 'P2_MENU_ENTITY_NO_FORM'
      && issue.message.includes('ManutencaoEquipamento')
    )),
    `citing only Equipamento should still warn for ManutencaoEquipamento, got ${partial.issues.map(issue => issue.code).join(',') || '(none)'}`,
  );
  assert.equal(
    partial.issues.some(issue => issue.code === 'P2_MENU_ENTITY_NO_FORM' && issue.message.includes('Equipamento') && !issue.message.includes('Manutencao')),
    false,
  );
});

void test('gate errors on unknown meta.entities id and warns when the candidate is unmapped', () => {
  const locacao = loadModuleSources(LOCACAO_FIXTURE);
  const unknown = locacaoMenuDraft({
    cite: ['Equipamento', 'ManutencaoEquipamento'],
    entities: { Fantasma: ['equipamentos'] },
  });
  const unknownGate = validateP2Menu(normalizeMenuV2(unknown), locacao);
  assert.equal(unknownGate.ok, false);
  assert.ok(unknownGate.issues.some(issue => issue.severity === 'error' && issue.code === 'P2_MENU_ENTITY_UNKNOWN'));

  const empty = locacaoMenuDraft({
    cite: ['Equipamento', 'ManutencaoEquipamento'],
    entities: { ManutencaoEquipamento: [] },
  });
  const emptyGate = validateP2Menu(normalizeMenuV2(empty), locacao);
  assert.equal(emptyGate.ok, true);
  assert.ok(emptyGate.issues.some(issue => issue.severity === 'warning' && issue.code === 'P2_MENU_ENTITY_UNMAPPED' && issue.message.includes('ManutencaoEquipamento')));
});

function locacaoMenuDraft(opts: {
  cite?: string[];
  entities?: Record<string, string[]>;
} = {}): unknown {
  const cite = opts.cite || [];
  const formText = cite.length
    ? `create and edit ${cite.join(' and ')}`
    : 'look at the record';
  const organisms: Array<{ kind: string; text: string }> = [
    { kind: 'list', text: 'the equipment list' },
    { kind: 'detail', text: 'the selected equipment' },
    { kind: 'timeline', text: 'what the system did' },
    { kind: 'summary', text: 'counts' },
    { kind: 'highlights', text: 'stand-outs' },
    { kind: 'alerts', text: 'alerts' },
    { kind: 'inbox', text: 'inbox' },
  ];
  if (cite.length) {
    organisms.push({ kind: 'form', text: formText });
    organisms.push({ kind: 'actions', text: formText });
  }
  return {
    tree: [
      {
        id: 'contratos',
        kind: 'page',
        label: 'Contracts',
        organisms: [
          { kind: 'list', text: 'rental contracts' },
          { kind: 'form', text: 'create a ContratoLocacao' },
          { kind: 'actions', text: 'register a return' },
          { kind: 'inbox', text: 'inbox' },
        ],
      },
      {
        id: 'equipamentos',
        kind: 'page',
        label: 'Equipment',
        organisms,
      },
    ],
    authorities: {
      'actor:atendente': ['contratos', 'equipamentos'],
      'actor:gerente': ['equipamentos'],
    },
    meta: {
      journeys: {
        criarContratoLocacao: ['contratos'],
        registrarDevolucao: ['contratos'],
        consultarSituacaoEquipamentos: ['equipamentos'],
      },
      processes: {},
      entities: opts.entities || {},
    },
  };
}

