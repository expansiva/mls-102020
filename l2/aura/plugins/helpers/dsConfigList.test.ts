/// <mls fileReference="_102020_/l2/aura/plugins/helpers/dsConfigList.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { designSystemNames, withModuleDesignSystems } from './dsConfigList.js';

test('designSystemNames: file order, no blanks, no repeats', () => {
  assert.deepEqual(designSystemNames([{ themeName: 'Default' }, { themeName: ' Canteiro ' }, { themeName: '' }, { themeName: 'default' }, {}]), ['Default', 'Canteiro']);
});

test('withModuleDesignSystems: every module of the client gets the list; nothing else changes', () => {
  const config = {
    version: 1,
    projects: {
      '102047': { root: '.', modules: [
        { moduleId: 'tarefas', languages: ['pt-BR'], navigation: [{ id: 'a' }] },
        { moduleId: 'agendaClinica', designSystems: ['Default'] },
      ] },
      '102034': { modules: [{ moduleId: 'monitor' }] },
    },
  };
  const before = JSON.parse(JSON.stringify(config));
  const { changed } = withModuleDesignSystems(config, 102047, ['Default', 'Canteiro']);
  assert.equal(changed, true);
  assert.deepEqual(config.projects['102047'].modules.map((m: any) => m.designSystems), [['Default', 'Canteiro'], ['Default', 'Canteiro']]);
  assert.deepEqual((config.projects['102047'].modules[0] as any).navigation, before.projects['102047'].modules[0].navigation);
  assert.deepEqual(config.projects['102034'], before.projects['102034'], 'another project is not touched');
  assert.equal(config.version, 1);
});

test('withModuleDesignSystems: already equal, no client, no modules → nothing to write', () => {
  const same = { projects: { '1': { modules: [{ moduleId: 'm', designSystems: ['A'] }] } } };
  assert.equal(withModuleDesignSystems(same, 1, ['A']).changed, false);
  assert.equal(withModuleDesignSystems({ projects: {} }, 1, ['A']).changed, false);
  assert.equal(withModuleDesignSystems({ projects: { '1': {} } }, 1, ['A']).changed, false);
  assert.equal(withModuleDesignSystems(null, 1, ['A']).changed, false);
});
