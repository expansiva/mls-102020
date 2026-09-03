/// <mls fileReference="_102020_/l2/aura/plugins/helpers/localeFlag.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { flagChip, knownFlagLocales, localeFlagMarkup } from '/_102020_/l2/aura/plugins/helpers/localeFlag.js';

test('the region decides the flag, the language is the fallback', () => {
  const br = localeFlagMarkup('pt-BR');
  const pt = localeFlagMarkup('pt');
  assert.ok(br && pt);
  assert.notEqual(br, pt, 'pt-BR and pt are different countries');

  assert.equal(localeFlagMarkup('pt_br'), br, 'underscore and case are accepted');
  assert.equal(localeFlagMarkup('es-MX'), localeFlagMarkup('es'),
    'an unmapped region falls back to the language, it does not blank out');
  assert.ok(localeFlagMarkup('en'), 'a bare language still gets a flag');
});

test('a locale with no flag answers undefined, and the chip covers it', () => {
  assert.equal(localeFlagMarkup('sw'), undefined);
  assert.equal(localeFlagMarkup(''), undefined);
  assert.equal(localeFlagMarkup(undefined as unknown as string), undefined);
  assert.equal(flagChip('pt-br'), 'PT-BR');
  assert.equal(flagChip(''), '');
});

test('every flag is inlinable markup for a 24x16 box', () => {
  for (const region of knownFlagLocales()) {
    // The map is keyed by REGION, so it is reached through any locale carrying that region.
    const markup = localeFlagMarkup(`zz-${region}`);
    assert.ok(markup, `no markup for ${region}`);
    // Inner markup only: the caller owns <svg> (size, rounding, aria).
    assert.equal(markup.includes('<svg'), false, `${region} must not carry its own <svg>`);
    assert.equal(markup.includes('<script'), false, `${region} must not carry a script`);
    assert.equal(/on[a-z]+\s*=/iu.test(markup), false, `${region} must not carry a handler`);
  }
});
