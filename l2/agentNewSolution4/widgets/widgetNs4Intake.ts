/// <mls fileReference="_102020_/l2/agentNewSolution4/widgets/widgetNs4Intake.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { Ns4E1Review, Ns4ReviewPolicy, Ns4SolutionStrategy, policyFor } from '/_102020_/l2/agentNewSolution4/steps/e1/contracts.js';
import { Ns4ClarificationAction, Ns4ClarificationEvent, Ns4ClarificationFeedback, Ns4ClarificationIssue, Ns4ClarificationWidgetApi } from './clarification.js';

const strategies: Array<{ id: Ns4SolutionStrategy; title: string; description: string; preserves: string; changes: string; e4: string }> = [
  { id: 'newSolution', title: 'New solution', description: 'Build a new module without a mandatory legacy database.', preserves: 'No legacy schema is required.', changes: 'Data model may be designed from the approved flow.', e4: 'No legacy schema is required.' },
  { id: 'modernizePreserveDatabase', title: 'Modernize, preserving the current database', description: 'Keep the existing schema as the immutable source of truth.', preserves: 'Tables, columns, keys and relationships.', changes: 'The new system adapts to the existing model.', e4: 'Schema metadata is required for validation.' },
  { id: 'modernizeEvolveDatabase', title: 'Modernize with controlled database evolution', description: 'Start from the current schema and evolve it with explicit approval.', preserves: 'Existing schema remains the initial reference.', changes: 'Prefer additive, compatible changes.', e4: 'Compare the desired ontology with the legacy schema.' },
  { id: 'replaceAndMigrateData', title: 'Replace the system and migrate data', description: 'Create a new model while migrating data from the current system.', preserves: 'Legacy data remains a migration source.', changes: 'The destination model may be redesigned.', e4: 'Source structure and destination requirements are required.' },
];

@customElement('widget-ns4-intake-102020')
export class WidgetNs4Intake102020 extends StateLitElement implements Ns4ClarificationWidgetApi {
  @property({ type: Object }) value: Ns4E1Review | null = null;
  @property({ type: Boolean }) readonly = false;
  @state() private adjustment = '';
  @state() private submitting = false;
  @state() private feedbackIssues: Ns4ClarificationIssue[] = [];
  @state() private cancelOpen = false;
  @property({ type: String }) msgError = '';
  @property({ type: String }) msgOk = '';
  private feedbackFocusPending = false;
  private cancelOrigin: HTMLElement | null = null;

  private patch(patch: Partial<Ns4E1Review>) { if (!this.value || this.readonly) return; this.value = { ...this.value, ...patch }; }
  private text(path: string): string { return path; }
  private updateInput(path: 'moduleName' | 'title' | 'purpose' | 'languages' | 'defaultLanguage' | 'actors' | 'outcomes' | 'inScope' | 'outOfScope' | 'integrations' | 'sourceSystemName' | 'sourceTechnology' | 'databaseEngine' | 'databaseVersion' | 'schemaAvailability' | 'notes', event: Event) {
    if (!this.value) return;
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
    const split = (item: string) => item.split(/\n|,/).map(part => part.trim()).filter(Boolean);
    if (path === 'moduleName') return this.patch({ module: { ...this.value.module, moduleName: value } });
    if (path === 'title') return this.patch({ module: { ...this.value.module, title: value } });
    if (path === 'purpose') return this.patch({ module: { ...this.value.module, purpose: value }, businessScope: { ...this.value.businessScope, mainGoal: value } });
    if (path === 'languages') return this.patch({ localization: { ...this.value.localization, productLanguages: split(value) } });
    if (path === 'defaultLanguage') return this.patch({ localization: { ...this.value.localization, defaultLanguage: value } });
    if (path === 'actors') return this.patch({ businessScope: { ...this.value.businessScope, actors: split(value).map((title, index) => ({ actorId: `actor${index + 1}`, title, kind: 'internal', expectedOutcome: '' })) } });
    if (path === 'outcomes') return this.patch({ businessScope: { ...this.value.businessScope, expectedOutcomes: split(value).map((title, index) => ({ outcomeId: `outcome${index + 1}`, title, description: title })) } });
    if (path === 'inScope' || path === 'outOfScope') return this.patch({ businessScope: { ...this.value.businessScope, [path]: split(value) } });
    if (path === 'integrations') return this.patch({ declaredConstraints: { ...this.value.declaredConstraints, mandatoryIntegrations: split(value).map((title, index) => ({ dependencyId: `dependency${index + 1}`, title, kind: 'unknown', reason: title })) } });
    const modernization = { ...(this.value.strategy.modernization || { sourceSystemName: '', schemaAvailability: 'uploadAtE4' as const }), [path]: value };
    this.patch({ strategy: { ...this.value.strategy, modernization } });
  }

