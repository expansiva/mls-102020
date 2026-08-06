/// <mls fileReference="_102020_/l2/agentNewSolution4/widgets/widgetNs4Ontology.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import {
  Ns4E4Review,
  Ns4E4ReviewEvent,
  Ns4OntologyEntity,
  Ns4StorageTarget,
} from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';

const storageOrder: Ns4StorageTarget[] = ['mdm', 'moduleDatabase', 'derived', 'external', 'embedded'];

const labels = {
  en: {
    subtitle: 'Review the business data, constraints and relationships that frontend and backend will share.',
    round: 'Review', mode: 'New solution', changes: 'Changes in this round', entities: 'Entities',
    fields: 'Fields', relationships: 'Relationships', lifecycle: 'Lifecycle', invariants: 'Local invariants', overview: 'Overview', descriptions: 'Descriptions',
    source: 'Traceability', storage: 'Persistence destination', required: 'Required', optional: 'Optional', constraints: 'Field rules',
    persistenceMap: 'Persistence map', persistenceHint: 'Confirm where every entity lives before approval. Select an entity to inspect its reason and fields.',
    targetMdm: 'MDM · base records', targetModuleDatabase: 'Module database · transactions', targetDerived: 'Derived · no own table',
    targetExternal: 'External · platform owned', targetEmbedded: 'Embedded · owned value', scope: 'Scope', mdmType: 'MDM type', idField: 'Identifier', reason: 'Reason',
    fieldRulesHint: 'Backend enforces these validations; frontend mirrors them for immediate feedback.', crossStore: 'Cross-store',
    direct: 'Direct description edits', directHint: 'Titles and descriptions are safe to edit here. Structural changes use the separate request panel.',
    entityTitle: 'Entity title', entityDescription: 'Entity description', fieldTitle: 'Field title', fieldDescription: 'Field description',
    structural: 'Structural change request', structuralHint: 'Use the LLM for entities, fields, types, relationships, lifecycle or constraints.',
    placeholder: 'Example: add a client-facing published material-usage projection related to Project, without exposing internal costs.',
    request: 'Generate another proposal', approve: 'Approve ontology', requiredAdjustment: 'Describe the structural change first.', empty: 'No ontology proposal available.',
  },
  pt: {
    subtitle: 'Revise os dados de negócio, restrições e relacionamentos compartilhados pelo frontend e backend.',
    round: 'Revisão', mode: 'Solução nova', changes: 'Alterações desta revisão', entities: 'Entidades',
    fields: 'Campos', relationships: 'Relacionamentos', lifecycle: 'Ciclo de vida', invariants: 'Invariantes locais', overview: 'Visão geral', descriptions: 'Descrições',
    source: 'Rastreabilidade', storage: 'Destino da persistência', required: 'Obrigatório', optional: 'Opcional', constraints: 'Regras do campo',
    persistenceMap: 'Mapa de persistência', persistenceHint: 'Confirme onde cada entidade será armazenada antes de aprovar. Selecione uma entidade para ver o motivo e os campos.',
    targetMdm: 'MDM · cadastros base', targetModuleDatabase: 'Banco do módulo · transações', targetDerived: 'Derivado · sem tabela própria',
    targetExternal: 'Externo · mantido pela plataforma', targetEmbedded: 'Embutido · valor do proprietário', scope: 'Escopo', mdmType: 'Tipo MDM', idField: 'Identificador', reason: 'Motivo',
    fieldRulesHint: 'O backend aplica estas validações; o frontend as espelha para resposta imediata.', crossStore: 'Entre armazenamentos',
    direct: 'Edições diretas de descrição', directHint: 'Títulos e descrições podem ser editados aqui. Mudanças estruturais usam o painel separado.',
    entityTitle: 'Título da entidade', entityDescription: 'Descrição da entidade', fieldTitle: 'Título do campo', fieldDescription: 'Descrição do campo',
    structural: 'Solicitação de alteração estrutural', structuralHint: 'Use a LLM para entidades, campos, tipos, relacionamentos, ciclos ou restrições.',
    placeholder: 'Exemplo: adicione uma projeção publicada do uso de materiais para o cliente, relacionada ao projeto e sem custos internos.',
    request: 'Gerar nova proposta', approve: 'Aprovar ontologia', requiredAdjustment: 'Descreva primeiro a alteração estrutural.', empty: 'Nenhuma proposta de ontologia disponível.',
  },
  es: {
    subtitle: 'Revise los datos de negocio, restricciones y relaciones compartidos por frontend y backend.',
    round: 'Revisión', mode: 'Solución nueva', changes: 'Cambios de esta revisión', entities: 'Entidades',
    fields: 'Campos', relationships: 'Relaciones', lifecycle: 'Ciclo de vida', invariants: 'Invariantes locales', overview: 'Resumen', descriptions: 'Descripciones',
    source: 'Trazabilidad', storage: 'Destino de persistencia', required: 'Obligatorio', optional: 'Opcional', constraints: 'Reglas del campo',
    persistenceMap: 'Mapa de persistencia', persistenceHint: 'Confirme dónde vive cada entidad antes de aprobar. Seleccione una entidad para revisar su motivo y campos.',
    targetMdm: 'MDM · datos maestros', targetModuleDatabase: 'Base del módulo · transacciones', targetDerived: 'Derivado · sin tabla propia',
    targetExternal: 'Externo · mantenido por la plataforma', targetEmbedded: 'Embebido · valor del propietario', scope: 'Alcance', mdmType: 'Tipo MDM', idField: 'Identificador', reason: 'Motivo',
    fieldRulesHint: 'El backend aplica estas validaciones; el frontend las refleja para respuesta inmediata.', crossStore: 'Entre almacenamientos',
    direct: 'Ediciones directas de descripción', directHint: 'Títulos y descripciones se editan aquí. Los cambios estructurales usan el panel separado.',
    entityTitle: 'Título de la entidad', entityDescription: 'Descripción de la entidad', fieldTitle: 'Título del campo', fieldDescription: 'Descripción del campo',
    structural: 'Solicitud de cambio estructural', structuralHint: 'Use la LLM para entidades, campos, tipos, relaciones, ciclos o restricciones.',
    placeholder: 'Ejemplo: agregue una proyección publicada del uso de materiales para el cliente, relacionada con el proyecto y sin costos internos.',
    request: 'Generar otra propuesta', approve: 'Aprobar ontología', requiredAdjustment: 'Describa primero el cambio estructural.', empty: 'No hay propuesta de ontología.',
  },
};

