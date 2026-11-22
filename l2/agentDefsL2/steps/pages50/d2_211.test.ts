/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/d2_211.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { d2BffL4Slice, type D2NeedPage } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import {
  buildD2PagesDecisionPrompt, d2PageWriteKeys, d2PagesPromptOntology, d2PagesPromptPage, pageUnitInputHash,
  type D2PagesContext,
} from '/_102020_/l2/agentDefsL2/steps/pages50/run.js';

const PAGE_IDS = ['agent_behavior', 'agent_configuration', 'my_conduct', 'tool_catalog'] as const;
const categories = (JSON.parse(readFileSync(new URL('../../../../l4/collabux/templates/categoryList.json', import.meta.url), 'utf8')) as { categories: D2PagesContext['template']['categories'] }).categories;

type Pack = {
  pages: Record<string, {
    page: D2PagesContext['page'];
    needsPage: unknown;
    entities: Record<string, unknown>;
    journeys: Record<string, unknown>;
    userLanguage: string;
    grants: unknown[];
    rules: Record<string, string>;
  }>;
};

function pack(which: 'before' | 'after'): Pack {
  return JSON.parse(readFileSync(new URL(`./fixtures/d2_211/${which}.json`, import.meta.url), 'utf8')) as Pack;
}

function fromPack(which: 'before' | 'after', pageId: string): D2PagesContext {
  const row = pack(which).pages[pageId];
  assert.ok(row, pageId);
  return {
    identity: { project: 102047, module: 'agents' },
    snapshot: { snapshotHash: `sha256:d2_211-${which}` } as D2PagesContext['snapshot'],
    artifacts: {
      menu: { userLanguage: row.userLanguage, tree: [] },
      needs: { pages: [row.needsPage] },
      entities: structuredClone(row.entities),
      access: { grants: structuredClone(row.grants) },
      journeys: structuredClone(row.journeys),
      rules: structuredClone(row.rules),
      module: {},
    } as unknown as D2PagesContext['artifacts'],
    page: structuredClone(row.page),
    template: {
      categories, catalog: JSON.stringify({ categories }), catalogHash: 'sha256:catalog',
      templatePaths: new Set<string>(),
      select: async category => ({ experience: 'page11', reason: 'fixture', reference: category, content: '', hash: 'sha256:template' }),
    },
    inventory: { catalogProject: null, selectedBy: null, directDependencies: [], groups: [], sourceHash: 'sha256:inventory' },
    selectedGroups: {}, groups: [], moleculeHashes: {}, skill: 'skill', prompt: 'prompt',
  };
}

function bumpSliceField(context: D2PagesContext): boolean {
  const ontology = d2PagesPromptOntology(context) as Record<string, { fields?: Array<{ path?: string; description?: string; title?: string }> }>;
  for (const [entityId, slice] of Object.entries(ontology)) {
    const field = slice.fields?.find(item => item.path);
    if (!field?.path) continue;
    const entity = context.artifacts.entities[entityId] as { record?: { fields?: Record<string, { description?: string; title?: string; fields?: unknown }> } } | undefined;
    const leaf = field.path.split('.').slice(1);
    let node: Record<string, unknown> | undefined = entity?.record?.fields;
    for (const part of leaf) {
      const next = node?.[part] as Record<string, unknown> | undefined;
      if (!next) { node = undefined; break; }
      if (part === leaf[leaf.length - 1]) {
        next.description = `${typeof next.description === 'string' ? next.description : ''} extra`;
        return true;
      }
      node = next.fields as Record<string, unknown> | undefined;
    }
  }
  return false;
}

void test('d2_211 real pair: pages that do not read the Tool slice keep the unit hash', async () => {
  for (const pageId of ['agent_behavior', 'agent_configuration', 'my_conduct'] as const) {
    assert.equal(await pageUnitInputHash(fromPack('before', pageId)), await pageUnitInputHash(fromPack('after', pageId)), pageId);
  }
});

void test('d2_211 real pair: tool_catalog reads the Tool slice so the unit hash changes', async () => {
  assert.notEqual(await pageUnitInputHash(fromPack('before', 'tool_catalog')), await pageUnitInputHash(fromPack('after', 'tool_catalog')));
});

void test('d2_211 controls: slice prose changes the hash; sourceHashes and an entity outside the prompt do not', async () => {
  const catalog = fromPack('before', 'tool_catalog');
  const catalogBase = await pageUnitInputHash(catalog);
  assert.equal(bumpSliceField(catalog), true);
  assert.notEqual(await pageUnitInputHash(catalog), catalogBase);

  const hashed = fromPack('before', 'agent_behavior');
  const hashedBase = await pageUnitInputHash(hashed);
  const bindings = hashed.page.operationBindings ?? [];
  assert.ok(bindings.length);
  bindings[0] = { ...bindings[0], sourceHashes: ['sha256:d2_211-control'] };
  hashed.page.operationBindings = bindings;
  assert.equal(await pageUnitInputHash(hashed), hashedBase);

  const outside = fromPack('before', 'agent_behavior');
  const ontologyIds = new Set(Object.keys(d2PagesPromptOntology(outside)));
  assert.equal(ontologyIds.has('Tool'), false);
  const tool = outside.artifacts.entities.Tool as { description?: string } | undefined;
  assert.ok(tool);
  tool.description = `${tool.description ?? ''} outside`;
  assert.equal(await pageUnitInputHash(outside), await pageUnitInputHash(fromPack('before', 'agent_behavior')));
});

void test('d2_211 agent_behavior prompt page and ontology match the pre-extract payload', () => {
  const context = fromPack('before', 'agent_behavior');
  const { page, artifacts } = context;
  const expectedPage = {
    pageId: page.pageId, label: page.label, actors: page.actors, authorityRefs: page.authorityRefs,
    ancestors: page.ancestors,
    organisms: page.organisms.map((raw, sourceIndex) => {
      const item = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
      return { organismId: `organism${sourceIndex + 1}`, sourceIndex, kind: typeof item.kind === 'string' ? item.kind.trim() : '', text: typeof item.text === 'string' ? item.text.trim() : '' };
    }),
    reads: page.reads, writes: page.writes, writeKeys: d2PageWriteKeys(page),
    journeys: Object.fromEntries(page.journeyRefs.map(id => [id, artifacts.journeys[id]])),
    userLanguage: (artifacts.menu as { userLanguage?: string }).userLanguage || 'en',
  };
  const expectedOntology = d2BffL4Slice(
    Object.fromEntries(Object.entries(artifacts.entities).filter(([id]) => JSON.stringify([page.reads, page.writes, page.organisms]).includes(id))) as Record<string, Ns5OntologyAnyEntity>,
    (artifacts.rules ?? {}) as Record<string, string>,
    page as D2NeedPage,
    [],
  ).entities;
  const payload = JSON.parse(buildD2PagesDecisionPrompt(context).prompt) as { page: unknown; ontology: unknown };
  assert.equal(JSON.stringify(payload.page), JSON.stringify(expectedPage));
  assert.equal(JSON.stringify(payload.ontology), JSON.stringify(expectedOntology));
  assert.deepEqual(d2PagesPromptPage(context), expectedPage);
  assert.deepEqual(d2PagesPromptOntology(context), expectedOntology);
});

void test('d2_211 fixture covers the four pages', () => {
  for (const which of ['before', 'after'] as const) {
    assert.deepEqual(Object.keys(pack(which).pages).sort(), [...PAGE_IDS].sort());
  }
});
