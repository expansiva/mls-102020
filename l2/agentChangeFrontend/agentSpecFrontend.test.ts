/// <mls fileReference="_102020_/l2/agentChangeFrontend/agentSpecFrontend.test.ts" enhancement="_blank"/>

// mls.stor.files is a fixture: no test touches disk or network.

import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const g = globalThis as unknown as Record<string, any>;
const priorMls = g.mls;
after(() => { g.mls = priorMls; });

const PROJECT = 102050;
const OTHER = 100555;

interface FileSeed {
  project?: number;
  level?: number;
  folder: string;
  shortName: string;
  extension?: string;
  status?: string;
  updatedAt?: string;
}

const keyToFile = (info: any) => `${info.project}:${info.level}:${info.folder}:${info.shortName}:${info.extension}`;

function installStub(seeds: FileSeed[], actualProject: number | undefined = PROJECT): void {
  const files: Record<string, any> = {};
  for (const seed of seeds) {
    const info = {
      project: seed.project ?? PROJECT,
      level: seed.level ?? 2,
      folder: seed.folder,
      shortName: seed.shortName,
      extension: seed.extension ?? '.defs.ts',
      status: seed.status ?? 'unchanged',
      updatedAt: seed.updatedAt ?? '2026-09-01T10:00:00.000Z',
    };
    files[keyToFile(info)] = info;
  }
  g.mls = {
    actualProject,
    events: { addEventListener() { /* noop */ }, removeEventListener() { /* noop */ }, dispatch() { /* noop */ } },
    stor: {
      files,
      getKeyToFile: keyToFile,
      localStor: { setContent: async () => undefined },
      convertFileReferenceToFile: (ref: string) => {
        const match = /^_(\d+)_\/l(\d+)\/(.+)$/u.exec(ref);
        if (!match) return null;
        const rest = match[3];
        const at = rest.lastIndexOf('/');
        const filename = at >= 0 ? rest.slice(at + 1) : rest;
        const extension = filename.endsWith('.defs.ts') ? '.defs.ts' : '.ts';
        return {
          project: Number(match[1]),
          level: Number(match[2]),
          folder: at >= 0 ? rest.slice(0, at) : '',
          shortName: filename.slice(0, -extension.length),
          extension,
        };
      },
    },
    editor: { models: {}, getKeyModel: () => '' },
    l2: { typescript: { compile: async () => true } },
  };
}

async function load(): Promise<any> {
  return import('/_102020_/l2/agentChangeFrontend/agentSpecFrontend.js');
}

const MODULE = 'controleChamados';

/** The real shape of the 102050: 4 pages x 3 page folders + 4 shared = 16 .defs.ts of level 2. */
function fixture102050(): FileSeed[] {
  const names = ['commentOpenTicket', 'ticketCatalogue', 'ticketCommentCatalogue', 'ticketHub'];
  const folders = [
    `${MODULE}/web/desktop/page11`,
    `${MODULE}/web/desktop/page21`,
    `${MODULE}/web/desktop/page31`,
    `${MODULE}/web/shared`,
  ];
  const seeds: FileSeed[] = [];
  for (const folder of folders) {
    for (const shortName of names) {
      seeds.push({ folder, shortName, extension: '.defs.ts', updatedAt: '2026-09-02T10:00:00.000Z' });
      // the pair, OLDER than the defs: everything is stale, so everything queues
      seeds.push({ folder, shortName, extension: '.ts', updatedAt: '2026-09-01T10:00:00.000Z' });
    }
  }
  return seeds;
}

const fakeContext = { message: { threadId: 'T', content: '', orderAt: '1' }, task: { PK: 'task#1' } } as any;

// ---- 1 e 2: a varredura ----

test('1. varredura sem parametro no fixture do 102050 seleciona 16', async () => {
  installStub(fixture102050());
  const { selectDefsFiles } = await load();
  assert.equal(selectDefsFiles(PROJECT).length, 16);
});