@customElement('widget-ns4-ontology-102020')
export class WidgetNs4Ontology102020 extends StateLitElement {
  @property({ type: Object }) value: Ns4E4Review | null = null;
  @property({ type: Boolean }) readonly = false;
  @state() private selectedEntityId = '';
  @state() private activeTab: 'overview' | 'descriptions' = 'overview';
  @state() private adjustment = '';
  @state() private submitting = false;

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
    this.activeTab = 'overview';
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

  private submit(action: Ns4E4ReviewEvent['action']) {
    if (!this.value || this.readonly || this.submitting) return;
    if (action === 'requestChanges' && !this.adjustment.trim()) {
      window.alert(this.text().requiredAdjustment);
      return;
    }
    this.submitting = true;
    this.dispatchEvent(new CustomEvent<Ns4E4ReviewEvent>('ns4-ontology-review', {
      detail: { action, adjustment: this.adjustment.trim(), review: this.value }, bubbles: true, composed: true,
    }));
  }

  render() {
    const text = this.text();
    if (!this.value) return html`<div class="ns4-empty">${text.empty}</div>`;
    const entity = this.selectedEntity();
    return html`
      <section class="ns4-ontology">
        <header>
          <div><h2>${this.value.title}</h2><p>${text.subtitle}</p></div>
          <div class="ns4-badges"><span>${text.mode}</span><span>${text.round} ${this.value.reviewRound}</span></div>
        </header>

        ${this.value.changeSummary.length ? html`
          <section class="ns4-changes"><h3>${text.changes}</h3><ul>${this.value.changeSummary.map(item => html`<li>${item}</li>`)}</ul></section>
        ` : ''}

        ${this.renderPersistenceMap(text)}

        <div class="ns4-workbench">
          <nav aria-label=${text.entities}>
            <h3>${text.entities}</h3>
            ${this.value.entities.map(item => html`<button class=${entity?.entityId === item.entityId ? 'selected' : ''}
              @click=${() => this.selectEntity(item.entityId)}><strong>${item.title}</strong><small>${item.entityId}</small>
              <span class="ns4-nav-target target-${item.storage.target}">${this.storageLabel(item.storage.target, text)}</span></button>`)}
          </nav>
          ${entity ? this.renderEntity(entity, text) : ''}
        </div>

        <section class="ns4-relationships">
          <h3>${text.relationships}</h3>
          <div>${this.value.relationships.map(relationship => {
            const from = this.value?.entities.find(item => item.entityId === relationship.fromEntity);
            const to = this.value?.entities.find(item => item.entityId === relationship.toEntity);
            const crossStore = !!from && !!to && from.storage.target !== to.storage.target;
            return html`<article>
            <strong>${relationship.fromEntity} → ${relationship.toEntity}</strong>
            <code>${relationship.type} · ${relationship.persistence.mode}</code>${crossStore ? html`<span class="ns4-cross-store">${text.crossStore}</span>` : ''}<p>${relationship.description}</p>
          </article>`;})}</div>
        </section>

        <section class="ns4-change-panel">
          <div><h3>${text.structural}</h3><p>${text.structuralHint}</p></div>
          <textarea .value=${this.adjustment} placeholder=${text.placeholder} ?disabled=${this.submitting || this.readonly}
            @input=${(event: Event) => { this.adjustment = (event.target as HTMLTextAreaElement).value; }}></textarea>
          <div class="ns4-actions">
            <button class="secondary" ?disabled=${this.submitting || this.readonly} @click=${() => this.submit('requestChanges')}>${text.request}</button>
            <button class="primary" ?disabled=${this.submitting || this.readonly} @click=${() => this.submit('approve')}>${text.approve}</button>
          </div>
        </section>
      </section>`;
  }

