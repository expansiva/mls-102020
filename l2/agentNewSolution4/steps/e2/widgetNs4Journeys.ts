/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e2/widgetNs4Journeys.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { Ns4E2Review, Ns4E2ReviewEvent } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';

@customElement('widget-ns4-journeys-102020')
export class WidgetNs4Journeys102020 extends StateLitElement {
  @property({ type: Object }) value: Ns4E2Review | null = null;
  @property({ type: Boolean }) readonly = false;

  @state() private adjustment = '';
  @state() private submitting = false;

  private labels() {
    const pt = this.value?.userLanguage?.toLowerCase().startsWith('pt');
    return pt ? {
      subtitle: 'Estas jornadas serão a fonte de verdade permanente do produto.',
      actor: 'Ator', goal: 'Objetivo', entry: 'Entrada', prerequisites: 'Pré-requisitos',
      context: 'Contexto de negócio', steps: 'Passos', requires: 'Requer', provides: 'Produz',
      rules: 'Regras', outcome: 'Resultado e evidências', features: 'Funcionalidades',
      adjustment: 'O que deve mudar?', placeholder: 'Descreva a alteração necessária sem reescrever o que já está correto.',
      requestChanges: 'Pedir mudanças', approve: 'Aprovar jornadas', round: 'Revisão',
      adjustmentRequired: 'Escreva o que precisa mudar antes de solicitar uma nova versão.',
    } : {
      subtitle: 'These journeys will become the permanent source of truth for the product.',
      actor: 'Actor', goal: 'Goal', entry: 'Entry', prerequisites: 'Prerequisites',
      context: 'Business context', steps: 'Steps', requires: 'Requires', provides: 'Provides',
      rules: 'Rules', outcome: 'Outcome and evidence', features: 'Features',
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
    return html`
      <section class="ns4-journeys">
        <header>
          <div>
            <h2>${this.value.title}</h2>
            <p>${labels.subtitle}</p>
          </div>
          <span>${labels.round} ${this.value.reviewRound}</span>
        </header>

        <div class="ns4-feature-list">
          <h3>${labels.features}</h3>
          <div>
            ${this.value.features.map(feature => html`
              <article><strong>${feature.title}</strong><span>${feature.priority}</span><code>${feature.featureId}</code></article>
            `)}
          </div>
        </div>

        <div class="ns4-journey-list">
          ${this.value.journeys.map(journey => html`
            <article class="ns4-journey">
              <div class="ns4-journey-head">
                <div><code>${journey.journeyId}</code><h3>${journey.business.title}</h3></div>
                <span>${journey.business.entry.mode}</span>
              </div>
              <dl>
                <div><dt>${labels.actor}</dt><dd>${journey.business.actorRef}</dd></div>
                <div><dt>${labels.goal}</dt><dd>${journey.business.goal}</dd></div>
              </dl>

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

              <section>
                <h4>${labels.steps}</h4>
                <ol class="ns4-steps">${journey.business.steps.map(step => html`
                  <li>
                    <div><span>${step.kind}</span><strong>${step.intent}</strong><code>${step.stepId}</code></div>
                    <p>${step.result}</p>
                    <small>${labels.requires}: ${step.requiresContext.join(', ') || '—'} · ${labels.provides}: ${step.providesContext.map(item => item.contextId).join(', ') || '—'}</small>
                  </li>
                `)}</ol>
              </section>

              <section class="ns4-two-columns">
                <div><h4>${labels.rules}</h4><ul>${journey.business.businessRules.map(rule => html`<li><code>${rule.journeyRuleId}</code> — ${rule.statement}</li>`)}</ul></div>
                <div><h4>${labels.outcome}</h4><p>${journey.business.outcome.statement}</p><ul>${journey.business.outcome.evidence.map(item => html`<li>${item}</li>`)}</ul></div>
              </section>
            </article>
          `)}
        </div>

        <footer>
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
}

declare global {
  interface HTMLElementTagNameMap {
    'widget-ns4-journeys-102020': WidgetNs4Journeys102020;
  }
}
