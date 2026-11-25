/// <mls fileReference="_102020_/l2/aura/studio/studioAnnotate.test.ts" enhancement="_blank" />
// Guards over the page annotation's wiring: the editor (lifecycle, keys, how an element is described), the layer
// (what it leaves in the client page) and the AI tab (what goes to agentEditPage). The stroke → elements rule is
// tested on plain boxes in studioAnnotateCore.test.ts; the agent side in agentEditPage/editPageMarks.test.ts.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (name: string): string => readFileSync(new URL(name, import.meta.url), 'utf8').replace(/\r\n/gu, '\n');
const EDITOR = read('studioEditor.ts');
const LAYER = read('studioAnnotate.ts');
const SELECT_PAGE = read('../plugins/selectPage.ts');

function member(source: string, signature: string, indent = '  '): string {
  const start = source.indexOf(signature);
  assert.ok(start >= 0, `missing: ${signature}`);
  const rest = source.slice(start + signature.length);
  const end = rest.search(new RegExp(`\\n${indent}(?:private|public|protected|/\\*\\*|// ---)`, 'u'));
  return rest.slice(0, end < 0 ? undefined : end);
}

test('the annotation lives while the editor is armed, and dies with it', () => {
  const setMode = member(EDITOR, 'public setMode(');
  assert.match(setMode, /setAnnotHandler\(null\);\s*this\.annotate\?\.destroy\(\);\s*this\.annotate = null;/u);
  assert.match(setMode, /this\.armAnnotate\(\);/u);
  assert.match(member(EDITOR, 'private armAnnotate('), /setAnnotHandler\(\(command\) => this\.annotate\?\.command\(command\)\)/u);
});

test('a marked element is described like the selection describes one for the agent', () => {
  const arm = member(EDITOR, 'private armAnnotate(');
  for (const field of [/organism: organismOf\(el\)/u, /organismPath: pathWithinOrganism\(el\)/u, /anchorPath: path\.length \? \[\.\.\.path\] : null/u, /const path = this\.domPathOf\(el\)/u]) {
    assert.match(arm, field);
  }
  // Candidates are what a click could select: the same ownership rule.
  assert.match(arm, /this\.resolveSelectableElement\(el\) === el/u);
  assert.match(arm, /!this\.isSlotSource\(el\)/u);
});

test('while annotating, Esc and Ctrl+Z are the annotation’s, before anything else', () => {
  const key = member(EDITOR, 'private onEditorKey = ');
  const annotateAt = key.indexOf('this.annotate?.handleKey(e)');
  assert.ok(annotateAt > 0 && annotateAt < key.indexOf("e.key === 'Escape'"), 'checked before the editor’s own Esc');
});

test('another page drops the marks', () => {
  assert.match(EDITOR, /this\.scheduleTree\(\);\s*this\.annotate\?\.pageChanged\(\);/u);
  assert.match(member(LAYER, 'public pageChanged('), /this\.marks = \[\];/u);
});

