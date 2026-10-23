/// <mls fileReference="_102020_/l2/agentAssistant/helpers/asManual.test.ts" enhancement="_blank"/>

// The user manual is read from the app's defs only. Fixture in the generators' shapes, joined to the
// catalog fixture (module 'resto') so a journey reaches the screen where its action happens.

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalog } from '/_102020_/l2/agentAssistant/helpers/asCatalog.js';
import { buildManual, manualContext, manualIndex, pagesOfJourney, type AsManualSources } from '/_102020_/l2/agentAssistant/helpers/asManual.js';
import { fixtureModule } from '/_102020_/l2/agentAssistant/helpers/asFixture.test.js';

const mod = (name: string, body: unknown) => `export const ${name} = ${JSON.stringify(body)} as const satisfies X;\n`;

const RESTO: AsManualSources = {
  module: 'resto',
  moduleDef: mod('m', { moduleName: 'resto', title: 'Comanda de Restaurante' }),
  access: mod('a', { actors: [
    { actorId: 'garcom', title: 'Garçom', description: 'Abre comandas e lança itens.' },
    { actorId: 'caixa', title: 'Caixa', description: 'Fecha comandas e registra o pagamento.' },
  ] }),
  rules: mod('r', { rules: { descontoNaoExcedeSubtotal: 'O desconto não pode exceder o subtotal da comanda.' } }),
  journeys: [mod('j', {
    journeyId: 'fecharComanda',
    business: {
      actorRef: 'caixa',
      title: 'Fechar comanda e liberar mesa',
      goal: 'Registrar o pagamento e encerrar a comanda.',
      steps: [
        { stepId: 'localizar', kind: 'locate', entity: 'Comanda', title: 'Localizar comanda aberta', description: 'Pelo número ou pela mesa.' },
        { stepId: 'fechar', kind: 'act', entity: 'Comanda', effect: 'transition', transitionRef: 'fecharComanda', title: 'Registrar pagamento e fechar', description: 'Desconto opcional e forma de pagamento.' },
      ],
      outcome: { statement: 'A comanda é encerrada.', evidence: ['Mesa indicada como disponível.'] },
    },
  }), mod('j2', {
    journeyId: 'lancarItem',
    business: { actorRef: 'garcom', title: 'Lançar item na comanda', goal: 'Registrar o pedido.', steps: [
      { stepId: 'lancar', kind: 'act', entity: 'ItemComanda', effect: 'create', title: 'Lançar o item', description: 'Item e quantidade.' },
    ], outcome: { statement: 'O item entra na comanda.', evidence: [] } },
  })],
  menuJson: JSON.stringify({
    tree: [
      { id: 'operacao', kind: 'hub', label: 'Operação', children: [
        { id: 'atendimento', kind: 'page', label: 'Atendimento', organisms: [{ kind: 'actions', text: 'Lanço itens na comanda.' }] },
      ] },
      { id: 'fechamento', kind: 'page', label: 'Fechamento', organisms: [{ kind: 'actions', text: 'Fecho a comanda paga.' }] },
    ],
    authorities: { 'actor:garcom': ['atendimento'], 'actor:caixa': ['fechamento'] },
  }),
  pageDefs: [{ pageId: 'fechamento', text: mod('definition', {
    intent: 'O caixa localiza a comanda, confere e fecha.',
    sections: [{ id: 's1', purpose: 'Achar a comanda pelo número ou pela mesa.' }, { id: 's2', purpose: 'Registrar o pagamento e fechar.' }],
  }) }],
  controllers: [
    mod('definition', { data: { pageId: 'fechamento', handlers: [{ route: 'resto.fechamento.fecharComanda', kind: 'command' }, { route: 'resto.fechamento.comandasAbertas', kind: 'query' }] } }),
    mod('definition', { data: { pageId: 'atendimento', handlers: [{ route: 'resto.atendimento.lancarItem', kind: 'command' }] } }),
  ],
};

const SEM_BACKEND: AsManualSources = {
  module: 'estoque', moduleDef: mod('m', { title: 'Controle de Estoque' }), access: '', rules: '', journeys: [],
  menuJson: JSON.stringify({ tree: [{ id: 'produtos', kind: 'page', label: 'Produtos' }] }), pageDefs: [], controllers: [],
};

