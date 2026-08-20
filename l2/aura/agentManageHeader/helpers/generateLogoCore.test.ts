/// <mls fileReference="_102020_/l2/aura/agentManageHeader/helpers/generateLogoCore.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyLogoToBrand,
  buildGenerateLogoHumanPrompt,
  normalizeLogoRequest,
  readBrandTitle,
  sanitizeGeneratedLogo,
  validateLogoSvg,
} from '/_102020_/l2/aura/agentManageHeader/helpers/generateLogoCore.js';
import { AURA_HEADER_HEIGHT_PX, isSafeLogoSvg } from '/_102033_/l2/shared/layout/auraHeaderCore.js';

const PROJECT = 999999;

const VALID_SVG = '<svg viewBox="0 0 32 32" fill="none">'
  + '<rect x="1.5" y="1.5" width="29" height="29" rx="8" stroke="currentColor" stroke-width="2.5"/>'
  + '<path d="M22 11.5a7.5 7.5 0 1 0 0 9" stroke="currentColor" stroke-width="3"/></svg>';

/** A client config with a header profile whose brand already has a title. */
function clientConfig(brand: Record<string, unknown> = { title: 'Sample App' }) {
  return {
    clientShell: {
      mode: 'spa',
      regions: {
        header: {
          activeProfile: 'defaultAura',
          profiles: {
            defaultAura: {
              renderer: { entrypoint: '/_999999_/l2/layout/appHeader.js', tag: 'layout--app-header-999999' },
              heightPx: AURA_HEADER_HEIGHT_PX,
              brand,
            },
            studio: { renderer: { entrypoint: '/_102033_/l2/cbe/studioHeader.js', tag: 'collab-cbe-studio-header' } },
          },
        },
      },
    },
  };
}

// ── request ────────────────────────────────────────────────────────────────

test('the entry needs a project, and the style falls back to monogram', () => {
  assert.throws(() => normalizeLogoRequest('nope'), /JSON object/);
  assert.throws(() => normalizeLogoRequest({}), /projectId/);
  assert.equal(normalizeLogoRequest({ projectId: PROJECT }).style, 'monogram');
  assert.equal(normalizeLogoRequest({ projectId: PROJECT, style: 'teleport' }).style, 'monogram');
  assert.equal(normalizeLogoRequest({ projectId: PROJECT, style: 'wordmark' }).style, 'wordmark');
});

test('the prompt carries the brand, the style and the size it must survive', () => {
  const prompt = buildGenerateLogoHumanPrompt(normalizeLogoRequest({
    projectId: PROJECT,
    brandTitle: 'Sample App',
    brief: 'warm and geometric',
    style: 'mark',
  }));
  assert.match(prompt, /Brand: Sample App/);
  assert.match(prompt, /Style: mark/);
  assert.match(prompt, /warm and geometric/);
  assert.match(prompt, /28px/);
});

// ── svg validation ─────────────────────────────────────────────────────────

test('a monochrome single-root mark with a viewBox is accepted', () => {
  assert.deepEqual(validateLogoSvg(VALID_SVG), []);
  assert.ok(isSafeLogoSvg(VALID_SVG), 'the runtime must accept what the generator accepts');
});

test('anything that fetches, scripts or embeds is refused', () => {
  const cases: Array<[string, RegExp]> = [
    ['<svg viewBox="0 0 32 32"><script>alert(1)</script></svg>', /plain shapes/],
    ['<svg viewBox="0 0 32 32"><image href="http://x/y.png"/></svg>', /plain shapes|external/],
    ['<svg viewBox="0 0 32 32"><use xlink:href="#a"/></svg>', /plain shapes|external/],
    ['<svg viewBox="0 0 32 32"><rect onload="alert(1)" fill="currentColor"/></svg>', /event handler/],
    ['<svg viewBox="0 0 32 32"><rect fill="url(#g)"/></svg>', /external|not allowed/],
    ['<svg viewBox="0 0 32 32"><style>rect{fill:red}</style></svg>', /plain shapes/],
  ];
  for (const [svg, expected] of cases) {
    const errors = validateLogoSvg(svg);
    assert.ok(errors.length > 0, `accepted: ${svg}`);
    assert.match(errors.join('; '), expected);
    assert.equal(isSafeLogoSvg(svg), false, `runtime accepted: ${svg}`);
  }
});

test('the mark must scale into the band', () => {
  assert.match(validateLogoSvg('<svg fill="none"><rect fill="currentColor"/></svg>').join('; '), /viewBox/);
  assert.match(
    validateLogoSvg('<svg viewBox="0 0 32 32" width="32" height="32"><rect fill="currentColor"/></svg>').join('; '),
    /must not declare width\/height/,
  );
  // width/height on an inner shape is legitimate — that is how a rect is drawn.
  assert.deepEqual(
    validateLogoSvg('<svg viewBox="0 0 32 32"><rect width="10" height="10" fill="currentColor"/></svg>'),
    [],
  );
});

