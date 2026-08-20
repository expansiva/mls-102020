/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e10/publishable.test.ts" enhancement="_blank"/>

// The l5 blocks a publish needs. The first module that went live had `workspaceDependencies`, `projects`
// and the publish confs typed in by hand — not because writing them is wrong, but because nothing SAID
// they were missing and the failure surfaced hours later inside the publish.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PROJECT_APP_ENV, PLATFORM_BLOCK_DEFAULTS, PUBLISH_CONF_EXAMPLES, applyPlatformBlockDefaults,
  buildProjectsBlock, buildWorkspaceDependencies, collectProjectJsonIssues, collectPublishableConfigIssues,
  ensureProjectAppEnv,
} from './publishable.js';

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
  assert.match(result.issues[0], /projects\.102029: no type declared anywhere/u);
  assert.match(result.issues[0], /assumed 'lib'/u);
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

test('the module has to be listed in l5/project.json.modules, and the confs are only examples', () => {
  assert.deepEqual(collectProjectJsonIssues({ modules: [{ moduleId: 'petShop' }] }, 'petShop'), []);
  assert.deepEqual(collectProjectJsonIssues({ modules: ['petShop'] }, 'petShop'), []);
  assert.match(collectProjectJsonIssues({ modules: [] }, 'petShop')[0], /does not list 'petShop'/u);
  assert.match(collectProjectJsonIssues(null, 'petShop')[0], /missing or unreadable/u);

  // Environment, never generated: placeholders only, and the name says it is an example.
  assert.deepEqual(Object.keys(PUBLISH_CONF_EXAMPLES).sort(), ['publishLocal.conf.example', 'publishRemote.conf.example']);
  for (const content of Object.values(PUBLISH_CONF_EXAMPLES)) {
    assert.match(content, /NEVER commit the real file/u);
    assert.match(content, /<.+>/u, 'every value is a placeholder');
  }
});
