/// <mls fileReference="_102020_/l2/aura/services/serviceScenario.ts" enhancement="_102027_/l2/enhancementLit"/>
// Puts the page on screen into a chosen state, so what is normally invisible can be seen and edited.
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
// THE INVENTORY COMES FROM THE PAGE ITSELF (D-016): two files, the shared class and the rendered
// variation, and no l4 at all. And only states with a closed domain are offered (D-017) — the rest
// are counted in a footnote, because a free text box over a state nothing compares against was never
// a simulation.

import { html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ServiceBase, IService, IToolbarContent, IServiceMenu } from '/_102027_/l2/serviceBase.js';
import { getState, setState } from '/_102029_/l2/collabState.js';
import { AuraInitState, getAuraState, moduleScopeTitle } from '/_102020_/l2/aura/helpers/auraState.js';
import { getContentByMlsPath } from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeStudio.js';
import {
  groupByAction,
  type IScenarioActionBlock,
  type IScenarioState,
  type ScenarioKind,
} from '/_102020_/l2/aura/helpers/scenarioCore.js';
import { statesOfPage } from '/_102020_/l2/aura/helpers/scenarioL2.js';

/// **collab_i18n_start**
const message_en = {
  svcTitle: 'Scenario',
  noPage: 'Open a page to simulate its states.',
  noStates: 'No state of this page has a fixed set of values to offer.',
  hidden: 'states with no fixed values are not offered',
  simulated: 'simulated',
  restore: 'restore',
  restoreAll: 'restore everything',
  overwritten: 'the app overwrote this',
  pageScope: 'Page',
  hint: 'Changing a state only changes what is rendered — it never calls the backend.',
  rolePageStatus: 'page situation',
  roleStatus: 'situation',
  roleError: 'error message',
  roleInput: 'field',
  roleResult: 'result',
  roleOutput: 'command output',
  roleScene: 'scene',
  roleOther: 'state',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
  en: message_en,
  pt: {
    svcTitle: 'Cenário',
    noPage: 'Abra uma página para simular os estados dela.',
    noStates: 'Nenhum estado desta página tem um conjunto fixo de valores para oferecer.',
    hidden: 'estados sem valores fixos não são oferecidos',
    simulated: 'simulado',
    restore: 'restaurar',
    restoreAll: 'restaurar tudo',
    overwritten: 'o app sobrescreveu',
    pageScope: 'Página',
    hint: 'Trocar um estado só muda o que é renderizado — nunca chama o backend.',
    rolePageStatus: 'situação da página',
    roleStatus: 'situação',
    roleError: 'mensagem de erro',
    roleInput: 'campo',
    roleResult: 'resultado',
    roleOutput: 'saída do comando',
    roleScene: 'cena',
    roleOther: 'estado',
  },
  es: {
    svcTitle: 'Escenario',
    noPage: 'Abra una página para simular sus estados.',
    noStates: 'Ningún estado de esta página tiene un conjunto fijo de valores para ofrecer.',
    hidden: 'estados sin valores fijos no se ofrecen',
    simulated: 'simulado',
    restore: 'restaurar',
    restoreAll: 'restaurar todo',
    overwritten: 'la app lo sobrescribió',
    pageScope: 'Página',
    hint: 'Cambiar un estado solo cambia lo que se renderiza — nunca llama al backend.',
    rolePageStatus: 'situación de la página',
    roleStatus: 'situación',
    roleError: 'mensaje de error',
    roleInput: 'campo',
    roleResult: 'resultado',
    roleOutput: 'salida del comando',
    roleScene: 'escena',
    roleOther: 'estado',
  },
};
/// **collab_i18n_end**

/**
 * The chrome word of each species, by the species itself.
 *
 * Every member of `ScenarioKind` is here and the compiler says so: the line is composed at runtime,
 * so a species without a word would render nothing at all instead of failing.
 */
