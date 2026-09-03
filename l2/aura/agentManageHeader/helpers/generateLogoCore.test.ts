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
  + '<rect x="1.75" y="1.75" width="28.5" height="28.5" rx="8" stroke="currentColor" stroke-width="2.5"/>'
  + '<path d="M21 11a8 8 0 1 0 0 10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>';

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

test('the entry needs a project, and no style is imposed', () => {
  assert.throws(() => normalizeLogoRequest('nope'), /JSON object/);
  assert.throws(() => normalizeLogoRequest({}), /projectId/);
  // No default style: forcing 'monogram' is how a "cup and bean" brief came back as the letter C.
  assert.equal(normalizeLogoRequest({ projectId: PROJECT }).style, undefined);
  assert.equal(normalizeLogoRequest({ projectId: PROJECT, style: 'teleport' }).style, undefined);
  assert.equal(normalizeLogoRequest({ projectId: PROJECT, style: 'wordmark' }).style, 'wordmark');
});

test('the brief leads the prompt; the style only appears when asked for', () => {
  const withStyle = buildGenerateLogoHumanPrompt(normalizeLogoRequest({
    projectId: PROJECT,
    brandTitle: 'Sample App',
    brief: 'cup and bean, warm and geometric',
    style: 'mark',
  }));
  assert.match(withStyle, /^Draw: cup and bean, warm and geometric/);
  assert.match(withStyle, /Sample App/);
  assert.match(withStyle, /draw the thing, not the letters/);

  const briefOnly = buildGenerateLogoHumanPrompt(normalizeLogoRequest({
    projectId: PROJECT,
    brief: 'cup and bean',
  }));
  assert.match(briefOnly, /^Draw: cup and bean/);
  assert.equal(/Preferred form/u.test(briefOnly), false, 'no style is imposed');
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
    ['<svg viewBox="0 0 32 32"><rect fill="url(http://x/y.svg#g)"/></svg>', /external/],
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
    validateLogoSvg('<svg viewBox="0 0 32 32"><rect x="2" y="2" width="28" height="28" rx="7" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>'),
    [],
  );
});


test('a rich mark is accepted: many shapes, fixed colors, an inline gradient', () => {
  const rich = '<svg viewBox="0 0 512 512">'
    + '<defs><linearGradient id="g"><stop offset="0" stop-color="#c85a2a"/><stop offset="1" stop-color="#e0723f"/></linearGradient></defs>'
    + '<circle cx="256" cy="256" r="240" fill="url(#g)"/>'
    + '<path d="M140 200h200v90a100 100 0 0 1-200 0z" fill="#fffdfa"/>'
    + '<path d="M340 220h30a45 45 0 0 1 0 90h-30" fill="none" stroke="#fffdfa" stroke-width="20"/>'
    + '<ellipse cx="256" cy="150" rx="30" ry="45" fill="#3b2f2f"/></svg>';
  assert.deepEqual(validateLogoSvg(rich), [], 'the frame is safety + scaling, not taste');
  assert.ok(isSafeLogoSvg(rich));
  // Monochrome is available as an OPT-IN for a mark that must follow the design system.
  assert.equal(isSafeLogoSvg(rich, { monochrome: true }), false);
});

test('two roots, empty markup and oversized markup are refused', () => {
  assert.match(validateLogoSvg('<svg viewBox="0 0 8 8"></svg><svg viewBox="0 0 8 8"></svg>').join('; '), /single <svg> root|exactly one/);
  assert.deepEqual(validateLogoSvg('   '), ['no svg was returned']);
  const huge = `<svg viewBox="0 0 32 32">${'<rect fill="currentColor"/>'.repeat(600)}</svg>`;
  assert.match(validateLogoSvg(huge).join('; '), /over the .* limit/);
});




test('markdown fences around the svg are stripped', () => {
  const sanitized = sanitizeGeneratedLogo({ svg: '```svg\n' + VALID_SVG + '\n```', notes: 'ok' });
  assert.ok(sanitized.ok, sanitized.error);
  assert.equal(sanitized.value?.svg.startsWith('<svg'), true);
  assert.equal(sanitized.value?.notes, 'ok');
});

test('a refused mark reports why instead of being written', () => {
  const sanitized = sanitizeGeneratedLogo({ svg: '<svg viewBox="0 0 32 32"><script>alert(1)</script></svg>' });
  assert.equal(sanitized.ok, false);
  assert.match(sanitized.error ?? '', /plain shapes/);
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
    () => applyLogoToBrand(clientConfig(), { svg: '<svg viewBox="0 0 32 32" width="32"><rect fill="#000"/></svg>' }),
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