const manual = buildManual([RESTO, SEM_BACKEND]);
const catalog = buildCatalog([fixtureModule()]);

test('every module enters the manual, with or without a backend', () => {
  assert.deepEqual(manual.modules.map(item => [item.module, item.title]), [['resto', 'Comanda de Restaurante'], ['estoque', 'Controle de Estoque']]);
});

test('screens come from the menu (hubs included), who sees them from its authorities', () => {
  const pages = manual.modules[0].pages;
  assert.deepEqual(pages.map(page => [page.pageId, page.hub, page.label, page.actors]), [
    ['atendimento', 'Operação', 'Atendimento', ['Garçom']],
    ['fechamento', '', 'Fechamento', ['Caixa']],
  ]);
  assert.equal(pages[1].intent, 'O caixa localiza a comanda, confere e fecha.');
  assert.deepEqual(pages[1].routes, ['resto.fechamento.fecharComanda', 'resto.fechamento.comandasAbertas']);
});

test('a journey reaches the screen of its action by what the command writes (transition and create)', () => {
  const [fechar, lancar] = manual.modules[0].journeys;
  assert.deepEqual(pagesOfJourney(manual, fechar, catalog).map(page => page.pageId), ['fechamento']);
  assert.deepEqual(pagesOfJourney(manual, lancar, catalog).map(page => page.pageId), ['atendimento']);
});

test('the index the model sees is short and covers every module', () => {
  assert.deepEqual(manualIndex(manual), {
    modules: [{ module: 'resto', title: 'Comanda de Restaurante' }, { module: 'estoque', title: 'Controle de Estoque' }],
    pages: [
      { module: 'resto', pageId: 'atendimento', label: 'Operação › Atendimento' },
      { module: 'resto', pageId: 'fechamento', label: 'Fechamento' },
      { module: 'estoque', pageId: 'produtos', label: 'Produtos' },
    ],
    journeys: [
      { module: 'resto', journeyId: 'fecharComanda', title: 'Fechar comanda e liberar mesa', actor: 'Caixa' },
      { module: 'resto', journeyId: 'lancarItem', title: 'Lançar item na comanda', actor: 'Garçom' },
    ],
  });
});

test('"como fechar uma comanda?": the journey brings who, steps, the screen, its fields and the rules', () => {
  const context = JSON.parse(manualContext(manual, { modules: [], pages: [], journeys: [{ module: 'resto', journeyId: 'fecharComanda' }] }, catalog));
  const resto = context.modules[0];
  assert.equal(resto.title, 'Comanda de Restaurante');
  assert.deepEqual(resto.rules, ['O desconto não pode exceder o subtotal da comanda.']);
  const journey = resto.journeys[0];
  assert.deepEqual([journey.who, journey.whereTheActionsHappen, journey.youWillSee], ['Caixa', ['Fechamento'], ['Mesa indicada como disponível.']]);
  assert.deepEqual(journey.steps.map((item: { title: string }) => item.title), ['Localizar comanda aberta', 'Registrar pagamento e fechar']);
  const screen = resto.screens[0];
  assert.equal(screen.screen, 'Fechamento');
  assert.deepEqual(screen.actions[0].fields, [{ field: 'Forma de pagamento', required: true, options: ['Dinheiro', 'Pix'] }]);
  // the other module is not dragged in
  assert.equal(context.modules.length, 1);
});

test('an empty selection is the overview of the whole app', () => {
  const context = JSON.parse(manualContext(manual, { modules: [], pages: [], journeys: [] }, catalog));
  assert.deepEqual(context.overview.map((item: { module: string }) => item.module), ['Comanda de Restaurante', 'Controle de Estoque']);
  assert.deepEqual(context.overview[0].tasks, ['Fechar comanda e liberar mesa', 'Lançar item na comanda']);
});

test('without the catalog the manual still answers, only without screen actions', () => {
  const context = JSON.parse(manualContext(manual, { modules: [], pages: [{ module: 'resto', pageId: 'fechamento' }], journeys: [] }, null));
  assert.deepEqual(context.modules[0].screens[0].actions, []);
});
