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
//
// THE SIMULATION IS NOT THIS TAB'S
// It lives in studio/studioPageSimulation, and this tab only draws it: the tab is unmounted whenever serviceGenome shows
// another knob (Molecules, to swap the molecule seen in the simulated situation), and that must not end the simulation.

import { html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { getState, subscribe, unsubscribe } from '/_102029_/l2/collabState.js';
import { getAuraState } from '/_102020_/l2/aura/helpers/auraState.js';
import { getContentByMlsPath } from '/_102020_/l2/agentMaterializeL2/helpers/cfeMaterializeStudio.js';
import { scenesOf, situationsOfDefs, type IPageSituation } from '/_102020_/l2/aura/helpers/scenarioL2.js';
import { pageIdOf, pageSimulation } from '/_102020_/l2/aura/studio/studioPageSimulation.js';

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

  private _stopSimulation: (() => void) | null = null;
  private _watched: string[] = [];
  /** The subscriber of the page's keys (only to redraw): a plain object, so the element keeps its own handleIcaStateChange. */
  private readonly _watcher = {
    handleIcaStateChange: (): void => this.requestUpdate(),
  };

  createRenderRoot() { return this; }

  connectedCallback(): void {
    super.connectedCallback();
    subscribe('aura.actualPage', this);
    this._stopSimulation = pageSimulation.onChange(() => this.requestUpdate());
    void this._load();
  }

  disconnectedCallback(): void {
    // Only the drawing goes: the simulation stays (studioPageSimulation ends it on another page or out of studio mode).
    this._watch([]);
    unsubscribe('aura.actualPage', this);
    this._stopSimulation?.();
    this._stopSimulation = null;
    super.disconnectedCallback();
  }

  handleIcaStateChange(key: string, _value: unknown): void {
    if (key !== 'aura.actualPage') return;
    if (pageIdOf(getAuraState()?.actualPage ?? null) === this._pageId) return;
    void this._load();
  }

  private get msg(): MessageType {
    return messages[this.getMessageKey(messages)];
  }

  /** The situation on, or null for the page as the app left it. */
  private get _active(): string | null {
    return pageSimulation.activeFor(this._pageId);
  }

  /** The keys simulated on this page, with what was there before. */
  private get _simulated() {
    return pageSimulation.simulatedFor(this._pageId);
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  private async _load(): Promise<void> {
    const page = getAuraState()?.actualPage ?? null;
    const token = (this._loadToken += 1);
    this._pageId = pageIdOf(page);
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
    pageSimulation.write(this._pageId, this._key('scenary'), scene);
  }

  /** Turns a situation on (null = normal): the previous one is undone first, the scene stays. */
  private _setSituation(id: string | null): void {
    const previous = this._situations.find(item => item.id === this._active);
    const next = this._situations.find(item => item.id === id);
    pageSimulation.setSituation(
      this._pageId,
      next ? id : null,
      Object.keys(previous?.set ?? {}).map(member => this._key(member)),
      Object.fromEntries(Object.entries(next?.set ?? {}).map(([member, value]) => [this._key(member), value])),
    );
  }

  private _restoreAll(): void {
    pageSimulation.restoreAll();
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
