/// <mls fileReference="_102020_/l2/aura/services/serviceProject.test.ts" enhancement="_blank"/>
// Source-level guards: the L5 service and its UI panel follow the nav3 tab on screen. Both are Lit elements bound to the
// running app (no DOM here), so what is locked down is the shape that keeps them on the right page — and out of a loop.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const PROJECT = readFileSync(new URL('serviceProject.ts', import.meta.url), 'utf8');
const DS = readFileSync(new URL('../plugins/selectDesignSystem.ts', import.meta.url), 'utf8');

function bodyOf(source: string, signature: string): string {
  const from = source.slice(source.indexOf(signature));
  return from.slice(0, from.indexOf('\n    }\n'));
}

test('the L5 knobs follow the Aura keys a tab switch re-seeds', () => {
  assert.match(PROJECT, /'aura\.actualProject', 'aura\.actualModule', 'aura\.actualDesignSystem', 'aura\.actualDevice'/u);
  assert.match(PROJECT, /subscribe\(FOLLOWED_STATE, this\)/u);
  assert.match(PROJECT, /unsubscribe\(FOLLOWED_STATE, this\)/u);
});

test('following the page only reads the Aura state: nothing written there can come back as a loop', () => {
  for (const signature of ['handleIcaStateChange(key: string', 'private _syncKnobValues(']) {
    const body = bodyOf(PROJECT, signature);
    for (const write of ['setAuraState(', 'saveAuraProject(', '_notifySitesPage(', '_setKnobValue(']) {
      assert.equal(body.includes(write), false, `${write} in ${signature}`);
    }
  }
  // Another project reloads the lists, decided on a marker written before anything is awaited.
  const handler = bodyOf(PROJECT, 'handleIcaStateChange(key: string');
  assert.ok(handler.indexOf('this._listsProject = project;') < handler.indexOf('this._loadModules();'));
});

test('the UI panel rescans the page of the new tab and drops what pointed at the old one', () => {
  assert.match(DS, /window\.addEventListener\(NAV3_TAB_CHANGE_EVENT, this\._onTabChange\)/u);
  assert.match(DS, /window\.removeEventListener\(NAV3_TAB_CHANGE_EVENT, this\._onTabChange\)/u);
  const change = DS.slice(DS.indexOf('private _onTabChange = '), DS.indexOf('};', DS.indexOf('private _onTabChange = ')));
  for (const step of ['this._stopInspect();', 'this._hl.clear();', 'this._stopUsedScan();', 'this._startUsedScan();']) {
    assert.ok(change.includes(step), step);
  }
  assert.equal(change.includes('setAuraState('), false);
});
