/// <mls fileReference="_102020_/l2/aura/molecules/shared/widgetDecisionClarification.ts" enhancement="_102027_/l2/enhancementLit"/>

// Generic "Decision Clarification" widget: renders a set of questions (each with
// options + an optional free-text note) and emits a `clarification-finish` CustomEvent
// with { value: { answers }, action: 'continue' | 'cancel' }. Reusable by any agent's
// checkpoint (collab_messages.md "Rendering a checkpoint"). No Shadow DOM (StateLitElement)
// — styles live in the sibling .less scoped under the tag.

import { html, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import {
  allDecisionAnswered,
  buildDecisionResult,
  initialDecisionAnswers,
  type DecisionAction,
  type DecisionClarificationValue,
  type DecisionLocalAnswer,
} from '/_102020_/l2/aura/molecules/shared/widgetDecisionClarificationLogic.js';

@customElement('widget-decision-clarification-102020')
export class WidgetDecisionClarification102020 extends StateLitElement {
  @property({ type: Object }) value: DecisionClarificationValue | null = null;
  @property({ type: Boolean }) readonly = false;

  @state() private localAnswers: Record<string, DecisionLocalAnswer> = {};
  @state() private initialized = false;

  protected willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('value') && this.value && !this.initialized) {
      this.localAnswers = initialDecisionAnswers(this.value.questions);
      this.initialized = true;
    }
  }

  private onSelect(questionId: string, optionId: string): void {
    const prev = this.localAnswers[questionId] || { optionId: '', notes: '' };
    this.localAnswers = { ...this.localAnswers, [questionId]: { ...prev, optionId } };
  }

  private onNotes(questionId: string, notes: string): void {
    const prev = this.localAnswers[questionId] || { optionId: '', notes: '' };
    this.localAnswers = { ...this.localAnswers, [questionId]: { ...prev, notes } };
  }

  private finish(action: DecisionAction): void {
    const answers = this.value ? buildDecisionResult(this.value.questions, this.localAnswers) : [];
    this.dispatchEvent(new CustomEvent('clarification-finish', {
      detail: { value: { answers }, action },
      bubbles: true,
    }));
  }

  protected render(): TemplateResult {
    if (!this.value) return html`<div class="empty">No clarification.</div>`;
    const canContinue = !this.readonly && allDecisionAnswered(this.value.questions, this.localAnswers);
    return html`
      <div class="dc">
        <h2 class="dc-title">${this.value.title}</h2>
        ${this.value.intro ? html`<p class="dc-intro">${this.value.intro}</p>` : nothing}
        ${this.value.questions.map(q => html`
          <div class="dc-q">
            ${q.title ? html`<div class="dc-q-title">${q.title}</div>` : nothing}
            <div class="dc-q-text">${q.question}</div>
            <div class="dc-options">
              ${q.options.map(opt => html`
                <label class="dc-option ${opt.recommended ? 'is-recommended' : ''}">
                  <input
                    type="radio"
                    name=${q.id}
                    .checked=${this.localAnswers[q.id]?.optionId === opt.id}
                    ?disabled=${this.readonly}
                    @change=${() => this.onSelect(q.id, opt.id)}
                  />
                  <span class="dc-option-label">${opt.label}${opt.recommended ? html`<span class="dc-badge">recommended</span>` : nothing}</span>
                  ${opt.description ? html`<span class="dc-option-desc">${opt.description}</span>` : nothing}
                </label>
              `)}
            </div>
            ${q.allowNotes ? html`
              <textarea
                class="dc-notes"
                placeholder=${q.notesPlaceholder || 'Custom / notes'}
                ?disabled=${this.readonly}
                .value=${this.localAnswers[q.id]?.notes ?? ''}
                @input=${(e: Event) => this.onNotes(q.id, (e.target as HTMLTextAreaElement).value)}
              ></textarea>
            ` : nothing}
          </div>
        `)}
        <div class="dc-actions">
          <button class="dc-btn dc-cancel" ?disabled=${this.readonly} @click=${() => this.finish('cancel')}>Cancel</button>
          <button class="dc-btn dc-continue" ?disabled=${!canContinue} @click=${() => this.finish('continue')}>Continue</button>
        </div>
      </div>
    `;
  }
}