test('2. level != 2, extensao != .defs.ts e status deleted ficam de fora', async () => {
  installStub([
    { folder: `${MODULE}/web/shared`, shortName: 'ok' },
    { folder: `${MODULE}/web/shared`, shortName: 'nivelErrado', level: 5 },
    { folder: `${MODULE}/web/shared`, shortName: 'extensaoErrada', extension: '.ts' },
    { folder: `${MODULE}/web/shared`, shortName: 'apagado', status: 'deleted' },
  ]);
  const { selectDefsFiles } = await load();
  assert.deepEqual(selectDefsFiles(PROJECT).map((f: any) => f.shortName), ['ok']);
});

test('2b. filtro de projeto: um .defs.ts de level 2 do 100555 nao entra', async () => {
  installStub([
    { folder: `${MODULE}/web/shared`, shortName: 'doProjeto' },
    { folder: 'pluginProject', shortName: 'deOutroProjeto', project: OTHER },
  ]);
  const { selectDefsFiles } = await load();
  const selected = selectDefsFiles(PROJECT);
  assert.deepEqual(selected.map((f: any) => f.shortName), ['doProjeto']);
  assert.ok(selected.every((f: any) => f.project === PROJECT));
});

test('2c. sem projeto atual: erro, e nenhum passo criado', async () => {
  const { planSpecFrontend, resolveProject, createWaveIntents } = await load();

  for (const semProjeto of [undefined, 0]) {
    installStub(fixture102050());
    // atribuido DEPOIS de propósito: passar `undefined` como argumento dispararia o parametro
    // default do stub e o projeto voltaria a ser 102050 — o teste passaria sem testar nada.
    g.mls.actualProject = semProjeto;
    assert.throws(() => resolveProject(), /sem projeto atual/u);
    assert.throws(() => planSpecFrontend(''), /sem projeto atual/u);
  }
  // nada de "sucesso vazio": sem plano, nao ha intent
  assert.deepEqual(createWaveIntents(fakeContext, []), []);
});

// ---- 3 a 6: o scope ----

test('3. scope controleChamados/web/shared seleciona 4', async () => {
  installStub(fixture102050());
  const { selectDefsFiles } = await load();
  assert.equal(selectDefsFiles(PROJECT, `${MODULE}/web/shared`).length, 4);
});

test('4. scope controleChamados seleciona 16', async () => {
  installStub(fixture102050());
  const { selectDefsFiles } = await load();
  assert.equal(selectDefsFiles(PROJECT, MODULE).length, 16);
});

test('5. o casamento e por segmento: controleChamadosNovo nao casa controleChamados', async () => {
  installStub(fixture102050());
  const { selectDefsFiles, matchesScope } = await load();
  assert.equal(matchesScope(`${MODULE}/web/shared`, 'controleChamadosNovo'), false);
  assert.equal(selectDefsFiles(PROJECT, 'controleChamadosNovo').length, 0);
  // e o prefixo legitimo continua casando
  assert.equal(matchesScope(MODULE, MODULE), true);
  assert.equal(matchesScope(`${MODULE}/web`, MODULE), true);
});

test('6. scope que nao casa nada: relato vazio e nenhum passo criado', async () => {
  installStub(fixture102050());
  const { planSpecFrontend, createWaveIntents } = await load();
  const result = planSpecFrontend('{"scope":"naoExiste"}');
  assert.equal(result.error, undefined);
  assert.equal(result.plans.every((p: any) => p.queued.length === 0), true);
  assert.match(result.report, /Nada a materializar/u);
  assert.deepEqual(createWaveIntents(fakeContext, result.plans), []);
});

// ---- 7, 8, 8b: o target ----

test('7. target com .ts mais novo materializa assim mesmo', async () => {
  const folder = `${MODULE}/web/shared`;
  installStub([
    { folder, shortName: 'ticketHub', extension: '.defs.ts', updatedAt: '2026-09-01T10:00:00.000Z' },
    { folder, shortName: 'ticketHub', extension: '.ts', updatedAt: '2026-09-09T10:00:00.000Z' },
  ]);
  const { planSpecFrontend } = await load();
  const result = planSpecFrontend(`{"target":"_${PROJECT}_/l2/${folder}/ticketHub.defs.ts"}`);
  const queued = result.plans.flatMap((p: any) => p.queued);
  assert.equal(queued.length, 1, 'a regra de tempo e ignorada por contrato');
  assert.equal(queued[0].defPath, `_${PROJECT}_/l2/${folder}/ticketHub.defs.ts`);
});

