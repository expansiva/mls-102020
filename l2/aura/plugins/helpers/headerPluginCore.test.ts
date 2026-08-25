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
  activateHeaderProfile,
  countProjectDesignSystems,
  listProjectHeaders,
  readHeaderProfileView,
  readLogoDraft,
  readProjectLanguages,
  readProjectRoutes,
  restoreHeaderBackup,
  scopeTokensCss,
} from '/_102020_/l2/aura/plugins/helpers/headerPluginCore.js';
import {
  buildHeaderSource,
  headerPaths,
  isProjectHeaderTag,
  slugVariant,
  variantFromTag,
} from '/_102020_/l2/aura/agentManageHeader/helpers/generateHeaderCore.js';
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
  const form = formFromProfile(readHeaderProfileView(config(), PROJECT), ['pt-BR', 'en']);
  assert.equal(form.brandTitle, 'Sample App');
  assert.equal(form.brandSubtitle, 'Operations');
  assert.deepEqual(form.actions, ['language', 'user']);
  assert.equal(form.profileName, 'defaultAura');
  // No selection on the profile: the header speaks every language of the project.
  assert.deepEqual(form.locales, ['pt-BR', 'en']);
  assert.deepEqual(form.navLinks, [], 'no route selected = no links, the default');
  // Not carried over: it is a per-generation decision, not state of the project.
  assert.equal(form.brief, '');
  assert.equal(form.logo, 'keep');
});

test('a selection recorded on the profile wins over the defaults', () => {
  const view = readHeaderProfileView(
    config({ props: { actions: ['language'], locales: ['en'], navLinks: ['/a', '/b'] } }),
    PROJECT,
  );
  assert.deepEqual(view?.locales, ['en']);
  assert.deepEqual(view?.navLinks, ['/a', '/b']);

  const form = formFromProfile(view, ['pt-BR', 'en']);
  assert.deepEqual(form.locales, ['en'], 'the profile decides, not the project list');
  assert.deepEqual(form.navLinks, ['/a', '/b']);

  // A locale the project dropped cannot stay selected: it has nowhere to come from.
  assert.deepEqual(formFromProfile(view, ['pt-BR']).locales, []);
});

test('the project languages, themes and routes are read from the two documents', () => {
  assert.deepEqual(
    readProjectLanguages({ languages: [{ language: 'en', name: 'English', path: '/' }, { language: '', name: 'x' }] }),
    [{ code: 'en', name: 'English' }],
    'an entry with no code is not a language',
  );
  assert.deepEqual(readProjectLanguages(undefined), []);

  assert.equal(countProjectDesignSystems({ designSystems: [{ dsIndex: '0' }, { dsIndex: '1' }] }), 2);
  assert.equal(countProjectDesignSystems({}), 0);

  const routes = readProjectRoutes({
    projects: {
      [String(PROJECT)]: {
        modules: [
          { navigation: [{ label: 'Dash', href: '/m/dash' }, { href: '/m/plain' }, { label: 'Dup', href: '/m/dash' }] },
          { navigation: [{ label: 'Other', href: '/m/other', description: 'why' }] },
        ],
      },
      '102034': { modules: [{ navigation: [{ label: 'Backend', href: '/nope' }] }] },
    },
  }, PROJECT);
  assert.deepEqual(routes.map((route) => route.href), ['/m/dash', '/m/plain', '/m/other'],
    'only the app project, deduped by href, in declaration order');
  assert.equal(routes[1].label, '/m/plain', 'a nameless route falls back to its href');
  assert.equal(routes[2].description, 'why');
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
  assert.deepEqual(request.navLinks, [], 'navigation stays opt-in: an empty selection is off');
  assert.equal(request.requestId, 'req-1');

  // The selection travels as lists, and the agent gets exactly what the screen shows.
  const picked = buildHeaderRequest(
    PROJECT,
    { ...form, navLinks: ['/a'], locales: ['pt-BR', 'en'] },
    'req-3',
  );
  assert.deepEqual(picked.navLinks, ['/a']);
  assert.deepEqual(picked.locales, ['pt-BR', 'en']);

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
  assert.equal(preview.tag, `layout--app-header-preview-k3f9-${PROJECT}`);
  assert.notEqual(preview.fileReference, real.fileReference);
  assert.match(preview.fileReference, /appHeaderPreview\.ts$/u);
  // customElements.define runs once per name: two previews in a session must not collide.
  assert.notEqual(headerPaths(PROJECT, { previewToken: 'aaa' }).tag, preview.tag);
  // A token that survives sanitisation only through letters/digits still yields a valid tag.
  assert.equal(headerPaths(PROJECT, { previewToken: 'A-b_1' }).tag, `layout--app-header-preview-ab1-${PROJECT}`);
});