test('the mark must be monochrome, so it survives the dark theme', () => {
  assert.match(validateLogoSvg('<svg viewBox="0 0 32 32"><rect fill="#ff0000"/></svg>').join('; '), /monochrome/);
  assert.match(validateLogoSvg('<svg viewBox="0 0 32 32"><rect fill="rgb(1,2,3)"/></svg>').join('; '), /monochrome/);
  assert.match(validateLogoSvg('<svg viewBox="0 0 32 32"><rect fill="red"/></svg>').join('; '), /not allowed/);
  assert.deepEqual(validateLogoSvg('<svg viewBox="0 0 32 32"><rect fill="currentColor"/></svg>'), []);
});

test('two roots, empty markup and oversized markup are refused', () => {
  assert.match(validateLogoSvg('<svg viewBox="0 0 8 8"></svg><svg viewBox="0 0 8 8"></svg>').join('; '), /single <svg> root|exactly one/);
  assert.deepEqual(validateLogoSvg('   '), ['no svg was returned']);
  const huge = `<svg viewBox="0 0 32 32">${'<rect fill="currentColor"/>'.repeat(400)}</svg>`;
  assert.match(validateLogoSvg(huge).join('; '), /over the .* limit/);
});

test('markdown fences around the svg are stripped', () => {
  const sanitized = sanitizeGeneratedLogo({ svg: '```svg\n' + VALID_SVG + '\n```', notes: 'ok' });
  assert.ok(sanitized.ok, sanitized.error);
  assert.equal(sanitized.value?.svg.startsWith('<svg'), true);
  assert.equal(sanitized.value?.notes, 'ok');
});

test('a refused mark reports why instead of being written', () => {
  const sanitized = sanitizeGeneratedLogo({ svg: '<svg viewBox="0 0 32 32"><rect fill="#000"/></svg>' });
  assert.equal(sanitized.ok, false);
  assert.match(sanitized.error ?? '', /monochrome/);
});

// ── config write ───────────────────────────────────────────────────────────

test('the mark lands on the brand of the active header profile, keeping the rest', () => {
  const config = clientConfig({ title: 'Sample App', subtitle: 'Operations' });
  const written = applyLogoToBrand(config, { svg: VALID_SVG });
  const brand = (written.config as any).clientShell.regions.header.profiles.defaultAura.brand;

  assert.equal(written.profileName, 'defaultAura');
  assert.equal(written.replaced, false);
  assert.equal(brand.logoSvg, VALID_SVG);
  assert.equal(brand.title, 'Sample App', 'the title is not touched');
  assert.equal(brand.subtitle, 'Operations');
  // The input document is left alone.
  assert.equal(config.clientShell.regions.header.profiles.defaultAura.brand.logoSvg, undefined);
});

test('regenerating reports that it replaced the previous mark', () => {
  const first = applyLogoToBrand(clientConfig(), { svg: VALID_SVG });
  const second = applyLogoToBrand(first.config, { svg: VALID_SVG });
  assert.equal(second.replaced, true);
  assert.deepEqual(second.config, first.config, 'writing the same mark twice is idempotent');
});

test('a brand with no title yet gets the one from the request', () => {
  const written = applyLogoToBrand(clientConfig({}), { svg: VALID_SVG, brandTitle: 'Sample App' });
  assert.equal((written.config as any).clientShell.regions.header.profiles.defaultAura.brand.title, 'Sample App');
});

test('writing an invalid mark is refused before it reaches the config', () => {
  assert.throws(
    () => applyLogoToBrand(clientConfig(), { svg: '<svg viewBox="0 0 32 32"><rect fill="#000"/></svg>' }),
    /refusing to write an invalid mark/,
  );
});

test('a project with no header profile says what to do', () => {
  assert.throws(() => applyLogoToBrand({ clientShell: { mode: 'spa', regions: {} } }, { svg: VALID_SVG }), /run agentGenerateHeader first/);
  assert.throws(() => applyLogoToBrand(clientConfig(), { svg: VALID_SVG, profileName: 'nope' }), /does not exist \(available: defaultAura, studio\)/);
  assert.throws(() => applyLogoToBrand(undefined, { svg: VALID_SVG }), /config\.json not found/);
});

test('the configured brand title is discoverable, so the caller need not repeat it', () => {
  assert.equal(readBrandTitle(clientConfig()), 'Sample App');
  assert.equal(readBrandTitle(clientConfig(), 'studio'), '');
  assert.equal(readBrandTitle(undefined), '');
});
