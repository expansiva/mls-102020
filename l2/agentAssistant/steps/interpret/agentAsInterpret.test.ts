/// <mls fileReference="_102020_/l2/agentAssistant/steps/interpret/agentAsInterpret.test.ts" enhancement="_blank"/>

// interpret is an LLM step: static checks always (tool schema lint, gate, prompt assembly); the
// live call to both strict-tool providers is gated behind AGENT_LIVE_TESTS.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { callToolProvider, liveRuns, liveTestsEnabled, parseEnvFile } from '/_102025_/l2/testLlmClient.js';
import { buildCatalog } from '/_102020_/l2/agentAssistant/helpers/asCatalog.js';
import { gateInterpretation } from '/_102020_/l2/agentAssistant/steps/interpret/gate.js';
import {
  AS_INTERPRET_TOOL,
  buildInterpretHumanPrompt,
  buildInterpretSystemPrompt,
  buildInterpretTool,
} from '/_102020_/l2/agentAssistant/steps/interpret/tool.js';
import { fixtureModule } from '/_102020_/l2/agentAssistant/helpers/asFixture.test.js';
import { todayInfo } from '/_102020_/l2/agentAssistant/helpers/asDates.js';
import { buildManual } from '/_102020_/l2/agentAssistant/helpers/asManual.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AGENT_ROOT = path.resolve(HERE, '../..');
const MLS_BASE = path.resolve(AGENT_ROOT, '../../..');
const schema = JSON.parse(readFileSync(path.join(AGENT_ROOT, 'schemas/interpret.schema.json'), 'utf8')) as Record<string, unknown>;
const promptMd = readFileSync(path.join(HERE, 'prompt.md'), 'utf8');
const catalog = buildCatalog([fixtureModule()]);
const TODAY = { date: '2026-10-21', weekday: 'Wednesday', time: '09:30' };

test('interpret tool schema is provider-clean', () => {
  assert.equal(lintToolSchema(JSON.stringify(buildInterpretTool(schema).function.parameters)), null);
});

test('every prompt.md of the agent declares its modelType on the first line', () => {
  for (const file of ['steps/interpret/prompt.md', 'steps/ask/prompt.md', 'steps/answer/prompt.md', 'steps/answer/envelope.md', 'steps/answer/manual.md']) {
    const firstLine = readFileSync(path.join(AGENT_ROOT, file), 'utf8').split('\n')[0];
    assert.match(firstLine, /^<!-- modelType: (classifier|general|reasoning|code|design|translate) -->$/, file);
  }
});

test('the prompt tells the model how to write date and timestamp values', () => {
  assert.match(promptMd, /`date` take `YYYY-MM-DD`/);
  assert.match(promptMd, /`timestamp` take\s+`YYYY-MM-DDTHH:mm`/);
});

test('the prompt carries no domain of the fixtures (prompts stay generic)', () => {
  assert.doesNotMatch(promptMd, /mesa|comanda|salad|card[aá]pio/i);
});

