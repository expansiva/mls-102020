/// <mls fileReference="_102020_/l2/agentNewSolution4/widgets/widgetNs4Ontology.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import {
  Ns4E4Review,
  Ns4OntologyEntity,
  Ns4StorageTarget,
} from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';
import { Ns4ClarificationAction, Ns4ClarificationEvent, Ns4ClarificationFeedback, Ns4ClarificationIssue, Ns4ClarificationWidgetApi } from './clarification.js';

const labels = {
  en: {
    subtitle: 'Review the business data, constraints and relationships that frontend and backend will share.', step: 'Step', of: 'of',
    round: 'Review', mode: 'New solution', changes: 'Changes in this round', entities: 'Entities',
    fields: 'Fields', relationships: 'Relationships', lifecycle: 'Lifecycle', invariants: 'Local invariants', overview: 'Overview', descriptions: 'Descriptions',
    source: 'Traceability', storage: 'Persistence destination', required: 'Required', optional: 'Optional', constraints: 'Field rules',
    persistenceMap: 'Persistence map', persistenceHint: 'Confirm where every entity lives before approval. Select an entity to inspect its reason and fields.',
    targetMdm: 'MDM · base records', targetModuleDatabase: 'Module database · transactions', targetDerived: 'Derived · no own table',
    targetExternal: 'External · platform owned', targetEmbedded: 'Embedded · owned value', scope: 'Scope', mdmType: 'MDM type', idField: 'Identifier', reason: 'Reason',
    fieldRulesHint: 'Click a field name or description to edit it in place.', crossStore: 'Cross-store',
    sourceRelationships: 'As origin', destinationRelationships: 'As destination', noRelationships: 'No relationships for this table.', editInPlace: 'Click to edit',
    direct: 'Direct description edits', directHint: 'Titles and descriptions are safe to edit here. Structural changes use the separate request panel.',
    entityTitle: 'Entity title', entityDescription: 'Entity description', fieldTitle: 'Field title', fieldDescription: 'Field description',
    structural: 'What should change?', structuralHint: 'Use the LLM for entities, fields, types, relationships, lifecycle or constraints.',
    placeholder: 'Example: add a client-facing published material-usage projection related to Project, without exposing internal costs.',
    request: 'Generate another proposal', approve: 'Approve ontology', requiredAdjustment: 'Describe the structural change first.', empty: 'No ontology proposal available.', processingApproval: 'Validating ontology…', processingChanges: 'Preparing a new review…', processingCancel: 'Cancelling execution…', revise: 'Review the items below', cancel: 'Cancel execution', cancelTitle: 'Cancel this execution?', cancelText: 'Processing will end. The history and approved artifacts will be preserved.', keepWorking: 'Keep working',
  },
  pt: {
    subtitle: 'Revise os dados de negócio, restrições e relacionamentos compartilhados pelo frontend e backend.', step: 'Etapa', of: 'de',
    round: 'Revisão', mode: 'Solução nova', changes: 'Alterações desta revisão', entities: 'Entidades',
    fields: 'Campos', relationships: 'Relacionamentos', lifecycle: 'Ciclo de vida', invariants: 'Invariantes locais', overview: 'Visão geral', descriptions: 'Descrições',
    source: 'Rastreabilidade', storage: 'Destino da persistência', required: 'Obrigatório', optional: 'Opcional', constraints: 'Regras do campo',
    persistenceMap: 'Mapa de persistência', persistenceHint: 'Confirme onde cada entidade será armazenada antes de aprovar. Selecione uma entidade para ver o motivo e os campos.',
    targetMdm: 'MDM · cadastros base', targetModuleDatabase: 'Banco do módulo · transações', targetDerived: 'Derivado · sem tabela própria',
    targetExternal: 'Externo · mantido pela plataforma', targetEmbedded: 'Embutido · valor do proprietário', scope: 'Escopo', mdmType: 'Tipo MDM', idField: 'Identificador', reason: 'Motivo',
    fieldRulesHint: 'Clique no nome ou na descrição de um campo para editá-lo na própria tabela.', crossStore: 'Entre armazenamentos',
    sourceRelationships: 'Como origem', destinationRelationships: 'Como destino', noRelationships: 'Nenhum relacionamento para esta tabela.', editInPlace: 'Clique para editar',
    direct: 'Edições diretas de descrição', directHint: 'Títulos e descrições podem ser editados aqui. Mudanças estruturais usam o painel separado.',
    entityTitle: 'Título da entidade', entityDescription: 'Descrição da entidade', fieldTitle: 'Título do campo', fieldDescription: 'Descrição do campo',
    structural: 'O que deve mudar?', structuralHint: 'Use a LLM para entidades, campos, tipos, relacionamentos, ciclos ou restrições.',
    placeholder: 'Exemplo: adicione uma projeção publicada do uso de materiais para o cliente, relacionada ao projeto e sem custos internos.',
    request: 'Gerar nova proposta', approve: 'Aprovar ontologia', requiredAdjustment: 'Descreva primeiro a alteração estrutural.', empty: 'Nenhuma proposta de ontologia disponível.', processingApproval: 'Validando ontologia…', processingChanges: 'Preparando nova revisão…', processingCancel: 'Cancelando execução…', revise: 'Revise os itens abaixo', cancel: 'Cancelar execução', cancelTitle: 'Cancelar esta execução?', cancelText: 'O processamento será encerrado. O histórico e os artefatos já aprovados serão preservados.', keepWorking: 'Continuar trabalhando',
  },
  es: {
    subtitle: 'Revise los datos de negocio, restricciones y relaciones compartidos por frontend y backend.', step: 'Paso', of: 'de',
    round: 'Revisión', mode: 'Solución nueva', changes: 'Cambios de esta revisión', entities: 'Entidades',
    fields: 'Campos', relationships: 'Relaciones', lifecycle: 'Ciclo de vida', invariants: 'Invariantes locales', overview: 'Resumen', descriptions: 'Descripciones',
    source: 'Trazabilidad', storage: 'Destino de persistencia', required: 'Obligatorio', optional: 'Opcional', constraints: 'Reglas del campo',
    persistenceMap: 'Mapa de persistencia', persistenceHint: 'Confirme dónde vive cada entidad antes de aprobar. Seleccione una entidad para revisar su motivo y campos.',
    targetMdm: 'MDM · datos maestros', targetModuleDatabase: 'Base del módulo · transacciones', targetDerived: 'Derivado · sin tabla propia',
    targetExternal: 'Externo · mantenido por la plataforma', targetEmbedded: 'Embebido · valor del propietario', scope: 'Alcance', mdmType: 'Tipo MDM', idField: 'Identificador', reason: 'Motivo',
    fieldRulesHint: 'Haga clic en el nombre o la descripción de un campo para editarlo en la tabla.', crossStore: 'Entre almacenamientos',
    sourceRelationships: 'Como origen', destinationRelationships: 'Como destino', noRelationships: 'No hay relaciones para esta tabla.', editInPlace: 'Haga clic para editar',
    direct: 'Ediciones directas de descripción', directHint: 'Títulos y descripciones se editan aquí. Los cambios estructurales usan el panel separado.',
    entityTitle: 'Título de la entidad', entityDescription: 'Descripción de la entidad', fieldTitle: 'Título del campo', fieldDescription: 'Descripción del campo',
    structural: '¿Qué debe cambiar?', structuralHint: 'Use la LLM para entidades, campos, tipos, relaciones, ciclos o restricciones.',
    placeholder: 'Ejemplo: agregue una proyección publicada del uso de materiales para el cliente, relacionada con el proyecto y sin costos internos.',
    request: 'Generar otra propuesta', approve: 'Aprobar ontología', requiredAdjustment: 'Describa primero el cambio estructural.', empty: 'No hay propuesta de ontología.', processingApproval: 'Validando ontología…', processingChanges: 'Preparando una nueva revisión…', processingCancel: 'Cancelando la ejecución…', revise: 'Revise los elementos a continuación', cancel: 'Cancelar ejecución', cancelTitle: '¿Cancelar esta ejecución?', cancelText: 'El procesamiento terminará. Se conservarán el historial y los artefactos aprobados.', keepWorking: 'Seguir trabajando',
  },
};