test('the preview source carries the preview tag, the applied one the canonical tag', () => {
  const token = 'k3f9';
  const preview = buildHeaderSource(PROJECT, PARTS, { previewToken: token });
  const real = buildHeaderSource(PROJECT, PARTS);

  // includes() instead of a regex: the tag carries characters a pattern would have to escape.
  assert.ok(preview.includes(`customElements.define('layout--app-header-preview-${token}-${PROJECT}'`));
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

// ── the preview's environment ──────────────────────────────────────────────

test('the profile view carries the shell mode of the project', () => {
  assert.equal(readHeaderProfileView(config(), PROJECT)?.shellMode, 'spa');
});

test('project tokens are re-scoped off the document root', () => {
  const css = [
    '@import url("https://fonts.googleapis.com/css2?family=Inter");',
    ':root{',
    '\t--nav-bg: #ffffff;',
    '}',
    '[data-theme="dark"], :root.dark {',
    '\t--nav-bg: #0f172a;',
    '}',
  ].join('\n');
  const scoped = scopeTokensCss(css, '[data-token-scope="999999"]');

  assert.ok(scoped.includes('@import url('), 'font loading survives');
  assert.equal(scoped.includes(':root'), false, 'nothing is left painting the studio');
  assert.ok(scoped.includes('[data-token-scope="999999"]{'), 'light block moves onto the container');
  assert.ok(
    scoped.includes('[data-theme="dark"] [data-token-scope="999999"], .dark [data-token-scope="999999"] {'),
    'dark still switches from an ancestor',
  );

  assert.equal(scopeTokensCss('', '[x]'), '', 'no tokens, no style');
  assert.equal(scopeTokensCss(':root{--a:1;}', '  '), '', 'no scope, no style: never leak to :root');
});

// ── several headers in one project ─────────────────────────────────────────

test('a variant gets its own file, tag and class — with the project number last', () => {
  const natal = headerPaths(PROJECT, { variant: 'Natal' });
  assert.equal(natal.fileReference, `_${PROJECT}_/l2/layout/appHeaderNatal.ts`);
  assert.equal(natal.source, 'l2/layout/appHeaderNatal.ts');
  assert.equal(natal.entrypoint, `/_${PROJECT}_/l2/layout/appHeaderNatal.js`);
  assert.equal(natal.tag, `layout--app-header-natal-${PROJECT}`);
  assert.equal(natal.className, `AppHeaderNatal${PROJECT}`);

  // The default header is untouched by the new parameter.
  assert.deepEqual(headerPaths(PROJECT), headerPaths(PROJECT, { variant: '' }));
  assert.equal(headerPaths(PROJECT).tag, `layout--app-header-${PROJECT}`);
});

test('a variant name that cannot become a file/tag/class is refused', () => {
  assert.equal(slugVariant('Black Friday!'), 'blackfriday');
  assert.equal(slugVariant('  natal  '), 'natal');

  assert.throws(() => slugVariant(''), /needs a name/);
  assert.throws(() => slugVariant('---'), /needs a name/);
  assert.throws(() => slugVariant('2024'), /must start with a letter/, 'a class name cannot start with a digit');
  for (const reserved of ['default', 'defaultAura', 'studio', 'Preview']) {
    assert.throws(() => slugVariant(reserved), /reserved/, `${reserved} must be refused`);
  }
});

test('a header tag is recognised as the project own, variant or not', () => {
  assert.equal(isProjectHeaderTag(`layout--app-header-${PROJECT}`, PROJECT), true);
  assert.equal(isProjectHeaderTag(`layout--app-header-natal-${PROJECT}`, PROJECT), true);
  assert.equal(isProjectHeaderTag('collab-cbe-studio-header', PROJECT), false, 'the studio band is not ours');
  assert.equal(isProjectHeaderTag(`layout--app-header-${PROJECT + 1}`, PROJECT), false, 'another project is not ours');

  assert.equal(variantFromTag(`layout--app-header-natal-${PROJECT}`, PROJECT), 'natal');
  assert.equal(variantFromTag(`layout--app-header-${PROJECT}`, PROJECT), undefined, 'the default has no slug');
});

test('the listing reports every profile, which is active, and whose it is', () => {
  const config = {
    clientShell: {
      mode: 'spa',
      regions: {
        header: {
          activeProfile: 'natal',
          profiles: {
            defaultAura: {
              renderer: { tag: `layout--app-header-${PROJECT}`, source: 'l2/layout/appHeader.ts' },
              heightPx: AURA_HEADER_HEIGHT_PX,
              brand: { title: 'Sample App' },
              props: { actions: ['user'], locales: ['en'], navLinks: ['/a'] },
            },
            natal: {
              renderer: { tag: `layout--app-header-natal-${PROJECT}`, source: 'l2/layout/appHeaderNatal.ts' },
              heightPx: AURA_HEADER_HEIGHT_PX,
            },
            studio: { renderer: { tag: 'collab-cbe-studio-header' } },
          },
        },
      },
    },
  };

  const entries = listProjectHeaders(config, PROJECT);
  assert.deepEqual(entries.map((entry) => entry.profileName), ['defaultAura', 'natal', 'studio'],
    'config order, nothing hidden');
  assert.deepEqual(entries.map((entry) => entry.isActive), [false, true, false]);
  assert.deepEqual(entries.map((entry) => entry.isProjectHeader), [true, true, false],
    'the studio band is listed, but it is not one of ours');
  assert.equal(entries[1].variant, 'natal');
  assert.equal(entries[0].variant, undefined);
  assert.deepEqual(entries[0].actions, ['user']);
  assert.deepEqual(entries[0].navLinks, ['/a']);
  assert.deepEqual(entries[1].actions, [], 'a profile with no props reads as empty, never undefined');

  assert.deepEqual(listProjectHeaders({}, PROJECT), []);
});

test('activating moves activeProfile and nothing else', () => {
  const config = {
    clientShell: {
      regions: {
        header: {
          activeProfile: 'defaultAura',
          profiles: {
            defaultAura: { renderer: { tag: `layout--app-header-${PROJECT}` }, brand: { title: 'A' } },
            natal: { renderer: { tag: `layout--app-header-natal-${PROJECT}` }, brand: { title: 'B' } },
          },
        },
      },
    },
  };
  const next = activateHeaderProfile(config, 'natal') as any;
  assert.equal(next.clientShell.regions.header.activeProfile, 'natal');
  assert.deepEqual(next.clientShell.regions.header.profiles.defaultAura.brand, { title: 'A' },
    'the other profiles are untouched');
  assert.equal((config as any).clientShell.regions.header.activeProfile, 'defaultAura', 'the input is not mutated');

  assert.throws(() => activateHeaderProfile(config, 'nope'), /no header profile "nope"/);
  assert.throws(() => activateHeaderProfile(config, ''), /needs a profile name/);
});

test('the rollback slot is per profile, and the legacy single slot still answers', () => {
  const profile = {
    renderer: { entrypoint: `/_${PROJECT}_/l2/layout/appHeader.js`, source: 'l2/layout/appHeader.ts', tag: TAG },
    heightPx: AURA_HEADER_HEIGHT_PX,
  };

  // New shape: keyed by profile name.
  const perProfile = {
    headerBackup: {
      defaultAura: { source: 'src default', profile, profileName: 'defaultAura', at: 'x' },
      natal: { source: 'src natal', profile, profileName: 'natal', at: 'y' },
    },
  };
  assert.equal(readHeaderBackup(perProfile, 'natal')?.source, 'src natal');
  assert.equal(readHeaderBackup(perProfile, 'defaultAura')?.source, 'src default');
  assert.equal(readHeaderBackup(perProfile)?.source, 'src default', 'no name = the default header');
  assert.equal(readHeaderBackup(perProfile, 'nope'), undefined);

  // Legacy shape: one object, which answers for the profile it recorded.
  const legacy = { headerBackup: { source: 'old', profile, profileName: 'defaultAura', at: 'z' } };
  assert.equal(readHeaderBackup(legacy)?.source, 'old', 'a project mid-flight keeps its rollback');
  assert.equal(readHeaderBackup(legacy, 'defaultAura')?.source, 'old');
  assert.equal(readHeaderBackup(legacy, 'natal'), undefined, 'it does not answer for another profile');

  // Restoring consumes only that profile's slot.
  const restored = restoreHeaderBackup(PROJECT, config(), perProfile, 'natal');
  assert.equal(restored.source, 'src natal');
  const left = (restored.projectConfig as any).headerBackup;
  assert.equal('natal' in left, false, 'consumed');
  assert.equal('defaultAura' in left, true, 'the other profile keeps its own');
});

test('writing a variant does not put it on the air', () => {
  const form = { ...emptyHeaderForm(), brandTitle: 'Sample App', variant: 'natal', profileName: 'natal' };
  const result = applyHeaderDraft(
    { projectId: PROJECT, config: config(), projectConfig: {}, parts: PARTS, form, at: 'now' },
    () => 'source',
  );
  const header = (result.config as any).clientShell.regions.header;
  assert.equal(header.activeProfile, 'defaultAura', 'the active header is untouched');
  assert.ok(header.profiles.natal, 'but the variant is there, ready to activate');
  assert.equal(result.paths.fileReference, `_${PROJECT}_/l2/layout/appHeaderNatal.ts`);

  // The default header, on the other hand, IS what you are looking at: it stays active.
  const onDefault = applyHeaderDraft(
    { projectId: PROJECT, config: config(), projectConfig: {}, parts: PARTS, form: { ...form, variant: '', profileName: '' }, at: 'now' },
    () => 'source',
  );
  assert.equal((onDefault.config as any).clientShell.regions.header.activeProfile, 'defaultAura');
});
