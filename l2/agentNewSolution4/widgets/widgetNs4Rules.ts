/// <mls fileReference="_102020_/l2/agentNewSolution4/widgets/widgetNs4Rules.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { Ns4E5Review, Ns4E5ReviewEvent, Ns4RuleDefinition } from '/_102020_/l2/agentNewSolution4/steps/e5/contracts.js';
import { Ns4ClarificationAction, Ns4ClarificationFeedback, Ns4ClarificationIssue, Ns4ClarificationWidgetApi } from './clarification.js';

@customElement('widget-ns4-rules-102020')
export class WidgetNs4Rules102020 extends StateLitElement implements Ns4ClarificationWidgetApi {
  @property({ type: Object }) value: Ns4E5Review | null = null;
  @property({ type: Boolean }) readonly = false;
  @property({ type: String }) msgError = '';
  @property({ type: String }) msgOk = '';
  @state() private search = '';
  @state() private selectedRuleId = '';
  @state() private adjustment = '';
  @state() private submitting = false;
  @state() private feedbackIssues: Ns4ClarificationIssue[] = [];
  @state() private cancelOpen = false;
  private cancelOrigin: HTMLElement | null = null;

  private text() {
    const language = this.value?.userLanguage?.toLowerCase() || 'en';
    if (language.startsWith('pt')) return {
      step: '👤 Etapa 5 de 6 — Regras de negócio', review: 'Revisão', rules: 'regras', search: 'Buscar por ID ou descrição',
      noRule: 'Nenhuma regra encontrada.', adjustment: 'O que deve mudar?',
      placeholder: 'Exemplo: altere a regra clientAvailable para permitir somente um cliente ativo por projeto.',
      request: 'Gerar nova proposta', approve: 'Aprovar regras', cancel: 'Cancelar execução',
      adjustmentRequired: 'Descreva a alteração necessária antes de gerar outra proposta.',
      processingApproval: 'Validando regras…', processingChanges: 'Preparando nova revisão…', processingCancel: 'Cancelando execução…',
      revise: 'Revise os itens abaixo', cancelTitle: 'Cancelar esta execução?',
      cancelText: 'O processamento será encerrado. Os artefatos já aprovados serão preservados.', keepWorking: 'Continuar trabalhando',
      hint: 'Cada regra permanente contém somente um ID estável e uma descrição de negócio.', edit: 'Clique para editar a descrição',
    };
    if (language.startsWith('es')) return {
      step: '👤 Paso 5 de 6 — Reglas de negocio', review: 'Revisión', rules: 'reglas', search: 'Buscar por ID o descripción',
      noRule: 'No se encontraron reglas.', adjustment: '¿Qué debe cambiar?',
      placeholder: 'Ejemplo: cambie la regla clientAvailable para permitir solo un cliente activo por proyecto.',
      request: 'Generar otra propuesta', approve: 'Aprobar reglas', cancel: 'Cancelar ejecución',
      adjustmentRequired: 'Describa el cambio antes de generar otra propuesta.',
      processingApproval: 'Validando reglas…', processingChanges: 'Preparando otra revisión…', processingCancel: 'Cancelando ejecución…',
      revise: 'Revise los elementos siguientes', cancelTitle: '¿Cancelar esta ejecución?',
      cancelText: 'El procesamiento terminará. Los artefactos aprobados serán preservados.', keepWorking: 'Seguir trabajando',
      hint: 'Cada regla permanente contiene solo un ID estable y una descripción de negocio.', edit: 'Haga clic para editar la descripción',
    };
    return {
      step: '👤 Step 5 of 6 — Business rules', review: 'Review', rules: 'rules', search: 'Search by ID or description',
      noRule: 'No rules found.', adjustment: 'What should change?',
      placeholder: 'Example: change clientAvailable to allow only one active client per project.',
      request: 'Generate another proposal', approve: 'Approve rules', cancel: 'Cancel execution',
      adjustmentRequired: 'Describe the required change before generating another proposal.',
      processingApproval: 'Validating rules…', processingChanges: 'Preparing another review…', processingCancel: 'Cancelling execution…',
      revise: 'Review the items below', cancelTitle: 'Cancel this execution?',
      cancelText: 'Processing will end. Approved artifacts will be preserved.', keepWorking: 'Keep working',
      hint: 'Each permanent rule contains only a stable ID and one business description.', edit: 'Click to edit the description',
    };
  }

  setFeedback(feedback: Ns4ClarificationFeedback | null): void {
    this.feedbackIssues = feedback?.issues || [];
    this.msgError = feedback?.kind === 'error' ? feedback.message : '';
    this.msgOk = feedback && feedback.kind !== 'error' ? feedback.message : '';
  }
  setSubmitting(submitting: boolean): void { this.submitting = submitting; }