  private selectStrategy(mode: Ns4SolutionStrategy) {
    if (!this.value || this.readonly) return;
    this.patch({ strategy: { ...this.value.strategy, mode, databaseChangePolicy: policyFor(mode), ...(mode === 'newSolution' ? {} : { modernization: this.value.strategy.modernization || { sourceSystemName: '', schemaAvailability: 'uploadAtE4' } }) } });
  }

  private selectReviewPolicy(mode: Ns4ReviewPolicy) { if (this.value && !this.readonly) this.patch({ reviewPolicy: { mode } }); }
  private labels() {
    const language = this.value?.userLanguage?.toLowerCase() || 'en';
    if (language.startsWith('pt')) return { adjustmentRequired: 'Escreva o que precisa mudar antes de gerar uma nova proposta.', processingApproval: 'Validando definição inicial…', processingChanges: 'Preparando nova revisão…', processingCancel: 'Cancelando execução…', revise: 'Revise os itens abaixo', cancel: 'Cancelar execução', cancelTitle: 'Cancelar esta execução?', cancelText: 'O processamento será encerrado. O histórico e os artefatos já aprovados serão preservados.', keepWorking: 'Continuar trabalhando' };
    if (language.startsWith('es')) return { adjustmentRequired: 'Describa qué debe cambiar antes de generar una propuesta nueva.', processingApproval: 'Validando definición inicial…', processingChanges: 'Preparando una nueva revisión…', processingCancel: 'Cancelando la ejecución…', revise: 'Revise los elementos a continuación', cancel: 'Cancelar ejecución', cancelTitle: '¿Cancelar esta ejecución?', cancelText: 'El procesamiento terminará. Se conservarán el historial y los artefactos aprobados.', keepWorking: 'Seguir trabajando' };
    return { adjustmentRequired: 'Describe what should change before generating another proposal.', processingApproval: 'Validating initial definition…', processingChanges: 'Preparing a new review…', processingCancel: 'Cancelling execution…', revise: 'Review the items below', cancel: 'Cancel execution', cancelTitle: 'Cancel this execution?', cancelText: 'Processing will end. The history and approved artifacts will be preserved.', keepWorking: 'Keep working' };
  }
  setFeedback(feedback: Ns4ClarificationFeedback | null): void { this.feedbackIssues = feedback?.issues || []; this.msgError = feedback?.kind === 'error' ? feedback.message : ''; this.msgOk = feedback && feedback.kind !== 'error' ? feedback.message : ''; this.feedbackFocusPending = feedback?.kind === 'error'; }
  setSubmitting(submitting: boolean): void { this.submitting = submitting; }
  updated(): void { if (this.feedbackFocusPending && this.msgError) { this.feedbackFocusPending = false; setTimeout(() => (this.querySelector('.ns4-feedback[role="alert"]') as HTMLElement | null)?.focus()); } if (this.cancelOpen) setTimeout(() => (this.querySelector('.ns4-cancel-stay') as HTMLButtonElement | null)?.focus()); }
  private submit(action: Ns4ClarificationAction) {
    if (!this.value || this.readonly || this.submitting) return;
    const labels = this.labels();
    if (action === 'requestChanges' && !this.adjustment.trim()) { this.setFeedback({ kind: 'error', message: labels.adjustmentRequired }); return; }
    this.setFeedback({ kind: 'information', message: action === 'approve' ? labels.processingApproval : action === 'cancel' ? labels.processingCancel : labels.processingChanges });
    this.setSubmitting(true);
    this.dispatchEvent(new CustomEvent<Ns4ClarificationEvent<Ns4E1Review>>('ns4-intake-review', { detail: { action, adjustment: this.adjustment.trim(), review: this.value }, bubbles: true, composed: true }));
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
  private renderFeedback() { const labels = this.labels(); if (!this.msgError && !this.msgOk) return ''; const error = Boolean(this.msgError); return html`<section class="ns4-feedback ${error ? 'is-error' : 'is-ok'}" role=${error ? 'alert' : 'status'} aria-live=${error ? 'assertive' : 'polite'} tabindex="-1">${error ? html`<strong>${labels.revise}</strong>` : ''}<span>${this.msgError || this.msgOk}</span>${this.feedbackIssues.length ? html`<ul>${this.feedbackIssues.map(issue => html`<li>${issue.path ? html`<code>${issue.path}</code> — ` : ''}${issue.message}</li>`)}</ul>` : ''}</section>`; }
  private renderCancelDialog() { const labels = this.labels(); if (!this.cancelOpen) return ''; return html`<div class="ns4-dialog-backdrop"><section class="ns4-cancel-dialog" role="dialog" aria-modal="true" aria-labelledby="ns4-intake-cancel-title" @keydown=${this.trapCancel}><h3 id="ns4-intake-cancel-title">${labels.cancelTitle}</h3><p>${labels.cancelText}</p><div><button class="secondary ns4-cancel-stay" @click=${this.closeCancel}>${labels.keepWorking}</button><button class="danger" @click=${() => { this.closeCancel(); this.submit('cancel'); }}>${labels.cancel}</button></div></section></div>`; }

  render() {
    const review = this.value;
    if (!review) return html`<div class="ns4-empty">No initial definition is available.</div>`;
    const modernizing = review.strategy.mode !== 'newSolution';
    const hasAdjustment = Boolean(this.adjustment.trim());
    const disabled = this.readonly || this.submitting;
    return html`<section class="ns4-intake"><header><div><p class="ns4-step">👤 Step 1 of 6</p><h2>Initial solution definition</h2><p>Confirm the intent, scope and constraints that guide the following reviews.</p></div><span>Review ${review.reviewRound}</span></header>${this.renderFeedback()}
      <section><h3>Solution identity</h3><div class="ns4-grid three"><label><span>Technical module name</span><input .value=${review.module.moduleName} ?disabled=${disabled} @input=${(e: Event) => this.updateInput('moduleName', e)}></label><label><span>Friendly title</span><input .value=${review.module.title} ?disabled=${disabled} @input=${(e: Event) => this.updateInput('title', e)}></label><label class="wide"><span>Main objective</span><textarea .value=${review.module.purpose} ?disabled=${disabled} @input=${(e: Event) => this.updateInput('purpose', e)}></textarea></label></div></section>
      <section><h3>Build strategy</h3><div class="ns4-strategies">${strategies.map(strategy => html`<label class="ns4-strategy ${review.strategy.mode === strategy.id ? 'selected' : ''}"><input type="radio" name="ns4-strategy" .checked=${review.strategy.mode === strategy.id} ?disabled=${disabled} @change=${() => this.selectStrategy(strategy.id)}><span><strong>${strategy.title}</strong><small>${strategy.description}</small><em>Data policy: ${policyFor(strategy.id)}</em><dl><div><dt>Preserves</dt><dd>${strategy.preserves}</dd></div><div><dt>May change</dt><dd>${strategy.changes}</dd></div><div><dt>E4</dt><dd>${strategy.e4}</dd></div></dl></span></label>`)}</div></section>
      <section><h3>Business scope</h3><div class="ns4-grid two"><label><span>Initial business actors</span><textarea .value=${review.businessScope.actors.map(item => item.title).join('\n')} ?disabled=${disabled} @input=${(e: Event) => this.updateInput('actors', e)}></textarea></label><label><span>Expected outcomes</span><textarea .value=${review.businessScope.expectedOutcomes.map(item => item.title).join('\n')} ?disabled=${disabled} @input=${(e: Event) => this.updateInput('outcomes', e)}></textarea></label><label><span>In scope</span><textarea .value=${review.businessScope.inScope.join('\n')} ?disabled=${disabled} @input=${(e: Event) => this.updateInput('inScope', e)}></textarea></label><label><span>Out of scope</span><textarea .value=${review.businessScope.outOfScope.join('\n')} ?disabled=${disabled} @input=${(e: Event) => this.updateInput('outOfScope', e)}></textarea></label></div></section>
      <section><h3>Languages and region</h3><div class="ns4-grid three"><label><span>Conversation language</span><input .value=${review.userLanguage} disabled></label><label><span>Product languages</span><input .value=${review.localization.productLanguages.join(', ')} ?disabled=${disabled} @input=${(e: Event) => this.updateInput('languages', e)}></label><label><span>Default language</span><input .value=${review.localization.defaultLanguage} ?disabled=${disabled} @input=${(e: Event) => this.updateInput('defaultLanguage', e)}></label></div></section>
      ${modernizing ? html`<section class="ns4-modernization"><h3>Modernization information</h3><div class="ns4-grid three"><label><span>Source system name</span><input .value=${review.strategy.modernization?.sourceSystemName || ''} ?disabled=${disabled} @input=${(e: Event) => this.updateInput('sourceSystemName', e)}></label><label><span>Source technology</span><input .value=${review.strategy.modernization?.sourceTechnology || ''} ?disabled=${disabled} @input=${(e: Event) => this.updateInput('sourceTechnology', e)}></label><label><span>Schema availability</span><select .value=${review.strategy.modernization?.schemaAvailability || 'uploadAtE4'} ?disabled=${disabled} @change=${(e: Event) => this.updateInput('schemaAvailability', e)}><option value="uploadAtE4">Upload at E4</option><option value="metadataAtE4">Metadata at E4</option><option value="notAvailableYet">Not available yet</option></select></label></div></section>` : ''}
      <section><h3>Declared constraints</h3><label><span>Mandatory integrations or critical constraints</span><textarea .value=${review.declaredConstraints.mandatoryIntegrations.map(item => item.title).join('\n')} ?disabled=${disabled} @input=${(e: Event) => this.updateInput('integrations', e)}></textarea></label></section>
      <section><h3>Follow-up mode</h3><div class="ns4-policies">${([{ id: 'guided', title: 'Guided review', text: 'Show every review from E1 to E6.' }, { id: 'smart', title: 'Smart review', text: 'Show later reviews only when there is risk or a relevant decision.' }, { id: 'automatic', title: 'Automatic execution', text: 'Generate and validate all artifacts; open later reviews only when forced.' }] as Array<{ id: Ns4ReviewPolicy; title: string; text: string }>).map(policy => html`<label class=${review.reviewPolicy.mode === policy.id ? 'selected' : ''}><input type="radio" name="ns4-review-policy" .checked=${review.reviewPolicy.mode === policy.id} ?disabled=${disabled} @change=${() => this.selectReviewPolicy(policy.id)}><span><strong>${policy.title}</strong><small>${policy.text}</small></span></label>`)}</div></section>
      <footer><label><span>Request an adjustment</span><textarea .value=${this.adjustment} placeholder="Example: Include Spanish, keep the current database immutable and require SAP integration." ?disabled=${disabled} @input=${(e: Event) => { this.adjustment = (e.target as HTMLTextAreaElement).value; }}></textarea></label><div><button class="cancel" ?disabled=${disabled} @click=${this.openCancel}>${this.labels().cancel}</button><button class="secondary ${hasAdjustment ? 'is-active' : ''}" ?disabled=${disabled || !hasAdjustment} @click=${() => this.submit('requestChanges')}>Generate another proposal</button><button class="primary ${hasAdjustment ? '' : 'is-active'}" ?disabled=${disabled || hasAdjustment} @click=${() => this.submit('approve')}>Approve initial definition</button></div></footer>${this.renderCancelDialog()}
    </section>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'widget-ns4-intake-102020': WidgetNs4Intake102020 } }
