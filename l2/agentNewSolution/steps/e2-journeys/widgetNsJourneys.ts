/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e2-journeys/widgetNsJourneys.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import {
  nsPipelineArtifactFileInfo,
  readJsonArtifact,
} from '/_102020_/l2/agentNewSolution/helpers/nsFs.js';
import type {
  NsE2Actor,
  NsE2Feature,
  NsE2Journey,
  NsE2JourneyStep,
  NsE2JourneysArtifact,
  NsE2Priority,
} from '/_102020_/l2/agentNewSolution/steps/e2-journeys/gate.js';
import {
  buildNsJourneysReviewPayload,
  emptyNsJourneysWidgetEdits,
  hasNsJourneysWidgetEdits,
  NS_E2_PRIORITIES,
  parseNsBusinessRulesText,
  sameStringArray,
  serializeNsBusinessRules,
} from '/_102020_/l2/agentNewSolution/steps/e2-journeys/widgetNsJourneysLogic.js';
import type {
  NsJourneysReviewAction,
  NsJourneysReviewPayload,
  NsJourneysWidgetChangeKind,
  NsJourneysWidgetChangeRecord,
  NsJourneysWidgetEdits,
} from '/_102020_/l2/agentNewSolution/steps/e2-journeys/widgetNsJourneysLogic.js';

type NsJourneysTab = 'overview' | 'rules' | 'notes';
type NsJourneysMode = 'new-module' | 'change-module';

export interface NsJourneysIteration {
  version: number;
  createdAt?: string;
  summary: string;
  status?: string;
}

export interface WidgetNsJourneysConfig {
  project?: number;
  moduleName?: string;
  artifact?: NsE2JourneysArtifact;
  mode?: NsJourneysMode;
  readOnly?: boolean;
  history?: NsJourneysIteration[];
  uiLabels?: Partial<NsJourneysLabels>;
}

export type WidgetNsJourneysValue = WidgetNsJourneysConfig | NsE2JourneysArtifact;

export interface NsJourneysChangeEventDetail {
  type: 'checkpoint-journeys-change';
  moduleName: string;
  version: number;
  change: NsJourneysWidgetChangeRecord;
  changes: NsJourneysWidgetChangeRecord[];
  edits: NsJourneysWidgetEdits;
}

const messages_en = {
  title: 'User journeys',
  subtitle: 'Review E2 journeys before design and build start.',
  loading: 'Loading journeys...',
  noArtifact: 'No E2 journey artifact found.',
  searchPlaceholder: 'Search journeys, actors, features...',
  allActors: 'All actors',
  version: 'Version',
  newModule: 'New module',
  changeModule: 'Production change',
  journeysFound: 'journeys found',
  actorMap: 'Journey map by actor',
  actors: 'actors',
  journeys: 'journeys',
  features: 'Features',
  steps: 'steps',
  goal: 'Goal',
  soThat: 'So that',
  trigger: 'Trigger',
  outcome: 'Expected result',
  overview: 'Overview',
  businessRules: 'Business rules',
  notes: 'Notes',
  rulesHelp: 'One business rule per line. The artifact is not written by this widget.',
  notesPlaceholder: 'Notes for this journey.',
  featureCatalog: 'Feature catalog',
  priority: 'Priority',
  usedBy: 'Used by',
  noChanges: 'No pending changes.',
  changesPreview: 'Change preview',
  adjustmentTitle: 'Request change by prompt',
  adjustmentPlaceholder: 'Describe the smallest change needed in these journeys.',
  requestAdjustment: 'Request adjustment',
  approve: 'Approve version',
  approveWithChanges: 'Approve with changes',
  readOnly: 'Read only',
  history: 'Iterations',
  currentVersion: 'Current version',
  noJourney: 'No journey selected.',
  payload: 'Payload',
};

export type NsJourneysLabels = typeof messages_en;

