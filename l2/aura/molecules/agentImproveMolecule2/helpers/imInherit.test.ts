/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imInherit.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectInheritance,
  offendingForeignWrite,
  overridableMembersOf,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imInherit.js';

// The real shape, copied from mls-102054: an empty shell. 70 of the 84 look exactly like this.
const SHELL_EMPTY = `
import { customElement } from 'lit/decorators.js';
import { RangeSliderMolecule } from '/_102040_/l2/molecules/groupenternumber/ml-range-slider.js';

@customElement('groupenternumber--ml-range-slider-brutal')
export class RangeSliderBrutal extends RangeSliderMolecule {}
`;

// The other real shape: a shell overriding ONE property. 14 of the 84.
const SHELL_ONE_PROP = `
import { customElement } from 'lit/decorators.js';
import { MlSelectDropdownMolecule } from '/_102040_/l2/molecules/groupselectone/ml-select-dropdown.js';

@customElement('groupselectone--ml-select-dropdown-brutal')
export class MlSelectDropdownBrutal extends MlSelectDropdownMolecule {
  protected portalWidgetName = 'groupselectone--ml-select-dropdown-brutal';
}
`;

// A normal molecule: extends the base class, which is NOT the inheritance this agent cares about.
const PLAIN = `
import { MoleculeAuraElement } from '/_102033_/l2/moleculeBase.js';

@customElement('groupviewtable--ml-data-table')
export class MlDataTableMolecule extends MoleculeAuraElement {
  slotTags = ['Caption'];
}
`;

test('an empty shell is detected, with its parent and project', () => {
  const result = detectInheritance(SHELL_EMPTY);
  assert.equal(result.isShell, true);
  assert.equal(result.parentClassName, 'RangeSliderMolecule');
  assert.equal(result.parentProject, 102040);
  assert.equal(result.parentReference, '_102040_/l2/molecules/groupenternumber/ml-range-slider.ts');
  assert.deepEqual(result.ownMembers, []);
});

test('a shell that overrides one property reports it', () => {
  const result = detectInheritance(SHELL_ONE_PROP);
  assert.equal(result.isShell, true);
  assert.ok(result.ownMembers.includes('portalWidgetName'));
});

test('extending the molecule base class is NOT inheritance for this agent', () => {
  // Every molecule extends MoleculeAuraElement; treating that as a shell would route every
  // request through the inheritance clarification.
  assert.equal(detectInheritance(PLAIN).isShell, false);
});

test('a class extending something it does not import is not a shell', () => {
  const source = 'export class X extends SomethingLocal {}';
  assert.equal(detectInheritance(source).isShell, false);
});

test('overridable members put render() last — it is the expensive one', () => {
  const parent = `
    protected portalWidgetName = 'x';
    protected getTriggerTemplate() { return 1; }
    render() { return 2; }
  `;
  const members = overridableMembersOf(parent);
  assert.equal(members[members.length - 1].name, 'render');
  assert.equal(members[0].name, 'portalWidgetName');
});

test('private members of the parent are not offered — they cannot be overridden', () => {
  const parent = `
    protected visible = true;
    private handleClick() { return 1; }
  `;
  assert.deepEqual(overridableMembersOf(parent).map((m) => m.name), ['visible']);
});

test('a shell without the parent source still detects, with no members to offer', () => {
  // The parent lives in another project and may be unreadable at runtime. Degrading to a
  // narrower clarification is deliberate — better than a wrong one.
  const result = detectInheritance(SHELL_EMPTY);
  assert.deepEqual(result.overridableMembers, []);
});

test('a write outside the current project is caught — the hard invariant of the agent', () => {
  const refs = ['_102054_/l2/molecules/g/ml-x.ts', '_102040_/l2/molecules/g/ml-y.ts'];
  assert.equal(offendingForeignWrite(refs, 102054), '_102040_/l2/molecules/g/ml-y.ts');
  assert.equal(offendingForeignWrite(['_102054_/l2/molecules/g/ml-x.ts'], 102054), null);
});
