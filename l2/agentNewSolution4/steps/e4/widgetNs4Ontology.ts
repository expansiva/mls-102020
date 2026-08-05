/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e4/widgetNs4Ontology.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { Ns4E4Review, Ns4E4ReviewEvent, Ns4OntologyEntity } from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';

const labels = {
  en: {
    subtitle: 'Review the business data, constraints and relationships that frontend and backend will share.',
    round: 'Review', mode: 'New solution', changes: 'Changes in this round', entities: 'Entities',
    fields: 'Fields', relationships: 'Relationships', lifecycle: 'Lifecycle', invariants: 'Local invariants',
    source: 'Traceability', storage: 'Storage intent', required: 'Required', optional: 'Optional', constraints: 'Constraints',
    direct: 'Direct description edits', directHint: 'Titles and descriptions are safe to edit here. Structural changes use the separate request panel.',
    entityTitle: 'Entity title', entityDescription: 'Entity description', fieldTitle: 'Field title', fieldDescription: 'Field description',
    structural: 'Structural change request', structuralHint: 'Use the LLM for entities, fields, types, relationships, lifecycle or constraints.',
    placeholder: 'Example: add a client-facing published material-usage projection related to Project, without exposing internal costs.',
    request: 'Generate another proposal', approve: 'Approve ontology', requiredAdjustment: 'Describe the structural change first.', empty: 'No ontology proposal available.',
  },
  pt: {
    subtitle: 'Revise os dados de negócio, restrições e relacionamentos compartilhados pelo frontend e backend.',
    round: 'Revisão', mode: 'Solução nova', changes: 'Alterações desta revisão', entities: 'Entidades',
    fields: 'Campos', relationships: 'Relacionamentos', lifecycle: 'Ciclo de vida', invariants: 'Invariantes locais',
    source: 'Rastreabilidade', storage: 'Intenção de persistência', required: 'Obrigatório', optional: 'Opcional', constraints: 'Restrições',
    direct: 'Edições diretas de descrição', directHint: 'Títulos e descrições podem ser editados aqui. Mudanças estruturais usam o painel separado.',
    entityTitle: 'Título da entidade', entityDescription: 'Descrição da entidade', fieldTitle: 'Título do campo', fieldDescription: 'Descrição do campo',
    structural: 'Solicitação de alteração estrutural', structuralHint: 'Use a LLM para entidades, campos, tipos, relacionamentos, ciclos ou restrições.',
    placeholder: 'Exemplo: adicione uma projeção publicada do uso de materiais para o cliente, relacionada ao projeto e sem custos internos.',
    request: 'Gerar nova proposta', approve: 'Aprovar ontologia', requiredAdjustment: 'Descreva primeiro a alteração estrutural.', empty: 'Nenhuma proposta de ontologia disponível.',
  },
  es: {
    subtitle: 'Revise los datos de negocio, restricciones y relaciones compartidos por frontend y backend.',
    round: 'Revisión', mode: 'Solución nueva', changes: 'Cambios de esta revisión', entities: 'Entidades',
    fields: 'Campos', relationships: 'Relaciones', lifecycle: 'Ciclo de vida', invariants: 'Invariantes locales',
    source: 'Trazabilidad', storage: 'Intención de persistencia', required: 'Obligatorio', optional: 'Opcional', constraints: 'Restricciones',
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

        <div class="ns4-workbench">
          <nav aria-label=${text.entities}>
            <h3>${text.entities}</h3>
            ${this.value.entities.map(item => html`<button class=${entity?.entityId === item.entityId ? 'selected' : ''}
              @click=${() => { this.selectedEntityId = item.entityId; }}><strong>${item.title}</strong><small>${item.entityId} · ${item.kind}</small></button>`)}
          </nav>
          ${entity ? this.renderEntity(entity, text) : ''}
        </div>

        <section class="ns4-relationships">
          <h3>${text.relationships}</h3>
          <div>${this.value.relationships.map(relationship => html`<article>
            <strong>${relationship.fromEntity} → ${relationship.toEntity}</strong>
            <code>${relationship.type}</code><p>${relationship.description}</p>
          </article>`)}</div>
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

  private renderEntity(entity: Ns4OntologyEntity, text: typeof labels.en) {
    return html`<main>
      <section class="ns4-entity-head">
        <div><h3>${entity.title}</h3><code>${entity.entityId} · ${entity.kind} · ${entity.ownership}</code><p>${entity.description}</p></div>
        <dl><div><dt>${text.source}</dt><dd>${[...entity.sourceRefs.journeyIds, ...entity.sourceRefs.featureIds, ...entity.sourceRefs.authorityRefs].join(', ')}</dd></div>
        <div><dt>${text.storage}</dt><dd>${entity.storage.notes}</dd></div></dl>
      </section>
      <section class="ns4-fields"><h3>${text.fields}</h3><div class="ns4-table-scroll"><table>
        <thead><tr><th>Id</th><th>${text.fieldTitle}</th><th>Type</th><th>Mode</th><th>${text.constraints}</th></tr></thead>
        <tbody>${entity.fields.map(field => html`<tr><td><code>${field.fieldId}</code></td><td>${field.title}<small>${field.description}</small></td>
          <td><code>${field.type}</code></td><td>${field.required ? text.required : text.optional}</td>
          <td>${field.constraints.map(constraint => html`<span title=${constraint.description}>${constraint.kind}: ${constraint.value} <em>${constraint.source}</em></span>`)}</td></tr>`)}</tbody>
      </table></div></section>
      <section class="ns4-entity-details">
        <article><h3>${text.lifecycle}</h3><p>${entity.lifecycleStates.join(' → ') || '—'}</p></article>
        <article><h3>${text.invariants}</h3><ul>${entity.invariants.map(item => html`<li>${item.description} <em>${item.source}</em></li>`)}</ul></article>
      </section>
      <section class="ns4-direct-edits"><div><h3>${text.direct}</h3><p>${text.directHint}</p></div>
        <label><span>${text.entityTitle}</span><input .value=${entity.title} ?disabled=${this.readonly}
          @input=${(event: Event) => this.updateEntity({ title: (event.target as HTMLInputElement).value })}></label>
        <label class="wide"><span>${text.entityDescription}</span><textarea .value=${entity.description} ?disabled=${this.readonly}
          @input=${(event: Event) => this.updateEntity({ description: (event.target as HTMLTextAreaElement).value })}></textarea></label>
        ${entity.fields.map(field => html`<div class="ns4-field-edit"><code>${field.fieldId}</code>
          <label><span>${text.fieldTitle}</span><input .value=${field.title} ?disabled=${this.readonly}
            @input=${(event: Event) => this.updateField(field.fieldId, { title: (event.target as HTMLInputElement).value })}></label>
          <label><span>${text.fieldDescription}</span><input .value=${field.description} ?disabled=${this.readonly}
            @input=${(event: Event) => this.updateField(field.fieldId, { description: (event.target as HTMLInputElement).value })}></label></div>`)}
      </section>
    </main>`;
  }
}

declare global { interface HTMLElementTagNameMap { 'widget-ns4-ontology-102020': WidgetNs4Ontology102020 } }