const messages_ptBR: NsJourneysLabels = {
  title: 'Jornadas do usuário',
  subtitle: 'Revise as jornadas E2 antes do design e da construção.',
  loading: 'Carregando jornadas...',
  noArtifact: 'Artefato E2 de jornadas não encontrado.',
  searchPlaceholder: 'Buscar jornadas, atores, funcionalidades...',
  allActors: 'Todos os atores',
  version: 'Versão',
  newModule: 'Módulo novo',
  changeModule: 'Mudança em produção',
  journeysFound: 'jornadas encontradas',
  actorMap: 'Mapa de jornadas por ator',
  actors: 'atores',
  journeys: 'jornadas',
  features: 'Funcionalidades',
  steps: 'passos',
  goal: 'Objetivo',
  soThat: 'Para que',
  trigger: 'Gatilho',
  outcome: 'Resultado esperado',
  overview: 'Visão geral',
  businessRules: 'Regras de negócio',
  notes: 'Notas',
  rulesHelp: 'Uma regra de negócio por linha. Este widget não grava o artefato.',
  notesPlaceholder: 'Notas desta jornada.',
  featureCatalog: 'Catálogo de funcionalidades',
  priority: 'Prioridade',
  usedBy: 'Usado por',
  noChanges: 'Nenhuma alteração pendente.',
  changesPreview: 'Prévia das alterações',
  adjustmentTitle: 'Solicitar alteração via prompt',
  adjustmentPlaceholder: 'Descreva a menor alteração necessária nestas jornadas.',
  requestAdjustment: 'Solicitar ajuste',
  approve: 'Aprovar versão',
  approveWithChanges: 'Aprovar com alterações',
  readOnly: 'Somente leitura',
  history: 'Iterações',
  currentVersion: 'Versão atual',
  noJourney: 'Nenhuma jornada selecionada.',
  payload: 'Payload',
};

const priorityLabelsEn: Record<NsE2Priority, string> = {
  now: 'Now',
  soon: 'Soon',
  later: 'Later',
  never: 'Never',
};

const priorityLabelsPtBR: Record<NsE2Priority, string> = {
  now: 'Agora',
  soon: 'Em breve',
  later: 'Depois',
  never: 'Nunca',
};

@customElement('widget-ns-journeys-102020')
export class WidgetNsJourneys102020 extends StateLitElement {
  @property({ type: Object }) value: WidgetNsJourneysValue | null = null;

  @state() private _loading = true;
  @state() private _artifact: NsE2JourneysArtifact | null = null;
  @state() private _error = '';
  @state() private _search = '';
  @state() private _selectedActorId = 'all';
  @state() private _selectedJourneyId = '';
  @state() private _activeTab: NsJourneysTab = 'overview';
  @state() private _adjustment = '';
  @state() private _featurePriorities: Record<string, NsE2Priority> = {};
  @state() private _businessRuleTexts: Record<string, string> = {};
  @state() private _journeyNotes: Record<string, string> = {};
  @state() private _changeLog: NsJourneysWidgetChangeRecord[] = [];

  private _loadedFor = '';
  private _changeSequence = 0;

  override async connectedCallback(): Promise<void> {
    super.connectedCallback();
    await this._load();
  }

  override updated(changed: Map<PropertyKey, unknown>): void {
    super.updated(changed);
    const loadKey = this._loadKey();
    if (changed.has('value') && loadKey !== this._loadedFor) void this._load();
  }

  private get _config(): WidgetNsJourneysConfig {
    return this.value && !isJourneysArtifact(this.value) ? this.value : {};
  }

  private get _msg(): NsJourneysLabels {
    const base = this._artifact?.userLanguage === 'pt-BR' ? messages_ptBR : messages_en;
    return { ...base, ...(this._config.uiLabels || {}) };
  }

  private get _priorityLabels(): Record<NsE2Priority, string> {
    return this._artifact?.userLanguage === 'pt-BR' ? priorityLabelsPtBR : priorityLabelsEn;
  }

  private get _readOnly(): boolean {
    return !!this._config.readOnly;
  }

  private async _load(): Promise<void> {
    const loadKey = this._loadKey();
    this._loadedFor = loadKey;
    this._loading = true;
    this._error = '';
    this._resetReviewState();
    try {
      const artifact = this._artifactFromValue();
      if (artifact) {
        this._setArtifact(artifact);
        return;
      }
      const moduleName = this._config.moduleName;
      if (!moduleName) {
        this._artifact = null;
        return;
      }
      const fileInfo = nsPipelineArtifactFileInfo(moduleName, 'e2-journeys', '.json');
      if (this._config.project) fileInfo.project = this._config.project;
      this._setArtifact(await readJsonArtifact<NsE2JourneysArtifact>(fileInfo, false));
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
    } finally {
      this._loading = false;
    }
  }

