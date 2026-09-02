/// <mls fileReference="_102020_/l2/aura/plugins/pluginHeaderEditor.ts" enhancement="_102027_/l2/enhancementLit" />

// The header EDITOR of a project. It is opened by the Header knob (selectHeader) in the RIGHT-HAND
// DETAILS panel (`openElementInServiceDetails`), pointed at one header of the app (`profileName` +
// `variant`). It does not live in the knob column any more: that column is ~375px and this screen
// carries a form, a brand and two bands.
//
// It is the UI for the two header agents, which until now were console-only. Layout:
//   * the bands on top, full width — a header is a wide thing: the applied one, and the draft when
//     there is one (the draft is what Apply would write, so it reads before the form);
//   * two columns below: the BRAND (mark + title + subtitle, written straight into the config) and
//     the REQUEST as three badged groups (Description | Actions | Links);
//   * a pinned action bar: generate -> PREVIEW -> apply / discard / go back to the previous one.
//
// `Definir como padrão` is NOT here: choosing which header the app boots is the knob's subject, and
// two homes for one action is a bug generator (this screen has paid that three times).
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
import { AURA_HEADER_HEIGHT_PX, AURA_HEADER_LOGO_PX } from '/_102033_/l2/shared/layout/auraHeaderCore.js';
import {
  applyProjectTokens,
  bandBootConfig,
  mountHeaderBand,
} from '/_102020_/l2/aura/plugins/helpers/headerBandPreview.js';
import type { AppHeaderAction } from '/_102029_/l2/runtimeConfigTypes.js';
import { flagChip, localeFlagMarkup } from '/_102020_/l2/aura/plugins/helpers/localeFlag.js';
import {
  ensureProjectLoaded,
  headerConfigRef,
  readHeaderConfig,
  writeHeaderConfig,
} from '/_102020_/l2/aura/plugins/helpers/headerConfigIo.js';
import {
  applyBrandTexts,
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
  brand: 'Brand',
  mark: 'Brand mark',
  noMark: 'No mark configured.',
  markFile: 'Choose an .svg file',
  markPaste: 'Paste SVG markup',
  markGenerate: 'Generate with AI',
  markBrief: 'What should the mark evoke?',
  request: 'Changes',
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
  navLinks: 'Links',
  navLinksHint: 'Pick only what belongs in the band — the aside already lists everything.',
  noRoutes: 'This project declares no routes yet.',
  generate: 'Generate',
  generating: 'Generating…',
  draft: 'Draft (not applied)',
  apply: 'Apply',
  discard: 'Discard',
  revert: 'Back to the previous header',
  isDefault: 'DEFAULT',
  defaultName: 'default',
  save: 'Save',
  notes: 'Notes',
  invalid: 'Refused',
  tabBrief: 'Description',
  light: 'light',
  dark: 'dark',
  markEmpty: 'Nothing to preview yet — paste the markup or generate a mark.',
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
    brand: 'Brand',
    mark: 'Marca',
    noMark: 'Nenhuma marca configurada.',
    markFile: 'Escolher arquivo .svg',
    markPaste: 'Colar markup SVG',
    markGenerate: 'Gerar com IA',
    markBrief: 'O que a marca deve evocar?',
    request: 'Alterações',
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
    navLinks: 'Links',
    navLinksHint: 'Escolha só o que faz sentido na banda — o aside já lista tudo.',
    noRoutes: 'Este projeto ainda não declara rotas.',
    generate: 'Gerar',
    generating: 'Gerando…',
    draft: 'Rascunho (não aplicado)',
    apply: 'Aplicar',
    discard: 'Descartar',
    revert: 'Voltar ao header anterior',
    isDefault: 'PADRÃO',
    defaultName: 'padrão',
    save: 'Salvar',
    notes: 'Notas',
    invalid: 'Recusado',
    tabBrief: 'Descrição',
    light: 'claro',
    dark: 'escuro',
    markEmpty: 'Nada para visualizar ainda — cole o markup ou gere uma marca.',
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

/** The three groups of the request. They were tabs while this screen lived in a 375px column. */
type RequestGroup = 'brief' | 'actions' | 'links';

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
/** Square icon button: the label lives in the tooltip, so it must never lose the title/aria-label. */
const ICON_BUTTON = 'inline-flex items-center justify-center w-8 h-8 rounded-md border cursor-pointer'
  + ' border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300'
  + ' hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors';
/** Pressed: these two toggle a panel open, and a toggle with no visible state is a guessing game. */
const ICON_BUTTON_ON = 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300';

// Inline, currentColor, 16px: no icon font is loaded in this panel.
const ICON = {
  upload: svg`
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 15V3" /><path d="M7.5 7.5 12 3l4.5 4.5" />
      <path d="M4 15v3.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V15" />
    </svg>`,
  paste: svg`
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M9 4h6v2.5H9z" />
      <path d="M8.5 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.5" />
      <path d="M9 12h6M9 16h4" />
    </svg>`,
  ai: svg`
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M13 3 14.6 8 19.5 9.5 14.6 11 13 16 11.4 11 6.5 9.5 11.4 8Z" />
      <path d="M18.5 15.5 19.2 17.8 21.5 18.5 19.2 19.2 18.5 21.5 17.8 19.2 15.5 18.5 17.8 17.8Z" />
    </svg>`,
} as const;
/** The thread the agent tasks are opened in (same convention as the design-system plugin). */
const THREAD_NAME = '_102020_/l2/aura/plugins/pluginHeaderEditor';

@customElement('aura--plugins--plugin-header-editor-102020')
export class PluginHeaderEditor extends PluginBaseModule {

  @property({ type: Boolean }) autoPrepare = false;
  @property({ type: String }) msize = '';
  /** Project the panel is showing; `mls.actualProject` is only the fallback. */
  @property({ type: Number }) project = 0;
  /**
   * Which header of the project to edit. Empty = whatever profile is active (how the plugin panel
   * opened it); a name = that profile, which is how the Header knob edits one of several.
   */
  @property({ attribute: false }) profileName = '';
  /** Variant slug of that header: '' = the default one. Decides the file, the tag and the class. */
  @property({ attribute: false }) variant = '';

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
  /** Brand texts being edited. Backed by the config, not by the generation request. */
  @state() private _brandTitle = '';
  @state() private _brandSubtitle = '';
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
  /** Same, for the draft band. */
  private _mountedDraft = '';

  createRenderRoot() {
    return this;
  }

  firstUpdated() {
    if (this.autoPrepare) void this.prepare();
  }

  /**
   * Reacts to being pointed at ANOTHER header.
   *
   * The knob keeps this same element and only swaps the properties (lit reuses the DOM at that
   * position), so without this the screen would keep showing the previous header's data — and the
   * band would keep a BORROWED tag that belongs to it. Everything about the previous one is dropped.
   *
   * The first update is skipped: `firstUpdated` + autoPrepare owns the initial load.
   */
  willUpdate(changed: Map<string, unknown>) {
    if (!this._projectId) return;
    if (!changed.has('project') && !changed.has('profileName') && !changed.has('variant')) return;
    this._view = undefined;
    this._previewTag = '';
    this._draftParts = undefined;
    this._appliedTag = '';
    this._mountedPreview = '';
    this._mountedDraft = '';
    this._markMode = 'none';
    this._markSvg = '';
    this._markBrief = '';
    this._notes = '';
    // Empty the bands NOW: the reload is async, and until it lands the previous header's element
    // would still be sitting there, looking like the one just selected.
    for (const kind of ['applied', 'draft']) {
      (this.querySelector(`[data-band="${kind}"]`) as HTMLElement | null)?.replaceChildren();
    }
    void this.prepare();
  }

  async prepare(): Promise<void> {
    this.msg = messages[this.getMessageKey(messages)] ?? message_en;
    this._projectId = Number(this.project) || mls.actualProject || 0;
    if (!this._projectId) return;
    await ensureProjectLoaded(this._projectId);
    await this._reload();
  }

  // ── reading the project ───────────────────────────────────────────────────

  private async _readClientConfig(): Promise<unknown> {
    try {
      return await readHeaderConfig(this._projectId);
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
      return undefined;
    }
  }

  private async _writeClientConfig(config: unknown): Promise<void> {
    await writeHeaderConfig(this._projectId, config);
  }

  private async _reload(): Promise<void> {
    this._error = '';
    this._warn = '';
    const config = await this._readClientConfig();
    // With no profile named, the active one — the Header knob names the one it is editing.
    this._view = readHeaderProfileView(config, this._projectId, this.profileName || undefined);
    this._routes = readProjectRoutes(config, this._projectId);
    const projectConfig = await getConfigProject(this._projectId);
    this._languages = readProjectLanguages(projectConfig);
    this._dsCount = countProjectDesignSystems(projectConfig);
    // No locale selection on the profile = the header speaks every language of the project.
    this._form = formFromProfile(this._view, this._languages.map((language) => language.code));
    // A header being CREATED has no profile yet: the identity comes from the caller, not the config.
    this._brandTitle = this._view?.brand?.title ?? '';
    this._brandSubtitle = this._view?.brand?.subtitle ?? '';
    if (this.profileName) this._form = { ...this._form, profileName: this.profileName };
    if (this.variant) this._form = { ...this._form, variant: this.variant };
    this._hasBackup = Boolean(readHeaderBackup(projectConfig));
    this.requestUpdate();
    await this._mountAppliedPreview();
  }

  // ── preview of a compiled header ──────────────────────────────────────────

  /**
   * The single CSS rule the mark tiles need: an inlined `<svg>` has no width/height of its own (the
   * validator forbids them), so it is the container that must size it — by height, like the band.
   * Injected once, scoped to this widget's tag, because the widget renders in the light DOM.
   */
  private _ensureMarkPreviewCss(): void {
    const id = 'header-plugin-mark-preview-css';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `${this.localName} .mark-tile svg { display: block; width: auto; height: var(--mark-h, ${AURA_HEADER_LOGO_PX}px); }`;
    document.head.appendChild(style);
  }

  private _bootConfig() {
    return bandBootConfig({
      projectId: this._projectId,
      shellMode: this._view?.shellMode,
      navigation: this._routes,
      languages: this._languages.map((language) => language.code),
    });
  }

  private async _mountHeader(
    host: HTMLElement,
    folder: string,
    shortName: string,
    tag: string,
    props: Record<string, unknown>,
  ): Promise<void> {
    if (!(await applyProjectTokens(host, this._projectId))) this._warn = this.msg.noTokens;
    const error = await mountHeaderBand(host, {
      projectId: this._projectId,
      folder,
      shortName,
      tag,
      bootConfig: this._bootConfig(),
      regionProps: props,
    });
    if (error) this._error = `preview: ${error}`;
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
    // Same rule as the list: a signature match only counts while the band is actually IN the host.
    if (this._mountedPreview === signature && host.firstElementChild) return;
    this._mountedPreview = signature;
    // The APPLIED band shows what is applied — the profile, not the unsaved form.
    // The module to import follows the VARIANT: `appHeaderNatal`, not `appHeader`. Importing the
    // default header here defined the default tag and left the variant's tag unregistered — the band
    // only appeared after the listing happened to mount it.
    const shortName = borrowed
      ? headerPaths(this._projectId, { previewToken: 'x' }).shortName
      : headerPaths(this._projectId, { variant: this._view.variant }).shortName;
    await this._mountHeader(host, 'layout', shortName, tag, {
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
    // Guarded like the applied band: updated() runs on every keystroke in the form, and rebuilding
    // the element each time made the draft band flicker while typing.
    const signature = JSON.stringify([this._previewTag, this._form.actions, this._form.navLinks, this._form.locales]);
    if (this._mountedDraft === signature && host.firstElementChild) return;
    this._mountedDraft = signature;
    // The DRAFT band shows what the form asks for, which is what "Apply" would write.
    await this._mountHeader(host, 'layout', headerPaths(this._projectId, { previewToken: 'x' }).shortName, this._previewTag, {
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

    // Verify instead of assuming: a write that did not land used to surface later as a preview that
    // "was not registered" or an applied header that never changed, with nothing pointing here.
    const info = mls.stor.convertFileReferenceToFile(ref);
    const storFile = mls.stor.files[mls.stor.getKeyToFile(info)];
    if (!storFile) throw new Error(`${ref} was not created in mls.stor`);
    const written = String((await storFile.getContent()) ?? '');
    if (written.trim() !== source.trim()) {
      throw new Error(`${ref} was written but read back different (${written.length} vs ${source.length} bytes)`);
    }

    const model = mls.editor.getModel(info) as mls.editor.IModelTS | undefined;
    if (!model) return;
    // The RESULT matters: a file that does not compile serves no .js, and the only symptom used to be
    // "<tag> was not registered" three screens later, with nothing naming the actual error.
    const compiled = await mls.l2.typescript.compileAndPostProcess(model, true, true);
    if (!compiled) {
      const first = (model.compilerResults?.errors ?? [])
        .map((diagnostic) => (typeof diagnostic.messageText === 'string'
          ? diagnostic.messageText
          : diagnostic.messageText?.messageText ?? ''))
        .filter(Boolean)[0];
      throw new Error(`${ref} did not compile${first ? `: ${first}` : ''}`);
    }
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
      // The brand comes from the profile: the model needs the title to lay the band out, and the
      // Brand section is what owns it.
      request = buildHeaderRequest(this._projectId, this._form, requestId, this._view?.brand);
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
      // The backup keeps the source of THIS header, so a variant rolls back to its own file.
      const previousSource = this._view?.isProjectHeader
        ? await readRawSource(headerPaths(this._projectId, { variant: this._form.variant || undefined }).fileReference)
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
        // The variant decides the tag and the class INSIDE the source, not just the file name: without
        // it, appHeaderNatal.ts would define the DEFAULT header's tag and the profile would point at
        // a tag nothing registers.
        (parts) => buildHeaderSource(this._projectId, parts, { variant: this._form.variant || undefined }),
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
      this.dispatchEvent(new CustomEvent('header-applied', {
        detail: { profileName: result.profileName, variant: this._form.variant },
        bubbles: true,
        composed: true,
      }));
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
    this._mountedDraft = '';
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
        brandTitle: this._brandTitle || undefined,
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
        brandTitle: this._brandTitle || undefined,
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
      <!-- pointer-events:none — a preview is a PICTURE of the header: live, its links would navigate
           the studio window and its user menu would open over the editor. -->
      <div
        data-band=${kind}
        class="rounded-md border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-950"
        style="height:${AURA_HEADER_HEIGHT_PX}px;pointer-events:none"
      ></div>
    `;
  }

  private _renderApplied() {
    const view = this._view;
    // Creating a variant: there is nothing applied to show, and the list above already shows the rest.
    if (!view && this.variant) return nothing;
    if (!view) {
      return this._card(this.msg.applied, html`<p class="text-sm italic text-gray-500 dark:text-gray-400">${this.msg.noHeader}</p>`);
    }
    return this._card(
      this.msg.applied,
      view.isProjectHeader
        ? this._renderBand('applied')
        : html`<p class="text-sm italic text-gray-500 dark:text-gray-400">${view.tag} (master)</p>`,
      html`
        ${view.isActive ? html`
          <span class="text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded
            bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">${this.msg.isDefault}</span>
        ` : nothing}
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

  /** One of the two toggles (paste / generate): pressed state included, since both open a panel. */
  private _markModeButton(mode: 'paste' | 'generate', label: string, icon: TemplateResult) {
    const on = this._markMode === mode;
    return html`
      <button
        type="button"
        title=${label}
        aria-label=${label}
        aria-pressed=${String(on)}
        class="${ICON_BUTTON} ${on ? ICON_BUTTON_ON : ''}"
        @click=${() => { this._markMode = on ? 'none' : mode; }}
      >${icon}</button>
    `;
  }

  /** True while the fields differ from what the config has — the only state where Save means anything. */
  private get _brandDirty(): boolean {
    return this._brandTitle.trim() !== (this._view?.brand?.title ?? '').trim()
      || this._brandSubtitle.trim() !== (this._view?.brand?.subtitle ?? '').trim();
  }

  /**
   * Writes the brand texts straight into the config — no model, no regeneration.
   *
   * They are config data (the band reads `this.brand.title` at runtime), and changing a word used to
   * cost a full generation. The applied band remounts by itself: its mount signature includes the
   * brand.
   */
  private async _saveBrand(): Promise<void> {
    this._error = '';
    this._busy = this.msg.save;
    try {
      const config = await this._readClientConfig();
      const written = applyBrandTexts(config, {
        profileName: this._view?.profileName,
        title: this._brandTitle,
        subtitle: this._brandSubtitle,
      });
      await this._writeClientConfig(written.config);
      await this._reload();
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
    } finally {
      this._busy = '';
    }
  }

  private _renderMark() {
    const brand = this._view?.brand;
    return this._card(this.msg.brand, html`
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
        <div class="flex items-center gap-1.5 ml-auto">
          <label class=${ICON_BUTTON} title=${this.msg.markFile} aria-label=${this.msg.markFile}>
            ${ICON.upload}
            <input type="file" accept=".svg,image/svg+xml" class="hidden" @change=${(e: Event) => void this._onMarkFile(e)} />
          </label>
          ${this._markModeButton('paste', this.msg.markPaste, ICON.paste)}
          ${this._markModeButton('generate', this.msg.markGenerate, ICON.ai)}
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

      <div class="flex flex-col sm:flex-row gap-2">
        <label class="flex-1 flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
          ${this.msg.brandTitle}
          <input class=${INPUT} .value=${this._brandTitle}
            @input=${(e: Event) => { this._brandTitle = (e.target as HTMLInputElement).value; }} />
        </label>
        <label class="flex-1 flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
          ${this.msg.brandSubtitle}
          <input class=${INPUT} .value=${this._brandSubtitle}
            @input=${(e: Event) => { this._brandSubtitle = (e.target as HTMLInputElement).value; }} />
        </label>
      </div>
      ${this._brandDirty ? html`
        <button type="button" class="${BUTTON_PRIMARY} self-start" ?disabled=${!!this._busy}
          @click=${() => void this._saveBrand()}>${this._busy || this.msg.save}</button>
      ` : nothing}

      ${this._markMode === 'paste' ? html`
        <div class="flex flex-col gap-2">
          <textarea
            class="${INPUT} text-xs font-mono"
            rows="5"
            .value=${this._markSvg}
            @input=${(e: Event) => { this._markSvg = (e.target as HTMLTextAreaElement).value; }}
          ></textarea>
          ${this._renderMarkPreview()}
          <div class="flex items-center gap-3">
            <button type="button" class=${BUTTON} ?disabled=${!!this._busy || this._markErrors.length > 0}
              @click=${() => void this._saveMark(this._markSvg.trim())}>
              ${this.msg.save}
            </button>
            ${this._notes ? html`<span class="text-xs text-gray-500 dark:text-gray-400">${this._notes}</span>` : nothing}
          </div>
        </div>
      ` : nothing}
    `);
  }

  /**
   * The group an error belongs to, so its card can point at it.
   *
   * The local gate rejects before the round trip and its reason lives in ONE group; with the message
   * in the footer and nothing marked, there is nothing to act on.
   */
  private get _errorGroup(): RequestGroup | undefined {
    if (!this._error) return undefined;
    if (/brand\.title|brief/iu.test(this._error)) return 'brief';
    if (/action/iu.test(this._error)) return 'actions';
    if (/route|navLinks|renderNavLinks/iu.test(this._error)) return 'links';
    return undefined;
  }

  /** Why the pending mark would be refused; empty when it is fine (or when there is nothing yet). */
  private get _markErrors(): string[] {
    const markup = this._markSvg.trim();
    return markup ? validateLogoSvg(markup) : [];
  }

  /**
   * The pending mark, before saving: at band size and large, on light AND on dark.
   *
   * A mark drawn with `currentColor` inherits the surface it sits on, and the header is a nav
   * surface that can be either — one that disappears on dark is a real failure this catches. The
   * refusal reasons show here too, so Save is not a guessing game.
   */
  private _renderMarkPreview() {
    this._ensureMarkPreviewCss();
    const markup = this._markSvg.trim();
    if (!markup) {
      return html`<p class="text-xs italic text-gray-400 dark:text-gray-500">${this.msg.markEmpty}</p>`;
    }
    const errors = this._markErrors;
    // Sized by HEIGHT with width auto, exactly like the band (AURA_HEADER_LOGO_PX): a wordmark must
    // not be squeezed into a square here and stretched there.
    const tile = (dark: boolean) => html`
      <div class="flex items-center gap-5 rounded-md border px-4 py-3
        ${dark
          ? 'border-gray-800 bg-gray-900 text-white'
          : 'border-gray-200 bg-white text-gray-900'}">
        <span class="mark-tile inline-flex items-center" style="--mark-h:${AURA_HEADER_LOGO_PX}px">
          ${unsafeHTML(markup)}
        </span>
        <span class="mark-tile inline-flex items-center" style="--mark-h:64px">
          ${unsafeHTML(markup)}
        </span>
        <span class="text-[11px] font-mono opacity-60 ml-auto">${dark ? this.msg.dark : this.msg.light}</span>
      </div>
    `;
    return html`
      <div class="flex flex-col gap-2">
        ${tile(false)}
        ${tile(true)}
        ${errors.length ? html`
          <ul class="rounded-md border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-2.5 py-1.5 text-xs text-red-700 dark:text-red-300 flex flex-col gap-0.5">
            ${errors.map((error) => html`<li>${error}</li>`)}
          </ul>` : nothing}
      </div>
    `;
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
      <ul class="flex flex-col gap-1">
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

  /**
   * The request, as three stacked groups.
   *
   * They were tabs while this screen lived in the ~375px knob column; here there is room, and a tab
   * that hides a decision which goes into the request is a tab that costs a wrong generation. Each
   * group keeps the badge the tab had (a brief or not, how many actions, how many of the routes), and
   * the group an error belongs to is marked.
   */
  private _renderGroups() {
    const faulty = this._errorGroup;
    const group = (id: RequestGroup, label: string, badge: string, body: unknown) => html`
      <section class="rounded-lg border overflow-hidden
        ${id === faulty
          ? 'border-red-300 dark:border-red-900/70'
          : 'border-gray-200 dark:border-gray-800'} bg-white dark:bg-gray-900/40">
        <header class="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
          <h3 class="text-xs font-semibold uppercase tracking-wider flex-1
            ${id === faulty ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}">${label}</h3>
          <span class="text-[10px] font-mono rounded px-1
            ${id === faulty
              ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}">${badge}</span>
        </header>
        <div class="p-3 flex flex-col gap-3">${body}</div>
      </section>
    `;

    return html`
      ${group('brief', this.msg.tabBrief, this._form.brief.trim() ? '✓' : '—', this._renderBriefPanel())}
      ${group('actions', this.msg.actions, String(this._form.actions.length), this._renderActionList())}
      ${group('links', this.msg.navLinks, `${this._form.navLinks.length}/${this._routes.length}`, this._renderRoutes())}
    `;
  }

  /** The draft, at the top of the screen: it is what Apply would write, so it reads before the form. */
  private _renderDraftBand() {
    if (!this._previewTag) return nothing;
    return html`
      <section class="rounded-lg border border-indigo-300 dark:border-indigo-500/50 bg-indigo-50/40 dark:bg-indigo-500/5 overflow-hidden">
        <header class="flex items-center gap-2 px-3 py-2 border-b border-indigo-200 dark:border-indigo-900/60">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex-1">${this.msg.draft}</h3>
          <span class="text-[11px] font-mono text-indigo-400 dark:text-indigo-500/80">${this._previewTag}</span>
        </header>
        <div class="p-3 flex flex-col gap-2">
          ${this._renderBand('draft')}
          ${this._notes ? html`<p class="text-sm text-gray-600 dark:text-gray-300">${this.msg.notes}: ${this._notes}</p>` : nothing}
        </div>
      </section>
    `;
  }

  private _renderBriefPanel() {
    return html`
      <textarea
        class="${INPUT} text-sm"
        rows="6"
        placeholder=${this.msg.brief}
        .value=${this._form.brief}
        @input=${(e: Event) => { this._form = { ...this._form, brief: (e.target as HTMLTextAreaElement).value }; }}
      ></textarea>
    `;
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
        <div class="flex items-center gap-2 flex-wrap">
          <span class="w-5 h-5 text-gray-500 dark:text-gray-400">${pluginData.getSvg()}</span>
          <h2 class="text-sm font-semibold">${this.msg.title}</h2>
          <span class="text-sm text-gray-500 dark:text-gray-400">${this.variant || this.msg.defaultName}</span>
          ${this._view?.isActive ? html`
            <span class="text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded
              bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">${this.msg.isDefault}</span>
          ` : nothing}
          <span class="ml-auto text-xs font-mono text-gray-400 dark:text-gray-500">#${this._projectId}</span>
        </div>

        <!-- A header is a wide thing: the bands take the full width, whatever it is. -->
        ${this._renderApplied()}
        ${this._renderDraftBand()}

        <!-- Two columns where there is room, one where there is not: the brand is a small object and
             the request is a tall form, so side by side they finally fit on one screen. -->
        <div class="grid gap-3 lg:grid-cols-2 items-start">
          <div class="flex flex-col gap-3">${this._renderMark()}</div>
          <div class="flex flex-col gap-3">${this._renderGroups()}</div>
        </div>

        ${this._renderActionBar()}
      </div>
    `;
  }
}
