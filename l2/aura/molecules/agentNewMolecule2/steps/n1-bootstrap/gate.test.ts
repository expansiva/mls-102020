/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/steps/n1-bootstrap/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkNmGroupChoice,
  runNmBootstrapGate,
  type NmBootstrapInputs,
  type NmKnownGroup,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/steps/n1-bootstrap/gate.js';
import { MoleculeContext } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmContext.js';

const KNOWN: NmKnownGroup[] = [
  { name: 'groupViewMetric', skillReference: '/_102020_/l2/aura/molecules/skills/groupViewMetric/creation' },
  { name: 'groupNavigateMain' }, // the real gap in skills/index.ts today
];

function context(overrides: Partial<MoleculeContext> = {}): MoleculeContext {
  return {
    schemaVersion: 1,
    createdAt: '2026-07-29T00:00:00.000Z',
    runKey: 'kpi-card',
    userPrompt: 'a KPI card',
    userLanguage: 'pt',
    destination: { project: 102053, groupFolder: 'groupviewmetric', groupCanonical: 'groupViewMetric' },
    groupSkill: { description: 'metrics', reference: '/skill/creation', usageReference: '/skill/usage' },
    base: { reference: '_102033_/l2/moleculeBase.ts', className: 'MoleculeAuraElement', importPath: '/_102033_/l2/moleculeBase.js' },
    theme: { present: false, reference: null, info: null },
    ...overrides,
  };
}

function inputs(overrides: Partial<NmBootstrapInputs> = {}): NmBootstrapInputs {
  return {
    group: 'groupViewMetric',
    known: KNOWN,
    groupSkillLoaded: true,
    baseFound: true,
    themePresent: false,
    themeErrors: [],
    destProject: 102053,
    context: context(),
    ...overrides,
  };
}

test('a valid neutral run passes — no theme is NOT an error', () => {
  assert.deepEqual(runNmBootstrapGate(inputs()), []);
});

test('an unknown group fails readably and lists what exists', () => {
  const issues = checkNmGroupChoice('groupNope', KNOWN);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, 'group_unknown');
  assert.ok(issues[0].message.includes('groupViewMetric'));
});

test('a group with no creation skill fails (Q5 — groupNavigateMain today)', () => {
  const issues = checkNmGroupChoice('groupNavigateMain', KNOWN);
  assert.deepEqual(issues.map(issue => issue.code), ['group_no_skill']);
});

test('the group match is case-insensitive (the classifier may echo any casing)', () => {
  assert.deepEqual(checkNmGroupChoice('groupviewmetric', KNOWN), []);
});

test('an empty group is rejected before anything else', () => {
  assert.deepEqual(checkNmGroupChoice('', KNOWN).map(issue => issue.code), ['group_unknown']);
});

test('an unloadable group skill fails, carrying the underlying reason', () => {
  const issues = runNmBootstrapGate(inputs({ groupSkillLoaded: false, groupSkillError: 'module not found' }));
  assert.deepEqual(issues.map(issue => issue.code), ['group_skill_empty']);
  assert.ok(issues[0].message.includes('module not found'));
});

test('a missing molecule base fails — it comes from mls-102033, not 102040', () => {
  const issues = runNmBootstrapGate(inputs({ baseFound: false }));
  assert.deepEqual(issues.map(issue => issue.code), ['base_unreadable']);
  assert.ok(issues[0].message.includes('102033'));
});

test('a theme that is present but invalid is FATAL', () => {
  const issues = runNmBootstrapGate(inputs({ themePresent: true, themeErrors: ['themeInfo.suffix is missing'] }));
  assert.ok(issues.some(issue => issue.code === 'theme_invalid'));
});

test('theme errors are ignored when there is no theme (absence is not invalidity)', () => {
  assert.deepEqual(runNmBootstrapGate(inputs({ themePresent: false, themeErrors: ['no theme skill'] })), []);
});

test('a themed run needs a suffix — without it the molecule cannot be named apart', () => {
  const themed = context({
    theme: {
      present: true,
      reference: '_102053_/l2/skills/theme.ts',
      info: { name: 'glass', suffix: '', displayName: 'Glass', description: '', background: { kind: 'dark', css: '', note: '' } },
    },
  });
  const issues = runNmBootstrapGate(inputs({ themePresent: true, context: themed }));
  assert.deepEqual(issues.map(issue => issue.code), ['theme_suffix']);
});

test('a camelCase group folder is rejected — it would derive a tag that matches no molecule', () => {
  const bad = context({ destination: { project: 102053, groupFolder: 'groupViewMetric', groupCanonical: 'groupViewMetric' } });
  assert.deepEqual(runNmBootstrapGate(inputs({ context: bad })).map(issue => issue.code), ['group_folder']);
});

test('a missing destination project fails', () => {
  assert.ok(runNmBootstrapGate(inputs({ destProject: 0 })).some(issue => issue.code === 'dest_project'));
});

test('an unassembled context fails even when nothing else did', () => {
  assert.deepEqual(runNmBootstrapGate(inputs({ context: null })).map(issue => issue.code), ['context']);
});
