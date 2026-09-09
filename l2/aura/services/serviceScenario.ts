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
  groupBySection,
  inputsWithoutWriter,
  parseWorkspace,
  scenarioKeys,
  type IScenarioGroup,
  type IScenarioState,
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

  @state() private _groups: IScenarioGroup[] = [];
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
    this._groups = [];
    this._withoutWriter = new Set();
    this._missingWorkspace = false;
    this._pageLabel = '';
    if (!page) return;

    const module = (page.folder ?? '').split('/')[0];
    this._pageLabel = `${page.shortName}${module ? ` · ${module}` : ''}`;
    if (!module) return;

    const workspacePath = `_${page.project}_/l4/${module}/workspaces/${page.shortName}.defs.ts`;
    const source = await getContentByMlsPath(workspacePath).catch(() => '');
    const workspace = source ? parseWorkspace(source) : null;
    if (!workspace) {
      this._missingWorkspace = true;
      return;
    }

    const states = scenarioKeys(workspace);
    this._groups = groupBySection(workspace, states);

    // The rendered variation is what says whether an input has a control — layouts 2 and 3 of the
    // same page fill from a clickable row while layout 1 has no row selection at all, so the answer
    // differs per variation (43 to 45 of the 288 inputs in the real module).
    const rendered = await getContentByMlsPath(
      `_${page.project}_/l2/${page.folder}/${page.shortName}.ts`,
    ).catch(() => '');
    if (rendered) {
      this._withoutWriter = new Set(inputsWithoutWriter(states, rendered).map((item) => item.key));
    }
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
        <span class="text-[11px] text-gray-500 dark:text-gray-400">${this._pageLabel || this.msg.noPage}</span>
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

  private _renderGroup(group: IScenarioGroup) {
    return html`
      <div class="rounded-lg border border-gray-200 dark:border-gray-800 p-2.5 flex flex-col gap-2">
        <div class="flex flex-col">
          <span class="text-xs font-semibold">${group.sectionId || this.msg.sectionRest}</span>
          ${group.intent ? html`<span class="text-[11px] text-gray-500 dark:text-gray-400">${group.intent}</span>` : nothing}
        </div>
        ${group.states.map((item) => this._renderState(item))}
      </div>
    `;
  }

  private _renderState(item: IScenarioState) {
    const simulated = this._simulated.has(item.key);
    const overwritten = this._overwritten(item.key);
    return html`
      <div class="flex flex-col gap-1 border-t border-gray-100 dark:border-gray-900 pt-1.5 first:border-t-0 first:pt-0">
        <div class="flex items-center gap-1.5 min-w-0">
          <code class="text-[11px] font-mono truncate" title=${item.key}>${item.name}</code>
          ${simulated ? html`<span class="text-[10px] px-1 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">${this.msg.simulated}</span>` : nothing}
          ${overwritten ? html`<span class="text-[10px] px-1 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">${this.msg.overwritten}</span>` : nothing}
          ${simulated ? html`<button class="text-[10px] underline text-gray-500 hover:text-gray-700 cursor-pointer ml-auto"
            @click=${() => this._restore(item.key)}>${this.msg.restore}</button>` : nothing}
        </div>
        ${this._withoutWriter.has(item.key)
    ? html`<span class="text-[10px] text-amber-600 dark:text-amber-400">${this.msg.noWriter}</span>`
    : nothing}
        ${item.editable ? this._renderControl(item) : html`<span class="text-[10px] text-gray-400">${this.msg.needsFixture}</span>`}
      </div>
    `;
  }

  private _renderControl(item: IScenarioState) {
    const current = String(getState(item.key) ?? '');
    if (item.valueSet) {
      // A closed domain is radio-shaped: an action cannot be loading AND successful at once.
      return html`<span class="flex flex-wrap gap-1">
        ${item.valueSet.map((value) => html`<button
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
