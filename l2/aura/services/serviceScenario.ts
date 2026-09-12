/// <mls fileReference="_102020_/l2/aura/services/serviceScenario.ts" enhancement="_102027_/l2/enhancementLit"/>
// Puts the page on screen into a chosen state, so what is normally invisible can be seen and edited
// (TASK-102020-scenario-panel, phase 1).
//
// WHY IT WORKS WITH SO LITTLE CODE
// The page subscribes to `collabState` and its `handleIcaStateChange` ends in `requestUpdate()`, so a
// `setState` re-renders it in the simulated scenario immediately. And the causality is one-way — the
// action method WRITES the status (`setState(…,'loading')` → `execBff` → `setState(…,'success')`) and
// nothing reads the status to start a request, so simulating never calls the backend.
//
// WHAT IT IS FOR, in one number: of the 6.155 elements in the 34 real pages, 49,2% live inside a
// `${...}` and 371 are ALTERNATIVE branches — the error, success and "empty" messages (182 are a
// `<p>`). Those cannot be selected, let alone styled, because they are not in the tree.
//
// THE INVENTORY COMES FROM THE L4, not from the l2 `.defs.ts` (see scenarioCore for the measurement
// that authorises it: 34/34 pages derive exactly). Where there is no workspace the panel says so
// instead of guessing.

import { html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ServiceBase, IService, IToolbarContent, IServiceMenu } from '/_102027_/l2/serviceBase.js';
import { getState, setState } from '/_102029_/l2/collabState.js';
import { AuraInitState, getAuraState, moduleScopeTitle } from '/_102020_/l2/aura/helpers/auraState.js';
import { getContentByMlsPath } from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeStudio.js';
import {
  NO_VOCABULARY,
  describeAction,
  describeState,
  entityIdsOf,
  groupByAction,
  groupBySection,
  inputsWithoutWriter,
  operationIdsOf,
  parseEntity,
  parseOperation,
  parseWorkspace,
  scenarioKeys,
  type IL4Vocabulary,
  type IOntologyEntity,
  type IScenarioActionBlock,
  type IScenarioGroup,
  type IScenarioState,
  type IStateLabel,
  type IWorkspace,
  type IWorkspaceOperation,
} from '/_102020_/l2/aura/helpers/scenarioCore.js';

/// **collab_i18n_start**
const message_en = {
  svcTitle: 'Scenario',
  noPage: 'Open a page to simulate its states.',
  noWorkspace: 'This page has no l4 workspace: there is no declared state inventory to offer.',
  simulated: 'simulated',
  restore: 'restore',
  restoreAll: 'restore everything',
  overwritten: 'the app overwrote this',
  needsFixture: 'needs sample data (next phase)',
  noWriter: 'no control on this screen fills this',
  freeValue: 'value',
  sectionRest: 'Page',
  hint: 'Changing a state only changes what is rendered — it never calls the backend.',
  roleStatus: 'situation',
  roleError: 'error message',
  rolePageStatus: 'page situation',
  resultList: 'List of',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
  en: message_en,
  pt: {
    svcTitle: 'Cenário',
    noPage: 'Abra uma página para simular os estados dela.',
    noWorkspace: 'Esta página não tem workspace no l4: não há inventário de state declarado para oferecer.',
    simulated: 'simulado',
    restore: 'restaurar',
    restoreAll: 'restaurar tudo',
    overwritten: 'o app sobrescreveu',
    needsFixture: 'precisa de dado de exemplo (próxima fase)',
    noWriter: 'nenhum controle desta tela preenche isto',
    freeValue: 'valor',
    sectionRest: 'Página',
    hint: 'Trocar um estado só muda o que é renderizado — nunca chama o backend.',
    roleStatus: 'situação',
    roleError: 'mensagem de erro',
    rolePageStatus: 'situação da página',
    resultList: 'Lista de',
  },
  es: {
    svcTitle: 'Escenario',
    noPage: 'Abra una página para simular sus estados.',
    noWorkspace: 'Esta página no tiene workspace en el l4: no hay inventario de estado declarado.',
    simulated: 'simulado',
    restore: 'restaurar',
    restoreAll: 'restaurar todo',
    overwritten: 'la app lo sobrescribió',
    needsFixture: 'necesita datos de ejemplo (próxima fase)',
    noWriter: 'ningún control de esta pantalla lo rellena',
    freeValue: 'valor',
    sectionRest: 'Página',
    hint: 'Cambiar un estado solo cambia lo que se renderiza — nunca llama al backend.',
    roleStatus: 'situación',
    roleError: 'mensaje de error',
    rolePageStatus: 'situación de la página',
    resultList: 'Lista de',
  },
};
/// **collab_i18n_end**

