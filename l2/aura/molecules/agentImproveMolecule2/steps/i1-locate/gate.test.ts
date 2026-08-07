/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i1-locate/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ImLocateInputs,
  checkImClassification,
  runImLocateGate,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i1-locate/gate.js';
import { ImArtifact, ImInheritance } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';

const KNOWN = [
  { name: 'groupViewTable', skillReference: '/_102020_/l2/aura/molecules/skills/groupViewTable/creation' },
  { name: 'groupNavigateMain' }, // the one real group with no creation skill
];

const NOT_A_SHELL: ImInheritance = {
  isShell: false,
  parentReference: null,
  parentProject: null,
  parentClassName: null,
  ownMembers: [],
  overridableMembers: [],
};

function artifacts(over: Partial<Record<ImArtifact['kind'], Partial<ImArtifact>>> = {}): ImArtifact[] {
  const kinds: ImArtifact['kind'][] = ['defs', 'ts', 'less', 'html', 'groupIndex'];
  return kinds.map(kind => ({
    kind,
    reference: `_102040_/l2/molecules/groupviewtable/ml-data-table${kind === 'defs' ? '.defs.ts' : '.ts'}`,
    present: true,
    source: 'something',
    ...(over[kind] || {}),
  }));
}

function inputs(over: Partial<ImLocateInputs> = {}): ImLocateInputs {
  return {
    targetRaw: 'ml-data-table',
    notFound: null,
    groupFolder: 'groupviewtable',
    knownGroups: KNOWN,
    artifacts: artifacts(),
    inheritance: NOT_A_SHELL,
    destProject: 102040,
    context: { schemaVersion: 1 } as unknown as ImLocateInputs['context'],
    ...over,
  };
}

test('THE INVERTED PRECONDITION: a molecule that does not exist fails pointing at agentNewMolecule2', () => {
  // The mirror image of the NM2 collision check. If this ever passes, the agent starts creating
  // molecules — which is not its job and would bypass the whole NM2 pipeline.
  const result = runImLocateGate(
    inputs({ notFound: 'molecule not found: ml-ghost. agentImproveMolecule2 only CHANGES molecules that already exist — to create one, use @@agentNewMolecule2.' }),
  );
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^molecule_not_found: /);
  assert.match(result.errors[0], /agentNewMolecule2/);
});

test('not-found is reported ALONE, never buried under the checks that could not run', () => {
  const result = runImLocateGate(
    inputs({ notFound: 'nope', groupFolder: 'nonsense', artifacts: [], destProject: 0 }),
  );
  assert.equal(result.errors.length, 1);
});

test('a healthy molecule passes', () => {
  assert.deepEqual(runImLocateGate(inputs()), { ok: true, errors: [] });
});

test('a folder that is not a known group is rejected, and the message lists the known ones', () => {
  const result = runImLocateGate(inputs({ groupFolder: 'groupinvented' }));
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^group_unknown: /);
  assert.match(result.errors[0], /groupViewTable/);
});

test('a group with no creation skill is rejected — there is no contract to check the change against', () => {
  // groupNavigateMain, the 1 of 32. Same decision as the NM2 gate.
  const result = runImLocateGate(inputs({ groupFolder: 'groupnavigatemain' }));
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^group_no_skill: /);
});

test('a missing .defs.ts is fatal — the playground and the DS catalog are built from it', () => {
  const result = runImLocateGate(inputs({ artifacts: artifacts({ defs: { present: false, source: '' } }) }));
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^defs_missing: /);
});

test('a missing .less or .html is NOT fatal — i5-playground is the step that creates one', () => {
  const result = runImLocateGate({
    ...inputs(),
    artifacts: artifacts({ less: { present: false, source: '' }, html: { present: false, source: '' } }),
  });
  assert.equal(result.ok, true);
});

test('a shell whose parent is in the SAME project is rejected — that is a local base class', () => {
  // Strategy D is inheritance ACROSS projects. Routing a local base class through the route C
  // clarification would offer the user a choice that does not apply to their molecule.
  const result = runImLocateGate(
    inputs({
      destProject: 102040,
      inheritance: {
        isShell: true,
        parentReference: '_102040_/l2/molecules/groupviewtable/ml-data-table.ts',
        parentProject: 102040,
        parentClassName: 'MlDataTableMolecule',
        ownMembers: [],
        overridableMembers: [],
      },
    }),
  );
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^parent_same_project: /);
});

test('a shell whose parent is in another project passes', () => {
  const result = runImLocateGate(
    inputs({
      destProject: 102054,
      inheritance: {
        isShell: true,
        parentReference: '_102040_/l2/molecules/groupenternumber/ml-range-slider.ts',
        parentProject: 102040,
        parentClassName: 'RangeSliderMolecule',
        ownMembers: [],
        overridableMembers: [],
      },
    }),
  );
  assert.equal(result.ok, true);
});

test('classification: a refusal WITH a reason is a valid outcome', () => {
  assert.equal(checkImClassification({ validInput: false, reason: 'this asks for a new page, not a molecule change' }).ok, true);
});

test('classification: a refusal with NO reason fails — the user would get a dead end', () => {
  const result = checkImClassification({ validInput: false });
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^no_reason: /);
});

test('classification: accepted with no molecule extracted fails', () => {
  const result = checkImClassification({ validInput: true, target: '  ' });
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^target_missing: /);
});

test('classification: both the bare and the group-qualified target shapes are accepted', () => {
  assert.equal(checkImClassification({ validInput: true, target: 'ml-data-table' }).ok, true);
  assert.equal(checkImClassification({ validInput: true, target: 'groupviewtable/ml-data-table' }).ok, true);
  assert.equal(checkImClassification({ validInput: true, target: 'ml-data-table.ts' }).ok, true);
});

test('classification: prose that is not a molecule name is rejected before it searches 31 groups', () => {
  const result = checkImClassification({ validInput: true, target: 'the table on the customers page' });
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^target_shape: /);
});
