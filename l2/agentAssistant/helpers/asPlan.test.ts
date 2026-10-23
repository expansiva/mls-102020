/// <mls fileReference="_102020_/l2/agentAssistant/helpers/asPlan.test.ts" enhancement="_blank"/>

// The three conversations the agent was built for, end to end over the fixture app (the model's
// interpretation is given; the BFF is fake). Each test walks planNext -> applyAnswers until the
// command's wire params are built.

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalog } from '/_102020_/l2/agentAssistant/helpers/asCatalog.js';
import {
  AS_CONFIRM_OPTION,
  AS_CONFIRM_QUESTION,
  AS_ROUTE_QUESTION,
  advance,
  applyAnswers,
  buildWireInput,
  createState,
  finalFor,
  findCommand,
  outcomeTitle,
  parseDecimal,
  parseState,
  planNext,
  validateValue,
} from '/_102020_/l2/agentAssistant/helpers/asPlan.js';
import type { AsCandidate, AsInputField, AsNext, AsPending } from '/_102020_/l2/agentAssistant/helpers/asTypes.js';
import { fakeBff, fixtureModule } from '/_102020_/l2/agentAssistant/helpers/asFixture.test.js';
import { asLabelsFor } from '/_102020_/l2/agentAssistant/helpers/asLabels.js';

const catalog = buildCatalog([fixtureModule()]);

function pendingOf(next: AsNext): AsPending {
  assert.equal(next.kind, 'ask', `expected a question round, got ${JSON.stringify(next)}`);
  return (next as { kind: 'ask'; pending: AsPending }).pending;
}

const LANCAR: AsCandidate = {
  route: 'resto.atendimento.lancarItem',
  title: 'Lançar salada na comanda da mesa 1',
  reason: 'Adicionar um item a uma comanda.',
  values: { 'details.quantidade': '1' },
  refs: {
    comandaId: { lookupRoute: 'resto.fechamento.comandasAbertas', lookupParams: {}, matchEntity: 'Mesa', matchText: '1' },
    itemCardapioId: { lookupRoute: 'resto.cardapio.itens', lookupParams: {}, matchEntity: 'ItemCardapio', matchText: 'salada' },
  },
};

const CADASTRAR: AsCandidate = {
  route: 'resto.cardapio.cadastrarItemCardapio',
  title: 'Cadastrar salada no cardápio',
  reason: 'Criar um item novo no cardápio.',
  values: { name: 'Salada' },
  refs: {},
};

test('"adicione uma salada na mesa 1": the table resolves the comanda, the salad is asked, then confirm', async () => {
  const bff = fakeBff();
  let { state, next } = await planNext(createState(1, 'adicione uma salada na mesa 1', 'pt-BR', '', [LANCAR]), catalog, bff.call);

  // mesa 1 -> exactly one open comanda: picked without asking
  assert.deepEqual(state.picked.comandaId, { id: 'c-12', label: 'Comanda 12 · Mesa 1', version: 3 });
  // "salada" matches two menu items: one question with both, nothing else asked
  const ask = pendingOf(next);
  assert.deepEqual(ask.questions.map(question => question.id), ['ref:itemCardapioId']);
  assert.deepEqual(ask.questions[0].options.map(option => option.label), ['Item do cardápio Salada Caesar', 'Item do cardápio Salada Verde']);

  ({ state } = applyAnswers(state, [{ id: 'ref:itemCardapioId', optionId: 'i-2' }]));
  ({ state, next } = await planNext(state, catalog, bff.call));
  const confirm = pendingOf(next);
  assert.equal(confirm.kind, 'confirm');
  assert.match(confirm.questions[0].question, /Comanda: Comanda 12 · Mesa 1/);
  assert.match(confirm.questions[0].question, /Item do cardápio: Item do cardápio Salada Verde/);
  assert.match(confirm.questions[0].question, /Quantidade: 1/);

  const confirmed = applyAnswers(state, [{ id: AS_CONFIRM_QUESTION, optionId: AS_CONFIRM_OPTION }]);
  assert.equal(confirmed.confirmed, true);
  const command = findCommand(catalog, confirmed.state.route);
  assert.ok(command);
  assert.deepEqual(buildWireInput(confirmed.state, command), { comandaId: 'c-12', itemCardapioId: 'i-2', details: { quantidade: 1 } });
  // no command was sent while planning
  assert.equal(bff.calls.some(call => call.routine === 'resto.atendimento.lancarItem'), false);
});