/** What was there before the first simulated write, so restoring is exact. */
interface ISimulation {
  original: unknown;
  applied: unknown;
}

@customElement('aura--services--service-scenario-102020')
export class ServiceScenario102020 extends ServiceBase {

  public details: IService = {
    icon: '&#xf1de;',
    state: 'foreground',
    position: 'left',
    tooltip: 'Scenario',
    visible: true,
    widget: '_102020_/l2/aura/services/serviceScenario',
    level: [3],
  };

  public onClickMain(_op: string): void {
    if (this.menu.setMode) this.menu.setMode('initial');
  }

  public menu: IServiceMenu = {
    title: '',
    main: {},
    tools: {},
    tabs: undefined,
    onClickMain: this.onClickMain.bind(this),
  };

  private msg: MessageType = message_en;

  /** Which load is the current one — see `_load`. */
  private _loadToken = 0;
  /** Parsed l4 files by path. Not `@state`: it never changes what is on screen by itself. */
  private _l4Cache = new Map<string, unknown>();

  @state() private _groups: IScenarioGroup[] = [];
  /** The workspace on screen — the panel's words all come out of it and the vocabulary. */
  @state() private _workspace: IWorkspace | null = null;
  /**
   * The operations and entities the page cites.
   *
   * Starts empty and is filled by a second pass: the panel opens with the technical names and refines
   * when the l4 arrives, never the other way round. A panel that waits for 12 files before showing
   * anything is worse than one that improves.
   */
  @state() private _vocabulary: IL4Vocabulary = NO_VOCABULARY;
  @state() private _pageLabel = '';
  @state() private _missingWorkspace = false;
  /** Inputs no control on this screen writes — the defect the l4 makes visible. */
  @state() private _withoutWriter = new Set<string>();
  /** Keys this panel wrote, with what was there before. */
  @state() private _simulated = new Map<string, ISimulation>();

  onServiceClick(_visible: boolean, _reinit: boolean, _el: IToolbarContent | null) {
    void this._load();
    this._updateMenuTitle();
  }

  connectedCallback() {
    super.connectedCallback();
    AuraInitState();
    void this._load();
    this._updateMenuTitle();
  }

  private _updateMenuTitle(): void {
    this.menu.title = moduleScopeTitle();
    this.menu.updateTitle?.();
  }

  createRenderRoot() { return this; }

  // ─── Loading the inventory ────────────────────────────────────────────────

  /**
   * Reads the l4 workspace of the page on screen.
   *
   * The page identity comes from the aura state; its module is the FIRST segment of the folder, which
   * is the same rule `parseAuraPageSource` uses.
   */
  private async _load(): Promise<void> {
    const page = getAuraState()?.actualPage;
    // Every await below can finish after the user moved to another page; only the latest load may
    // write to the panel. Without this the vocabulary of one page lands on the states of another.
    const token = (this._loadToken += 1);
    this._groups = [];
    this._workspace = null;
    this._vocabulary = NO_VOCABULARY;
    this._withoutWriter = new Set();
    this._missingWorkspace = false;
    this._pageLabel = '';
    if (!page) return;

    const module = (page.folder ?? '').split('/')[0];
    this._pageLabel = `${page.shortName}${module ? ` · ${module}` : ''}`;
    if (!module) return;

    const l4 = `_${page.project}_/l4/${module}`;
    const source = await getContentByMlsPath(`${l4}/workspaces/${page.shortName}.defs.ts`).catch(() => '');
    if (token !== this._loadToken) return;
    const workspace = source ? parseWorkspace(source) : null;
    if (!workspace) {
      this._missingWorkspace = true;
      return;
    }

    const states = scenarioKeys(workspace);
    this._workspace = workspace;
    this._groups = groupBySection(workspace, states);

    // The rendered variation is what says whether an input has a control — layouts 2 and 3 of the
    // same page fill from a clickable row while layout 1 has no row selection at all, so the answer
    // differs per variation (43 to 45 of the 288 inputs in the real module).
    const rendered = await getContentByMlsPath(
      `_${page.project}_/l2/${page.folder}/${page.shortName}.ts`,
    ).catch(() => '');
    if (token !== this._loadToken) return;
    if (rendered) {
      this._withoutWriter = new Set(inputsWithoutWriter(states, rendered).map((item) => item.key));
    }

    const vocabulary = await this._readVocabulary(l4, workspace);
    if (token !== this._loadToken) return;
    this._vocabulary = vocabulary;
  }

