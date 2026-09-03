/// <mls fileReference="_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cOrigin.test.ts" enhancement="_blank"/>

// The entry parser is where the three invocation formats become one list, so it is where a
// silent mistake costs the most: a dropped reference means a molecule the user asked for and
// did not get. Every case below is one of the shapes the mention really arrives in.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MOLECULE_BASE_CLASS,
  copyModeForRefs,
  detectChain,
  expandRefs,
  extractCustomElementTag,
  extractExtendedClassName,
  extractOriginClassName,
  findImportRef,
  parseCopyEntry,
  parseCopyRefs,
  refTag,
} from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cOrigin.js';

const REF = '_102040_/l2/molecules/groupviewtable/ml-inline-edit-table';

test('parseCopyRefs: uma molécula', () => {
  const { refs, errors } = parseCopyRefs(`copie o componente ${REF}`);
  assert.deepEqual(errors, []);
  assert.equal(refs.length, 1);
  assert.equal(refs[0].project, 102040);
  assert.equal(refs[0].group, 'groupviewtable');
  assert.equal(refs[0].shortName, 'ml-inline-edit-table');
  assert.equal(refs[0].isGroupRef, false);
  assert.equal(refs[0].ref, REF);
  assert.equal(refTag(refs[0]), 'groupviewtable--ml-inline-edit-table');
});

test('parseCopyRefs: grupo inteiro (referência sem a molécula)', () => {
  const { refs } = parseCopyRefs('copie os componentes do grupo _102040_/l2/molecules/groupviewtable');
  assert.equal(refs.length, 1);
  assert.equal(refs[0].isGroupRef, true);
  assert.equal(refs[0].shortName, '');
  assert.equal(refs[0].ref, '_102040_/l2/molecules/groupviewtable');
});

test('parseCopyRefs: lista com prosa em volta, uma por linha', () => {
  const text = [
    'copie os componentes abaixo:',
    '_102040_/l2/molecules/groupviewtable/ml-inline-edit-table',
    '_102040_/l2/molecules/groupviewchart/ml-bar-chart',
    '_102040_/l2/molecules/groupenterboolean/ml-boolean-segmented',
  ].join('\n');
  const { refs, errors } = parseCopyRefs(text);
  assert.deepEqual(errors, []);
  assert.equal(refs.length, 3);
  assert.deepEqual(refs.map(ref => ref.group), ['groupviewtable', 'groupviewchart', 'groupenterboolean']);
});

test('parseCopyRefs: normaliza o formato do preview (sem /l2/) e o .ts no fim', () => {
  const { refs } = parseCopyRefs('_102040_molecules/groupshowprogress/ml-indeterminate-spinner.ts');
  assert.equal(refs.length, 1);
  assert.equal(refs[0].ref, '_102040_/l2/molecules/groupshowprogress/ml-indeterminate-spinner');
});

test('parseCopyRefs: deduplica a mesma referência', () => {
  const { refs } = parseCopyRefs(`${REF}\n${REF}`);
  assert.equal(refs.length, 1);
});

test('parseCopyRefs: nome que não começa com ml- é erro nomeado, não silêncio', () => {
  const { refs, errors } = parseCopyRefs('_102040_/l2/molecules/groupviewtable/index');
  assert.equal(refs.length, 0);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /ml-/);
});

test('parseCopyRefs: prosa sem referência nenhuma', () => {
  const { refs, errors } = parseCopyRefs('copie o combobox do 102040 por favor');
  assert.equal(refs.length, 0);
  assert.deepEqual(errors, []);   // não é erro de formato: é ausência (o root falha legível)
});

test('copyModeForRefs: single, group e list', () => {
  const single = parseCopyRefs(REF).refs;
  const group = parseCopyRefs('_102040_/l2/molecules/groupviewtable').refs;
  const list = parseCopyRefs(`${REF}\n_102040_/l2/molecules/groupviewchart/ml-bar-chart`).refs;
  assert.equal(copyModeForRefs(single), 'single');
  assert.equal(copyModeForRefs(group), 'group');
  assert.equal(copyModeForRefs(list), 'list');
});

// Stand-in for mls.common.safeParseArgs: it accepts a JS OBJECT LITERAL (unquoted keys,
// single quotes), which is exactly what the preview sends and what JSON.parse would reject.
const parseArgsStub = (raw: string): Record<string, unknown> | undefined => {
  // eslint-disable-next-line no-new-func
  return new Function(`return (${raw});`)() as Record<string, unknown>;
};

test('parseCopyEntry: payload do preview (objeto) e prosa', () => {
  const asObject = parseCopyEntry(
    `@@agentCopyMolecule { page: '${REF}', prompt: 'em português' }`,
    'agentCopyMolecule',
    parseArgsStub,
  );
  assert.match(asObject.text, /ml-inline-edit-table/);
  assert.equal(asObject.notes, 'em português');

  const asProse = parseCopyEntry(`@@agentCopyMolecule copie ${REF}`, 'agentCopyMolecule', () => undefined);
  assert.match(asProse.text, /ml-inline-edit-table/);
});

test('parseCopyEntry: menção nua não vira referência', () => {
  const entry = parseCopyEntry('@@agentCopyMolecule', 'agentCopyMolecule', () => undefined);
  assert.equal(entry.text, '');
  assert.equal(parseCopyRefs(entry.text).refs.length, 0);
});