  private visibleRules(): Ns4RuleDefinition[] {
    const query = this.search.trim().toLowerCase();
    return (this.value?.rules || []).filter(rule => !query || `${rule.id} ${rule.description}`.toLowerCase().includes(query));
  }
  private selected(): Ns4RuleDefinition | undefined {
    const visible = this.visibleRules();
    return visible.find(rule => rule.id === this.selectedRuleId) || visible[0] || this.value?.rules[0];
  }
  private updateDescription(ruleId: string, event: Event): void {
    if (!this.value || this.readonly || this.submitting) return;
    const description = (event.currentTarget as HTMLElement).innerText.trim();
    this.value = { ...this.value, rules: this.value.rules.map(rule => rule.id === ruleId ? { id: ruleId, description } : rule) };
  }
  private finishEdit(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault(); (event.currentTarget as HTMLElement).blur();
  }
  private submit(action: Ns4ClarificationAction): void {
    if (!this.value || this.readonly || this.submitting) return;
    const text = this.text();
    if (action === 'requestChanges' && !this.adjustment.trim()) {
      this.setFeedback({ kind: 'error', message: text.adjustmentRequired }); return;
    }
    this.setFeedback({ kind: 'information', message: action === 'approve' ? text.processingApproval : action === 'cancel' ? text.processingCancel : text.processingChanges });
    this.setSubmitting(true);
    this.dispatchEvent(new CustomEvent<Ns4E5ReviewEvent>('ns4-rules-review', {
      detail: { action, adjustment: this.adjustment.trim(), review: this.value }, bubbles: true, composed: true,
    }));
  }
  private openCancel(event: Event): void { this.cancelOrigin = event.currentTarget as HTMLElement; this.cancelOpen = true; }
  private closeCancel(): void { this.cancelOpen = false; setTimeout(() => this.cancelOrigin?.focus()); }

  render() {
    const text = this.text();
    if (!this.value) return html`<div class="ns4-empty">${text.noRule}</div>`;
    const rules = this.visibleRules(); const selected = this.selected(); const hasAdjustment = Boolean(this.adjustment.trim());
    return html`<section class="ns4-rules"><header><div><p class="ns4-step">${text.step}</p><h2>${this.value.title}</h2><p>${text.hint}</p></div><div class="ns4-header-meta"><span>${text.review} ${this.value.reviewRound}</span><strong>${this.value.rules.length} ${text.rules}</strong></div></header>
      ${this.renderFeedback(text)}
      <div class="ns4-workbench"><aside><input aria-label=${text.search} placeholder=${text.search} .value=${this.search}
        ?disabled=${this.submitting || this.readonly} @input=${(event: Event) => { this.search = (event.target as HTMLInputElement).value; }}>
        <div class="ns4-rule-list">${rules.length ? rules.map(rule => html`<button class="ns4-rule-item ${selected?.id === rule.id ? 'selected' : ''}"
          @click=${() => { this.selectedRuleId = rule.id; }}><code>${rule.id}</code><small>${rule.description}</small></button>`) : html`<p>${text.noRule}</p>`}</div></aside>
        ${selected ? html`<main class="ns4-detail"><div class="ns4-detail-head"><code>${selected.id}</code></div><p class="ns4-edit statement"
          contenteditable=${this.readonly ? 'false' : 'true'} title=${text.edit}
          @blur=${(event: Event) => this.updateDescription(selected.id, event)} @keydown=${this.finishEdit}>${selected.description}</p></main>` : ''}
      </div>
      <footer><label><span>${text.adjustment}</span><textarea .value=${this.adjustment} placeholder=${text.placeholder}
        ?disabled=${this.submitting || this.readonly} @input=${(event: Event) => { this.adjustment = (event.target as HTMLTextAreaElement).value; }}></textarea></label><div>
        <button class="cancel" ?disabled=${this.submitting || this.readonly} @click=${this.openCancel}>${text.cancel}</button>
        <button class="secondary ${hasAdjustment ? 'is-active' : ''}" ?disabled=${this.submitting || this.readonly || !hasAdjustment} @click=${() => this.submit('requestChanges')}>${text.request}</button>
        <button class="primary ${hasAdjustment ? '' : 'is-active'}" ?disabled=${this.submitting || this.readonly || hasAdjustment} @click=${() => this.submit('approve')}>${text.approve}</button>
      </div></footer>${this.renderCancelDialog(text)}</section>`;
  }

  private renderFeedback(text: ReturnType<WidgetNs4Rules102020['text']>) {
    if (!this.msgError && !this.msgOk) return '';
    const error = Boolean(this.msgError);
    return html`<section class="ns4-feedback ${error ? 'is-error' : 'is-ok'}" role=${error ? 'alert' : 'status'} tabindex="-1">${error ? html`<strong>${text.revise}</strong>` : ''}<span>${this.msgError || this.msgOk}</span>${this.feedbackIssues.length ? html`<ul>${this.feedbackIssues.map(issue => html`<li>${issue.path ? html`<code>${issue.path}</code> — ` : ''}${issue.message}</li>`)}</ul>` : ''}</section>`;
  }
  private renderCancelDialog(text: ReturnType<WidgetNs4Rules102020['text']>) {
    if (!this.cancelOpen) return '';
    return html`<div class="ns4-dialog-backdrop"><section class="ns4-cancel-dialog" role="dialog" aria-modal="true"><h3>${text.cancelTitle}</h3><p>${text.cancelText}</p><div><button class="secondary ns4-cancel-stay" @click=${this.closeCancel}>${text.keepWorking}</button><button class="danger" @click=${() => { this.closeCancel(); this.submit('cancel'); }}>${text.cancel}</button></div></section></div>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'widget-ns4-rules-102020': WidgetNs4Rules102020; } }