const ROLE_OF_KIND: Record<ScenarioKind, keyof MessageType> = {
  pageStatus: 'rolePageStatus',
  actionStatus: 'roleStatus',
  actionError: 'roleError',
  input: 'roleInput',
  queryResult: 'roleResult',
  commandOutput: 'roleOutput',
  scene: 'roleScene',
  other: 'roleOther',
};

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

  /** The states that CAN be simulated, split into the actions they belong to. */
  @state() private _blocks: IScenarioActionBlock[] = [];
  /**
   * How many states were read and left out for having no closed domain.
   *
   * It is shown, once, as a footnote. Hiding them without saying so would let the user conclude the
   * page has 3 states when it has 40 — the objection that kept the old "list everything" rule alive.
   */
  @state() private _hidden = 0;
  @state() private _pageLabel = '';
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
   * Reads the two files of the page on screen: the shared class and the rendered variation.
   *
   * Both, because they answer different halves — the shared class declares the properties, their
   * types and the generated comments, and a variation can name keys the shared one does not. The
   * page identity comes from the aura state; its module is the FIRST segment of the folder, which is
   * the same rule `parseAuraPageSource` uses.
   */
  private async _load(): Promise<void> {
    const page = getAuraState()?.actualPage;
    // Every await below can finish after the user moved to another page; only the latest load may
    // write to the panel. Without this the inventory of one page lands on the screen of another.
    const token = (this._loadToken += 1);
    this._blocks = [];
    this._hidden = 0;
    this._pageLabel = '';
    if (!page) return;

    const module = (page.folder ?? '').split('/')[0];
    this._pageLabel = `${page.shortName}${module ? ` · ${module}` : ''}`;
    if (!module) return;

    const [shared, rendered] = await Promise.all([
      getContentByMlsPath(`_${page.project}_/l2/${module}/web/shared/${page.shortName}.ts`).catch(() => ''),
      getContentByMlsPath(`_${page.project}_/l2/${page.folder}/${page.shortName}.ts`).catch(() => ''),
    ]);
    if (token !== this._loadToken) return;
    if (!shared && !rendered) return;

    const states = statesOfPage(shared ?? '', rendered ?? '');
    this._hidden = states.filter((item) => !item.editable).length;
    this._blocks = groupByAction(states.filter((item) => item.editable));
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
        <code class="text-[10px] font-mono text-gray-500 dark:text-gray-400">${this._pageLabel || this.msg.noPage}</code>
        ${this._blocks.length
    ? html`<span class="text-[11px] text-gray-500 dark:text-gray-400">${this.msg.hint}</span>
             ${this._blocks.map((block) => this._renderAction(block))}`
    : html`<span class="text-xs text-amber-600 dark:text-amber-400">${this.msg.noStates}</span>`}
        ${this._hidden
    ? html`<span class="text-[10px] text-gray-500 dark:text-gray-400">${this._hidden} ${this.msg.hidden}</span>`
    : nothing}
      </div>
    `;
  }

  /**
   * One action of the page, headed by the action's own id.
   *
   * The id and not a sentence: the l4 is no longer read, so the only name that exists is the one the
   * page source itself carries — and that one is verifiable against the file (D-016).
   */
  private _renderAction(block: IScenarioActionBlock) {
    return html`
      <div class="rounded-lg border border-gray-200 dark:border-gray-800 p-2.5 flex flex-col gap-1.5">
        <code class="text-[11px] font-mono font-semibold text-gray-700 dark:text-gray-300">${block.bffId ?? this.msg.pageScope}</code>
        <div class="flex flex-col gap-1 pl-1.5 border-l border-gray-200 dark:border-gray-800">
          ${block.states.map((item) => this._renderState(item))}
        </div>
      </div>
    `;
  }

  /**
   * One state: what it IS, then the property that carries it.
   *
   * The property name is the word that matches this line to the page source, to the class picker and
   * to `aura.scenario.simulated`, and the full key is one hover away.
   */
  private _renderState(item: IScenarioState) {
    const simulated = this._simulated.has(item.key);
    const overwritten = this._overwritten(item.key);
    const role = this.msg[ROLE_OF_KIND[item.kind]];
    return html`
      <div class="flex flex-col gap-1 border-t border-gray-100 dark:border-gray-900 pt-1.5 first:border-t-0 first:pt-0">
        <div class="flex items-baseline gap-1.5 min-w-0">
          <span class="text-[11px] truncate" title=${role}>${role}</span>
          <code class="text-[10px] font-mono text-gray-400 dark:text-gray-500 truncate" title=${item.key}>${item.name}</code>
          ${simulated ? html`<span class="text-[10px] px-1 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">${this.msg.simulated}</span>` : nothing}
          ${overwritten ? html`<span class="text-[10px] px-1 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">${this.msg.overwritten}</span>` : nothing}
          ${simulated ? html`<button class="text-[10px] underline text-gray-500 hover:text-gray-700 cursor-pointer ml-auto"
            @click=${() => this._restore(item.key)}>${this.msg.restore}</button>` : nothing}
        </div>
        ${this._renderControl(item)}
      </div>
    `;
  }

  /**
   * The chips of the closed domain.
   *
   * There is no other control: a state only reaches this method when it HAS a domain (D-017), and a
   * closed domain is radio-shaped — an action cannot be loading AND successful at once.
   */
  private _renderControl(item: IScenarioState) {
    const current = String(getState(item.key) ?? '');
    return html`<span class="flex flex-wrap gap-1">
      ${(item.valueSet ?? []).map((value) => html`<button
        class="text-[11px] px-1.5 py-0.5 rounded border cursor-pointer ${value === current
    ? 'bg-indigo-500 border-indigo-500 text-white'
    : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'}"
        @click=${() => this._apply(item, value)}>${value}</button>`)}
    </span>`;
  }
}
