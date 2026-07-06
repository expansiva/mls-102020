/// <mls fileReference="_102020_/l2/agentNewSolution3/steps/e2-journeys/widgetNs3Journeys.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import {
  ns3PipelineArtifactFileInfo,
  readJsonArtifact,
} from '/_102020_/l2/agentNewSolution3/helpers/ns3Fs.js';
import type {
  Ns3E2Actor,
  Ns3E2Feature,
  Ns3E2Journey,
  Ns3E2JourneyStep,
  Ns3E2JourneysArtifact,
  Ns3E2Priority,
} from '/_102020_/l2/agentNewSolution3/steps/e2-journeys/gate.js';
import {
  buildNs3JourneysReviewPayload,
  emptyNs3JourneysWidgetEdits,
  hasNs3JourneysWidgetEdits,
  NS3_E2_PRIORITIES,
  parseNs3BusinessRulesText,
  sameStringArray,
  serializeNs3BusinessRules,
} from '/_102020_/l2/agentNewSolution3/steps/e2-journeys/widgetNs3JourneysLogic.js';
import type {
  Ns3JourneysReviewAction,
  Ns3JourneysReviewPayload,
  Ns3JourneysWidgetChangeKind,
  Ns3JourneysWidgetChangeRecord,
  Ns3JourneysWidgetEdits,
} from '/_102020_/l2/agentNewSolution3/steps/e2-journeys/widgetNs3JourneysLogic.js';

type Ns3JourneysTab = 'overview' | 'rules' | 'notes';
type Ns3JourneysMode = 'new-module' | 'change-module';

export interface Ns3JourneysIteration {
  version: number;
  createdAt?: string;
  summary: string;
  status?: string;
}

export interface WidgetNs3JourneysConfig {
  project?: number;
  moduleName?: string;
  artifact?: Ns3E2JourneysArtifact;
  mode?: Ns3JourneysMode;
  readOnly?: boolean;
  history?: Ns3JourneysIteration[];
  uiLabels?: Partial<Ns3JourneysLabels>;
}

export type WidgetNs3JourneysValue = WidgetNs3JourneysConfig | Ns3E2JourneysArtifact;

