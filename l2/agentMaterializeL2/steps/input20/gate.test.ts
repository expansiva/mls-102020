/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/input20/gate.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { gateM4Input, m4ContextInputs, type M4GateInput, type M4InputProblem, type M4PageSources } from '/_102020_/l2/agentMaterializeL2/steps/input20/gate.js';

// Real defs of mls-102047/l2/reembolsoDespesas as agentDefsL2 (d2_95) wrote them on 13/10/2026, in the frozen shared
// structure (no forms, no functions). The earlier fixture (controleEstoque, 30/09) had the old structure.
interface Fixture {
  project: number;
  module: string;
  defsPipelineStatus: string;
  knownMolecules: string[];
  knownTemplates: string[];
  pages: Record<string, { contract: string; shared: string; desktop: string; mobile: string }>;
}
const fixture = JSON.parse(readFileSync(new URL('./fixtures/reembolsoDespesas.json', import.meta.url), 'utf8')) as Fixture;
const ALL = ['despesas_aprovadas', 'despesas_da_equipe', 'inicio', 'minhas_despesas'];

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

test('reembolsoDespesas as generated on 13/10: every page is accepted, with no refusal', () => {
  const result = gateM4Input(input());
  assert.deepEqual(result.accepted, ALL);
  assert.deepEqual(result.refused, []);
  assert.deepEqual(Object.keys(result.parsed).sort(), ALL, 'every file parses with the frozen grammar');
  assert.deepEqual(result.problems.filter(item => item.severity === 'error'), []);
  assert.equal(result.problems.filter(item => item.page === '*').length, 0);
});

test('methods: every submit intent resolves to the request of its id', () => {
  const result = gateM4Input(input());
  assert.deepEqual(result.parsed.minhas_despesas.methods, {
    registrarDespesa: 'registrarDespesa', salvarCorrecao: 'salvarCorrecao', enviarParaAprovacao: 'enviarParaAprovacao', reenviarParaAprovacao: 'reenviarParaAprovacao',
  });
  assert.equal(result.parsed.despesas_aprovadas.methods.registrarPagamento, 'registrarPagamento');
});

// The frozen shared has no navigation function: a navigate intent becomes a shared method of its own id.
test('a navigate intent is a method of its own id, with the entry params of its target', () => {
  const result = gateM4Input(input());
  assert.equal(result.parsed.inicio.methods.abrirAnaliseDespesas, 'abrirAnaliseDespesas');
  assert.deepEqual(result.parsed.inicio.navigations, [{ method: 'abrirAnaliseDespesas', organism: 'caixaDespesasPendentes', to: 'despesas_da_equipe', targetParams: ['page', 'despesaId'] }]);
  assert.deepEqual(result.parsed.minhas_despesas.navigations, []);
});

test('a navigation to a page that does not exist refuses the page', () => {
  const result = gateM4Input(input(pages => {
    pages.inicio.desktop = pages.inicio.desktop!.replace('"to": "despesas_da_equipe"', '"to": "nao_existe"');
  }));
  assert.deepEqual(codes(result.problems, 'inicio', 'error'), ['M4_INPUT_NAVIGATE_TARGET']);
  assert.deepEqual(result.refused, ['inicio']);
});

test('an intent may name a request trigger: it resolves to the request (comandaRestaurante mesas, createMesa → criarMesa)', () => {
  const result = gateM4Input(input(pages => {
    pages.despesas_aprovadas.shared = editDefinition(pages.despesas_aprovadas.shared!, definition => {
      (definition.requests as Record<string, { trigger: string }>).registrarPagamento.trigger = 'pagarDespesa';
    });
    for (const device of ['desktop', 'mobile'] as const) pages.despesas_aprovadas[device] = pages.despesas_aprovadas[device]!.replace('"id": "registrarPagamento"', '"id": "pagarDespesa"');
  }));
  assert.ok(result.accepted.includes('despesas_aprovadas'));
  assert.equal(result.parsed.despesas_aprovadas.methods.pagarDespesa, 'registrarPagamento');
});

test('an intent that names nothing refuses only its page', () => {
  const result = gateM4Input(input(pages => {
    pages.minhas_despesas.desktop = pages.minhas_despesas.desktop!.replace('"id": "salvarCorrecao"', '"id": "naoExiste"');
  }));
  assert.deepEqual(codes(result.problems, 'minhas_despesas', 'error'), ['M4_INPUT_UNRESOLVED']);
  assert.deepEqual(result.refused, ['minhas_despesas']);
});