test('"adicione uma salada": two actions -> choose; "cardápio" -> only the price is asked -> confirm', async () => {
  const bff = fakeBff();
  let { state, next } = await planNext(createState(1, 'adicione uma salada', 'pt-BR', '', [LANCAR_WITHOUT_TABLE(), CADASTRAR]), catalog, bff.call);
  const choose = pendingOf(next);
  assert.deepEqual(choose.questions.map(question => question.id), [AS_ROUTE_QUESTION]);
  assert.deepEqual(choose.questions[0].options.map(option => option.label), ['Lançar salada em uma comanda', 'Cadastrar salada no cardápio']);
  assert.equal(bff.calls.length, 0, 'no lookup before the action is chosen');

  ({ state } = applyAnswers(state, [{ id: AS_ROUTE_QUESTION, optionId: CADASTRAR.route }]));
  ({ state, next } = await planNext(state, catalog, bff.call));
  const fields = pendingOf(next);
  // the name came from the sentence; only the price is missing
  assert.deepEqual(fields.questions.map(question => [question.id, question.title, question.allowNotes]), [['val:details.details.precoVigente', 'Preço vigente', true]]);

  ({ state } = applyAnswers(state, [{ id: 'val:details.details.precoVigente', optionId: '', notes: 'R$ 25,90' }]));
  ({ state, next } = await planNext(state, catalog, bff.call));
  assert.equal(pendingOf(next).kind, 'confirm');
  const command = findCommand(catalog, state.route);
  assert.ok(command);
  assert.deepEqual(buildWireInput(state, command), { name: 'Salada', details: { details: { precoVigente: '25.90' } } });
});

function LANCAR_WITHOUT_TABLE(): AsCandidate {
  return { ...LANCAR, title: 'Lançar salada em uma comanda', refs: { itemCardapioId: LANCAR.refs.itemCardapioId } };
}

test('an invalid value is asked again with the reason', async () => {
  const bff = fakeBff();
  const start = createState(1, 'cadastre salada por abc', 'pt-BR', '', [{ ...CADASTRAR, values: { name: 'Salada', 'details.details.precoVigente': 'abc' } }]);
  const { next } = await planNext(start, catalog, bff.call);
  const question = pendingOf(next).questions[0];
  assert.equal(question.id, 'val:details.details.precoVigente');
  assert.match(question.question, /"abc" não é um valor válido para Preço vigente/);
});

test('typed text on a record question is a new search over every display value', async () => {
  const bff = fakeBff();
  const start = createState(1, 'adicione uma salada na mesa 7', 'pt-BR', '', [{
    ...LANCAR,
    refs: { ...LANCAR.refs, comandaId: { ...LANCAR.refs.comandaId, matchText: '7' } },
  }]);
  let { state, next } = await planNext(start, catalog, bff.call);
  const notFound = pendingOf(next).questions.find(question => question.id === 'ref:comandaId');
  assert.ok(notFound);
  assert.match(notFound.question, /Não encontrei "7"/);
  assert.equal(notFound.options.length, 3, 'every open comanda is offered');

  ({ state } = applyAnswers(state, [
    { id: 'ref:comandaId', optionId: 'c-12', notes: '20' },
    { id: 'ref:itemCardapioId', optionId: 'i-1' },
  ]));
  ({ state, next } = await planNext(state, catalog, bff.call));
  assert.equal(state.picked.comandaId?.id, 'c-20', 'the typed comanda number wins over the pre-selected option');
  assert.equal(pendingOf(next).kind, 'confirm');
});

test('a transition sends the version of the record it acts on', async () => {
  const bff = fakeBff();
  const start = createState(1, 'feche a comanda 15 no pix', 'pt-BR', '', [{
    route: 'resto.fechamento.fecharComanda',
    title: 'Fechar a comanda 15',
    reason: '',
    values: { 'details.paymentMethod': 'Pix' },
    refs: { id: { lookupRoute: 'resto.fechamento.comandasAbertas', lookupParams: {}, matchEntity: 'Comanda', matchText: '15' } },
  }]);
  const { state, next } = await planNext(start, catalog, bff.call);
  assert.equal(pendingOf(next).kind, 'confirm');
  const command = findCommand(catalog, state.route);
  assert.ok(command);
  // the enum label "Pix" the model copied resolves to the wire value
  assert.deepEqual(buildWireInput(state, command), { id: 'c-15', version: 1, details: { paymentMethod: 'pix' } });
});

