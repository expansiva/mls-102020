/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/needs30/gate.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  parseP2Grants,
  parseP2Processes,
} from '/_102020_/l2/agentPlannerL2/steps/menu20/contracts.js';
import {
  parseP2L4Sources,
  type P2L4Sources,
} from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';
import {
  buildP2NeedsFile,
} from '/_102020_/l2/agentPlannerL2/steps/needs30/contracts.js';
import { validateP2Needs } from '/_102020_/l2/agentPlannerL2/steps/needs30/gate.js';
import type { PoolMenuFile, PoolNeedsFile } from '/_102035_/l2/solution/poolPlan.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const L4_FIXTURE = path.join(HERE, '../workspaces20/fixtures/mensalidadesAcademia');
const WORKFLOWS = path.join(HERE, '../menu20/fixtures/workflows.defs.ts');
const MENU_PATH = path.join(HERE, 'fixtures/menu.json');
const AT = new Date(Date.UTC(2026, 8, 21, 12, 0, 0));

function extractDefsJson(source: string): unknown {
  const assignment = source.search(/export\s+const\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=/);
  const start = source.indexOf('{', Math.max(0, assignment));
  if (assignment < 0 || start < 0) throw new Error('no json object in defs');
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') { inString = true; continue; }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return JSON.parse(source.slice(start, index + 1));
    }
  }
  throw new Error('unbalanced defs json');
}

function readDefs(root: string, rel: string): unknown {
  return extractDefsJson(readFileSync(path.join(root, rel), 'utf8'));
}

function loadSources(): P2L4Sources {
  const journeyDir = path.join(L4_FIXTURE, 'journeys');
  const ontologyDir = path.join(L4_FIXTURE, 'ontology');
  const journeys = readdirSync(journeyDir)
    .filter(name => name.endsWith('.defs.ts') && name !== 'index.defs.ts')
    .sort()
    .map(name => readDefs(L4_FIXTURE, `journeys/${name}`));
  const ontologyEntities = readdirSync(ontologyDir)
    .filter(name => name.endsWith('.defs.ts') && name !== 'index.defs.ts')
    .sort()
    .map(name => readDefs(L4_FIXTURE, `ontology/${name}`));
  const moduleArtifact = readDefs(L4_FIXTURE, 'module.defs.ts') as { userLanguage?: string; moduleName?: string };
  return parseP2L4Sources({
    moduleName: moduleArtifact.moduleName,
    userLanguage: moduleArtifact.userLanguage,
    journeyIndex: readDefs(L4_FIXTURE, 'journeys/index.defs.ts'),
    journeys,
    access: readDefs(L4_FIXTURE, 'access.defs.ts'),
    ontologyIndex: readDefs(L4_FIXTURE, 'ontology/index.defs.ts'),
    ontologyEntities,
  });
}

function loadOk(): { file: PoolNeedsFile; menu: PoolMenuFile; sources: P2L4Sources; grants: ReturnType<typeof parseP2Grants> } {
  const sources = loadSources();
  const menu = JSON.parse(readFileSync(MENU_PATH, 'utf8')) as PoolMenuFile;
  const grants = parseP2Grants(readDefs(L4_FIXTURE, 'access.defs.ts'));
  const file = buildP2NeedsFile({
    menu,
    sources,
    grants,
    processes: parseP2Processes(extractDefsJson(readFileSync(WORKFLOWS, 'utf8'))),
    now: AT,
  });
  return { file, menu, sources, grants };
}

