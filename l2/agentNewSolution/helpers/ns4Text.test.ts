/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/ns4Text.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { NS4_DEFAULT_TITLES, normalizeNs4RootPlan } from '/_102020_/l2/agentNewSolution/helpers/ns4Core.js';
import {
  NS4_PHRASE_MAX_LENGTH, NS4_PHRASES, isNs4PhraseKey, normalizeNs4Phrases, ns4PlannerPhrasesAppendix, ns4Text,
  ns4WidgetLabels, type Ns4PhraseKey,
} from '/_102020_/l2/agentNewSolution/helpers/ns4Text.js';
import { NS4_WIDGET_KEYS } from '/_102020_/l2/agentNewSolution/helpers/ns4WidgetPhrases.js';

const ptPhrases = JSON.parse(readFileSync(new URL('fixtures/ns4-phrases-pt.json', import.meta.url), 'utf8')) as Record<string, string>;

const PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9]*)\}/g;

function placeholdersOf(template: string): string[] {
  return [...template.matchAll(PLACEHOLDER)].map(match => match[1]).sort();
}

test('the English catalogue is the only source of keys and the PT fixture covers every one', () => {
  const keys = Object.keys(NS4_PHRASES).sort();
  assert.deepEqual(Object.keys(ptPhrases).sort(), keys);
  for (const key of keys) {
    assert.equal(isNs4PhraseKey(key), true);
    assert.deepEqual(placeholdersOf(ptPhrases[key]), placeholdersOf(NS4_PHRASES[key as Ns4PhraseKey]));
  }
});

test('ns4Text reads presentation.phrases and falls back to English', () => {
  assert.equal(ns4Text(undefined, 'catalogue.list.title', { entity: 'Product' }), 'List Product');
  assert.equal(ns4Text({ phrases: {} }, 'catalogue.create.story'), 'Fill in the new record.');
  assert.equal(
    ns4Text({ phrases: { 'catalogue.list.title': 'Listar {entity}' } }, 'catalogue.list.title', { entity: 'Produto' }),
    'Listar Produto',
  );
});

test('planner phrases: unknown key, lost placeholder or overlong value fall back to English with a warning', () => {
  const long = 'x'.repeat(NS4_PHRASE_MAX_LENGTH);
  const result = normalizeNs4Phrases({
    'catalogue.list.title': 'Listar {entity}',
    'not.a.key': 'ignored',
    'catalogue.create.title': 'Create without the entity placeholder',
    'catalogue.update.title': long,
  });
  assert.equal(result.phrases['catalogue.list.title'], 'Listar {entity}');
  assert.equal(result.phrases['catalogue.create.title'], undefined);
  assert.equal(result.phrases['catalogue.update.title'], undefined);
  assert.equal('not.a.key' in result.phrases, false);
  assert.ok(result.warnings.some(item => item.includes('unknown phrase key not.a.key')));
  assert.ok(result.warnings.some(item => item.includes('catalogue.create.title') && item.includes('{placeholder}')));
  assert.ok(result.warnings.some(item => item.includes('catalogue.update.title') && item.includes(String(NS4_PHRASE_MAX_LENGTH))));
});

test('normalizeNs4RootPlan persists accepted phrases and surfaces warnings', () => {
  const titles = Object.fromEntries(Object.keys(NS4_DEFAULT_TITLES).map(id => [id, id]));
  const plan = normalizeNs4RootPlan({
    validPrompt: true,
    userPrompt: 'Create a stock module',
    userLanguage: 'pt-BR',
    titles,
    phrases: {
      'catalogue.list.title': 'Listar {entity}',
      'invented.key': 'nope',
      'catalogue.create.title': 'lost the braces',
    },
    clarification: { userLanguage: 'pt-BR', title: 'Clarify', legends: [], questions: {} },
  }, 'Create a stock module');
  assert.equal(plan.presentation.phrases?.['catalogue.list.title'], 'Listar {entity}');
  assert.equal(plan.presentation.phrases?.['catalogue.create.title'], undefined);
  assert.ok(plan.phraseWarnings?.some(item => item.includes('invented.key')));
  assert.ok(plan.phraseWarnings?.some(item => item.includes('catalogue.create.title')));
});

test('the planner prompt appendix injects the live English catalogue rather than a handwritten copy', () => {
  const appendix = ns4PlannerPhrasesAppendix();
  assert.match(appendix, /Translate the values only/);
  assert.match(appendix, /keep every key and every `\{placeholder\}` verbatim/);
  assert.ok(appendix.includes(JSON.stringify(NS4_PHRASES, null, 2)));
});

test('widget chrome: missing phrases fall back to English; the PT fixture reproduces the previous tables', () => {
  for (const widget of Object.keys(NS4_WIDGET_KEYS) as Array<keyof typeof NS4_WIDGET_KEYS>) {
    const english = ns4WidgetLabels(undefined, widget);
    const localized = ns4WidgetLabels({ phrases: ptPhrases }, widget);
    for (const key of NS4_WIDGET_KEYS[widget]) {
      const phraseKey = `widget.${widget}.${key}` as Ns4PhraseKey;
      assert.equal(english[key], NS4_PHRASES[phraseKey], phraseKey);
      assert.equal(localized[key], ptPhrases[phraseKey], phraseKey);
    }
  }
});
