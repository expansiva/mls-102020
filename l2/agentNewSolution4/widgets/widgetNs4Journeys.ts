/// <mls fileReference="_102020_/l2/agentNewSolution4/widgets/widgetNs4Journeys.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { Ns4E2Review, Ns4E2ReviewEvent, Ns4JourneyProposal } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';

type Ns4JourneysTab = 'overview' | 'rules';

@customElement('widget-ns4-journeys-102020')
export class WidgetNs4Journeys102020 extends StateLitElement {
  @property({ type: Object }) value: Ns4E2Review | null = null;
  @property({ type: Boolean }) readonly = false;

  @state() private adjustment = '';
  @state() private submitting = false;
  @state() private selectedActorRef = 'all';
  @state() private selectedJourneyId = '';
  @state() private activeTab: Ns4JourneysTab = 'overview';

  private labels() {
    const pt = this.value?.userLanguage?.toLowerCase().startsWith('pt');
    return pt ? {
      subtitle: 'Estas jornadas serão a fonte de verdade permanente do produto.',
      actor: 'Ator', goal: 'Objetivo', entry: 'Entrada', prerequisites: 'Pré-requisitos',
      context: 'Contexto de negócio', steps: 'Passos', requires: 'Requer', provides: 'Produz',
      rules: 'Regras', outcome: 'Resultado e evidências', features: 'Funcionalidades',
      journeys: 'Jornadas', journeysFound: 'jornadas encontradas', selectJourney: 'Selecione uma jornada para revisar.',
      allActors: 'Todos os atores', actorMap: 'Mapa de jornadas por ator', actors: 'atores', overview: 'Visão geral',
      rulesHelp: 'Regras que devem continuar verdadeiras em toda execução desta jornada.',
      adjustment: 'O que deve mudar?', placeholder: 'Descreva a alteração necessária sem reescrever o que já está correto.',
      requestChanges: 'Pedir mudanças', approve: 'Aprovar jornadas', round: 'Revisão',
      adjustmentRequired: 'Escreva o que precisa mudar antes de solicitar uma nova versão.',
    } : {
      subtitle: 'These journeys will become the permanent source of truth for the product.',
      actor: 'Actor', goal: 'Goal', entry: 'Entry', prerequisites: 'Prerequisites',
      context: 'Business context', steps: 'Steps', requires: 'Requires', provides: 'Provides',
      rules: 'Rules', outcome: 'Outcome and evidence', features: 'Features',
      journeys: 'Journeys', journeysFound: 'journeys found', selectJourney: 'Select a journey to review.',
      allActors: 'All actors', actorMap: 'Journey map by actor', actors: 'actors', overview: 'Overview',
      rulesHelp: 'Rules that must remain true in every execution of this journey.',
      adjustment: 'What should change?', placeholder: 'Describe the needed change without rewriting what is already correct.',
      requestChanges: 'Request changes', approve: 'Approve journeys', round: 'Review',
      adjustmentRequired: 'Describe what must change before requesting another version.',
    };
  }