test('no candidate answers with the model reply (or the default)', async () => {
  const bff = fakeBff();
  const withReply = await planNext(createState(1, 'qual a previsão do tempo?', 'pt-BR', 'Este app não trata previsão do tempo.', []), catalog, bff.call);
  assert.deepEqual(withReply.next, { kind: 'reply', text: 'Este app não trata previsão do tempo.' });
  const unknownRoute = await planNext(createState(1, 'x', 'en', '', [{ ...CADASTRAR, route: 'resto.nope' }]), catalog, bff.call);
  assert.equal(unknownRoute.next.kind, 'reply');
});

test('cancelling the confirmation is not a confirmation', async () => {
  const state = { ...createState(1, 'x', 'pt', '', [CADASTRAR]), pending: null };
  assert.equal(applyAnswers(state, [{ id: AS_CONFIRM_QUESTION, optionId: '' }]).confirmed, false);
});

test('the state survives the task memory round trip and rejects foreign payloads', () => {
  const state = createState(102047, 'x', 'pt', '', [CADASTRAR]);
  assert.deepEqual(parseState(JSON.stringify(state)), state);
  assert.equal(parseState('{"schema":"other"}'), null);
  assert.equal(parseState('not json'), null);
  assert.equal(parseState(undefined), null);
});

const field = (overrides: Partial<AsInputField>): AsInputField => ({
  path: 'x', label: 'X', description: '', wireType: 'string', valueType: 'string', enumValues: [], required: true, role: 'value', ref: '', ...overrides,
});

test('values are validated and typed by the catalog, not by the model', () => {
  assert.deepEqual(validateValue(field({ wireType: 'number', valueType: 'integer' }), '3'), { ok: true, value: 3 });
  assert.deepEqual(validateValue(field({ wireType: 'number', valueType: 'integer' }), '2,5'), { ok: false });
  assert.deepEqual(validateValue(field({ valueType: 'money' }), 'R$ 1.234,56'), { ok: true, value: '1234.56' });
  assert.deepEqual(validateValue(field({ wireType: 'boolean' }), 'sim'), { ok: true, value: true });
  assert.deepEqual(validateValue(field({ enumValues: [{ value: 'creditCard', label: 'Cartão de crédito' }] }), 'cartao de credito'), { ok: true, value: 'creditCard' });
  assert.deepEqual(validateValue(field({ enumValues: [{ value: 'cash', label: 'Dinheiro' }] }), 'cheque'), { ok: false });
});

test('decimals in both notations', () => {
  assert.equal(parseDecimal('25'), 25);
  assert.equal(parseDecimal('25,9'), 25.9);
  assert.equal(parseDecimal('1.234,56'), 1234.56);
  assert.equal(parseDecimal('1,234.56'), 1234.56);
  assert.equal(parseDecimal('abc'), null);
});

// ---- sequences: several actions in one sentence ----

const ABRIR_MESA = (code: string): AsCandidate => ({
  route: 'resto.atendimento.abrirComanda',
  title: `Abrir comanda para a mesa ${code}`,
  reason: '',
  values: {},
  refs: { mesaId: { lookupRoute: 'resto.mesas.todas', lookupParams: {}, matchEntity: 'Mesa', matchText: code } },
});

const LANCAR_NA_MESA = (code: string, item: string, quantidade: string): AsCandidate => ({
  route: 'resto.atendimento.lancarItem',
  title: `Lançar ${quantidade} ${item} na mesa ${code}`,
  reason: '',
  values: { 'details.quantidade': quantidade },
  refs: {
    comandaId: { lookupRoute: 'resto.fechamento.comandasAbertas', lookupParams: {}, matchEntity: 'Mesa', matchText: code },
    itemCardapioId: { lookupRoute: 'resto.cardapio.itens', lookupParams: {}, matchEntity: 'ItemCardapio', matchText: item },
  },
});

const commandsSent = (calls: Array<{ routine: string; params: Record<string, unknown> }>) =>
  calls.filter(call => call.routine === 'resto.atendimento.abrirComanda' || call.routine === 'resto.atendimento.lancarItem');

