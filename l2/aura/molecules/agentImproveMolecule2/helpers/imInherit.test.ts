/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imInherit.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deadShellMembers,
  detectInheritance,
  offendingForeignWrite,
  overridableMembersOf,
  unreachableMembersOf,
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
  assert.deepEqual(result.unreachableMembers, []);
});

// ---- 2026-08-13: the ml-copy-button case ----
//
// Real shape of the parent that produced the wrong suggestion: the whole confirmation cycle is
// private, the duration is a module constant, and the only reachable members are render() and a
// lifecycle hook. Overriding either cannot change the duration.
const PARENT_ALL_PRIVATE = `
const COPY_CONFIRM_MS = 2000;

export class MlCopyButtonMolecule extends MoleculeAuraElement {
  private copiedTimer: number | null = null;

  disconnectedCallback() { this.clearCopiedTimer(); }

  private beginCopiedState() { return 1; }

  private clearCopiedTimer() { return 2; }

  render() { return 3; }
}
`;

test('a lifecycle hook never heads the cheapest-first list', () => {
  // It used to: disconnectedCallback sat at cost 20, led a list whose only other entry was render(),
  // and was suggested as the place to change a timer duration held in a module constant.
  const members = overridableMembersOf(PARENT_ALL_PRIVATE);
  assert.deepEqual(members.map(m => m.name), ['disconnectedCallback', 'render']);
  const hook = members.find(m => m.name === 'disconnectedCallback');
  const render = members.find(m => m.name === 'render');
  assert.ok(hook && render && hook.cost > 20 && hook.cost < render.cost);
});

test('a narrow method still beats a lifecycle hook', () => {
  const parent = `
    disconnectedCallback() { return 0; }
    protected getTriggerTemplate() { return 1; }
  `;
  assert.deepEqual(overridableMembersOf(parent).map(m => m.name), ['getTriggerTemplate', 'disconnectedCallback']);
});

test('private members and module constants are reported as UNREACHABLE, not hidden', () => {
  // The silent filter was the defect: the model saw a short list of overridable members and no
  // reason why it was short, so it could not conclude that the fix belongs to the base.
  const unreachable = unreachableMembersOf(PARENT_ALL_PRIVATE);
  const byName = new Map(unreachable.map(m => [m.name, m.why]));
  assert.equal(byName.get('beginCopiedState'), 'private');
  assert.equal(byName.get('clearCopiedTimer'), 'private');
  assert.equal(byName.get('copiedTimer'), 'private');
  assert.equal(byName.get('COPY_CONFIRM_MS'), 'module-constant');
  // and what IS reachable is not in there
  assert.equal(byName.has('render'), false);
  assert.equal(byName.has('disconnectedCallback'), false);
});

test('module constants come FIRST — every consumer caps the list at 12', () => {
  // Measured on ml-copy-button, 2026-08-14: emitted in source order, COPY_CONFIRM_MS was 33rd of 34
  // behind 30 private methods. Both prompts that show this list cut it at 12, so the member that
  // decided the case — a duration in a module constant — was the one thrown away.
  const parent = `
const COPY_CONFIRM_MS = 2000;
export class X {
${Array.from({ length: 20 }, (_, i) => `  private helper${i}() { return ${i}; }`).join('\n')}
}
`;
  const unreachable = unreachableMembersOf(parent);
  assert.equal(unreachable[0].name, 'COPY_CONFIRM_MS');
  assert.ok(unreachable.slice(0, 12).some(m => m.why === 'module-constant'));
  assert.equal(unreachable.length, 21);
});

test('an indented const is a class field, not a module constant', () => {
  const parent = `
const AT_MODULE_SCOPE = 1;
export class X {
  method() {
    const local = 2;
    return local;
  }
}
`;
  assert.deepEqual(unreachableMembersOf(parent).map(m => m.name), ['AT_MODULE_SCOPE']);
});

// ---- 2026-08-14: the member that overrode nothing ----
//
// Measured in the Studio. Asked for a 3-second confirmation, the model wrote `copiedDurationMs` into
// the shell of ml-copy-button. The parent keeps that duration in a module constant and declares no
// such member, so nothing read it and the button went on confirming for 2000ms — compiling, and
// reported as done.
const SHELL_DEAD_MEMBER = `
import { customElement } from 'lit/decorators.js';
import { MlCopyButtonMolecule } from '/_102040_/l2/molecules/grouptriggeraction/ml-copy-button.js';

@customElement('grouptriggeraction--ml-copy-button-glass')
export class MlCopyButtonMoleculeGlass extends MlCopyButtonMolecule {
  protected copiedDurationMs = 3000;
}
`;

test('a member the parent does not have and nobody reads is DEAD', () => {
  assert.deepEqual(deadShellMembers(SHELL_DEAD_MEMBER, PARENT_ALL_PRIVATE), ['copiedDurationMs']);
});

test('assigning it in a constructor does not make it read — two writes, no reader', () => {
  // The second run's whole contribution: `constructor() { super(); this.copiedDurationMs = 3000; }`.
  const shell = SHELL_DEAD_MEMBER.replace(
    'protected copiedDurationMs = 3000;',
    'protected copiedDurationMs = 3000;\n\n  constructor() {\n    super();\n    this.copiedDurationMs = 3000;\n  }',
  );
  assert.deepEqual(deadShellMembers(shell, PARENT_ALL_PRIVATE), ['copiedDurationMs']);
});

test('a real override is NOT dead — the parent declares it', () => {
  // The 14 shells that override one property. `portalWidgetName` exists in the parent; nothing in
  // the shell reads it either, and that is exactly right: the PARENT reads it.
  const parent = 'export class X extends MoleculeAuraElement {\n  protected portalWidgetName = \'a\';\n  render() { return this.portalWidgetName; }\n}';
  assert.deepEqual(deadShellMembers(SHELL_ONE_PROP, parent), []);
});

test('a member the shell itself reads is not dead', () => {
  const shell = `
import { MlCopyButtonMolecule } from '/_102040_/l2/molecules/grouptriggeraction/ml-copy-button.js';
export class G extends MlCopyButtonMolecule {
  private label = 'x';
  render() { return this.label; }
}
`;
  assert.deepEqual(deadShellMembers(shell, PARENT_ALL_PRIVATE), []);
});

test('an empty shell has nothing to report, and a non-shell is not judged', () => {
  assert.deepEqual(deadShellMembers(SHELL_EMPTY, PARENT_ALL_PRIVATE), []);
  assert.deepEqual(deadShellMembers(PLAIN, PARENT_ALL_PRIVATE), []);
});

test('`super()` in a constructor is not a member of the shell', () => {
  // It matched the member regex, so it reached ownMembers — harmless for the clarification, and a
  // false 'dead member' the moment a gate started judging that list.
  const shell = SHELL_DEAD_MEMBER.replace(
    'protected copiedDurationMs = 3000;',
    'constructor() {\n    super();\n  }',
  );
  assert.equal(detectInheritance(shell).ownMembers.includes('super'), false);
  assert.deepEqual(deadShellMembers(shell, 'export class P {}'), []);
});

test('a write outside the current project is caught — the hard invariant of the agent', () => {
  const refs = ['_102054_/l2/molecules/g/ml-x.ts', '_102040_/l2/molecules/g/ml-y.ts'];
  assert.equal(offendingForeignWrite(refs, 102054), '_102040_/l2/molecules/g/ml-y.ts');
  assert.equal(offendingForeignWrite(['_102054_/l2/molecules/g/ml-x.ts'], 102054), null);
});
