/// <mls fileReference="_102020_/l2/agentNewSolution/widgets/widgetNs4Ontology.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import {
  Ns4E4Review,
  Ns4OntologyEntity,
  Ns4StorageTarget,
} from '/_102020_/l2/agentNewSolution/steps/e4/contracts.js';
import { ns4WidgetLabels, type Ns4PhraseHolder, type Ns4WidgetLabelMap } from '/_102020_/l2/agentNewSolution/helpers/ns4Text.js';
import { Ns4ClarificationAction, Ns4ClarificationEvent, Ns4ClarificationFeedback, Ns4ClarificationIssue, Ns4ClarificationWidgetApi } from './clarification.js';

type OntologyText = Ns4WidgetLabelMap<'ontology'>;

@customElement('widget-ns4-ontology-102020')
export class WidgetNs4Ontology102020 extends StateLitElement implements Ns4ClarificationWidgetApi {
  @property({ type: Object }) value: Ns4E4Review | null = null;
  @property({ type: Object }) presentation: Ns4PhraseHolder | undefined;
  @property({ type: Boolean }) readonly = false;
  @state() private selectedEntityId = '';
  @state() private activeTab: 'fields' | 'overview' | 'relationships' | 'descriptions' = 'fields';
  @state() private adjustment = '';
  @state() private submitting = false;
  @state() private feedbackIssues: Ns4ClarificationIssue[] = [];
  @state() private cancelOpen = false;
  @property({ type: String }) msgError = '';
  @property({ type: String }) msgOk = '';
  private feedbackFocusPending = false;
  private feedbackScrollPending = false;
  private cancelOrigin: HTMLElement | null = null;

  private text() {
    return ns4WidgetLabels(this.presentation, 'ontology');
  }

  private selectedEntity(): Ns4OntologyEntity | undefined {
    return this.value?.entities.find(item => item.entityId === this.selectedEntityId) || this.value?.entities[0];
  }

  private selectEntity(entityId: string): void {
    this.selectedEntityId = entityId;
    this.activeTab = 'fields';
  }

  private storageLabel(target: Ns4StorageTarget, text: OntologyText): string {
    if (target === 'mdm') return text.targetMdm;
    if (target === 'moduleDatabase') return text.targetModuleDatabase;
    if (target === 'derived') return text.targetDerived;
    if (target === 'external') return text.targetExternal;
    return text.targetEmbedded;
  }

  private updateEntity(patch: Partial<Ns4OntologyEntity>) {
    const selected = this.selectedEntity();
    if (!this.value || !selected || this.readonly) return;
    this.value = { ...this.value, entities: this.value.entities.map(entity => entity.entityId === selected.entityId ? { ...entity, ...patch } : entity) };
  }

  private updateField(fieldId: string, patch: { title?: string; description?: string }) {
    const selected = this.selectedEntity();
    if (!selected) return;
    this.updateEntity({ fields: selected.fields.map(field => field.fieldId === fieldId ? { ...field, ...patch } : field) });
  }

  private updateInlineField(fieldId: string, property: 'title' | 'description', event: Event) {
    const value = (event.currentTarget as HTMLElement).innerText.trim();
    this.updateField(fieldId, property === 'title' ? { title: value } : { description: value });
  }