  override render(): TemplateResult {
    const m = this._msg;
    if (this._loading) return html`<section class="ns-journeys"><div class="ns-state">${m.loading}</div></section>`;
    if (this._error) return html`<section class="ns-journeys"><div class="ns-state ns-state--error">${this._error}</div></section>`;
    if (!this._artifact) return html`<section class="ns-journeys"><div class="ns-state">${m.noArtifact}</div></section>`;

    const artifact = this._artifact;
    const visibleJourneys = this._visibleJourneys(artifact);
    const selectedJourney = this._selectedJourney(artifact, visibleJourneys);

    return html`
      <section class="ns-journeys">
        ${this._renderHeader(artifact)}
        ${this._renderFilters(artifact, visibleJourneys)}
        ${this._renderActorMap(artifact)}
        <div class="ns-main">
          ${this._renderJourneyList(artifact, visibleJourneys, selectedJourney)}
          ${selectedJourney ? this._renderJourneyDetail(artifact, selectedJourney) : html`<div class="ns-detail"><div class="ns-state">${m.noJourney}</div></div>`}
        </div>
        ${this._renderFeatureCatalog(artifact)}
        ${this._renderHistory(artifact)}
        ${this._renderReviewBar(artifact)}
      </section>
    `;
  }

  private _renderHeader(artifact: NsE2JourneysArtifact): TemplateResult {
    const m = this._msg;
    const mode = this._config.mode === 'change-module' ? m.changeModule : m.newModule;
    return html`
      <header class="ns-header">
        <div>
          <div class="ns-breadcrumb">${artifact.moduleName} / E2 / ${m.title}</div>
          <h2>${m.title}</h2>
          <p>${m.subtitle}</p>
        </div>
        <div class="ns-header-meta">
          <span>${mode}</span>
          <strong>${m.version} v${artifact.version}</strong>
          ${this._readOnly ? html`<span>${m.readOnly}</span>` : nothing}
        </div>
      </header>
    `;
  }

  private _renderFilters(artifact: NsE2JourneysArtifact, visibleJourneys: NsE2Journey[]): TemplateResult {
    const m = this._msg;
    return html`
      <section class="ns-filters">
        <label class="ns-search">
          <span>${visibleJourneys.length} ${m.journeysFound}</span>
          <input
            .value=${this._search}
            placeholder=${m.searchPlaceholder}
            @input=${(event: Event) => { this._search = (event.target as HTMLInputElement).value; }}
          />
        </label>
        <div class="ns-actor-filter" role="group" aria-label=${m.actorMap}>
          <button class=${this._selectedActorId === 'all' ? 'is-active' : ''} @click=${() => { this._selectedActorId = 'all'; }}>
            ${m.allActors}
          </button>
          ${artifact.actors.map(actor => html`
            <button class=${this._selectedActorId === actor.actorId ? 'is-active' : ''} @click=${() => { this._selectedActorId = actor.actorId; }}>
              ${actor.name}
            </button>
          `)}
        </div>
      </section>
    `;
  }

  private _renderActorMap(artifact: NsE2JourneysArtifact): TemplateResult {
    const m = this._msg;
    return html`
      <section class="ns-actor-map">
        <div class="ns-section-title">
          <strong>${m.actorMap}</strong>
          <span>${artifact.actors.length} ${m.actors} / ${artifact.journeys.length} ${m.journeys}</span>
        </div>
        <div class="ns-lanes">
          ${artifact.actors.map(actor => {
            const journeys = artifact.journeys.filter(journey => journey.actorId === actor.actorId);
            return html`
              <div class=${this._selectedActorId === actor.actorId ? 'ns-lane is-filtered' : 'ns-lane'}>
                <button class="ns-lane-head" @click=${() => { this._selectedActorId = actor.actorId; }}>
                  <span>${actor.name}</span>
                  <strong>${journeys.length}</strong>
                </button>
                <div class="ns-lane-items">
                  ${journeys.map(journey => html`
                    <button
                      class=${this._selectedJourneyId === journey.journeyId ? 'is-selected' : ''}
                      @click=${() => this._selectJourney(journey.journeyId)}
                    >
                      ${journey.title}
                    </button>
                  `)}
                </div>
              </div>
            `;
          })}
        </div>
      </section>
    `;
  }

