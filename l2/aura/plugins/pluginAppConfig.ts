/// <mls fileReference="_102020_/l2/aura/plugins/pluginAppConfig.ts" enhancement="_102027_/l2/enhancementLit" />

// App Config: the `l5/config.json` of a project, edited one thing at a time. Registered in the Details
// category of the L6 project panel (selectProject), which opens it in the RIGHT-HAND DETAILS panel with
// `project` set; the modules dashboard opens it on a field (`focusPath`).
//
// The screen: a short list on the left (the app shell, each module, then "Advanced") and, on the right,
// the one item picked. A module is not shown as its JSON tree: its pages and menu are one list (title,
// route, roles, in the menu or not, home page), the start page is picked per role, and the generated or
// technical keys wait in a closed "technical details". The menu edits go through menuConfigCore, so the
// copies of a page (menu item, route, start pages) change together instead of drifting apart.
//
// Every rule lives in pure, tested cores: `helpers/appConfigSections.ts` (schema, names, owners, where
// a path is shown, edits, validation, change list, rebase) and `plugins/helpers/menuConfigCore.ts` (the
// menu). This file is DOM + I/O only.
//
// The edit goes to the stor file only (configIo.writeConfig → localStor.setContent), like any file
// edited in the studio: the draft saves it and the publish ships it. Saving re-reads the file and
// rebases the edit on top of it, so a change made meanwhile (an agent, the header or menu editor) is
// kept; when the same place changed on both sides nothing is written and the screen offers a reload.

