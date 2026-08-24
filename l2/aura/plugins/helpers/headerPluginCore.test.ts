/// <mls fileReference="_102020_/l2/aura/plugins/helpers/headerPluginCore.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyHeaderDraft,
  buildHeaderRequest,
  clearDraft,
  emptyHeaderForm,
  formFromProfile,
  readHeaderBackup,
  readHeaderDraft,
  readHeaderProfileView,
  readLogoDraft,
  resolveShellTemplateUrl,
  restoreHeaderBackup,
} from '/_102020_/l2/aura/plugins/helpers/headerPluginCore.js';
import { buildHeaderSource, headerPaths } from '/_102020_/l2/aura/agentManageHeader/helpers/generateHeaderCore.js';
import { AURA_HEADER_HEIGHT_PX } from '/_102033_/l2/shared/layout/auraHeaderCore.js';

// Fictitious project: the fixtures must not depend on a real project in the workspace.
const PROJECT = 999999;
const TAG = headerPaths(PROJECT).tag;

const PARTS = {
  bandHtml: '${this.renderAsideToggle()}${this.renderBrand()}${this.renderActions()}',
  bandCss: '${tag} .x { color: var(--nav-text, #102a43); }',
};

/** A config whose header profile already points at the project's own generated header. */
function config(overrides: Record<string, unknown> = {}) {
  return {
    clientShell: {
      mode: 'spa',
      regions: {
        header: {
          activeProfile: 'defaultAura',
          profiles: {
            defaultAura: {
              renderer: {
                entrypoint: `/_${PROJECT}_/l2/layout/appHeader.js`,
                source: 'l2/layout/appHeader.ts',
                tag: TAG,
              },
              heightPx: AURA_HEADER_HEIGHT_PX,
              brand: { title: 'Sample App', subtitle: 'Operations', logoSvg: '<svg viewBox="0 0 8 8"></svg>' },
              props: { actions: ['language', 'user'] },
              ...overrides,
            },
            studio: { renderer: { entrypoint: '/_102033_/l2/cbe/studioHeader.js', tag: 'collab-cbe-studio-header' } },
          },
        },
      },
    },
  };
}

// ── reading what is applied ────────────────────────────────────────────────

test('the view reports the profile the shell boots, and whether it is the project header', () => {
  const view = readHeaderProfileView(config(), PROJECT);
  assert.ok(view);
  assert.equal(view.profileName, 'defaultAura');
  assert.deepEqual(view.profileNames.sort(), ['defaultAura', 'studio']);
  assert.equal(view.tag, TAG);
  assert.equal(view.source, 'l2/layout/appHeader.ts');
  assert.equal(view.heightPx, AURA_HEADER_HEIGHT_PX);
  assert.equal(view.brand?.title, 'Sample App');
  assert.deepEqual(view.actions, ['language', 'user']);
  assert.equal(view.isProjectHeader, true);

  // The master's own header is NOT the project's — the screen must not offer to roll back to it.
  const master = readHeaderProfileView(config(), PROJECT, 'studio');
  assert.equal(master?.isProjectHeader, false);

  assert.equal(readHeaderProfileView({ clientShell: { mode: 'spa', regions: {} } }, PROJECT), undefined);
  assert.equal(readHeaderProfileView(undefined, PROJECT), undefined);
});

test('the form starts from what the project already has', () => {
  const form = formFromProfile(readHeaderProfileView(config(), PROJECT));
  assert.equal(form.brandTitle, 'Sample App');
  assert.equal(form.brandSubtitle, 'Operations');
  assert.deepEqual(form.actions, ['language', 'user']);
  assert.equal(form.profileName, 'defaultAura');
  // Not carried over: they are per-generation decisions, not state of the project.
  assert.equal(form.brief, '');
  assert.equal(form.navLinks, false);
  assert.equal(form.logo, 'keep');
});

// ── the request ────────────────────────────────────────────────────────────

test('the request is always a draft, and the local gate runs before the round trip', () => {
  const form = { ...emptyHeaderForm(), brief: 'clean and warm', brandTitle: 'Sample App', actions: ['language' as const] };
  const request = buildHeaderRequest(PROJECT, form, 'req-1');
  assert.equal(request.commit, false, 'the plugin previews before writing');
  assert.equal(request.projectId, PROJECT);
  assert.equal(request.brief, 'clean and warm');
  assert.deepEqual(request.brand, { title: 'Sample App', subtitle: undefined, logoUrl: undefined, logoAlt: undefined, href: undefined });
  assert.deepEqual(request.actions, ['language']);
  assert.equal(request.navLinks, false, 'navigation stays opt-in');
  assert.equal(request.requestId, 'req-1');

  // Same gate as the agent: no brief and no brand is not a request.
  assert.throws(() => buildHeaderRequest(PROJECT, emptyHeaderForm(), 'req-2'), /brief and\/or a brand.title/);
});