  private _renderJourneyList(
    artifact: NsE2JourneysArtifact,
    journeys: NsE2Journey[],
    selectedJourney: NsE2Journey | null,
  ): TemplateResult {
    const m = this._msg;
    const actorById = new Map(artifact.actors.map(actor => [actor.actorId, actor]));
    return html`
      <aside class="ns-list">
        ${journeys.map(journey => {
          const actor = actorById.get(journey.actorId);
          return html`
            <button
              class=${selectedJourney?.journeyId === journey.journeyId ? 'ns-journey-card is-selected' : 'ns-journey-card'}
              @click=${() => this._selectJourney(journey.journeyId)}
            >
              <strong>${journey.title}</strong>
              <span>${actor?.name || journey.actorId} &middot; ${journey.steps.length} ${m.steps}</span>
              <small>${journey.outcome}</small>
            </button>
          `;
        })}
      </aside>
    `;
  }

  private _renderJourneyDetail(artifact: NsE2JourneysArtifact, journey: NsE2Journey): TemplateResult {
    const m = this._msg;
    const actor = artifact.actors.find(item => item.actorId === journey.actorId);
    return html`
      <main class="ns-detail">
        <header class="ns-detail-head">
          <div>
            <span class="ns-pill">${actor?.name || journey.actorId}</span>
            <h3>${journey.title}</h3>
            <code>${journey.journeyId}</code>
          </div>
        </header>

        <dl class="ns-summary">
          ${this._renderDefinition(m.goal, journey.goal)}
          ${journey.soThat ? this._renderDefinition(m.soThat, journey.soThat) : nothing}
          ${journey.trigger ? this._renderDefinition(m.trigger, journey.trigger) : nothing}
          ${this._renderDefinition(m.outcome, journey.outcome)}
        </dl>

        <nav class="ns-tabs" role="tablist">
          ${this._renderTab('overview', m.overview)}
          ${this._renderTab('rules', m.businessRules)}
          ${this._renderTab('notes', m.notes)}
        </nav>

        ${this._activeTab === 'overview' ? this._renderOverview(artifact, journey) : nothing}
        ${this._activeTab === 'rules' ? this._renderRules(journey) : nothing}
        ${this._activeTab === 'notes' ? this._renderNotes(journey) : nothing}
      </main>
    `;
  }

  private _renderDefinition(label: string, value: string): TemplateResult {
    return html`<div><dt>${label}</dt><dd>${value}</dd></div>`;
  }

  private _renderTab(tab: NsJourneysTab, label: string): TemplateResult {
    return html`
      <button
        role="tab"
        aria-selected=${this._activeTab === tab ? 'true' : 'false'}
        class=${this._activeTab === tab ? 'is-active' : ''}
        @click=${() => { this._activeTab = tab; }}
      >
        ${label}
      </button>
    `;
  }

  private _renderOverview(artifact: NsE2JourneysArtifact, journey: NsE2Journey): TemplateResult {
    const featureById = new Map(artifact.features.map(feature => [feature.featureId, feature]));
    return html`
      <ol class="ns-steps">
        ${journey.steps.map((step, index) => html`
          <li>
            <span class="ns-step-index">${index + 1}</span>
            <div>
              <strong>${step.title}</strong>
              <p>${step.intent}</p>
              ${step.result ? html`<small>${step.result}</small>` : nothing}
              ${this._renderStepFeatures(step, featureById)}
            </div>
          </li>
        `)}
      </ol>
    `;
  }

  private _renderStepFeatures(step: NsE2JourneyStep, featureById: Map<string, NsE2Feature>): TemplateResult {
    if (step.featureRefs.length === 0) return html``;
    return html`
      <div class="ns-step-features">
        ${step.featureRefs.map(ref => {
          const feature = featureById.get(ref);
          return html`<span>${feature?.title || ref}</span>`;
        })}
      </div>
    `;
  }

  private _renderRules(journey: NsE2Journey): TemplateResult {
    const m = this._msg;
    return html`
      <section class="ns-editor">
        <label>
          <span>${m.rulesHelp}</span>
          <textarea
            .value=${this._businessRulesText(journey)}
            ?disabled=${this._readOnly}
            @input=${(event: Event) => this._onRulesInput(journey, event)}
            @change=${(event: Event) => this._onRulesCommit(journey, event)}
          ></textarea>
        </label>
      </section>
    `;
  }

