/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/moleculeCatalog.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { d2MoleculeCatalogPort, d2SkillText } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeCatalog.js';

for (const loaderAvailable of [true, false]) {
  void test(`molecular catalog discovers only direct dependencies when loader is ${loaderAvailable ? 'present' : 'absent'}`, async () => {
    const previousMls = (globalThis as unknown as { mls?: unknown }).mls;
    const project = 102123;
    const direct = 102124;
    const withoutCatalog = 102125;
    const loaded: number[] = [];
    const dependencyCalls: Array<[number, boolean]> = [];
    const catalogSource = 'export const skill = `Catalog\n### groupCards (1 molecules)\nCards for records\n`;\nexport const groups = [\n  { name: "groupCards", indexDefs: "/_102124_/l2/molecules/groupcards/index.defs", molecules: 1 },\n];';
    const key = (id: number) => `${id}/2/molecules/skill.ts`;
    const files = {
      [key(direct)]: { versionRef: '1', getContent: async () => catalogSource },
    };
    const stor = {
      files,
      getKeyToFile: (info: { project: number; level: number; folder: string; shortName: string; extension: string }) =>
        `${info.project}/${info.level}/${info.folder}/${info.shortName}${info.extension}`,
      ...(loaderAvailable ? { loadProjectdependenciesInfoIfNeed: async (id: number) => { loaded.push(id); } } : {}),
    };
    (globalThis as unknown as { mls: unknown }).mls = {
      stor,
      l5: {
        getProjectDependencies: (id: number, includeProject: boolean) => {
          dependencyCalls.push([id, includeProject]);
          return [project, direct, withoutCatalog];
        },
      },
    };

    try {
      const found = await d2MoleculeCatalogPort.discover(project);
      assert.deepEqual(loaded, loaderAvailable ? [project] : []);
      assert.deepEqual(dependencyCalls, [[project, false]]);
      assert.deepEqual(found.directDependencies, [direct, withoutCatalog]);
      assert.equal(found.catalogProject, direct);
      assert.equal(found.selectedBy, 'dependency');
      assert.deepEqual(found.groups.map(group => group.groupId), ['groupCards']);
    } finally {
      (globalThis as unknown as { mls?: unknown }).mls = previousMls;
    }
  });
}

void test('d2SkillText reads the groupViewChart skill when the backtick is on the next line', () => {
  const usage = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../aura/molecules/skills/groupViewChart/usage.ts');
  const skill = d2SkillText(fs.readFileSync(usage, 'utf8'));
  assert.ok(skill.length > 0);
  assert.ok(skill.startsWith('# view + chart'));
});

void test('d2SkillText reads a skill when the backtick is on the same line', () => {
  assert.equal(d2SkillText('export const skill = `# same line\n`;\n'), '# same line\n');
});
