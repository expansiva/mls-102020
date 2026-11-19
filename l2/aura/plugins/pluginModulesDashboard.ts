/// <mls fileReference="_102020_/l2/aura/plugins/pluginModulesDashboard.ts" enhancement="_102027_/l2/enhancementLit" />

// Modules Dashboard: every module of a project and where it is — spec, pages, backend, routes and
// tests — at a glance (proposal: collabMyFiles/DashboardIdea.md). Registered in the Details category
// of the L6 project panel (selectProject), next to the App Config; opens in the details panel with
// `project` set. Studio only: everything is read from `mls.stor`.
//
// Every rule lives in `helpers/modulesDashboardCore.ts` (pure, tested). The route and menu problems
// are the App Config's (validateConfig) and the contract ones are serviceL2Validator's
// (l2ContractRoutes): this file reads the stor, renders, and takes a click to the cause.
//
// The cheap files build the whole screen on open. The contract check reads every contract, shared and
// controller of a module, so it runs when the module is opened (or on "Check all") and is kept until
// one of those files changes.

import { html, nothing, svg, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { PluginBaseModule } from '/_102027_/l2/pluginBaseModule.js';
import { openElementInServiceDetails, openService } from '/_102027_/l2/libCommom.js';
import { createModel } from '/_102027_/l2/libModel.js';
import { ensureProjectLoaded, readConfig, storValidationEnv } from '/_102020_/l2/aura/plugins/helpers/configIo.js';
import { navigateAppToPage } from '/_102020_/l2/aura/helpers/pageNavigation.js';
import { validateConfig, type Issue, type Json } from '/_102020_/l2/aura/helpers/appConfigSections.js';
import { checkContractRoutes, type ContractSource, type RouteRow } from '/_102020_/l2/aura/helpers/l2ContractRoutes.js';
import {
  buildDashboard,
  contractSignature,
  PIPELINE_FILE,
  STAGE_IDS,
  UNREADABLE,
  type Dashboard,
  type ModuleRow,
  type ModuleStatus,
  type PageRow,
  type Problem,
  type ProblemCode,
  type Stage,
  type StageId,
  type StageState,
  type Target,
} from '/_102020_/l2/aura/helpers/modulesDashboardCore.js';

/// **collab_i18n_start**
const message_en = {
  title: 'Modules Dashboard',
  noProject: 'Select a project first.',
  reload: 'Reload',
  checkAll: 'Check all',
  checking: 'Checking…',
  copySummary: 'Copy summary',
  copied: 'Summary copied.',
  search: 'Search module…',
  modules: (count: number) => `${count} module${count === 1 ? '' : 's'}`,
  totals: (pages: number, controllers: number, errors: number, warnings: number) =>
    `${pages} pages · ${controllers} controllers · ${errors} errors · ${warnings} warnings`,
  status: { complete: 'complete', progress: 'in progress', error: 'with errors', new: 'new' } as Record<ModuleStatus, string>,
  statusOne: { complete: 'complete', progress: 'in progress', error: 'with errors', new: 'new' } as Record<ModuleStatus, string>,
  stage: { spec: 'Spec', pages: 'Pages', backend: 'Backend', routes: 'Routes', tests: 'Tests' } as Record<StageId, string>,
  state: { done: 'done', progress: 'in progress', error: 'error', none: 'not started', unknown: 'unknown format' } as Record<StageState, string>,
  pagesCount: (count: number) => `${count} page${count === 1 ? '' : 's'}`,
  actorsCount: (count: number) => `${count} actor${count === 1 ? '' : 's'}`,
  errorsCount: (count: number) => `${count} error${count === 1 ? '' : 's'}`,
  warningsCount: (count: number) => `${count} warning${count === 1 ? '' : 's'}`,
  checkWarnings: (count: number) => `${count} check warning${count === 1 ? '' : 's'}`,
  lastChange: 'last change',
  see: 'see',
  hide: 'hide',
  open: 'open',
  copyCommand: 'copy command',
  commandCopied: (command: string) => `Copied: ${command} — run it in the agent.`,
  pathCopied: (path: string) => `Copied: ${path}`,
  fileMissing: (path: string) => `Not in the project: ${path}`,
  pages: 'Pages',
  problems: 'Problems',
  notMaterialized: 'not materialized',
  openFile: 'Open the file',
  openPage: 'Open in the app',
  contractPending: 'Contract L2 ↔ L1 not checked yet.',
  checkContract: 'Check contract',
  contractOk: 'Contract L2 ↔ L1: every route is called and handled.',
  emptyTitle: 'This project has no modules yet.',
  emptyHint: 'Start with the new solution agent.',
  allDone: 'Every module is complete.',
  noMatch: 'No module matches.',
  configUnreadable: 'l5/config.json could not be read: routes and tests are not shown.',
  problem: {
    'step-failed': 'Pipeline step failed',
    'spec-check': 'Spec check failed',
    'not-materialized': 'Not materialized yet',
    'page-not-approved': 'Page not approved by the materializer',
    'config-not-written': 'Pages not written to l5/config.json',
    'unit-open': 'Backend unit open',
    'not-compiled': 'Generated, not proven by a compiler',
    'missing-unit': 'Backend unit missing',
    'def-problem': 'Def not planned',
    'not-registered': 'Module not registered in the backend',
    'controllers-not-in-config': 'Controllers not in l5/config.json',
    config: 'Config',
    'pages-without-test': 'Pages without a test',
    'route-missing-backend': 'The page calls a route the backend does not have',
    'route-not-called': 'Contract route the page never calls',
  } as Record<ProblemCode, string>,
  issue: {
    required: 'Required',
    'wrong-type': 'Wrong type',
    'duplicate-key': 'Repeated',
    'duplicate-route': 'Repeated route',
    'route-outside-module': 'Route outside the module basePath',
    'missing-file': 'File not found',
    'missing-dir': 'Folder not found',
    'orphan-page': 'Page file without a route',
    menu: 'Menu',
  } as Record<string, string>,
  menuIssue: {
    'nav-without-page': 'menu item without a page',
    'title-differs': 'route title differs from the menu label',
    'href-differs': 'menu link differs from the page route',
    'actors-differ': 'roles of the menu item differ from the page',
    'landing-orphan': 'start page of a role that does not see it',
    'landing-flag-differs': 'start-page mark out of date',
  } as Record<string, string>,
  summaryHead: (project: number, percent: number, modules: number) => `Project ${project} — ${percent}% ready · ${modules} modules`,
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
  en: message_en,
  pt: {
    title: 'Visão dos módulos',
    noProject: 'Selecione um projeto primeiro.',
    reload: 'Recarregar',
    checkAll: 'Verificar tudo',
    checking: 'Verificando…',
    copySummary: 'Copiar resumo',
    copied: 'Resumo copiado.',
    search: 'Buscar módulo…',
    modules: (count: number) => `${count} módulo${count === 1 ? '' : 's'}`,
    totals: (pages: number, controllers: number, errors: number, warnings: number) =>
      `${pages} páginas · ${controllers} controllers · ${errors} erros · ${warnings} avisos`,
    status: { complete: 'completos', progress: 'em andamento', error: 'com erro', new: 'novos' } as Record<ModuleStatus, string>,
    statusOne: { complete: 'completo', progress: 'em andamento', error: 'com erro', new: 'novo' } as Record<ModuleStatus, string>,
    stage: { spec: 'Spec', pages: 'Páginas', backend: 'Backend', routes: 'Rotas', tests: 'Testes' } as Record<StageId, string>,
    state: { done: 'pronto', progress: 'em andamento', error: 'erro', none: 'não começou', unknown: 'formato desconhecido' } as Record<StageState, string>,
    pagesCount: (count: number) => `${count} página${count === 1 ? '' : 's'}`,
    actorsCount: (count: number) => `${count} ator${count === 1 ? '' : 'es'}`,
    errorsCount: (count: number) => `${count} erro${count === 1 ? '' : 's'}`,
    warningsCount: (count: number) => `${count} aviso${count === 1 ? '' : 's'}`,
    checkWarnings: (count: number) => `${count} aviso${count === 1 ? '' : 's'} de verificação`,
    lastChange: 'última mudança',
    see: 'ver',
    hide: 'fechar',
    open: 'abrir',
    copyCommand: 'copiar comando',
    commandCopied: (command: string) => `Copiado: ${command} — rode no agente.`,
    pathCopied: (path: string) => `Copiado: ${path}`,
    fileMissing: (path: string) => `Não está no projeto: ${path}`,
    pages: 'Páginas',
    problems: 'Problemas',
    notMaterialized: 'não materializada',
    openFile: 'Abrir o arquivo',
    openPage: 'Abrir no app',
    contractPending: 'Contrato L2 ↔ L1 ainda não verificado.',
    checkContract: 'Verificar contrato',
    contractOk: 'Contrato L2 ↔ L1: toda rota é chamada e atendida.',
    emptyTitle: 'Este projeto ainda não tem módulos.',
    emptyHint: 'Comece pelo agente de nova solução.',
    allDone: 'Todos os módulos estão completos.',
    noMatch: 'Nenhum módulo encontrado.',
    configUnreadable: 'Não foi possível ler o l5/config.json: rotas e testes não aparecem.',
    problem: {
      'step-failed': 'Passo do pipeline falhou',
      'spec-check': 'Verificação da spec falhou',
      'not-materialized': 'Ainda não materializado',
      'page-not-approved': 'Página não aprovada pelo materializador',
      'config-not-written': 'Páginas não gravadas no l5/config.json',
      'unit-open': 'Unidade do backend em aberto',
      'not-compiled': 'Gerado, sem prova do compilador',
      'missing-unit': 'Unidade do backend faltando',
      'def-problem': 'Def não planejada',
      'not-registered': 'Módulo não registrado no backend',
      'controllers-not-in-config': 'Controllers fora do l5/config.json',
      config: 'Config',
      'pages-without-test': 'Páginas sem teste',
      'route-missing-backend': 'A página chama uma rota que o backend não tem',
      'route-not-called': 'Rota do contrato que a página nunca chama',
    } as Record<ProblemCode, string>,
    issue: {
      required: 'Obrigatório',
      'wrong-type': 'Tipo errado',
      'duplicate-key': 'Repetido',
      'duplicate-route': 'Rota repetida',
      'route-outside-module': 'Rota fora do basePath do módulo',
      'missing-file': 'Arquivo não encontrado',
      'missing-dir': 'Pasta não encontrada',
      'orphan-page': 'Página sem rota',
      menu: 'Menu',
    } as Record<string, string>,
    menuIssue: {
      'nav-without-page': 'item do menu sem página',
      'title-differs': 'título da rota diferente do rótulo do menu',
      'href-differs': 'link do menu diferente da rota da página',
      'actors-differ': 'papéis do item do menu diferentes dos da página',
      'landing-orphan': 'página inicial de um papel que não a vê',
      'landing-flag-differs': 'marca de página inicial desatualizada',
    } as Record<string, string>,
    summaryHead: (project: number, percent: number, modules: number) => `Projeto ${project} — ${percent}% pronto · ${modules} módulos`,
  },
};
/// **collab_i18n_end**

export const pluginData: mls.plugin.IPluginData = {
  title: 'Modules Dashboard',
  getSvg(): TemplateResult {
    return svg`
      <svg height="22px" width="22px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3.5a8.5 8.5 0 1 1-8.5 8.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M3.5 12A8.5 8.5 0 0 1 12 3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="1.5 2.5"/>
        <path d="M8.5 15.5v-3M12 15.5v-6M15.5 15.5v-4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
    `;
  },
};

// ── the four states, always the same color and always with an icon ──────────

type Tone = 'done' | 'progress' | 'error' | 'none';
const toneOf = (state: StageState): Tone => state === 'unknown' ? 'none' : state;
const STATUS_TONE: Record<ModuleStatus, Tone> = { complete: 'done', progress: 'progress', error: 'error', new: 'none' };
const ICON: Record<Tone, string> = { done: '✓', progress: '◐', error: '!', none: '○' };
const DOT: Record<Tone, string> = {
  done: 'bg-emerald-500 text-white border-emerald-500',
  progress: 'bg-amber-400 text-amber-950 border-amber-400',
  error: 'bg-rose-500 text-white border-rose-500',
  none: 'bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 border-gray-300 dark:border-gray-700',
};
const TEXT: Record<Tone, string> = {
  done: 'text-emerald-600 dark:text-emerald-400',
  progress: 'text-amber-600 dark:text-amber-300',
  error: 'text-rose-600 dark:text-rose-400',
  none: 'text-gray-500 dark:text-gray-400',
};
const BAR: Record<Tone, string> = { done: 'bg-emerald-500', progress: 'bg-amber-400', error: 'bg-rose-500', none: 'bg-gray-300 dark:bg-gray-700' };
const STROKE: Record<Tone, string> = { done: 'stroke-emerald-500', progress: 'stroke-amber-400', error: 'stroke-rose-500', none: 'stroke-gray-300 dark:stroke-gray-700' };
const LINE: Record<Tone, string> = { done: 'border-emerald-500', progress: 'border-amber-400', error: 'border-rose-500', none: 'border-gray-300 dark:border-gray-700' };

const CARD = 'rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 shadow-sm';
const BUTTON = 'rounded-md border border-gray-300 dark:border-gray-700 px-2.5 py-1 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400';
const LINK = 'text-xs text-cyan-700 dark:text-cyan-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded';
const GLOW = 'shadow-[0_0_10px_rgba(34,211,238,0.55)]';

type Width = 'wide' | 'medium' | 'narrow';
const APP_CONFIG = '_102020_/l2/aura/plugins/pluginAppConfig';

interface ContractCache { signature: string; rows: RouteRow[] }

@customElement('aura--plugins--plugin-modules-dashboard-102020')
export class PluginModulesDashboard extends PluginBaseModule {

  @property({ type: Boolean }) autoPrepare = false;
  @property({ type: String }) msize = '';
  /** Project shown (selectProject sets it); `mls.actualProject` is only the fallback. */
  @property({ type: Number }) project = 0;

  @state() private _projectId = 0;
  @state() private _dashboard: Dashboard | undefined;
  @state() private _loading = false;
  @state() private _error = '';
  @state() private _notice = '';
  @state() private _configUnreadable = false;
  @state() private _filter: ModuleStatus | '' = '';
  @state() private _search = '';
  @state() private _expanded = new Set<string>();
  @state() private _checking = new Set<string>();
  @state() private _width: Width = 'medium';
  /** False on the first frame, so the bars and the ring fill instead of appearing full. */
  @state() private _filled = false;

  private msg: MessageType = message_en;
  private _config: Json = undefined;
  private _issues: Issue[] = [];
  private _files: Record<string, Json> = {};
  private _paths: string[] = [];
  private _contracts = new Map<string, ContractCache>();
  private _resize: ResizeObserver | undefined;

  createRenderRoot() {
    return this;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._resize = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width ?? 0;
      const next: Width = width >= 760 ? 'wide' : width >= 440 ? 'medium' : 'narrow';
      if (next !== this._width) this._width = next;
    });
    this._resize.observe(this);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resize?.disconnect();
  }

  firstUpdated() {
    if (this.autoPrepare) void this.prepare();
  }

  willUpdate(changed: Map<string, unknown>) {
    if (this._projectId && changed.has('project') && Number(this.project) !== this._projectId) void this.prepare();
  }

  async prepare(): Promise<void> {
    this.msg = messages[this.getMessageKey(messages)] ?? message_en;
    this._projectId = Number(this.project) || mls.actualProject || 0;
    if (!this._projectId) return;
    this._contracts.clear();
    this._expanded = new Set();
    await ensureProjectLoaded(this._projectId);
    await this._reload();
  }

  // ── reading the stor ─────────────────────────────────────────────────────

  private _projectFiles(): mls.stor.IFileInfo[] {
    return (Object.values(mls.stor.files) as mls.stor.IFileInfo[])
      .filter(file => file && file.project === this._projectId && file.status !== 'deleted');
  }

  private static _pathOf(file: mls.stor.IFileInfo): string {
    return `l${file.level}/${file.folder ? `${file.folder}/` : ''}${file.shortName}${file.extension}`;
  }

  private async _reload(): Promise<void> {
    this._loading = true;
    this._error = '';
    this._notice = '';
    this._filled = false;
    try {
      const files = this._projectFiles();
      this._paths = files.filter(file => file.level === 1 || file.level === 2).map(PluginModulesDashboard._pathOf);
      const pipeline = files.filter(file => PIPELINE_FILE.test(PluginModulesDashboard._pathOf(file)));
      const read = await Promise.all(pipeline.map(async file => {
        try {
          return [PluginModulesDashboard._pathOf(file), JSON.parse(String(await file.getContent()))] as const;
        } catch {
          return [PluginModulesDashboard._pathOf(file), UNREADABLE] as const;
        }
      }));
      this._files = Object.fromEntries(read);
      try {
        this._config = await readConfig(this._projectId);
        this._issues = validateConfig(this._config, this._projectId, storValidationEnv(this._projectId));
        this._configUnreadable = false;
      } catch {
        this._config = undefined;
        this._issues = [];
        this._configUnreadable = true;
      }
      this._rebuild();
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
    } finally {
      this._loading = false;
      requestAnimationFrame(() => requestAnimationFrame(() => { this._filled = true; }));
    }
  }

  /** The dashboard from what is loaded, with the contract rows still valid for their files. */
  private _rebuild(): void {
    const contracts: Record<string, RouteRow[]> = {};
    for (const [moduleId, cached] of this._contracts) {
      if (cached.signature === this._contractSignature(moduleId)) contracts[moduleId] = cached.rows;
      else this._contracts.delete(moduleId);
    }
    this._dashboard = buildDashboard({
      projectId: this._projectId, config: this._config, configIssues: this._issues, files: this._files, paths: this._paths, contracts,
    });
  }

  // ── contract check (heavy, on demand, cached) ────────────────────────────

  private _contractFiles(moduleId: string): { contracts: mls.stor.IFileInfo[]; shared: mls.stor.IFileInfo[]; controllers: mls.stor.IFileInfo[] } {
    const files = this._projectFiles();
    const under = (level: number, folder: string, extension: string) =>
      files.filter(file => file.level === level && file.folder === `${moduleId}/${folder}` && file.extension === extension);
    return {
      contracts: under(2, 'web/contracts', '.defs.ts'),
      shared: under(2, 'web/shared', '.ts'),
      controllers: under(1, 'layer_1_external/adapters/http/controllers', '.defs.ts'),
    };
  }

  /** Changes when any file the check read changes (or is being edited), so a stale result is dropped. */
  private _contractSignature(moduleId: string): string {
    const { contracts, shared, controllers } = this._contractFiles(moduleId);
    return contractSignature([...contracts, ...shared, ...controllers].map(file => ({
      path: PluginModulesDashboard._pathOf(file),
      version: `${file.versionRef ?? ''}:${file.updatedAt ?? ''}:${file.inLocalStorage ? 'edit' : ''}`,
    })));
  }

  private _hasContracts(moduleId: string): boolean {
    return this._contractFiles(moduleId).contracts.length > 0;
  }

  private async _checkContract(moduleId: string): Promise<void> {
    if (this._checking.has(moduleId) || !this._hasContracts(moduleId)) return;
    this._checking = new Set([...this._checking, moduleId]);
    try {
      const { contracts, shared, controllers } = this._contractFiles(moduleId);
      const read = (files: mls.stor.IFileInfo[]): Promise<ContractSource[]> => Promise.all(files.map(async file => ({
        project: file.project, folder: file.folder, shortName: file.shortName, extension: file.extension, content: String(await file.getContent()),
      })));
      const rows = checkContractRoutes(await read(contracts), await read(shared), await read(controllers));
      this._contracts.set(moduleId, { signature: this._contractSignature(moduleId), rows });
      this._rebuild();
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
    } finally {
      const next = new Set(this._checking);
      next.delete(moduleId);
      this._checking = next;
    }
  }

  private async _checkAll(): Promise<void> {
    const modules = this._dashboard?.modules.map(module => module.moduleId) ?? [];
    for (const moduleId of modules) {
      if (!this._contracts.has(moduleId)) await this._checkContract(moduleId);
    }
  }

  private _toggle(moduleId: string): void {
    const next = new Set(this._expanded);
    if (next.has(moduleId)) next.delete(moduleId);
    else {
      next.add(moduleId);
      if (!this._contracts.has(moduleId)) void this._checkContract(moduleId);
    }
    this._expanded = next;
  }

  // ── where a click goes ───────────────────────────────────────────────────

  private _storFile(project: number, path: string): mls.stor.IFileInfo | undefined {
    const match = /^l(\d)\/(.+)$/.exec(path.replace(/^\.?\//, ''));
    if (!match) return undefined;
    const level = Number(match[1]);
    const slash = match[2].lastIndexOf('/');
    const folder = slash < 0 ? '' : match[2].slice(0, slash);
    const name = match[2].slice(slash + 1);
    const dot = name.indexOf('.');
    if (dot <= 0) return undefined;
    const key = mls.stor.getKeyToFiles(project, level, name.slice(0, dot), folder, name.slice(dot));
    return mls.stor.files[key];
  }

  private async _copy(text: string, notice: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this._notice = notice;
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
    }
  }

  /**
   * A source file opens in the editor of its level (as serviceL2Validator._goToBackendFile does:
   * model first, then mls.actual, then the FileAction); anything else (a pipeline .json) opens in the
   * file viewer of the details panel, the same one the file explorer uses.
   */
  private async _openFile(project: number, path: string): Promise<void> {
    const file = this._storFile(project, path);
    if (!file) {
      this._notice = this.msg.fileMissing(path);
      return;
    }
    if ((file.level === 1 || file.level === 2) && file.extension.endsWith('.ts')) {
      const position: 'left' | 'right' = 'left';
      await openService(file.level === 1 ? '_100554_serviceSourceL1' : '_100554_serviceSource', position, file.level);
      await createModel(file, true, false);
      const name = file.folder ? `_${file.project}_${file.folder}/${file.shortName}` : `_${file.project}_${file.shortName}`;
      mls.actual[file.level].setFullName(name);
      mls.actual[file.level][position] = file;
      const params: mls.events.IFileAction = {
        action: 'open', level: file.level, project: file.project, shortName: file.shortName, folder: file.folder, extension: file.extension, position,
      };
      mls.events.fire([file.level], ['FileAction'], JSON.stringify(params), 0);
      return;
    }
    const url = '/_100555_/l2/pluginView/pluginViewFile.js';
    await import(url);
    const viewer = document.createElement('plugin-view--plugin-view-file-100555');
    viewer.setAttribute('nameFile', mls.stor.getKeyToFile(file));
    openElementInServiceDetails(viewer);
  }

  /** The App Config in the details panel, opened on the field. */
  private async _openConfig(path: Array<string | number>): Promise<void> {
    await import(`/${APP_CONFIG}.js`);
    const element = document.createElement('aura--plugins--plugin-app-config-102020');
    element.setAttribute('autoPrepare', 'true');
    element.setAttribute('project', String(this._projectId));
    element.setAttribute('focusPath', JSON.stringify(path));
    openElementInServiceDetails(element);
  }

  private _command(target: Extract<Target, { kind: 'agent' }>): string {
    return `${target.agent} ${target.module}`;
  }

  private async _go(target: Target): Promise<void> {
    this._notice = '';
    if (target.kind === 'file') return this._openFile(target.project, target.path);
    if (target.kind === 'config') return this._openConfig(target.path);
    if (target.file) return this._openFile(this._projectId, target.file);
    return this._copy(this._command(target), this.msg.commandCopied(this._command(target)));
  }

  private async _openPage(page: PageRow): Promise<void> {
    if (!page.source) return;
    const match = /^l2\/(.+)\/([^/]+)\.ts$/.exec(page.source);
    if (!match) return;
    await navigateAppToPage({ project: this._projectId, folder: match[1], shortName: match[2] }, this._projectId);
  }

  // ── text ─────────────────────────────────────────────────────────────────

  private _problemText(problem: Problem): string {
    if (problem.code !== 'config' || !problem.issue) return this.msg.problem[problem.code];
    const issue = problem.issue;
    if (issue.code === 'menu' && issue.menuIssue) return `${this.msg.issue.menu}: ${this.msg.menuIssue[issue.menuIssue.code] ?? issue.menuIssue.code}`;
    return this.msg.issue[issue.code] ?? issue.code;
  }

  private _ago(iso: string | undefined): string {
    if (!iso) return '';
    const days = Math.round((Date.parse(iso) - Date.now()) / 86_400_000);
    if (!Number.isFinite(days)) return '';
    const lang = this.getMessageKey(messages) === 'pt' ? 'pt-BR' : 'en';
    const format = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
    if (Math.abs(days) < 1) return format.format(Math.round((Date.parse(iso) - Date.now()) / 3_600_000), 'hour');
    if (Math.abs(days) < 45) return format.format(days, 'day');
    return format.format(Math.round(days / 30), 'month');
  }

  /** Tooltip of a trail point: the stage, its state and its steps (`module10 ✓ · ontology30 ◐ …`). */
  private _stageTitle(stage: Stage): string {
    const stepIcon = (status: string) => status === 'approved' ? ICON.done : status === 'failed' || status === 'unavailable' ? ICON.error : ICON.progress;
    const steps = stage.steps.map(step => `${step.id} ${stepIcon(step.status)}`).join(' · ');
    const last = stage.steps.map(step => step.updatedAt ?? '').filter(Boolean).sort().pop();
    return [
      `${this.msg.stage[stage.id]} — ${this.msg.state[stage.state]}`,
      steps,
      stage.checkWarnings ? this.msg.checkWarnings(stage.checkWarnings) : '',
      last ? `${this.msg.lastChange}: ${new Date(last).toLocaleString()}` : '',
    ].filter(Boolean).join('\n');
  }

  private _summary(): string {
    const dashboard = this._dashboard;
    if (!dashboard) return '';
    const lines = [
      this.msg.summaryHead(dashboard.projectId, dashboard.percent, dashboard.modules.length),
      (['complete', 'progress', 'error', 'new'] as ModuleStatus[]).map(status => `${ICON[STATUS_TONE[status]]} ${dashboard.counts[status]} ${this.msg.status[status]}`).join(' · '),
      '',
    ];
    for (const module of dashboard.modules) {
      const trail = STAGE_IDS.map(id => `${this.msg.stage[id]} ${ICON[toneOf(module.stages[id].state)]}`).join(' ');
      const errors = module.problems.filter(problem => problem.severity === 'error').length;
      const warnings = module.problems.length - errors;
      const counts = [errors ? this.msg.errorsCount(errors) : '', warnings ? this.msg.warningsCount(warnings) : ''].filter(Boolean).join(', ');
      lines.push(`${ICON[STATUS_TONE[module.status]]} ${module.moduleId} ${module.percent}% — ${trail}${counts ? ` — ${counts}` : ''}`);
    }
    return lines.join('\n');
  }

  // ── rendering: the summary ───────────────────────────────────────────────

  private _renderRing(dashboard: Dashboard): TemplateResult {
    const size = this._width === 'narrow' ? 76 : 104;
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const total = Object.values(dashboard.stageMix).reduce((sum, count) => sum + count, 0) || 1;
    let offset = 0;
    const segments = (['done', 'progress', 'error', 'none'] as Tone[]).map(tone => {
      const length = this._filled ? circumference * dashboard.stageMix[tone] / total : 0;
      const segment = svg`<circle cx="50" cy="50" r=${radius} fill="none" stroke-width="9" class="${STROKE[tone]} transition-all duration-300"
        stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset=${-offset}></circle>`;
      offset += length;
      return segment;
    });
    const allDone = dashboard.modules.length > 0 && dashboard.counts.complete === dashboard.modules.length;
    return html`
      <div class="relative shrink-0 rounded-full ${allDone ? GLOW : ''}" style="width:${size}px;height:${size}px"
        role="img" aria-label=${`${dashboard.percent}%`}>
        <svg viewBox="0 0 100 100" class="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r=${radius} fill="none" stroke-width="9" class="stroke-gray-100 dark:stroke-gray-800"></circle>
          ${segments}
        </svg>
        <span class="absolute inset-0 flex items-center justify-center font-semibold tabular-nums ${this._width === 'narrow' ? 'text-lg' : 'text-2xl'}">${dashboard.percent}%</span>
      </div>
    `;
  }

  private _renderPill(status: ModuleStatus, count: number): TemplateResult {
    const tone = STATUS_TONE[status];
    const active = this._filter === status;
    return html`
      <button type="button" aria-pressed=${active ? 'true' : 'false'}
        class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition
          ${active ? `border-cyan-400 ring-1 ring-cyan-400 ${GLOW}` : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}
          focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        @click=${() => { this._filter = active ? '' : status; }}>
        <span class="inline-flex items-center justify-center w-4 h-4 rounded-full border text-[10px] ${DOT[tone]}">${ICON[tone]}</span>
        <span class="font-semibold tabular-nums">${count}</span>
        <span class="text-gray-600 dark:text-gray-300">${this.msg.status[status]}</span>
      </button>
    `;
  }

  private _renderSummary(dashboard: Dashboard): TemplateResult {
    const { totals } = dashboard;
    return html`
      <section class="${CARD} p-4 flex ${this._width === 'narrow' ? 'flex-col items-start' : 'items-center'} gap-4">
        ${this._renderRing(dashboard)}
        <div class="flex flex-col gap-2 min-w-0 flex-1">
          <div class="flex items-baseline gap-2 flex-wrap">
            <h2 class="text-base font-semibold">${this._projectId}</h2>
            <span class="text-sm text-gray-500 dark:text-gray-400">${this.msg.modules(dashboard.modules.length)}</span>
          </div>
          <div class="flex flex-wrap gap-1.5">
            ${(['complete', 'progress', 'error', 'new'] as ModuleStatus[]).map(status => this._renderPill(status, dashboard.counts[status]))}
          </div>
          <span class="text-xs text-gray-500 dark:text-gray-400">${this.msg.totals(totals.pages, totals.controllers, totals.errors, totals.warnings)}</span>
        </div>
      </section>
    `;
  }

  private _renderToolbar(): TemplateResult {
    const busy = this._checking.size > 0;
    return html`
      <div class="flex items-center gap-2 flex-wrap">
        <span class="w-5 h-5 text-cyan-500 dark:text-cyan-400">${pluginData.getSvg()}</span>
        <h1 class="text-sm font-semibold">${this.msg.title}</h1>
        <input type="search" class="ml-auto w-40 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400"
          placeholder=${this.msg.search} aria-label=${this.msg.search} .value=${this._search}
          @input=${(event: Event) => { this._search = (event.target as HTMLInputElement).value; }}>
        <button type="button" class=${BUTTON} ?disabled=${busy || this._loading} @click=${() => void this._checkAll()}>${busy ? this.msg.checking : this.msg.checkAll}</button>
        <button type="button" class=${BUTTON} ?disabled=${!this._dashboard} @click=${() => void this._copy(this._summary(), this.msg.copied)}>${this.msg.copySummary}</button>
        <button type="button" class=${BUTTON} ?disabled=${this._loading} @click=${() => void this._reload()}>${this.msg.reload}</button>
      </div>
    `;
  }

  // ── rendering: a module ──────────────────────────────────────────────────

  private _renderTrail(module: ModuleRow, compact: boolean): TemplateResult {
    const names = !compact && this._width !== 'narrow';
    const stages = STAGE_IDS.map(id => module.stages[id]);
    return html`
      <ol class="flex items-start w-full" aria-label=${STAGE_IDS.map(id => `${this.msg.stage[id]}: ${this.msg.state[module.stages[id].state]}`).join(', ')}>
        ${stages.map((stage, index) => {
          const tone = toneOf(stage.state);
          const next = stages[index + 1];
          // Solid where the next stage was reached, dotted where it was not yet.
          const reached = next && next.state !== 'none' && next.state !== 'unknown';
          return html`
            <li class="flex items-start ${next ? 'flex-1' : ''}" title=${this._stageTitle(stage)}>
              <div class="flex flex-col items-center gap-1 shrink-0">
                <span class="relative inline-flex items-center justify-center ${compact ? 'w-4 h-4 text-[9px]' : 'w-6 h-6 text-xs'} rounded-full border-2 font-bold ${DOT[tone]}">
                  ${stage.state === 'progress' ? html`<span class="absolute inset-0 rounded-full bg-amber-400/60 animate-ping [animation-duration:2.4s]"></span>` : nothing}
                  <span class="relative">${stage.state === 'unknown' ? '?' : ICON[tone]}</span>
                </span>
                ${names ? html`<span class="text-[10px] ${stage.state === 'none' ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}">${this.msg.stage[stage.id]}</span>` : nothing}
              </div>
              ${next ? html`<span class="flex-1 mx-1 ${compact ? 'mt-[7px]' : 'mt-[11px]'} border-t-2 ${reached ? `border-solid ${LINE[tone]}` : 'border-dashed border-gray-300 dark:border-gray-700'}"></span>` : nothing}
            </li>
          `;
        })}
      </ol>
    `;
  }

  private _renderStatus(module: ModuleRow): TemplateResult {
    const tone = STATUS_TONE[module.status];
    return html`
      <span class="inline-flex items-center gap-1 text-xs ${TEXT[tone]}">
        <span class="inline-flex items-center justify-center w-4 h-4 rounded-full border text-[10px] ${DOT[tone]}">${ICON[tone]}</span>
        ${this.msg.statusOne[module.status]}
      </span>
      <span class="text-sm font-semibold tabular-nums w-11 text-right">${module.percent}%</span>
    `;
  }

  private _renderCompact(module: ModuleRow): TemplateResult {
    return html`
      <article class="${CARD} px-3 py-2 flex items-center gap-3">
        <button type="button" class="text-sm font-medium truncate text-left hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded"
          @click=${() => this._toggle(module.moduleId)}>${module.moduleId}</button>
        <div class="flex-1 min-w-[90px] max-w-[180px]">${this._renderTrail(module, true)}</div>
        <span class="ml-auto flex items-center gap-2">${this._renderStatus(module)}</span>
      </article>
    `;
  }

  private _renderCard(module: ModuleRow): TemplateResult {
    const expanded = this._expanded.has(module.moduleId);
    if (module.status === 'complete' && !expanded) return this._renderCompact(module);
    const tone = STATUS_TONE[module.status];
    const errors = module.problems.filter(problem => problem.severity === 'error').length;
    const warnings = module.problems.length - errors;
    const meta = [
      module.basePath,
      this.msg.pagesCount(module.pages.filter(page => page.materialized).length || module.pages.length),
      module.actors ? this.msg.actorsCount(module.actors) : '',
      module.lastUpdated ? `${this.msg.lastChange} ${this._ago(module.lastUpdated)}` : '',
    ].filter(Boolean);
    return html`
      <article class="${CARD} p-3 flex flex-col gap-3 ${expanded && this._width === 'wide' ? 'col-span-2' : ''}">
        <header class="flex items-start gap-2">
          <div class="flex flex-col min-w-0">
            <h3 class="text-sm font-semibold truncate">${module.moduleId}</h3>
            <span class="text-[11px] text-gray-500 dark:text-gray-400 truncate">${meta.join(' · ')}</span>
          </div>
          <span class="ml-auto flex items-center gap-2 shrink-0">${this._renderStatus(module)}</span>
        </header>
        <div class="h-1 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div class="h-full rounded-full ${BAR[tone]} transition-[width] duration-300 ease-out" style="width:${this._filled ? module.percent : 0}%"></div>
        </div>
        ${this._renderTrail(module, false)}
        <footer class="flex items-center gap-3 text-xs flex-wrap">
          ${errors ? html`<span class="${TEXT.error}">✕ ${this.msg.errorsCount(errors)}</span>` : nothing}
          ${warnings ? html`<span class="${TEXT.progress}">⚠ ${this.msg.warningsCount(warnings)}</span>` : nothing}
          ${this._checking.has(module.moduleId) ? html`<span class="text-gray-400 animate-pulse">${this.msg.checking}</span>` : nothing}
          <button type="button" class="ml-auto ${LINK}" aria-expanded=${expanded ? 'true' : 'false'} @click=${() => this._toggle(module.moduleId)}>
            ${expanded ? this.msg.hide : `${this.msg.see} ›`}
          </button>
        </footer>
        ${expanded ? this._renderDetail(module) : nothing}
      </article>
    `;
  }

  private _renderPage(page: PageRow): TemplateResult {
    const tone: Tone = page.state === 'warning' ? 'progress' : page.state;
    return html`
      <li class="flex items-center gap-2 py-1 text-xs">
        <span class="inline-flex items-center justify-center w-4 h-4 rounded-full border text-[9px] ${DOT[tone]}">${ICON[tone]}</span>
        ${page.materialized && page.source ? html`
          <button type="button" class="font-medium hover:underline text-left truncate focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded"
            title=${this.msg.openPage} @click=${() => void this._openPage(page)}>${page.title ?? page.pageId}</button>
          <span class="font-mono text-[11px] text-gray-500 dark:text-gray-400 truncate">${page.route ?? ''}</span>
          <button type="button" class="ml-auto shrink-0 text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded"
            title=${this.msg.openFile} aria-label=${`${this.msg.openFile}: ${page.source}`}
            @click=${() => void this._openFile(this._projectId, page.source!)}>&lt;/&gt;</button>
          ${page.problems ? html`<span class="shrink-0 ${TEXT[tone]}">${ICON[tone]} ${page.problems}</span>` : nothing}
        ` : html`
          <span class="text-gray-500 dark:text-gray-400">${page.title ?? page.pageId}</span>
          <span class="italic text-gray-400 dark:text-gray-500">(${this.msg.notMaterialized})</span>
        `}
      </li>
    `;
  }

  private _renderProblem(problem: Problem): TemplateResult {
    const error = problem.severity === 'error';
    const target = problem.target;
    return html`
      <li class="flex items-start gap-2 py-1.5 text-xs border-t border-gray-100 dark:border-gray-800 first:border-t-0">
        <span class="shrink-0 ${error ? TEXT.error : TEXT.progress}">${error ? '✕' : '⚠'}</span>
        <div class="flex flex-col min-w-0 flex-1">
          <span><span class="text-gray-400 dark:text-gray-500">${this.msg.stage[problem.stage]} ·</span> ${this._problemText(problem)}${problem.pageId && problem.code !== 'page-not-approved' ? html` <span class="font-mono text-gray-500">${problem.pageId}</span>` : nothing}</span>
          ${problem.detail ? html`<span class="font-mono text-[11px] text-gray-500 dark:text-gray-400 break-all line-clamp-2" title=${problem.detail}>${problem.detail}</span>` : nothing}
        </div>
        ${target ? html`
          <span class="shrink-0 flex items-center gap-2">
            ${target.kind === 'agent' && target.file ? html`
              <button type="button" class=${LINK} @click=${() => void this._copy(this._command(target), this.msg.commandCopied(this._command(target)))}>${this.msg.copyCommand}</button>
            ` : nothing}
            <button type="button" class=${LINK} @click=${() => void this._go(target)}>${target.kind === 'agent' && !target.file ? this.msg.copyCommand : `${this.msg.open} ›`}</button>
          </span>
        ` : nothing}
      </li>
    `;
  }

  private _renderDetail(module: ModuleRow): TemplateResult {
    const errors = module.problems.filter(problem => problem.severity === 'error');
    const warnings = module.problems.filter(problem => problem.severity === 'warning');
    const hasContracts = this._hasContracts(module.moduleId);
    const contractIssues = module.problems.some(problem => problem.code === 'route-missing-backend' || problem.code === 'route-not-called');
    return html`
      <div class="flex flex-col gap-3 border-t border-gray-100 dark:border-gray-800 pt-3 ${this._width === 'wide' ? 'grid grid-cols-2 gap-4' : ''}">
        ${module.pages.length ? html`
          <section class="flex flex-col">
            <h4 class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">${this.msg.pages}</h4>
            <ul>${module.pages.map(page => this._renderPage(page))}</ul>
          </section>
        ` : nothing}
        <section class="flex flex-col">
          <h4 class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">${this.msg.problems}</h4>
          <ul>${[...errors, ...warnings].map(problem => this._renderProblem(problem))}</ul>
          ${hasContracts ? html`
            <p class="mt-2 text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2">
              ${this._checking.has(module.moduleId) ? html`<span class="animate-pulse">${this.msg.checking}</span>`
                : module.contractChecked ? (contractIssues ? nothing : html`<span class="${TEXT.done}">✓ ${this.msg.contractOk}</span>`)
                : html`<span>${this.msg.contractPending}</span>
                  <button type="button" class=${LINK} @click=${() => void this._checkContract(module.moduleId)}>${this.msg.checkContract}</button>`}
            </p>
          ` : nothing}
        </section>
      </div>
    `;
  }

  // ── rendering: the screen ────────────────────────────────────────────────

  private _renderSkeleton(): TemplateResult {
    const block = 'rounded bg-gray-100 dark:bg-gray-800';
    return html`
      <div class="flex flex-col gap-3 animate-pulse" aria-busy="true">
        <div class="${CARD} p-4 flex items-center gap-4">
          <div class="w-[104px] h-[104px] rounded-full ${block}"></div>
          <div class="flex-1 flex flex-col gap-2"><div class="h-4 w-1/3 ${block}"></div><div class="h-6 w-2/3 ${block}"></div><div class="h-3 w-1/2 ${block}"></div></div>
        </div>
        ${[0, 1, 2].map(() => html`
          <div class="${CARD} p-3 flex flex-col gap-3"><div class="h-4 w-1/4 ${block}"></div><div class="h-1 w-full ${block}"></div><div class="h-6 w-full ${block}"></div></div>
        `)}
      </div>
    `;
  }

  private _renderEmpty(): TemplateResult {
    return html`
      <div class="${CARD} p-8 flex flex-col items-center gap-3 text-center">
        <svg viewBox="0 0 64 64" class="w-16 h-16 text-gray-300 dark:text-gray-700" aria-hidden="true">
          <rect x="8" y="14" width="22" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2.5"/>
          <rect x="34" y="14" width="22" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="4 4"/>
          <rect x="8" y="34" width="22" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="4 4"/>
          <path d="M45 37v10M40 42h10" stroke="currentColor" class="text-cyan-400" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
        <p class="text-sm font-medium">${this.msg.emptyTitle}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">${this.msg.emptyHint}</p>
      </div>
    `;
  }

  private _visibleModules(dashboard: Dashboard): ModuleRow[] {
    const query = this._search.trim().toLowerCase();
    return dashboard.modules.filter(module =>
      (!this._filter || module.status === this._filter) && (!query || module.moduleId.toLowerCase().includes(query)));
  }

  private _renderBody(): TemplateResult {
    const dashboard = this._dashboard;
    if (this._loading && !dashboard) return this._renderSkeleton();
    if (!dashboard) return html`<p class="text-sm text-rose-700 dark:text-rose-300">${this._error}</p>`;
    if (!dashboard.modules.length) return this._renderEmpty();
    const visible = this._visibleModules(dashboard);
    const allDone = dashboard.counts.complete === dashboard.modules.length;
    return html`
      ${this._renderSummary(dashboard)}
      ${allDone ? html`<p class="text-sm text-center ${TEXT.done}">✓ ${this.msg.allDone}</p>` : nothing}
      ${this._configUnreadable ? html`<p class="text-xs ${TEXT.progress}">⚠ ${this.msg.configUnreadable}</p>` : nothing}
      ${visible.length ? html`
        <div class="${this._width === 'wide' ? 'grid grid-cols-2 gap-3 items-start' : 'flex flex-col gap-3'}">
          ${visible.map(module => this._renderCard(module))}
        </div>
      ` : html`<p class="text-sm italic text-gray-500 dark:text-gray-400">${this.msg.noMatch}</p>`}
    `;
  }

  render(): TemplateResult {
    this.msg = messages[this.getMessageKey(messages)] ?? message_en;
    if (!this._projectId) {
      return html`<p class="text-sm italic p-3 bg-white dark:bg-gray-950 text-gray-500 dark:text-gray-400">${this.msg.noProject}</p>`;
    }
    // Opaque background of its own: the details panel stays light while `.dark` is on (see the App Config).
    return html`
      <div class="flex flex-col gap-3 p-3 min-h-full bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-100">
        ${this._renderToolbar()}
        ${this._notice ? html`<p class="text-xs rounded-md border border-cyan-200 dark:border-cyan-900/60 bg-cyan-50 dark:bg-cyan-950/30 px-2.5 py-1.5 text-cyan-800 dark:text-cyan-200" role="status">${this._notice}</p>` : nothing}
        ${this._error && this._dashboard ? html`<p class="text-xs rounded-md border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1.5 text-rose-700 dark:text-rose-300" role="alert">${this._error}</p>` : nothing}
        ${this._renderBody()}
      </div>
    `;
  }
}