  private finishInlineEdit(event: KeyboardEvent) {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).blur();
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
    if (action === 'requestChanges' && !this.adjustment.trim()) {
      this.setFeedback({ kind: 'error', message: this.text().requiredAdjustment });
      return;
    }
    const text = this.text();
    this.setFeedback({ kind: 'information', message: action === 'approve' ? text.processingApproval : action === 'cancel' ? text.processingCancel : text.processingChanges });
    this.feedbackScrollPending = true;
    this.setSubmitting(true);
    this.dispatchEvent(new CustomEvent<Ns4ClarificationEvent<Ns4E4Review>>('ns4-ontology-review', {
      detail: { action, adjustment: this.adjustment.trim(), review: this.value }, bubbles: true, composed: true,
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
  private renderFeedback(text: OntologyText) {
    if (!this.msgError && !this.msgOk) return '';
    const error = Boolean(this.msgError);
    return html`<section class="ns4-feedback ${error ? 'is-error' : 'is-ok'}" role=${error ? 'alert' : 'status'} aria-live=${error ? 'assertive' : 'polite'} tabindex="-1">${error ? html`<strong>${text.revise}</strong>` : ''}<span>${this.msgError || this.msgOk}</span>${this.feedbackIssues.length ? html`<ul>${this.feedbackIssues.map(issue => html`<li>${issue.path ? html`<code>${issue.path}</code> — ` : ''}${issue.message}</li>`)}</ul>` : ''}</section>`;
  }
  private renderCancelDialog(text: OntologyText) {
    if (!this.cancelOpen) return '';
    return html`<div class="ns4-dialog-backdrop"><section class="ns4-cancel-dialog" role="dialog" aria-modal="true" aria-labelledby="ns4-ontology-cancel-title" @keydown=${this.trapCancel}><h3 id="ns4-ontology-cancel-title">${text.cancelTitle}</h3><p>${text.cancelText}</p><div><button class="secondary ns4-cancel-stay" @click=${this.closeCancel}>${text.keepWorking}</button><button class="danger" @click=${() => { this.closeCancel(); this.submit('cancel'); }}>${text.cancel}</button></div></section></div>`;
  }

  render() {
    const text = this.text();
    if (!this.value) return html`<div class="ns4-empty">${text.empty}</div>`;
    const entity = this.selectedEntity();
    const hasAdjustment = Boolean(this.adjustment.trim());
    return html`
      <section class="ns4-ontology">
        <header>
          <div><p class="ns4-step">${text.step} 4 ${text.of} 6</p><h2>${this.value.title}</h2><p>${text.subtitle}</p></div>
          <span class="ns4-review">${text.round} ${this.value.reviewRound}</span>
        </header>
        ${this.renderFeedback(text)}
        ${this.value.systemDecisions?.length ? html`
          <details class="ns4-system-decisions">
            <summary>${text.assumedDecisions} (${this.value.systemDecisions.length})</summary>
            <div>${this.value.systemDecisions.map(decision => html`
              <article>
                <strong>${decision.question}</strong>
                <p>${decision.chosen}</p>
                <small><b>${text.changeHint}:</b> ${decision.changeHint}</small>
              </article>
            `)}</div>
          </details>
        ` : ''}

        <div class="ns4-workbench">
          <aside aria-label=${text.entities}>
            <h3>${text.entities}</h3>
            ${this.value.entities.map(item => html`<button class=${entity?.entityId === item.entityId ? 'selected' : ''}
              @click=${() => this.selectEntity(item.entityId)}><strong>${item.title}</strong><small>${item.entityId}</small>
              <span class="ns4-nav-target target-${item.storage.target}">${this.storageLabel(item.storage.target, text)}</span></button>`)}
          </aside>
          ${entity ? this.renderEntity(entity, text) : ''}
        </div>

        <footer class="ns4-footer">
          <label><span>${text.structural}</span><textarea .value=${this.adjustment} placeholder=${text.placeholder} ?disabled=${this.submitting || this.readonly}
            @input=${(event: Event) => { this.adjustment = (event.target as HTMLTextAreaElement).value; }}></textarea>
          </label>
          <div class="ns4-actions">
            <button class="cancel" ?disabled=${this.submitting || this.readonly} @click=${this.openCancel}>${text.cancel}</button>
            <button class="secondary ${hasAdjustment ? 'is-active' : ''}" ?disabled=${this.submitting || this.readonly || !hasAdjustment} @click=${() => this.submit('requestChanges')}>${text.request}</button>
            <button class="primary ${hasAdjustment ? '' : 'is-active'}" ?disabled=${this.submitting || this.readonly || hasAdjustment} @click=${() => this.submit('approve')}>${text.approve}</button>
          </div>
        </footer>
        ${this.renderCancelDialog(text)}
      </section>`;
  }

  private renderEntity(entity: Ns4OntologyEntity, text: OntologyText) {
    return html`<main>
      <div class="ns4-entity-head"><div><h3>${entity.title}</h3><code>${entity.entityId} · ${entity.kind} · ${entity.ownership}</code></div>
        <span class="ns4-target-badge target-${entity.storage.target}">${this.storageLabel(entity.storage.target, text)}</span></div>
      <div class="ns4-tabs">
        <button class=${this.activeTab === 'fields' ? 'selected' : ''} @click=${() => { this.activeTab = 'fields'; }}>${text.fields}</button>
        <button class=${this.activeTab === 'overview' ? 'selected' : ''} @click=${() => { this.activeTab = 'overview'; }}>${text.overview}</button>
        <button class=${this.activeTab === 'relationships' ? 'selected' : ''} @click=${() => { this.activeTab = 'relationships'; }}>${text.relationships}</button>
        <button class=${this.activeTab === 'descriptions' ? 'selected' : ''} @click=${() => { this.activeTab = 'descriptions'; }}>${text.descriptions}</button>
      </div>
      ${this.activeTab === 'fields' ? this.renderFields(entity, text) : ''}
      ${this.activeTab === 'overview' ? this.renderOverview(entity, text) : ''}
      ${this.activeTab === 'relationships' ? this.renderRelationships(entity, text) : ''}
      ${this.activeTab === 'descriptions' ? this.renderDescriptions(entity, text) : ''}
    </main>`;
  }

  private renderFields(entity: Ns4OntologyEntity, text: OntologyText) {
    return html`<section class="ns4-fields"><div class="ns4-section-title"><h3>${text.fields}</h3><p>${text.fieldRulesHint}</p></div><div class="ns4-table-scroll"><table>
      <thead><tr><th>Id</th><th>${text.fieldTitle}</th><th>${text.fieldDescription}</th><th>Type</th><th>Mode</th><th>${text.constraints}</th></tr></thead>
      <tbody>${entity.fields.map(field => html`<tr><td><code>${field.fieldId}</code></td>
        <td><span class="ns4-inline-edit" contenteditable=${this.readonly ? 'false' : 'true'} title=${text.editInPlace}
          @blur=${(event: Event) => this.updateInlineField(field.fieldId, 'title', event)} @keydown=${this.finishInlineEdit}>${field.title}</span>${this.readonly ? '' : html`<span class="ns4-edit-marker" aria-hidden="true">✎</span>`}</td>
        <td><span class="ns4-inline-edit ns4-description-edit" contenteditable=${this.readonly ? 'false' : 'true'} title=${text.editInPlace}
          @blur=${(event: Event) => this.updateInlineField(field.fieldId, 'description', event)} @keydown=${this.finishInlineEdit}>${field.description}</span>${this.readonly ? '' : html`<span class="ns4-edit-marker" aria-hidden="true">✎</span>`}</td>
        <td><code>${field.type}</code></td><td>${field.required ? text.required : text.optional}</td>
        <td>${field.constraints.map(constraint => html`<span title=${constraint.description}>${constraint.kind}: ${constraint.value} <em>${constraint.source}</em></span>`)}</td></tr>`)}</tbody>
    </table></div></section>`;
  }

  private renderOverview(entity: Ns4OntologyEntity, text: OntologyText) {
    return html`<section class="ns4-overview"><dl>
      <div><dt>${text.source}</dt><dd>${[...entity.sourceRefs.journeyIds, ...entity.sourceRefs.featureIds, ...entity.sourceRefs.authorityRefs].join(', ') || '—'}</dd></div>
      <div><dt>${text.storage}</dt><dd><strong>${this.storageLabel(entity.storage.target, text)}</strong> · ${text.scope}: ${entity.storage.scope}</dd></div>
      ${entity.storage.idField ? html`<div><dt>${text.idField}</dt><dd><code>${entity.storage.idField}</code></dd></div>` : ''}
      ${entity.storage.mdmType ? html`<div><dt>${text.mdmType}</dt><dd><code>${entity.storage.mdmType}</code></dd></div>` : ''}
      <div><dt>${text.reason}</dt><dd>${entity.storage.notes || '—'}</dd></div></dl>
      <div class="ns4-entity-details"><article><h3>${text.lifecycle}</h3><p>${this.lifecycleLine(entity) || '—'}</p></article>
        <article><h3>${text.ruleRefs}</h3><ul>${entity.useRules.map(ruleId => html`<li><code>${ruleId}</code></li>`)}</ul></article></div>
    </section>`;
  }

  private renderRelationships(entity: Ns4OntologyEntity, text: OntologyText) {
    const origin = this.value!.relationships.filter(item => item.fromEntity === entity.entityId);
    const destination = this.value!.relationships.filter(item => item.toEntity === entity.entityId);
    return html`<section class="ns4-relationships"><div class="ns4-relationship-group"><h3>${text.sourceRelationships}</h3>
      ${this.renderRelationshipList(origin, text)}</div><div class="ns4-relationship-group"><h3>${text.destinationRelationships}</h3>${this.renderRelationshipList(destination, text)}</div></section>`;
  }

  private renderRelationshipList(relationships: Ns4E4Review['relationships'], text: OntologyText) {
    return relationships.length ? html`<div class="ns4-relationship-list">${relationships.map(relationship => {
      const from = this.value!.entities.find(item => item.entityId === relationship.fromEntity);
      const to = this.value!.entities.find(item => item.entityId === relationship.toEntity);
      const crossStore = !!from && !!to && from.storage.target !== to.storage.target;
      const realization = relationship.realization;
      const fromFields = realization?.from.fieldIds.join(', ') || '∅';
      const toFields = realization?.to.fieldIds.join(', ') || '∅';
      return html`<article><strong>${relationship.fromEntity} → ${relationship.toEntity}</strong><code>${relationship.type} · ${relationship.persistence.mode}</code>
        ${realization ? html`<p><strong>${text.implementation}:</strong> <code>${realization.kind}</code> ·
          <code>${relationship.fromEntity}.${fromFields}</code> → <code>${relationship.toEntity}.${toFields}</code></p>` : ''}
        ${crossStore ? html`<span class="ns4-cross-store">${text.crossStore}</span>` : ''}<p>${relationship.description}</p>
        ${realization ? html`<p>${realization.description}</p>` : ''}</article>`;
    })}</div>` : html`<p class="ns4-no-relationships">${text.noRelationships}</p>`;
  }

  private renderDescriptions(entity: Ns4OntologyEntity, text: OntologyText) {
    return html`<section class="ns4-descriptions"><h3>${entity.title}</h3><code>${entity.entityId}</code><p>${entity.description || '—'}</p></section>`;
  }

  private lifecycleLine(entity: Ns4OntologyEntity): string {
    return entity.lifecycleStates.map(code => {
      const label = entity.lifecycleLabels?.find(item => item.code === code)?.label;
      return label && label !== code ? `${label} (${code})` : code;
    }).join(' → ');
  }
}

declare global { interface HTMLElementTagNameMap { 'widget-ns4-ontology-102020': WidgetNs4Ontology102020 } }
