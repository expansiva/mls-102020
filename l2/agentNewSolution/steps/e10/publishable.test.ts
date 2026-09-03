/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e10/publishable.test.ts" enhancement="_blank"/>

// The l5 blocks a publish needs. The first module that went live had `workspaceDependencies` and
// `projects` typed in by hand — not because writing them is wrong, but because nothing SAID they
// were missing and the failure surfaced hours later inside the publish.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PROJECT_APP_ENV, PLATFORM_BLOCK_DEFAULTS, applyPlatformBlockDefaults,
  buildProjectsBlock, buildWorkspaceDependencies, collectProjectJsonIssues, collectPublishableConfigIssues,
  ensureProjectAppEnv, ensureProjectModule, ensureProjectType, readProjectTypeFromProjectJson,
} from './publishable.js';
import { stripNs4ModuleFromProjectJson } from '/_102020_/l2/agentNewSolution/helpers/ns4RebuildAll.js';

test('workspaceDependencies is exactly what the platform reports, deduped and never filtered', () => {
  assert.deepEqual(buildWorkspaceDependencies([102029, 102033, 102034, 102029]), ['102029', '102033', '102034']);
  assert.deepEqual(buildWorkspaceDependencies([]), []);
});

test('projects covers every dependency; a declared type is preserved and an unknown one is named', () => {
  const existing = { 102033: { root: '../mls-102033', type: 'master frontend' } };
  const result = buildProjectsBlock(existing, 102046, [102033, 102029]);
  // The module's own project is the client; the typed dependency keeps its type.
  assert.deepEqual(result.projects['102046'], { root: '../mls-102046', type: 'client' });
  assert.deepEqual(result.projects['102033'], { root: '../mls-102033', type: 'master frontend' });
  // The untyped one gets a placeholder AND a finding — the platform API exposes no project type, so
  // guessing 'master backend' silently would put a wrong root in the build.
  assert.deepEqual(result.projects['102029'], { root: '../mls-102029', type: 'lib' });
  assert.equal(result.issues.length, 1, result.issues.join(' | '));
  assert.match(result.issues[0], /projects\.102029: no type in config.projects nor in mls-102029\/l5\/project.json projectType/u);
  assert.match(result.issues[0], /assumed 'lib'/u);
});

test('projectType on a dependency project.json supplies the type and silences the finding', () => {
  const result = buildProjectsBlock({}, 102046, [102033, 102029], {
    '102033': 'master frontend',
    '102029': 'lib',
  });
  assert.deepEqual(result.projects['102033'], { root: '../mls-102033', type: 'master frontend' });
  assert.deepEqual(result.projects['102029'], { root: '../mls-102029', type: 'lib' });
  assert.deepEqual(result.issues, []);
  // Config wins over project.json — a publisher who already typed the block keeps it.
  const preserved = buildProjectsBlock(
    { 102033: { root: '../mls-102033', type: 'lib' } },
    102046, [102033], { '102033': 'master frontend' },
  );
  assert.equal((preserved.projects['102033'] as { type: string }).type, 'lib');
  assert.deepEqual(preserved.issues, []);
  // Junk in typeById is ignored (same as missing).
  const junk = buildProjectsBlock({}, 102046, [102034], { '102034': 'backend' });
  assert.equal((junk.projects['102034'] as { type: string }).type, 'lib');
  assert.equal(junk.issues.length, 1);
});

test('projectType is read from project.json and written only when absent', () => {
  assert.equal(readProjectTypeFromProjectJson({ projectType: 'master backend' }), 'master backend');
  assert.equal(readProjectTypeFromProjectJson({ projectType: 'nope' }), '');
  assert.equal(readProjectTypeFromProjectJson({}), '');
  assert.deepEqual(ensureProjectType({ orgName: 'x' }, 'client'), {
    projectJson: { orgName: 'x', projectType: 'client' }, changed: true,
  });
  assert.deepEqual(ensureProjectType({ projectType: 'lib' }, 'client'), {
    projectJson: { projectType: 'lib' }, changed: false,
  });
});