import { html, nothing, svg, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { PluginBaseModule } from '/_102027_/l2/pluginBaseModule.js';
import { ensureProjectLoaded, readConfig, storValidationEnv, writeConfig } from '/_102020_/l2/aura/plugins/helpers/configIo.js';
import {
  fixMenuIssue,
  hideFromMenu,
  moveMenuItem,
  readModuleMenu,
  setHomePage,
  setLanding,
  setMenuActor,
  setMenuLabel,
  setPageRoute,
  showInMenu,
  type MenuEditResult,
  type ModuleEntry,
} from '/_102020_/l2/aura/plugins/helpers/menuConfigCore.js';
import {
  appendAt,
  buildSections,
  clientKey,
  describePath,
  diffConfig,
  emptyValue,
  getAt,
  isAppConfig,
  isObject,
  labelOf,
  missingFields,
  MODULE_SPEC,
  MODULES_LIST,
  moveAt,
  newErrors,
  pathKey,
  rebaseConfig,
  removeAt,
  renameKeyAt,
  setAt,
  shownElsewhere,
  unknownKeys,
  validateConfig,
  viewOfPath,
  type Help,
  type Issue,
  type Json,
  type ListSpec,
  type MapSpec,
  type ObjectSpec,
  type Owner,
  type Path,
  type Section,
  type Spec,
  type ValidationEnv,
} from '/_102020_/l2/aura/helpers/appConfigSections.js';

/// **collab_i18n_start**
const message_en = {
  title: 'App Config',
  noProject: 'Select a project first.',
  loading: 'Loading…',
  reload: 'Reload',
  copy: 'Copy',
  copied: 'Copied.',
  notApp: 'This config.json does not describe an app (no `projects`): only the keys it has are shown.',
  // navigation
  checks: 'Checks',
  noChecks: 'No problem found.',
  app: 'App',
  modules: 'Modules',
  addModule: '+ module',
  advanced: 'Advanced',
  json: 'JSON',
  // module screen
  pagesTitle: 'Pages and menu',
  pagesHelp: 'In menu order. The title is also the menu label.',
  inMenu: 'In menu',
  outOfMenu: 'out of the menu',
  home: 'Module address',
  homeHint: (basePath: string) => `This page also opens at ${basePath || 'the module address'}.`,
  makeHome: 'Make this page answer the module address',
  everybody: 'everybody',
  route: 'Route',
  pageTitle: 'Title',
  technical: 'Technical details',
  removePage: 'Remove page',
  addPage: '+ page',
  landingsTitle: 'Start page per role',
  landingsHelp: 'What each role sees first.',
  none: '(none)',
  noRoles: 'No role is set on the pages of this module.',
  headerLinksTitle: 'Header links',
  generalTitle: 'General',
  moduleIssues: 'To review in this module',
  // generic editor
  fix: 'Fix',
  fixAll: 'Fix all',
  goTo: 'go',
  add: 'Add',
  addField: '+ field',
  addKey: 'New key',
  remove: 'Remove',
  rename: 'Rename',
  up: 'Move up',
  down: 'Move down',
  empty: '(empty)',
  unknownKey: 'unknown key, edited as JSON',
  seeSection: 'edited in Modules',
  badJson: 'Invalid JSON',
  applyJson: 'Use this JSON',
  locked: 'Rewritten automatically',
  // save
  changes: (n: number) => `${n} ${n === 1 ? 'change' : 'changes'}`,
  showChanges: 'see',
  hideChanges: 'hide',
  save: 'Save',
  discard: 'Discard',
  removed: '(removed)',
  added: '(new)',
  applied: 'Saved to l5/config.json in the studio. The draft saves it; the publish ships it.',
  blocked: 'Fix the errors this edit introduced before saving.',
  conflict: 'These places changed in l5/config.json since it was loaded. Nothing was written: reload to edit the current version.',
  preexisting: 'already in the file',
  refused: {
    'last-actor': 'A page needs at least one role (an empty list means everybody).',
    'bad-route': 'A route starts with /.',
    'empty-label': 'The title cannot be empty.',
    'actor-does-not-see': 'This role does not see that page in the menu.',
    'not-in-menu': 'The page is not in the menu.',
    'no-page': 'Give the page an id first (technical details).',
  } as Record<string, string>,
  ownerHint: {
    generated: 'Written by a generation run: the next run keeps what is here and only appends.',
    regenerated: 'Rewritten by a run or by the publish: an edit here lasts until then.',
    customizable: 'customize.* in l5/project.json wins over this value.',
    free: 'Nobody rewrites it.',
  } as Record<Owner, string>,
  issue: {
    required: 'Required',
    'wrong-type': 'Wrong type',
    'bad-option': 'Value not allowed',
    'duplicate-key': 'Repeated',
    'empty-key': 'Empty key',
    'bad-basePath': 'Must start with / and not end with /',
    'bad-route': 'Must start with /',
    'bad-projectId': 'Must be a project number',
    'bad-settingsUrl': 'Needs at least 3 segments (…/branch/owner/repo)',
    'bad-favicon': 'Must be a same-origin path (/…)',
    'duplicate-route': 'Route used by another page',
    'route-outside-module': 'Route outside the module base address',
    'unknown-profile': 'Profile does not exist in profiles',
    'missing-file': 'File not found in the project',
    'missing-dir': 'Folder not found in the project',
    'orphan-page': 'Page file without a route',
    menu: 'Menu',
  } as Record<string, string>,
  menuIssue: {
    'nav-without-page': 'menu item without a page',
    'title-differs': 'page title differs from the menu label',
    'href-differs': 'menu link differs from the page route',
    'actors-differ': 'roles of the menu item differ from the page',
    'landing-orphan': 'start page of a role that does not see it',
    'landing-flag-differs': 'start-page mark out of date',
    'unknown-icon': 'unknown icon',
    'unsafe-icon-svg': 'icon SVG not allowed',
    'icon-and-svg': 'two icons on the same item',
  } as Record<string, string>,
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
  en: message_en,
  pt: {
    title: 'App Config',
    noProject: 'Selecione um projeto primeiro.',
    loading: 'Carregando…',
    reload: 'Recarregar',
    copy: 'Copiar',
    copied: 'Copiado.',
    notApp: 'Este config.json não descreve um app (sem `projects`): aparecem só as chaves que ele tem.',
    checks: 'Verificações',
    noChecks: 'Nenhum problema encontrado.',
    app: 'App',
    modules: 'Módulos',
    addModule: '+ módulo',
    advanced: 'Avançado',
    json: 'JSON',
    pagesTitle: 'Páginas e menu',
    pagesHelp: 'Na ordem do menu. O título também é o rótulo do menu.',
    inMenu: 'No menu',
    outOfMenu: 'fora do menu',
    home: 'Endereço do módulo',
    homeHint: (basePath: string) => `Esta página também abre em ${basePath || 'endereço do módulo'}.`,
    makeHome: 'Fazer esta página abrir no endereço do módulo',
    everybody: 'todos',
    route: 'Rota',
    pageTitle: 'Título',
    technical: 'Detalhes técnicos',
    removePage: 'Remover página',
    addPage: '+ página',
    landingsTitle: 'Página inicial por papel',
    landingsHelp: 'O que cada papel vê primeiro.',
    none: '(nenhuma)',
    noRoles: 'Nenhum papel definido nas páginas deste módulo.',
    headerLinksTitle: 'Links do cabeçalho',
    generalTitle: 'Geral',
    moduleIssues: 'Para revisar neste módulo',
    fix: 'Corrigir',
    fixAll: 'Corrigir todos',
    goTo: 'ir',
    add: 'Adicionar',
    addField: '+ campo',
    addKey: 'Nova chave',
    remove: 'Remover',
    rename: 'Renomear',
    up: 'Subir',
    down: 'Descer',
    empty: '(vazio)',
    unknownKey: 'chave desconhecida, editada como JSON',
    seeSection: 'editado em Módulos',
    badJson: 'JSON inválido',
    applyJson: 'Usar este JSON',
    locked: 'Reescrito automaticamente',
    changes: (n: number) => `${n} ${n === 1 ? 'alteração' : 'alterações'}`,
    showChanges: 'ver',
    hideChanges: 'ocultar',
    save: 'Salvar',
    discard: 'Descartar',
    removed: '(removido)',
    added: '(novo)',
    applied: 'Salvo no l5/config.json do estúdio. O draft salva; o publish leva para o app.',
    blocked: 'Corrija os erros que esta edição criou antes de salvar.',
    conflict: 'Estes pontos mudaram no l5/config.json depois que ele foi carregado. Nada foi gravado: recarregue para editar a versão atual.',
    preexisting: 'já estava no arquivo',
    refused: {
      'last-actor': 'Uma página precisa de pelo menos um papel (lista vazia quer dizer todos).',
      'bad-route': 'A rota começa com /.',
      'empty-label': 'O título não pode ficar vazio.',
      'actor-does-not-see': 'Esse papel não vê essa página no menu.',
      'not-in-menu': 'A página não está no menu.',
      'no-page': 'Dê um id à página primeiro (detalhes técnicos).',
    } as Record<string, string>,
    ownerHint: {
      generated: 'Escrito por uma geração: a próxima mantém o que está aqui e só acrescenta.',
      regenerated: 'Reescrito por uma geração ou pelo publish: a edição vale até lá.',
      customizable: 'O customize.* do l5/project.json tem prioridade sobre este valor.',
      free: 'Ninguém reescreve.',
    } as Record<Owner, string>,
    issue: {
      required: 'Obrigatório',
      'wrong-type': 'Tipo errado',
      'bad-option': 'Valor não permitido',
      'duplicate-key': 'Repetido',
      'empty-key': 'Chave vazia',
      'bad-basePath': 'Deve começar com / e não terminar com /',
      'bad-route': 'Deve começar com /',
      'bad-projectId': 'Deve ser um número de projeto',
      'bad-settingsUrl': 'Precisa de pelo menos 3 segmentos (…/branch/dono/repositório)',
      'bad-favicon': 'Deve ser um caminho da mesma origem (/…)',
      'duplicate-route': 'Rota usada por outra página',
      'route-outside-module': 'Rota fora do endereço base do módulo',
      'unknown-profile': 'Perfil não existe em profiles',
      'missing-file': 'Arquivo não encontrado no projeto',
      'missing-dir': 'Pasta não encontrada no projeto',
      'orphan-page': 'Arquivo de página sem rota',
      menu: 'Menu',
    } as Record<string, string>,
    menuIssue: {
      'nav-without-page': 'item do menu sem página',
      'title-differs': 'título da página diferente do rótulo do menu',
      'href-differs': 'link do menu diferente da rota da página',
      'actors-differ': 'papéis do item do menu diferentes dos da página',
      'landing-orphan': 'página inicial de um papel que não a vê',
      'landing-flag-differs': 'marca de página inicial desatualizada',
      'unknown-icon': 'ícone desconhecido',
      'unsafe-icon-svg': 'SVG do ícone não permitido',
      'icon-and-svg': 'dois ícones no mesmo item',
    } as Record<string, string>,
  },
};
/// **collab_i18n_end**

export const pluginData: mls.plugin.IPluginData = {
  title: 'App Config',
  getSvg(): TemplateResult {
    return svg`
      <svg height="22px" width="22px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 4.5h9l5 5V19.5H5z M14 4.5v5h5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M8 13h8M8 16h5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    `;
  },
};

const INPUT = 'w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500';
const INPUT_ERROR = 'w-full rounded-md border border-red-400 dark:border-red-700 bg-white dark:bg-gray-900 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-red-500';
const BUTTON = 'rounded-md border border-gray-200 dark:border-gray-700 px-3 py-1 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50';
const BUTTON_PRIMARY = 'rounded-md bg-indigo-600 hover:bg-indigo-500 px-3 py-1 text-xs font-medium text-white disabled:opacity-50';
const ICON_BUTTON = 'inline-flex items-center justify-center w-5 h-5 rounded text-[11px] text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent';
const LINK = 'text-xs text-indigo-600 dark:text-indigo-400 hover:underline';
const CARD = 'rounded-lg border border-gray-200 dark:border-gray-800';
const CARD_TITLE = 'text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400';
const LABEL = 'text-xs text-gray-600 dark:text-gray-300';

/** Module fields shown in the module screen's own cards; the rest go to "technical details". */
const MODULE_GENERAL = ['moduleId', 'basePath', 'shellMode', 'userLanguage', 'languages', 'designSystems'];
const MODULE_OWN_CARDS = new Set([...MODULE_GENERAL, 'navigation', 'landings', 'headerLinks', 'frontend']);
/** Page fields edited on the page row; the rest go to the page's technical details. */
const PAGE_ROW = new Set(['title', 'route', 'actors']);

interface INavItem { view: string; label: string; sub?: string }

@customElement('aura--plugins--plugin-app-config-102020')
export class PluginAppConfig extends PluginBaseModule {

  @property({ type: Boolean }) autoPrepare = false;
  @property({ type: String }) msize = '';
  /** Project whose `l5/config.json` is shown (selectProject sets it); `mls.actualProject` is only the fallback. */
  @property({ type: Number }) project = 0;
  /** A config path as JSON (`["projects","102047","modules",3,"navigation"]`): the screen opens on that field. The modules dashboard sets it. */
  @property({ type: String }) focusPath = '';

  @state() private _projectId = 0;
  /** The file as read: what Discard returns to and what Save rebases from. */
  @state() private _original: Json = undefined;
  /** The document being edited. */
  @state() private _working: Json = undefined;
  /** The item picked on the left: `module:<index>`, `shell`, `persistence`, `dependencies`, `project`, `other`, `json`, `checks`. */
  @state() private _view = '';
  @state() private _jsonText = '';
  @state() private _loading = false;
  @state() private _busy = false;
  @state() private _showDiff = false;
  @state() private _error = '';
  @state() private _notice = '';
  @state() private _conflicts: Path[] = [];
  /** Parse errors of the JSON fields, by path (the value stays as it was until it parses). */
  @state() private _jsonFieldErrors: Record<string, string> = {};

  private msg: MessageType = message_en;
  private _env: ValidationEnv = {};
  private _baseline: Issue[] = [];
  private _issuesFor: Json = undefined;
  private _issues: Issue[] = [];
  /** The focus already revealed: a reload must not jump back to it. */
  private _revealedFocus = '';
  /** A path to scroll to after the next render (a check's "go", the dashboard's focus). */
  private _pendingReveal: Path | null = null;

  createRenderRoot() {
    return this;
  }

  firstUpdated() {
    if (this.autoPrepare) void this.prepare();
  }

  willUpdate(changed: Map<string, unknown>) {
    if (this._projectId && changed.has('project') && Number(this.project) !== this._projectId) void this.prepare();
    if (this.focusPath && this.focusPath !== this._revealedFocus && this._working !== undefined && !this._loading) {
      this._revealedFocus = this.focusPath;
      try {
        this._goTo(JSON.parse(this.focusPath) as Path);
      } catch { /* a malformed focus opens the screen as usual */ }
    }
  }

  updated(): void {
    if (!this._pendingReveal) return;
    const path = this._pendingReveal;
    this._pendingReveal = null;
    this._reveal(path);
  }

  /** Opens the item that shows the path, then scrolls to the closest shown parent and marks it. */
  private _goTo(path: Path): void {
    const view = viewOfPath(this._working, this._projectId, path);
    this._view = view === 'checks' ? 'checks' : view;
    this._pendingReveal = path;
  }

  private _reveal(path: Path): void {
    for (let length = path.length; length > 0; length--) {
      const target = this.querySelector<HTMLElement>(`[data-path="${CSS.escape(pathKey(path.slice(0, length)))}"]`);
      if (!target) continue;
      for (let node: HTMLElement | null = target; node && node !== (this as HTMLElement); node = node.parentElement) {
        if (node instanceof HTMLDetailsElement) node.open = true;
      }
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      target.classList.add('ring-2', 'ring-indigo-400');
      setTimeout(() => target.classList.remove('ring-2', 'ring-indigo-400'), 2400);
      return;
    }
  }

  async prepare(): Promise<void> {
    this.msg = messages[this.getMessageKey(messages)] ?? message_en;
    this._projectId = Number(this.project) || mls.actualProject || 0;
    if (!this._projectId) return;
    await ensureProjectLoaded(this._projectId);
    await this._reload();
  }

  private async _reload(): Promise<void> {
    this._loading = true;
    this._error = '';
    this._notice = '';
    this._conflicts = [];
    this._showDiff = false;
    this._jsonFieldErrors = {};
    try {
      const config = await readConfig(this._projectId);
      this._env = storValidationEnv(this._projectId);
      this._original = config;
      this._working = config;
      this._baseline = validateConfig(config, this._projectId, this._env);
      this._jsonText = JSON.stringify(config, null, 2);
      if (!this._navItems().some(item => item.view === this._view)) this._view = this._navItems().find(item => item.view !== 'checks')?.view ?? '';
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
      this._original = undefined;
      this._working = undefined;
    } finally {
      this._loading = false;
    }
  }

  private get _currentIssues(): Issue[] {
    if (this._issuesFor !== this._working) {
      this._issues = validateConfig(this._working, this._projectId, this._env);
      this._issuesFor = this._working;
    }
    return this._issues;
  }

  private get _changeCount(): number {
    return diffConfig(this._original, this._working).length;
  }

  private get _client(): string {
    return clientKey(this._working, this._projectId);
  }

  // ── edits ────────────────────────────────────────────────────────────────

  private _set(path: Path, value: Json): void {
    this._edit(setAt(this._working, path, value));
  }

  private _edit(next: Json): void {
    this._working = next;
    this._notice = '';
    this._conflicts = [];
    if (this._error && !this._busy) this._error = '';
  }

  /** A menu edit on one module entry; a refused edit says why and changes nothing. */
  private _moduleEdit(modulePath: Path, edit: (entry: ModuleEntry) => MenuEditResult): void {
    const entry = getAt(this._working, modulePath);
    if (!isObject(entry)) return;
    const result = edit(entry);
    if (result.refused) {
      this._error = this.msg.refused[result.refused] ?? result.refused;
      return;
    }
    if (result.entry !== entry) this._set(modulePath, result.entry);
  }

  private _setJsonField(path: Path, text: string): void {
    const key = pathKey(path);
    const errors = { ...this._jsonFieldErrors };
    try {
      const value = text.trim() ? JSON.parse(text) : undefined;
      delete errors[key];
      this._jsonFieldErrors = errors;
      this._set(path, value);
    } catch (error) {
      errors[key] = error instanceof Error ? error.message : String(error);
      this._jsonFieldErrors = errors;
    }
  }

  private _useJsonText(): boolean {
    if (this._jsonText === JSON.stringify(this._working, null, 2)) return true;
    try {
      this._edit(JSON.parse(this._jsonText));
      return true;
    } catch (error) {
      this._error = `${this.msg.badJson}: ${error instanceof Error ? error.message : String(error)}`;
      return false;
    }
  }

  private _selectView(view: string): void {
    // Leaving the JSON screen takes what was typed there, or stays with the error.
    if (this._view === 'json' && view !== 'json' && !this._useJsonText()) return;
    if (view === 'json') this._jsonText = JSON.stringify(this._working, null, 2);
    this._view = view;
  }

  private async _copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this._view === 'json' ? this._jsonText : JSON.stringify(this._working, null, 2));
      this._notice = this.msg.copied;
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
    }
  }

  private async _save(): Promise<void> {
    if (this._busy) return;
    if (this._view === 'json' && !this._useJsonText()) return;
    if (newErrors(this._baseline, this._currentIssues).length) {
      this._error = this.msg.blocked;
      return;
    }
    this._busy = true;
    this._error = '';
    try {
      // Read again: the file may have changed under the screen (an agent, the header or menu editor).
      const fresh = await readConfig(this._projectId);
      const { config, conflicts } = rebaseConfig(this._original, this._working, fresh);
      if (conflicts.length) {
        this._conflicts = conflicts;
        this._error = this.msg.conflict;
        return;
      }
      await writeConfig(this._projectId, config);
      this._original = config;
      this._working = config;
      this._baseline = validateConfig(config, this._projectId, this._env);
      this._jsonText = JSON.stringify(config, null, 2);
      this._showDiff = false;
      this._notice = this.msg.applied;
      this.dispatchEvent(new CustomEvent('app-config-applied', { detail: { project: this._projectId }, bubbles: true, composed: true }));
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
    } finally {
      this._busy = false;
    }
  }

  private _discard(): void {
    this._working = this._original;
    this._jsonText = JSON.stringify(this._original, null, 2);
    this._jsonFieldErrors = {};
    this._showDiff = false;
    this._error = '';
    this._notice = '';
    this._conflicts = [];
  }

  // ── words ────────────────────────────────────────────────────────────────

  private _t(help: Help | undefined): string {
    if (!help) return '';
    return this.getMessageKey(messages) === 'pt' ? help.pt : help.en;
  }

  private _labelOf(key: string, spec?: Spec): string {
    return this._t(labelOf(key, spec)) || key;
  }

  /** Where a path is, in words: `tarefas › Menu › Painel › Link`. */
  private _where(path: Path): string {
    return describePath(this._working, this._projectId, path).map(step => typeof step === 'string' ? step : this._t(step)).join(' › ');
  }

  private _issueText(issue: Issue): string {
    if (issue.code === 'menu' && issue.menuIssue) {
      const what = this.msg.menuIssue[issue.menuIssue.code] ?? issue.menuIssue.code;
      return `${what} (${issue.menuIssue.pageId}${issue.menuIssue.actorId ? `, ${issue.menuIssue.actorId}` : ''})`;
    }
    const text = this.msg.issue[issue.code] ?? issue.code;
    return issue.detail && issue.code !== 'required' ? `${text}: ${issue.detail}` : text;
  }

  /** A small lock on the fields a run or the publish rewrites; the explanation is in the tooltip. */
  private _ownerMark(owner: Owner, parentOwner: Owner, note?: Help): TemplateResult | typeof nothing {
    if (owner === parentOwner || owner === 'free' || owner === 'generated') return nothing;
    const title = [this.msg.locked, this.msg.ownerHint[owner], this._t(note)].filter(Boolean).join('\n');
    return html`<span class="text-[11px] text-gray-400 cursor-help" title=${title}>🔒</span>`;
  }

  // ── issues ───────────────────────────────────────────────────────────────

  private _fieldIssues(path: Path): TemplateResult | typeof nothing {
    const key = pathKey(path);
    const own = this._currentIssues.filter(issue => pathKey(issue.path) === key && issue.code !== 'menu' && issue.code !== 'orphan-page');
    const jsonError = this._jsonFieldErrors[key];
    if (!own.length && !jsonError) return nothing;
    return html`
      ${own.map(issue => html`
        <span class="text-[11px] ${issue.severity === 'error' ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-300'}">${this._issueText(issue)}</span>
      `)}
      ${jsonError ? html`<span class="text-[11px] text-red-600 dark:text-red-400">${this.msg.badJson}: ${jsonError}</span>` : nothing}
    `;
  }

  private _hasError(path: Path): boolean {
    const key = pathKey(path);
    return this._currentIssues.some(issue => issue.severity === 'error' && pathKey(issue.path) === key) || key in this._jsonFieldErrors;
  }

  private _issuesUnder(path: Path): Issue[] {
    const key = pathKey(path);
    return this._currentIssues.filter(issue => {
      const issueKey = pathKey(issue.path);
      return issueKey === key || issueKey.startsWith(`${key}.`) || issueKey.startsWith(`${key}[`);
    });
  }

  private _countBadge(issues: Issue[]): TemplateResult | typeof nothing {
    const errors = issues.filter(issue => issue.severity === 'error').length;
    const warnings = issues.length - errors;
    return html`
      ${errors ? html`<span class="text-[10px] tabular-nums rounded-full px-1.5 bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300">${errors}</span>` : nothing}
      ${warnings ? html`<span class="text-[10px] tabular-nums rounded-full px-1.5 bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">${warnings}</span>` : nothing}
    `;
  }

  /** One check: a dot, where it is in words, what is wrong, and its fix or a "go". */
  private _renderIssueLine(issue: Issue, added: Set<Issue>): TemplateResult {
    const fixable = issue.code === 'menu' && issue.menuIssue;
    return html`
      <li class="flex items-start gap-2 py-1.5 border-b last:border-b-0 border-gray-100 dark:border-gray-900">
        <span class="mt-1 w-1.5 h-1.5 shrink-0 rounded-full ${issue.severity === 'error' ? 'bg-red-500' : 'bg-amber-500'}"></span>
        <span class="flex-1 min-w-0">
          <span class="block text-xs">${this._issueText(issue)}</span>
          <span class="block text-[11px] text-gray-500 dark:text-gray-400 truncate">
            ${this._where(issue.path)}${issue.severity === 'error' && !added.has(issue) ? html` · <i>${this.msg.preexisting}</i>` : nothing}
          </span>
        </span>
        ${fixable
          ? html`<button type="button" class=${LINK} @click=${() => this._fixMenu(issue)}>${this.msg.fix}</button>`
          : html`<button type="button" class=${LINK} @click=${() => this._goTo(issue.path)}>${this.msg.goTo}</button>`}
      </li>
    `;
  }

  private _fixMenu(issue: Issue): void {
    if (!issue.menuIssue) return;
    const menuIssue = issue.menuIssue;
    this._moduleEdit(issue.path.slice(0, -1), entry => fixMenuIssue(entry, menuIssue));
  }

  /** Fixes every menu issue of a module, one at a time on the result of the previous. */
  private _fixAllMenu(modulePath: Path): void {
    const entry = getAt(this._working, modulePath);
    if (!isObject(entry)) return;
    let current: ModuleEntry = entry;
    for (let round = 0; round < 50; round++) {
      const issue = readModuleMenu(current).issues.find(candidate => fixMenuIssue(current, candidate).entry !== current);
      if (!issue) break;
      current = fixMenuIssue(current, issue).entry;
    }
    if (current !== entry) this._set(modulePath, current);
  }

  // ── left: what can be edited ─────────────────────────────────────────────

  private _sections(): Section[] {
    return buildSections(this._working, this._projectId);
  }

  /** Blocks of a section that exist (a lib or master config only shows the keys it has). */
  private _blocks(section: Section | undefined): Section['blocks'] {
    if (!section) return [];
    return isAppConfig(this._working) ? section.blocks : section.blocks.filter(block => getAt(this._working, block.path) !== undefined);
  }

  private _modules(): Array<{ index: number; id: string; basePath: string }> {
    const list = getAt(this._working, ['projects', this._client, 'modules']);
    if (!Array.isArray(list)) return [];
    return list.map((module, index) => ({
      index,
      id: isObject(module) ? String(module.moduleId ?? '') : '',
      basePath: isObject(module) ? String(module.basePath ?? '') : '',
    }));
  }

  private _navItems(): INavItem[] {
    const sections = this._sections();
    const section = (id: string) => sections.find(item => item.id === id);
    const items: INavItem[] = [];
    if (this._currentIssues.length) items.push({ view: 'checks', label: this.msg.checks });
    if (this._blocks(section('shell')).length) items.push({ view: 'shell', label: this._t(section('shell')?.title) });
    for (const module of this._modules()) items.push({ view: `module:${module.index}`, label: module.id || `#${module.index + 1}`, sub: module.basePath });
    if (getAt(this._working, ['projects', this._client, 'persistenceModules']) !== undefined) {
      items.push({ view: 'persistence', label: this._labelOf('persistenceModules') });
    }
    for (const id of ['dependencies', 'project', 'other']) {
      if (this._blocks(section(id)).length) items.push({ view: id, label: this._t(section(id)?.title) });
    }
    items.push({ view: 'json', label: this.msg.json });
    return items;
  }

  private _issuesByView(): Map<string, Issue[]> {
    const map = new Map<string, Issue[]>();
    for (const issue of this._currentIssues) {
      const view = viewOfPath(this._working, this._projectId, issue.path);
      map.set(view, [...(map.get(view) ?? []), issue]);
    }
    return map;
  }

  private _addModule(): void {
    const listPath: Path = ['projects', this._client, 'modules'];
    const list = getAt(this._working, listPath);
    this._edit(appendAt(this._working, listPath, MODULES_LIST.newItem(undefined, Array.isArray(list) ? list : [])));
    this._view = `module:${Array.isArray(list) ? list.length : 0}`;
  }

  private _renderNav(): TemplateResult {
    const items = this._navItems();
    const byView = this._issuesByView();
    const allIssues = this._currentIssues;
    const row = (item: INavItem, issues: Issue[]) => {
      const selected = this._view === item.view;
      return html`
        <button type="button"
          class="w-full text-left mx-1 pl-3 pr-2 py-1 rounded flex items-center gap-2 ${selected
            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
            : 'hover:bg-gray-50 dark:hover:bg-gray-900'}"
          style="width: calc(100% - 0.5rem)"
          title=${item.sub ?? ''}
          @click=${() => this._selectView(item.view)}>
          <span class="text-xs truncate flex-1">${item.label}</span>
          ${this._countBadge(issues)}
        </button>
      `;
    };
    const head = (label: string, extra: TemplateResult | typeof nothing = nothing) => html`
      <div class="px-3 pt-3 pb-1 flex items-center ${CARD_TITLE} text-[10px]"><span class="flex-1">${label}</span>${extra}</div>
    `;
    const checks = items.find(item => item.view === 'checks');
    const shell = items.find(item => item.view === 'shell');
    const modules = items.filter(item => item.view.startsWith('module:'));
    const advanced = items.filter(item => ['persistence', 'dependencies', 'project', 'other', 'json'].includes(item.view));
    return html`
      <nav class="w-44 shrink-0 border-r border-gray-200 dark:border-gray-800 overflow-y-auto pb-3">
        ${checks ? html`<div class="pt-2">${row({ ...checks, label: `⚠ ${checks.label}` }, allIssues)}</div>` : nothing}
        ${shell ? html`${head(this.msg.app)}${row(shell, byView.get('shell') ?? [])}` : nothing}
        ${isAppConfig(this._working) ? html`
          ${head(this.msg.modules, html`<button type="button" class="normal-case font-normal ${LINK}" @click=${() => this._addModule()}>${this.msg.addModule}</button>`)}
          ${modules.map(item => row(item, byView.get(item.view) ?? []))}
        ` : nothing}
        ${head(this.msg.advanced)}
        ${advanced.map(item => row(item, byView.get(item.view) ?? []))}
      </nav>
    `;
  }

  // ── right: one item ──────────────────────────────────────────────────────

  private _renderView(): TemplateResult | typeof nothing {
    const view = this._view;
    if (view === 'checks') return this._renderChecks();
    if (view === 'json') return this._renderJsonView();
    if (view.startsWith('module:')) return this._renderModule(Number(view.slice('module:'.length)));
    if (view === 'persistence') {
      const block = this._sections().find(section => section.id === 'modules')?.blocks.find(item => item.label === 'persistenceModules');
      return block ? this._renderBlocks(this._labelOf('persistenceModules'), undefined, [block]) : nothing;
    }
    const section = this._sections().find(item => item.id === view);
    if (!section) return nothing;
    return this._renderBlocks(this._t(section.title), this._t(section.help), this._blocks(section));
  }

  private _renderChecks(): TemplateResult {
    const issues = this._currentIssues;
    const added = new Set(newErrors(this._baseline, issues));
    const sorted = [...issues.filter(issue => issue.severity === 'error'), ...issues.filter(issue => issue.severity === 'warning')];
    return html`
      <h3 class="text-base font-semibold">${this.msg.checks}</h3>
      ${sorted.length
        ? html`<ul class="${CARD} px-3">${sorted.map(issue => this._renderIssueLine(issue, added))}</ul>`
        : html`<p class="text-sm text-gray-500">${this.msg.noChecks}</p>`}
    `;
  }

  private _renderJsonView(): TemplateResult {
    return html`
      <div class="flex items-center gap-2">
        <h3 class="text-base font-semibold flex-1">${this.msg.json}</h3>
        <button type="button" class=${BUTTON} @click=${() => void this._copy()}>${this.msg.copy}</button>
        <button type="button" class=${BUTTON} @click=${() => { if (this._useJsonText()) this._notice = ''; }}>${this.msg.applyJson}</button>
      </div>
      <textarea class="${INPUT} font-mono text-xs min-h-[60vh]" spellcheck="false" .value=${this._jsonText}
        @input=${(event: Event) => { this._jsonText = (event.target as HTMLTextAreaElement).value; }}></textarea>
    `;
  }

  /** A section of the app (shell, dependencies, project…): each block in its own card. */
  private _renderBlocks(title: string, help: string | undefined, blocks: Section['blocks']): TemplateResult {
    const skip = new Set(shownElsewhere(this._working, this._projectId).map(pathKey));
    return html`
      <div>
        <h3 class="text-base font-semibold">${title}</h3>
        ${help ? html`<p class="text-xs text-gray-500 dark:text-gray-400">${help}</p>` : nothing}
      </div>
      ${isAppConfig(this._working) ? nothing : html`<p class="text-xs italic text-gray-500 dark:text-gray-400">${this.msg.notApp}</p>`}
      ${blocks.map(block => {
        const value = getAt(this._working, block.path);
        const nested = block.spec.kind === 'object' || block.spec.kind === 'list' || block.spec.kind === 'map';
        // a block is the place of its own path: only its children may be shown elsewhere
        const ownSkip = new Set([...skip].filter(key => key !== pathKey(block.path)));
        if (!nested) {
          return html`<div class="${CARD} p-3">${this._renderField(block.label, block.spec, value, block.path, 'free', !block.spec.required && value !== undefined, ownSkip)}</div>`;
        }
        return html`
          <section class="${CARD} p-3 flex flex-col gap-3" data-path=${pathKey(block.path)}>
            <div class="flex items-center gap-2">
              <span class=${CARD_TITLE} title=${block.label}>${this._labelOf(block.label, block.spec)}</span>
              ${this._ownerMark(block.spec.owner ?? 'free', 'free', block.spec.ownerNote)}
              ${this._countBadge(this._issuesUnder(block.path))}
              ${!block.spec.required && value !== undefined
                ? html`<button type="button" class="ml-auto ${LINK}" @click=${() => this._set(block.path, undefined)}>${this.msg.remove}</button>`
                : nothing}
            </div>
            ${value === undefined && !block.spec.required
              ? html`<button type="button" class="self-start ${LINK}" @click=${() => this._set(block.path, emptyValue(block.spec))}>+ ${this.msg.add}</button>`
              : this._renderValue(block.spec, value, block.path, block.spec.owner ?? 'free', ownSkip)}
          </section>
        `;
      })}
    `;
  }

  // ── the module screen ────────────────────────────────────────────────────

  private _renderModule(index: number): TemplateResult | typeof nothing {
    const modulePath: Path = ['projects', this._client, 'modules', index];
    const entry = getAt(this._working, modulePath);
    if (!isObject(entry)) return nothing;
    const menu = readModuleMenu(entry);
    const issues = this._issuesUnder(modulePath);
    const added = new Set(newErrors(this._baseline, this._currentIssues));
    const menuIssues = issues.filter(issue => issue.code === 'menu');
    return html`
      <div class="flex items-start gap-2">
        <div class="flex-1 min-w-0">
          <h3 class="text-base font-semibold truncate">${String(entry.moduleId ?? '') || `#${index + 1}`}</h3>
          <p class="text-xs font-mono text-gray-500 dark:text-gray-400">${String(entry.basePath ?? '')}</p>
        </div>
        <button type="button" class="${LINK} text-red-600 dark:text-red-400" @click=${() => {
          this._edit(removeAt(this._working, modulePath));
          this._view = this._navItems().find(item => item.view !== 'checks')?.view ?? '';
        }}>${this.msg.remove}</button>
      </div>

      ${issues.length ? html`
        <section class="rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2">
          <div class="flex items-center gap-2">
            <span class="${CARD_TITLE} text-amber-800 dark:text-amber-300 flex-1">${this.msg.moduleIssues}</span>
            ${menuIssues.length > 1 ? html`<button type="button" class=${LINK} @click=${() => this._fixAllMenu(modulePath)}>${this.msg.fixAll}</button>` : nothing}
          </div>
          <ul class="mt-1">${issues.map(issue => this._renderIssueLine(issue, added))}</ul>
        </section>
      ` : nothing}

      ${this._renderPagesCard(modulePath, entry, menu)}
      ${this._renderLandingsCard(modulePath, entry, menu)}

      <section class="${CARD} p-3 flex flex-col gap-3" data-path=${pathKey([...modulePath, 'headerLinks'])}>
        <span class=${CARD_TITLE}>${this.msg.headerLinksTitle}</span>
        ${this._renderList(MODULE_SPEC.fields.headerLinks as ListSpec, entry.headerLinks, [...modulePath, 'headerLinks'], 'free', new Set())}
      </section>

      <section class="${CARD} p-3 flex flex-col gap-3">
        <span class=${CARD_TITLE}>${this.msg.generalTitle}</span>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${MODULE_GENERAL.map(key => this._renderField(key, MODULE_SPEC.fields[key], entry[key], [...modulePath, key], 'free', false, new Set()))}
        </div>
      </section>

      ${this._renderModuleTechnical(modulePath, entry)}
    `;
  }

  /** Pages and menu as one list: what a person thinks of as "the pages of the module". */
  private _renderPagesCard(modulePath: Path, entry: ModuleEntry, menu: ReturnType<typeof readModuleMenu>): TemplateResult {
    const frontend = isObject(entry.frontend) ? entry.frontend : {};
    const pages = Array.isArray(frontend.pages) ? frontend.pages : [];
    const pagesPath: Path = [...modulePath, 'frontend', 'pages'];
    const rows = [
      ...menu.rows.map((row, menuIndex) => ({ pageId: row.pageId, inMenu: true, menuIndex })),
      ...menu.hidden.map(page => ({ pageId: page.pageId, inMenu: false, menuIndex: -1 })),
    ];
    const pagesSpec = (MODULE_SPEC.fields.frontend as ObjectSpec).fields.pages as ListSpec;
    return html`
      <section class="${CARD} p-3 flex flex-col gap-2" data-path=${pathKey([...modulePath, 'navigation'])}>
        <div data-path=${pathKey(pagesPath)}>
          <div class="flex items-center gap-2">
            <span class="${CARD_TITLE} flex-1">${this.msg.pagesTitle}</span>
            <button type="button" class=${LINK} @click=${() => this._edit(appendAt(this._working, pagesPath, pagesSpec.newItem(frontend, pages)))}>${this.msg.addPage}</button>
          </div>
          <p class="text-[11px] text-gray-500 dark:text-gray-400">${this.msg.pagesHelp}</p>
        </div>
        ${rows.map(row => {
          const pageIndex = pages.findIndex(page => isObject(page) && page.pageId === row.pageId);
          return pageIndex < 0 ? nothing : this._renderPageRow(modulePath, entry, menu, pageIndex, row.inMenu, row.menuIndex);
        })}
      </section>
    `;
  }

  private _renderPageRow(modulePath: Path, entry: ModuleEntry, menu: ReturnType<typeof readModuleMenu>, pageIndex: number, inMenu: boolean, menuIndex: number): TemplateResult {
    const pagesPath: Path = [...modulePath, 'frontend', 'pages'];
    const pagePath: Path = [...pagesPath, pageIndex];
    const page = getAt(this._working, pagePath) as Record<string, unknown>;
    const pageId = String(page.pageId ?? '');
    const title = String(page.title ?? '');
    const route = String(page.route ?? '');
    const actors = Array.isArray(page.actors) ? page.actors.map(String) : [];
    const isHome = pageId !== '' && pageId === menu.homePageId;
    const issues = this._issuesUnder(pagePath);
    const pageSpec = ((MODULE_SPEC.fields.frontend as ObjectSpec).fields.pages as ListSpec).item as ObjectSpec;
    const technicalKeys = Object.keys(pageSpec.fields).filter(key => !PAGE_ROW.has(key) && (key in page || pageSpec.fields[key].required));
    const unknown = unknownKeys(pageSpec, page);
    const technicalIssues = issues.filter(issue => !PAGE_ROW.has(String(issue.path[pagePath.length] ?? '')));

    const setTitle = (text: string) => inMenu
      ? this._moduleEdit(modulePath, current => setMenuLabel(current, pageId, text))
      : this._set([...pagePath, 'title'], text.trim() || undefined);
    const setRoute = (text: string) => pageId
      ? this._moduleEdit(modulePath, current => setPageRoute(current, pageId, text))
      : this._set([...pagePath, 'route'], text.trim());
    const toggleActor = (actor: string, on: boolean) => inMenu
      ? this._moduleEdit(modulePath, current => setMenuActor(current, pageId, actor, on))
      : this._set([...pagePath, 'actors'], on ? [...actors, actor] : actors.filter(value => value !== actor));
    const removePage = () => {
      let current: ModuleEntry = entry;
      if (inMenu) current = hideFromMenu(current, pageId).entry;
      this._set(modulePath, removeAt(current, ['frontend', 'pages', pageIndex]));
    };

    return html`
      <div class="rounded-md border ${inMenu ? 'border-gray-200 dark:border-gray-800' : 'border-dashed border-gray-300 dark:border-gray-700'} px-2.5 py-2 flex flex-col gap-1.5" data-path=${pathKey(pagePath)}>
        <div class="flex items-center gap-1.5">
          ${inMenu ? html`
            <span class="flex flex-col -my-1">
              <button type="button" class=${ICON_BUTTON} title=${this.msg.up} aria-label=${this.msg.up} ?disabled=${menuIndex === 0}
                @click=${() => this._moduleEdit(modulePath, current => moveMenuItem(current, pageId, menuIndex - 1))}>▲</button>
              <button type="button" class=${ICON_BUTTON} title=${this.msg.down} aria-label=${this.msg.down} ?disabled=${menuIndex === menu.rows.length - 1}
                @click=${() => this._moduleEdit(modulePath, current => moveMenuItem(current, pageId, menuIndex + 1))}>▼</button>
            </span>` : html`<span class="w-5"></span>`}
          <input class="${this._hasError([...pagePath, 'title']) ? INPUT_ERROR : INPUT} font-medium" placeholder=${pageId || this.msg.pageTitle}
            aria-label=${this.msg.pageTitle} .value=${title}
            @change=${(event: Event) => setTitle((event.target as HTMLInputElement).value)}>
          <button type="button"
            class="shrink-0 text-sm px-1 rounded ${isHome ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-300 dark:text-gray-600 hover:text-gray-500'}"
            title=${isHome ? this.msg.homeHint(String(entry.basePath ?? '')) : this.msg.makeHome}
            ?disabled=${!pageId}
            @click=${() => this._moduleEdit(modulePath, current => setHomePage(current, pageId))}>⌂</button>
          <label class="shrink-0 inline-flex items-center gap-1 text-[11px] text-gray-500 cursor-pointer" title=${inMenu ? this.msg.inMenu : this.msg.outOfMenu}>
            <input type="checkbox" .checked=${inMenu} ?disabled=${!pageId}
              @change=${(event: Event) => {
                const on = (event.target as HTMLInputElement).checked;
                this._moduleEdit(modulePath, current => on ? showInMenu(current, pageId) : hideFromMenu(current, pageId));
              }}>
            ${this.msg.inMenu}
          </label>
        </div>

        <div class="flex items-center gap-2 pl-6">
          <span class="w-10 shrink-0 text-[11px] text-gray-500">${this.msg.route}</span>
          <input class="${this._hasError([...pagePath, 'route']) ? INPUT_ERROR : INPUT} font-mono text-xs" .value=${route}
            @change=${(event: Event) => setRoute((event.target as HTMLInputElement).value)}>
        </div>
        <div class="pl-16 flex flex-col">${this._fieldIssues([...pagePath, 'route'])}${this._fieldIssues([...pagePath, 'title'])}</div>

        <div class="flex items-center gap-2 pl-6">
          <span class="w-10 shrink-0 text-[11px] text-gray-500">${this._labelOf('actors')}</span>
          <span class="flex flex-wrap gap-1">
            ${menu.actors.length ? menu.actors.map(actor => {
              const on = actors.includes(actor);
              return html`
                <button type="button"
                  class="text-[11px] px-2 py-0.5 rounded-full border ${on
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300'
                    : 'border-gray-200 text-gray-400 dark:border-gray-700 hover:text-gray-600'}"
                  @click=${() => toggleActor(actor, !on)}>${actor}</button>`;
            }) : html`<span class="text-[11px] text-gray-400">${this.msg.everybody}</span>`}
          </span>
        </div>

        <details class="pl-6" ?open=${technicalIssues.length > 0}>
          <summary class="cursor-pointer select-none text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-1">
            ${this.msg.technical} ${this._countBadge(technicalIssues)}
          </summary>
          <div class="mt-2 grid grid-cols-1 gap-2">
            ${technicalKeys.map(key => this._renderField(key, pageSpec.fields[key], page[key], [...pagePath, key], 'free', !pageSpec.fields[key].required && key in page, new Set()))}
            ${unknown.map(key => this._renderUnknownKey(key, page[key], [...pagePath, key]))}
            ${this._renderAddField(pageSpec, page, pagePath, new Set([...PAGE_ROW]))}
            <button type="button" class="self-start ${LINK} text-red-600 dark:text-red-400" @click=${removePage}>${this.msg.removePage}</button>
          </div>
        </details>
      </div>
    `;
  }

  /** The start page of each role: a choice among the menu pages that role sees. */
  private _renderLandingsCard(modulePath: Path, entry: ModuleEntry, menu: ReturnType<typeof readModuleMenu>): TemplateResult {
    const landings = Array.isArray(entry.landings) ? entry.landings.filter(isObject) : [];
    return html`
      <section class="${CARD} p-3 flex flex-col gap-2" data-path=${pathKey([...modulePath, 'landings'])}>
        <div>
          <span class=${CARD_TITLE}>${this.msg.landingsTitle}</span>
          <p class="text-[11px] text-gray-500 dark:text-gray-400">${this.msg.landingsHelp}</p>
        </div>
        ${menu.actors.length ? menu.actors.map(actor => {
          const current = String(landings.find(landing => landing.actorId === actor)?.pageId ?? '');
          const options = menu.rows.filter(row => !row.actors.length || row.actors.includes(actor));
          return html`
            <label class="flex items-center gap-2">
              <span class="w-32 shrink-0 text-xs truncate" title=${actor}>${actor}</span>
              <select class=${INPUT} @change=${(event: Event) => {
                const pageId = (event.target as HTMLSelectElement).value;
                this._moduleEdit(modulePath, current => setLanding(current, actor, pageId || null));
              }}>
                <option value="" ?selected=${!current}>${this.msg.none}</option>
                ${options.map(row => html`<option value=${row.pageId} ?selected=${row.pageId === current}>${row.label || row.pageId}</option>`)}
              </select>
            </label>
          `;
        }) : html`<p class="text-xs text-gray-400">${this.msg.noRoles}</p>`}
      </section>
    `;
  }

  /** What the generation writes and a person rarely touches: closed unless something there needs a look. */
  private _renderModuleTechnical(modulePath: Path, entry: ModuleEntry): TemplateResult {
    const frontendSpec = MODULE_SPEC.fields.frontend as ObjectSpec;
    const frontend = isObject(entry.frontend) ? entry.frontend : undefined;
    const moduleKeys = Object.keys(MODULE_SPEC.fields).filter(key => !MODULE_OWN_CARDS.has(key) && key in entry);
    const frontendKeys = Object.keys(frontendSpec.fields).filter(key => key !== 'pages' && frontend && key in frontend);
    const moduleUnknown = unknownKeys(MODULE_SPEC, entry);
    const frontendUnknown = frontend ? unknownKeys(frontendSpec, frontend) : [];
    const technicalIssues = [
      ...moduleKeys.flatMap(key => this._issuesUnder([...modulePath, key])),
      ...frontendKeys.flatMap(key => this._issuesUnder([...modulePath, 'frontend', key])),
    ];
    return html`
      <details class="${CARD} p-3" ?open=${technicalIssues.length > 0}>
        <summary class="cursor-pointer select-none flex items-center gap-2">
          <span class=${CARD_TITLE}>${this.msg.technical}</span>
          ${this._countBadge(technicalIssues)}
        </summary>
        <div class="mt-3 flex flex-col gap-3">
          ${frontendKeys.map(key => this._renderField(key, frontendSpec.fields[key], frontend?.[key], [...modulePath, 'frontend', key], 'generated', true, new Set()))}
          ${frontendUnknown.map(key => this._renderUnknownKey(key, frontend?.[key], [...modulePath, 'frontend', key]))}
          ${moduleKeys.map(key => this._renderField(key, MODULE_SPEC.fields[key], entry[key], [...modulePath, key], 'free', !MODULE_SPEC.fields[key].required, new Set()))}
          ${moduleUnknown.map(key => this._renderUnknownKey(key, entry[key], [...modulePath, key]))}
          ${this._renderAddField(MODULE_SPEC, entry, modulePath, MODULE_OWN_CARDS)}
        </div>
      </details>
    `;
  }

  // ── the generic editor, driven by the spec (shell, dependencies, project, header links…) ──

  /** One field: name (key and help in the tooltip), lock when a run rewrites it, control and its issues. */
  private _renderField(key: string, spec: Spec, value: Json, path: Path, parentOwner: Owner, removable: boolean, skip: Set<string>): TemplateResult {
    const owner = spec.owner ?? parentOwner;
    const nested = spec.kind === 'object' || spec.kind === 'list' || spec.kind === 'map';
    const tooltip = [key, this._t(spec.help)].filter(Boolean).join(' — ');
    const header = html`
      <div class="flex items-center gap-1.5">
        <span class="${LABEL} ${nested ? 'font-semibold' : ''}" title=${tooltip}>${this._labelOf(key, spec)}${spec.required ? html`<span class="text-red-500">*</span>` : nothing}</span>
        ${spec.help ? html`<span class="text-[10px] text-gray-300 dark:text-gray-600 cursor-help" title=${this._t(spec.help)}>ⓘ</span>` : nothing}
        ${this._ownerMark(owner, parentOwner, spec.ownerNote)}
        ${nested ? this._countBadge(this._issuesUnder(path)) : nothing}
        ${removable ? html`<button type="button" class="ml-auto ${ICON_BUTTON}" title=${this.msg.remove} aria-label=${this.msg.remove} @click=${() => this._set(path, undefined)}>✕</button>` : nothing}
      </div>
    `;
    if (skip.has(pathKey(path))) {
      return html`<div class="flex flex-col gap-0.5" data-path=${pathKey(path)}>${header}<span class="text-[11px] italic text-gray-400">${this.msg.seeSection}</span></div>`;
    }
    if (nested && value === undefined && !spec.required) {
      return html`
        <div class="flex flex-col gap-0.5" data-path=${pathKey(path)}>
          ${header}
          <button type="button" class="self-start ${LINK}" @click=${() => this._set(path, emptyValue(spec))}>+ ${this.msg.add}</button>
        </div>
      `;
    }
    if (nested) {
      return html`
        <details class="flex flex-col gap-1" data-path=${pathKey(path)} ?open=${spec.kind === 'object'}>
          <summary class="cursor-pointer list-none">${header}</summary>
          <div class="mt-2 pl-3 border-l-2 border-gray-100 dark:border-gray-800 flex flex-col gap-2">
            ${this._renderValue(spec, value, path, owner, skip)}
          </div>
        </details>
      `;
    }
    return html`<div class="flex flex-col gap-1" data-path=${pathKey(path)}>${header}${this._renderValue(spec, value, path, owner, skip)}</div>`;
  }

  private _renderValue(spec: Spec, value: Json, path: Path, owner: Owner, skip: Set<string>): TemplateResult {
    const issues = this._fieldIssues(path);
    const cls = this._hasError(path) ? INPUT_ERROR : INPUT;
    switch (spec.kind) {
      case 'text':
        return html`
          <input class=${cls} .value=${typeof value === 'string' ? value : value === undefined ? '' : JSON.stringify(value)}
            @change=${(event: Event) => this._set(path, (event.target as HTMLInputElement).value)}>
          ${issues}`;
      case 'textarea':
        return html`
          <textarea class="${cls} text-xs" rows="2" .value=${typeof value === 'string' ? value : ''}
            @change=${(event: Event) => this._set(path, (event.target as HTMLTextAreaElement).value)}></textarea>
          ${issues}`;
      case 'number':
        return html`
          <input type="number" class=${cls} .value=${typeof value === 'number' ? String(value) : ''}
            @change=${(event: Event) => {
              const text = (event.target as HTMLInputElement).value;
              this._set(path, text === '' ? (spec.required ? 0 : undefined) : Number(text));
            }}>
          ${issues}`;
      case 'boolean':
        return html`
          <label class="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" .checked=${value === true} @change=${(event: Event) => this._set(path, (event.target as HTMLInputElement).checked)}>
          </label>
          ${issues}`;
      case 'enum': {
        const current = typeof value === 'string' ? value : '';
        const options = current && !spec.options.includes(current) ? [current, ...spec.options] : spec.options;
        return html`
          <select class=${cls} @change=${(event: Event) => {
            const chosen = (event.target as HTMLSelectElement).value;
            this._set(path, chosen === '' ? undefined : chosen);
          }}>
            ${spec.required ? nothing : html`<option value="" ?selected=${!current}>${this.msg.empty}</option>`}
            ${options.map(option => html`<option value=${option} ?selected=${option === current}>${option}</option>`)}
          </select>
          ${issues}`;
      }
      case 'strings':
        return this._renderStrings(value, path, issues);
      case 'json':
        return this._renderJsonField(value, path, issues);
      case 'object':
        return this._renderObject(spec, value, path, owner, skip);
      case 'list':
        return this._renderList(spec, value, path, owner, skip);
      case 'map':
        return this._renderMap(spec, value, path, owner, skip);
    }
  }

  private _renderStrings(value: Json, path: Path, issues: TemplateResult | typeof nothing): TemplateResult {
    const list = Array.isArray(value) ? value.map(String) : [];
    return html`
      <div class="flex flex-wrap items-center gap-1">
        ${list.map((item, index) => html`
          <span class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]
            ${this._hasError([...path, index]) ? 'border-red-400 text-red-700 dark:text-red-300' : 'border-gray-200 dark:border-gray-700'}">
            ${item}
            <button type="button" class="text-gray-400 hover:text-red-600" title=${this.msg.remove} aria-label=${`${this.msg.remove} ${item}`}
              @click=${() => this._set(path, list.filter((_, at) => at !== index))}>✕</button>
          </span>
        `)}
        <input class="rounded-full border border-dashed border-gray-300 dark:border-gray-700 bg-transparent px-2 py-0.5 text-[11px] w-24"
          placeholder=${`+ ${this.msg.add}`}
          @change=${(event: Event) => {
            const input = event.target as HTMLInputElement;
            const item = input.value.trim();
            input.value = '';
            if (item) this._set(path, [...list, item]);
          }}>
      </div>
      ${list.map((_, index) => this._fieldIssues([...path, index]))}
      ${issues}
    `;
  }

  private _renderJsonField(value: Json, path: Path, issues: TemplateResult | typeof nothing): TemplateResult {
    const text = value === undefined ? '' : JSON.stringify(value, null, 2);
    const lines = Math.min(12, Math.max(2, text.split('\n').length));
    return html`
      <textarea class="${this._hasError(path) ? INPUT_ERROR : INPUT} font-mono text-xs" rows=${lines} .value=${text}
        @change=${(event: Event) => this._setJsonField(path, (event.target as HTMLTextAreaElement).value)}></textarea>
      ${issues}
    `;
  }

  private _renderUnknownKey(key: string, value: Json, path: Path): TemplateResult {
    return html`
      <div class="flex flex-col gap-1" data-path=${pathKey(path)}>
        <div class="flex items-center gap-1.5">
          <span class="${LABEL} font-mono" title=${this.msg.unknownKey}>${key}</span>
          <span class="text-[10px] text-gray-400">${this.msg.unknownKey}</span>
          <button type="button" class="ml-auto ${ICON_BUTTON}" title=${this.msg.remove} aria-label=${this.msg.remove} @click=${() => this._set(path, undefined)}>✕</button>
        </div>
        ${this._renderJsonField(value, path, this._fieldIssues(path))}
      </div>
    `;
  }

  /** "+ field": the optional fields the object does not have yet, by their names. */
  private _renderAddField(spec: ObjectSpec, value: Json, path: Path, except: Set<string> = new Set()): TemplateResult | typeof nothing {
    const missing = missingFields(spec, value).filter(key => !spec.fields[key].required && !except.has(key));
    if (!missing.length) return nothing;
    return html`
      <select class="self-start rounded-md border border-dashed border-gray-300 dark:border-gray-700 bg-transparent px-1.5 py-0.5 text-xs text-gray-500"
        @change=${(event: Event) => {
          const select = event.target as HTMLSelectElement;
          const key = select.value;
          select.value = '';
          if (key) this._set([...path, key], emptyValue(spec.fields[key]));
        }}>
        <option value="" selected>${this.msg.addField}</option>
        ${missing.map(key => html`<option value=${key}>${this._labelOf(key, spec.fields[key])}</option>`)}
      </select>
    `;
  }

  private _renderObject(spec: ObjectSpec, value: Json, path: Path, owner: Owner, skip: Set<string>): TemplateResult {
    const object = isObject(value) ? value : {};
    const shown = Object.keys(spec.fields).filter(key => key in object || spec.fields[key].required);
    return html`
      ${this._fieldIssues(path)}
      ${shown.map(key => this._renderField(key, spec.fields[key], object[key], [...path, key], owner, !spec.fields[key].required && key in object, skip))}
      ${unknownKeys(spec, object).map(key => this._renderUnknownKey(key, object[key], [...path, key]))}
      ${this._renderAddField(spec, object, path)}
    `;
  }

  private _renderList(spec: ListSpec, value: Json, path: Path, owner: Owner, skip: Set<string>): TemplateResult {
    const list = Array.isArray(value) ? value : [];
    const last = list.length - 1;
    const holder = getAt(this._working, path.slice(0, -1));
    const titleOf = (item: Json, index: number) => {
      const key = spec.keyField && isObject(item) ? String(item[spec.keyField] ?? '') : '';
      const second = spec.titleField && isObject(item) ? String(item[spec.titleField] ?? '') : '';
      return { first: second || key || `#${index + 1}`, second: second && key && second !== key ? key : '' };
    };
    return html`
      ${this._fieldIssues(path)}
      ${list.map((item, index) => {
        const itemPath = [...path, index];
        const title = titleOf(item, index);
        return html`
          <details class="rounded-md border border-gray-200 dark:border-gray-800 px-2.5 py-1.5" data-path=${pathKey(itemPath)}>
            <summary class="cursor-pointer flex items-center gap-2 text-xs">
              <span class="font-medium">${title.first}</span>
              ${title.second ? html`<span class="text-gray-400 truncate">${title.second}</span>` : nothing}
              ${this._countBadge(this._issuesUnder(itemPath))}
              <span class="ml-auto flex items-center" @click=${(event: Event) => event.preventDefault()}>
                <button type="button" class=${ICON_BUTTON} title=${this.msg.up} aria-label=${this.msg.up} ?disabled=${index === 0}
                  @click=${() => this._edit(moveAt(this._working, path, index, index - 1))}>▲</button>
                <button type="button" class=${ICON_BUTTON} title=${this.msg.down} aria-label=${this.msg.down} ?disabled=${index === last}
                  @click=${() => this._edit(moveAt(this._working, path, index, index + 1))}>▼</button>
                <button type="button" class=${ICON_BUTTON} title=${this.msg.remove} aria-label=${this.msg.remove}
                  @click=${() => this._edit(removeAt(this._working, itemPath))}>✕</button>
              </span>
            </summary>
            <div class="mt-2 mb-1 flex flex-col gap-2">
              ${this._renderValue(spec.item, item, itemPath, owner, skip)}
            </div>
          </details>
        `;
      })}
      <button type="button" class="self-start ${LINK}"
        @click=${() => this._edit(appendAt(this._working, path, spec.newItem(isObject(holder) ? holder : undefined, list)))}>
        + ${this.msg.add}
      </button>
    `;
  }

  private _renderMap(spec: MapSpec, value: Json, path: Path, owner: Owner, skip: Set<string>): TemplateResult {
    const map = isObject(value) ? value : {};
    return html`
      ${this._fieldIssues(path)}
      ${Object.entries(map).map(([key, child]) => {
        const childPath = [...path, key];
        return html`
          <details class="rounded-md border border-gray-200 dark:border-gray-800 px-2.5 py-1.5" data-path=${pathKey(childPath)}>
            <summary class="cursor-pointer flex items-center gap-2 text-xs">
              <span class="font-medium">${key}</span>
              ${isObject(child) && typeof child.type === 'string' ? html`<span class="text-gray-400">${child.type}</span>` : nothing}
              ${this._countBadge(this._issuesUnder(childPath))}
              <span class="ml-auto" @click=${(event: Event) => event.preventDefault()}>
                <button type="button" class=${ICON_BUTTON} title=${this.msg.remove} aria-label=${this.msg.remove}
                  @click=${() => this._edit(removeAt(this._working, childPath))}>✕</button>
              </span>
            </summary>
            <div class="mt-2 mb-1 flex flex-col gap-2">
              <label class="flex items-center gap-2 text-xs">
                <span class="text-gray-500">${this.msg.rename}</span>
                <input class="${INPUT} font-mono" .value=${key}
                  @change=${(event: Event) => this._edit(renameKeyAt(this._working, path, key, (event.target as HTMLInputElement).value.trim()))}>
              </label>
              ${this._renderValue(spec.value, child, childPath, owner, skip)}
            </div>
          </details>
        `;
      })}
      <input class="self-start rounded-md border border-dashed border-gray-300 dark:border-gray-700 bg-transparent px-1.5 py-0.5 text-xs w-40"
        placeholder=${`+ ${this.msg.addKey}`}
        @change=${(event: Event) => {
          const input = event.target as HTMLInputElement;
          const key = input.value.trim();
          input.value = '';
          if (key && !(key in map)) this._set([...path, key], spec.newValue(key));
        }}>
    `;
  }

  // ── the save bar ─────────────────────────────────────────────────────────

  private _renderSaveBar(): TemplateResult | typeof nothing {
    const count = this._changeCount;
    if (!count && !this._error && !this._notice && !this._conflicts.length) return nothing;
    const blocked = newErrors(this._baseline, this._currentIssues).length > 0;
    const show = (value: Json) => value === undefined ? '' : JSON.stringify(value);
    return html`
      <div class="shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-2 flex flex-col gap-2">
        ${this._error ? html`
          <div class="rounded-md bg-red-50 dark:bg-red-950/40 px-2.5 py-1.5 text-xs text-red-700 dark:text-red-300">
            ${this._error}
            ${this._conflicts.length ? html`<ul class="mt-1">${this._conflicts.map(path => html`<li>${this._where(path)}</li>`)}</ul>` : nothing}
          </div>` : nothing}
        ${this._notice ? html`<p class="text-xs text-emerald-700 dark:text-emerald-300">${this._notice}</p>` : nothing}
        ${blocked && count ? html`<p class="text-xs text-red-600 dark:text-red-400">${this.msg.blocked}</p>` : nothing}
        ${this._showDiff && count ? html`
          <ul class="max-h-48 overflow-y-auto flex flex-col gap-1.5 text-[11px]">
            ${diffConfig(this._original, this._working).map(change => html`
              <li class="flex flex-col">
                <span class="text-gray-600 dark:text-gray-300">${this._where(change.path)}</span>
                <span class="font-mono break-all text-red-700 dark:text-red-300 line-clamp-2">− ${change.before === undefined ? this.msg.added : show(change.before)}</span>
                <span class="font-mono break-all text-emerald-700 dark:text-emerald-300 line-clamp-2">+ ${change.after === undefined ? this.msg.removed : show(change.after)}</span>
              </li>
            `)}
          </ul>` : nothing}
        ${this._conflicts.length ? html`
          <div class="flex justify-end">
            <button type="button" class=${BUTTON_PRIMARY} ?disabled=${this._busy} @click=${() => void this._reload()}>${this.msg.reload}</button>
          </div>
        ` : count ? html`
          <div class="flex items-center gap-2">
            <span class="text-xs font-medium text-amber-700 dark:text-amber-300">${this.msg.changes(count)}</span>
            <button type="button" class=${LINK} @click=${() => { this._showDiff = !this._showDiff; }}>${this._showDiff ? this.msg.hideChanges : this.msg.showChanges}</button>
            <span class="flex-1"></span>
            <button type="button" class=${BUTTON} ?disabled=${this._busy} @click=${() => this._discard()}>${this.msg.discard}</button>
            <button type="button" class=${BUTTON_PRIMARY} ?disabled=${this._busy || blocked} @click=${() => void this._save()}>${this.msg.save}</button>
          </div>
        ` : nothing}
      </div>
    `;
  }

  // ── the screen ───────────────────────────────────────────────────────────

  render(): TemplateResult {
    this.msg = messages[this.getMessageKey(messages)] ?? message_en;
    // Opaque background of its own: the details panel stays light while `.dark` is on (see the header editor).
    const shell = (body: TemplateResult) => html`<div class="flex flex-col h-full min-h-full bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-100">${body}</div>`;
    if (!this._projectId) {
      return shell(html`<p class="text-sm italic p-3 text-gray-500 dark:text-gray-400">${this.msg.noProject}</p>`);
    }
    if (this._loading && this._working === undefined) return shell(html`<p class="text-sm italic p-3 text-gray-500 dark:text-gray-400">${this.msg.loading}</p>`);
    if (this._working === undefined) return shell(html`<p class="text-sm p-3 text-red-700 dark:text-red-300">${this._error}</p>`);
    return shell(html`
      <header class="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-800">
        <span class="w-5 h-5 text-gray-500 dark:text-gray-400">${pluginData.getSvg()}</span>
        <h2 class="text-sm font-semibold">${this.msg.title}</h2>
        <span class="text-[11px] font-mono text-gray-400 dark:text-gray-500 truncate">_${this._projectId}_/l5/config.json</span>
        <button type="button" class="ml-auto ${ICON_BUTTON} w-6 h-6 text-sm" title=${this.msg.reload} aria-label=${this.msg.reload}
          ?disabled=${this._busy || this._loading} @click=${() => void this._reload()}>↻</button>
      </header>
      <div class="flex flex-1 min-h-0">
        ${this._renderNav()}
        <div class="flex-1 min-w-0 flex flex-col">
          <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-3">${this._renderView()}</div>
          ${this._renderSaveBar()}
        </div>
      </div>
    `);
  }
}
