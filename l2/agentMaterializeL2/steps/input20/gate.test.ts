/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/input20/gate.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { gateM4Input, m4ContextInputs, type M4GateInput, type M4InputProblem, type M4PageSources } from '/_102020_/l2/agentMaterializeL2/steps/input20/gate.js';

// Real defs of mls-102047/l2/controleEstoque as agentDefsL2 (d2_60) wrote them on 30/09/2026.
interface Fixture {
  project: number;
  module: string;
  defsPipelineStatus: string;
  knownMolecules: string[];
  knownTemplates: string[];
  pages: Record<string, { contract: string; shared: string; desktop: string; mobile: string }>;
}
/** Every page of a module as it is on disk today in mls-102047. */
function moduleInput(module: string): M4GateInput {
  const base = new URL(`../../../../../mls-102047/l2/${module}/web/`, import.meta.url);
  const read = (path: string) => { try { return readFileSync(new URL(path, base), 'utf8'); } catch { return null; } };
  const ids = readdirSync(new URL('shared/', base)).filter(name => name.endsWith('.defs.ts')).map(name => name.slice(0, -'.defs.ts'.length));
  return {
    project: 102047, module, defsPipelineStatus: 'complete', templateExists: () => true, moleculeExists: () => true,
    pages: ids.map(pageId => ({ pageId, sources: { contract: read(`contracts/${pageId}.defs.ts`), shared: read(`shared/${pageId}.defs.ts`), desktop: read(`desktop/page11/${pageId}.defs.ts`), mobile: read(`mobile/page11/${pageId}.defs.ts`) } })),
  };
}
const fixture = JSON.parse(readFileSync(new URL('./fixtures/controleEstoque.json', import.meta.url), 'utf8')) as Fixture;

function input(edit?: (pages: Record<string, M4PageSources['sources']>) => void, overrides: Partial<M4GateInput> = {}): M4GateInput {
  const pages: Record<string, M4PageSources['sources']> = {};
  for (const [pageId, row] of Object.entries(fixture.pages)) pages[pageId] = { ...row };
  edit?.(pages);
  return {
    project: fixture.project,
    module: fixture.module,
    defsPipelineStatus: fixture.defsPipelineStatus,
    pages: Object.entries(pages).map(([pageId, sources]) => ({ pageId, sources })),
    templateExists: category => fixture.knownTemplates.includes(category),
    moleculeExists: tag => fixture.knownMolecules.includes(tag),
    ...overrides,
  };
}
/** Edits the `definition` literal of a defs source and renders it back with the same header. */
function editDefinition(source: string, edit: (definition: Record<string, unknown>) => void): string {
  const start = source.indexOf('export const definition = ') + 'export const definition = '.length;
  const end = source.lastIndexOf(' as const;');
  const definition = JSON.parse(source.slice(start, end)) as Record<string, unknown>;
  edit(definition);
  return `${source.slice(0, start)}${JSON.stringify(definition, null, 2)}${source.slice(end)}`;
}
const codes = (problems: M4InputProblem[], page: string, severity: 'error' | 'warning') =>
  problems.filter(item => item.page === page && item.severity === severity).map(item => item.code).sort();
const find = (problems: M4InputProblem[], page: string, code: string) => problems.filter(item => item.page === page && item.code === code);

test('controleEstoque as generated on 30/09: both pages are accepted, with no prescriptive rule', () => {
  const result = gateM4Input(input());
  assert.deepEqual(result.accepted, ['movimentacoes', 'produtos']);
  assert.deepEqual(result.refused, []);
  assert.deepEqual(Object.keys(result.parsed).sort(), ['movimentacoes', 'produtos'], 'every file parses with the v2 grammar');
  assert.deepEqual(result.problems.filter(item => item.severity === 'error'), []);
  // 05/10/2026: the gate no longer prescribes code by function names; notes only state facts.
  assert.ok(result.problems.every(item => !/Provisional rule/u.test(item.message)));
  assert.equal(result.problems.filter(item => item.page === '*').length, 0);
});