test('the old structure (forms, functions) is refused as a format error', () => {
  const result = gateM4Input(input(pages => {
    pages.inicio.shared = editDefinition(pages.inicio.shared!, definition => { definition.functions = {}; });
  }));
  assert.match(find(result.problems, 'inicio', 'M4_INPUT_DEFS_FORMAT')[0].message, /forbidden field functions/u);
  assert.deepEqual(result.refused, ['inicio']);
});

test('missing and malformed files are refused per page, not per module', () => {
  const result = gateM4Input(input(pages => {
    pages.inicio.contract = null;
    pages.minhas_despesas.mobile = pages.minhas_despesas.mobile!.replace('"intent":', '"intento":');
  }));
  assert.deepEqual(find(result.problems, 'inicio', 'M4_INPUT_DEFS_MISSING').map(item => item.path), ['contract:']);
  assert.match(find(result.problems, 'minhas_despesas', 'M4_INPUT_DEFS_FORMAT')[0].message, /forbidden field intento/u);
  assert.deepEqual(Object.keys(result.parsed).sort(), ['despesas_aprovadas', 'despesas_da_equipe']);
});

test('the module is blocked while agentDefsL2 has not completed', () => {
  const result = gateM4Input(input(undefined, { defsPipelineStatus: 'failed' }));
  assert.equal(find(result.problems, '*', 'M4_INPUT_DEFS_PIPELINE_INCOMPLETE').length, 1);
  assert.deepEqual(result.accepted, []);
});

test('cross-references: a request with no route refuses; molecules and templates are notes', () => {
  const result = gateM4Input(input(pages => {
    pages.despesas_aprovadas.contract = pages.despesas_aprovadas.contract!.replace("'reembolsoDespesas.despesas_aprovadas.obterDespesaAprovada'", "'reembolsoDespesas.despesas_aprovadas.lerDespesa'");
    pages.despesas_aprovadas.desktop = pages.despesas_aprovadas.desktop!.replace('"preferred": "groupviewtable--ml-side-detail-table"', '"preferred": "groupviewtable--ml-nao-existe"');
  }, { templateExists: () => false }));
  assert.deepEqual(codes(result.problems, 'despesas_aprovadas', 'error'), ['M4_INPUT_ROUTE_MISSING']);
  const notes = codes(result.problems, 'despesas_aprovadas', 'warning');
  for (const code of ['M4_INPUT_ROUTE_EXTRA', 'M4_INPUT_MOLECULE_UNKNOWN', 'M4_INPUT_TEMPLATE_MISSING']) assert.ok(notes.includes(code), `${code} expected in ${notes.join(', ')}`);
});

// minhas_despesas: each command returns `item`, the list row next to the record, and no state reads it.
test('a command output member that no state reads is a note pointing at the route comment', () => {
  const notes = find(gateM4Input(input()).problems, 'minhas_despesas', 'M4_INPUT_RETURN_UNREAD');
  assert.deepEqual(notes.map(item => item.path).sort(), ['enviarParaAprovacao', 'reenviarParaAprovacao', 'registrarDespesa', 'salvarCorrecao'].map(id => `shared:requests.${id}.returns`));
  assert.match(notes[0].message, /returns \[despesa, item\]/u);
  assert.equal(notes[0].severity, 'warning');
});

test('molecules are optional: a page11 with no recommendation is accepted (controleEstoque test, 02/10/2026)', () => {
  const result = gateM4Input(input(pages => {
    for (const row of Object.values(pages)) {
      row.desktop = editDefinition(row.desktop!, definition => { delete definition.molecules; });
      row.mobile = editDefinition(row.mobile!, definition => { delete definition.molecules; });
    }
  }));
  assert.deepEqual(result.accepted, ALL);
  assert.deepEqual(result.parsed.inicio.page11.desktop.molecules, {});
});

test('desktop and mobile with different organisms is a note, not a refusal', () => {
  const result = gateM4Input(input(pages => {
    pages.despesas_aprovadas.mobile = editDefinition(pages.despesas_aprovadas.mobile!, definition => {
      delete (definition.organisms as Record<string, unknown>).despesaAprovadaDetalhe;
      for (const section of definition.sections as Array<{ organisms: string[] }>) section.organisms = section.organisms.filter(item => item !== 'despesaAprovadaDetalhe');
    });
  }));
  assert.ok(result.accepted.includes('despesas_aprovadas'));
  assert.equal(find(result.problems, 'despesas_aprovadas', 'M4_INPUT_DEVICE_ORGANISMS').length, 1);
});