  private submit(action: Ns4E2ReviewEvent['action']) {
    if (!this.value || this.readonly || this.submitting) return;
    const labels = this.labels();
    if (action === 'requestChanges' && !this.adjustment.trim()) {
      window.alert(labels.adjustmentRequired);
      return;
    }
    this.submitting = true;
    this.dispatchEvent(new CustomEvent<Ns4E2ReviewEvent>('ns4-journeys-review', {
      detail: { action, adjustment: this.adjustment.trim(), review: this.value },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    if (!this.value) return html`<div class="ns4-empty">No E2 review available.</div>`;
    const labels = this.labels();
    const actorRefs = [...new Set(this.value.journeys.map(item => item.business.actorRef))];
    const visibleJourneys = this.value.journeys.filter(item => this.selectedActorRef === 'all' || item.business.actorRef === this.selectedActorRef);
    const journey = visibleJourneys.find(item => item.journeyId === this.selectedJourneyId) || visibleJourneys[0] || this.value.journeys[0];
    if (!journey) return html`<div class="ns4-empty">${labels.selectJourney}</div>`;
    return html`
      <section class="ns4-journeys">
        <header class="ns4-header">
          <div>
            <div class="ns4-breadcrumb">E2 · ${labels.journeys}</div>
            <h2>${this.value.title}</h2>
            <p>${labels.subtitle}</p>
          </div>
          <div class="ns4-header-meta">
            <span>${labels.round} ${this.value.reviewRound}</span>
            <strong>${this.value.journeys.length} ${labels.journeysFound}</strong>
          </div>
        </header>

        <section class="ns4-filters">
          <span>${visibleJourneys.length} ${labels.journeysFound}</span>
          <div class="ns4-actor-filter" role="group" aria-label=${labels.actorMap}>
            <button class=${this.selectedActorRef === 'all' ? 'is-active' : ''} @click=${() => this.selectActor('all', this.value?.journeys || [])}>
              ${labels.allActors}
            </button>
            ${actorRefs.map(actorRef => html`
              <button class=${this.selectedActorRef === actorRef ? 'is-active' : ''} @click=${() => this.selectActor(actorRef, this.value?.journeys || [])}>
                ${this.actorLabel(actorRef)}
              </button>
            `)}
          </div>
        </section>

        <section class="ns4-actor-map">
          <div class="ns4-section-title"><strong>${labels.actorMap}</strong><span>${actorRefs.length} ${labels.actors} / ${this.value.journeys.length} ${labels.journeys}</span></div>
          <div class="ns4-lanes">
            ${actorRefs.map(actorRef => {
              const actorJourneys = this.value?.journeys.filter(item => item.business.actorRef === actorRef) || [];
              return html`
                <div class="ns4-lane ${this.selectedActorRef === actorRef ? 'is-filtered' : ''}">
                  <button class="ns4-lane-head" @click=${() => this.selectActor(actorRef, actorJourneys)}><span>${this.actorLabel(actorRef)}</span><strong>${actorJourneys.length}</strong></button>
                  <div class="ns4-lane-items">${actorJourneys.map(item => html`
                    <button class=${item.journeyId === journey.journeyId ? 'is-selected' : ''} @click=${() => this.selectJourney(item.journeyId)}>${item.business.title}</button>
                  `)}</div>
                </div>
              `;
            })}
          </div>
        </section>

        <div class="ns4-main">
          <aside class="ns4-list">
            <div class="ns4-section-title"><strong>${labels.journeys}</strong><span>${visibleJourneys.length} ${labels.journeysFound}</span></div>
            <div class="ns4-list-items">
              ${visibleJourneys.map(item => html`
                <button class="ns4-journey-card ${item.journeyId === journey.journeyId ? 'is-selected' : ''}"
                  @click=${() => this.selectJourney(item.journeyId)}>
                  <code>${item.journeyId}</code>
                  <strong>${item.business.title}</strong>
                  <span>${this.actorLabel(item.business.actorRef)}</span>
                  <small>${item.business.goal}</small>
                </button>
              `)}
            </div>
          </aside>

          <article class="ns4-detail">
            <div class="ns4-detail-head">
              <div><code>${journey.journeyId}</code><h3>${journey.business.title}</h3></div>
              <span class="ns4-pill">${journey.business.entry.mode}</span>
            </div>

            <dl class="ns4-summary">
              <div><dt>${labels.actor}</dt><dd>${this.actorLabel(journey.business.actorRef)}</dd></div>
              <div><dt>${labels.goal}</dt><dd>${journey.business.goal}</dd></div>
              <div><dt>${labels.outcome}</dt><dd>${journey.business.outcome.statement}</dd></div>
            </dl>

            <nav class="ns4-tabs" role="tablist">
              ${this.renderTab('overview', labels.overview)}
              ${this.renderTab('rules', labels.rules)}
            </nav>

            ${this.activeTab === 'overview' ? this.renderOverview(journey, labels) : this.renderRules(journey, labels)}
          </article>
        </div>

        <section class="ns4-features">
          <div class="ns4-section-title"><strong>${labels.features}</strong><span>${this.value.features.length}</span></div>
          <div class="ns4-feature-grid">${this.value.features.map(feature => html`
            <article><div><strong>${feature.title}</strong><code>${feature.featureId}</code></div><span>${feature.priority}</span></article>
          `)}</div>
        </section>

        <footer class="ns4-review">
          <label><span>${labels.adjustment}</span><textarea
            .value=${this.adjustment}
            placeholder=${labels.placeholder}
            ?disabled=${this.submitting || this.readonly}
            @input=${(event: Event) => { this.adjustment = (event.target as HTMLTextAreaElement).value; }}
          ></textarea></label>
          <div>
            <button class="secondary" ?disabled=${this.submitting || this.readonly} @click=${() => this.submit('requestChanges')}>${labels.requestChanges}</button>
            <button class="primary" ?disabled=${this.submitting || this.readonly} @click=${() => this.submit('approve')}>${labels.approve}</button>
          </div>
        </footer>
      </section>
    `;
  }

  private selectActor(actorRef: string, journeys: Ns4JourneyProposal[]): void {
    this.selectedActorRef = actorRef;
    this.selectedJourneyId = journeys.find(item => actorRef === 'all' || item.business.actorRef === actorRef)?.journeyId || '';
    this.activeTab = 'overview';
  }

  private actorLabel(actorRef: string): string {
    const readable = actorRef.replace(/([a-z])([A-Z])/g, '$1 $2');
    return `${readable.slice(0, 1).toUpperCase()}${readable.slice(1)}`;
  }

  private selectJourney(journeyId: string): void {
    this.selectedJourneyId = journeyId;
    this.activeTab = 'overview';
  }

  private renderTab(tab: Ns4JourneysTab, label: string) {
    return html`<button role="tab" aria-selected=${this.activeTab === tab ? 'true' : 'false'} class=${this.activeTab === tab ? 'is-active' : ''} @click=${() => { this.activeTab = tab; }}>${label}</button>`;
  }

  private renderOverview(journey: Ns4JourneyProposal, labels: ReturnType<WidgetNs4Journeys102020['labels']>) {
    return html`
      <div class="ns4-context-grid">
        <section>
          <h4>${labels.prerequisites}</h4>
          ${journey.business.prerequisites.length ? html`<ul>${journey.business.prerequisites.map(item => html`
            <li><code>${item.journeyRef}</code> — ${item.reason}${item.providesContext.length ? html` → <code>${item.providesContext.join(', ')}</code>` : ''}</li>
          `)}</ul>` : html`<p>—</p>`}
        </section>
        <section>
          <h4>${labels.entry} · ${labels.context}</h4>
          ${journey.business.entry.carries.length ? html`<ul>${journey.business.entry.carries.map(context => html`
            <li><code>${context.contextId}</code> — ${context.businessObject}: ${context.description}${context.stateRequirement ? html` (${context.stateRequirement})` : ''}</li>
          `)}</ul>` : html`<p>—</p>`}
        </section>
      </div>
      <section class="ns4-steps-section">
        <h4>${labels.steps}</h4>
        <ol class="ns4-steps">${journey.business.steps.map((step, index) => html`
          <li>
            <span class="ns4-step-index">${index + 1}</span>
            <div>
              <div class="ns4-step-title"><span>${step.kind}</span><strong>${step.intent}</strong><code>${step.stepId}</code></div>
              <p>${step.result}</p>
              <small>${labels.requires}: ${step.requiresContext.join(', ') || '—'} · ${labels.provides}: ${step.providesContext.map(item => item.contextId).join(', ') || '—'}</small>
            </div>
          </li>
        `)}</ol>
      </section>
    `;
  }

  private renderRules(journey: Ns4JourneyProposal, labels: ReturnType<WidgetNs4Journeys102020['labels']>) {
    return html`
      <section class="ns4-rules">
        <p>${labels.rulesHelp}</p>
        <ol>${journey.business.businessRules.map(rule => html`<li><code>${rule.journeyRuleId}</code><span>${rule.statement}</span></li>`)}</ol>
        <div class="ns4-outcome"><h4>${labels.outcome}</h4><p>${journey.business.outcome.statement}</p><ul>${journey.business.outcome.evidence.map(item => html`<li>${item}</li>`)}</ul></div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'widget-ns4-journeys-102020': WidgetNs4Journeys102020;
  }
}