void test('gate accepts the mensalidadesAcademia needs file', () => {
  const { file, menu, sources, grants } = loadOk();
  const gate = validateP2Needs(file, menu, sources, grants);
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

void test('gate is structural: unknown entity, page, transition, enums', () => {
  const { file, menu, sources, grants } = loadOk();

  const unknownEntity: PoolNeedsFile = structuredClone(file);
  unknownEntity.pages[0].reads.push({
    entity: 'NoSuch', family: 'tdm', scope: 'organization', derived: [], from: ['organism:detail'],
  });
  const entityGate = validateP2Needs(unknownEntity, menu, sources, grants);
  assert.equal(entityGate.ok, false);
  assert.ok(entityGate.issues.some(issue => issue.code === 'P2_NEEDS_ENTITY_UNKNOWN'));

  const unknownPage: PoolNeedsFile = structuredClone(file);
  unknownPage.pages.push({
    pageId: 'no_such_page', actors: ['recepcao'], reads: [], writes: [],
  });
  const pageGate = validateP2Needs(unknownPage, menu, sources, grants);
  assert.equal(pageGate.ok, false);
  assert.ok(pageGate.issues.some(issue => issue.code === 'P2_NEEDS_PAGE_UNKNOWN'));

  const unknownTransition: PoolNeedsFile = structuredClone(file);
  unknownTransition.pages[0].writes.push({
    entity: 'Matricula', operation: 'transition', transitionRef: 'settle', from: ['journey:x/y'],
  });
  const transitionGate = validateP2Needs(unknownTransition, menu, sources, grants);
  assert.equal(transitionGate.ok, false);
  assert.ok(transitionGate.issues.some(issue => issue.code === 'P2_NEEDS_TRANSITION_UNKNOWN'));

  const badOp: PoolNeedsFile = structuredClone(file);
  (badOp.pages[0].writes[0] as { operation: string }).operation = 'upsert';
  const opGate = validateP2Needs(badOp, menu, sources, grants);
  assert.equal(opGate.ok, false);
  assert.ok(opGate.issues.some(issue => issue.code === 'P2_NEEDS_OPERATION'));

  const badScope: PoolNeedsFile = structuredClone(file);
  (badScope.pages.find(page => page.reads.length)?.reads[0] as { scope: string }).scope = 'world';
  const scopeGate = validateP2Needs(badScope, menu, sources, grants);
  assert.equal(scopeGate.ok, false);
  assert.ok(scopeGate.issues.some(issue => issue.code === 'P2_NEEDS_SCOPE'));

  const badRelationship: PoolNeedsFile = structuredClone(file);
  const relationalRead = badRelationship.pages.find(page => page.reads.length)?.reads[0];
  assert.ok(relationalRead);
  relationalRead.from.push('relationship:UnknownEntity/unknownLink');
  const relationshipGate = validateP2Needs(badRelationship, menu, sources, grants);
  assert.equal(relationshipGate.ok, false);
  assert.ok(relationshipGate.issues.some(issue => issue.code === 'P2_NEEDS_RELATIONSHIP_SOURCE_UNKNOWN'));

  const missingAccess: PoolNeedsFile = structuredClone(file);
  const needsGrant = missingAccess.pages.find(page => page.reads.length)?.reads[0];
  assert.ok(needsGrant);
  needsGrant.from = needsGrant.from.filter(reference => !reference.startsWith('grant:'));
  const accessGate = validateP2Needs(missingAccess, menu, sources, grants);
  assert.equal(accessGate.ok, false);
  assert.ok(accessGate.issues.some(issue => issue.code === 'P2_NEEDS_ACCESS_SOURCE_MISSING'));

  const adulteratedGrant: PoolNeedsFile = structuredClone(file);
  const citedRead = adulteratedGrant.pages.find(page => page.reads.length)?.reads[0];
  assert.ok(citedRead);
  citedRead.from = citedRead.from.map(reference => reference.startsWith('grant:') ? 'grant:forgedGrant' : reference);
  const adulteratedGrantGate = validateP2Needs(adulteratedGrant, menu, sources, grants);
  assert.equal(adulteratedGrantGate.ok, false);
  assert.ok(adulteratedGrantGate.issues.some(issue => issue.code === 'P2_NEEDS_ACCESS_GRANT_INVALID'));
});