  private _renderNotes(journey: NsE2Journey): TemplateResult {
    const m = this._msg;
    return html`
      <section class="ns-editor">
        <label>
          <span>${m.notes}</span>
          <textarea
            .value=${this._currentNotes(journey)}
            placeholder=${m.notesPlaceholder}
            ?disabled=${this._readOnly}
            @input=${(event: Event) => this._onNotesInput(journey, event)}
            @change=${(event: Event) => this._onNotesCommit(journey, event)}
          ></textarea>
        </label>
      </section>
    `;
  }

  private _renderFeatureCatalog(artifact: NsE2JourneysArtifact): TemplateResult {
    const m = this._msg;
    const actorById = new Map(artifact.actors.map(actor => [actor.actorId, actor]));
    return html`
      <section class="ns-features">
        <div class="ns-section-title">
          <strong>${m.featureCatalog}</strong>
          <span>${artifact.features.length} ${m.features}</span>
        </div>
        <div class="ns-feature-grid">
          ${artifact.features.map(feature => html`
            <article class="ns-feature">
              <div>
                <strong>${feature.title}</strong>
                <code>${feature.featureId}</code>
                ${feature.description ? html`<p>${feature.description}</p>` : nothing}
                <small>${m.usedBy}: ${feature.actorIds.map(actorId => actorById.get(actorId)?.name || actorId).join(', ')}</small>
              </div>
              ${this._renderPrioritySelector(feature)}
            </article>
          `)}
        </div>
      </section>
    `;
  }

  private _renderPrioritySelector(feature: NsE2Feature): TemplateResult {
    const m = this._msg;
    const current = this._currentPriority(feature);
    return html`
      <div class="ns-priority" aria-label=${`${m.priority}: ${feature.title}`}>
        ${NS_E2_PRIORITIES.map(priority => html`
          <button
            class=${current === priority ? 'is-active' : ''}
            aria-pressed=${current === priority ? 'true' : 'false'}
            ?disabled=${this._readOnly}
            @click=${() => this._setFeaturePriority(feature, priority)}
          >
            ${this._priorityLabels[priority]}
          </button>
        `)}
      </div>
    `;
  }

  private _renderReviewBar(artifact: NsE2JourneysArtifact): TemplateResult {
    const m = this._msg;
    const edits = this._currentEdits();
    const hasReviewInput = hasNsJourneysWidgetEdits(edits) || !!this._adjustment.trim();
    return html`
      <section class="ns-review">
        <div class="ns-review-input">
          <div>
            <strong>${m.adjustmentTitle}</strong>
            <p>${m.payload}: <code>checkpoint-journeys-answer</code></p>
          </div>
          <label>
            <textarea
              .value=${this._adjustment}
              maxlength="1000"
              placeholder=${m.adjustmentPlaceholder}
              ?disabled=${this._readOnly}
              @input=${(event: Event) => { this._adjustment = (event.target as HTMLTextAreaElement).value; }}
            ></textarea>
            <span>${this._adjustment.length} / 1000</span>
          </label>
          <div class="ns-review-buttons">
            <button ?disabled=${this._readOnly || !hasReviewInput} @click=${() => this._submitReview(artifact, 'adjust')}>
              ${m.requestAdjustment}
            </button>
            <button class="ns-primary" ?disabled=${this._readOnly} @click=${() => this._submitReview(artifact, 'approve')}>
              ${hasNsJourneysWidgetEdits(edits) ? m.approveWithChanges : m.approve}
            </button>
          </div>
        </div>
        <div class="ns-change-preview">
          <strong>${m.changesPreview}</strong>
          ${this._changeLog.length === 0
            ? html`<p>${m.noChanges}</p>`
            : html`<ol>${this._changeLog.slice(-6).map(change => html`<li>${change.summary}</li>`)}</ol>`}
        </div>
      </section>
    `;
  }

  private _renderHistory(artifact: NsE2JourneysArtifact): TemplateResult {
    const m = this._msg;
    const items = this._historyItems(artifact);
    return html`
      <section class="ns-history">
        <div class="ns-section-title">
          <strong>${m.history}</strong>
          <span>${m.version} v${artifact.version}</span>
        </div>
        <ol class="ns-history-list">
          ${items.map(item => html`
            <li>
              <strong>v${item.version}</strong>
              <span>${item.summary}</span>
              ${item.createdAt ? html`<time>${item.createdAt}</time>` : nothing}
              ${item.status ? html`<code>${item.status}</code>` : nothing}
            </li>
          `)}
        </ol>
      </section>
    `;
  }