test('the layer is chrome and clips; the drawing surface exists only while annotating', () => {
  assert.match(LAYER, /this\.layer\.className = `\$\{this\.ctx\.controlClass\} san-layer`/u);
  assert.match(LAYER, /\.san-layer \{ position: fixed; overflow: hidden; pointer-events: none;/u);
  assert.match(member(LAYER, 'private renderChrome('), /if \(this\.active\) layer\.appendChild\(this\.renderSurface\(\)\);/u);
  assert.match(member(LAYER, 'private place('), /visibleRegionOf\(this\.ctx\.host, this\.clips\)/u);
  assert.match(member(LAYER, 'public destroy('), /getElementById\(STYLE_ID\)\?\.remove\(\)/u);
});

test('the boxes follow their elements every frame, not only on events (scroll inside other boxes, remounts)', () => {
  assert.ok(member(LAYER, 'private ensureLayer(').includes('this.frame = requestAnimationFrame(this.follow)'));
  assert.ok(LAYER.includes('if (this.layer) this.frame = requestAnimationFrame(this.follow);'));
  assert.ok(member(LAYER, 'private removeLayer(').includes('cancelAnimationFrame(this.frame)'));
});

test('the limits the agent enforces are enforced while marking, with the reason', () => {
  assert.match(member(LAYER, 'private addStroke('), /markLimitRefusal\(/u);
  assert.match(member(LAYER, 'private addStroke('), /t\('annot\.limitMarks'/u);
});

test('the panel sends the marks of THIS page, and the selection becomes one more mark', () => {
  assert.ok(member(SELECT_PAGE, 'private _marksFor(', '    ').includes('this._annotOnPage(page)'));
  assert.match(member(SELECT_PAGE, 'private _annotOnPage(', '    '), /file\.project === page\.file\.project && file\.shortName === page\.file\.shortName/u);
  assert.match(SELECT_PAGE, /\.\.\.\(marks\.length \? \{ marks \} : \{\}\)/u);
  assert.match(SELECT_PAGE, /marks\.push\(\{ note: null, elements: \[selected\] \}\)/u);
  assert.match(SELECT_PAGE, /const element = marks\.length \? null : selected;/u);
  assert.match(SELECT_PAGE, /plan\.operations, plan\.marks, \[\], plan\.batch \?\? \[\], plan\.standard \?\? null\)/u, 'the approved plan goes back with its marks');
  assert.match(SELECT_PAGE, /if \(plan\.marks\.length\) annotCommand\(\{ kind: 'clear' \}\);/u);
});

test('no backtick or dollar-brace inside the layer stylesheet string', () => {
  const css = /const CSS = `([\s\S]*?)`;/u.exec(LAYER)?.[1] ?? '';
  assert.ok(css.length > 200);
  assert.doesNotMatch(css, /\$\{/u);
});

test('the pen draws freely: its strokes become an image, never elements', () => {
  const add = member(LAYER, 'private addStroke(');
  assert.ok(add.indexOf("if (this.tool === 'pen')") < add.indexOf('resolveStroke('), 'the pen leaves before any element is resolved');
  assert.ok(member(LAYER, 'private addPenStroke(').includes('this.drawingChanged(this.penDrawing)'));
  // The image library is pinned, loaded on demand.
  assert.match(LAYER, /IMAGE_LIB_URL = 'https:\/\/cdn\.jsdelivr\.net\/npm\/html-to-image@\d+\.\d+\.\d+\/\+esm'/u);
  // Our own chrome is never in the picture; a failure says WHY, with no stand-in image.
  const capture = member(LAYER, 'private async capture(');
  assert.ok(capture.includes('node.classList.contains(control)'));
  assert.ok(capture.includes("finish('', reason || 'unknown error');"));
  assert.ok(!LAYER.includes('drawImage(null'), 'no strokes-only stand-in');
  assert.ok(SELECT_PAGE.includes("this.msg.drawingFailed.replace('{error}', drawing.error)"));
});

test('a capture always ENDS: a time limit, the smallest part of the page, and no early return left waiting', () => {
  const capture = member(LAYER, 'private async capture(');
  assert.ok(capture.includes('withTimeout(loadImageLib(), CAPTURE_TIMEOUT_MS)'));
  assert.ok(capture.includes('withTimeout(lib.toCanvas(holder,'));
  assert.ok(capture.includes('const holder = smallestHolder(anchor,'), 'not more of the page than the view');
  assert.ok(capture.includes("finish('', 'nothing of the page was on screen');"), 'no view still ends the capture');
  assert.ok(capture.includes("imagePlaceholder:"), 'an image that cannot be fetched does not hang it');
});

test('the image is what was on screen, and a page with no box of its own still has one', () => {
  assert.ok(member(LAYER, 'private addPenStroke(').includes('this.penDrawing.view = { x: this.origin.x - ar.left'));
  assert.ok(member(LAYER, 'private async capture(').includes('this.drawImage({ canvas: shot, ...offset }, view, drawing.strokes, pixelRatio)'));
  const anchor = member(LAYER, 'private anchor(');
  assert.ok(anchor.includes('r.width > 0 && r.height > 0 ? page : this.ctx.host'), 'display: contents falls back to the host');
});

test('each time the pen is taken up is a new drawing, and with the pen in hand the rest is hidden', () => {
  assert.ok(member(LAYER, 'private setTool(').includes('this.endPenStory();'));
  assert.ok(member(LAYER, 'public start(').includes('this.penDrawing = null;'));
  assert.ok(member(LAYER, 'public stop(').includes('this.endPenStory();'));
  const place = member(LAYER, 'private place(');
  assert.ok(place.includes('const shown = penOnly ? (this.penDrawing ? [this.penDrawing] : []) : this.drawings;'));
  assert.ok(place.includes('if (penOnly || !r || (!r.width && !r.height))'), 'the boxes of the marks hide');
  assert.ok(member(LAYER, 'private renderChrome(').includes('this.penOnly() ? null : this.renderBalloon()'));
  // The AI tab lists every drawing.
  assert.ok(SELECT_PAGE.includes('annot.drawings.map(each => this._renderDrawing(each, busy))'));
});

test('the rectangle measures what an element shows, not its whole block', () => {
  assert.ok(member(LAYER, 'private addStroke(').includes('box: contentBox,'));
  assert.ok(LAYER.includes('range.selectNodeContents(el);'));
});

test('the drawing is shown in the AI tab and never sent to the agent', () => {
  const marksFor = member(SELECT_PAGE, 'private _marksFor(', '    ');
  assert.ok(marksFor.includes('annot.marks.map('), 'only the element marks are sent');
  assert.ok(!marksFor.includes('drawing'), 'the drawing never enters what is sent');
  assert.ok(SELECT_PAGE.includes('this.msg.drawingNotSent'));
  assert.ok(SELECT_PAGE.includes('<img src=${drawing.image}'));
});

test('Review works with the notes of the marks alone', () => {
  assert.ok(SELECT_PAGE.includes('?disabled=${!!busy || !this._editRequest(page)}'));
  const request = member(SELECT_PAGE, 'private _editRequest(', '    ');
  assert.ok(request.includes('if (written) return written;'));
  assert.ok(request.includes('this._marksFor(page)'));
  assert.ok(SELECT_PAGE.includes('const request = this._editRequest(page);'));
});

test('the image is made when the drawing ENDS — never while the pen is in hand', () => {
  const changed = member(LAYER, 'private drawingChanged(');
  assert.ok(changed.includes('if (drawing !== this.penDrawing) this.requestCapture(drawing);'), 'the drawing in hand waits');
  const end = member(LAYER, 'private endPenStory(');
  assert.ok(end.includes('if (drawing?.pending) this.requestCapture(drawing);'));
  // Done (stop) and the rectangle (setTool) end the story; Esc goes through stop.
  assert.ok(member(LAYER, 'public stop(').includes('this.endPenStory();'));
  assert.ok(member(LAYER, 'private setTool(').includes('this.endPenStory();'));
  assert.ok(!LAYER.includes('CAPTURE_IDLE_MS'), 'no capture on a pause');
  assert.ok(SELECT_PAGE.includes('this.msg.drawingPending'));
});

test('drawing stays light: the ink is redrawn only when it changed, the clip is read once, the live stroke is one path', () => {
  const place = member(LAYER, 'private place(');
  assert.ok(place.includes('if (key !== this.inkKey) {'));
  assert.ok(member(LAYER, 'private ensureLayer(').includes('this.clips = clippingAncestors(this.ctx.host);'));
  const surface = member(LAYER, 'private renderSurface(');
  assert.ok(surface.includes("live.setAttribute('d',"));
  assert.ok(!surface.includes('svg.innerHTML'), 'no markup parsed on every pointer move');
});

test('Ctrl+Z undoes the drawing stroke by stroke, even when the key does not come through the editor', () => {
  assert.ok(member(LAYER, 'public start(').includes("window.addEventListener('keydown', this.onKey, true);"));
  assert.ok(member(LAYER, 'public stop(').includes("window.removeEventListener('keydown', this.onKey, true);"));
  assert.ok(LAYER.includes('if (e.defaultPrevented) return;'), 'one key, one undo when the editor already handled it');
  const undo = member(LAYER, 'public undo(');
  assert.ok(undo.includes('drawing.strokes.pop();'));
});

test('a closed pen loop is drawn as the clean shape it means', () => {
  assert.ok(member(LAYER, 'private addPenStroke(').includes('beautifyStroke(raw)'));
});

test('a small V right after a straight line turns it into an arrow', () => {
  const add = member(LAYER, 'private addPenStroke(');
  assert.ok(add.includes('mergeArrowHead(previous, raw)'));
  assert.ok(add.includes('Date.now() - this.lastPenStrokeAt <= ARROW_HEAD_WINDOW_MS'));
  assert.ok(add.includes('const anchored = beautifyStroke(raw);'));
});

test('the image is sharp: screen density (up to 2x), a canvas the browser accepts, page fonts with a fallback', () => {
  const capture = member(LAYER, 'private async capture(');
  assert.ok(capture.includes('Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1)'));
  assert.ok(capture.includes('MAX_CANVAS_SIDE / Math.max(1, hr.height)'));
  assert.ok(capture.includes('{ ...options, skipFonts: true }'), 'fonts that do not come in time are left out on a second try');
  const draw = member(LAYER, 'private drawImage(');
  assert.ok(draw.includes('Math.min(density, IMAGE_MAX_WIDTH / bounds.w)'));
  assert.ok(draw.includes("g.imageSmoothingQuality = 'high'"));
});