test('expandRefs: grupo vira as moléculas do grupo, pelo lister injetado', () => {
  const calls: string[] = [];
  const lister = (project: number, group: string) => {
    calls.push(`${project}/${group}`);
    return ['ml-a', 'ml-b'];
  };
  const { refs, errors } = expandRefs(parseCopyRefs('_102040_/l2/molecules/groupviewtable').refs, lister);
  assert.deepEqual(errors, []);
  assert.deepEqual(calls, ['102040/groupviewtable']);   // lê o projeto da ORIGEM, não o destino
  assert.deepEqual(refs.map(ref => ref.shortName), ['ml-a', 'ml-b']);
  assert.ok(refs.every(ref => !ref.isGroupRef));
});

test('expandRefs: grupo vazio é erro legível e não derruba os outros itens', () => {
  const refs = parseCopyRefs(`_102040_/l2/molecules/groupvazio\n${REF}`).refs;
  const { refs: out, errors } = expandRefs(refs, (_project, group) => (group === 'groupvazio' ? [] : ['ml-x']));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /groupvazio/);
  assert.equal(out.length, 1);
  assert.equal(out[0].shortName, 'ml-inline-edit-table');
});

test('expandRefs: molécula repetida por dois caminhos entra uma vez', () => {
  const refs = parseCopyRefs('_102040_/l2/molecules/groupviewtable\n_102040_/l2/molecules/groupviewtable/ml-a').refs;
  const { refs: out } = expandRefs(refs, () => ['ml-a', 'ml-b']);
  assert.deepEqual(out.map(ref => ref.shortName), ['ml-a', 'ml-b']);
});

// ---- a origem em si ----------------------------------------------------------

const BASE_TS = `/// <mls fileReference="_102040_/l2/molecules/groupshowprogress/ml-indeterminate-spinner.ts" enhancement="_102020_/l2/enhancementAura"/>
import { MoleculeAuraElement } from '/_102033_/l2/moleculeBase.js';
@customElement('groupshowprogress--ml-indeterminate-spinner')
export class IndeterminateSpinnerMolecule extends MoleculeAuraElement {
}`;

const SHELL_TS = `/// <mls fileReference="_102054_/l2/molecules/grouptriggeraction/ml-button-standard-brutal.ts" enhancement="_102020_/l2/enhancementAura"/>
import { customElement } from 'lit/decorators.js';
import { ButtonStandardMolecule } from '/_102040_/l2/molecules/grouptriggeraction/ml-button-standard.js';

@customElement('grouptriggeraction--ml-button-standard-brutal')
export class ButtonStandardBrutal extends ButtonStandardMolecule {}`;

test('extractores: classe, extends e tag', () => {
  assert.equal(extractOriginClassName(BASE_TS), 'IndeterminateSpinnerMolecule');
  assert.equal(extractExtendedClassName(BASE_TS), MOLECULE_BASE_CLASS);
  assert.equal(extractCustomElementTag(BASE_TS), 'groupshowprogress--ml-indeterminate-spinner');
  assert.equal(extractOriginClassName(SHELL_TS), 'ButtonStandardBrutal');
  assert.equal(extractExtendedClassName(SHELL_TS), 'ButtonStandardMolecule');
});

test('findImportRef: acha o import da classe estendida', () => {
  assert.equal(
    findImportRef(SHELL_TS, 'ButtonStandardMolecule'),
    '/_102040_/l2/molecules/grouptriggeraction/ml-button-standard.js',
  );
  assert.equal(findImportRef(BASE_TS, 'ButtonStandardMolecule'), null);
});

test('detectChain: molécula base não é casca', () => {
  const { chain, error } = detectChain(BASE_TS);
  assert.equal(error, undefined);
  assert.equal(chain.isShell, false);
  assert.equal(chain.parentRef, undefined);
});

test('detectChain: casca resolve o pai pelo import', () => {
  const { chain, error } = detectChain(SHELL_TS);
  assert.equal(error, undefined);
  assert.equal(chain.isShell, true);
  assert.equal(chain.parentRef, '_102040_/l2/molecules/grouptriggeraction/ml-button-standard');
  assert.equal(chain.parentProject, 102040);
  assert.equal(chain.parentGroup, 'grouptriggeraction');
  assert.equal(chain.parentShortName, 'ml-button-standard');
  assert.equal(chain.parentClassName, 'ButtonStandardMolecule');
});

test('detectChain: casca sem o import do pai falha legível', () => {
  const broken = SHELL_TS.split('\n').filter(line => !line.includes('import { ButtonStandardMolecule }')).join('\n');
  const { chain, error } = detectChain(broken);
  assert.equal(chain.isShell, true);
  assert.match(String(error), /import/);
});

test('detectChain: extends de módulo que não é molécula de outro projeto falha legível', () => {
  const weird = `import { Foo } from 'lit';\nexport class X extends Foo {}`;
  const { error } = detectChain(weird);
  assert.match(String(error), /achatar/);
});

test('detectChain: sem classe exportada, erro em vez de suposição', () => {
  const { error } = detectChain('// nada aqui');
  assert.match(String(error), /classe estendida/);
});
