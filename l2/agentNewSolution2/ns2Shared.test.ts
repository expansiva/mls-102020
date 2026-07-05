/// <mls fileReference="_102020_/l2/agentNewSolution2/ns2Shared.test.ts" enhancement="_blank"/>
import test from 'node:test';
import assert from 'node:assert/strict';
import { coerceOntologyEnumArrays } from '/_102020_/l2/agentNewSolution2/ns2Shared.js';

test('coerceOntologyEnumArrays removes redundant entityId from ontology map entries', () => {
  const result = {
    ontology: {
      entities: {
        MenuItem: {
          entityId: 'MenuItem',
          title: 'Menu item',
          description: 'Catalog item.',
          ownership: 'mdmOwned',
          modelingDecision: 'Stable catalog data.',
          statusEnum: 'active',
        },
      },
    },
  };

  coerceOntologyEnumArrays(result);

  assert.equal('entityId' in result.ontology.entities.MenuItem, false);
  assert.deepEqual(result.ontology.entities.MenuItem.statusEnum, ['active']);
});