  private _historyItems(artifact: NsE2JourneysArtifact): NsJourneysIteration[] {
    const current: NsJourneysIteration = {
      version: artifact.version,
      createdAt: artifact.createdAt,
      summary: this._msg.currentVersion,
      status: 'current',
    };
    const history = this._config.history || [];
    if (history.length === 0) return [current];
    return history.some(item => item.version === artifact.version) ? history : [current, ...history];
  }

  private _setArtifact(artifact: NsE2JourneysArtifact | null): void {
    this._artifact = artifact;
    this._selectedJourneyId = artifact?.journeys[0]?.journeyId || '';
  }

  private _artifactFromValue(): NsE2JourneysArtifact | null {
    if (isJourneysArtifact(this.value)) return this.value;
    if (isJourneysArtifact(this._config.artifact)) return this._config.artifact;
    return null;
  }

  private _loadKey(): string {
    const artifact = this._artifactFromValue();
    if (artifact) return `${artifact.moduleName}:${artifact.version}:${artifact.createdAt}`;
    return `${this._config.project || mls.actualProject || 0}:${this._config.moduleName || ''}`;
  }

  private _resetReviewState(): void {
    this._adjustment = '';
    this._featurePriorities = {};
    this._businessRuleTexts = {};
    this._journeyNotes = {};
    this._changeLog = [];
    this._activeTab = 'overview';
  }

  private _visibleJourneys(artifact: NsE2JourneysArtifact): NsE2Journey[] {
    const actorById = new Map(artifact.actors.map(actor => [actor.actorId, actor]));
    const featureById = new Map(artifact.features.map(feature => [feature.featureId, feature]));
    const term = this._search.trim().toLowerCase();
    return artifact.journeys.filter(journey => {
      if (this._selectedActorId !== 'all' && journey.actorId !== this._selectedActorId) return false;
      if (!term) return true;
      return this._matchesSearch(journey, actorById.get(journey.actorId), featureById, term);
    });
  }

  private _matchesSearch(
    journey: NsE2Journey,
    actor: NsE2Actor | undefined,
    featureById: Map<string, NsE2Feature>,
    term: string,
  ): boolean {
    const featureText = journey.steps
      .flatMap(step => step.featureRefs.map(ref => featureById.get(ref)?.title || ref))
      .join(' ');
    const text = [
      journey.title,
      journey.goal,
      journey.soThat,
      journey.trigger,
      journey.outcome,
      actor?.name,
      actor?.description,
      featureText,
    ].filter(Boolean).join(' ').toLowerCase();
    return text.includes(term);
  }

  private _selectedJourney(artifact: NsE2JourneysArtifact, visibleJourneys: NsE2Journey[]): NsE2Journey | null {
    const selected = visibleJourneys.find(journey => journey.journeyId === this._selectedJourneyId);
    return selected || visibleJourneys[0] || artifact.journeys[0] || null;
  }

  private _selectJourney(journeyId: string): void {
    this._selectedJourneyId = journeyId;
    this._activeTab = 'overview';
  }

  private _currentPriority(feature: NsE2Feature): NsE2Priority {
    return this._featurePriorities[feature.featureId] || feature.priority;
  }

  private _setFeaturePriority(feature: NsE2Feature, priority: NsE2Priority): void {
    if (this._readOnly || this._currentPriority(feature) === priority) return;
    const before = this._currentPriority(feature);
    const next = { ...this._featurePriorities };
    if (priority === feature.priority) delete next[feature.featureId];
    else next[feature.featureId] = priority;
    this._featurePriorities = next;
    this._recordChange(
      'featurePriorityChanged',
      feature.featureId,
      before,
      priority,
      `${feature.title}: ${this._priorityLabels[before]} -> ${this._priorityLabels[priority]}`,
    );
  }

  private _businessRulesText(journey: NsE2Journey): string {
    return this._businessRuleTexts[journey.journeyId] ?? serializeNsBusinessRules(journey.businessRules);
  }

  private _onRulesInput(journey: NsE2Journey, event: Event): void {
    this._businessRuleTexts = {
      ...this._businessRuleTexts,
      [journey.journeyId]: (event.target as HTMLTextAreaElement).value,
    };
  }