test('a platform block is filled from ONE source only when absent, and says so', () => {
  const tuned = { publication: { defaultTarget: 'custom' } };
  const result = applyPlatformBlockDefaults(tuned);
  // The publisher's own block survives untouched…
  assert.deepEqual(result.config.publication, { defaultTarget: 'custom' });
  // …and the two that were missing arrive from the default, each with its finding.
  assert.deepEqual(result.config.shellTemplates, PLATFORM_BLOCK_DEFAULTS.shellTemplates);
  assert.deepEqual(result.config.clientShell, PLATFORM_BLOCK_DEFAULTS.clientShell);
  assert.equal(result.issues.length, 2, result.issues.join(' | '));
  assert.ok(result.issues.every(issue => /was missing and the platform default was written/u.test(issue)));
});

test('appEnv is written only when absent — a project moved to homologation keeps it', () => {
  assert.deepEqual(ensureProjectAppEnv({ modules: [] }), { projectJson: { modules: [], appEnv: DEFAULT_PROJECT_APP_ENV }, changed: true });
  assert.deepEqual(ensureProjectAppEnv({ appEnv: 'homologation' }), { projectJson: { appEnv: 'homologation' }, changed: false });
  assert.equal(DEFAULT_PROJECT_APP_ENV, 'presentation');
});

test('the checklist names the missing block instead of letting the publish fail later', () => {
  const clean = {
    workspaceDependencies: ['102033'],
    projects: { 102046: { root: '../mls-102046', type: 'client', modules: [{ moduleId: 'petShop' }] }, 102033: { root: '../mls-102033', type: 'lib' } },
    ...PLATFORM_BLOCK_DEFAULTS,
  };
  assert.deepEqual(collectPublishableConfigIssues(clean, 'petShop', [102033]), []);

  const broken = { ...clean, workspaceDependencies: [], projects: {}, shellTemplates: undefined };
  const issues = collectPublishableConfigIssues(broken, 'petShop', [102033]);
  assert.ok(issues.some(i => /workspaceDependencies is missing 102033/u.test(i)), issues.join(' | '));
  assert.ok(issues.some(i => /projects does not cover 102033/u.test(i)), issues.join(' | '));
  assert.ok(issues.some(i => /config\.shellTemplates is absent/u.test(i)), issues.join(' | '));
  assert.ok(issues.some(i => /module 'petShop' is not listed/u.test(i)), issues.join(' | '));
  // Unreadable config: one finding, not a crash.
  assert.deepEqual(collectPublishableConfigIssues(null, 'petShop', []), ['l5/config.json is missing or unreadable']);
});

test('the module has to be listed in l5/project.json.modules', () => {
  assert.deepEqual(collectProjectJsonIssues({ modules: [{ moduleId: 'petShop' }] }, 'petShop'), []);
  assert.deepEqual(collectProjectJsonIssues({ modules: ['petShop'] }, 'petShop'), []);
  assert.deepEqual(collectProjectJsonIssues({ modules: [{ moduleName: 'petShop' }] }, 'petShop'), []);
  assert.match(collectProjectJsonIssues({ modules: [] }, 'petShop')[0], /does not list 'petShop'/u);
  assert.match(collectProjectJsonIssues(null, 'petShop')[0], /missing or unreadable/u);
});

test('/rebuild all that strips then E10 re-lists the module leaves the checklist clean', () => {
  const before = {
    modules: [
      { moduleName: 'todo', backend: { routeKeys: ['todo.taskCatalogue.qryListTask'] } },
      { moduleName: 'listaAssinatura', backend: { routeKeys: ['listaAssinatura.petitionLanding.qryLocatePetition'] } },
    ],
  };
  const stripped = stripNs4ModuleFromProjectJson(before, 'listaAssinatura');
  assert.equal(stripped.removed, 1);
  assert.match(collectProjectJsonIssues(stripped.value, 'listaAssinatura')[0], /does not list 'listaAssinatura'/u);
  const restored = ensureProjectModule(stripped.value, 'listaAssinatura');
  assert.equal(restored.changed, true);
  assert.deepEqual(collectProjectJsonIssues(restored.projectJson, 'listaAssinatura'), []);
  assert.equal((restored.projectJson.modules as Array<{ moduleName: string }>)[0].moduleName, 'todo');
  assert.deepEqual(ensureProjectModule(restored.projectJson, 'listaAssinatura').changed, false);
});