// ── drafts ─────────────────────────────────────────────────────────────────

test('a draft is only read back when it is the one this screen asked for', () => {
  const projectConfig = { headerDraft: { requestId: 'req-1', source: 'export {}', parts: PARTS, notes: 'ok' } };
  const draft = readHeaderDraft(projectConfig, 'req-1');
  assert.equal(draft?.source, 'export {}');
  assert.deepEqual(draft?.parts, PARTS);
  assert.equal(readHeaderDraft(projectConfig, 'other'), undefined, 'a stale draft is not adopted');
  assert.equal(readHeaderDraft({}, 'req-1'), undefined);

  assert.equal(readLogoDraft({ logoDraft: { requestId: 'l-1', svg: '<svg/>' } }, 'l-1')?.svg, '<svg/>');
  assert.equal(readLogoDraft({ logoDraft: { requestId: 'l-1', svg: '' } }, 'l-1'), undefined);

  const cleared = clearDraft(projectConfig, 'headerDraft');
  assert.equal('headerDraft' in cleared, false);
  assert.ok('headerDraft' in projectConfig, 'the input is not mutated');
});

// ── preview vs real ────────────────────────────────────────────────────────

test('a preview gets its own tag and file, the real one keeps the canonical names', () => {
  const real = headerPaths(PROJECT);
  const preview = headerPaths(PROJECT, { previewToken: 'k3f9' });
  assert.equal(real.tag, `layout--app-header-${PROJECT}`);
  assert.equal(preview.tag, `layout--app-header-preview-${PROJECT}-k3f9`);
  assert.notEqual(preview.fileReference, real.fileReference);
  assert.match(preview.fileReference, /appHeaderPreview\.ts$/u);
  // customElements.define runs once per name: two previews in a session must not collide.
  assert.notEqual(headerPaths(PROJECT, { previewToken: 'aaa' }).tag, preview.tag);
  // A token that survives sanitisation only through letters/digits still yields a valid tag.
  assert.equal(headerPaths(PROJECT, { previewToken: 'A-b_1' }).tag, `layout--app-header-preview-${PROJECT}-ab1`);
});

test('the preview source carries the preview tag, the applied one the canonical tag', () => {
  const token = 'k3f9';
  const preview = buildHeaderSource(PROJECT, PARTS, { previewToken: token });
  const real = buildHeaderSource(PROJECT, PARTS);

  // includes() instead of a regex: the tag carries characters a pattern would have to escape.
  assert.ok(preview.includes(`customElements.define('layout--app-header-preview-${PROJECT}-${token}'`));
  assert.ok(preview.includes('appHeaderPreview.ts'), 'the mls header points at the preview file');
  assert.ok(real.includes(`customElements.define('${TAG}'`));
  assert.equal(real.includes('Preview'), false);

  // Same parts, so what is previewed is what gets applied — only the identity (tag, class name,
  // file reference) differs, which is exactly what the trailing customElements.define carries.
  const band = (source: string) => source.slice(source.indexOf('protected renderBand()'), source.indexOf('customElements.define'));
  assert.equal(band(preview), band(real));
});

// ── apply ──────────────────────────────────────────────────────────────────

test('applying writes the real source, repoints the profile and consumes the draft', () => {
  const form = { ...emptyHeaderForm(), brief: 'x', brandTitle: 'Sample App', brandSubtitle: 'Ops', actions: ['language' as const] };
  const result = applyHeaderDraft(
    {
      projectId: PROJECT,
      config: config(),
      projectConfig: { headerDraft: { requestId: 'req-1', source: 'old draft', parts: PARTS } },
      parts: PARTS,
      form,
      previousSource: 'the header that was applied',
      at: '2026-08-21T12:00:00.000Z',
    },
    (parts) => buildHeaderSource(PROJECT, parts),
  );

  assert.equal(result.paths.tag, TAG, 'applied under the canonical tag, never the preview one');
  assert.match(result.source, new RegExp(`customElements.define\\('${TAG}'`, 'u'));
  const profile = (result.config as any).clientShell.regions.header.profiles.defaultAura;
  assert.equal(profile.renderer.tag, TAG);
  assert.deepEqual(profile.props, { actions: ['language'] });
  assert.equal(profile.brand.title, 'Sample App');
  assert.equal(profile.brand.logoSvg, '<svg viewBox="0 0 8 8"></svg>', 'the mark survives a header apply');
  assert.equal('headerDraft' in result.projectConfig, false, 'the draft is consumed');
});