test('methods: every intent and form submit resolves to the shared method that serves it', () => {
  const result = gateM4Input(input());
  assert.equal(result.parsed.produtos.methods.cadastrarProduto, 'cadastrarProduto');
  assert.equal(result.parsed.produtos.methods.abrirMovimentacoes, 'abrirMovimentacoes');
});

test('a submit or intent may name a request trigger: it resolves to the function that calls it (comandaRestaurante mesas)', () => {
  // mesas: forms submit `createMesa`, the trigger of request criarMesa, served by function criarMesa
  const result = gateM4Input(input(pages => {
    pages.produtos.shared = editDefinition(pages.produtos.shared!, definition => {
      const requests = definition.requests as Record<string, { trigger: string }>;
      requests.cadastrarProduto.trigger = 'createProduto';
      (definition.forms as Record<string, { submit: string }>).formularioProduto.submit = 'createProduto';
    });
    for (const device of ['desktop', 'mobile'] as const) pages.produtos[device] = pages.produtos[device]!.replace('"id": "cadastrarProduto"', '"id": "createProduto"');
  }));
  assert.ok(result.accepted.includes('produtos'));
  assert.equal(result.parsed.produtos.methods.createProduto, 'cadastrarProduto');
});

test('a name that resolves to nothing anywhere refuses the page', () => {
  const result = gateM4Input(input(pages => {
    pages.produtos.shared = editDefinition(pages.produtos.shared!, definition => {
      (definition.forms as Record<string, { submit: string }>).formularioProduto.submit = 'naoExiste';
    });
  }));
  assert.deepEqual(codes(result.problems, 'produtos', 'error'), ['M4_INPUT_UNRESOLVED']);
});

test('errors still refuse only the page that has them', () => {
  const result = gateM4Input(input(pages => {
    pages.movimentacoes.shared = editDefinition(pages.movimentacoes.shared!, definition => {
      (definition.functions as Record<string, { calls?: string }>).registrarMovimentacao.calls = 'naoExiste';
    });
  }));
  assert.deepEqual(codes(result.problems, 'movimentacoes', 'error'), ['M4_INPUT_FUNCTION_REF']);
  assert.deepEqual(result.accepted, ['produtos']);
  assert.deepEqual(result.refused, ['movimentacoes']);
});

test('missing and malformed files are refused per page, not per module', () => {
  const result = gateM4Input(input(pages => {
    pages.produtos.contract = null;
    pages.movimentacoes.mobile = pages.movimentacoes.mobile!.replace('"intent":', '"intento":');
  }));
  assert.deepEqual(find(result.problems, 'produtos', 'M4_INPUT_DEFS_MISSING').map(item => item.path), ['contract:']);
  assert.match(find(result.problems, 'movimentacoes', 'M4_INPUT_DEFS_FORMAT')[0].message, /forbidden field intento/u);
  assert.deepEqual(Object.keys(result.parsed), []);
});

test('the module is blocked while agentDefsL2 has not completed', () => {
  const result = gateM4Input(input(undefined, { defsPipelineStatus: 'failed' }));
  assert.equal(find(result.problems, '*', 'M4_INPUT_DEFS_PIPELINE_INCOMPLETE').length, 1);
  assert.deepEqual(result.accepted, []);
});

test('cross-references: a request with no route refuses; journeys, molecules and templates are notes', () => {
  const result = gateM4Input(input(pages => {
    pages.produtos.contract = pages.produtos.contract!.replace("'controleEstoque.produtos.cadastrarProduto'", "'controleEstoque.produtos.criarProduto'");
    pages.produtos.desktop = pages.produtos.desktop!.replace('"preferred": "groupviewtable--ml-data-table"', '"preferred": "groupviewtable--ml-nao-existe"');
  }, { templateExists: () => false }));
  assert.deepEqual(codes(result.problems, 'produtos', 'error'), ['M4_INPUT_ROUTE_MISSING']);
  const notes = codes(result.problems, 'produtos', 'warning');
  for (const code of ['M4_INPUT_ROUTE_EXTRA', 'M4_INPUT_MOLECULE_UNKNOWN', 'M4_INPUT_TEMPLATE_MISSING']) assert.ok(notes.includes(code), `${code} expected in ${notes.join(', ')}`);
});