test('8. target e scope juntos: erro, nada executado', async () => {
  installStub(fixture102050());
  const { planSpecFrontend, createWaveIntents } = await load();
  const result = planSpecFrontend(`{"scope":"${MODULE}","target":"_${PROJECT}_/l2/${MODULE}/web/shared/ticketHub.defs.ts"}`);
  assert.match(result.error, /nao podem vir juntos/u);
  assert.deepEqual(result.plans, []);
  assert.deepEqual(createWaveIntents(fakeContext, result.plans), []);
});

test('8b. target apontando para outro projeto: erro, nada executado', async () => {
  installStub(fixture102050());
  const { planSpecFrontend, createWaveIntents } = await load();
  const result = planSpecFrontend(`{"target":"_${OTHER}_/l2/pluginProject/algo.defs.ts"}`);
  assert.match(result.error, new RegExp(`projeto ${OTHER}`, 'u'));
  assert.deepEqual(result.plans, []);
  assert.deepEqual(createWaveIntents(fakeContext, result.plans), []);
});

// ---- 9 e 10: a regra de tempo ----

test('9. .ts ausente enfileira; defs mais novo enfileira; .ts mais novo pula com motivo', async () => {
  const folder = `${MODULE}/web/shared`;
  installStub([
    { folder, shortName: 'semPar', extension: '.defs.ts' },
    { folder, shortName: 'defsMaisNovo', extension: '.defs.ts', updatedAt: '2026-09-09T10:00:00.000Z' },
    { folder, shortName: 'defsMaisNovo', extension: '.ts', updatedAt: '2026-09-01T10:00:00.000Z' },
    { folder, shortName: 'tsMaisNovo', extension: '.defs.ts', updatedAt: '2026-09-01T10:00:00.000Z' },
    { folder, shortName: 'tsMaisNovo', extension: '.ts', updatedAt: '2026-09-09T10:00:00.000Z' },
  ]);
  const { planSpecFrontend, SKIP_UP_TO_DATE } = await load();
  const shared = planSpecFrontend('').plans.find((p: any) => p.wave === 'shared');

  assert.deepEqual(shared.queued.map((q: any) => q.defPath.split('/').pop()), ['defsMaisNovo.defs.ts', 'semPar.defs.ts']);
  assert.equal(shared.skipped.length, 1);
  assert.equal(shared.skipped[0].reason, SKIP_UP_TO_DATE);
  assert.match(shared.skipped[0].defPath, /tsMaisNovo\.defs\.ts$/u);
});