test('applying stores the rollback slot with the source AND the profile it came with', () => {
  const result = applyHeaderDraft(
    {
      projectId: PROJECT,
      config: config(),
      projectConfig: {},
      parts: PARTS,
      form: { ...emptyHeaderForm(), brief: 'x', brandTitle: 'New Name' },
      previousSource: 'the header that was applied',
      at: '2026-08-21T12:00:00.000Z',
    },
    (parts) => buildHeaderSource(PROJECT, parts),
  );

  const backup = readHeaderBackup(result.projectConfig);
  assert.ok(backup, 'there must be something to go back to');
  assert.equal(backup.source, 'the header that was applied');
  assert.equal(backup.profileName, 'defaultAura');
  assert.equal(backup.profile.brand?.title, 'Sample App', 'the OLD brand, not the new one');
  assert.equal(backup.at, '2026-08-21T12:00:00.000Z');
});

test('no backup when there is no project header to go back to', () => {
  // A profile still pointing at the master's header: rolling "back" to it is not a rollback.
  const master = {
    clientShell: {
      mode: 'spa',
      regions: {
        header: {
          activeProfile: 'defaultAura',
          profiles: {
            defaultAura: {
              renderer: { entrypoint: '/_102033_/l2/shared/layout/aura-header.js', tag: 'collab-aura-header' },
              heightPx: AURA_HEADER_HEIGHT_PX,
            },
          },
        },
      },
    },
  };
  const result = applyHeaderDraft(
    {
      projectId: PROJECT,
      config: master,
      projectConfig: {},
      parts: PARTS,
      form: { ...emptyHeaderForm(), brief: 'x', brandTitle: 'Sample App' },
      at: '2026-08-21T12:00:00.000Z',
    },
    (parts) => buildHeaderSource(PROJECT, parts),
  );
  assert.equal(readHeaderBackup(result.projectConfig), undefined);
});

// ── rollback ───────────────────────────────────────────────────────────────

test('going back rewrites the source and the profile, and consumes the slot', () => {
  const previousProfile = {
    renderer: { entrypoint: `/_${PROJECT}_/l2/layout/appHeader.js`, source: 'l2/layout/appHeader.ts', tag: TAG },
    heightPx: AURA_HEADER_HEIGHT_PX,
    brand: { title: 'Old Name', logoSvg: '<svg viewBox="0 0 8 8"></svg>' },
    props: { actions: ['designSystem'] },
  };
  const projectConfig = {
    headerBackup: { source: 'previous source', profile: previousProfile, profileName: 'defaultAura', at: 'x' },
  };

  const restored = restoreHeaderBackup(PROJECT, config(), projectConfig);
  assert.equal(restored.source, 'previous source');
  assert.equal(restored.paths.tag, TAG);
  const profile = (restored.config as any).clientShell.regions.header.profiles.defaultAura;
  assert.equal(profile.brand.title, 'Old Name');
  assert.deepEqual(profile.props, { actions: ['designSystem'] });
  assert.equal('headerBackup' in restored.projectConfig, false, 'the slot is single: it is consumed');
  assert.ok('headerBackup' in projectConfig, 'the input is not mutated');

  assert.throws(() => restoreHeaderBackup(PROJECT, config(), {}), /no previous header/);
});

// ── the shell document the preview reuses ──────────────────────────────────

test('the shell template of the active mode is resolved as an absolute URL', () => {
  const templates = {
    spa: './_102033_/l2/shared/spa/index.html',
    pwa: './_102033_/l2/shared/pwa/index.html',
  };

  assert.deepEqual(
    resolveShellTemplateUrl({ clientShell: { mode: 'spa' }, shellTemplates: templates }),
    { mode: 'spa', url: '/_102033_/l2/shared/spa/index.html' },
    'the config writes the path relative; it is served absolute',
  );
  assert.deepEqual(
    resolveShellTemplateUrl({ clientShell: { mode: 'pwa' }, shellTemplates: templates }),
    { mode: 'pwa', url: '/_102033_/l2/shared/pwa/index.html' },
  );

  // No templates declared: the mode still answers, and the preview falls back to the CDN map.
  assert.deepEqual(resolveShellTemplateUrl({ clientShell: { mode: 'pwa' } }), { mode: 'pwa' });
  assert.deepEqual(resolveShellTemplateUrl(undefined), { mode: 'spa' }, 'spa is the default mode');
});

test('the profile view carries the shell of the project', () => {
  // config() spreads its argument into the PROFILE, so the templates go on the root here.
  const view = readHeaderProfileView(
    { ...config(), shellTemplates: { spa: './_102033_/l2/shared/spa/index.html', pwa: './x.html' } },
    PROJECT,
  );
  assert.equal(view?.shellMode, 'spa');
  assert.equal(view?.shellTemplate, '/_102033_/l2/shared/spa/index.html');
});
