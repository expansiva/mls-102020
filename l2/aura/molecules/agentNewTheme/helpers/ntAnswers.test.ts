/// <mls fileReference="_102020_/l2/aura/molecules/agentNewTheme/helpers/ntAnswers.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { ntResolveAnswers } from '/_102020_/l2/aura/molecules/agentNewTheme/helpers/ntAnswers.js';
import { NtThemeFields } from '/_102020_/l2/aura/molecules/agentNewTheme/helpers/ntTypes.js';

test('closed answers land as enum values, open answers as their typed text', () => {
  const { fields } = ntResolveAnswers({ background: { kind: 'light' } }, [
    { field: 'corners', value: 'sharp' },
    { field: 'border.style', value: 'thick' },
    { field: 'typography.family', value: 'mono' },
    { field: 'typography.uppercaseLabels', value: 'true' },
    { field: 'primary', notes: '#3b82f6' },
    { field: 'background.css', notes: 'background: #f5f5f5;' },
  ]);
  assert.equal(fields.corners, 'sharp');
  assert.equal(fields.border?.style, 'thick');
  assert.equal(fields.typography?.family, 'mono');
  assert.equal(fields.typography?.uppercaseLabels, true);
  assert.equal(fields.primary, '#3b82f6');
  // the known background.kind survives while css is added
  assert.deepEqual(fields.background, { kind: 'light', css: 'background: #f5f5f5;' });
});

test('the extra slot becomes the guidance block — this is what closes the gap to a long prompt', () => {
  const guidanceText = 'Borda 3px. Sombra 4px 4px 0 #000000, hover 2px 2px 0 e o elemento translada 2px para dentro da sombra. Sem blur.';
  const { guidance } = ntResolveAnswers({}, [
    { field: 'corners', value: 'sharp' },
    { field: 'extra', notes: guidanceText },
  ]);
  assert.equal(guidance, guidanceText);
});

test('notes on a CLOSED question are nuance and are kept alongside the chosen value', () => {
  const { fields, guidance } = ntResolveAnswers({}, [
    { field: 'shadow', value: 'offset', notes: '4px 4px 0 #000000, hover 2px 2px 0' },
    { field: 'extra', notes: 'nada de transparência' },
  ]);
  assert.equal(fields.shadow, 'offset');
  assert.equal(guidance, 'shadow: 4px 4px 0 #000000, hover 2px 2px 0\nnada de transparência');
});

test('name is kebab-cased and the suffix is derived from it', () => {
  const { fields } = ntResolveAnswers({}, [
    { field: 'name', notes: 'Neo Brutal' },
    { field: 'displayName', notes: 'Neo Brutalism' },
  ]);
  assert.equal(fields.name, 'neo-brutal');
  assert.equal(fields.suffix, '-neo-brutal');
  assert.equal(fields.displayName, 'Neo Brutalism');
});

test('a suffix already known is not recomputed, and known fields are not mutated', () => {
  const known: NtThemeFields = { name: 'glass', suffix: '-glass', typography: { family: 'sans' } };
  const { fields } = ntResolveAnswers(known, [{ field: 'typography.uppercaseLabels', value: 'false' }]);
  assert.equal(fields.suffix, '-glass');
  assert.equal(fields.typography?.uppercaseLabels, false);
  assert.deepEqual(known.typography, { family: 'sans' }, 'the input must stay untouched');
});

test('empty answers resolve to the known fields and no guidance', () => {
  const { fields, guidance } = ntResolveAnswers({ name: 'brutal', corners: 'sharp' }, []);
  assert.deepEqual(fields, { name: 'brutal', corners: 'sharp', suffix: '-brutal' });
  assert.equal(guidance, '');
});
