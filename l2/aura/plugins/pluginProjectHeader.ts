/// <mls fileReference="_102020_/l2/aura/plugins/pluginProjectHeader.ts" enhancement="_102027_/l2/enhancementLit" />

// The "Header" screen of a project (l5Project plugin, opened in the service details from
// selectProject, next to Usage/Config/Project Settings).
//
// It is the UI for the two header agents, which until now were console-only. Sections:
//   1. the header that is applied, rendered for real at band size;
//   2. the brand mark: what is there, and three ways to change it (an .svg file, pasted markup, or
//      agentGenerateLogo);
//   3. the request: brief/brand, the five actions (each with what it does, and a note when the base
//      will render nothing), the locales the header speaks and WHICH routes it links;
//   4. generate -> PREVIEW -> apply / discard / go back to the previous one, in a pinned action bar.
//
// The locale and route selections are DATA (`props.locales` / `props.navLinks` on the profile), not
// generated code: changing which links or languages a header offers is a config edit afterwards,
// with no round trip to the model.
//
// Every rule lives in `helpers/headerPluginCore.ts` (pure, tested); this file is DOM + I/O only.
//
// Why previewing needs its own file and tag: a draft is TypeScript text, so it has to be compiled
// before it can render, and `customElements.define` runs once per tag — reusing the applied tag would
// break the second preview of a session. So a draft is written to `l2/layout/appHeaderPreview.ts`
// under a per-attempt tag, imported with collabImport, and replaced by a stub once consumed.
//
// The band renders in the studio's own document (an iframe does not inherit the studio's module
// resolution), with the project's DS tokens re-scoped to the band container so the colours are the
// client's — see `_applyProjectTokens`.

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
import type { AppHeaderAction } from '/_102029_/l2/runtimeConfigTypes.js';
import { flagChip, localeFlagMarkup } from '/_102020_/l2/aura/plugins/helpers/localeFlag.js';
import {
  applyHeaderDraft,
  buildHeaderRequest,
  clearDraft,
  countProjectDesignSystems,
  formFromProfile,
  readProjectLanguages,
  readProjectRoutes,
  readHeaderBackup,
  readHeaderDraft,
  readHeaderProfileView,
  readLogoDraft,
  restoreHeaderBackup,
  scopeTokensCss,
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
  // What each action DOES, from the base that renders it — including the two that can render
  // nothing, which is otherwise discovered as a bug.
  actionLabel: {
    language: 'Language',
    designSystem: 'Design system',
    modules: 'Modules',
    search: 'Search',
    user: 'User',
  } as Record<string, string>,
  actionHint: {
    language: 'Language picker in the band.',
    designSystem: 'Theme picker for the project design system.',
    modules: "Links between the app's modules (not the pages of the current one).",
    search: 'Reserves the search affordance — the generated header draws the field; the shell provides nothing.',
    user: 'Avatar of the logged user (photo, initials or icon) with an email and sign-out menu.',
  } as Record<string, string>,
  oneLanguage: 'This project has one language: the picker will not appear.',
  oneDesignSystem: 'This project has one theme: the picker will not appear.',
  navLinks: 'Navigation links',
  navLinksHint: 'Pick only what belongs in the band — the aside already lists everything.',
  noRoutes: 'This project declares no routes yet.',
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
  noDraft: 'The run produced nothing — open the task in the thread to see why it failed.',
  staleDraft: 'What is parked belongs to an earlier run; this one produced nothing. Open the task to see why.',
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
    actionLabel: {
      language: 'Idioma',
      designSystem: 'Design System',
      modules: 'Módulos',
      search: 'Busca',
      user: 'Usuário',
    } as Record<string, string>,
    actionHint: {
      language: 'Seletor de idioma na banda.',
      designSystem: 'Seletor de tema do design system do projeto.',
      modules: 'Links entre os módulos do app (não as páginas do módulo atual).',
      search: 'Reserva o espaço da busca — quem desenha o campo é o header gerado; o shell não fornece nada.',
      user: 'Avatar do usuário logado (foto, iniciais ou ícone) com menu de e-mail e sair.',
    } as Record<string, string>,
    oneLanguage: 'Este projeto tem um idioma só: o seletor não vai aparecer.',
    oneDesignSystem: 'Este projeto tem um tema só: o seletor não vai aparecer.',
    navLinks: 'Links de navegação',
    navLinksHint: 'Escolha só o que faz sentido na banda — o aside já lista tudo.',
    noRoutes: 'Este projeto ainda não declara rotas.',
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
    noDraft: 'A execução não produziu nada — abra a task na thread para ver o motivo.',
    staleDraft: 'O que está guardado é de uma execução anterior; esta não produziu nada. Abra a task para ver o motivo.',
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

// Shared field/button classes: repeated inline they drift, and a form where two inputs disagree
// looks broken before it is read.
const INPUT = 'w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900'
  + ' px-2.5 py-1.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400'
  + ' focus:outline-none focus:ring-2 focus:ring-indigo-500';
const BUTTON = 'rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm'
  + ' hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50';
const BUTTON_PRIMARY = 'rounded-md bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-sm text-white'
  + ' disabled:opacity-50';
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
  /**
   * Tag to render in the APPLIED band when the applied header was written in this same session.
   *
   * `customElements.define` runs once per name per window, so re-importing the real tag after Apply
   * still constructs the PREVIOUS class — the band would keep showing the old header until a reload.
   * The draft that was just approved is already registered under its own tag and has exactly the
   * content that was written, so the band borrows it. Cleared by a reload, when the real tag is
   * registered from the file for the first time.
   */
  @state() private _appliedTag = '';
  @state() private _hasBackup = false;
  @state() private _markMode: 'none' | 'paste' | 'generate' = 'none';
  @state() private _markSvg = '';
  @state() private _markBrief = '';
  /** Non-fatal: the preview still renders, but not with the project's real colours. */
  @state() private _warn = '';
  /** Languages the project declares — the locale picker, and the "1 language" badge. */
  @state() private _languages: Array<{ code: string; name: string }> = [];
  /** Routes the project declares — what the header may link. */
  @state() private _routes: Array<{ label: string; href: string; description?: string }> = [];
  /** How many DS themes exist: below two, the base hides the switcher. */
  @state() private _dsCount = 0;

  private msg: MessageType = message_en;
  /** Signature of what is mounted in the applied band, so `updated()` does not remount it. */
  private _mountedPreview = '';
  /** Compiled DS tokens of the project; undefined = not read yet (an empty string is a valid answer). */
  private _tokensCssCache?: string;

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

  /** The stor file of `l5/config.json`, or undefined with the reason already on screen. */
  private _configFile(): mls.stor.IFileInfo | undefined {
    const key = mls.stor.getKeyToFile({
      project: this._projectId, level: 5, folder: '', shortName: 'config', extension: '.json',
    } as mls.stor.IFileInfoBase);
    const storFile = mls.stor.files[key];
    if (!storFile) this._error = `${CONFIG_REF(this._projectId)} is not loaded in mls.stor (key ${key})`;
    return storFile;
  }

  private async _readClientConfig(): Promise<unknown> {
    // Read the stor file directly (instead of readRawSource) to tell "the file is not loaded" apart
    // from "the file has no header": both used to render as an empty screen, which is unreadable.
    const storFile = this._configFile();
    if (!storFile) return undefined;
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

  /**
   * Writes `l5/config.json` straight through localStor.
   *
   * NOT through saveFile: that one goes via `getOrCreateModel`, which only exists for editor source
   * files — on a .json it throws ("use getOrCreateModel only on source files"). This is the same
   * write the agents do (`pointConfigAtHeader`).
   */
  private async _writeClientConfig(config: unknown): Promise<void> {
    const storFile = this._configFile();
    if (!storFile) throw new Error(`${CONFIG_REF(this._projectId)} is not loaded in mls.stor`);
    if (storFile.status !== 'renamed' && storFile.status !== 'new') storFile.status = 'changed';
    storFile.updatedAt = new Date().toISOString();
    await mls.stor.localStor.setContent(storFile, {
      contentType: 'string',
      content: `${JSON.stringify(config, null, 2)}\n`,
    });
  }

  private async _reload(): Promise<void> {
    this._error = '';
    this._warn = '';
    const config = await this._readClientConfig();
    this._view = readHeaderProfileView(config, this._projectId);
    this._routes = readProjectRoutes(config, this._projectId);
    const projectConfig = await getConfigProject(this._projectId);
    this._languages = readProjectLanguages(projectConfig);
    this._dsCount = countProjectDesignSystems(projectConfig);
    // No locale selection on the profile = the header speaks every language of the project.
    this._form = formFromProfile(this._view, this._languages.map((language) => language.code));
    this._hasBackup = Boolean(readHeaderBackup(projectConfig));
    this.requestUpdate();
    await this._mountAppliedPreview();
  }

  // ── preview of a compiled header ──────────────────────────────────────────

  /**
   * Boot config for the preview. It carries the project's REAL navigation: the band filters that list
   * by the selected hrefs, so without it `renderNavLinks()` has nothing to link and the preview shows
   * no links even when three routes are selected.
   */
  private _bootConfig() {
    return {
      projectId: String(this._projectId),
      moduleId: 'preview',
      basePath: '/preview',
      shellMode: this._view?.shellMode ?? 'spa',
      device: 'desktop',
      routes: [],
      navigation: this._routes.map((route) => ({ ...route })),
      moduleLinks: [],
      languages: this._languages.map((language) => language.code),
      layout: {
        regions: { desktop: { header: true, aside: true, content: true }, mobile: { header: true, aside: true, content: true } },
        asideMode: { desktop: 'inline', mobile: 'drawer' },
      },
    };
  }

  /**
   * Mounts a compiled header in a band-sized host, in the STUDIO's own document.
   *
   * No iframe: the studio resolves `/_<project>_/l2/…` module URLs for its own document, and an
   * `about:blank` frame does not inherit that resolution — every import inside it 404s. Rendering
   * here is also what `collabImport` is for.
   *
   * The import is retried: a file written a moment ago may not be compiled yet, and collabImport
   * resolves by version — so the element only becomes defined once the build lands.
   */
  private async _mountHeader(
    host: HTMLElement,
    folder: string,
    shortName: string,
    tag: string,
    props: Record<string, unknown>,
  ): Promise<void> {
    await this._applyProjectTokens(host);
    // Already in the registry (a tag this session defined): importing again would only serve the
    // file's CURRENT content, which for a consumed preview is the stub. The class is what we want.
    if (customElements.get(tag)) {
      host.replaceChildren(this._headerElement(tag, props));
      return;
    }
    for (let attempt = 0; attempt < 12; attempt += 1) {
      try {
        await collabImport({ project: this._projectId, folder, shortName, extension: '.ts' });
      } catch {
        // keep retrying: the module may not be compiled yet
      }
      if (customElements.get(tag)) break;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    if (!customElements.get(tag)) {
      this._error = `preview: ${tag} was not registered (is the file compiled?)`;
      return;
    }
    host.replaceChildren(this._headerElement(tag, props));
  }

  private _headerElement(tag: string, props: Record<string, unknown>): HTMLElement {
    const element = document.createElement(tag) as HTMLElement & { bootConfig?: unknown; regionProps?: unknown };
    element.bootConfig = this._bootConfig();
    element.regionProps = props;
    return element;
  }

  /**
   * Paints the band with the CLIENT's colours: the project's design-system tokens, re-scoped to the
   * band container so they do not repaint the studio around it.
   *
   * Without this the band falls back to the hardcoded defaults of every `var(--nav-*, #…)` in the
   * header, which is a different header from the one the user will see.
   */
  private async _applyProjectTokens(host: HTMLElement): Promise<void> {
    host.setAttribute('data-token-scope', String(this._projectId));
    const id = `header-preview-tokens-${this._projectId}`;
    if (document.getElementById(id)) return;
    const css = scopeTokensCss(await this._tokensCss(), `[data-token-scope="${this._projectId}"]`);
    if (!css) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
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

  private async _mountAppliedPreview(): Promise<void> {
    const host = this.querySelector('[data-band="applied"]') as HTMLElement | null;
    if (!host || !this._view?.isProjectHeader) return;
    // Borrow the approved draft's tag only while its class is really in the registry.
    const borrowed = Boolean(this._appliedTag) && Boolean(customElements.get(this._appliedTag));
    const tag = borrowed ? this._appliedTag : this._view.tag;
    // Keyed on what the band actually shows: saving a new mark must rebuild it, a re-render must not.
    const signature = JSON.stringify([
      tag, this._view.brand ?? null, this._view.actions,
      this._view.navLinks, this._view.locales, this._view.heightPx,
    ]);
    if (this._mountedPreview === signature) return;
    this._mountedPreview = signature;
    // The APPLIED band shows what is applied — the profile, not the unsaved form.
    await this._mountHeader(host, 'layout', borrowed ? 'appHeaderPreview' : 'appHeader', tag, {
      ...(this._view.brand ? { brand: this._view.brand } : {}),
      actions: this._view.actions,
      navLinks: this._view.navLinks,
      locales: this._view.locales,
      heightPx: this._view.heightPx ?? AURA_HEADER_HEIGHT_PX,
    });
  }

  private async _mountDraftPreview(): Promise<void> {
    const host = this.querySelector('[data-band="draft"]') as HTMLElement | null;
    if (!host || !this._previewTag) return;
    // The DRAFT band shows what the form asks for, which is what "Apply" would write.
    await this._mountHeader(host, 'layout', 'appHeaderPreview', this._previewTag, {
      ...(this._view?.brand ? { brand: this._view.brand } : {}),
      actions: this._form.actions,
      navLinks: this._form.navLinks,
      locales: this._form.locales,
      heightPx: this._view?.heightPx ?? AURA_HEADER_HEIGHT_PX,
    });
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

  /**
   * Writes a source AND compiles it, which are two different things here.
   *
   * `saveFile` calls `model.setValue()` on a file that already exists, and setValue does not compile:
   * the served .js keeps the PREVIOUS content, so importing it gives the previous tag/class and the
   * band reports "was not registered". A brand-new file is compiled by createStorFile, so the model
   * only needs the explicit pass when it is already there.
   */
  private async _writeSource(ref: string, source: string): Promise<void> {
    await saveFile(ref, source);
    const info = mls.stor.convertFileReferenceToFile(ref);
    const model = mls.editor.getModel(info) as mls.editor.IModelTS | undefined;
    if (!model) return;
    await mls.l2.typescript.compileAndPostProcess(model, true, true);
  }

  private _requestId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}`;
  }

  /**
   * Why the draft is not there. The two cases have different causes and different fixes, and
   * collapsing them into one message cost an hour once: a STALE draft means the run failed and an
   * older one is still parked, no draft at all means this run produced nothing (look at the task).
   */
  private _missingDraftReason(foundRequestId: string | undefined, expected: string): string {
    return foundRequestId
      ? `${this.msg.staleDraft} (${foundRequestId} != ${expected})`
      : this.msg.noDraft;
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
      // NEVER with ignoreLocalChanges: the agents write the draft through localStor, and that flag
      // reads the SERVER copy instead — the draft would be invisible (and the cache overwritten).
      const projectConfig = await getConfigProject(this._projectId);
      const draft = readHeaderDraft(projectConfig, requestId);
      if (!draft?.parts) throw new Error(this._missingDraftReason(readHeaderDraft(projectConfig)?.requestId, requestId));

      this._draftParts = draft.parts;
      this._notes = draft.notes ?? '';
      // A fresh tag per attempt: customElements.define cannot be repeated.
      const token = Date.now().toString(36).slice(-5);
      const preview = headerPaths(this._projectId, { previewToken: token });
      await this._writeSource(preview.fileReference, buildHeaderSource(this._projectId, draft.parts, { previewToken: token }));
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
      const projectConfig = await getConfigProject(this._projectId);
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

      await this._writeSource(result.paths.fileReference, result.source);
      await this._writeClientConfig(result.config);
      await updateConfigProject(this._projectId, result.projectConfig as any);
      // The class of the approved draft IS what was just written, and it is already registered —
      // so the applied band renders that tag instead of the real one, which in this window still
      // points at the previous class. See _appliedTag.
      this._appliedTag = this._previewTag;
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
      const projectConfig = await getConfigProject(this._projectId);
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
      await this._writeSource(headerPaths(this._projectId, { previewToken: 'x' }).fileReference, buildPreviewStub(this._projectId));
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
      const projectConfig = await getConfigProject(this._projectId);
      const restored = restoreHeaderBackup(this._projectId, config, projectConfig);
      await this._writeSource(restored.paths.fileReference, restored.source);
      await this._writeClientConfig(restored.config);
      await updateConfigProject(this._projectId, restored.projectConfig as any);
      // Going back means the previous header again — which in this window is exactly the class the
      // real tag still holds, so the borrowed draft tag must go.
      this._appliedTag = '';
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
      const projectConfig = await getConfigProject(this._projectId);
      const draft = readLogoDraft(projectConfig, requestId);
      if (!draft) throw new Error(this._missingDraftReason(readLogoDraft(projectConfig) ? '?' : undefined, requestId));
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

  // ── render ──────────────────────────────────────────────────────────────

  /** Section shell: same card the project panel uses, so the screen reads as part of it. */
  private _card(title: string, body: unknown, aside: unknown = nothing) {
    return html`
      <section class="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 overflow-hidden">
        <header class="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex-1">${title}</h3>
          ${aside}
        </header>
        <div class="p-3 flex flex-col gap-3">${body}</div>
      </section>
    `;
  }

  private _renderBand(kind: 'applied' | 'draft') {
    return html`
      <div
        data-band=${kind}
        class="rounded-md border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-950"
        style="height:${AURA_HEADER_HEIGHT_PX}px"
      ></div>
    `;
  }

  private _renderApplied() {
    const view = this._view;
    if (!view) {
      return this._card(this.msg.applied, html`<p class="text-sm italic text-gray-500 dark:text-gray-400">${this.msg.noHeader}</p>`);
    }
    return this._card(
      this.msg.applied,
      view.isProjectHeader
        ? this._renderBand('applied')
        : html`<p class="text-sm italic text-gray-500 dark:text-gray-400">${view.tag} (master)</p>`,
      html`
        <span class="text-[11px] font-mono text-gray-400 dark:text-gray-500">
          ${view.profileName} · ${view.tag} · ${view.heightPx ?? AURA_HEADER_HEIGHT_PX}px
        </span>
      `,
    );
  }

  /** A flag when we can draw one, the uppercase code when we cannot — never an empty box. */
  private _renderFlag(locale: string) {
    const markup = localeFlagMarkup(locale);
    return markup
      ? html`<span class="inline-flex w-5 h-3.5 rounded-sm overflow-hidden ring-1 ring-black/10 shrink-0">
          <svg viewBox="0 0 24 16" width="20" height="14" aria-hidden="true">${unsafeHTML(markup)}</svg>
        </span>`
      : html`<span class="text-[10px] font-mono px-1 rounded bg-gray-200 dark:bg-gray-700 shrink-0">${flagChip(locale)}</span>`;
  }

  private _renderMark() {
    const brand = this._view?.brand;
    return this._card(this.msg.mark, html`
      <div class="flex items-center gap-3 flex-wrap">
        <span class="inline-flex w-11 h-11 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200">
          ${brand?.logoSvg
            ? unsafeHTML(brand.logoSvg)
            : brand?.logoUrl
              ? html`<img src=${brand.logoUrl} alt="" class="max-w-8 max-h-8" />`
              : html`<span class="text-xs italic text-gray-400">—</span>`}
        </span>
        ${!brand?.logoSvg && !brand?.logoUrl
          ? html`<span class="text-sm italic text-gray-500 dark:text-gray-400">${this.msg.noMark}</span>`
          : nothing}
        <div class="flex items-center gap-3 ml-auto text-sm">
          <label class="underline cursor-pointer text-indigo-600 dark:text-indigo-400">
            ${this.msg.markFile}
            <input type="file" accept=".svg,image/svg+xml" class="hidden" @change=${(e: Event) => void this._onMarkFile(e)} />
          </label>
          <button type="button" class="underline text-indigo-600 dark:text-indigo-400"
            @click=${() => { this._markMode = this._markMode === 'paste' ? 'none' : 'paste'; }}>${this.msg.markPaste}</button>
          <button type="button" class="underline text-indigo-600 dark:text-indigo-400"
            @click=${() => { this._markMode = this._markMode === 'generate' ? 'none' : 'generate'; }}>${this.msg.markGenerate}</button>
        </div>
      </div>

      ${this._markMode === 'generate' ? html`
        <div class="flex gap-2 items-center">
          <input
            class=${INPUT}
            placeholder=${this.msg.markBrief}
            .value=${this._markBrief}
            @input=${(e: Event) => { this._markBrief = (e.target as HTMLInputElement).value; }}
          />
          <button type="button" class=${BUTTON} ?disabled=${!!this._busy} @click=${() => void this._generateMark()}>
            ${this._busy || this.msg.generate}
          </button>
        </div>
      ` : nothing}

      ${this._markMode === 'paste' ? html`
        <div class="flex flex-col gap-2">
          <textarea
            class="${INPUT} text-xs font-mono"
            rows="5"
            .value=${this._markSvg}
            @input=${(e: Event) => { this._markSvg = (e.target as HTMLTextAreaElement).value; }}
          ></textarea>
          <div class="flex items-center gap-3">
            <span class="inline-flex h-7 items-center text-gray-700 dark:text-gray-200">${this._markSvg ? unsafeHTML(this._markSvg) : nothing}</span>
            <button type="button" class=${BUTTON} ?disabled=${!!this._busy} @click=${() => void this._saveMark(this._markSvg.trim())}>
              ${this.msg.save}
            </button>
          </div>
        </div>
      ` : nothing}
    `);
  }

  /** The five actions, each with what it actually does — and whether it will show at all. */
  private _renderActionList() {
    const form = this._form;
    return html`
      <ul class="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
        ${HEADER_ACTIONS.map((action) => {
          const on = form.actions.includes(action);
          const silent = this._actionSilentReason(action);
          return html`
            <li class="py-2 first:pt-0 last:pb-0">
              <label class="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  class="mt-0.5 accent-indigo-600"
                  .checked=${on}
                  @change=${(e: Event) => {
                    const checked = (e.target as HTMLInputElement).checked;
                    this._form = {
                      ...this._form,
                      actions: checked
                        ? [...this._form.actions, action]
                        : this._form.actions.filter((item) => item !== action),
                    };
                  }}
                />
                <span class="flex flex-col gap-0.5">
                  <span class="text-sm font-medium text-gray-800 dark:text-gray-100">${this.msg.actionLabel[action]}</span>
                  <span class="text-xs text-gray-500 dark:text-gray-400">${this.msg.actionHint[action]}</span>
                  ${on && silent ? html`<span class="text-xs text-amber-700 dark:text-amber-500">${silent}</span>` : nothing}
                </span>
              </label>
              ${on && action === 'language' ? this._renderLocalePicker() : nothing}
            </li>
          `;
        })}
      </ul>
    `;
  }

  /** Why an enabled action renders nothing in this project — the base hides both switchers. */
  private _actionSilentReason(action: AppHeaderAction): string | undefined {
    if (action === 'language' && this._languages.length <= 1) return this.msg.oneLanguage;
    if (action === 'designSystem' && this._dsCount <= 1) return this.msg.oneDesignSystem;
    return undefined;
  }

  /** Which languages the header speaks: the project's, all selected by default. */
  private _renderLocalePicker() {
    if (this._languages.length === 0) return nothing;
    const selected = this._form.locales;
    return html`
      <div class="mt-2 ml-6 flex flex-wrap gap-1.5">
        ${this._languages.map((language) => {
          const on = selected.includes(language.code);
          return html`
            <button
              type="button"
              title=${language.name || language.code}
              class="flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs transition-colors ${on
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-800 dark:text-indigo-200'
                : 'border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 opacity-70 hover:opacity-100'}"
              @click=${() => {
                this._form = {
                  ...this._form,
                  locales: on
                    ? selected.filter((code) => code !== language.code)
                    : [...selected, language.code],
                };
              }}
            >
              ${this._renderFlag(language.code)}
              <span class="font-mono">${language.code}</span>
            </button>
          `;
        })}
      </div>
    `;
  }

  /** The project's routes, so the header links the two or three that matter — not all of them. */
  private _renderRoutes() {
    if (this._routes.length === 0) {
      return html`<p class="text-sm italic text-gray-500 dark:text-gray-400">${this.msg.noRoutes}</p>`;
    }
    const selected = this._form.navLinks;
    return html`
      <p class="text-xs text-gray-500 dark:text-gray-400">${this.msg.navLinksHint}</p>
      <ul class="flex flex-col gap-1 max-h-56 overflow-y-auto pr-1">
        ${this._routes.map((route) => {
          const on = selected.includes(route.href);
          return html`
            <li>
              <label class="flex items-center gap-2 rounded-md px-2 py-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60">
                <input
                  type="checkbox"
                  class="accent-indigo-600"
                  .checked=${on}
                  @change=${() => {
                    this._form = {
                      ...this._form,
                      navLinks: on
                        ? selected.filter((href) => href !== route.href)
                        : [...selected, route.href],
                    };
                  }}
                />
                <span class="text-sm text-gray-800 dark:text-gray-100 truncate">${route.label}</span>
                <span class="ml-auto text-[11px] font-mono text-gray-400 dark:text-gray-500 truncate">${route.href}</span>
              </label>
            </li>
          `;
        })}
      </ul>
    `;
  }

  private _renderForm() {
    const form = this._form;
    const set = (patch: Partial<HeaderFormState>) => { this._form = { ...this._form, ...patch }; };
    return html`
      ${this._card(this.msg.request, html`
        <textarea
          class="${INPUT} text-sm"
          rows="4"
          placeholder=${this.msg.brief}
          .value=${form.brief}
          @input=${(e: Event) => set({ brief: (e.target as HTMLTextAreaElement).value })}
        ></textarea>
        <div class="flex flex-col sm:flex-row gap-2">
          <input class=${INPUT} placeholder=${this.msg.brandTitle}
            .value=${form.brandTitle} @input=${(e: Event) => set({ brandTitle: (e.target as HTMLInputElement).value })} />
          <input class=${INPUT} placeholder=${this.msg.brandSubtitle}
            .value=${form.brandSubtitle} @input=${(e: Event) => set({ brandSubtitle: (e.target as HTMLInputElement).value })} />
        </div>
        <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          ${this.msg.logoMode}
          <select class=${INPUT} .value=${form.logo}
            @change=${(e: Event) => set({ logo: (e.target as HTMLSelectElement).value as HeaderFormState['logo'] })}>
            <option value="keep">${this.msg.logoKeep}</option>
            <option value="generate">${this.msg.logoGenerate}</option>
            <option value="none">${this.msg.logoNone}</option>
          </select>
        </label>
      `)}
      ${this._card(this.msg.actions, this._renderActionList())}
      ${this._card(this.msg.navLinks, this._renderRoutes())}
    `;
  }

  private _renderDraft() {
    if (!this._previewTag) return nothing;
    return this._card(
      this.msg.draft,
      html`
        ${this._renderBand('draft')}
        ${this._notes ? html`<p class="text-sm text-gray-600 dark:text-gray-300">${this.msg.notes}: ${this._notes}</p>` : nothing}
      `,
      html`<span class="text-[11px] font-mono text-gray-400 dark:text-gray-500">${this._previewTag}</span>`,
    );
  }

  /**
   * Everything that writes lives here, pinned to the bottom — INCLUDING the error and the warning.
   *
   * They used to sit at the top: clicking Generate at the bottom of a long form produced an error
   * nobody saw until they scrolled back up. The answer to a button belongs next to the button.
   */
  private _renderActionBar() {
    return html`
      <div class="sticky bottom-0 -mx-3 px-3 py-2 flex flex-col gap-2 bg-white/95 dark:bg-gray-900/95 border-t border-gray-200 dark:border-gray-800 backdrop-blur">
      ${this._error ? html`
        <p class="rounded-md border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-2.5 py-1.5 text-sm text-red-700 dark:text-red-300">
          ${this._error}
        </p>` : nothing}
      ${this._warn ? html`
        <p class="rounded-md border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1.5 text-xs text-amber-800 dark:text-amber-300">
          ${this._warn}
        </p>` : nothing}
      <div class="flex items-center gap-3 flex-wrap">
        ${this._previewTag ? html`
          <button type="button" class=${BUTTON_PRIMARY} ?disabled=${!!this._busy} @click=${() => void this._applyDraft()}>
            ${this.msg.apply}
          </button>
          <button type="button" class=${BUTTON} ?disabled=${!!this._busy} @click=${() => void this._discardDraft()}>
            ${this.msg.discard}
          </button>
        ` : html`
          <button type="button" class=${BUTTON_PRIMARY} ?disabled=${!!this._busy} @click=${() => void this._generateHeader()}>
            ${this._busy || this.msg.generate}
          </button>
        `}
        ${this._hasBackup ? html`
          <button type="button" class="ml-auto text-sm underline text-gray-600 dark:text-gray-300" ?disabled=${!!this._busy}
            @click=${() => void this._revert()}>${this.msg.revert}</button>
        ` : nothing}
        </div>
      </div>
    `;
  }

  render(): TemplateResult {
    this.msg = messages[this.getMessageKey(messages)] ?? message_en;
    if (!this._projectId) {
      return html`<p class="text-sm italic p-3 text-gray-500 dark:text-gray-400">${this.msg.noProject}</p>`;
    }
    return html`
      <div class="flex flex-col gap-3 p-3 text-gray-800 dark:text-gray-100">
        <div class="flex items-center gap-2">
          <span class="w-5 h-5 text-gray-500 dark:text-gray-400">${pluginData.getSvg()}</span>
          <h2 class="text-sm font-semibold flex-1">${this.msg.title}</h2>
          <span class="text-xs font-mono text-gray-400 dark:text-gray-500">#${this._projectId}</span>
        </div>
        ${this._renderApplied()}
        ${this._renderMark()}
        ${this._renderForm()}
        ${this._renderDraft()}
        ${this._renderActionBar()}
      </div>
    `;
  }
}