test('10. defs e .ts ambos changed: pulado com o motivo MAX vs MAX e a dica do target', async () => {
  const folder = `${MODULE}/web/shared`;
  installStub([
    { folder, shortName: 'ticketHub', extension: '.defs.ts', status: 'changed' },
    { folder, shortName: 'ticketHub', extension: '.ts', status: 'changed' },
  ]);
  const { planSpecFrontend, SKIP_MAX_VS_MAX } = await load();
  const result = planSpecFrontend('');
  const shared = result.plans.find((p: any) => p.wave === 'shared');

  assert.equal(shared.queued.length, 0);
  assert.equal(shared.skipped[0].reason, SKIP_MAX_VS_MAX);
  assert.match(result.report, /MAX vs MAX/u);
  assert.match(result.report, /\{"target":/u, 'o relato sai com a dica que contorna o limite');
});

// ---- 11 a 13: as ondas e o fan-out ----

test('11. tres ondas, nesta ordem, cada uma dependendo do PASSO de onda anterior', async () => {
  installStub([
    { folder: `${MODULE}/web/contracts`, shortName: 'ticketHub' },
    { folder: `${MODULE}/web/shared`, shortName: 'ticketHub' },
    { folder: `${MODULE}/web/desktop/page11`, shortName: 'ticketHub' },
  ]);
  const { planSpecFrontend, createWaveIntents } = await load();
  const intents = createWaveIntents(fakeContext, planSpecFrontend('').plans);

  assert.equal(intents.length, 3);
  assert.deepEqual(intents.map((i: any) => i.step.planning.planId), [
    'spec-materialize-contracts', 'spec-materialize-shared', 'spec-materialize-pages',
  ]);
  assert.deepEqual(intents[0].step.planning.dependsOn, []);
  assert.deepEqual(intents[1].step.planning.dependsOn, ['spec-materialize-contracts']);
  assert.deepEqual(intents[2].step.planning.dependsOn, ['spec-materialize-shared']);
  // a barreira e o passo de onda, nunca um item do fan-out
  for (const intent of intents) {
    for (const dep of intent.step.planning.dependsOn) {
      assert.ok(!dep.includes('fanout'), `dependsOn aponta para fan-out: ${dep}`);
      assert.ok(dep.startsWith('spec-materialize-'), dep);
    }
  }
});

test('11b. a classificacao e pelo ULTIMO segmento: mod/shared/web/desktop/page11 e pages', async () => {
  installStub([]);
  const { waveOf } = await load();
  assert.equal(waveOf('mod/shared/web/desktop/page11'), 'pages');
  assert.equal(waveOf(`${MODULE}/web/shared`), 'shared');
  assert.equal(waveOf(`${MODULE}/web/contracts`), 'contracts');
  assert.equal(waveOf('agendaClinica/web/mobile/page11'), 'pages');
});

test('12. onda vazia nao gera passo, e o shared vira a primeira onda', async () => {
  installStub(fixture102050());
  const { planSpecFrontend, createWaveIntents } = await load();
  const result = planSpecFrontend('');
  const contracts = result.plans.find((p: any) => p.wave === 'contracts');

  assert.equal(contracts.queued.length, 0, 'o 102050 nao tem contracts com .defs.ts');
  const intents = createWaveIntents(fakeContext, result.plans);
  assert.equal(intents.length, 2);
  assert.deepEqual(intents.map((i: any) => i.step.planning.planId), ['spec-materialize-shared', 'spec-materialize-pages']);
  assert.deepEqual(intents[0].step.planning.dependsOn, [], 'sem contracts, o shared nao depende de ninguem');
  assert.deepEqual(intents[1].step.planning.dependsOn, ['spec-materialize-shared']);
});

test('13. cada fan-out sai com maxParallel 10 e o pai com interaction nao nulo', async () => {
  installStub(fixture102050());
  const { planSpecFrontend, createWaveIntents, MAX_PARALLEL } = await load();
  const intents = createWaveIntents(fakeContext, planSpecFrontend('').plans);

  assert.equal(MAX_PARALLEL, 10);
  for (const intent of intents) {
    assert.equal(intent.executionMode.type, 'parallel');
    assert.equal(intent.executionMode.maxParallel, 10);
    assert.notEqual(intent.step.interaction, null, 'sem interaction o servidor lanca "Parallel parent step has no interaction"');
    assert.equal(intent.step.planning.executionMode, 'parallel_dynamic');
    assert.equal(intent.step.agentName, 'agentCfeMaterializeGen');
    assert.equal(intent.step.onFailure, 'wait_after_prompt');
    for (const arg of intent.executionMode.args) {
      const parsed = JSON.parse(arg);
      assert.equal(typeof parsed.planId, 'string');
      assert.match(parsed.defPath, /\.defs\.ts$/u);
    }
  }
  assert.equal(intents.find((i: any) => i.step.planning.planId === 'spec-materialize-shared').executionMode.args.length, 4);
  assert.equal(intents.find((i: any) => i.step.planning.planId === 'spec-materialize-pages').executionMode.args.length, 12);
});

// ---- registro do agente ----

test('o agente se declara publico e com o nome que o descobridor procura', async () => {
  installStub([]);
  const { createAgent } = await load();
  const agent = createAgent();
  assert.equal(agent.agentName, 'agentSpecFrontend');
  assert.equal(agent.agentProject, 102020);
  assert.equal(agent.visibility, 'public');
  assert.equal(typeof agent.beforePromptImplicit, 'function');
  assert.equal(typeof agent.afterPromptStep, 'function');
});
