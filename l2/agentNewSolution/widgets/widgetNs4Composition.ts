/// <mls fileReference="_102020_/l2/agentNewSolution/widgets/widgetNs4Composition.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { ns4WidgetLabels, type Ns4PhraseHolder } from '/_102020_/l2/agentNewSolution/helpers/ns4Text.js';
import { Ns4E6Review, Ns4E6ReviewEvent } from '/_102020_/l2/agentNewSolution/steps/e6/contracts.js';
import { Ns4ClarificationAction, Ns4ClarificationFeedback, Ns4ClarificationIssue, Ns4ClarificationWidgetApi } from './clarification.js';

@customElement('widget-ns4-composition-102020')
export class WidgetNs4Composition102020 extends StateLitElement implements Ns4ClarificationWidgetApi {
  @property({ type: Object }) value: Ns4E6Review | null = null;
  @property({ type: Object }) presentation: Ns4PhraseHolder | undefined;
  @property({ type: Boolean }) readonly = false;
  @property({ type: String }) msgError = '';
  @property({ type: String }) msgOk = '';
  @state() private adjustment = '';
  @state() private submitting = false;
  @state() private feedbackIssues: Ns4ClarificationIssue[] = [];
  @state() private cancelOpen = false;
  private cancelOrigin: HTMLElement | null = null;

  private text() {
    return ns4WidgetLabels(this.presentation, 'composition');
  }

  setFeedback(feedback: Ns4ClarificationFeedback | null): void {
    this.feedbackIssues = feedback?.issues || [];
    this.msgError = feedback?.kind === 'error' ? feedback.message : '';
    this.msgOk = feedback && feedback.kind !== 'error' ? feedback.message : '';
  }
  setSubmitting(submitting: boolean): void { this.submitting = submitting; }

  private submit(action: Ns4ClarificationAction): void {
    if (!this.value || this.readonly || this.submitting) return;
    const text = this.text();
    if (action === 'requestChanges' && !this.adjustment.trim()) {
      this.setFeedback({ kind: 'error', message: text.adjustmentRequired }); return;
    }
    this.setFeedback({ kind: 'information', message: action === 'approve' ? text.processingApproval : action === 'cancel' ? text.processingCancel : text.processingChanges });
    this.setSubmitting(true);
    this.dispatchEvent(new CustomEvent<Ns4E6ReviewEvent>('ns4-composition-review', {
      detail: { action, adjustment: this.adjustment.trim(), review: this.value }, bubbles: true, composed: true,
    }));
  }
  private openCancel(event: Event): void { this.cancelOrigin = event.currentTarget as HTMLElement; this.cancelOpen = true; }
  private closeCancel(): void { this.cancelOpen = false; setTimeout(() => this.cancelOrigin?.focus()); }

  render() {
    const text = this.text();
    if (!this.value) return html`<div class="ns4-empty">${text.empty}</div>`;
    const hasAdjustment = Boolean(this.adjustment.trim());
    return html`<section class="ns4-composition">
      <header><div><p class="ns4-step">${text.step}</p><h2>${this.value.title}</h2><p>${text.hint}</p></div><span>${text.review} ${this.value.reviewRound}</span></header>
      ${this.renderFeedback(text)}
      <section class="ns4-summary"><p>${this.value.analysisSummary}</p></section>
      <section class="ns4-recommendations">
        ${this.value.recommendations.length ? this.value.recommendations.map(item => html`<article>
          <div><span class="kind">${item.kind === 'horizontalModule' ? text.horizontalModule : text.plugin}</span><span class="decision ${item.decision}">${item.decision === 'include' ? text.include : text.defer}</span></div>
          <h3>${item.title}</h3><p>${item.purpose}</p><code>${item.id}</code>
        </article>`) : html`<div class="ns4-empty-state"><strong>✓</strong><p>${text.empty}</p></div>`}
      </section>
      <footer><label><span>${text.adjustment}</span><textarea .value=${this.adjustment} placeholder=${text.placeholder}
        ?disabled=${this.submitting || this.readonly} @input=${(event: Event) => { this.adjustment = (event.target as HTMLTextAreaElement).value; }}></textarea></label><div>
        <button class="cancel" ?disabled=${this.submitting || this.readonly} @click=${this.openCancel}>${text.cancel}</button>
        <button class="secondary ${hasAdjustment ? 'is-active' : ''}" ?disabled=${this.submitting || this.readonly || !hasAdjustment} @click=${() => this.submit('requestChanges')}>${text.request}</button>
        <button class="primary ${hasAdjustment ? '' : 'is-active'}" ?disabled=${this.submitting || this.readonly || hasAdjustment} @click=${() => this.submit('approve')}>${text.approve}</button>
      </div></footer>${this.renderCancelDialog(text)}
    </section>`;
  }

  private renderFeedback(text: ReturnType<WidgetNs4Composition102020['text']>) {
    if (!this.msgError && !this.msgOk) return '';
    const error = Boolean(this.msgError);
    return html`<section class="ns4-feedback ${error ? 'is-error' : 'is-ok'}" role=${error ? 'alert' : 'status'} tabindex="-1">${error ? html`<strong>${text.revise}</strong>` : ''}<span>${this.msgError || this.msgOk}</span>${this.feedbackIssues.length ? html`<ul>${this.feedbackIssues.map(issue => html`<li>${issue.path ? html`<code>${issue.path}</code> — ` : ''}${issue.message}</li>`)}</ul>` : ''}</section>`;
  }
  private renderCancelDialog(text: ReturnType<WidgetNs4Composition102020['text']>) {
    if (!this.cancelOpen) return '';
    return html`<div class="ns4-dialog-backdrop"><section class="ns4-cancel-dialog" role="dialog" aria-modal="true"><h3>${text.cancelTitle}</h3><p>${text.cancelText}</p><div><button class="secondary" @click=${this.closeCancel}>${text.keepWorking}</button><button class="danger" @click=${() => { this.closeCancel(); this.submit('cancel'); }}>${text.cancel}</button></div></section></div>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'widget-ns4-composition-102020': WidgetNs4Composition102020; } }
