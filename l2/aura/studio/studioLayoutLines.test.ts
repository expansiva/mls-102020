/// <mls fileReference="_102020_/l2/aura/studio/studioLayoutLines.test.ts" enhancement="_blank" />
// Guards over the layout lines' wiring: the gate (advanced mode, off by default), what the layer
// leaves in the client page, and its place under the selection. The drawing rules are tested on plain
// numbers in studioLayoutLinesCore.test.ts.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (name: string): string => readFileSync(new URL(name, import.meta.url), 'utf8').replace(/\r\n/gu, '\n');
const EDITOR = read('studioEditor.ts');
const LINES = read('studioLayoutLines.ts');
const SELECT_PAGE = read('../plugins/selectPage.ts');

/** A member of a class, up to the next member at the same indent. */
function member(source: string, signature: string, indent = '  '): string {
  const start = source.indexOf(signature);
  assert.ok(start >= 0, `missing: ${signature}`);
  const rest = source.slice(start + signature.length);
  const end = rest.search(new RegExp(`\\n${indent}(?:private|public|protected|/\\*\\*|// ---)`, 'u'));
  return rest.slice(0, end < 0 ? undefined : end);
}

test('the layer exists only while armed AND some line is active — the gate first', () => {
  const apply = member(EDITOR, 'private applyAdvancedPrefs(');
  assert.match(apply, /this\.mode === 'off' \|\| !host \|\| !activeLines\(prefs\)\.length/u);
  assert.match(apply, /this\.layoutLines\?\.destroy\(\)/u);
});

test('disarming gives the page back: unsubscribe and destroy', () => {
  const setMode = member(EDITOR, 'public setMode(');
  assert.match(setMode, /this\.unsubAdvanced\?\.\(\);/u);
  assert.match(setMode, /this\.layoutLines\?\.destroy\(\);\s*this\.layoutLines = null;/u);
  assert.match(setMode, /this\.unsubAdvanced = onAdvancedPrefsChange\(/u);
});

test('the shortcut is the editor’s only with the advanced mode on, and never while typing', () => {
  const key = member(EDITOR, 'private onEditorKey = ');
  assert.match(key, /e\.key\.toLowerCase\(\) === 'g'/u);
  assert.match(key, /this\.editSpan \|\| this\.isTypingTarget\(e\) \|\| !getAdvancedPrefs\(\)\.advanced\) return;/u);
});

test('destroy removes the attribute, the stylesheet, the layer and the listeners', () => {
  const destroy = member(LINES, 'public destroy(');
  assert.match(destroy, /this\.lines = \[\];/u);
  assert.match(destroy, /this\.applyOutline\(\)/u);
  assert.match(destroy, /this\.stopMeasuring\(\)/u);
  assert.match(destroy, /getElementById\(STYLE_ID\)\?\.remove\(\)/u);
  const stop = member(LINES, 'private stopMeasuring(');
  assert.match(stop, /removeEventListener\('scroll'/u);
  assert.match(stop, /this\.observer\?\.disconnect\(\)/u);
  assert.match(stop, /this\.layer\?\.remove\(\)/u);
  assert.match(member(LINES, 'private applyOutline('), /host\.removeAttribute\(LINES_ATTRIBUTE\)/u);
});

test('the layer is chrome: control class, no pointer events, one z-index BELOW the marking', () => {
  assert.match(LINES, /this\.layer\.className = `\$\{this\.ctx\.controlClass\} se-layout-lines`/u);
  assert.match(LINES, /\.se-layout-lines \{ position: fixed; overflow: hidden; pointer-events: none; z-index: 99989; \}/u);
  assert.match(EDITOR, /pointer-events: none; z-index: 99990;/u, 'the marking stays at 99990');
});

test('the layer is the visible part of the region and clips — nothing is painted over the Studio', () => {
  const draw = member(LINES, 'private draw(');
  for (const side of ['left', 'top', 'width', 'height']) assert.match(draw, new RegExp(`layer\\.style\\.${side} = `, 'u'));
  assert.match(draw, /renderRect\(rect, region\)/u);
  // The region is cut by every ancestor that clips (the nav3 panel scrolls the host inside it).
  const region = member(LINES, 'private visibleRegion(');
  assert.match(region, /cs\.overflowX === 'visible' && cs\.overflowY === 'visible'/u);
});

test('an auto margin (mx-auto) is centring, not spacing: it is not painted', () => {
  assert.match(member(LINES, 'private draw('), /margin: withoutAuto\(el, sides\(cs, 'margin'\)\)/u);
  assert.match(LINES, /String\(map\.get\(prop\)\) === 'auto'/u);
});

test('the outline attribute does not wake the page tree', () => {
  const filter = /attributeFilter: \[([^\]]*)\]/u.exec(member(EDITOR, 'private syncTreeWatch('))?.[1] ?? '';
  assert.doesNotMatch(filter, /data-se-lines/u);
});

test('the Visual tab shows the chips only with the advanced mode on; the switch is in the Page tab', () => {
  assert.match(member(SELECT_PAGE, 'private _renderLayoutLines(', '    '), /if \(!prefs\.advanced\) return nothing;/u);
  assert.match(SELECT_PAGE, /\$\{this\._renderThemeSwitch\(\)\}\$\{this\._renderAdvancedSwitch\(\)\}/u);
  assert.match(SELECT_PAGE, /_renderTabPanel\('visual', html`\$\{this\._renderLayoutLines\(\)\}/u);
});

test('no backtick or dollar-brace inside the layer stylesheet string', () => {
  const css = /const LAYER_CSS = `([\s\S]*?)`;/u.exec(LINES)?.[1] ?? '';
  assert.ok(css.length > 100);
  assert.doesNotMatch(css, /\$\{/u);
});
