/// <mls fileReference="_102020_/l2/aura/plugins/pluginProjectHeader.ts" enhancement="_102027_/l2/enhancementLit" />

// The "Header" screen of a project (l5Project plugin, opened in the service details from
// selectProject, next to Usage/Config/Project Settings).
//
// It is the UI for the two header agents, which until now were console-only. Four sections:
//   1. the header that is applied, rendered for real at band size;
//   2. the brand mark: what is there, and three ways to change it (an .svg file, pasted markup, or
//      agentGenerateLogo);
//   3. the form of the header request (the fields the prompt takes);
//   4. generate -> PREVIEW -> apply / discard / go back to the previous one.
//
// Every rule lives in `helpers/headerPluginCore.ts` (pure, tested); this file is DOM + I/O only.
//
// Why previewing needs its own file: a draft is TypeScript text, so it has to be compiled before it
// can render. It is written to `l2/layout/appHeaderPreview.ts` under a per-attempt tag and replaced
// by a stub once consumed. Both bands render inside an IFRAME that reproduces the client app's
// document (its stylesheets, its import map, the project's DS tokens) — see `_mountHeader`.

import { html, nothing, svg, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { PluginBaseModule } from '/_102027_/l2/pluginBaseModule.js';
import { collabImport } from '/_102027_/l2/collabImport.js';
import { getConfigProject, updateConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { executeBeforePromptStream, loadAgent } from '/_102027_/l2/aiAgentOrchestration.js';
import { getTemporaryContext } from '/_102027_/l2/aiAgentHelper.js';
import { createThread, getUserId } from '/_102025_/l2/collabMessagesHelper.js';
import { getThreadByName } from '/_102025_/l2/collabMessagesIndexedDB.js';
import { readRawSource, saveFile } from '/_102020_/l2/aura/agentImplementGenome/planning.js';
import {
  buildHeaderSource,
  buildPreviewStub,
  headerPaths,
  type GeneratedHeaderParts,
} from '/_102020_/l2/aura/agentManageHeader/helpers/generateHeaderCore.js';
import { applyLogoToBrand, validateLogoSvg } from '/_102020_/l2/aura/agentManageHeader/helpers/generateLogoCore.js';
import { AURA_HEADER_HEIGHT_PX } from '/_102033_/l2/shared/layout/auraHeaderCore.js';
import { tokensCssFromTheme, type IDesignSystemTokens } from '/_102029_/l2/designSystemBase.js';
import {
  applyHeaderDraft,
  buildHeaderRequest,
  clearDraft,
  formFromProfile,
  readHeaderBackup,
  readHeaderDraft,
  readHeaderProfileView,
  readLogoDraft,
  restoreHeaderBackup,
  type HeaderFormState,
  type HeaderProfileView,
} from '/_102020_/l2/aura/plugins/helpers/headerPluginCore.js';

/// **collab_i18n_start**
const message_en = {
  title: 'Header',
  noProject: 'Select a project first.',
  noHeader: 'This project has no header region in l5/config.json yet — generating one creates it.',
  applied: 'Applied header',
  profile: 'Profile',
  tag: 'Tag',
  band: 'Band',
  mark: 'Brand mark',
  noMark: 'No mark configured.',
  markFile: 'Choose an .svg file',
  markPaste: 'Paste SVG markup',
  markGenerate: 'Generate with AI',
  markBrief: 'What should the mark evoke?',
  request: 'New header',
  brief: 'What the header should look like',
  brandTitle: 'Brand title',
  brandSubtitle: 'Subtitle',
  actions: 'Actions',
  navLinks: 'Navigation links in the header',
  language: 'Language of the copy',
  logoMode: 'Mark',
  logoKeep: 'Keep the current one',
  logoGenerate: 'Generate a new one',
  logoNone: 'No mark',
  generate: 'Generate',
  generating: 'Generating…',
  draft: 'Draft (not applied)',
  apply: 'Apply',
  discard: 'Discard',
  revert: 'Back to the previous header',
  save: 'Save',
  notes: 'Notes',
  invalid: 'Refused',
  noTokens: 'The design system of the project could not be read; the preview has no real tokens',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
  en: message_en,
  pt: {
    title: 'Header',
    noProject: 'Selecione um projeto primeiro.',
    noHeader: 'Este projeto ainda não tem região de header no l5/config.json — gerar um cria.',
    applied: 'Header aplicado',
    profile: 'Perfil',
    tag: 'Tag',
    band: 'Banda',
    mark: 'Marca',
    noMark: 'Nenhuma marca configurada.',
    markFile: 'Escolher arquivo .svg',
    markPaste: 'Colar markup SVG',
    markGenerate: 'Gerar com IA',
    markBrief: 'O que a marca deve evocar?',
    request: 'Novo header',
    brief: 'Como o header deve ser',
    brandTitle: 'Título da marca',
    brandSubtitle: 'Subtítulo',
    actions: 'Ações',
    navLinks: 'Links de navegação no header',
    language: 'Idioma dos textos',
    logoMode: 'Marca',
    logoKeep: 'Manter a atual',
    logoGenerate: 'Gerar uma nova',
    logoNone: 'Sem marca',
    generate: 'Gerar',
    generating: 'Gerando…',
    draft: 'Rascunho (não aplicado)',
    apply: 'Aplicar',
    discard: 'Descartar',
    revert: 'Voltar ao header anterior',
    save: 'Salvar',
    notes: 'Notas',
    invalid: 'Recusado',
    noTokens: 'Não foi possível ler o design system do projeto; o preview está sem os tokens reais',
  },
};
/// **collab_i18n_end**

export const pluginData: mls.plugin.IPluginData = {
  title: 'Header',
  getSvg(): TemplateResult {
    return svg`
      <svg height="22px" width="22px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <rect x="2.75" y="4.75" width="18.5" height="14.5" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/>
        <path d="M2.75 9.25h18.5" fill="none" stroke="currentColor" stroke-width="1.6"/>
        <circle cx="6" cy="7" r="1" fill="currentColor"/>
      </svg>
    `;
  },
};

const CONFIG_REF = (project: number) => `_${project}_/l5/config.json`;
const HEADER_ACTIONS = ['language', 'designSystem', 'modules', 'search', 'user'] as const;
/** The thread the agent tasks are opened in (same convention as the design-system plugin). */
const THREAD_NAME = '_102020_/l2/aura/plugins/pluginProjectHeader';

@customElement('aura--plugins--plugin-project-header-102020')
export class PluginProjectHeader extends PluginBaseModule {

  @property({ type: Boolean }) autoPrepare = false;
  @property({ type: String }) msize = '';
  /** Project the panel is showing; `mls.actualProject` is only the fallback. */
  @property({ type: Number }) project = 0;

  @state() private _projectId = 0;
  @state() private _view?: HeaderProfileView;
  @state() private _form: HeaderFormState = formFromProfile(undefined);
  @state() private _busy = '';
  @state() private _error = '';
  @state() private _notes = '';
  @state() private _draftParts?: GeneratedHeaderParts;
  @state() private _previewTag = '';
  @state() private _hasBackup = false;
  @state() private _markMode: 'none' | 'paste' | 'generate' = 'none';
  @state() private _markSvg = '';
  @state() private _markBrief = '';
  /** Non-fatal: the preview still renders, but not with the project's real colours. */
  @state() private _warn = '';

  private msg: MessageType = message_en;
  /** Signature of what is mounted in the applied band, so `updated()` does not rebuild the iframe. */
  private _mountedPreview = '';
  /** Compiled DS tokens of the project; undefined = not read yet (an empty string is a valid answer). */
  private _tokensCssCache?: string;
  private _appEnvCache?: { head: string; bodyClass: string };

  createRenderRoot() {
    return this;
  }

  firstUpdated() {
    if (this.autoPrepare) void this.prepare();
  }

  async prepare(): Promise<void> {
    this.msg = messages[this.getMessageKey(messages)] ?? message_en;
    this._projectId = Number(this.project) || mls.actualProject || 0;
    if (!this._projectId) return;
    // A project that is not the actual one has no files in mls.stor yet, and every read here goes
    // through the stor — without this the screen would silently look like "nothing configured".
    if (this._projectId !== mls.actualProject) {
      await mls.stor.server.loadProjectInfoIfNeeded(this._projectId, false);
    }
    await this._reload();
  }

  // ── reading the project ───────────────────────────────────────────────────

  private async _readClientConfig(): Promise<unknown> {
    // Read the stor file directly (instead of readRawSource) to tell "the file is not loaded" apart
    // from "the file has no header": both used to render as an empty screen, which is unreadable.
    const key = mls.stor.getKeyToFile({
      project: this._projectId, level: 5, folder: '', shortName: 'config', extension: '.json',
    } as mls.stor.IFileInfoBase);
    const storFile = mls.stor.files[key];
    if (!storFile) {
      this._error = `${CONFIG_REF(this._projectId)} is not loaded in mls.stor (key ${key})`;
      return undefined;
    }
    const raw = String((await storFile.getContent()) ?? '');
    if (!raw.trim()) {
      this._error = `${CONFIG_REF(this._projectId)} is empty`;
      return undefined;
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      this._error = `l5/config.json: ${error instanceof Error ? error.message : String(error)}`;
      return undefined;
    }
  }

  private async _writeClientConfig(config: unknown): Promise<void> {
    await saveFile(CONFIG_REF(this._projectId), `${JSON.stringify(config, null, 2)}\n`);
  }

  private async _reload(): Promise<void> {
    this._error = '';
    this._warn = '';
    const config = await this._readClientConfig();
    this._view = readHeaderProfileView(config, this._projectId);
    this._form = formFromProfile(this._view);
    const projectConfig = await getConfigProject(this._projectId);
    this._hasBackup = Boolean(readHeaderBackup(projectConfig));
    this.requestUpdate();
    await this._mountAppliedPreview();
  }

  // ── preview of a compiled header ──────────────────────────────────────────

  /** Minimal boot config: the band only needs the module identity and the aside mode. */
  private _bootConfig() {
    return {
      projectId: String(this._projectId),
      moduleId: 'preview',
      basePath: '/preview',
      shellMode: this._view?.shellMode ?? 'spa',
      device: 'desktop',
      routes: [],
      layout: {
        regions: { desktop: { header: true, aside: true, content: true }, mobile: { header: true, aside: true, content: true } },
        asideMode: { desktop: 'inline', mobile: 'drawer' },
      },
    };
  }

  /**
   * Previews a header INSIDE AN IFRAME that reproduces the client app's own document.
   *
   * In the studio's document the band would be a lie: every colour a generated header uses is a
   * `var(--nav-*)` from the PROJECT's design system, and the app also ships its own stylesheets and
   * lit import map. So the preview document reuses the head of the very shell the app boots
   * (`shellTemplates[clientShell.mode]`) plus the project's compiled DS tokens — and nothing of the
   * studio's CSS reaches it.
   *
   * The app's boot scripts are deliberately dropped (only stylesheets and the import map are kept):
   * the preview must not install the service worker or start a login.
   *
   * A second, free benefit: the iframe has its OWN custom-element registry, so the same tag can be
   * previewed again in the same session without colliding on `customElements.define`.
   */
  private async _mountHeader(host: HTMLElement, folder: string, shortName: string, tag: string): Promise<void> {
    const [tokensCss, env] = await Promise.all([this._tokensCss(), this._appEnv()]);
    const iframe = document.createElement('iframe');
    iframe.title = tag;
    iframe.setAttribute('scrolling', 'no');
    iframe.style.cssText = 'display:block;width:100%;height:100%;border:0';
    host.replaceChildren(iframe);

    const doc = iframe.contentDocument;
    if (!doc) {
      this._error = 'preview: the iframe has no document';
      return;
    }

    // Two ways a project module is addressed, tried in this order:
    //   1. extensionless + `?t=` — exactly what collabImport builds, and what the studio serves;
    //   2. `.js` with no query — the form of the config entrypoint and of the studio's own dynamic
    //      imports (a cache-busting query on this one is what failed first: it reaches the network
    //      instead of being resolved).
    // The stamp keeps a header written seconds ago from coming out of the module cache.
    const base = `/_${this._projectId}_/l2/${folder ? `${folder}/` : ''}${shortName}`;
    const payload = JSON.stringify({
      tag,
      urls: [`${base}?t=${Date.now()}`, `${base}.js`],
      bootConfig: this._bootConfig(),
      regionProps: {
        ...(this._view?.brand ? { brand: this._view.brand } : {}),
        actions: this._form.actions,
        heightPx: this._view?.heightPx ?? AURA_HEADER_HEIGHT_PX,
      },
    });

    doc.open();
    doc.write([
      '<!doctype html><html><head>',
      `<base href="${location.origin}/">`,
      env.head,
      '<style>html,body{height:100%;margin:0;padding:0;overflow:hidden}</style>',
      tokensCss ? `<style>${tokensCss}</style>` : '',
      `</head><body class="${env.bodyClass}">`,
      '<script type="module">',
      `const p = ${payload};`,
      'window.litDisableBundleWarning = true;',
      '(async () => {',
      "  let last = '';",
      '  // Retried: a draft written a moment ago may not be compiled yet.',
      '  for (let i = 0; i < 8; i += 1) {',
      '    for (const url of p.urls) {',
      '      // Only the URL that already carries a query gets the retry stamp: adding one to the',
      "      // plain '.js' form is what made it miss the studio's resolution and hit the network.",
      "      const bust = url.includes('?') ? url + '&r=' + i : url;",
      "      try { await import(bust); } catch (error) { last = url + ' -> ' + (error && error.message ? error.message : error); continue; }",
      `      if (!customElements.get(p.tag)) { last = url + ' -> loaded, but ' + p.tag + ' was not defined'; continue; }`,
      '      const el = document.createElement(p.tag);',
      '      el.bootConfig = p.bootConfig;',
      '      el.regionProps = p.regionProps;',
      '      document.body.appendChild(el);',
      '      return;',
      '    }',
      '    await new Promise((done) => setTimeout(done, 300));',
      '  }',
      "  document.body.style.cssText = 'font:12px/1.4 monospace;padding:8px;color:#b91c1c';",
      "  document.body.textContent = 'preview: ' + last;",
      '})();',
      '<\/script></body></html>',
    ].join('\n'));
    doc.close();
  }

  /**
   * The project's design-system tokens compiled to CSS — the same compile the app does at boot
   * (`tokensCssFromTheme`), read through collabImport so an edit in the session is picked up.
   *
   * The first theme entry is used: which entry the app runs is a project-level choice that does not
   * belong to this screen, and the header only reads the `nav-*` family, which every entry defines.
   */
  private async _tokensCss(): Promise<string> {
    if (this._tokensCssCache !== undefined) return this._tokensCssCache;
    try {
      const mod = await collabImport({ project: this._projectId, folder: '', shortName: 'designSystem' });
      const entry = (mod?.tokens ?? [])[0] as IDesignSystemTokens | undefined;
      this._tokensCssCache = entry ? tokensCssFromTheme(entry) : '';
    } catch (error) {
      // A project without a design system still previews — but say so: every colour of a generated
      // header is a token, so an unstyled band would look like a broken header.
      this._tokensCssCache = '';
      this._warn = `${this.msg.noTokens}: ${error instanceof Error ? error.message : String(error)}`;
    }
    return this._tokensCssCache;
  }

  /**
   * Head of the app's shell document, reduced to what makes the band look real: its stylesheets and
   * its import map (the compiled header imports `lit` by bare specifier). Boot scripts are dropped.
   */
  private async _appEnv(): Promise<{ head: string; bodyClass: string }> {
    if (this._appEnvCache) return this._appEnvCache;
    const url = this._view?.shellTemplate;
    let head = '';
    let bodyClass = '';
    if (url) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const parsed = new DOMParser().parseFromString(await response.text(), 'text/html');
          head = [...parsed.head.querySelectorAll('link[rel="stylesheet"], script[type="importmap"]')]
            .map((node) => node.outerHTML)
            .join('\n');
          bodyClass = parsed.body.getAttribute('class') ?? '';
        }
      } catch {
        // fall through to the import map below
      }
    }
    if (!head) head = await this._fallbackImportMap();
    this._appEnvCache = { head, bodyClass };
    return this._appEnvCache;
  }

  /** Last resort when the shell document cannot be read: the Aura CDN map, so `lit` still resolves. */
  private async _fallbackImportMap(): Promise<string> {
    try {
      const mod = await import('/_102020_/l2/enhancementAura.js');
      const imports: Record<string, string> = {};
      for (const item of (mod?.requires ?? []) as { type?: string; name?: string; ref?: string }[]) {
        if (item?.type === 'cdn' && item.name && item.ref) imports[item.name] = item.ref;
      }
      if (!Object.keys(imports).length) return '';
      return `<script type="importmap">${JSON.stringify({ imports })}<\/script>`;
    } catch {
      return '';
    }
  }

  private async _mountAppliedPreview(): Promise<void> {
    const host = this.querySelector('[data-band="applied"]') as HTMLElement | null;
    if (!host || !this._view?.isProjectHeader) return;
    // Keyed on what the band actually shows: saving a new mark must rebuild it, a re-render must not.
    const signature = JSON.stringify([this._view.tag, this._view.brand ?? null, this._form.actions, this._view.heightPx]);
    if (this._mountedPreview === signature) return;
    this._mountedPreview = signature;
    await this._mountHeader(host, 'layout', 'appHeader', this._view.tag);
  }

  private async _mountDraftPreview(): Promise<void> {
    const host = this.querySelector('[data-band="draft"]') as HTMLElement | null;
    if (!host || !this._previewTag) return;
    await this._mountHeader(host, 'layout', 'appHeaderPreview', this._previewTag);
  }

  updated(): void {
    void this._mountAppliedPreview();
    if (this._previewTag) void this._mountDraftPreview();
  }

  // ── agents ────────────────────────────────────────────────────────────────

  private async _runAgent(agentName: string, prompt: string): Promise<void> {
    let thread = await getThreadByName(THREAD_NAME);
    if (!thread) thread = await createThread(THREAD_NAME, [], 'company');
    const userId = getUserId();
    if (!thread?.threadId || !userId) throw new Error('no user/thread for the agent run');

    const agent = await loadAgent(agentName);
    if (!agent) throw new Error(`agent ${agentName} not found`);
    const context = getTemporaryContext(thread.threadId, userId, prompt);
    for await (const _event of executeBeforePromptStream(agent, context)) {
      // consume the whole lifecycle; the result lands on the project config as a draft
    }
  }

  private _requestId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}`;
  }

  // ── header: generate / apply / discard / revert ───────────────────────────

  private async _generateHeader(): Promise<void> {
    this._error = '';
    this._notes = '';
    const requestId = this._requestId('hdr');
    let request;
    try {
      request = buildHeaderRequest(this._projectId, this._form, requestId);
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
      return;
    }

    this._busy = this.msg.generating;
    try {
      await this._runAgent('agentGenerateHeader', JSON.stringify(request));
      const projectConfig = await getConfigProject(this._projectId, true);
      const draft = readHeaderDraft(projectConfig, requestId);
      if (!draft?.parts) throw new Error('the agent returned no draft for this request');

      this._draftParts = draft.parts;
      this._notes = draft.notes ?? '';
      // A fresh tag per attempt: customElements.define cannot be repeated.
      const token = Date.now().toString(36).slice(-5);
      const preview = headerPaths(this._projectId, { previewToken: token });
      await saveFile(preview.fileReference, buildHeaderSource(this._projectId, draft.parts, { previewToken: token }));
      this._previewTag = preview.tag;
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
    } finally {
      this._busy = '';
    }
  }

  private async _applyDraft(): Promise<void> {
    if (!this._draftParts) return;
    this._busy = this.msg.apply;
    try {
      const config = await this._readClientConfig();
      const projectConfig = await getConfigProject(this._projectId, true);
      const previousSource = this._view?.isProjectHeader
        ? await readRawSource(headerPaths(this._projectId).fileReference)
        : '';

      const result = applyHeaderDraft(
        {
          projectId: this._projectId,
          config,
          projectConfig,
          parts: this._draftParts,
          form: this._form,
          previousSource,
          at: new Date().toISOString(),
        },
        (parts) => buildHeaderSource(this._projectId, parts),
      );

      await saveFile(result.paths.fileReference, result.source);
      await this._writeClientConfig(result.config);
      await updateConfigProject(this._projectId, result.projectConfig as any);
      await this._consumePreview();
      await this._reload();
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
    } finally {
      this._busy = '';
    }
  }

  private async _discardDraft(): Promise<void> {
    this._busy = this.msg.discard;
    try {
      const projectConfig = await getConfigProject(this._projectId, true);
      await updateConfigProject(this._projectId, clearDraft(projectConfig, 'headerDraft') as any);
      await this._consumePreview();
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
    } finally {
      this._busy = '';
    }
  }

  /** Puts the placeholder back so a consumed preview does not linger in the project. */
  private async _consumePreview(): Promise<void> {
    if (this._previewTag) {
      await saveFile(headerPaths(this._projectId, { previewToken: 'x' }).fileReference, buildPreviewStub(this._projectId));
    }
    this._previewTag = '';
    this._draftParts = undefined;
    const host = this.querySelector('[data-band="draft"]') as HTMLElement | null;
    host?.replaceChildren();
  }

  private async _revert(): Promise<void> {
    this._busy = this.msg.revert;
    try {
      const config = await this._readClientConfig();
      const projectConfig = await getConfigProject(this._projectId, true);
      const restored = restoreHeaderBackup(this._projectId, config, projectConfig);
      await saveFile(restored.paths.fileReference, restored.source);
      await this._writeClientConfig(restored.config);
      await updateConfigProject(this._projectId, restored.projectConfig as any);
      this._mountedPreview = '';
      await this._reload();
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
    } finally {
      this._busy = '';
    }
  }

  // ── mark ──────────────────────────────────────────────────────────────────

  private async _saveMark(svgMarkup: string): Promise<void> {
    const errors = validateLogoSvg(svgMarkup);
    if (errors.length > 0) {
      this._error = `${this.msg.invalid}: ${errors.join('; ')}`;
      return;
    }
    this._busy = this.msg.save;
    try {
      const config = await this._readClientConfig();
      const written = applyLogoToBrand(config, {
        svg: svgMarkup,
        profileName: this._form.profileName || undefined,
        brandTitle: this._form.brandTitle || undefined,
      });
      await this._writeClientConfig(written.config);
      this._markMode = 'none';
      this._markSvg = '';
      await this._reload();
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
    } finally {
      this._busy = '';
    }
  }

  private async _onMarkFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    // Only markup: the runtime inlines the mark, so a raster has nowhere to go.
    if (!/\.svg$/iu.test(file.name)) {
      this._error = `${this.msg.invalid}: only .svg`;
      return;
    }
    await this._saveMark((await file.text()).trim());
    input.value = '';
  }

  private async _generateMark(): Promise<void> {
    this._error = '';
    const requestId = this._requestId('logo');
    this._busy = this.msg.generating;
    try {
      await this._runAgent('agentGenerateLogo', JSON.stringify({
        projectId: this._projectId,
        brandTitle: this._form.brandTitle || undefined,
        brief: this._markBrief || undefined,
        profileName: this._form.profileName || undefined,
        commit: false,
        requestId,
      }));
      const projectConfig = await getConfigProject(this._projectId, true);
      const draft = readLogoDraft(projectConfig, requestId);
      if (!draft) throw new Error('the agent returned no mark for this request');
      this._markSvg = draft.svg;
      this._markMode = 'paste';
      this._notes = draft.notes ?? '';
      await updateConfigProject(this._projectId, clearDraft(projectConfig, 'logoDraft') as any);
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
    } finally {
      this._busy = '';
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  private _renderBand(kind: 'applied' | 'draft') {
    return html`
      <div
        data-band=${kind}
        style="height:${AURA_HEADER_HEIGHT_PX}px;border:1px solid #d9e2ec;border-radius:10px;overflow:hidden;background:#fff"
      ></div>
    `;
  }

  private _renderApplied() {
    const view = this._view;
    if (!view) return html`<p class="text-sm italic">${this.msg.noHeader}</p>`;
    return html`
      <section class="flex flex-col gap-2">
        <h3 class="text-xs font-semibold uppercase tracking-wider">${this.msg.applied}</h3>
        <div class="text-xs font-mono opacity-70">
          ${this.msg.profile}: ${view.profileName} · ${this.msg.tag}: ${view.tag} · ${this.msg.band}: ${view.heightPx ?? AURA_HEADER_HEIGHT_PX}px
        </div>
        ${view.isProjectHeader
          ? this._renderBand('applied')
          : html`<p class="text-sm italic">${view.tag} (master)</p>`}
      </section>
    `;
  }

  private _renderMark() {
    const brand = this._view?.brand;
    return html`
      <section class="flex flex-col gap-2">
        <h3 class="text-xs font-semibold uppercase tracking-wider">${this.msg.mark}</h3>
        <div class="flex items-center gap-3">
          <span style="display:inline-flex;width:44px;height:44px;align-items:center;justify-content:center;border:1px solid #d9e2ec;border-radius:10px">
            ${brand?.logoSvg
              ? unsafeHTML(brand.logoSvg)
              : brand?.logoUrl
                ? html`<img src=${brand.logoUrl} alt="" style="max-width:32px;max-height:32px" />`
                : html`<span class="text-xs italic opacity-60">—</span>`}
          </span>
          ${!brand?.logoSvg && !brand?.logoUrl ? html`<span class="text-sm italic">${this.msg.noMark}</span>` : nothing}
          <label class="text-sm underline cursor-pointer">
            ${this.msg.markFile}
            <input type="file" accept=".svg,image/svg+xml" style="display:none" @change=${(e: Event) => void this._onMarkFile(e)} />
          </label>
          <button type="button" class="text-sm underline" @click=${() => { this._markMode = 'paste'; }}>${this.msg.markPaste}</button>
          <button type="button" class="text-sm underline" @click=${() => { this._markMode = 'generate'; }}>${this.msg.markGenerate}</button>
        </div>

        ${this._markMode === 'generate' ? html`
          <div class="flex gap-2 items-center">
            <input
              class="flex-1 border rounded px-2 py-1 text-sm"
              placeholder=${this.msg.markBrief}
              .value=${this._markBrief}
              @input=${(e: Event) => { this._markBrief = (e.target as HTMLInputElement).value; }}
            />
            <button type="button" class="border rounded px-3 py-1 text-sm" ?disabled=${!!this._busy} @click=${() => void this._generateMark()}>
              ${this._busy || this.msg.generate}
            </button>
          </div>
        ` : nothing}

        ${this._markMode === 'paste' ? html`
          <div class="flex flex-col gap-2">
            <textarea
              class="border rounded px-2 py-1 text-xs font-mono"
              rows="5"
              .value=${this._markSvg}
              @input=${(e: Event) => { this._markSvg = (e.target as HTMLTextAreaElement).value; }}
            ></textarea>
            <div class="flex items-center gap-3">
              <span style="display:inline-flex;height:28px;align-items:center">${this._markSvg ? unsafeHTML(this._markSvg) : nothing}</span>
              <button type="button" class="border rounded px-3 py-1 text-sm" ?disabled=${!!this._busy} @click=${() => void this._saveMark(this._markSvg.trim())}>
                ${this.msg.save}
              </button>
            </div>
          </div>
        ` : nothing}
      </section>
    `;
  }

  private _renderForm() {
    const form = this._form;
    const set = (patch: Partial<HeaderFormState>) => { this._form = { ...this._form, ...patch }; };
    return html`
      <section class="flex flex-col gap-2">
        <h3 class="text-xs font-semibold uppercase tracking-wider">${this.msg.request}</h3>
        <textarea
          class="border rounded px-2 py-1 text-sm"
          rows="4"
          placeholder=${this.msg.brief}
          .value=${form.brief}
          @input=${(e: Event) => set({ brief: (e.target as HTMLTextAreaElement).value })}
        ></textarea>
        <div class="flex gap-2">
          <input class="flex-1 border rounded px-2 py-1 text-sm" placeholder=${this.msg.brandTitle}
            .value=${form.brandTitle} @input=${(e: Event) => set({ brandTitle: (e.target as HTMLInputElement).value })} />
          <input class="flex-1 border rounded px-2 py-1 text-sm" placeholder=${this.msg.brandSubtitle}
            .value=${form.brandSubtitle} @input=${(e: Event) => set({ brandSubtitle: (e.target as HTMLInputElement).value })} />
        </div>
        <div class="flex flex-wrap gap-3 text-sm">
          <span class="opacity-70">${this.msg.actions}:</span>
          ${HEADER_ACTIONS.map((action) => html`
            <label class="flex items-center gap-1">
              <input type="checkbox" .checked=${form.actions.includes(action)} @change=${(e: Event) => {
                const on = (e.target as HTMLInputElement).checked;
                set({ actions: on ? [...form.actions, action] : form.actions.filter((a) => a !== action) });
              }} />
              ${action}
            </label>
          `)}
        </div>
        <div class="flex flex-wrap items-center gap-4 text-sm">
          <label class="flex items-center gap-1">
            <input type="checkbox" .checked=${form.navLinks} @change=${(e: Event) => set({ navLinks: (e.target as HTMLInputElement).checked })} />
            ${this.msg.navLinks}
          </label>
          <label class="flex items-center gap-1">
            ${this.msg.language}
            <input class="border rounded px-2 py-1 w-16" .value=${form.language} @input=${(e: Event) => set({ language: (e.target as HTMLInputElement).value })} />
          </label>
          <label class="flex items-center gap-1">
            ${this.msg.logoMode}
            <select class="border rounded px-2 py-1" .value=${form.logo} @change=${(e: Event) => set({ logo: (e.target as HTMLSelectElement).value as HeaderFormState['logo'] })}>
              <option value="keep">${this.msg.logoKeep}</option>
              <option value="generate">${this.msg.logoGenerate}</option>
              <option value="none">${this.msg.logoNone}</option>
            </select>
          </label>
        </div>
        <div class="flex items-center gap-3">
          <button type="button" class="border rounded px-3 py-1 text-sm" ?disabled=${!!this._busy} @click=${() => void this._generateHeader()}>
            ${this._busy || this.msg.generate}
          </button>
          ${this._hasBackup ? html`
            <button type="button" class="text-sm underline" ?disabled=${!!this._busy} @click=${() => void this._revert()}>
              ${this.msg.revert}
            </button>
          ` : nothing}
        </div>
      </section>
    `;
  }

  private _renderDraft() {
    if (!this._previewTag) return nothing;
    return html`
      <section class="flex flex-col gap-2">
        <h3 class="text-xs font-semibold uppercase tracking-wider">${this.msg.draft}</h3>
        <div class="text-xs font-mono opacity-70">${this._previewTag}</div>
        ${this._renderBand('draft')}
        ${this._notes ? html`<p class="text-sm opacity-80">${this.msg.notes}: ${this._notes}</p>` : nothing}
        <div class="flex items-center gap-3">
          <button type="button" class="border rounded px-3 py-1 text-sm" ?disabled=${!!this._busy} @click=${() => void this._applyDraft()}>
            ${this.msg.apply}
          </button>
          <button type="button" class="text-sm underline" ?disabled=${!!this._busy} @click=${() => void this._discardDraft()}>
            ${this.msg.discard}
          </button>
        </div>
      </section>
    `;
  }

  render(): TemplateResult {
    this.msg = messages[this.getMessageKey(messages)] ?? message_en;
    if (!this._projectId) return html`<p class="text-sm italic p-3">${this.msg.noProject}</p>`;
    return html`
      <div class="flex flex-col gap-4 p-3">
        <div class="flex items-center gap-2">
          <span class="w-5 h-5">${pluginData.getSvg()}</span>
          <h2 class="text-sm font-semibold">${this.msg.title}</h2>
          <span class="text-xs font-mono opacity-60">#${this._projectId}</span>
        </div>
        ${this._error ? html`<p class="text-sm" style="color:#b91c1c">${this._error}</p>` : nothing}
        ${this._warn ? html`<p class="text-xs" style="color:#b45309">${this._warn}</p>` : nothing}
        ${this._renderApplied()}
        ${this._renderMark()}
        ${this._renderForm()}
        ${this._renderDraft()}
      </div>
    `;
  }
}