test('molecules are optional: a page11 with no recommendation is accepted (controleEstoque test, 02/10/2026)', () => {
  const result = gateM4Input(input(pages => {
    for (const row of Object.values(pages)) {
      row.desktop = editDefinition(row.desktop!, definition => { delete definition.molecules; });
      row.mobile = editDefinition(row.mobile!, definition => { delete definition.molecules; });
    }
  }));
  assert.deepEqual(result.accepted, ['movimentacoes', 'produtos']);
  assert.deepEqual(result.problems.filter(item => item.severity === 'error'), []);
  assert.deepEqual(result.parsed.produtos.page11.desktop.molecules, {});
});

test('the current defs of three modules (controleEstoque, agendaClinica, comandaRestaurante) are accepted', () => {
  for (const module of ['controleEstoque', 'comandaRestaurante']) {
    const result = gateM4Input(moduleInput(module));
    assert.deepEqual(result.refused, [], `${module}: ${result.problems.filter(item => item.severity === 'error').map(item => `${item.page} ${item.code}`).join('; ')}`);
  }
  assert.equal(gateM4Input(moduleInput('comandaRestaurante')).parsed.mesas.methods.createMesa, 'criarMesa');
  // agendaClinica/pacientes has no contract on disk today: refused for that alone
  const agenda = gateM4Input(moduleInput('agendaClinica'));
  assert.deepEqual(agenda.refused.filter(id => id !== 'pacientes'), []);
});

test('desktop and mobile with different organisms is a note, not a refusal', () => {
  const result = gateM4Input(input(pages => {
    pages.produtos.mobile = editDefinition(pages.produtos.mobile!, definition => {
      const organisms = definition.organisms as Record<string, unknown>;
      delete organisms.saldoAtual;
      for (const section of definition.sections as Array<{ organisms: string[] }>) section.organisms = section.organisms.filter(item => item !== 'saldoAtual');
    });
  }));
  assert.ok(result.accepted.includes('produtos'));
  assert.equal(find(result.problems, 'produtos', 'M4_INPUT_DEVICE_ORGANISMS').length, 1);
});

// atendimento, 07/10/2026: lancarItem's input has comandaId, the entry param comandaId selects, and state
// selectedComanda is fed by it. The draft held comandaId, nobody filled it, and the command never left the browser.
test('a form input member named like a selection entry param is context: listed and noted', () => {
  const result = gateM4Input(moduleInput('comandaRestaurante'));
  assert.deepEqual(result.parsed.atendimento.contextInputs, [{
    form: 'lancarItem', method: 'lancarItem', route: 'comandaRestaurante.atendimento.lancarItem',
    member: 'comandaId', param: 'comandaId', state: 'selectedComanda',
  }]);
  const notes = find(result.problems, 'atendimento', 'M4_INPUT_CONTEXT_INPUT');
  assert.equal(notes.length, 1);
  assert.equal(notes[0].severity, 'warning');
  assert.match(notes[0].message, /lancarItem fills comandaId from this\.selectedComanda/u);
  // the record's own identity ({ id, version } of mesas and fechamento) is not a selection param
  for (const pageId of ['cardapio', 'fechamento', 'inicio', 'mesas']) assert.deepEqual(result.parsed[pageId].contextInputs, [], pageId);
});

test('only a select: param is context; a filter param with the same name is not', () => {
  const page = gateM4Input(moduleInput('comandaRestaurante')).parsed.atendimento;
  const shared = structuredClone(page.shared);
  shared.entry.params.comandaId = { ...shared.entry.params.comandaId, effect: 'filter:lookupAtendimento' };
  assert.deepEqual(m4ContextInputs({ shared, contract: page.contract }), []);
  // without a state fed by the param there is nothing to read it from
  const noState = structuredClone(page.shared);
  delete (noState.states as Record<string, unknown>).selectedComanda;
  assert.deepEqual(m4ContextInputs({ shared: noState, contract: page.contract }), []);
});
