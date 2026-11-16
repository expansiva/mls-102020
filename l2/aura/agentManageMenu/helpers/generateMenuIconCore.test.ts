/// <mls fileReference="_102020_/l2/aura/agentManageMenu/helpers/generateMenuIconCore.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MENU_ICON_DRAFT_KEY,
  buildGenerateMenuIconHumanPrompt,
  clearMenuIconDraft,
  describeMenuIconProblems,
  normalizeMenuIconRequest,
  readMenuIconDraft,
  sanitizeGeneratedMenuIcons,
  withMenuIconDraft,
} from '/_102020_/l2/aura/agentManageMenu/helpers/generateMenuIconCore.js';

const svg = (d: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="${d}"/></svg>`;
const UNSAFE = '<svg viewBox="0 0 24 24"><script>x()</script></svg>';

test('request: projectId and (brief or label) are required; strings are trimmed', () => {
  assert.throws(() => normalizeMenuIconRequest(null), /JSON object/u);
  assert.throws(() => normalizeMenuIconRequest({ label: 'X' }), /projectId/u);
  assert.throws(() => normalizeMenuIconRequest({ projectId: 1 }), /brief.*label/u);
  const req = normalizeMenuIconRequest({ projectId: '102047', label: ' Participantes ', brief: '', requestId: 'r1' });
  assert.deepEqual(req, { projectId: 102047, moduleId: undefined, pageId: undefined, label: 'Participantes', description: undefined, brief: undefined, requestId: 'r1' });
});

test('prompt: carries brief, label and description, and asks for 3 drawings', () => {
  const withBrief = buildGenerateMenuIconHumanPrompt({ projectId: 1, label: 'Comandas', description: 'Abre as comandas.', brief: 'talheres' });
  assert.match(withBrief, /Draw: talheres/u);
  assert.match(withBrief, /"Comandas"/u);
  assert.match(withBrief, /Abre as comandas\./u);
  assert.match(withBrief, /Return 3 different drawings/u);
  assert.match(buildGenerateMenuIconHumanPrompt({ projectId: 1, label: 'Comandas' }), /icon for the menu entry "Comandas"/u);
});

test('sanitize: keeps the valid drawings (max 3, no duplicates) and counts the refused ones', () => {
  const result = sanitizeGeneratedMenuIcons({ icons: [
    { svg: svg('M1 1'), note: 'a' },
    { svg: UNSAFE },
    { svg: '```svg\n' + svg('M2 2') + '\n```' },
    { svg: svg('M1 1') },
    { svg: svg('M3 3') },
    { svg: svg('M4 4') },
  ] });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.icons.map((icon) => icon.svg), [svg('M1 1'), svg('M2 2'), svg('M3 3')]);
  assert.equal(result.icons[0].note, 'a');
  assert.equal(result.dropped, 3);
});

test('sanitize: none valid fails with the reason of each one', () => {
  const result = sanitizeGeneratedMenuIcons({ icons: [{ svg: UNSAFE }, { svg: svg('M0 0').replace('currentColor', '#f00') }] });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.error, /#1: .*plain shapes/u);
  assert.match(result.error, /#2: .*currentColor/u);
  assert.equal(sanitizeGeneratedMenuIcons({}).ok, false);
});

test('problems are described in words', () => {
  assert.deepEqual(describeMenuIconProblems(svg('M0 0')), []);
  assert.ok(describeMenuIconProblems('<svg><path/></svg>').includes('must declare a viewBox'));
});

test('draft: written and read back only by the same requestId, revalidated, and cleared', () => {
  const icons = [{ svg: svg('M1 1') }, { svg: svg('M2 2'), note: 'b' }];
  const doc = withMenuIconDraft({ other: 1 }, 'req-1', icons, new Date('2026-11-16T00:00:00Z'));
  assert.equal(doc.other, 1);
  assert.deepEqual(readMenuIconDraft(doc, 'req-1'), icons);
  assert.equal(readMenuIconDraft(doc, 'req-2'), undefined);
  assert.equal(readMenuIconDraft(doc, ''), undefined);
  const tampered = { [MENU_ICON_DRAFT_KEY]: { requestId: 'req-1', icons: [{ svg: UNSAFE }] } };
  assert.equal(readMenuIconDraft(tampered, 'req-1'), undefined);
  const cleared = clearMenuIconDraft(doc);
  assert.equal(MENU_ICON_DRAFT_KEY in cleared, false);
  assert.equal(cleared.other, 1);
});
