/// <mls fileReference="_102020_/l2/aura/plugins/pluginPageStates.ts" enhancement="_102027_/l2/enhancementLit"/>
// The "States" tab of the Pages plugin (aura--plugins--select-page-102020): puts the page on screen into a chosen
// situation, so the branches that are normally invisible (loading, empty, a failed load, a command's success or
// error message, another scene) can be seen and edited with the class picker.
//
// It replaces the Scenario service (services/serviceScenario), which listed every state of the page one by one.
//
// TWO CHOICES, BOTH OF THE PAGE
//   scene      — the `<Scene value>` of the rendered variation (ml-scenary), written to `scenary`;
//   situation  — normal, loading, empty, failed load, or one command succeeding or failing (situationsOfDefs).
// A situation is a set of shared members written at once; only one is on at a time.
//
// WHY IT WORKS WITH SO LITTLE CODE
// The page subscribes to collabState and its handleIcaStateChange ends in requestUpdate(), so a setState re-renders it
// in the simulated situation at once. The causality is one-way — an action method WRITES its status and nothing reads
// a status to start a request — so simulating never calls the backend. The shared is not changed for this: its defs
// say which requests run on open and which are commands, and the shared40 gate guarantees the members.

import { html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { getState, setState, subscribe, unsubscribe } from '/_102029_/l2/collabState.js';
import { getAuraState, type IAuraPage } from '/_102020_/l2/aura/helpers/auraState.js';
import { getContentByMlsPath } from '/_102020_/l2/agentMaterializeL2/helpers/cfeMaterializeStudio.js';
import { scenesOf, situationsOfDefs, type IPageSituation } from '/_102020_/l2/aura/helpers/scenarioL2.js';
import { onLiveUpdateApplied } from '/_102020_/l2/aura/studio/studioLiveUpdate.js';

/**
 * How long after a live update a simulated value is put back when the app overwrites it.
 *
 * An edit in the Studio remounts the page and the new element runs its connectedCallback: it resets its states and the
 * initial queries write `loading` and then `success` over the situation being edited. Long enough for a query to come
 * back; after it, an overwrite is the app's and is only reported.
 */
const REASSERT_MS = 10000;

/// **collab_i18n_start**
const message_en = {
  noPage: 'Open a page to simulate its situations.',
  loading: 'Reading the page…',
  noDefs: 'The shared definition of this page was not found: there is nothing to simulate.',
  hint: 'Only changes what is rendered — it never calls the backend.',
  scene: 'Scene',
  noScenes: 'This page has a single scene.',
  page: 'Page',
  commands: 'Commands',
  normal: 'normal',
  sitLoading: 'loading',
  sitEmpty: 'empty',
  sitLoadError: 'load error',
  sitSuccess: 'success',
  sitError: 'error',
  restoreAll: 'restore everything',
  overwritten: 'the app overwrote this',
  otherScene: 'If the message does not show, its form is in another scene.',
  sampleError: 'Simulated error message.',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
  en: message_en,
  pt: {
    noPage: 'Abra uma página para simular as situações dela.',
    loading: 'Lendo a página…',
    noDefs: 'A definição do shared desta página não foi encontrada: não há o que simular.',
    hint: 'Só muda o que é renderizado — nunca chama o backend.',
    scene: 'Cena',
    noScenes: 'Esta página tem uma cena só.',
    page: 'Página',
    commands: 'Comandos',
    normal: 'normal',
    sitLoading: 'carregando',
    sitEmpty: 'vazia',
    sitLoadError: 'erro ao carregar',
    sitSuccess: 'sucesso',
    sitError: 'erro',
    restoreAll: 'restaurar tudo',
    overwritten: 'o app sobrescreveu',
    otherScene: 'Se a mensagem não aparecer, o formulário dela está em outra cena.',
    sampleError: 'Mensagem de erro simulada.',
  },
  es: {
    noPage: 'Abra una página para simular sus situaciones.',
    loading: 'Leyendo la página…',
    noDefs: 'No se encontró la definición del shared de esta página: no hay nada que simular.',
    hint: 'Solo cambia lo que se renderiza — nunca llama al backend.',
    scene: 'Escena',
    noScenes: 'Esta página tiene una sola escena.',
    page: 'Página',
    commands: 'Comandos',
    normal: 'normal',
    sitLoading: 'cargando',
    sitEmpty: 'vacía',
    sitLoadError: 'error al cargar',
    sitSuccess: 'éxito',
    sitError: 'error',
    restoreAll: 'restaurar todo',
    overwritten: 'la app lo sobrescribió',
    otherScene: 'Si el mensaje no aparece, su formulario está en otra escena.',
    sampleError: 'Mensaje de error simulado.',
  },
};
/// **collab_i18n_end**

/** What was there before the first simulated write, so restoring is exact. */
interface ISimulation {
  original: unknown;
  applied: unknown;
}

export const PAGE_STATES_TAG = 'aura--plugins--page-states-102020';

@customElement(PAGE_STATES_TAG)
export class PluginPageStates extends StateLitElement {

  /** Which load is the current one — every await can finish after the person moved to another page. */
  private _loadToken = 0;
  private _pageId = '';
  /** `ui.<module>.<page>.` — the shared publishes every member under it. */
  private _prefix = '';

  @state() private _loading = false;
  @state() private _pageLabel = '';
  @state() private _hasDefs = false;
  @state() private _scenes: string[] = [];
  @state() private _situations: IPageSituation[] = [];
  /** The situation on, or null for the page as the app left it. */
  @state() private _active: string | null = null;
  /** Keys this tab wrote, with what was there before. */
  @state() private _simulated = new Map<string, ISimulation>();

  private _reassertUntil = 0;
  private _stopLiveUpdate: (() => void) | null = null;
  private _watched: string[] = [];
  /** The subscriber of the page's keys: a plain object, so the element keeps its own handleIcaStateChange. */
  private readonly _watcher = {
    handleIcaStateChange: (key: string, value: unknown): void => this._onAppWrote(key, value),
  };

  createRenderRoot() { return this; }

  connectedCallback(): void {
    super.connectedCallback();
    subscribe('aura.actualPage', this);
    this._stopLiveUpdate = onLiveUpdateApplied(() => this._reapply());
    void this._load();
  }

  disconnectedCallback(): void {
    // Leaving for good (another page, the plugin closed) must not leave the app in a simulated situation.
    this._restoreAll();
    this._watch([]);
    unsubscribe('aura.actualPage', this);
    this._stopLiveUpdate?.();
    this._stopLiveUpdate = null;
    super.disconnectedCallback();
  }

  handleIcaStateChange(key: string, _value: unknown): void {
    if (key !== 'aura.actualPage') return;
    const page = getAuraState()?.actualPage ?? null;
    if (this._idOf(page) === this._pageId) return;
    // The simulation belongs to the page it was made on.
    this._restoreAll();
    void this._load();
  }

  private get msg(): MessageType {
    return messages[this.getMessageKey(messages)];
  }

  private _idOf(page: IAuraPage | null): string {
    return page ? `${page.project}:${page.folder}:${page.shortName}` : '';
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  private async _load(): Promise<void> {
    const page = getAuraState()?.actualPage ?? null;
    const token = (this._loadToken += 1);
    this._pageId = this._idOf(page);
    this._watch([]);
    this._scenes = [];
    this._situations = [];
    this._hasDefs = false;
    this._pageLabel = '';
    this._prefix = '';
    if (!page) return;

    // The module is the FIRST segment of the folder — the rule parseAuraPageSource uses.
    const module = (page.folder ?? '').split('/')[0];
    this._pageLabel = `${page.shortName}${module ? ` · ${module}` : ''}`;
    if (!module) return;

    this._loading = true;
    const [definition, rendered] = await Promise.all([
      this._definitionOf(`/_${page.project}_/l2/${module}/web/shared/${page.shortName}.defs.js`),
      getContentByMlsPath(`_${page.project}_/l2/${page.folder}/${page.shortName}.ts`).catch(() => ''),
    ]);
    if (token !== this._loadToken) return;
    this._loading = false;
    this._prefix = `ui.${module}.${page.shortName}.`;
    this._hasDefs = definition !== null;
    this._scenes = scenesOf(rendered ?? '');
    this._situations = definition ? situationsOfDefs(definition, { code: 'studio.simulated', message: this.msg.sampleError }) : [];
    const members = new Set(['scenary', ...this._situations.flatMap(item => Object.keys(item.set))]);
    this._watch([...members].map(member => this._key(member)));
  }

  /** `definition` of the shared defs module, or null when the page has none or it does not load. */
  private async _definitionOf(url: string): Promise<unknown> {
    try {
      const module = await import(url) as Record<string, unknown>;
      return module.definition && typeof module.definition === 'object' ? module.definition : null;
    } catch {
      return null;
    }
  }

  private _key(member: string): string {
    return `${this._prefix}${member}`;
  }

  /** The keys whose changes this tab follows; replaces the previous set. */
  private _watch(keys: string[]): void {
    if (this._watched.length) unsubscribe(this._watched, this._watcher);
    this._watched = keys;
    if (keys.length) subscribe(keys, this._watcher);
  }

  // ─── Simulating ───────────────────────────────────────────────────────────

  private _setScene(scene: string): void {
    this._write(this._key('scenary'), scene);
    this._publish();
  }

  /** Turns a situation on (null = normal): the previous one is undone first, the scene stays. */
  private _setSituation(id: string | null): void {
    const previous = this._situations.find(item => item.id === this._active);
    if (previous) for (const member of Object.keys(previous.set)) this._restore(this._key(member));
    this._active = id;
    const next = this._situations.find(item => item.id === id);
    if (next) for (const [member, value] of Object.entries(next.set)) this._write(this._key(member), value);
    this._publish();
  }

  private _write(key: string, value: unknown): void {
    const existing = this._simulated.get(key);
    // The ORIGINAL is captured once: a second write must not make "restore" put back the first simulation.
    const original = existing ? existing.original : getState(key);
    this._simulated.set(key, { original, applied: value });
    setState(key, value);
    this.requestUpdate();
  }

  private _restore(key: string): void {
    const simulation = this._simulated.get(key);
    if (!simulation) return;
    this._simulated.delete(key);
    setState(key, simulation.original);
    this.requestUpdate();
  }

  private _restoreAll(): void {
    this._active = null;
    if (!this._simulated.size) return;
    for (const key of [...this._simulated.keys()]) this._restore(key);
    this._publish();
  }

  /** Which keys are simulated, so the fact is visible outside this tab (the class picker's badge). */
  private _publish(): void {
    setState('aura.scenario.simulated', [...this._simulated.keys()]);
  }

  /** A live update remounted the page: put every simulation back, and hold it for a while (REASSERT_MS). */
  private _reapply(): void {
    if (!this._simulated.size) return;
    this._reassertUntil = Date.now() + REASSERT_MS;
    for (const [key, simulation] of this._simulated) setState(key, simulation.applied);
    this.requestUpdate();
  }

  /** A watched key changed: right after a live update a simulated one is put back, otherwise it is only shown. */
  private _onAppWrote(key: string, value: unknown): void {
    const simulation = this._simulated.get(key);
    if (simulation && value !== simulation.applied && Date.now() < this._reassertUntil) {
      // After the app's own write has finished, never inside it.
      setTimeout(() => {
        const current = this._simulated.get(key);
        if (current && getState(key) !== current.applied) setState(key, current.applied);
      }, 0);
      return;
    }
    this.requestUpdate();
  }

  private _overwritten(members: string[]): boolean {
    return members.some(member => {
      const simulation = this._simulated.get(this._key(member));
      return !!simulation && getState(this._key(member)) !== simulation.applied;
    });
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  render() {
    const msg = this.msg;
    if (!this._pageLabel) return this._note(msg.noPage);
    if (this._loading) return this._note(msg.loading);
    if (!this._hasDefs) return this._note(msg.noDefs);
    const page = this._situations.filter(item => item.command === null);
    const commands = [...new Set(this._situations.map(item => item.command).filter((id): id is string => !!id))];
    return html`
      <div class="flex flex-col gap-2.5">
        <div class="flex items-center justify-between gap-2 min-w-0">
          <span class="text-[11px] text-gray-500 dark:text-gray-400">${msg.hint}</span>
          ${this._simulated.size
            ? html`<button class="shrink-0 text-xs px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 hover:border-gray-400 cursor-pointer"
                @click=${() => this._restoreAll()}>${msg.restoreAll}</button>`
            : nothing}
        </div>
        ${this._renderScenes()}
        ${this._section(msg.page, html`
          ${this._chip(msg.normal, this._active === null, () => this._setSituation(null))}
          ${page.map(item => this._situationChip(item, this._pageLabelOf(item)))}
        `, this._activeIn(page))}
        ${commands.length ? this._section(msg.commands, html`
          <div class="flex flex-col gap-1.5 w-full">
            ${commands.map(command => {
              const own = this._situations.filter(item => item.command === command);
              return html`<div class="flex flex-col gap-1 min-w-0">
                <code class="text-[10px] font-mono text-gray-500 dark:text-gray-400 truncate" title=${command}>${command}</code>
                <span class="flex flex-wrap gap-1">${own.map(item => this._situationChip(item, item.outcome === 'success' ? msg.sitSuccess : msg.sitError))}</span>
              </div>`;
            })}
            ${this._active && this._situations.find(item => item.id === this._active)?.command && this._scenes.length > 1
              ? html`<span class="text-[10px] text-gray-500 dark:text-gray-400">${msg.otherScene}</span>`
              : nothing}
          </div>
        `, this._activeIn(this._situations.filter(item => item.command !== null))) : nothing}
      </div>
    `;
  }

  private _renderScenes() {
    const msg = this.msg;
    if (this._scenes.length < 2) return this._section(msg.scene, html`<span class="text-[11px] text-gray-500 dark:text-gray-400">${msg.noScenes}</span>`, null);
    const current = String(getState(this._key('scenary')) ?? '');
    return this._section(msg.scene, html`${this._scenes.map(scene => this._chip(scene, scene === current, () => this._setScene(scene)))}`,
      this._simulated.has(this._key('scenary')) ? ['scenary'] : null);
  }

  /** The members of the active situation when it is one of `items`, so its section can say it was overwritten. */
  private _activeIn(items: IPageSituation[]): string[] | null {
    const active = items.find(item => item.id === this._active);
    return active ? Object.keys(active.set) : null;
  }

  private _pageLabelOf(item: IPageSituation): string {
    const msg = this.msg;
    if (item.id === 'loading') return msg.sitLoading;
    if (item.id === 'empty') return msg.sitEmpty;
    return msg.sitLoadError;
  }

  private _situationChip(item: IPageSituation, label: string) {
    const on = this._active === item.id;
    return this._chip(label, on, () => this._setSituation(on ? null : item.id));
  }

  private _section(title: string, content: unknown, members: string[] | null) {
    const overwritten = members ? this._overwritten(members) : false;
    return html`
      <div class="rounded-lg border border-gray-200 dark:border-gray-800 p-2.5 flex flex-col gap-1.5">
        <div class="flex items-baseline gap-1.5">
          <span class="text-[11px] font-semibold text-gray-700 dark:text-gray-300">${title}</span>
          ${overwritten ? html`<span class="text-[10px] px-1 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">${this.msg.overwritten}</span>` : nothing}
        </div>
        <div class="flex flex-wrap gap-1">${content}</div>
      </div>
    `;
  }

  private _chip(label: string, on: boolean, click: () => void) {
    return html`<button
      class="text-[11px] px-1.5 py-0.5 rounded border cursor-pointer ${on
        ? 'bg-indigo-500 border-indigo-500 text-white'
        : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400'}"
      @click=${click}>${label}</button>`;
  }

  private _note(text: string) {
    return html`<div class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 px-3 py-2.5">
      <span class="text-xs text-gray-500 dark:text-gray-400">${text}</span>
    </div>`;
  }
}
