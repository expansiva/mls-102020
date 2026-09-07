/// <mls fileReference="_102020_/l2/agentNewSolution/widgets/widgetNs4AccessMatrix.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import {
  Ns4AccessGrant,
  Ns4E3Review,
} from '/_102020_/l2/agentNewSolution/steps/e3/contracts.js';
import { ns4WidgetLabels, type Ns4PhraseHolder, type Ns4WidgetLabelMap } from '/_102020_/l2/agentNewSolution/helpers/ns4Text.js';
import { Ns4ClarificationAction, Ns4ClarificationEvent, Ns4ClarificationFeedback, Ns4ClarificationIssue, Ns4ClarificationWidgetApi } from './clarification.js';

type AccessMatrixText = Ns4WidgetLabelMap<'accessMatrix'>;

@customElement('widget-ns4-access-matrix-102020')
export class WidgetNs4AccessMatrix102020 extends StateLitElement implements Ns4ClarificationWidgetApi {
  @property({ type: Object }) value: Ns4E3Review | null = null;
  @property({ type: Object }) presentation: Ns4PhraseHolder | undefined;
  @property({ type: Boolean }) readonly = false;

  @state() private adjustment = '';
  @state() private submitting = false;
  @state() private selectedGrantKey = '';
  @state() private feedbackIssues: Ns4ClarificationIssue[] = [];
  @state() private cancelOpen = false;
  @property({ type: String }) msgError = '';
  @property({ type: String }) msgOk = '';
  private feedbackFocusPending = false;
  private feedbackScrollPending = false;
  private cancelOrigin: HTMLElement | null = null;

  private text() {
    return ns4WidgetLabels(this.presentation, 'accessMatrix');
  }

  setFeedback(feedback: Ns4ClarificationFeedback | null): void {
    this.feedbackIssues = feedback?.issues || [];
    this.msgError = feedback?.kind === 'error' ? feedback.message : '';
    this.msgOk = feedback && feedback.kind !== 'error' ? feedback.message : '';
    this.feedbackFocusPending = feedback?.kind === 'error';
  }

  setSubmitting(submitting: boolean): void { this.submitting = submitting; }

