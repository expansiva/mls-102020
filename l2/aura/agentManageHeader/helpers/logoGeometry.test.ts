/// <mls fileReference="_102020_/l2/aura/agentManageHeader/helpers/logoGeometry.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { boxDiagonal, describeGeometry, markGeometry, pathBox } from '/_102020_/l2/aura/agentManageHeader/helpers/logoGeometry.js';

test('a path box resolves relative deltas instead of reading them as coordinates', () => {
  // The steam wisp from a real generated mark: starts at (14,10) and moves a couple of units.
  const wisp = pathBox('M14 10c-1.5-1.5 1.5-2.5 0-4');
  assert.ok(wisp);
  assert.ok(wisp.minX >= 12 && wisp.maxX <= 16, `x range off: ${wisp.minX}..${wisp.maxX}`);
  assert.ok(wisp.minY >= 5 && wisp.maxY <= 11, `y range off: ${wisp.minY}..${wisp.maxY}`);
  // A naive min/max over the numbers would have said 18 units wide; it is a speck.
  assert.ok(boxDiagonal(wisp) < 6, `diagonal should be tiny, got ${boxDiagonal(wisp)}`);
});

test('absolute commands, H/V and Z close the box correctly', () => {
  const letter = pathBox('M8 8V24H20');
  assert.deepEqual(letter && [letter.minX, letter.minY, letter.maxX, letter.maxY], [8, 8, 20, 24]);
  const closed = pathBox('M4 4H28V28H4Z');
  assert.deepEqual(closed && [closed.minX, closed.minY, closed.maxX, closed.maxY], [4, 4, 28, 28]);
});

test('every shape kind is measured, and the union is the drawing extent', () => {
  const svg = '<svg viewBox="0 0 32 32">'
    + '<rect x="2" y="3" width="10" height="4" fill="none" stroke="currentColor" stroke-width="2.5"/>'
    + '<circle cx="20" cy="20" r="8" fill="none" stroke="currentColor" stroke-width="2.5"/>'
    + '</svg>';
  const geometry = markGeometry(svg);
  assert.equal(geometry.boxWidth, 32);
  assert.equal(geometry.boxHeight, 32);
  assert.equal(geometry.shapes.length, 2);
  assert.deepEqual(geometry.strokeWidths, [2.5]);
  assert.deepEqual(
    geometry.union && [geometry.union.minX, geometry.union.minY, geometry.union.maxX, geometry.union.maxY],
    [2, 3, 28, 28],
  );
});

test('mixed stroke widths are reported as distinct values', () => {
  const svg = '<svg viewBox="0 0 32 32">'
    + '<rect x="2" y="2" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.5"/>'
    + '<path d="M10 10H22" fill="none" stroke="currentColor" stroke-width="2.8"/></svg>';
  assert.deepEqual(markGeometry(svg).strokeWidths, [2.5, 2.8]);
});

test('the geometry line is readable enough for a log or a prompt', () => {
  const svg = '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" stroke-width="3"/></svg>';
  const text = describeGeometry(markGeometry(svg));
  assert.match(text, /viewBox 32x32/);
  assert.match(text, /1 shapes/);
  assert.match(text, /coverage 75%x75%/);
  assert.match(text, /stroke-width \[3\]/);
});
