/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i2-triage/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ImTriageInputs,
  ImTriageOutput,
  normalizeExpectedArtifacts,
  runImTriageGate,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i2-triage/gate.js';

type Over = Omit<Partial<ImTriageInputs>, 'output'> & { output?: Partial<ImTriageOutput> };

function inputs(over: Over = {}): ImTriageInputs {
  return {
    isShell: false,
    artifactsPresent: ['defs', 'ts', 'less', 'html', 'groupIndex'],
    ...over,
    output: {
      route: 'B',
      rationale: 'only the spacing of the footer changes, no public surface is affected',
      expectedArtifacts: ['less'],
      definitionElements: [],
      ...(over.output || {}),
    },
  };
}

test('a well-formed route B passes', () => {
  assert.deepEqual(runImTriageGate(inputs()), { ok: true, errors: [] });
});

test('THE 13/08 CASE: um defeito com o defs corrigido junto é rota B com defs+ts, e passa', () => {
  // A defect the contract DESCRIBED as intended. It was routed A — not built — and the run died on a
  // one-line fix. The gate never blocked this shape; what pointed the model at A was the vocabulary
  // ("or changes meaning") in the schema and in this gate's own retry message. Pinned here so the
  // shape is not mistaken for something the gate ought to refuse.
  const result = runImTriageGate(inputs({
    output: {
      route: 'B',
      rationale: 'sem conteúdo no slot Label o clique copia o próprio rótulo padrão: é defeito de código, e o contrato descrevia esse comportamento errado',
      expectedArtifacts: ['ts', 'defs'],
      definitionElements: [],
    },
  }));
  assert.deepEqual(result, { ok: true, errors: [] });
});

test('nomear elementos de definição fora da rota A continua sendo erro', () => {
  // The other direction of the same confusion: a corrected contract sentence is not a definition
  // element, so a route B that lists one is contradicting itself.
  const result = runImTriageGate(inputs({
    output: { route: 'B', expectedArtifacts: ['ts', 'defs'], definitionElements: ['slot Label'] },
  }));
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^definition_elements_off_route: /);
});

test('an invalid route is reported ALONE — every other message would be misleading', () => {
  // 'E' used to be the example of an invalid route here; it became a real route on 2026-08-18.
  const result = runImTriageGate(inputs({ output: { route: 'Z' } }));
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /^route_invalid: /);
});

test('route C on a molecule that is not a shell is impossible', () => {
  // The half of the C condition that is MEASURED. The other half — "the behaviour lives in the
  // parent" — is judgement and the gate says nothing about it.
  const result = runImTriageGate(
    inputs({ isShell: false, output: { route: 'C', expectedArtifacts: ['less'] } }),
  );
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^route_c_not_shell: /);
});

test('route C on a real shell passes', () => {
  assert.equal(runImTriageGate(inputs({ isShell: true, output: { route: 'C', expectedArtifacts: ['ts'] } })).ok, true);
});

test('route A with nothing named as changing is rejected, and the message offers the alternatives', () => {
  const result = runImTriageGate(inputs({ output: { route: 'A', expectedArtifacts: [], definitionElements: [] } }));
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^route_a_no_elements: /);
  // Both, since 2026-08-14: on a shell the alternative to A can be C, and a message that offers only
  // B pushes the retry into the very mis-route the third question exists to prevent.
  assert.match(result.errors[0], /it is B/);
  assert.match(result.errors[0], /or C when the molecule is a shell/);
});

test('route A naming what changes passes, and names no artifacts', () => {
  const result = runImTriageGate(
    inputs({ output: { route: 'A', expectedArtifacts: [], definitionElements: ['slot Detail', 'property pageSize'] } }),
  );
  assert.equal(result.ok, true);
});

test('naming definition elements on route B contradicts the route', () => {
  // The most likely real mis-route: the model sees a new slot, calls it "small", and picks B.
  const result = runImTriageGate(inputs({ output: { route: 'B', definitionElements: ['slot Detail'] } }));
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^definition_elements_off_route: /);
});

test('routes A and D name no artifacts', () => {
  const a = runImTriageGate(inputs({ output: { route: 'A', definitionElements: ['slot Detail'], expectedArtifacts: ['ts'] } }));
  assert.match(a.errors[0], /^artifacts_off_route: /);
  const d = runImTriageGate(inputs({ output: { route: 'D', expectedArtifacts: ['ts'] } }));
  assert.match(d.errors[0], /^artifacts_off_route: /);
});