test('"abrir comanda para a mesa 2 e lançar 1 bife": one plan confirmation, then both run in order', async () => {
  const bff = fakeBff();
  const start = createState(1, 'abrir comanda para a mesa 2 e lançar 1 bife', 'pt-BR', '', [ABRIR_MESA('2'), LANCAR_NA_MESA('2', 'bife', '1')], 'sequence');
  let { state, next } = await advance(start, catalog, bff.call);

  // the plan is confirmed as a whole; nothing was looked up or sent yet
  const plan = pendingOf(next);
  assert.equal(plan.kind, 'confirm');
  assert.equal(plan.questions[0].question, '1. Abrir comanda para a mesa 2\n2. Lançar 1 bife na mesa 2');
  assert.equal(bff.calls.length, 0);

  ({ state } = applyAnswers(state, [{ id: AS_CONFIRM_QUESTION, optionId: AS_CONFIRM_OPTION }]));
  ({ state, next } = await advance(state, catalog, bff.call));

  assert.equal(next.kind, 'finished');
  // the second action found the comanda the first one opened (table 2 had none before)
  assert.deepEqual(commandsSent(bff.calls), [
    { routine: 'resto.atendimento.abrirComanda', params: { mesaId: 'm-2' } },
    { routine: 'resto.atendimento.lancarItem', params: { comandaId: 'c-new-2', itemCardapioId: 'i-5', details: { quantidade: 1 } } },
  ]);
  assert.deepEqual(state.results.map(result => result.ok), [true, true]);
  assert.equal(outcomeTitle(state.results, asLabelsFor('pt')), 'Feito: Abrir comanda para a mesa 2 · Lançar 1 bife na mesa 2');
});

test('a question in the middle of a sequence says what is done and runs the action on continue', async () => {
  const bff = fakeBff();
  const start = createState(1, 'abra a mesa 2 e lance uma salada', 'pt-BR', '', [ABRIR_MESA('2'), LANCAR_NA_MESA('2', 'salada', '1')], 'sequence');
  let { state } = await advance(start, catalog, bff.call);
  ({ state } = applyAnswers(state, [{ id: AS_CONFIRM_QUESTION, optionId: AS_CONFIRM_OPTION }]));
  let next: AsNext;
  ({ state, next } = await advance(state, catalog, bff.call));

  // the comanda is open; "salada" is ambiguous, so the run stops at a question (no confirm round after)
  const round = pendingOf(next);
  assert.equal(round.kind, 'questions');
  assert.deepEqual(round.questions.map(question => question.id), ['ref:itemCardapioId']);
  assert.equal(round.intro, 'Feito: Abrir comanda para a mesa 2\nAgora: Lançar 1 salada na mesa 2\nAo continuar, esta ação será executada.');
  assert.equal(commandsSent(bff.calls).length, 1);

  ({ state } = applyAnswers(state, [{ id: 'ref:itemCardapioId', optionId: 'i-1' }]));
  ({ state, next } = await advance(state, catalog, bff.call));
  assert.equal(next.kind, 'finished');
  assert.deepEqual(commandsSent(bff.calls).map(call => call.routine), ['resto.atendimento.abrirComanda', 'resto.atendimento.lancarItem']);
});

test('a failing action stops the sequence: nothing after it is sent', async () => {
  const bff = fakeBff();
  // table 1 already has an open comanda: the fake refuses to open another one
  const start = createState(1, 'abra a mesa 1 e lance um bife', 'pt-BR', '', [ABRIR_MESA('1'), LANCAR_NA_MESA('1', 'bife', '1')], 'sequence');
  let { state } = await advance(start, catalog, bff.call);
  ({ state } = applyAnswers(state, [{ id: AS_CONFIRM_QUESTION, optionId: AS_CONFIRM_OPTION }]));
  let next: AsNext;
  ({ state, next } = await advance(state, catalog, bff.call));
  assert.equal(next.kind, 'finished');
  assert.deepEqual(commandsSent(bff.calls).map(call => call.routine), ['resto.atendimento.abrirComanda']);
  assert.equal(outcomeTitle(state.results, asLabelsFor('pt')), 'Não foi possível executar: Abrir comanda para a mesa 1 — A mesa já tem uma comanda aberta.');
});

test('the same command twice in a sequence runs twice', async () => {
  const bff = fakeBff();
  const start = createState(1, 'lance um bife e dois sucos na mesa 4', 'pt-BR', '', [LANCAR_NA_MESA('4', 'bife', '1'), LANCAR_NA_MESA('4', 'suco', '2')], 'sequence');
  let { state } = await advance(start, catalog, bff.call);
  ({ state } = applyAnswers(state, [{ id: AS_CONFIRM_QUESTION, optionId: AS_CONFIRM_OPTION }]));
  ({ state } = await advance(state, catalog, bff.call));
  assert.deepEqual(commandsSent(bff.calls).map(call => call.params), [
    { comandaId: 'c-20', itemCardapioId: 'i-5', details: { quantidade: 1 } },
    { comandaId: 'c-20', itemCardapioId: 'i-3', details: { quantidade: 2 } },
  ]);
});