  private renderPersistenceMap(text: typeof labels.en) {
    if (!this.value) return '';
    return html`<section class="ns4-persistence-map">
      <div class="ns4-section-title"><h3>${text.persistenceMap}</h3><p>${text.persistenceHint}</p></div>
      <div class="ns4-storage-groups">${storageOrder.map(target => {
        const entities = this.value?.entities.filter(entity => entity.storage.target === target) || [];
        return html`<article class="target-${target}">
          <header><strong>${this.storageLabel(target, text)}</strong><span>${entities.length}</span></header>
          <div>${entities.length ? entities.map(entity => html`<button
            class=${this.selectedEntity()?.entityId === entity.entityId ? 'selected' : ''}
            @click=${() => this.selectEntity(entity.entityId)}>${entity.title}<small>${entity.entityId}</small></button>`)
            : html`<small>—</small>`}</div>
        </article>`;
      })}</div>
    </section>`;
  }

  private renderEntity(entity: Ns4OntologyEntity, text: typeof labels.en) {
    return html`<main>
      <section class="ns4-entity-head">
        <div><h3>${entity.title}</h3><code>${entity.entityId} · ${entity.kind} · ${entity.ownership}</code>
          <span class="ns4-target-badge target-${entity.storage.target}">${this.storageLabel(entity.storage.target, text)}</span><p>${entity.description}</p></div>
        <dl><div><dt>${text.source}</dt><dd>${[...entity.sourceRefs.journeyIds, ...entity.sourceRefs.featureIds, ...entity.sourceRefs.authorityRefs].join(', ')}</dd></div>
        <div><dt>${text.storage}</dt><dd><strong>${this.storageLabel(entity.storage.target, text)}</strong> · ${text.scope}: ${entity.storage.scope}</dd></div>
        ${entity.storage.idField ? html`<div><dt>${text.idField}</dt><dd><code>${entity.storage.idField}</code></dd></div>` : ''}
        ${entity.storage.mdmType ? html`<div><dt>${text.mdmType}</dt><dd><code>${entity.storage.mdmType}</code></dd></div>` : ''}
        <div><dt>${text.reason}</dt><dd>${entity.storage.notes}</dd></div></dl>
      </section>
      <div class="ns4-tabs">
        <button class=${this.activeTab === 'overview' ? 'selected' : ''} @click=${() => { this.activeTab = 'overview'; }}>${text.overview}</button>
        <button class=${this.activeTab === 'descriptions' ? 'selected' : ''} @click=${() => { this.activeTab = 'descriptions'; }}>${text.descriptions}</button>
      </div>
      ${this.activeTab === 'overview' ? this.renderOverview(entity, text) : this.renderDirectEdits(entity, text)}
    </main>`;
  }

