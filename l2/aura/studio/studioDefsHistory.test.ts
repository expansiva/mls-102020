/// <mls fileReference="_102020_/l2/aura/studio/studioDefsHistory.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFS_HISTORY_PROJECTS, defsHistoryEnabled, organismOf, pathWithinOrganism, type IHistoryElement,
} from '/_102020_/l2/aura/studio/studioDefsHistory.js';

/** A tiny element tree: enough for the two readers, no DOM. */
function el(tag: string, attrs: Record<string, string> = {}, children: IHistoryElement[] = []): IHistoryElement {
  const node: IHistoryElement = {
    tagName: tag.toUpperCase(), parentElement: null, previousElementSibling: null,
    getAttribute: name => attrs[name] ?? null,
  };
  children.forEach((child, index) => {
    child.parentElement = node;
    child.previousElementSibling = index ? children[index - 1] : null;
  });
  return node;
}

test('the gate is off outside the listed projects and outside a page folder', () => {
  const [enabled] = DEFS_HISTORY_PROJECTS;
  assert.ok(enabled, 'the smoke project is listed');
  assert.ok(defsHistoryEnabled({ project: enabled, shortName: 'pessoas', folder: 'tarefas/web/desktop/page11' }));
  assert.ok(defsHistoryEnabled({ project: enabled, shortName: 'pessoas', folder: 'tarefas/web/mobile/page21' }));
  assert.ok(!defsHistoryEnabled({ project: 999999, shortName: 'pessoas', folder: 'tarefas/web/desktop/page11' }));
  assert.ok(!defsHistoryEnabled({ project: enabled, shortName: 'pessoas', folder: 'tarefas/web/shared' }));
  assert.ok(!defsHistoryEnabled(null));
});

test('organism and path come from the closest data-organism-id', () => {
  const second = el('button');
  const first = el('button');
  const div = el('div', {}, [el('span'), first, second]);
  const organism = el('section', { 'data-organism-id': 'pessoasEquipe' }, [div]);
  el('main', {}, [organism]);
  assert.equal(organismOf(second), 'pessoasEquipe');
  assert.equal(pathWithinOrganism(second), 'div>button#1');
  assert.equal(pathWithinOrganism(first), 'div>button');
  assert.equal(pathWithinOrganism(organism), 'section');
});

test('outside every organism the path is capped and the organism is null', () => {
  const inner = el('b');
  el('p', {}, [inner]);
  assert.equal(organismOf(inner), null);
  assert.equal(pathWithinOrganism(inner), 'p>b');

  const leaf = el('i');
  let top = leaf;
  for (let depth = 0; depth < 12; depth++) top = el('div', {}, [top]);
  assert.equal(pathWithinOrganism(leaf).split('>').length, 8);
});
