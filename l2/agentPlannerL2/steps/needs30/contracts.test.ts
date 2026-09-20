/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/needs30/contracts.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  parseP2Grants,
  parseP2Processes,
  type P2MenuFile,
} from '/_102020_/l2/agentPlannerL2/steps/menu20/contracts.js';
import {
  parseP2L4Sources,
  type P2L4Sources,
} from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';
import {
  buildP2NeedsFile,
  buildP2NeedsMessage,
  p2EntityFamily,
  p2NeedsSubject,
  p2WidestScope,
  type P2NeedsPage,
} from '/_102020_/l2/agentPlannerL2/steps/needs30/contracts.js';
import { validateP2Needs } from '/_102020_/l2/agentPlannerL2/steps/needs30/gate.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const L4_FIXTURE = path.join(HERE, '../workspaces20/fixtures/mensalidadesAcademia');
const WORKFLOWS = path.join(HERE, '../menu20/fixtures/workflows.defs.ts');
const MENU_PATH = path.join(HERE, 'fixtures/menu.json');
const AT = new Date(Date.UTC(2026, 8, 21, 12, 0, 0));

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

function loadSources(): P2L4Sources {
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
  return parseP2L4Sources({
    moduleName: moduleArtifact.moduleName,
    userLanguage: moduleArtifact.userLanguage,
    journeyIndex: readDefs(L4_FIXTURE, 'journeys/index.defs.ts'),
    journeys,
    access: readDefs(L4_FIXTURE, 'access.defs.ts'),
    ontologyIndex: readDefs(L4_FIXTURE, 'ontology/index.defs.ts'),
    ontologyEntities,
  });
}

function loadMenu(): P2MenuFile {
  return JSON.parse(readFileSync(MENU_PATH, 'utf8')) as P2MenuFile;
}

function loadBuilt() {
  const sources = loadSources();
  const grants = parseP2Grants(readDefs(L4_FIXTURE, 'access.defs.ts'));
  const processes = parseP2Processes(extractDefsJson(readFileSync(WORKFLOWS, 'utf8')));
  const menu = loadMenu();
  const file = buildP2NeedsFile({ menu, sources, grants, processes, now: AT });
  return { sources, grants, processes, menu, file };
}

function pageOf(pages: readonly P2NeedsPage[], pageId: string): P2NeedsPage {
  const page = pages.find(item => item.pageId === pageId);
  assert.ok(page, `missing page ${pageId}`);
  return page;
}

void test('family table of mensalidadesAcademia: Aluno mdm, IndicadoresAcademia ddm, rest tdm', () => {
  const sources = loadSources();
  const familyOf = (entityId: string) => {
    const entity = sources.entities.find(item => item.entityId === entityId);
    assert.ok(entity, entityId);
    return p2EntityFamily(entity);
  };
  assert.equal(familyOf('Aluno'), 'mdm');
  assert.equal(familyOf('IndicadoresAcademia'), 'ddm');
  assert.equal(familyOf('Plano'), 'tdm');
  assert.equal(familyOf('Matricula'), 'tdm');
  assert.equal(familyOf('Mensalidade'), 'tdm');
  assert.equal(familyOf('Pagamento'), 'tdm');
});

void test('widest scope wins own < related < organization', () => {
  assert.equal(p2WidestScope(['own', 'organization']), 'organization');
  assert.equal(p2WidestScope(['related', 'own']), 'related');
  assert.equal(p2WidestScope(['own']), 'own');
  assert.equal(p2WidestScope([]), '');
});

void test('mensalidadesAcademia pages: payments, plans, home, cancel transition', () => {
  const { file, menu, sources, grants } = loadBuilt();
  assert.equal(file.schemaVersion, '2026-09-21-p2-needs-v1');
  assert.equal(file.moduleName, 'mensalidadesAcademia');
  assert.equal(file.device, 'web');
  assert.equal(file.menuSchema, '2026-09-20-p2-menu-v2.2');
  assert.equal(file.meta.sourceMenu, 'pool/l2/web/menu.json');
  assert.equal(file.meta.generatedAt, AT.toISOString());
  assert.equal('entities' in menu.meta, false);

  const payments = pageOf(file.pages, 'mensalidades_pagamentos');
  assert.deepEqual(payments.actors, ['recepcao']);
  assert.deepEqual(payments.reads.map(item => item.entity), ['Mensalidade', 'Pagamento']);
  assert.equal(payments.reads.find(item => item.entity === 'Mensalidade')?.scope, 'organization');
  assert.ok(payments.reads.find(item => item.entity === 'Mensalidade')?.from.includes(
    'journey:registrarPagamentoMensalidade/localizarMensalidade',
  ));
  assert.ok(payments.reads.find(item => item.entity === 'Mensalidade')?.derived.includes('details.situacao'));
  assert.ok(payments.reads.find(item => item.entity === 'Mensalidade')?.derived.includes('details.saldoDevedor'));
  assert.deepEqual(
    payments.writes.map(item => `${item.entity}:${item.operation}:${item.transitionRef}`),
    ['Pagamento:create:'],
  );
  assert.ok(payments.writes[0].from.includes('journey:registrarPagamentoMensalidade/registrarPagamento'));

  const plans = pageOf(file.pages, 'planos');
  assert.deepEqual(plans.actors, ['gerencia', 'recepcao']);
  assert.deepEqual(plans.reads.map(item => item.entity), ['Plano']);
  assert.deepEqual(
    plans.writes.map(item => `${item.entity}:${item.operation}`).sort(),
    ['Plano:create', 'Plano:update'],
  );
  assert.ok(plans.writes.every(item => item.from.includes('organism:form')));

  const home = pageOf(file.pages, 'inicio_recepcao');
  assert.deepEqual(home.writes, []);
  assert.ok(home.reads.every(item => item.from.some(from => from.startsWith('organism:'))));
  assert.ok(home.reads.some(item => item.entity === 'Mensalidade'));

  const mine = pageOf(file.pages, 'minha_matricula');
  assert.deepEqual(mine.actors, ['aluno']);
  assert.ok(mine.reads.some(item => item.entity === 'Matricula' && item.scope === 'own'));
  assert.deepEqual(
    mine.writes.map(item => `${item.entity}:${item.operation}:${item.transitionRef}`),
    ['Matricula:transition:cancelarMatricula'],
  );

  const recepcaoAluno = grants.find(item => item.grantId === 'alunoCancelarPropriaMatricula');
  assert.equal(recepcaoAluno?.dataScope.mode, 'own');
  const recepcaoCadastros = grants.find(item => item.grantId === 'recepcaoGerenciarCadastrosEcobrancas');
  assert.equal(recepcaoCadastros?.dataScope.mode, 'organization');
  assert.equal(grants.length, 5);

  const gate = validateP2Needs(file, menu, sources);
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('needs message is English, one line per page, current thread round', () => {
  const { file } = loadBuilt();
  const message = buildP2NeedsMessage({
    file,
    received: { thread: 'mensalidadesAcademia-20260918103000', round: 1, mode: 'implement' },
  });
  assert.equal(message.from, 'l2');
  assert.equal(message.to, 'l1');
  assert.equal(message.subject, p2NeedsSubject('mensalidadesAcademia'));
  assert.deepEqual(message.artifacts, ['pool/l1/web/needs.json']);
  assert.equal(message.round, 1);
  assert.equal(message.body.split('\n').length, file.pages.length);
  assert.match(message.body, /mensalidades_pagamentos: 2 reads \/ 1 writes/);
  assert.match(message.body, /inicio_recepcao: \d+ reads \/ 0 writes/);
  assert.equal(message.body.includes('lê'), false);
});
