/// <mls fileReference="_102020_/l2/helpers/connections/catalogResolve.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  declarationDefPath,
  declarationFilePath,
  declarationImportPath,
  declarationRef,
  declaredSystemsOf,
  integrationLogicalPath,
  integrationOf,
  REGISTRY_LOGICAL_PATH,
  resolveConnection,
  siblingDeclarationMissing,
  siblingModuleNames,
  type ConnectionScope,
} from '/_102020_/l2/helpers/connections/catalogResolve.js';

const ownIntegration = {
  externalSystems: [{
    id: 'repoHost',
    title: 'Host',
    description: 'The host',
    settings: [
      { id: 'repositoryAddress', title: 'Address', description: '', secret: false },
      { id: 'accessKey', title: 'Key', description: '', secret: true },
      { id: '', secret: true },
    ],
    operations: [
      { operationId: 'listChanges', direction: 'call', description: 'list' },
      { operationId: 'changePushed', direction: 'serve', description: 'push' },
      { operationId: 'skip', direction: 'other', description: '' },
    ],
  }],
};

const siblingIntegration = {
  externalSystems: [{
    id: 'zipLookup',
    title: 'Zip',
    description: '',
    settings: [],
    operations: [{ operationId: 'lookup', direction: 'call', description: '' }],
  }],
};

test('d2_187: the systems a module declares keep only the fields the L4 defines', () => {
  const systems = declaredSystemsOf(ownIntegration);
  assert.equal(systems.length, 1);
  assert.equal(systems[0].id, 'repoHost');
  assert.deepEqual(systems[0].settings.map(item => [item.id, item.secret]), [['repositoryAddress', false], ['accessKey', true]]);
  assert.deepEqual(systems[0].operations.map(item => [item.operationId, item.direction]), [['listChanges', 'call'], ['changePushed', 'serve']]);
  assert.deepEqual(declaredSystemsOf({}), []);
  assert.deepEqual(declaredSystemsOf(null), []);
});

test('d2_187: a connection resolves on the platform, then in this module, then in a sibling', () => {
  const own = declaredSystemsOf(ownIntegration);
  const sibling = declaredSystemsOf(siblingIntegration);
  const scope: ConnectionScope = { moduleName: 'codeReview', own, siblings: [{ moduleName: 'integrations', systems: sibling }] };
  assert.equal(resolveConnection('cm', scope, true).origin, 'platform');
  assert.equal(resolveConnection('repoHost', scope, false).origin, 'own');
  const found = resolveConnection('zipLookup', scope, false);
  assert.equal(found.origin, 'sibling');
  assert.equal(found.origin === 'sibling' ? found.moduleName : '', 'integrations');
  assert.equal(resolveConnection('nowhere', scope, false).origin, 'unknown');
  const shadow: ConnectionScope = { moduleName: 'codeReview', own: [{ ...own[0], id: 'cm' }], siblings: [] };
  assert.equal(resolveConnection('cm', shadow, true).origin, 'platform');
});

test('d2_187: the declaration path is the one the platform reads by the systemId', () => {
  assert.equal(declarationDefPath('codeReview', 'repoHost'), 'l1/codeReview/layer_1_external/connections/repoHost.defs.ts');
  assert.equal(declarationFilePath('codeReview', 'repoHost'), 'l1/codeReview/layer_1_external/connections/repoHost.ts');
  assert.equal(declarationRef(102047, 'codeReview', 'repoHost'), '_102047_/l1/codeReview/layer_1_external/connections/repoHost.ts');
  assert.equal(declarationImportPath(102047, 'integrations', 'zipLookup'), '/_102047_/l1/integrations/layer_1_external/connections/zipLookup.js');
  assert.equal(integrationLogicalPath('integrations'), 'l4/integrations/integration.defs.ts');
  assert.equal(REGISTRY_LOGICAL_PATH, 'l4/organization/registry.defs.ts');
  const message = siblingDeclarationMissing('zipLookup', 'integrations');
  assert.match(message, /Generate module integrations first/u);
  assert.equal(message.includes('catalog'), false);
});

test('d2_187: the integration object is the JSON of the export, and siblings come from the registry', () => {
  const parsed = integrationOf('export const integration = { "externalSystems": [] } as const;');
  assert.deepEqual(parsed, { externalSystems: [] });
  assert.equal(integrationOf('not an export'), null);
  assert.equal(integrationOf(null), null);
  const registry = { modules: [{ moduleName: 'customers' }, { moduleName: 'integrations' }, { moduleName: 'codeReview' }, { moduleName: 'customers' }] };
  assert.deepEqual(siblingModuleNames(registry, 'customers'), ['codeReview', 'integrations']);
  assert.deepEqual(siblingModuleNames(null, 'customers'), []);
  assert.deepEqual(siblingModuleNames({}, 'customers'), []);
});