  private _onRulesCommit(journey: NsE2Journey, event: Event): void {
    if (this._readOnly) return;
    const text = (event.target as HTMLTextAreaElement).value;
    const rules = parseNsBusinessRulesText(text);
    if (sameStringArray(rules, journey.businessRules)) {
      const next = { ...this._businessRuleTexts };
      delete next[journey.journeyId];
      this._businessRuleTexts = next;
      return;
    }
    this._recordChange(
      'journeyBusinessRulesChanged',
      journey.journeyId,
      journey.businessRules,
      rules,
      `${journey.title}: ${this._msg.businessRules}`,
    );
  }

  private _currentNotes(journey: NsE2Journey): string {
    return this._journeyNotes[journey.journeyId] ?? journey.notes;
  }

  private _onNotesInput(journey: NsE2Journey, event: Event): void {
    this._journeyNotes = {
      ...this._journeyNotes,
      [journey.journeyId]: (event.target as HTMLTextAreaElement).value,
    };
  }

  private _onNotesCommit(journey: NsE2Journey, event: Event): void {
    if (this._readOnly) return;
    const notes = (event.target as HTMLTextAreaElement).value.trim();
    if (notes === journey.notes) {
      const next = { ...this._journeyNotes };
      delete next[journey.journeyId];
      this._journeyNotes = next;
      return;
    }
    this._recordChange(
      'journeyNotesChanged',
      journey.journeyId,
      journey.notes,
      notes,
      `${journey.title}: ${this._msg.notes}`,
    );
  }

  private _currentEdits(): NsJourneysWidgetEdits {
    const edits = emptyNsJourneysWidgetEdits();
    edits.featurePriorities = { ...this._featurePriorities };
    Object.keys(this._businessRuleTexts).forEach(journeyId => {
      edits.journeyBusinessRules[journeyId] = parseNsBusinessRulesText(this._businessRuleTexts[journeyId] || '');
    });
    Object.keys(this._journeyNotes).forEach(journeyId => {
      edits.journeyNotes[journeyId] = (this._journeyNotes[journeyId] || '').trim();
    });
    return edits;
  }

  private _recordChange(
    kind: NsJourneysWidgetChangeKind,
    targetId: string,
    before: unknown,
    after: unknown,
    summary: string,
  ): NsJourneysWidgetChangeRecord {
    const change: NsJourneysWidgetChangeRecord = {
      id: `${kind}-${Date.now()}-${++this._changeSequence}`,
      at: new Date().toISOString(),
      kind,
      targetId,
      summary,
      before,
      after,
    };
    this._changeLog = [...this._changeLog, change];
    this._emitChange(change);
    return change;
  }

  private _emitChange(change: NsJourneysWidgetChangeRecord): void {
    if (!this._artifact) return;
    const detail: NsJourneysChangeEventDetail = {
      type: 'checkpoint-journeys-change',
      moduleName: this._artifact.moduleName,
      version: this._artifact.version,
      change,
      changes: [...this._changeLog],
      edits: this._currentEdits(),
    };
    this.dispatchEvent(new CustomEvent<NsJourneysChangeEventDetail>('ns-journeys-change', {
      detail,
      bubbles: true,
      composed: true,
    }));
  }

  private _submitReview(artifact: NsE2JourneysArtifact, action: NsJourneysReviewAction): void {
    const edits = this._currentEdits();
    if (action === 'adjust' && !hasNsJourneysWidgetEdits(edits) && !this._adjustment.trim()) return;
    this._recordChange(
      'reviewSubmitted',
      'checkpoint-journeys',
      null,
      { action, adjustment: this._adjustment.trim(), edits },
      action === 'approve' ? this._msg.approve : this._msg.requestAdjustment,
    );
    const payload: NsJourneysReviewPayload = buildNsJourneysReviewPayload({
      artifact,
      action,
      adjustment: this._adjustment,
      edits,
      changes: this._changeLog,
    });
    this.dispatchEvent(new CustomEvent<NsJourneysReviewPayload>('ns-journeys-review', {
      detail: payload,
      bubbles: true,
      composed: true,
    }));
  }
}

function isJourneysArtifact(value: unknown): value is NsE2JourneysArtifact {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Partial<NsE2JourneysArtifact>;
  return Array.isArray(candidate.actors)
    && Array.isArray(candidate.journeys)
    && Array.isArray(candidate.features)
    && typeof candidate.moduleName === 'string';
}

declare global {
  interface HTMLElementTagNameMap {
    'widget-ns-journeys-102020': WidgetNsJourneys102020;
  }
}