  private renderOverview(entity: Ns4OntologyEntity, text: typeof labels.en) {
    return html`<section class="ns4-fields"><h3>${text.fields}</h3><p>${text.fieldRulesHint}</p><div class="ns4-table-scroll"><table>
        <thead><tr><th>Id</th><th>${text.fieldTitle}</th><th>Type</th><th>Mode</th><th>${text.constraints}</th></tr></thead>
        <tbody>${entity.fields.map(field => html`<tr><td><code>${field.fieldId}</code></td><td>${field.title}<small>${field.description}</small></td>
          <td><code>${field.type}</code></td><td>${field.required ? text.required : text.optional}</td>
          <td>${field.constraints.map(constraint => html`<span title=${constraint.description}>${constraint.kind}: ${constraint.value} <em>${constraint.source}</em></span>`)}</td></tr>`)}</tbody>
      </table></div></section>
      <section class="ns4-entity-details">
        <article><h3>${text.lifecycle}</h3><p>${entity.lifecycleStates.join(' → ') || '—'}</p></article>
        <article><h3>${text.invariants}</h3><ul>${entity.invariants.map(item => html`<li>${item.description} <em>${item.source}</em></li>`)}</ul></article>
      </section>`;
  }

  private renderDirectEdits(entity: Ns4OntologyEntity, text: typeof labels.en) {
    return html`<section class="ns4-direct-edits"><div><h3>${text.direct}</h3><p>${text.directHint}</p></div>
        <label><span>${text.entityTitle}</span><input .value=${entity.title} ?disabled=${this.readonly}
          @input=${(event: Event) => this.updateEntity({ title: (event.target as HTMLInputElement).value })}></label>
        <label class="wide"><span>${text.entityDescription}</span><textarea .value=${entity.description} ?disabled=${this.readonly}
          @input=${(event: Event) => this.updateEntity({ description: (event.target as HTMLTextAreaElement).value })}></textarea></label>
        ${entity.fields.map(field => html`<div class="ns4-field-edit"><code>${field.fieldId}</code>
          <label><span>${text.fieldTitle}</span><input .value=${field.title} ?disabled=${this.readonly}
            @input=${(event: Event) => this.updateField(field.fieldId, { title: (event.target as HTMLInputElement).value })}></label>
          <label><span>${text.fieldDescription}</span><input .value=${field.description} ?disabled=${this.readonly}
            @input=${(event: Event) => this.updateField(field.fieldId, { description: (event.target as HTMLInputElement).value })}></label></div>`)}
      </section>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'widget-ns4-ontology-102020': WidgetNs4Ontology102020 } }