// atendimento, 07/10/2026: lancarItem's input had comandaId, the entry param comandaId selected, and state
// selectedComanda was fed by it. The draft held comandaId, nobody filled it, and the command never left the browser.
test('a submitted command input member named like a selection entry param is context: listed and noted', () => {
  const result = gateM4Input(input(pages => {
    pages.despesas_da_equipe.shared = editDefinition(pages.despesas_da_equipe.shared!, definition => {
      const params = (definition.entry as { params: Record<string, unknown> }).params;
      params.id = params.despesaId;
      delete params.despesaId;
      (definition.states as Record<string, { source: string }>).selectedDespesa.source = 'entry.params.id';
    });
  }));
  assert.deepEqual(result.parsed.despesas_da_equipe.contextInputs.map(item => `${item.organism} ${item.method}.${item.member} ← ${item.state}`), [
    'decisaoDespesa aprovarDespesa.id ← selectedDespesa',
    'decisaoDespesa rejeitarDespesa.id ← selectedDespesa',
  ]);
  const notes = find(result.problems, 'despesas_da_equipe', 'M4_INPUT_CONTEXT_INPUT');
  assert.equal(notes.length, 2);
  assert.match(notes[0].message, /aprovarDespesa fills id from this\.selectedDespesa/u);
});

test('only a select: param is context; as generated (despesaId vs the input id) there is none', () => {
  const page = gateM4Input(input()).parsed.despesas_da_equipe;
  assert.deepEqual(page.contextInputs, []);
  const shared = structuredClone(page.shared);
  shared.entry.params.id = { ...shared.entry.params.despesaId, effect: 'filter:despesasPendentes' };
  shared.states.selectedDespesa = { ...shared.states.selectedDespesa, source: 'entry.params.id' };
  assert.deepEqual(m4ContextInputs({ shared, contract: page.contract, page11: page.page11 }), []);
});

// 14/10/2026: a UX variant (web/<device>/page21/) is the same page with another page11; it reuses the page's shared.
const toVariant = (source: string, genome = 'page21') => source.replace(/\/page11\//u, `/${genome}/`).replace('"_102020_/l4/collabux/templates/approvalWorkflow/page21.md"', '"_102020_/l4/collabux/templatesTest/decisionFirst/page21.md"');
function withVariant(edit?: (sources: { desktop: string; mobile: string }) => void): M4GateInput {
  const base = input();
  return {
    ...base,
    templateExists: () => true,
    pages: base.pages.map(page => {
      if (page.pageId !== 'minhas_despesas') return page;
      const sources = { desktop: toVariant(page.sources.desktop!), mobile: toVariant(page.sources.mobile!) };
      edit?.(sources);
      return { ...page, variants: [{ genome: 'page21', sources }] };
    }),
  };
}

test('a variant whose intents are those of page11 is accepted, with its own page11 per device', () => {
  const result = gateM4Input(withVariant());
  assert.ok(result.accepted.includes('minhas_despesas'));
  assert.deepEqual(result.parsed.minhas_despesas.variants.map(item => item.genome), ['page21']);
  assert.equal(result.parsed.minhas_despesas.variants[0].page11.desktop.template.category, '_102020_/l4/collabux/templatesTest/decisionFirst/page21.md');
  assert.deepEqual(find(result.problems, 'minhas_despesas', 'M4_INPUT_VARIANT_REFUSED'), []);
});

test('a variant that needs a new shared member, or names another folder, is left out; the page is still accepted', () => {
  const newIntent = gateM4Input(withVariant(sources => { sources.desktop = sources.desktop.replace('"id": "salvarCorrecao"', '"id": "duplicarDespesa"'); }));
  assert.ok(newIntent.accepted.includes('minhas_despesas'), 'page11 is never refused for its variant');
  assert.deepEqual(newIntent.parsed.minhas_despesas.variants, []);
  assert.match(find(newIntent.problems, 'minhas_despesas', 'M4_INPUT_VARIANT_REFUSED')[0].message, /duplicarDespesa .* is not an intent of the primary page11/u);
  const wrongFolder = gateM4Input(withVariant(sources => { sources.mobile = sources.mobile.replace('/page21/', '/page31/'); }));
  assert.match(find(wrongFolder.problems, 'minhas_despesas', 'M4_INPUT_VARIANT_REFUSED')[0].message, /does not name 102047\/reembolsoDespesas\/web\/mobile\/page21\/minhas_despesas/u);
});

test('a page11 file that names a variant folder is refused as the primary page', () => {
  const result = gateM4Input(input(pages => { pages.inicio.desktop = toVariant(pages.inicio.desktop!); }));
  assert.deepEqual(find(result.problems, 'inicio', 'M4_INPUT_DEFS_LOCATION').map(item => item.path), ['desktop:']);
});
