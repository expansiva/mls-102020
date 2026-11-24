/// <mls fileReference="_102020_/l2/aura/plugins/helpers/fontFileName.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { fontFromFileName, roleFromFamily } from '/_102020_/l2/aura/plugins/helpers/fontFileName.js';

test('family from the file name, weight and style taken out', () => {
  assert.deepEqual(fontFromFileName('rafter-party-demo.woff2'), { family: 'Rafter Party Demo', weight: 400 });
  assert.deepEqual(fontFromFileName('/_1_/l3/assets/Inter-Bold.ttf'), { family: 'Inter', weight: 700 });
  assert.deepEqual(fontFromFileName('Inter-BoldItalic.woff2'), { family: 'Inter', weight: 700, style: 'italic' });
  assert.deepEqual(fontFromFileName('open_sans_600_italic.woff'), { family: 'Open Sans', weight: 600, style: 'italic' });
  assert.deepEqual(fontFromFileName('PlayfairDisplay-Regular.otf'), { family: 'Playfair Display', weight: 400 });
  assert.deepEqual(fontFromFileName('marca-light-webfont.woff2'), { family: 'Marca', weight: 300 });
});

test('a name that is only a weight still yields a family; acronyms keep their case', () => {
  assert.deepEqual(fontFromFileName('Bold.woff2'), { family: 'Bold', weight: 700 });
  assert.deepEqual(fontFromFileName('IBM-plex-mono.woff2'), { family: 'IBM Plex Mono', weight: 400 });
});

test('role is the family in lowercase with dashes', () => {
  assert.equal(roleFromFamily('Rafter Party Demo'), 'rafter-party-demo');
  assert.equal(roleFromFamily('  IBM Plex  '), 'ibm-plex');
});
