/// <mls fileReference="_102020_/l2/aura/plugins/pluginMenuEditor.ts" enhancement="_102027_/l2/enhancementLit" />

// The menu EDITOR of one module (TASK-102020-config-menu-editor). Opened by the "Menu" section of the Module
// knob (selectModule) in the RIGHT-HAND DETAILS panel (`openElementInServiceDetails`), like the header editor:
// the knob column is ~375px and this screen is a table.
//
// `l5/config.json` is the source of truth of the menu (decided 30/10/2026). The editor works on a copy of the
// module entry and writes it back on Save. Every rule lives in `helpers/menuConfigCore.ts` (pure, tested);
// this file is DOM + I/O only.
//
// Saving re-reads the config and replaces only the menu fields of this module, so an edit made elsewhere
// (the header editor, another module) is not lost. If the menu of THIS module changed since the editor
// loaded it, nothing is written and the screen offers a reload.

import { html, nothing, svg, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { PluginBaseModule } from '/_102027_/l2/pluginBaseModule.js';
import { ensureProjectLoaded, readConfig, writeConfig } from '/_102020_/l2/aura/plugins/helpers/configIo.js';
import { notifyMenuChanged } from '/_102020_/l2/aura/plugins/helpers/menuNotify.js';
import {
  findModuleEntry,
  fixMenuIssue,
  hideFromMenu,
  moduleMenuFingerprint,
  moveMenuItem,
  previewForActor,
  readModuleMenu,
  replaceModuleMenu,
  setHomePage,
  setLanding,
  setMenuActor,
  setMenuDescription,
  setMenuIcon,
  setMenuIconSvg,
  setMenuLabel,
  showInMenu,
  type MenuEditResult,
  type MenuIssue,
  type ModuleEntry,
} from '/_102020_/l2/aura/plugins/helpers/menuConfigCore.js';
import {
  loadMenuIconArtwork,
  renderMenuIcon,
  renderMenuIconSvg,
  type LucideArtwork,
  type MenuIconChoice,
  type MenuIconPickerLabels,
} from '/_102020_/l2/aura/plugins/menuIconPicker.js';
import { clearMenuIconDraft, readMenuIconDraft, type MenuIconCandidate } from '/_102020_/l2/aura/agentManageMenu/helpers/generateMenuIconCore.js';
import { getConfigProject, updateConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { executeBeforePromptStream, loadAgent } from '/_102027_/l2/aiAgentOrchestration.js';
import { getTemporaryContext } from '/_102027_/l2/aiAgentHelper.js';
import { createThread, getUserId } from '/_102025_/l2/collabMessagesHelper.js';
import { getThreadByName } from '/_102025_/l2/collabMessagesIndexedDB.js';

/** Thread the icon generations run in (one per editor, like the header editor's). */
const THREAD_NAME = '_102020_/l2/aura/plugins/pluginMenuEditor';

/// **collab_i18n_start**
const message_en = {
  title: 'Menu',
  noProject: 'Select a project first.',
  noModule: 'This module has no entry in l5/config.json.',
  loading: 'Loading…',
  issues: 'Inconsistencies found',
  fix: 'Fix',
  fixAll: 'Fix all',
  issue: {
    'nav-without-page': 'Menu item without a page in frontend.pages',
    'title-differs': 'Route title differs from the menu label',
    'href-differs': 'Menu link differs from the page route',
    'actors-differ': 'Roles of the menu item differ from the roles of the page',
    'landing-orphan': 'Start page of a role points to a page it does not see',
    'landing-flag-differs': 'Start-page mark of the menu item is out of date',
    'unknown-icon': 'Menu icon is not a Lucide icon name',
    'unsafe-icon-svg': 'Own SVG icon is refused by the safety rule',
    'icon-and-svg': 'Menu item has both a Lucide icon and an own SVG',
  } as Record<string, string>,
  menu: 'In the menu',
  icon: 'Icon',
  chooseIcon: 'Choose icon',
  ownSvg: 'own SVG',
  iconSearch: 'Search icon by name',
  noIcon: 'No icon',
  iconResults: '{count} icons',
  iconMore: 'Show more',
  iconClose: 'Close',
  iconHint: 'Shown in the apps menu of collab-messages.',
  iconLibrary: 'Library',
  iconPaste: 'Paste SVG',
  iconGenerate: 'Generate with AI',
  iconFile: '.svg file',
  iconPastePlaceholder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">…</svg>',
  iconValid: 'Valid SVG: one root, viewBox, currentColor only, nothing that runs.',
  iconUse: 'Use this icon',
  iconBrief: 'What should the icon show?',
  iconGenerateButton: 'Generate',
  iconGenerating: 'Generating…',
  iconRegenerate: 'Generate again',
  iconUseOption: 'Use option {n}',
  iconLight: 'light',
  iconDark: 'dark',
  iconFileError: 'Only .svg files.',
  iconNoDraft: 'The agent finished without icons. Try another description.',
  label: 'Label',
  description: 'Description',
  roles: 'Who sees',
  up: 'Move up',
  down: 'Move down',
  hide: 'Hide from menu',
  hidden: 'Out of the menu (route still works)',
  show: 'Show in menu',
  noHidden: 'Every page is in the menu.',
  home: 'Page of /{module}',
  homeHint: 'The page that opens at the module address. Reordering the menu does not change it.',
  landings: 'Start page per role',
  landingsHint: 'Kept in the config, but the app does not use it yet.',
  noLanding: '(none)',
  preview: 'How a role sees the menu',
  start: 'start',
  save: 'Save',
  discard: 'Discard',
  reload: 'Reload',
  saved: 'Saved in l5/config.json.',
  unsaved: 'Unsaved changes',
  nothingToSave: 'Nothing changed.',
  conflict: 'The menu of this module changed in l5/config.json since it was loaded. Nothing was written: reload to edit the current version.',
  refused: {
    'empty-label': 'The label cannot be empty.',
    'last-actor': 'A page needs at least one role: with none, the app shows it to everybody.',
    'actor-does-not-see': 'That role does not see this page.',
    'not-in-menu': 'This page is not in the menu.',
    'already-in-menu': 'This page is already in the menu.',
    'no-page': 'This page has no route.',
    'unknown-icon': 'That is not a Lucide icon name.',
    'unsafe-svg': 'That SVG is refused: it must be one <svg> with viewBox, currentColor only, nothing that runs.',
  } as Record<string, string>,
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
  en: message_en,
  pt: {
    title: 'Menu',
    noProject: 'Selecione um projeto primeiro.',
    noModule: 'Este módulo não tem entrada no l5/config.json.',
    loading: 'Carregando…',
    issues: 'Inconsistências encontradas',
    fix: 'Corrigir',
    fixAll: 'Corrigir todas',
    issue: {
      'nav-without-page': 'Item do menu sem página em frontend.pages',
      'title-differs': 'Título da rota diferente do rótulo do menu',
      'href-differs': 'Link do menu diferente da rota da página',
      'actors-differ': 'Papéis do item do menu diferentes dos papéis da página',
      'landing-orphan': 'Página inicial de um papel aponta para página que ele não vê',
      'landing-flag-differs': 'Marca de página inicial do item do menu desatualizada',
      'unknown-icon': 'Ícone do menu não é um nome de ícone Lucide',
      'unsafe-icon-svg': 'SVG próprio recusado pela regra de segurança',
      'icon-and-svg': 'Item do menu com ícone Lucide e SVG próprio ao mesmo tempo',
    } as Record<string, string>,
    menu: 'No menu',
    icon: 'Ícone',
    chooseIcon: 'Escolher ícone',
    ownSvg: 'SVG próprio',
    iconSearch: 'Buscar ícone pelo nome',
    noIcon: 'Sem ícone',
    iconResults: '{count} ícones',
    iconMore: 'Mostrar mais',
    iconClose: 'Fechar',
    iconHint: 'Aparece no menu de apps do collab-messages.',
    iconLibrary: 'Biblioteca',
    iconPaste: 'Colar SVG',
    iconGenerate: 'Gerar com IA',
    iconFile: 'Arquivo .svg',
    iconPastePlaceholder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">…</svg>',
    iconValid: 'SVG válido: uma raiz, viewBox, só currentColor, nada que execute.',
    iconUse: 'Usar este ícone',
    iconBrief: 'O que o ícone deve mostrar?',
    iconGenerateButton: 'Gerar',
    iconGenerating: 'Gerando…',
    iconRegenerate: 'Gerar de novo',
    iconUseOption: 'Usar opção {n}',
    iconLight: 'claro',
    iconDark: 'escuro',
    iconFileError: 'Só arquivos .svg.',
    iconNoDraft: 'O agente terminou sem ícones. Tente outra descrição.',
    label: 'Rótulo',
    description: 'Descrição',
    roles: 'Quem vê',
    up: 'Subir',
    down: 'Descer',
    hide: 'Ocultar do menu',
    hidden: 'Fora do menu (a rota continua funcionando)',
    show: 'Mostrar no menu',
    noHidden: 'Todas as páginas estão no menu.',
    home: 'Página de /{module}',
    homeHint: 'A página que abre no endereço do módulo. Reordenar o menu não a altera.',
    landings: 'Página inicial por papel',
    landingsHint: 'Fica gravada no config, mas o app ainda não a usa.',
    noLanding: '(nenhuma)',
    preview: 'Como um papel vê o menu',
    start: 'inicial',
    save: 'Salvar',
    discard: 'Descartar',
    reload: 'Recarregar',
    saved: 'Salvo no l5/config.json.',
    unsaved: 'Alterações não salvas',
    nothingToSave: 'Nada mudou.',
    conflict: 'O menu deste módulo mudou no l5/config.json depois que foi carregado. Nada foi gravado: recarregue para editar a versão atual.',
    refused: {
      'empty-label': 'O rótulo não pode ficar vazio.',
      'last-actor': 'Uma página precisa de pelo menos um papel: sem nenhum, o app mostra para todos.',
      'actor-does-not-see': 'Esse papel não vê esta página.',
      'not-in-menu': 'Esta página não está no menu.',
      'already-in-menu': 'Esta página já está no menu.',
      'no-page': 'Esta página não tem rota.',
      'unknown-icon': 'Esse não é um nome de ícone Lucide.',
      'unsafe-svg': 'SVG recusado: precisa ser um <svg> com viewBox, só currentColor, nada que execute.',
    } as Record<string, string>,
  },
};
/// **collab_i18n_end**

export const pluginData: mls.plugin.IPluginData = {
  title: 'Menu',
  getSvg(): TemplateResult {
    return svg`
      <svg height="22px" width="22px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 6.5h16M4 12h16M4 17.5h10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
    `;
  },
};

/** Every control of a menu row is 32px tall, so the row reads as one line (h-8). */
const INPUT = 'w-full h-8 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900'
  + ' px-2 py-1 text-sm';
/**
 * The description: ONE whole line at rest (30px inside the border = 20px line + 5px + 5px, so no sliver
 * of the second line shows), three lines while it has the focus.
 */
const DESCRIPTION = 'block w-full h-8 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900'
  + ' px-2 py-[5px] text-sm leading-5 resize-none overflow-hidden focus:h-[4.75rem] focus:overflow-auto';
/** The first line of a table cell: as tall as the controls, content centered on it. */
const LINE = 'flex items-center gap-1 h-8';
const BUTTON = 'rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm'
  + ' hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50';
const BUTTON_PRIMARY = 'rounded-md bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-sm text-white'
  + ' disabled:opacity-50';
const ICON_BUTTON = 'inline-flex items-center justify-center w-7 h-8 rounded border border-gray-300 dark:border-gray-700'
  + ' text-xs hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30';
const CARD = 'rounded-lg border border-gray-200 dark:border-gray-800 p-3 flex flex-col gap-2';

@customElement('aura--plugins--plugin-menu-editor-102020')
export class PluginMenuEditor extends PluginBaseModule {

  @property({ type: Boolean }) autoPrepare = false;
  @property({ type: String }) msize = '';
  /** Project whose `l5/config.json` is edited; `mls.actualProject` is only the fallback. */
  @property({ type: Number }) project = 0;
  /** The module whose menu is edited (`projects[<project>].modules[moduleId]`). */
  @property({ attribute: false }) moduleId = '';

  @state() private _projectId = 0;
  /** The entry as read from the config: what Discard returns to and what Save compares against. */
  @state() private _original?: ModuleEntry;
  /** The entry being edited. */
  @state() private _entry?: ModuleEntry;
  @state() private _loading = false;
  @state() private _busy = false;
  @state() private _error = '';
  @state() private _notice = '';
  @state() private _conflict = false;
  @state() private _previewActor = '';
  /** Lucide drawings, loaded on prepare; until then the icon cells show their name only. */
  @state() private _artwork?: LucideArtwork;
  /** Menu row whose icon picker is open ('' = none). */
  @state() private _iconFor = '';
  /** Row being dragged in the menu table. */
  private _dragging = '';

  private msg: MessageType = message_en;

  createRenderRoot() {
    return this;
  }

  firstUpdated() {
    if (this.autoPrepare) void this.prepare();
  }

  /** The selectModule section reuses this element when another module is picked: load that one. */
  willUpdate(changed: Map<string, unknown>) {
    if (!this._projectId) return;
    if (!changed.has('project') && !changed.has('moduleId')) return;
    void this.prepare();
  }

  async prepare(): Promise<void> {
    this.msg = messages[this.getMessageKey(messages)] ?? message_en;
    this._projectId = Number(this.project) || mls.actualProject || 0;
    if (!this._projectId) return;
    if (!this._artwork) {
      loadMenuIconArtwork()
        .then(artwork => { this._artwork = artwork; })
        .catch((error: unknown) => { console.error('[pluginMenuEditor] failed to load the Lucide icons:', error); });
    }
    await ensureProjectLoaded(this._projectId);
    await this._reload();
  }

  private async _reload(): Promise<void> {
    this._loading = true;
    this._error = '';
    this._notice = '';
    this._conflict = false;
    this._iconFor = '';
    try {
      const entry = findModuleEntry(await readConfig(this._projectId), this._projectId, this.moduleId);
      this._original = entry;
      this._entry = entry;
      const actors = entry ? readModuleMenu(entry).actors : [];
      if (!actors.includes(this._previewActor)) this._previewActor = actors[0] ?? '';
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
      this._original = undefined;
      this._entry = undefined;
    } finally {
      this._loading = false;
    }
  }

  private get _dirty(): boolean {
    return moduleMenuFingerprint(this._entry) !== moduleMenuFingerprint(this._original);
  }

  /** Takes an edit of menuConfigCore: applied, or refused with the reason on screen. */
  private _apply(result: MenuEditResult): void {
    this._notice = '';
    if (result.refused) {
      this._error = this.msg.refused[result.refused] ?? result.refused;
      this.requestUpdate();
      return;
    }
    this._error = '';
    this._entry = result.entry;
  }

  private _edit(edit: (entry: ModuleEntry) => MenuEditResult): void {
    if (this._entry) this._apply(edit(this._entry));
  }

  private _fixAll(issues: MenuIssue[]): void {
    let entry = this._entry;
    if (!entry) return;
    for (const issue of issues) entry = fixMenuIssue(entry, issue).entry;
    this._apply({ entry });
  }

  private async _save(): Promise<void> {
    if (!this._entry || this._busy) return;
    if (!this._dirty) {
      this._notice = this.msg.nothingToSave;
      return;
    }
    this._busy = true;
    this._error = '';
    this._notice = '';
    try {
      // Read again: the file may have changed under the editor (another module, the header, a run).
      const fresh = await readConfig(this._projectId);
      const current = findModuleEntry(fresh, this._projectId, this.moduleId);
      if (moduleMenuFingerprint(current) !== moduleMenuFingerprint(this._original)) {
        this._conflict = true;
        this._error = this.msg.conflict;
        return;
      }
      await writeConfig(this._projectId, replaceModuleMenu(fresh, this._projectId, this.moduleId, this._entry));
      this._original = this._entry;
      this._notice = this.msg.saved;
      notifyMenuChanged();
      this.dispatchEvent(new CustomEvent('menu-saved', { detail: { moduleId: this.moduleId }, bubbles: true, composed: true }));
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
    } finally {
      this._busy = false;
    }
  }

  private _pickIcon(pageId: string, choice: MenuIconChoice): void {
    this._edit(entry => choice.kind === 'svg'
      ? setMenuIconSvg(entry, pageId, choice.markup)
      : setMenuIcon(entry, pageId, choice.kind === 'lucide' ? choice.name : ''));
    this._iconFor = '';
  }

  /**
   * Runs agentGenerateMenuIcon for the open row and returns its drawings. The agent leaves them as a
   * one-shot draft in the Studio document (by requestId); it is read here and cleared. A stable arrow
   * function: a new function per render would re-render the picker for nothing.
   */
  private readonly _generateIcons = async (brief: string): Promise<MenuIconCandidate[]> => {
    const row = this._entry ? readModuleMenu(this._entry).rows.find(item => item.pageId === this._iconFor) : undefined;
    const requestId = `menu-icon-${Date.now().toString(36)}`;
    let thread = await getThreadByName(THREAD_NAME);
    if (!thread) thread = await createThread(THREAD_NAME, [], 'company');
    const userId = getUserId();
    if (!thread?.threadId || !userId) throw new Error('no user/thread for the agent run');
    const agent = await loadAgent('_102020_/l2/aura/agentManageMenu/agentGenerateMenuIcon');
    if (!agent) throw new Error('agent agentGenerateMenuIcon not found');
    const prompt = JSON.stringify({
      projectId: this._projectId,
      moduleId: this.moduleId,
      pageId: row?.pageId,
      label: row?.label,
      description: row?.description || undefined,
      brief: brief || undefined,
      requestId,
    });
    for await (const _event of executeBeforePromptStream(agent, getTemporaryContext(thread.threadId, userId, prompt))) {
      // consume the whole lifecycle; the drawings land on the project config as a draft
    }
    const projectConfig = await getConfigProject(this._projectId);
    const icons = readMenuIconDraft(projectConfig, requestId);
    if (!icons) throw new Error(this.msg.iconNoDraft);
    await updateConfigProject(this._projectId, clearMenuIconDraft(projectConfig) as any);
    return icons;
  };

  // ── focus mode: while a row's icon picker is open, the rest of the editor steps back ──────────────

  /** Classes of a part of the screen that is not the row being edited (empty when no picker is open). */
  private _dimFor(pageId?: string): string {
    if (!this._iconFor || pageId === this._iconFor) return 'transition-opacity';
    return 'opacity-[.35] transition-opacity';
  }

  /** Background that ties the edited row and its picker together. */
  private _focusBg(pageId: string): string {
    return this._iconFor === pageId ? 'bg-indigo-50/70 dark:bg-indigo-950/30' : '';
  }

  /**
   * Click guard (capture) on every dimmed part: a click there only leaves focus mode — or, on another
   * row's icon button, moves the picker to that row. It never reaches the control under it.
   */
  private readonly _focusGuard = {
    capture: true,
    handleEvent: (event: Event) => {
      if (!this._iconFor) return;
      if ((event.currentTarget as HTMLElement).dataset.page === this._iconFor) return;
      event.preventDefault();
      event.stopPropagation();
      this._iconFor = (event.target as HTMLElement).closest<HTMLElement>('[data-icon-for]')?.dataset.iconFor ?? '';
    },
  };

  /** The icon cell of a row: own SVG, else Lucide, else "+"; it opens the picker under the row. */
  private _renderIconButton(row: { pageId: string; label: string; icon: string; iconSvg: string }): TemplateResult {
    const has = Boolean(row.icon || row.iconSvg);
    const drawing = row.iconSvg
      ? renderMenuIconSvg(row.iconSvg)
      : row.icon && this._artwork?.(row.icon)
        ? renderMenuIcon(row.icon, this._artwork)
        : row.icon ? html`<span class="text-[9px] leading-none break-all">${row.icon}</span>` : html`<span aria-hidden="true">+</span>`;
    const name = row.iconSvg ? this.msg.ownSvg : row.icon;
    return html`
      <button type="button" title=${name ? `${this.msg.chooseIcon}: ${name}` : this.msg.chooseIcon}
        aria-label=${`${row.label}: ${this.msg.chooseIcon}`} aria-expanded=${this._iconFor === row.pageId}
        data-icon-for=${row.pageId}
        class=${`inline-flex items-center justify-center w-8 h-8 rounded-md border text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 ${
          this._iconFor === row.pageId ? 'border-2 border-indigo-500'
            : has ? 'border-gray-300 dark:border-gray-700' : 'border-dashed border-gray-300 dark:border-gray-600 text-gray-400'}`}
        @click=${() => { this._iconFor = this._iconFor === row.pageId ? '' : row.pageId; }}>
        ${drawing}
      </button>
    `;
  }

  /** Cached per language: a new object every render would re-render the picker for nothing. */
  private _iconLabelsCache?: { msg: MessageType; labels: MenuIconPickerLabels };
  private _iconLabels(): MenuIconPickerLabels {
    if (this._iconLabelsCache?.msg !== this.msg) {
      const msg = this.msg;
      this._iconLabelsCache = {
        msg,
        labels: {
          library: msg.iconLibrary,
          paste: msg.iconPaste,
          generate: msg.iconGenerate,
          search: msg.iconSearch,
          noIcon: msg.noIcon,
          results: msg.iconResults,
          more: msg.iconMore,
          close: msg.iconClose,
          file: msg.iconFile,
          pastePlaceholder: msg.iconPastePlaceholder,
          valid: msg.iconValid,
          use: msg.iconUse,
          brief: msg.iconBrief,
          generateButton: msg.iconGenerateButton,
          generating: msg.iconGenerating,
          regenerate: msg.iconRegenerate,
          useOption: msg.iconUseOption,
          light: msg.iconLight,
          dark: msg.iconDark,
          fileError: msg.iconFileError,
        },
      };
    }
    return this._iconLabelsCache.labels;
  }

  private _discard(): void {
    this._iconFor = '';
    this._entry = this._original;
    this._error = '';
    this._notice = '';
  }

  // ── drag to reorder ───────────────────────────────────────────────────────

  private _onDrop(event: DragEvent, targetIndex: number): void {
    event.preventDefault();
    const pageId = this._dragging;
    this._dragging = '';
    if (pageId) this._edit(entry => moveMenuItem(entry, pageId, targetIndex));
  }

  // ── rendering ─────────────────────────────────────────────────────────────

  private _renderIssues(issues: MenuIssue[]): TemplateResult | typeof nothing {
    if (!issues.length) return nothing;
    return html`
      <div class="rounded-md border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-2.5 flex flex-col gap-1.5">
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-amber-800 dark:text-amber-300">${this.msg.issues} (${issues.length})</span>
          <button type="button" class="ml-auto text-xs underline text-amber-800 dark:text-amber-300" @click=${() => this._fixAll(issues)}>
            ${this.msg.fixAll}
          </button>
        </div>
        ${issues.map(issue => html`
          <div class="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200">
            <span>${this.msg.issue[issue.code] ?? issue.code}:</span>
            <span class="font-mono">${issue.pageId}${issue.actorId ? ` (${issue.actorId})` : ''}</span>
            <button type="button" class="ml-auto underline" @click=${() => this._edit(entry => fixMenuIssue(entry, issue))}>${this.msg.fix}</button>
          </div>
        `)}
      </div>
    `;
  }

  private _renderMenuTable(): TemplateResult {
    const view = readModuleMenu(this._entry!);
    const last = view.rows.length - 1;
    return html`
      <div class=${CARD}>
        <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">${this.msg.menu}</span>
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class=${`text-left text-xs text-gray-500 dark:text-gray-400 ${this._dimFor()}`}>
                <th class="w-16"></th>
                <th class="px-1 py-1 font-medium" title=${this.msg.iconHint}>${this.msg.icon}</th>
                <th class="px-1 py-1 font-medium">${this.msg.label}</th>
                <th class="px-1 py-1 font-medium">${this.msg.description}</th>
                ${view.actors.map(actor => html`<th class="px-1 py-1 font-medium text-center whitespace-nowrap" title=${this.msg.roles}>${actor}</th>`)}
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${view.rows.map((row, index) => html`
                <tr class=${`border-t border-gray-100 dark:border-gray-800 align-top ${this._dimFor(row.pageId)} ${this._focusBg(row.pageId)}`}
                  data-page=${row.pageId}
                  @click=${this._focusGuard}
                  draggable="true"
                  @dragstart=${() => { this._dragging = row.pageId; }}
                  @dragover=${(event: DragEvent) => event.preventDefault()}
                  @drop=${(event: DragEvent) => this._onDrop(event, index)}>
                  <td class="py-2 pr-1 cursor-move">
                    <div class=${LINE}>
                      <span class="text-gray-400 select-none" aria-hidden="true">⋮⋮</span>
                      <button type="button" class=${ICON_BUTTON} title=${this.msg.up} aria-label=${this.msg.up} ?disabled=${index === 0}
                        @click=${() => this._edit(entry => moveMenuItem(entry, row.pageId, index - 1))}>↑</button>
                      <button type="button" class=${ICON_BUTTON} title=${this.msg.down} aria-label=${this.msg.down} ?disabled=${index === last}
                        @click=${() => this._edit(entry => moveMenuItem(entry, row.pageId, index + 1))}>↓</button>
                    </div>
                  </td>
                  <td class="px-1 py-2">
                    <div class=${LINE}>${this._renderIconButton(row)}</div>
                  </td>
                  <td class="px-1 py-2 min-w-[10rem]">
                    <input class=${INPUT} .value=${row.label}
                      @change=${(event: Event) => this._edit(entry => setMenuLabel(entry, row.pageId, (event.target as HTMLInputElement).value))}>
                    <span class="block mt-0.5 text-[11px] font-mono text-gray-400 dark:text-gray-500">${row.route}</span>
                  </td>
                  <td class="px-1 py-2 min-w-[14rem]">
                    <textarea class=${DESCRIPTION} rows="1" .value=${row.description}
                      @change=${(event: Event) => this._edit(entry => setMenuDescription(entry, row.pageId, (event.target as HTMLTextAreaElement).value))}></textarea>
                  </td>
                  ${view.actors.map(actor => html`
                    <td class="px-1 py-2 text-center">
                      <div class=${`${LINE} justify-center`}>
                        <input type="checkbox" .checked=${row.actors.includes(actor)} aria-label=${`${row.label}: ${actor}`}
                          @change=${(event: Event) => this._edit(entry => setMenuActor(entry, row.pageId, actor, (event.target as HTMLInputElement).checked))}>
                      </div>
                      ${row.landingOf.includes(actor) ? html`<div class="text-[10px] text-indigo-600 dark:text-indigo-300">${this.msg.start}</div>` : nothing}
                    </td>
                  `)}
                  <td class="px-1 py-2">
                    <div class=${`${LINE} justify-end`}>
                      <button type="button" class="text-xs underline text-gray-600 dark:text-gray-300 whitespace-nowrap"
                        @click=${() => this._edit(entry => hideFromMenu(entry, row.pageId))}>${this.msg.hide}</button>
                    </div>
                  </td>
                </tr>
                ${this._iconFor === row.pageId ? html`
                  <tr class=${this._focusBg(row.pageId)}>
                    <td colspan=${5 + view.actors.length} class="px-1.5 pb-2.5">
                      <aura--plugins--menu-icon-picker-102020
                        .value=${row.icon}
                        .valueSvg=${row.iconSvg}
                        .artwork=${this._artwork}
                        .labels=${this._iconLabels()}
                        .suggestion=${[row.label, row.description].filter(Boolean).join(' — ')}
                        .generate=${this._generateIcons}
                        @menu-icon-selected=${(event: CustomEvent<MenuIconChoice>) => this._pickIcon(row.pageId, event.detail)}
                        @menu-icon-close=${() => { this._iconFor = ''; }}>
                      </aura--plugins--menu-icon-picker-102020>
                    </td>
                  </tr>
                ` : nothing}
              `)}
            </tbody>
          </table>
        </div>
      </div>
      <div class=${`${CARD} ${this._dimFor()}`} @click=${this._focusGuard}>
        <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">${this.msg.hidden}</span>
        ${view.hidden.length ? view.hidden.map(page => html`
          <div class="flex items-center gap-2 text-sm">
            <span>${page.title}</span>
            <span class="text-[11px] font-mono text-gray-400 dark:text-gray-500">${page.route}</span>
            <button type="button" class="ml-auto text-xs underline text-gray-600 dark:text-gray-300"
              @click=${() => this._edit(entry => showInMenu(entry, page.pageId))}>${this.msg.show}</button>
          </div>
        `) : html`<span class="text-xs italic text-gray-400 dark:text-gray-500">${this.msg.noHidden}</span>`}
      </div>
    `;
  }

  private _renderStartPages(): TemplateResult {
    const entry = this._entry!;
    const view = readModuleMenu(entry);
    const routed = [...view.rows.map(row => ({ pageId: row.pageId, title: row.label })), ...view.hidden];
    const landingOf = (actor: string) => view.rows.find(row => row.landingOf.includes(actor))?.pageId ?? '';
    return html`
      <div class=${CARD}>
        <label class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">${this.msg.home.replace('{module}', this.moduleId)}</span>
          <select class=${INPUT} @change=${(event: Event) => this._edit(current => setHomePage(current, (event.target as HTMLSelectElement).value))}>
            ${routed.map(page => html`<option value=${page.pageId} ?selected=${page.pageId === view.homePageId}>${page.title}</option>`)}
          </select>
          <span class="text-[11px] text-gray-500 dark:text-gray-400">${this.msg.homeHint}</span>
        </label>
      </div>
      <div class=${CARD}>
        <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">${this.msg.landings}</span>
        <span class="text-[11px] text-amber-700 dark:text-amber-300">${this.msg.landingsHint}</span>
        ${view.actors.map(actor => html`
          <label class="flex items-center gap-2 text-sm">
            <span class="w-40 shrink-0 truncate">${actor}</span>
            <select class=${INPUT} @change=${(event: Event) => {
              const value = (event.target as HTMLSelectElement).value;
              this._edit(current => setLanding(current, actor, value || null));
            }}>
              <option value="" ?selected=${!landingOf(actor)}>${this.msg.noLanding}</option>
              ${view.rows.filter(row => row.actors.length === 0 || row.actors.includes(actor)).map(row => html`
                <option value=${row.pageId} ?selected=${row.pageId === landingOf(actor)}>${row.label}</option>
              `)}
            </select>
          </label>
        `)}
      </div>
    `;
  }

  private _renderPreview(): TemplateResult | typeof nothing {
    const view = readModuleMenu(this._entry!);
    if (!view.actors.length) return nothing;
    const items = previewForActor(this._entry!, this.moduleId, this._previewActor);
    return html`
      <div class=${CARD}>
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">${this.msg.preview}</span>
          <select class="ml-auto rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-0.5 text-sm"
            @change=${(event: Event) => { this._previewActor = (event.target as HTMLSelectElement).value; }}>
            ${view.actors.map(actor => html`<option value=${actor} ?selected=${actor === this._previewActor}>${actor}</option>`)}
          </select>
        </div>
        <ul class="flex flex-col gap-0.5 text-sm">
          ${items.map(item => html`
            <li class="flex items-center gap-2 px-2 py-1 rounded bg-gray-50 dark:bg-gray-900/50">
              <span class="inline-flex w-[18px] justify-center text-gray-500 dark:text-gray-400">${item.iconSvg ? renderMenuIconSvg(item.iconSvg) : renderMenuIcon(item.icon, this._artwork)}</span>
              <span>${item.label}</span>
              ${item.landing ? html`<span class="text-[10px] text-indigo-600 dark:text-indigo-300">${this.msg.start}</span>` : nothing}
            </li>
          `)}
        </ul>
      </div>
    `;
  }

  private _renderActionBar(): TemplateResult {
    return html`
      <div class="sticky bottom-0 flex flex-col gap-2 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 pt-2">
        ${this._error ? html`
          <p class="rounded-md border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-2.5 py-1.5 text-sm text-red-700 dark:text-red-300">
            ${this._error}
          </p>` : nothing}
        ${this._notice ? html`<p class="text-sm text-emerald-700 dark:text-emerald-300">${this._notice}</p>` : nothing}
        <div class="flex items-center gap-3 flex-wrap">
          ${this._conflict ? html`
            <button type="button" class=${BUTTON_PRIMARY} ?disabled=${this._busy} @click=${() => void this._reload()}>${this.msg.reload}</button>
          ` : html`
            <button type="button" class=${BUTTON_PRIMARY} ?disabled=${this._busy || !this._dirty} @click=${() => void this._save()}>${this.msg.save}</button>
            <button type="button" class=${BUTTON} ?disabled=${this._busy || !this._dirty} @click=${() => this._discard()}>${this.msg.discard}</button>
          `}
          ${this._dirty ? html`<span class="ml-auto text-xs text-amber-700 dark:text-amber-300">${this.msg.unsaved}</span>` : nothing}
        </div>
      </div>
    `;
  }

  render(): TemplateResult {
    this.msg = messages[this.getMessageKey(messages)] ?? message_en;
    if (!this._projectId) {
      return html`<p class="text-sm italic p-3 bg-white dark:bg-gray-950 text-gray-500 dark:text-gray-400">${this.msg.noProject}</p>`;
    }
    const header = html`
      <div class="flex items-center gap-2 flex-wrap">
        <span class="w-5 h-5 text-gray-500 dark:text-gray-400">${pluginData.getSvg()}</span>
        <h2 class="text-sm font-semibold">${this.msg.title}</h2>
        <span class="text-sm text-gray-500 dark:text-gray-400">${this.moduleId}</span>
        <span class="ml-auto text-xs font-mono text-gray-400 dark:text-gray-500">#${this._projectId}</span>
      </div>
    `;
    let body: TemplateResult;
    if (this._loading && !this._entry) body = html`<p class="text-sm italic text-gray-500 dark:text-gray-400">${this.msg.loading}</p>`;
    else if (!this._entry) body = html`<p class="text-sm italic text-gray-500 dark:text-gray-400">${this._error || this.msg.noModule}</p>`;
    else body = html`
      ${readModuleMenu(this._entry).issues.length
        ? html`<div class=${this._dimFor()} @click=${this._focusGuard}>${this._renderIssues(readModuleMenu(this._entry).issues)}</div>`
        : nothing}
      ${this._renderMenuTable()}
      <div class=${`flex flex-col gap-3 ${this._dimFor()}`} @click=${this._focusGuard}>
        ${this._renderStartPages()}
        ${this._renderPreview()}
      </div>
      ${this._renderActionBar()}
    `;
    // Opaque background of its own: the details panel stays light while `.dark` is on (see the header editor).
    return html`<div class="flex flex-col gap-3 p-3 min-h-full bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-100">${header}${body}</div>`;
  }
}
