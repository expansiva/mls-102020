/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/needs30/d2_206.test.ts" enhancement="_blank"/>

/**
 * Recorded copies, not the live tree:
 * - fixtures/d2_206/l4/* from mls-102047@f45e1e26
 * - fixtures/d2_206/102039/l4/onboarding from mls-102039@812e46e (no menu.json; needs30 cannot run)
 * - fixtures/d2_206/102056/l4/onboarding from mls-102056@4c0b77f
 */

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseNs4ClassicDefsSource } from '/_102035_/l2/solution/helpers/ns4ClassicDefs.js';
import { parseP2Grants, parseP2Processes } from '/_102020_/l2/agentPlannerL2/steps/menu20/contracts.js';
import { parseP2L4Sources } from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';
import { buildP2NeedsFile } from '/_102020_/l2/agentPlannerL2/steps/needs30/contracts.js';
import { planP1Backend, parseP1Entity, parseP1Needs } from '/_102021_/l2/agentPlannerL1/steps/plan20/contracts.js';
import type { L1Inventory } from '/_102021_/l2/agentPlannerL1/helpers/l1Inventory.js';
import type { PoolMenuFile, PoolNeedsRead } from '/_102035_/l2/solution/poolPlan.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, 'fixtures/d2_206');
const AT = new Date(Date.UTC(2026, 10, 21, 12, 0, 0));
const OLD_RANK: Record<string, number> = { own: 0, related: 1, organization: 2 };

function defs(file: string): unknown {
  const parsed = parseNs4ClassicDefsSource<unknown>(readFileSync(file, 'utf8'));
  if (!parsed) throw new Error(file);
  return parsed;
}

function loadModule(root: string) {
  const names = (sub: string) => readdirSync(path.join(root, sub))
    .filter(name => name.endsWith('.defs.ts') && name !== 'index.defs.ts')
    .sort();
  const access = defs(path.join(root, 'access.defs.ts'));
  const moduleArtifact = defs(path.join(root, 'module.defs.ts')) as { moduleName?: string; userLanguage?: string };
  const sources = parseP2L4Sources({
    moduleName: moduleArtifact.moduleName,
    userLanguage: moduleArtifact.userLanguage,
    journeyIndex: defs(path.join(root, 'journeys/index.defs.ts')),
    journeys: names('journeys').map(name => defs(path.join(root, 'journeys', name))),
    access,
    ontologyIndex: defs(path.join(root, 'ontology/index.defs.ts')),
    ontologyEntities: names('ontology').map(name => defs(path.join(root, 'ontology', name))),
  });
  const menu = JSON.parse(readFileSync(path.join(root, 'pool/l2/web/menu.json'), 'utf8')) as PoolMenuFile;
  const processes = parseP2Processes(defs(path.join(root, 'workflows.defs.ts')));
  const grants = parseP2Grants(access);
  return { sources, menu, processes, grants, access };
}

function oldScope(modes: readonly string[]): string {
  let best = '';
  let rank = -1;
  for (const mode of modes) {
    const value = OLD_RANK[mode];
    if (value === undefined) continue;
    if (value > rank) {
      best = mode;
      rank = value;
    }
  }
  return best;
}

function citedModes(read: PoolNeedsRead, grants: ReturnType<typeof parseP2Grants>): string[] {
  return read.from
    .filter(item => item.startsWith('grant:'))
    .map(item => grants.find(grant => grant.grantId === item.slice('grant:'.length))?.dataScope.mode || '');
}

const WITH_MENU = [
  ...readdirSync(path.join(ROOT, 'l4')).map(name => path.join(ROOT, 'l4', name)),
  path.join(ROOT, '102056/l4/onboarding'),
];

void test('my_conduct keeps the PersonalConduct read at scope custom', () => {
  const loaded = loadModule(path.join(ROOT, 'l4/agents'));
  const file = buildP2NeedsFile({ ...loaded, now: AT });
  const page = file.pages.find(item => item.pageId === 'my_conduct');
  assert.ok(page, 'my_conduct');
  const read = page.reads.find(item => item.entity === 'PersonalConduct');
  assert.ok(read, `reads: ${page.reads.map(item => item.entity).join(',')}`);
  assert.equal(read.scope, 'custom');
  assert.ok(read.from.includes('grant:adminOwnConduct') || read.from.includes('grant:memberOwnConduct'));

  const empty: L1Inventory = { routes: [], usecases: [], ports: [], tables: [], present: false };
  const ontology = loaded.sources.entities
    .map(entity => parseP1Entity(entity))
    .filter((entity): entity is NonNullable<typeof entity> => entity !== null);
  const planned = planP1Backend({ needs: parseP1Needs(file), inventory: empty, ontology, now: AT });
  const usecase = planned.file.usecases.find(item => item.entity === 'PersonalConduct');
  assert.ok(usecase, 'PersonalConduct usecase');
  assert.ok(planned.file.endpoints.some(item => item.page === 'my_conduct' && item.usecaseRef === usecase.usecaseId));
});

void test('an unknown scope names the grant and the entity', () => {
  const loaded = loadModule(path.join(ROOT, 'l4/agents'));
  const grants = loaded.grants.map(grant => grant.grantId === 'memberOwnConduct'
    ? { ...grant, dataScope: { ...grant.dataScope, mode: 'galactic' } }
    : grant);
  assert.throws(
    () => buildP2NeedsFile({ ...loaded, grants, now: AT }),
    /P2_NEEDS_SCOPE_UNKNOWN: grant memberOwnConduct has data scope mode "galactic" for entity PersonalConduct/,
  );
});

void test('recorded modules only gain reads the old rank used to drop', () => {
  const gained: string[] = [];
  const changed: string[] = [];
  for (const root of WITH_MENU) {
    assert.equal(existsSync(path.join(root, 'pool/l2/web/menu.json')), true, root);
    const loaded = loadModule(root);
    const file = buildP2NeedsFile({ ...loaded, now: AT });
    const label = root.includes('102056') ? '102056/onboarding' : path.basename(root);
    for (const page of file.pages) {
      for (const read of page.reads) {
        const previous = oldScope(citedModes(read, loaded.grants));
        const where = `${label} ${page.pageId} ${read.entity} ${previous || '∅'} -> ${read.scope}`;
        if (!previous) gained.push(where);
        else if (previous !== read.scope) changed.push(where);
      }
    }
  }
  assert.deepEqual(changed, []);
  assert.ok(gained.some(item => item.startsWith('agents my_conduct PersonalConduct')), gained.join('\n'));
  assert.deepEqual(gained, [
    'agents agents PersonalConduct ∅ -> custom',
    'agents my_conduct PersonalConduct ∅ -> custom',
    'hiringPipeline hiring_manager_home JobPosition ∅ -> assigned',
    'hiringPipeline my_applications JobPosition ∅ -> assigned',
    'hiringPipeline my_positions JobPosition ∅ -> assigned',
    'manutencaoFrota meus_veiculos Veiculo ∅ -> assigned',
    'manutencaoFrota meus_abastecimentos Veiculo ∅ -> assigned',
  ]);
});
