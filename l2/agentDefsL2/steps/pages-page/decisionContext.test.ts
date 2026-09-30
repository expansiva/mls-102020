/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages-page/decisionContext.test.ts" enhancement="_blank"/>
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import type { D2SharedDefinition } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';
import type { D2SharedDefinitionDocument } from '/_102020_/l2/agentDefsL2/helpers/d2DefinitionFormat.js';
import type { D2InputSnapshot } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import { buildD2PagesDecisionPrompt, D2_PAGES_DECISION_PROMPT_MAX_CHARS } from '/_102020_/l2/agentDefsL2/steps/pages-page/decisionContext.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const CLIENT = path.join(ROOT, 'mls-102047/l2/controleEstoque');

void test('current two-page snapshot and large molecular shortlist fit the complete decision prompt', () => {
  const snapshot = JSON.parse(readFileSync(path.join(CLIENT, 'pipeline/agentDefsL2/input.json'), 'utf8')) as D2InputSnapshot;
  const categoryCatalog = JSON.parse(readFileSync(path.join(ROOT, 'mls-102020/l4/collabux/templates/categoryList.json'), 'utf8')) as { categories: Array<{ categoryId: string; name: string; description: string }> };
  const categories = { pageCategories: { categories: categoryCatalog.categories.map(item => ({ categoryRef: item.categoryId, name: item.name, meaning: item.description })) } };
  for (const page of snapshot.selection.pages) {
    const definition = parseConst(path.join(CLIENT, `web/shared/${page.pageId}.defs.ts`), 'definition') as D2SharedDefinitionDocument;
    const coverage = page.organisms.map((raw, index) => {
      const source = raw as { organismId?: string; kind: string; text: string };
      const content = definition.contents[index % definition.contents.length];
      return { organismId: source.organismId || `organism.${source.kind}.${index + 1}`, sourceIndex: index, kind: source.kind, contentRef: content.id, content: content.intent, scenarioRefs: definition.scenarios.map(item => item.id), capabilityRefs: definition.actions.map(item => item.id), outputFieldsByCapability: Object.fromEntries(definition.actions.map(action => [action.id, action.resultStateRef ? [{ actionId: action.id, outputTypeRef: `${action.id}Output`, path: 'Record.id' }] : []])), source: raw };
    });
    const shared = { moduleName: snapshot.module, pageId: page.pageId, coverage } as unknown as D2SharedDefinition;
    const journeys = page.journeyRefs.map(journeyId => {
      const sourceRef = snapshot.l4!.journeys.find(item => item.journeyId === journeyId)!.source.path;
      const name = path.basename(sourceRef, '.defs.ts');
      const value = parseConst(path.join(ROOT, `mls-102047/${sourceRef}`), `${name}Journey`);
      return { journeyId, sourceRef, value };
    });
    const moleculeShortlist = largeMoleculeContext(page.pageId, coverage.map(item => item.organismId));
    const result = buildD2PagesDecisionPrompt({
      page, shared, definition, userLanguage: 'pt-BR', journeys,
      relevantRules: [], organisms: coverage.map(item => ({ organismId: item.organismId, kind: item.kind, intent: item.content, staticContent: false })),
      categoryCatalog: categories, categoryCatalogRef: '_102020_/l4/collabux/templates/categoryList.json',
      moleculeShortlist, repair: null,
    });
    assert.ok(result.prompt.length <= D2_PAGES_DECISION_PROMPT_MAX_CHARS, JSON.stringify(result.sectionChars));
    assert.ok(result.sectionChars.moleculeShortlist > 40_000, 'fixture retains a large compared candidate set');
    const projected = JSON.parse(result.prompt) as Record<string, unknown>;
    assert.equal((projected.shared as { coverage: unknown[] }).coverage.length, page.organisms.length);
    assert.doesNotMatch(result.prompt, /groupAssessments|operationBindings|dataBindings|businessHash/u);
    const sectionBytes = Object.fromEntries(Object.entries(projected).map(([name, value]) => [name, new TextEncoder().encode(JSON.stringify(value)).length]));
    const rawBytes = { page: new TextEncoder().encode(JSON.stringify(page)).length, sharedDocument: new TextEncoder().encode(JSON.stringify(definition)).length, categoryCatalog: new TextEncoder().encode(JSON.stringify(categoryCatalog)).length };
    console.log(`D2_DECISION_SECTIONS ${page.pageId} totalChars=${result.prompt.length} sectionBytes=${JSON.stringify(sectionBytes)} rawBytes=${JSON.stringify(rawBytes)}`);
  }
});

function largeMoleculeContext(pageId: string, organismIds: string[]) {
  const groups = Array.from({ length: 8 }, (_, groupIndex) => {
    const groupId = `group${groupIndex}`;
    const tags = Array.from({ length: 32 }, (_, candidateIndex) => `${groupId}--ml-candidate-${candidateIndex}`);
    return { groupId, purpose: `Published purpose of ${groupId}`, candidateTags: tags,
      scenarios: [{ scenario: 'Review records', candidates: tags }],
      candidateEvidence: tags.map(tag => ({ tag, excerpt: `- **${tag}** — ${'Published capability and accessibility evidence. '.repeat(4)}` })),
      usageApi: '## Properties\n| value | supplied by the page |\n## Events\n| change | reports a user choice |',
    };
  });
  return { moleculeResearch: { needs: ['desktop', 'mobile'].flatMap(device => organismIds.map(organismId => ({ need: { needId: `${pageId}/${device}/${organismId}`, device, organismId, intent: 'Review records', inputRefs: [], outputRefs: [], interaction: 'inspect', accessibility: ['keyboard'], template: null }, relevantGroupIds: groups.map(group => group.groupId) }))), groups } };
}

function parseConst(file: string, name: string): unknown {
  const source = readFileSync(file, 'utf8');
  const match = new RegExp(`export const ${name} = (\\{[\\s\\S]*?\\}) as const`).exec(source);
  if (!match) throw new Error(`D2_FIXTURE_CONST_MISSING: ${file}/${name}`);
  return JSON.parse(match[1]);
}