test('the human prompt carries the sentence and the compact catalog', () => {
  const human = buildInterpretHumanPrompt('adicione uma salada na mesa 1', catalog, TODAY);
  assert.match(human, /adicione uma salada na mesa 1/);
  // relative dates ("amanhã") are resolved by the model against this line
  assert.match(human, /## Today\n2026-10-21 \(Wednesday\), 09:30 local time/);
  assert.match(human, /"route":"resto\.atendimento\.lancarItem"/);
  assert.match(buildInterpretSystemPrompt(promptMd), new RegExp(`"${AS_INTERPRET_TOOL}"`));
});

test('the gate keeps what fits the catalog and drops (never repairs) what does not', () => {
  const { interpretation, issues } = gateInterpretation({
    userLanguage: 'pt-BR',
    reply: '',
    mode: 'alternatives',
    candidates: [
      {
        route: 'resto.atendimento.lancarItem',
        title: 'Lançar salada',
        reason: 'r',
        values: [
          { path: 'details.quantidade', value: '1' },
          { path: 'comandaId', value: 'c-12' },            // an id smuggled as a value
          { path: 'details.inexistente', value: 'x' },
        ],
        refs: [
          { path: 'itemCardapioId', lookupRoute: 'resto.cardapio.itens', lookupParams: [], matchEntity: 'ItemCardapio', matchText: 'salada' },
          { path: 'comandaId', lookupRoute: 'resto.cardapio.itens', lookupParams: [{ name: 'mesaCode', value: '1' }], matchEntity: 'Mesa', matchText: '1' },
        ],
      },
      { route: 'resto.mesas.removerMesa', title: 'x', reason: '', values: [], refs: [] }, // not registered
      { route: 'resto.atendimento.lancarItem', title: 'dup', reason: '', values: [], refs: [] },
    ],
  }, catalog);
  assert.deepEqual(interpretation.candidates.map(candidate => candidate.route), ['resto.atendimento.lancarItem']);
  const candidate = interpretation.candidates[0];
  assert.deepEqual(candidate.values, { 'details.quantidade': '1' });
  assert.deepEqual(candidate.refs.itemCardapioId, { lookupRoute: 'resto.cardapio.itens', lookupParams: {}, matchEntity: 'ItemCardapio', matchText: 'salada' });
  // a lookup that does not list Comanda is dropped, and so is its filter; the words survive
  assert.deepEqual(candidate.refs.comandaId, { lookupRoute: '', lookupParams: {}, matchEntity: 'Mesa', matchText: '1' });
  assert.deepEqual(issues.map(issue => issue.code).sort(), [
    'duplicate_route', 'invalid_lookup', 'invalid_lookup_param', 'invalid_value_path', 'invalid_value_path', 'unknown_route',
  ]);
});

test('no candidates keeps the reply for the user', () => {
  const { interpretation } = gateInterpretation({ userLanguage: 'en', reply: 'Not something this app does.', mode: 'alternatives', candidates: [] }, catalog);
  assert.deepEqual(interpretation, { userLanguage: 'en', reply: 'Not something this app does.', mode: 'alternatives', candidates: [], manual: null });
});

test('a question is answered by ONE query; commands are not queries and queries are not commands', () => {
  const query = { route: 'resto.fechamento.comandasAbertas', title: 'Consultar', reason: '', values: [{ path: 'number', value: '12' }], refs: [] };
  const command = { route: 'resto.atendimento.lancarItem', title: 'Lançar', reason: '', values: [], refs: [] };
  const asked = gateInterpretation({ userLanguage: 'pt', reply: '', mode: 'question', candidates: [query, { ...query, title: 'extra' }] }, catalog);
  assert.equal(asked.interpretation.mode, 'question');
  assert.deepEqual(asked.interpretation.candidates.map(candidate => [candidate.route, candidate.values]), [[query.route, { number: '12' }]]);
  assert.deepEqual(asked.issues.map(issue => issue.code), ['too_many_candidates']);
  const wrongPool = gateInterpretation({ userLanguage: 'pt', reply: '', mode: 'question', candidates: [command] }, catalog);
  assert.deepEqual([wrongPool.interpretation.mode, wrongPool.interpretation.candidates.length], ['alternatives', 0]);
  const queryAsCommand = gateInterpretation({ userLanguage: 'pt', reply: '', mode: 'alternatives', candidates: [query] }, catalog);
  assert.equal(queryAsCommand.interpretation.candidates.length, 0);
});

test('manual: only items of the app map survive; an empty selection is the whole app', () => {
  const manual = buildManual([{
    module: 'resto', moduleDef: 'export const m = {"title":"Comanda"};', access: '', rules: '',
    journeys: ['export const j = {"journeyId":"fecharComanda","business":{"title":"Fechar comanda","actorRef":"caixa","steps":[]}};'],
    menuJson: '{"tree":[{"id":"fechamento","kind":"page","label":"Fechamento"}]}', pageDefs: [], controllers: [],
  }]);
  const picked = gateInterpretation({ userLanguage: 'pt', reply: 'x', mode: 'manual', candidates: [{ route: 'resto.atendimento.lancarItem' }], manual: {
    modules: ['resto', 'nope'],
    pages: [{ module: 'resto', pageId: 'fechamento' }, { module: 'resto', pageId: 'nope' }],
    journeys: [{ module: 'resto', journeyId: 'fecharComanda' }],
  } }, catalog, manual);
  assert.deepEqual(picked.interpretation, {
    userLanguage: 'pt', reply: '', mode: 'manual', candidates: [],
    manual: { modules: ['resto'], pages: [{ module: 'resto', pageId: 'fechamento' }], journeys: [{ module: 'resto', journeyId: 'fecharComanda' }] },
  });
  assert.deepEqual(picked.issues.map(issue => issue.code), ['unknown_manual_module', 'unknown_manual_page']);
  const overview = gateInterpretation({ userLanguage: 'pt', reply: '', mode: 'manual', candidates: [], manual: { modules: [], pages: [], journeys: [] } }, catalog, manual);
  assert.deepEqual(overview.interpretation.manual, { modules: [], pages: [], journeys: [] });
});

test('manual without an app manual falls back to the old behaviour (a reply)', () => {
  const { interpretation, issues } = gateInterpretation({ userLanguage: 'pt', reply: 'Não sei.', mode: 'manual', candidates: [], manual: { modules: [], pages: [], journeys: [] } }, catalog);
  assert.deepEqual([interpretation.mode, interpretation.candidates.length, interpretation.manual], ['alternatives', 0, null]);
  assert.deepEqual(issues.map(issue => issue.code), ['manual_unavailable']);
});

test('the app map goes to the model only when the manual exists', () => {
  assert.match(buildInterpretHumanPrompt('como fecho uma comanda?', catalog, TODAY, { modules: [{ module: 'resto', title: 'Comanda' }] }), /## App map\n\{"modules":\[\{"module":"resto"/);
  assert.match(buildInterpretHumanPrompt('x', catalog, TODAY), /## App map\n\(not available: do not use mode "manual"\)/);
});

test('a sequence keeps every action in order, repeats included; a sequence of one is a single action', () => {
  const lancar = { route: 'resto.atendimento.lancarItem', title: 't', reason: '', values: [], refs: [] };
  const abrir = { route: 'resto.atendimento.abrirComanda', title: 't', reason: '', values: [], refs: [] };
  const sequence = gateInterpretation({ userLanguage: 'pt', reply: '', mode: 'sequence', candidates: [abrir, lancar, lancar] }, catalog);
  assert.equal(sequence.interpretation.mode, 'sequence');
  assert.deepEqual(sequence.interpretation.candidates.map(candidate => candidate.route), [abrir.route, lancar.route, lancar.route]);
  assert.deepEqual(sequence.issues, []);
  const alone = gateInterpretation({ userLanguage: 'pt', reply: '', mode: 'sequence', candidates: [abrir] }, catalog);
  assert.equal(alone.interpretation.mode, 'alternatives');
  const unknownMode = gateInterpretation({ userLanguage: 'pt', reply: '', mode: 'whatever', candidates: [abrir, lancar] }, catalog);
  assert.equal(unknownMode.interpretation.mode, 'alternatives');
});

// ---- live (gated): the real prompt + tool on both strict-tool providers ----

const config = () => parseEnvFile(readFileSync(path.join(MLS_BASE, '.env'), 'utf8'));

for (const modelType of ['code', 'design'] as const) {
  for (const sentence of ['adicione uma salada na mesa 1', 'adicione uma salada', 'abrir comanda para a mesa 2 e lançar 1 bife', 'qual o valor total da comanda 12?', 'como faço para fechar uma comanda?']) {
    void test(`interpret live @ ${modelType}: "${sentence}"`, { skip: !liveTestsEnabled() }, async () => {
      for (let run = 0; run < liveRuns(); run += 1) {
        const response = await callToolProvider(config(), {
          modelType,
          system: buildInterpretSystemPrompt(promptMd),
          human: buildInterpretHumanPrompt(sentence, catalog, todayInfo()),
          tool: buildInterpretTool(schema),
        });
        assert.ok(!response.schemaReject && response.status === 200, `schema rejected: ${response.text.slice(0, 200)}`);
        // callToolProvider already unwraps the tool call down to its `result` artifact
        const result = (response.args && typeof response.args === 'object' ? response.args : {}) as Record<string, unknown>;
        const { interpretation, issues } = gateInterpretation(result, catalog);
        if (issues.length) console.log(`[${modelType}] ${sentence}:`, issues.map(issue => issue.code).join(', '));
        const routes = interpretation.candidates.map(candidate => candidate.route);
        if (sentence.startsWith('como')) {
          // no app map in this live call: the model must not invent manual mode
          assert.notEqual(interpretation.mode, 'manual');
          return;
        }
        if (sentence.startsWith('qual')) {
          assert.equal(interpretation.mode, 'question');
          assert.deepEqual(routes, ['resto.fechamento.comandasAbertas']);
          return;
        }
        assert.ok(routes.includes('resto.atendimento.lancarItem'), `lancarItem missing: ${routes.join(', ')}`);
        if (sentence.startsWith('abrir')) {
          assert.equal(interpretation.mode, 'sequence');
          assert.deepEqual(routes, ['resto.atendimento.abrirComanda', 'resto.atendimento.lancarItem']);
        } else if (sentence.includes('mesa')) {
          assert.equal(interpretation.candidates[0].refs.comandaId?.matchText, '1');
        } else {
          assert.ok(routes.includes('resto.cardapio.cadastrarItemCardapio'), `the menu reading is missing: ${routes.join(', ')}`);
        }
      }
    });
  }
}