test('a single action still asks for its own confirmation before anything is sent', async () => {
  const bff = fakeBff();
  const start = createState(1, 'lance um bife na mesa 4', 'pt-BR', '', [LANCAR_NA_MESA('4', 'bife', '1')], 'sequence');
  assert.equal(start.mode, 'alternatives', 'a sequence of one is just that action');
  let { state, next } = await advance(start, catalog, bff.call);
  assert.equal(pendingOf(next).kind, 'confirm');
  assert.equal(commandsSent(bff.calls).length, 0);
  ({ state } = applyAnswers(state, [{ id: AS_CONFIRM_QUESTION, optionId: AS_CONFIRM_OPTION }]));
  ({ next } = await advance(state, catalog, bff.call));
  assert.equal(next.kind, 'finished');
  assert.equal(commandsSent(bff.calls).length, 1);
});

// ---- questions: one query, no confirmation, the data goes to the answer step ----

test('"qual o valor total da comanda 12?": the query runs at once and its data is kept for the answer', async () => {
  const bff = fakeBff();
  const start = createState(1, 'qual o valor total da comanda 12?', 'pt-BR', '', [{
    route: 'resto.fechamento.comandasAbertas', title: 'Consultar a comanda 12', reason: '', values: { number: '12' }, refs: {},
  }], 'question');
  assert.equal(start.authorized, true, 'a question only reads: nothing to confirm');
  const { state, next } = await advance(start, catalog, bff.call);
  assert.equal(next.kind, 'finished');
  // typed filter + first page, and nothing else was called
  assert.deepEqual(bff.calls, [{ routine: 'resto.fechamento.comandasAbertas', params: { number: 12, page: 1, pageSize: 50 } }]);
  const data = state.results[0].data as { lista: { items: Array<{ details: { totalComanda: string } }> } };
  assert.equal(data.lista.items[0].details.totalComanda, '57.90');
  assert.deepEqual(finalFor(state, next, asLabelsFor('pt')), { kind: 'answer', text: '' });
});

test('a question that names an ambiguous record asks which one, then runs without a confirmation', async () => {
  const bff = fakeBff();
  const start = createState(1, 'qual o preço da salada?', 'pt-BR', '', [{
    route: 'resto.cardapio.obterItem', title: 'Consultar o preço da salada', reason: '', values: {},
    refs: { id: { lookupRoute: 'resto.cardapio.itens', lookupParams: {}, matchEntity: 'ItemCardapio', matchText: 'salada' } },
  }], 'question');
  let { state, next } = await advance(start, catalog, bff.call);
  assert.deepEqual(pendingOf(next).questions.map(question => question.id), ['ref:id']);
  ({ state } = applyAnswers(state, [{ id: 'ref:id', optionId: 'i-2' }]));
  ({ state, next } = await advance(state, catalog, bff.call));
  assert.equal(next.kind, 'finished');
  assert.deepEqual(bff.calls[bff.calls.length - 1], { routine: 'resto.cardapio.obterItem', params: { id: 'i-2' } });
});

test('a failed query and a sentence nothing fits both end in a message the user reads', async () => {
  const labels = asLabelsFor('pt');
  const failing = createState(1, 'qual o preço do item x?', 'pt-BR', '', [{
    route: 'resto.cardapio.obterItem', title: 'Consultar o item x', reason: '', values: {},
    refs: {},
  }], 'question');
  // force an unknown id through the free path: the fake answers NOT_FOUND
  const picked = { ...failing, route: 'resto.cardapio.obterItem', title: 'Consultar o item x', picked: { id: { id: 'nope', label: 'nope' } } };
  const failed = await advance(picked, catalog, fakeBff().call);
  assert.deepEqual(finalFor(failed.state, failed.next, labels), { kind: 'message', text: 'Não foi possível executar: Consultar o item x — Item não encontrado.' });

  const nothing = await advance(createState(1, 'previsão do tempo', 'pt-BR', 'Este app não trata isso.', []), catalog, fakeBff().call);
  assert.deepEqual(finalFor(nothing.state, nothing.next, labels), { kind: 'message', text: 'Este app não trata isso.' });
});