  /**
   * The operations the page's actions cite, and the entities those name.
   *
   * Two rounds, because the second depends on the first: an operation says which entity it is about
   * and which field each of its inputs points at. Up to 8 operations and 3 entities per page in the
   * real projects, read in parallel and cached across pages — the operations of a module are shared
   * by every page of it, so the second page of a module costs almost nothing.
   */
  private async _readVocabulary(l4: string, workspace: IWorkspace): Promise<IL4Vocabulary> {
    const operations: Record<string, IWorkspaceOperation> = {};
    const read = await Promise.all(
      operationIdsOf(workspace).map((id) => this._cached(`${l4}/operations/${id}.defs.ts`, parseOperation)),
    );
    for (const operation of read) if (operation) operations[operation.operationId] = operation;

    const entities: Record<string, IOntologyEntity> = {};
    const found = await Promise.all(
      entityIdsOf(Object.values(operations), workspace)
        .map((id) => this._cached(`${l4}/ontology/${id}.defs.ts`, parseEntity)),
    );
    for (const entity of found) if (entity) entities[entity.entityId] = entity;

    return { operations, entities };
  }

  /**
   * One read per path per session, parse included.
   *
   * The l4 is approved input, not something being edited here — and a miss is cached too, so a module
   * with no `ontology/` folder does not re-ask for the same missing file on every page.
   */
  private async _cached<T>(path: string, parse: (source: string) => T | null): Promise<T | null> {
    const hit = this._l4Cache.get(path);
    if (hit !== undefined) return hit as T | null;
    const source = await getContentByMlsPath(path).catch(() => '');
    const parsed = source ? parse(source) : null;
    this._l4Cache.set(path, parsed);
    return parsed;
  }

  // ─── Simulating ───────────────────────────────────────────────────────────

  private _apply(state: IScenarioState, value: string): void {
    const existing = this._simulated.get(state.key);
    // The ORIGINAL is captured once: overwriting it on the second change would make "restore" put
    // back the first simulation instead of what the app had.
    const original = existing ? existing.original : getState(state.key);
    this._simulated.set(state.key, { original, applied: value });
    setState(state.key, value);
    this._publish();
    this.requestUpdate();
  }

  private _restore(key: string): void {
    const simulation = this._simulated.get(key);
    if (!simulation) return;
    setState(key, simulation.original);
    this._simulated.delete(key);
    this._publish();
    this.requestUpdate();
  }

  private _restoreAll(): void {
    for (const key of [...this._simulated.keys()]) this._restore(key);
  }

  /**
   * Publishes which keys are simulated, so the fact is visible OUTSIDE this panel.
   *
   * Two message `<p>`s look identical: editing the class of the error branch while believing it is the
   * success one is a mistake this panel would otherwise make easy. The picker reads this and shows a
   * badge. Plain data only, written only here — the same discipline as `aura.edit`.
   */
  private _publish(): void {
    setState('aura.scenario.simulated', [...this._simulated.keys()]);
  }