  updated(): void {
    if (this.feedbackFocusPending && this.msgError) { this.feedbackFocusPending = false; setTimeout(() => (this.querySelector('.ns4-feedback[role="alert"]') as HTMLElement | null)?.focus()); }
    if (this.cancelOpen) setTimeout(() => (this.querySelector('.ns4-cancel-stay') as HTMLButtonElement | null)?.focus());
    if (this.feedbackScrollPending && (this.msgError || this.msgOk)) { this.feedbackScrollPending = false; (this.querySelector('.ns4-feedback') as HTMLElement | null)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }

  private submit(action: Ns4ClarificationAction) {
    if (!this.value || this.readonly || this.submitting) return;
    const text = this.text();
    if (action === 'requestChanges' && !this.adjustment.trim()) {
      this.setFeedback({ kind: 'error', message: text.adjustmentRequired });
      return;
    }
    this.setFeedback({ kind: 'information', message: action === 'approve' ? text.processingApproval : action === 'cancel' ? text.processingCancel : text.processingChanges });
    this.feedbackScrollPending = true;
    this.setSubmitting(true);
    this.dispatchEvent(new CustomEvent<Ns4ClarificationEvent<Ns4E3Review>>('ns4-access-matrix-review', {
      detail: { action, adjustment: this.adjustment.trim(), review: this.value },
      bubbles: true,
      composed: true,
    }));
  }

  private openCancel(event: Event): void { this.cancelOrigin = event.currentTarget as HTMLElement; this.cancelOpen = true; }
  private closeCancel(): void { this.cancelOpen = false; setTimeout(() => this.cancelOrigin?.focus()); }
  private trapCancel(event: KeyboardEvent): void {
    if (event.key === 'Escape') { event.preventDefault(); this.closeCancel(); return; }
    if (event.key !== 'Tab') return;
    const controls = [...this.querySelectorAll<HTMLButtonElement>('.ns4-cancel-dialog button')];
    const index = controls.indexOf(document.activeElement as HTMLButtonElement);
    event.preventDefault(); controls[(index + (event.shiftKey ? controls.length - 1 : 1)) % controls.length]?.focus();
  }
  private renderFeedback(text: AccessMatrixText) {
    if (!this.msgError && !this.msgOk) return '';
    const error = Boolean(this.msgError);
    return html`<section class="ns4-feedback ${error ? 'is-error' : 'is-ok'}" role=${error ? 'alert' : 'status'} aria-live=${error ? 'assertive' : 'polite'} tabindex="-1">${error ? html`<strong>${text.revise}</strong>` : ''}<span>${this.msgError || this.msgOk}</span>${this.feedbackIssues.length ? html`<ul>${this.feedbackIssues.map(issue => html`<li>${issue.path ? html`<code>${issue.path}</code> — ` : ''}${issue.message}</li>`)}</ul>` : ''}</section>`;
  }
  private renderCancelDialog(text: AccessMatrixText) {
    if (!this.cancelOpen) return '';
    return html`<div class="ns4-dialog-backdrop"><section class="ns4-cancel-dialog" role="dialog" aria-modal="true" aria-labelledby="ns4-access-cancel-title" @keydown=${this.trapCancel}><h3 id="ns4-access-cancel-title">${text.cancelTitle}</h3><p>${text.cancelText}</p><div><button class="secondary ns4-cancel-stay" @click=${this.closeCancel}>${text.keepWorking}</button><button class="danger" @click=${() => { this.closeCancel(); this.submit('cancel'); }}>${text.cancel}</button></div></section></div>`;
  }

  private grantKey(grant: Ns4AccessGrant): string {
    return `${grant.profileRef}\u0000${grant.authorityRef}`;
  }

  private selectedGrant(): Ns4AccessGrant | undefined {
    if (!this.value) return undefined;
    return this.value.grants.find(grant => this.grantKey(grant) === this.selectedGrantKey);
  }

  render() {
    const text = this.text();
    if (!this.value) return html`<div class="ns4-empty">${text.empty}</div>`;
    const selected = this.selectedGrant();
    const hasAdjustment = Boolean(this.adjustment.trim());
    return html`
      <section class="ns4-access-matrix">
        <header>
          <div><p class="ns4-step">${text.step} 3 ${text.of} 6</p><h2>${this.value.title}</h2><p>${text.subtitle}</p></div>
          <span>${text.round} ${this.value.reviewRound}</span>
        </header>
        ${this.renderFeedback(text)}

        ${this.renderMatrix(selected, text)}

        ${selected ? this.renderDetails(selected, text) : ''}

        <footer>
          <label><span>${text.adjustment}</span><textarea
            .value=${this.adjustment}
            placeholder=${text.placeholder}
            ?disabled=${this.submitting || this.readonly}
            @input=${(event: Event) => { this.adjustment = (event.target as HTMLTextAreaElement).value; }}
          ></textarea></label>
          <div>
            <button class="cancel" ?disabled=${this.submitting || this.readonly} @click=${this.openCancel}>${text.cancel}</button>
            <button class="secondary ${hasAdjustment ? 'is-active' : ''}" ?disabled=${this.submitting || this.readonly || !hasAdjustment} @click=${() => this.submit('requestChanges')}>${text.requestChanges}</button>
            <button class="primary ${hasAdjustment ? '' : 'is-active'}" ?disabled=${this.submitting || this.readonly || hasAdjustment} @click=${() => this.submit('approve')}>${text.approve}</button>
          </div>
        </footer>
        ${this.renderCancelDialog(text)}
      </section>
    `;
  }

  private renderDetails(grant: Ns4AccessGrant, text: AccessMatrixText) {
    const profile = this.value!.profiles.find(item => item.profileId === grant.profileRef);
    const authority = this.value!.authorities.find(item => item.authorityRef === grant.authorityRef);
    return html`
      <section class="ns4-details">
        <div class="ns4-details-head"><div><h3>${text.details}</h3><p>${profile?.title} → ${authority?.title}</p></div><div><code>${grant.authorityRef}</code><button class="ns4-close" @click=${() => { this.selectedGrantKey = ''; }}>${text.close}</button></div></div>
        <div class="ns4-detail-grid">
          <article><h4>${text.reason}</h4><p>${grant.reason}</p></article>
          <article><h4>${text.scope}</h4><strong>${grant.dataScope.mode}</strong><p>${grant.dataScope.description}</p></article>
          <article><h4>${text.disclosure}</h4><strong>${grant.disclosure.mode}</strong><p>${grant.disclosure.description}</p></article>
          <article><h4>${text.journeySteps}</h4><p>${authority?.journeyStepRefs.join(', ') || '—'}</p></article>
        </div>
        <div class="ns4-detail-lists">
          <article><h4>${text.allowed}</h4><ul>${grant.disclosure.allowedInformation.map(item => html`<li>${item}</li>`)}</ul></article>
          <article><h4>${text.denied}</h4><ul>${grant.disclosure.deniedInformation.map(item => html`<li>${item}</li>`)}</ul></article>
          <article><h4>${text.ruleRefs}</h4><ul>${grant.useRules.map(ruleId => html`<li><code>${ruleId}</code></li>`)}</ul></article>
          <article><h4>${text.informationNeeds}</h4><ul>${authority?.informationNeeds.map(item => html`<li>${item}</li>`)}</ul></article>
        </div>
      </section>
    `;
  }

  private renderMatrix(selected: Ns4AccessGrant | undefined, text: AccessMatrixText) {
    return html`
      <section class="ns4-matrix-card">
        <h3>${text.matrix}</h3>
        <div class="ns4-table-scroll"><table>
          <thead><tr><th>${text.authority}</th>${this.value!.profiles.map(profile => html`<th>${profile.title}</th>`)}</tr></thead>
          <tbody>${this.value!.authorities.map(authority => html`
            <tr><th><strong>${authority.title}</strong><code>${authority.authorityRef}</code></th>
              ${this.value!.profiles.map(profile => {
                const grant = this.value!.grants.find(item => item.profileRef === profile.profileId && item.authorityRef === authority.authorityRef);
                if (!grant) return html`<td><span class="ns4-none" title=${text.noAccess}>—</span></td>`;
                const full = grant.disclosure.mode === 'fullRecord';
                const key = this.grantKey(grant);
                return html`<td><label class="ns4-grant ${selected === grant ? 'selected' : ''} ${full ? 'full' : 'limited'}">
                  <input type="radio" name="ns4-access-grant" .checked=${selected === grant} @change=${() => { this.selectedGrantKey = key; }}>
                  <span>${full ? text.full : text.limited}</span>
                </label></td>`;
              })}
            </tr>
          `)}</tbody>
        </table></div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'widget-ns4-access-matrix-102020': WidgetNs4AccessMatrix102020;
  }
}