test('a finished command run needs no answer screen: its result step is the outcome', async () => {
  const bff = fakeBff();
  let { state } = await advance(createState(1, 'lance um bife na mesa 4', 'pt-BR', '', [LANCAR_NA_MESA('4', 'bife', '1')]), catalog, bff.call);
  ({ state } = applyAnswers(state, [{ id: AS_CONFIRM_QUESTION, optionId: AS_CONFIRM_OPTION }]));
  const done = await advance(state, catalog, bff.call);
  assert.equal(done.next.kind, 'finished');
  assert.equal(finalFor(done.state, done.next, asLabelsFor('pt')), null);
  assert.equal(done.state.results[0].data, null, 'a command response is not kept in the task memory');
});

// ---- optional records and dates ----

test('an optional record the user did not mention is neither asked nor sent', async () => {
  const bff = fakeBff();
  const { state, next } = await advance(createState(1, 'lance um bife na mesa 4', 'pt-BR', '', [LANCAR_NA_MESA('4', 'bife', '1')]), catalog, bff.call);
  const confirm = pendingOf(next);
  assert.equal(confirm.kind, 'confirm', 'no question about substituiItemId');
  const command = findCommand(catalog, state.route);
  assert.ok(command);
  assert.equal('substituiItemId' in buildWireInput(state, command), false);
});

test('an optional record the user DID mention is resolved like any other', async () => {
  const bff = fakeBff();
  const candidate = LANCAR_NA_MESA('4', 'bife', '1');
  candidate.refs.substituiItemId = { lookupRoute: 'resto.cardapio.itens', lookupParams: {}, matchEntity: 'ItemCardapio', matchText: 'suco' };
  const { state } = await advance(createState(1, 'lance um bife na mesa 4 no lugar do suco', 'pt-BR', '', [candidate]), catalog, bff.call);
  assert.equal(state.picked.substituiItemId?.id, 'i-3');
});

const dateField = field({ valueType: 'date', label: 'Prazo' });
const stampField = field({ valueType: 'timestamp', label: 'Início' });

test('date values become ISO days; anything else is rejected, never sent as text', () => {
  assert.deepEqual(validateValue(dateField, '2026-10-22'), { ok: true, value: '2026-10-22' });
  assert.deepEqual(validateValue(dateField, '22/10/2026'), { ok: true, value: '2026-10-22' });
  assert.deepEqual(validateValue(dateField, '5/1/2027'), { ok: true, value: '2027-01-05' });
  assert.deepEqual(validateValue(dateField, 'amanhã'), { ok: false });
  assert.deepEqual(validateValue(dateField, '31/02/2026'), { ok: false });
});

test('timestamp values become ISO instants (local time when written without zone)', () => {
  const local = validateValue(stampField, '22/10/2026 14:30');
  assert.equal(local.ok, true);
  assert.equal(local.ok && local.value, new Date(2026, 9, 22, 14, 30).toISOString());
  assert.deepEqual(validateValue(stampField, '2026-10-22T14:30:00Z'), { ok: true, value: '2026-10-22T14:30:00.000Z' });
  assert.deepEqual(validateValue(stampField, '22/10/2026 25:00'), { ok: false });
});

test('a date the model could not resolve is asked again, with the date format as hint', async () => {
  const bff = fakeBff();
  const comPrazo = buildCatalog([fixtureModule()]);
  const lancar = comPrazo.commands.find(item => item.route === 'resto.atendimento.lancarItem');
  assert.ok(lancar);
  lancar.inputs.push(field({ path: 'details.prazo', label: 'Prazo', valueType: 'date' }));
  const start = createState(1, 'lance um bife na mesa 4 para amanhã', 'pt-BR', '', [{ ...LANCAR_NA_MESA('4', 'bife', '1'), values: { 'details.quantidade': '1', 'details.prazo': 'amanhã' } }]);
  let { state, next } = await advance(start, comPrazo, bff.call);
  const question = pendingOf(next).questions.find(item => item.id === 'val:details.prazo');
  assert.ok(question);
  assert.match(question.question, /"amanhã" não é um valor válido para Prazo/);
  assert.equal(question.notesPlaceholder, 'DD/MM/AAAA');
  ({ state } = applyAnswers(state, [{ id: 'val:details.prazo', optionId: '', notes: '22/10/2026' }]));
  ({ state, next } = await advance(state, comPrazo, bff.call));
  const confirm = pendingOf(next);
  assert.match(confirm.questions[0].question, /Prazo: 22\/10\/2026/);
  const command = findCommand(comPrazo, state.route);
  assert.ok(command);
  assert.equal((buildWireInput(state, command).details as Record<string, unknown>).prazo, '2026-10-22');
});