export interface Ns3JourneysChangeEventDetail {
  type: 'checkpoint-journeys-change';
  moduleName: string;
  version: number;
  change: Ns3JourneysWidgetChangeRecord;
  changes: Ns3JourneysWidgetChangeRecord[];
  edits: Ns3JourneysWidgetEdits;
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

export type Ns3JourneysLabels = typeof messages_en;

const messages_ptBR: Ns3JourneysLabels = {
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

const priorityLabelsEn: Record<Ns3E2Priority, string> = {
  now: 'Now',
  soon: 'Soon',
  later: 'Later',
  never: 'Never',
};

const priorityLabelsPtBR: Record<Ns3E2Priority, string> = {
  now: 'Agora',
  soon: 'Em breve',
  later: 'Depois',
  never: 'Nunca',
};

@customElement('widget-ns3-journeys-102020')
export class WidgetNs3Journeys102020 extends StateLitElement {
  @property({ type: Object }) value: WidgetNs3JourneysValue | null = null;

  @state() private _loading = true;
  @state() private _artifact: Ns3E2JourneysArtifact | null = null;
  @state() private _error = '';
  @state() private _search = '';
  @state() private _selectedActorId = 'all';
  @state() private _selectedJourneyId = '';
  @state() private _activeTab: Ns3JourneysTab = 'overview';
  @state() private _adjustment = '';
  @state() private _featurePriorities: Record<string, Ns3E2Priority> = {};
  @state() private _businessRuleTexts: Record<string, string> = {};
  @state() private _journeyNotes: Record<string, string> = {};
  @state() private _changeLog: Ns3JourneysWidgetChangeRecord[] = [];

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

  private get _config(): WidgetNs3JourneysConfig {
    return this.value && !isJourneysArtifact(this.value) ? this.value : {};
  }

  private get _msg(): Ns3JourneysLabels {
    const base = this._artifact?.userLanguage === 'pt-BR' ? messages_ptBR : messages_en;
    return { ...base, ...(this._config.uiLabels || {}) };
  }

  private get _priorityLabels(): Record<Ns3E2Priority, string> {
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
      const fileInfo = ns3PipelineArtifactFileInfo(moduleName, 'e2-journeys', '.json');
      if (this._config.project) fileInfo.project = this._config.project;
      this._setArtifact(await readJsonArtifact<Ns3E2JourneysArtifact>(fileInfo, false));
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
    } finally {
      this._loading = false;
    }
  }

  override render(): TemplateResult {
    const m = this._msg;
    if (this._loading) return html`<section class="ns3-journeys"><div class="ns3-state">${m.loading}</div></section>`;
    if (this._error) return html`<section class="ns3-journeys"><div class="ns3-state ns3-state--error">${this._error}</div></section>`;
    if (!this._artifact) return html`<section class="ns3-journeys"><div class="ns3-state">${m.noArtifact}</div></section>`;

    const artifact = this._artifact;
    const visibleJourneys = this._visibleJourneys(artifact);
    const selectedJourney = this._selectedJourney(artifact, visibleJourneys);

    return html`
      <section class="ns3-journeys">
        ${this._renderHeader(artifact)}
        ${this._renderFilters(artifact, visibleJourneys)}
        ${this._renderActorMap(artifact)}
        <div class="ns3-main">
          ${this._renderJourneyList(artifact, visibleJourneys, selectedJourney)}
          ${selectedJourney ? this._renderJourneyDetail(artifact, selectedJourney) : html`<div class="ns3-detail"><div class="ns3-state">${m.noJourney}</div></div>`}
        </div>
        ${this._renderFeatureCatalog(artifact)}
        ${this._renderHistory(artifact)}
        ${this._renderReviewBar(artifact)}
      </section>
    `;
  }

  private _renderHeader(artifact: Ns3E2JourneysArtifact): TemplateResult {
    const m = this._msg;
    const mode = this._config.mode === 'change-module' ? m.changeModule : m.newModule;
    return html`
      <header class="ns3-header">
        <div>
          <div class="ns3-breadcrumb">${artifact.moduleName} / E2 / ${m.title}</div>
          <h2>${m.title}</h2>
          <p>${m.subtitle}</p>
        </div>
        <div class="ns3-header-meta">
          <span>${mode}</span>
          <strong>${m.version} v${artifact.version}</strong>
          ${this._readOnly ? html`<span>${m.readOnly}</span>` : nothing}
        </div>
      </header>
    `;
  }

  private _renderFilters(artifact: Ns3E2JourneysArtifact, visibleJourneys: Ns3E2Journey[]): TemplateResult {
    const m = this._msg;
    return html`
      <section class="ns3-filters">
        <label class="ns3-search">
          <span>${visibleJourneys.length} ${m.journeysFound}</span>
          <input
            .value=${this._search}
            placeholder=${m.searchPlaceholder}
            @input=${(event: Event) => { this._search = (event.target as HTMLInputElement).value; }}
          />
        </label>
        <div class="ns3-actor-filter" role="group" aria-label=${m.actorMap}>
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

  private _renderActorMap(artifact: Ns3E2JourneysArtifact): TemplateResult {
    const m = this._msg;
    return html`
      <section class="ns3-actor-map">
        <div class="ns3-section-title">
          <strong>${m.actorMap}</strong>
          <span>${artifact.actors.length} ${m.actors} / ${artifact.journeys.length} ${m.journeys}</span>
        </div>
        <div class="ns3-lanes">
          ${artifact.actors.map(actor => {
            const journeys = artifact.journeys.filter(journey => journey.actorId === actor.actorId);
            return html`
              <div class=${this._selectedActorId === actor.actorId ? 'ns3-lane is-filtered' : 'ns3-lane'}>
                <button class="ns3-lane-head" @click=${() => { this._selectedActorId = actor.actorId; }}>
                  <span>${actor.name}</span>
                  <strong>${journeys.length}</strong>
                </button>
                <div class="ns3-lane-items">
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
    artifact: Ns3E2JourneysArtifact,
    journeys: Ns3E2Journey[],
    selectedJourney: Ns3E2Journey | null,
  ): TemplateResult {
    const m = this._msg;
    const actorById = new Map(artifact.actors.map(actor => [actor.actorId, actor]));
    return html`
      <aside class="ns3-list">
        ${journeys.map(journey => {
          const actor = actorById.get(journey.actorId);
          return html`
            <button
              class=${selectedJourney?.journeyId === journey.journeyId ? 'ns3-journey-card is-selected' : 'ns3-journey-card'}
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

  private _renderJourneyDetail(artifact: Ns3E2JourneysArtifact, journey: Ns3E2Journey): TemplateResult {
    const m = this._msg;
    const actor = artifact.actors.find(item => item.actorId === journey.actorId);
    return html`
      <main class="ns3-detail">
        <header class="ns3-detail-head">
          <div>
            <span class="ns3-pill">${actor?.name || journey.actorId}</span>
            <h3>${journey.title}</h3>
            <code>${journey.journeyId}</code>
          </div>
        </header>

        <dl class="ns3-summary">
          ${this._renderDefinition(m.goal, journey.goal)}
          ${journey.soThat ? this._renderDefinition(m.soThat, journey.soThat) : nothing}
          ${journey.trigger ? this._renderDefinition(m.trigger, journey.trigger) : nothing}
          ${this._renderDefinition(m.outcome, journey.outcome)}
        </dl>

        <nav class="ns3-tabs" role="tablist">
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

  private _renderTab(tab: Ns3JourneysTab, label: string): TemplateResult {
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

  private _renderOverview(artifact: Ns3E2JourneysArtifact, journey: Ns3E2Journey): TemplateResult {
    const featureById = new Map(artifact.features.map(feature => [feature.featureId, feature]));
    return html`
      <ol class="ns3-steps">
        ${journey.steps.map((step, index) => html`
          <li>
            <span class="ns3-step-index">${index + 1}</span>
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

  private _renderStepFeatures(step: Ns3E2JourneyStep, featureById: Map<string, Ns3E2Feature>): TemplateResult {
    if (step.featureRefs.length === 0) return html``;
    return html`
      <div class="ns3-step-features">
        ${step.featureRefs.map(ref => {
          const feature = featureById.get(ref);
          return html`<span>${feature?.title || ref}</span>`;
        })}
      </div>
    `;
  }

  private _renderRules(journey: Ns3E2Journey): TemplateResult {
    const m = this._msg;
    return html`
      <section class="ns3-editor">
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

  private _renderNotes(journey: Ns3E2Journey): TemplateResult {
    const m = this._msg;
    return html`
      <section class="ns3-editor">
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

  private _renderFeatureCatalog(artifact: Ns3E2JourneysArtifact): TemplateResult {
    const m = this._msg;
    const actorById = new Map(artifact.actors.map(actor => [actor.actorId, actor]));
    return html`
      <section class="ns3-features">
        <div class="ns3-section-title">
          <strong>${m.featureCatalog}</strong>
          <span>${artifact.features.length} ${m.features}</span>
        </div>
        <div class="ns3-feature-grid">
          ${artifact.features.map(feature => html`
            <article class="ns3-feature">
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

  private _renderPrioritySelector(feature: Ns3E2Feature): TemplateResult {
    const m = this._msg;
    const current = this._currentPriority(feature);
    return html`
      <div class="ns3-priority" aria-label=${`${m.priority}: ${feature.title}`}>
        ${NS3_E2_PRIORITIES.map(priority => html`
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

  private _renderReviewBar(artifact: Ns3E2JourneysArtifact): TemplateResult {
    const m = this._msg;
    const edits = this._currentEdits();
    const hasReviewInput = hasNs3JourneysWidgetEdits(edits) || !!this._adjustment.trim();
    return html`
      <section class="ns3-review">
        <div class="ns3-review-input">
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
          <div class="ns3-review-buttons">
            <button ?disabled=${this._readOnly || !hasReviewInput} @click=${() => this._submitReview(artifact, 'adjust')}>
              ${m.requestAdjustment}
            </button>
            <button class="ns3-primary" ?disabled=${this._readOnly} @click=${() => this._submitReview(artifact, 'approve')}>
              ${hasNs3JourneysWidgetEdits(edits) ? m.approveWithChanges : m.approve}
            </button>
          </div>
        </div>
        <div class="ns3-change-preview">
          <strong>${m.changesPreview}</strong>
          ${this._changeLog.length === 0
            ? html`<p>${m.noChanges}</p>`
            : html`<ol>${this._changeLog.slice(-6).map(change => html`<li>${change.summary}</li>`)}</ol>`}
        </div>
      </section>
    `;
  }

  private _renderHistory(artifact: Ns3E2JourneysArtifact): TemplateResult {
    const m = this._msg;
    const items = this._historyItems(artifact);
    return html`
      <section class="ns3-history">
        <div class="ns3-section-title">
          <strong>${m.history}</strong>
          <span>${m.version} v${artifact.version}</span>
        </div>
        <ol class="ns3-history-list">
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

  private _historyItems(artifact: Ns3E2JourneysArtifact): Ns3JourneysIteration[] {
    const current: Ns3JourneysIteration = {
      version: artifact.version,
      createdAt: artifact.createdAt,
      summary: this._msg.currentVersion,
      status: 'current',
    };
    const history = this._config.history || [];
    if (history.length === 0) return [current];
    return history.some(item => item.version === artifact.version) ? history : [current, ...history];
  }

  private _setArtifact(artifact: Ns3E2JourneysArtifact | null): void {
    this._artifact = artifact;
    this._selectedJourneyId = artifact?.journeys[0]?.journeyId || '';
  }

  private _artifactFromValue(): Ns3E2JourneysArtifact | null {
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

  private _visibleJourneys(artifact: Ns3E2JourneysArtifact): Ns3E2Journey[] {
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
    journey: Ns3E2Journey,
    actor: Ns3E2Actor | undefined,
    featureById: Map<string, Ns3E2Feature>,
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

  private _selectedJourney(artifact: Ns3E2JourneysArtifact, visibleJourneys: Ns3E2Journey[]): Ns3E2Journey | null {
    const selected = visibleJourneys.find(journey => journey.journeyId === this._selectedJourneyId);
    return selected || visibleJourneys[0] || artifact.journeys[0] || null;
  }

  private _selectJourney(journeyId: string): void {
    this._selectedJourneyId = journeyId;
    this._activeTab = 'overview';
  }

  private _currentPriority(feature: Ns3E2Feature): Ns3E2Priority {
    return this._featurePriorities[feature.featureId] || feature.priority;
  }

  private _setFeaturePriority(feature: Ns3E2Feature, priority: Ns3E2Priority): void {
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

  private _businessRulesText(journey: Ns3E2Journey): string {
    return this._businessRuleTexts[journey.journeyId] ?? serializeNs3BusinessRules(journey.businessRules);
  }

  private _onRulesInput(journey: Ns3E2Journey, event: Event): void {
    this._businessRuleTexts = {
      ...this._businessRuleTexts,
      [journey.journeyId]: (event.target as HTMLTextAreaElement).value,
    };
  }

  private _onRulesCommit(journey: Ns3E2Journey, event: Event): void {
    if (this._readOnly) return;
    const text = (event.target as HTMLTextAreaElement).value;
    const rules = parseNs3BusinessRulesText(text);
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

  private _currentNotes(journey: Ns3E2Journey): string {
    return this._journeyNotes[journey.journeyId] ?? journey.notes;
  }

  private _onNotesInput(journey: Ns3E2Journey, event: Event): void {
    this._journeyNotes = {
      ...this._journeyNotes,
      [journey.journeyId]: (event.target as HTMLTextAreaElement).value,
    };
  }

  private _onNotesCommit(journey: Ns3E2Journey, event: Event): void {
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

  private _currentEdits(): Ns3JourneysWidgetEdits {
    const edits = emptyNs3JourneysWidgetEdits();
    edits.featurePriorities = { ...this._featurePriorities };
    Object.keys(this._businessRuleTexts).forEach(journeyId => {
      edits.journeyBusinessRules[journeyId] = parseNs3BusinessRulesText(this._businessRuleTexts[journeyId] || '');
    });
    Object.keys(this._journeyNotes).forEach(journeyId => {
      edits.journeyNotes[journeyId] = (this._journeyNotes[journeyId] || '').trim();
    });
    return edits;
  }

  private _recordChange(
    kind: Ns3JourneysWidgetChangeKind,
    targetId: string,
    before: unknown,
    after: unknown,
    summary: string,
  ): Ns3JourneysWidgetChangeRecord {
    const change: Ns3JourneysWidgetChangeRecord = {
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

  private _emitChange(change: Ns3JourneysWidgetChangeRecord): void {
    if (!this._artifact) return;
    const detail: Ns3JourneysChangeEventDetail = {
      type: 'checkpoint-journeys-change',
      moduleName: this._artifact.moduleName,
      version: this._artifact.version,
      change,
      changes: [...this._changeLog],
      edits: this._currentEdits(),
    };
    this.dispatchEvent(new CustomEvent<Ns3JourneysChangeEventDetail>('ns3-journeys-change', {
      detail,
      bubbles: true,
      composed: true,
    }));
  }

  private _submitReview(artifact: Ns3E2JourneysArtifact, action: Ns3JourneysReviewAction): void {
    const edits = this._currentEdits();
    if (action === 'adjust' && !hasNs3JourneysWidgetEdits(edits) && !this._adjustment.trim()) return;
    this._recordChange(
      'reviewSubmitted',
      'checkpoint-journeys',
      null,
      { action, adjustment: this._adjustment.trim(), edits },
      action === 'approve' ? this._msg.approve : this._msg.requestAdjustment,
    );
    const payload: Ns3JourneysReviewPayload = buildNs3JourneysReviewPayload({
      artifact,
      action,
      adjustment: this._adjustment,
      edits,
      changes: this._changeLog,
    });
    this.dispatchEvent(new CustomEvent<Ns3JourneysReviewPayload>('ns3-journeys-review', {
      detail: payload,
      bubbles: true,
      composed: true,
    }));
  }
}

function isJourneysArtifact(value: unknown): value is Ns3E2JourneysArtifact {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Partial<Ns3E2JourneysArtifact>;
  return Array.isArray(candidate.actors)
    && Array.isArray(candidate.journeys)
    && Array.isArray(candidate.features)
    && typeof candidate.moduleName === 'string';
}

declare global {
  interface HTMLElementTagNameMap {
    'widget-ns3-journeys-102020': WidgetNs3Journeys102020;
  }
}