  /** True when the app wrote the key after we did: the simulation is gone and saying so is the job. */
  private _overwritten(key: string): boolean {
    const simulation = this._simulated.get(key);
    if (!simulation) return false;
    return getState(key) !== simulation.applied;
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  render() {
    const lang = this.getMessageKey(messages);
    this.msg = messages[lang];

    return html`
      <div class="flex flex-col gap-3 min-h-full p-3 bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-200">
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-semibold">${this.msg.svcTitle}</span>
          ${this._simulated.size
    ? html`<button class="text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 hover:border-gray-400 cursor-pointer"
                @click=${() => this._restoreAll()}>${this.msg.restoreAll}</button>`
    : nothing}
        </div>
        ${this._renderPageIdentity()}
        ${this._missingWorkspace
    ? html`<span class="text-xs text-amber-600 dark:text-amber-400">${this.msg.noWorkspace}</span>`
    : nothing}
        ${this._groups.length
    ? html`<span class="text-[11px] text-gray-500 dark:text-gray-400">${this.msg.hint}</span>
             ${this._groups.map((group) => this._renderGroup(group))}`
    : nothing}
      </div>
    `;
  }

  /**
   * The page, named the way the l4 names it.
   *
   * `ticketHub · controleChamados` said what the FILE is called. "Chamado — Painel de Chamado." says
   * what the page is, and it is the same sentence the app itself shows. The technical pair stays,
   * secondary: it is what matches the panel to the source and to the picker.
   */
  private _renderPageIdentity() {
    const workspace = this._workspace;
    if (!workspace) {
      return html`<span class="text-[11px] text-gray-500 dark:text-gray-400">${this._pageLabel || this.msg.noPage}</span>`;
    }
    const title = workspace.title ?? workspace.workspaceId;
    return html`
      <div class="flex flex-col">
        <span class="text-xs font-semibold">${title}${workspace.purpose ? html` — <span class="font-normal">${workspace.purpose}</span>` : nothing}</span>
        <code class="text-[10px] font-mono text-gray-500 dark:text-gray-400">${this._pageLabel}</code>
      </div>
    `;
  }

  /**
   * A section of the page: titled by WHAT IT IS FOR, and split into the actions it runs.
   *
   * The intent was already being read and was being shown as a subtitle under a machine id. The
   * action sub-block is not decoration either: it is what lets a line be called just "Título", since
   * `cmdCreateTicket.title` and `cmdUpdateTicket.title` are both that, and only the action around
   * them tells them apart.
   */
  private _renderGroup(group: IScenarioGroup) {
    return html`
      <div class="rounded-lg border border-gray-200 dark:border-gray-800 p-2.5 flex flex-col gap-2">
        <div class="flex flex-col">
          <span class="text-xs font-semibold">${group.intent || group.sectionId || this.msg.sectionRest}</span>
          ${group.sectionId
    ? html`<code class="text-[10px] font-mono text-gray-500 dark:text-gray-400">${group.sectionId}</code>`
    : nothing}
        </div>
        ${groupByAction(group.states).map((block) => this._renderAction(block))}
      </div>
    `;
  }

  /** One action of the section: the operation's own title, and its outcome as the help line. */
  private _renderAction(block: IScenarioActionBlock) {
    const workspace = this._workspace;
    const action = workspace && block.bffId ? describeAction(block.bffId, workspace, this._vocabulary) : null;
    return html`
      <div class="flex flex-col gap-1.5">
        ${action
    ? html`<div class="flex flex-col">
             <span class="text-[11px] font-semibold text-gray-700 dark:text-gray-300">${action.label}</span>
             ${action.hint ? html`<span class="text-[10px] text-gray-500 dark:text-gray-400">${action.hint}</span>` : nothing}
           </div>`
    : nothing}
        <div class="flex flex-col gap-1 pl-1.5 border-l border-gray-200 dark:border-gray-800">
          ${block.states.map((item) => this._renderState(item, Boolean(action)))}
        </div>
      </div>
    `;
  }

  /**
   * One state.
   *
   * The label leads and the property name STAYS, small, right after it. Dropping the property name
   * would trade one confusion for another: it is the word that matches this line to the page source,
   * to the class picker and to `aura.scenario.simulated`.
   */
  private _renderState(item: IScenarioState, insideAction = false) {
    const simulated = this._simulated.has(item.key);
    const overwritten = this._overwritten(item.key);
    const described = this._describe(item);
    const label = this._lineLabel(item, described, insideAction);
    return html`
      <div class="flex flex-col gap-1 border-t border-gray-100 dark:border-gray-900 pt-1.5 first:border-t-0 first:pt-0">
        <div class="flex items-baseline gap-1.5 min-w-0">
          <span class="text-[11px] truncate" title=${label}>${label}</span>
          <code class="text-[10px] font-mono text-gray-400 dark:text-gray-500 truncate" title=${item.key}>${item.name}</code>
          ${simulated ? html`<span class="text-[10px] px-1 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">${this.msg.simulated}</span>` : nothing}
          ${overwritten ? html`<span class="text-[10px] px-1 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">${this.msg.overwritten}</span>` : nothing}
          ${simulated ? html`<button class="text-[10px] underline text-gray-500 hover:text-gray-700 cursor-pointer ml-auto"
            @click=${() => this._restore(item.key)}>${this.msg.restore}</button>` : nothing}
        </div>
        ${described.hint
    ? html`<span class="text-[10px] text-gray-500 dark:text-gray-400 truncate" title=${described.hint}>${described.hint}</span>`
    : nothing}
        ${this._withoutWriter.has(item.key)
    ? html`<span class="text-[10px] text-amber-600 dark:text-amber-400">${this.msg.noWriter}</span>`
    : nothing}
        ${item.editable
    ? this._renderControl(item, described)
    : html`<span class="text-[10px] text-gray-400">${this.msg.needsFixture}</span>`}
      </div>
    `;
  }

  /** The l4's words for a line, or the technical name when the l4 named nothing. */
  private _describe(item: IScenarioState): IStateLabel {
    if (!this._workspace) return { label: item.name, valueSet: item.valueSet, fromL4: false };
    return describeState(item, this._workspace, this._vocabulary);
  }

  /**
   * The label plus the chrome word the line needs, in the user's language.
   *
   * The chrome is composed HERE and not in the core: the l4's words come in whatever language the l4
   * was written in (pt-BR in both projects, and the same words the app shows), while "situation" and
   * "List of" are the panel's own and follow the pt/en/es the user picked.
   *
   * Inside an action block the action's title is already the heading, so the status line says only
   * "situation" — repeating "Listar Chamado" on every line of its own block is what the old prefix
   * did.
   */
  private _lineLabel(item: IScenarioState, described: IStateLabel, insideAction: boolean): string {
    const withAction = (role: string): string => (insideAction && described.fromL4
      ? role
      : `${described.label}: ${role}`);

    switch (item.kind) {
      case 'pageStatus':
        // Degraded, the label WOULD be `status` — which the `<code>` beside it already says. The
        // chrome word alone carries more.
        return described.fromL4 ? `${described.label}: ${this.msg.rolePageStatus}` : this.msg.rolePageStatus;
      case 'actionStatus':
        return withAction(this.msg.roleStatus);
      case 'actionError':
        return withAction(this.msg.roleError);
      case 'queryResult':
      case 'commandOutput':
        if (!described.fromL4) return described.label;
        return described.many ? `${this.msg.resultList} ${described.label}` : described.label;
      default:
        return described.label;
    }
  }

  private _renderControl(item: IScenarioState, described: IStateLabel) {
    const current = String(getState(item.key) ?? '');
    // ONE source: `describeState` already prefers the workspace's own declaration over the operation
    // and the ontology. Reading `item.valueSet` here as well would be a second, narrower answer to the
    // same question — and the narrower one would win.
    const valueSet = described.valueSet;
    if (valueSet) {
      // A closed domain is radio-shaped: an action cannot be loading AND successful at once.
      return html`<span class="flex flex-wrap gap-1">
        ${valueSet.map((value) => html`<button
          class="text-[11px] px-1.5 py-0.5 rounded border cursor-pointer ${value === current
    ? 'bg-indigo-500 border-indigo-500 text-white'
    : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'}"
          @click=${() => this._apply(item, value)}>${value}</button>`)}
      </span>`;
    }
    return html`<input
      class="w-full text-[11px] px-1.5 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
      placeholder=${this.msg.freeValue}
      .value=${current}
      @change=${(e: Event) => this._apply(item, (e.target as HTMLInputElement).value)}
    >`;
  }
}