test('routes B and C must name at least one artifact', () => {
  const result = runImTriageGate(inputs({ output: { route: 'B', expectedArtifacts: [] } }));
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^artifacts_empty: /);
});

test('a missing .html may still be named — i5-playground creates it', () => {
  // A intenção original: `artifact_absent` não vale para o html, porque o i5 sabe criá-lo. Segue
  // valendo. O que mudou em 2026-08-18 é a FORMA: numa rota B o html vem ao lado de um artefato que o
  // editor escreve, porque ele é previsão do que vai seguir. Html sozinho é rota E.
  const comEditavel = runImTriageGate(
    inputs({ artifactsPresent: ['defs', 'ts', 'less'], output: { route: 'B', expectedArtifacts: ['ts', 'html'] } }),
  );
  assert.equal(comEditavel.ok, true);

  const rotaE = runImTriageGate(
    inputs({ artifactsPresent: ['defs', 'ts', 'less'], output: { route: 'E', expectedArtifacts: ['html'] } }),
  );
  assert.equal(rotaE.ok, true);
});

test('an invented artifact is rejected', () => {
  const result = runImTriageGate(inputs({ output: { route: 'B', expectedArtifacts: ['tests'] } }));
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^artifact_unknown: /);
});

test('an empty rationale is rejected — on route D it is the only answer the user gets', () => {
  const result = runImTriageGate(inputs({ output: { route: 'D', rationale: '  ', expectedArtifacts: [] } }));
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^rationale_missing: /);
});

test('naming the playground pulls in the group index, without spending a retry', () => {
  // flow.json.conventions.playgroundThenIndex. On 2026-08-05 the playground was fixed and the
  // group page was left showing an empty detail; it was found by accident.
  assert.deepEqual(normalizeExpectedArtifacts(['ts', 'html']), ['ts', 'html', 'groupIndex']);
  assert.deepEqual(normalizeExpectedArtifacts(['less']), ['less']);
});

test('normalization drops unknown kinds and duplicates', () => {
  assert.deepEqual(normalizeExpectedArtifacts(['less', 'less', 'tests']), ['less']);
});

// ---- rota E e o artefato que o editor não escreve (2026-08-18) ----

test('rota B nomeando SÓ html/groupIndex é recusada, e a mensagem aponta a rota E', () => {
  // Medido: "o playground não foi gerado" virou rota B com expectedArtifacts ['html','groupIndex'].
  // O i3 mostra só defs/ts/less, então o modelo recebeu o .ts sozinho e recusou duas vezes — com razão.
  const result = runImTriageGate(inputs({ output: { route: 'B', expectedArtifacts: ['html', 'groupIndex'] } }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => /^artifacts_not_writable: /.test(e)));
  assert.match(result.errors.join('\n'), /route E/);
});

test('html AO LADO de um artefato editável continua válido — a previsão está certa', () => {
  // Uma edição de rota B que move a superfície faz o playground seguir de verdade. Foi o caso da
  // ml-combobox, e recusar isso quebraria um run correto.
  assert.equal(runImTriageGate(inputs({ output: { route: 'B', expectedArtifacts: ['ts', 'html', 'groupIndex'] } })).ok, true);
});

test('rota E é rota que ESCREVE: precisa nomear artefato', () => {
  assert.ok(runImTriageGate(inputs({ output: { route: 'E', expectedArtifacts: [] } }))
    .errors.some(e => /^artifacts_empty: /.test(e)));
  assert.equal(runImTriageGate(inputs({ output: { route: 'E', expectedArtifacts: ['html'] } })).ok, true);
});

test('rota E não é limitada pelo que o editor escreve — ela não usa o editor', () => {
  assert.equal(runImTriageGate(inputs({ output: { route: 'E', expectedArtifacts: ['html', 'groupIndex'] } })).ok, true);
});

test("'E' é rota válida", () => {
  assert.equal(runImTriageGate(inputs({ output: { route: 'E', expectedArtifacts: ['html'] } })).errors.some(e => /^route_invalid/.test(e)), false);
});