@customElement('widget-ns4-ontology-102020')
export class WidgetNs4Ontology102020 extends StateLitElement implements Ns4ClarificationWidgetApi {
  @property({ type: Object }) value: Ns4E4Review | null = null;
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
    const language = this.value?.userLanguage?.toLowerCase() || 'en';
    if (language.startsWith('pt')) return labels.pt;
    if (language.startsWith('es')) return labels.es;
    return labels.en;
  }

  private selectedEntity(): Ns4OntologyEntity | undefined {
    return this.value?.entities.find(item => item.entityId === this.selectedEntityId) || this.value?.entities[0];
  }

  private selectEntity(entityId: string): void {
    this.selectedEntityId = entityId;
    this.activeTab = 'fields';
  }

  private storageLabel(target: Ns4StorageTarget, text: typeof labels.en): string {
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
  private renderFeedback(text: typeof labels.en) {
    if (!this.msgError && !this.msgOk) return '';
    const error = Boolean(this.msgError);
    return html`<section class="ns4-feedback ${error ? 'is-error' : 'is-ok'}" role=${error ? 'alert' : 'status'} aria-live=${error ? 'assertive' : 'polite'} tabindex="-1">${error ? html`<strong>${text.revise}</strong>` : ''}<span>${this.msgError || this.msgOk}</span>${this.feedbackIssues.length ? html`<ul>${this.feedbackIssues.map(issue => html`<li>${issue.path ? html`<code>${issue.path}</code> — ` : ''}${issue.message}</li>`)}</ul>` : ''}</section>`;
  }
  private renderCancelDialog(text: typeof labels.en) {
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

  private renderEntity(entity: Ns4OntologyEntity, text: typeof labels.en) {
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

  private renderFields(entity: Ns4OntologyEntity, text: typeof labels.en) {
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

  private renderOverview(entity: Ns4OntologyEntity, text: typeof labels.en) {
    return html`<section class="ns4-overview"><dl>
      <div><dt>${text.source}</dt><dd>${[...entity.sourceRefs.journeyIds, ...entity.sourceRefs.featureIds, ...entity.sourceRefs.authorityRefs].join(', ') || '—'}</dd></div>
      <div><dt>${text.storage}</dt><dd><strong>${this.storageLabel(entity.storage.target, text)}</strong> · ${text.scope}: ${entity.storage.scope}</dd></div>
      ${entity.storage.idField ? html`<div><dt>${text.idField}</dt><dd><code>${entity.storage.idField}</code></dd></div>` : ''}
      ${entity.storage.mdmType ? html`<div><dt>${text.mdmType}</dt><dd><code>${entity.storage.mdmType}</code></dd></div>` : ''}
      <div><dt>${text.reason}</dt><dd>${entity.storage.notes || '—'}</dd></div></dl>
      <div class="ns4-entity-details"><article><h3>${text.lifecycle}</h3><p>${entity.lifecycleStates.join(' → ') || '—'}</p></article>
        <article><h3>${text.invariants}</h3><ul>${entity.invariants.map(item => html`<li>${item.description} <em>${item.source}</em></li>`)}</ul></article></div>
    </section>`;
  }

  private renderRelationships(entity: Ns4OntologyEntity, text: typeof labels.en) {
    const origin = this.value!.relationships.filter(item => item.fromEntity === entity.entityId);
    const destination = this.value!.relationships.filter(item => item.toEntity === entity.entityId);
    return html`<section class="ns4-relationships"><div class="ns4-relationship-group"><h3>${text.sourceRelationships}</h3>
      ${this.renderRelationshipList(origin, text)}</div><div class="ns4-relationship-group"><h3>${text.destinationRelationships}</h3>${this.renderRelationshipList(destination, text)}</div></section>`;
  }

  private renderRelationshipList(relationships: Ns4E4Review['relationships'], text: typeof labels.en) {
    return relationships.length ? html`<div class="ns4-relationship-list">${relationships.map(relationship => {
      const from = this.value!.entities.find(item => item.entityId === relationship.fromEntity);
      const to = this.value!.entities.find(item => item.entityId === relationship.toEntity);
      const crossStore = !!from && !!to && from.storage.target !== to.storage.target;
      return html`<article><strong>${relationship.fromEntity} → ${relationship.toEntity}</strong><code>${relationship.type} · ${relationship.persistence.mode}</code>
        ${crossStore ? html`<span class="ns4-cross-store">${text.crossStore}</span>` : ''}<p>${relationship.description}</p></article>`;
    })}</div>` : html`<p class="ns4-no-relationships">${text.noRelationships}</p>`;
  }

  private renderDescriptions(entity: Ns4OntologyEntity, text: typeof labels.en) {
    return html`<section class="ns4-descriptions"><h3>${entity.title}</h3><code>${entity.entityId}</code><p>${entity.description || '—'}</p></section>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'widget-ns4-ontology-102020': WidgetNs4Ontology102020 } }
