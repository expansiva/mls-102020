/// <mls fileReference="_102020_/l2/aura/molecules/shared/widgetDefsClarification.ts" enhancement="_102027_/l2/enhancementLit"/>

// "Defs Clarification" widget: the human checkpoint that confirms a NEW molecule's requirements
// before the .defs.ts is written. Emits `clarification-finish` with
// { value: { tagName, ...data }, action: 'continue' | 'cancel' }.
//
// Reproduces the interface of agentsManageMolecules/agentNewMoleculePlannerClarification
// (decision D2) so users of the old New Molecule flow see no change — click-to-edit fields,
// collapsible requirement lists with add/edit/remove, footer Cancel/Confirm. What changed:
// - it lives in shared/ (the old file is named like an agent but is a Lit component);
// - `group` and the tag are DERIVED from the fileReference and read-only (decision Q1);
// - a read-only line names the detected theme (decision Q3);
// - all mutation logic is in widgetDefsClarificationLogic, unit-tested without a DOM.
//
// No Shadow DOM (StateLitElement) — styles live in the sibling .less scoped under the tag.

import { html, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { tagFromFileReference } from '/_102020_/l2/aura/molecules/shared/moleculeTemplates.js';
import {
  addDefsRequirement,
  applyDefsAxisValue,
  applyDefsFieldEdit,
  applyDefsRequirementEdit,
  buildDefsResult,
  canConfirmDefs,
  emptyDefsData,
  removeDefsRequirement,
  DEFS_AXIS_WILDCARD,
  type DefsAction,
  type DefsAxisOption,
  type DefsClarificationData,
  type DefsClarificationValue,
  type DefsEditableField,
  type DefsRequirementKind,
} from '/_102020_/l2/aura/molecules/shared/widgetDefsClarificationLogic.js';

/// **collab_i18n_start**
const message_pt = {
  title: 'Confirmar a molécula',
  intro: 'Revise os requisitos antes de gerar os arquivos. O nome e a tag podem ser ajustados agora — depois exigem renomear quatro arquivos.',
  fileReference: 'Referência do arquivo',
  tagName: 'Tag (derivada)',
  group: 'Grupo (derivado)',
  theme: 'Tema detectado',
  noTheme: 'nenhum (molécula neutra)',
  description: 'Descrição',
  prompt: 'Prompt final',
  functionalRequirements: 'Requisitos funcionais',
  visualRequirements: 'Requisitos visuais',
  layoutAxes: 'Eixos de layout (Design System)',
  layoutAxesHint: 'Definem para quais páginas esta molécula é escolhida. "Qualquer" deixa o eixo livre.',
  axisWildcard: 'qualquer (coringa)',
  axisDefaultHint: 'padrão',
  clickToEdit: 'Clique para editar',
  save: 'Salvar',
  cancel: 'Cancelar',
  confirm: 'Confirmar',
  addRequirement: '+ Adicionar requisito',
  newFunctionalRequirement: 'Novo requisito funcional',
  newVisualRequirement: 'Novo requisito visual',
  edit: 'Editar',
  remove: 'Remover',
  incomplete: 'Informe a referência do arquivo, a descrição e ao menos um requisito funcional (sem linhas vazias).',
  incompleteAxes: 'Escolha ao menos um eixo de layout — deixar todos em "qualquer" faz esta molécula ser o coringa do grupo.',
};

const message_en = {
  title: 'Confirm the molecule',
  intro: 'Review the requirements before the files are generated. The name and the tag can be adjusted now — later they mean renaming four files.',
  fileReference: 'File reference',
  tagName: 'Tag (derived)',
  group: 'Group (derived)',
  theme: 'Detected theme',
  noTheme: 'none (neutral molecule)',
  description: 'Description',
  prompt: 'Final prompt',
  functionalRequirements: 'Functional requirements',
  visualRequirements: 'Visual requirements',
  layoutAxes: 'Layout axes (Design System)',
  layoutAxesHint: 'They decide which pages pick this molecule. "Any" leaves the axis free.',
  axisWildcard: 'any (wildcard)',
  axisDefaultHint: 'default',
  clickToEdit: 'Click to edit',
  save: 'Save',
  cancel: 'Cancel',
  confirm: 'Confirm',
  addRequirement: '+ Add requirement',
  newFunctionalRequirement: 'New functional requirement',
  newVisualRequirement: 'New visual requirement',
  edit: 'Edit',
  remove: 'Remove',
  incomplete: 'Provide the file reference, the description and at least one functional requirement (no blank lines).',
  incompleteAxes: 'Choose at least one layout axis — leaving them all on "any" makes this molecule the group\'s wildcard.',
};

type MessageType = typeof message_en;

const messages: { [key: string]: MessageType } = {
  'en': message_en,
  'pt': message_pt,
};
/// **collab_i18n_end**

@customElement('widget-defs-clarification-102020')
export class WidgetDefsClarification102020 extends StateLitElement {
  @property({ type: Object }) value: DefsClarificationValue | null = null;
  @property({ type: Boolean }) readonly = false;

  @state() private data: DefsClarificationData = emptyDefsData();
  @state() private initialized = false;
  @state() private editingField: string | null = null;
  @state() private editingIndex: number | null = null;
  @state() private tempValue = '';
  @state() private expanded: Set<string> = new Set(['functional', 'visual']);

  private msg: MessageType = messages['en'];

  protected willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('value') && this.value && !this.initialized) {
      this.data = { ...emptyDefsData(), ...this.value.data };
      this.initialized = true;
    }
  }

  private startEdit(field: string, currentValue: string, index: number | null = null): void {
    if (this.readonly) return;
    this.editingField = field;
    this.editingIndex = index;
    this.tempValue = currentValue;
  }

  private cancelEdit(): void {
    this.editingField = null;
    this.editingIndex = null;
    this.tempValue = '';
  }

  private saveEdit(): void {
    if (!this.editingField) return;
    if (this.editingIndex !== null) {
      const kind: DefsRequirementKind = this.editingField === 'visualRequirements' ? 'visual' : 'functional';
      this.data = applyDefsRequirementEdit(this.data, kind, this.editingIndex, this.tempValue);
    } else {
      this.data = applyDefsFieldEdit(this.data, this.editingField as DefsEditableField, this.tempValue);
    }
    this.cancelEdit();
  }

  private onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.saveEdit();
    } else if (event.key === 'Escape') {
      this.cancelEdit();
    }
  }

  private toggleSection(section: string): void {
    const next = new Set(this.expanded);
    if (next.has(section)) next.delete(section); else next.add(section);
    this.expanded = next;
  }

  private addRequirement(kind: DefsRequirementKind): void {
    const placeholder = kind === 'functional' ? this.msg.newFunctionalRequirement : this.msg.newVisualRequirement;
    this.data = addDefsRequirement(this.data, kind, placeholder);
  }

  private removeRequirement(kind: DefsRequirementKind, index: number): void {
    this.data = removeDefsRequirement(this.data, kind, index);
  }

  private get axes(): DefsAxisOption[] {
    return this.value?.axes || [];
  }

  private onAxisChange(key: string, value: string): void {
    this.data = applyDefsAxisValue(this.data, this.axes, key, value);
  }

  private finish(action: DefsAction): void {
    this.dispatchEvent(new CustomEvent('clarification-finish', {
      detail: { value: buildDefsResult(this.data, this.axes), action },
      bubbles: true,
      composed: true,
    }));
  }

  // One select per axis the group is governed by, pre-selected with what the model proposed. The
  // options are the vocabulary's closed enum plus a wildcard — the user never types a value.
  private renderAxes(): TemplateResult | typeof nothing {
    const axes = this.axes;
    if (!axes.length) return nothing;
    return html`
      <div class="dfc-section dfc-axes">
        <div class="dfc-section-header dfc-axes-header">
          <span class="dfc-section-title">${this.msg.layoutAxes}</span>
        </div>
        <p class="dfc-axes-hint">${this.msg.layoutAxesHint}</p>
        ${axes.map(axis => html`
          <div class="dfc-axis">
            <label class="dfc-axis-label" for=${`dfc-axis-${axis.key}`}>${axis.label}</label>
            <select
              id=${`dfc-axis-${axis.key}`}
              class="dfc-axis-select"
              ?disabled=${this.readonly}
              .value=${this.data.layoutConfig[axis.key] ?? DEFS_AXIS_WILDCARD}
              @change=${(e: Event) => this.onAxisChange(axis.key, (e.target as HTMLSelectElement).value)}
            >
              <option value=${DEFS_AXIS_WILDCARD}>${this.msg.axisWildcard}</option>
              ${axis.values.map(value => html`
                <option value=${value} ?selected=${this.data.layoutConfig[axis.key] === value}>
                  ${value}${value === axis.default ? ` (${this.msg.axisDefaultHint})` : ''}
                </option>
              `)}
            </select>
          </div>
        `)}
      </div>
    `;
  }

  private renderReadonlyRow(label: string, text: string): TemplateResult {
    return html`
      <div class="dfc-row dfc-row-readonly">
        <span class="dfc-label">${label}</span>
        <span class="dfc-readonly-value">${text}</span>
      </div>
    `;
  }

  private renderEditable(label: string, field: DefsEditableField, multiline = false): TemplateResult {
    const value = this.data[field];
    const isEditing = this.editingField === field && this.editingIndex === null;
    return html`
      <div class="dfc-row">
        <span class="dfc-label">${label}</span>
        ${isEditing ? html`
          <div class="dfc-edit">
            ${multiline ? html`
              <textarea
                class="dfc-textarea"
                rows="4"
                .value=${this.tempValue}
                @input=${(e: InputEvent) => { this.tempValue = (e.target as HTMLTextAreaElement).value; }}
                @keydown=${this.onKeydown}
              ></textarea>
            ` : html`
              <input
                type="text"
                class="dfc-input"
                .value=${this.tempValue}
                @input=${(e: InputEvent) => { this.tempValue = (e.target as HTMLInputElement).value; }}
                @keydown=${this.onKeydown}
              />
            `}
            <div class="dfc-edit-actions">
              <button class="dfc-btn dfc-save" @click=${this.saveEdit}>${this.msg.save}</button>
              <button class="dfc-btn" @click=${this.cancelEdit}>${this.msg.cancel}</button>
            </div>
          </div>
        ` : html`
          <div class="dfc-value ${this.readonly ? 'is-locked' : ''}" @click=${() => this.startEdit(field, value)}>
            <span class="dfc-value-text">${value || this.msg.clickToEdit}</span>
            ${this.readonly ? nothing : html`<span class="dfc-pencil">✎</span>`}
          </div>
        `}
      </div>
    `;
  }

  private renderRequirements(label: string, kind: DefsRequirementKind): TemplateResult {
    const key = kind === 'functional' ? 'functionalRequirements' : 'visualRequirements';
    const items = this.data[key];
    const isExpanded = this.expanded.has(kind);
    return html`
      <div class="dfc-section">
        <div class="dfc-section-header" @click=${() => this.toggleSection(kind)}>
          <span class="dfc-section-title">${label}</span>
          <span class="dfc-count">${items.length}</span>
          <span class="dfc-toggle">${isExpanded ? '▼' : '▶'}</span>
        </div>
        ${isExpanded ? html`
          <ul class="dfc-list">
            ${items.map((item, index) => html`
              <li class="dfc-item">
                ${this.editingField === key && this.editingIndex === index ? html`
                  <div class="dfc-edit">
                    <textarea
                      class="dfc-textarea"
                      rows="3"
                      .value=${this.tempValue}
                      @input=${(e: InputEvent) => { this.tempValue = (e.target as HTMLTextAreaElement).value; }}
                      @keydown=${this.onKeydown}
                    ></textarea>
                    <div class="dfc-edit-actions">
                      <button class="dfc-btn dfc-save" @click=${this.saveEdit}>${this.msg.save}</button>
                      <button class="dfc-btn" @click=${this.cancelEdit}>${this.msg.cancel}</button>
                    </div>
                  </div>
                ` : html`
                  <div class="dfc-item-content">
                    <span class="dfc-item-index">${index + 1}.</span>
                    <span class="dfc-item-text" @click=${() => this.startEdit(key, item, index)}>${item}</span>
                    ${this.readonly ? nothing : html`
                      <span class="dfc-item-actions">
                        <button class="dfc-icon" title=${this.msg.edit} @click=${() => this.startEdit(key, item, index)}>✎</button>
                        <button class="dfc-icon" title=${this.msg.remove} @click=${() => this.removeRequirement(kind, index)}>✕</button>
                      </span>
                    `}
                  </div>
                `}
              </li>
            `)}
          </ul>
          ${this.readonly ? nothing : html`
            <button class="dfc-btn dfc-add" @click=${() => this.addRequirement(kind)}>${this.msg.addRequirement}</button>
          `}
        ` : nothing}
      </div>
    `;
  }

  protected render(): TemplateResult {
    this.msg = messages[this.getMessageKey(messages)];
    if (!this.value) return html`<div class="dfc-empty">No clarification.</div>`;

    const tag = tagFromFileReference(this.data.fileReference);
    const axesIncomplete = this.axes.length > 0 && !this.axes.some(axis => !!this.data.layoutConfig[axis.key]);
    const canConfirm = !this.readonly && canConfirmDefs(this.data, this.axes);

    return html`
      <div class="dfc">
        <header class="dfc-header">
          <h2 class="dfc-title">${this.value.title || this.msg.title}</h2>
          <span class="dfc-group-chip">${this.data.group}</span>
        </header>
        <p class="dfc-intro">${this.value.intro || this.msg.intro}</p>

        <div class="dfc-fields">
          ${this.renderEditable(this.msg.fileReference, 'fileReference')}
          ${this.renderReadonlyRow(this.msg.tagName, tag || '—')}
          ${this.renderReadonlyRow(this.msg.group, this.data.group || '—')}
          ${this.renderReadonlyRow(this.msg.theme, this.value.themeLabel || this.msg.noTheme)}
          ${this.renderEditable(this.msg.description, 'description', true)}
          ${this.renderEditable(this.msg.prompt, 'prompt', true)}
        </div>

        <div class="dfc-sections">
          ${this.renderRequirements(this.msg.functionalRequirements, 'functional')}
          ${this.renderRequirements(this.msg.visualRequirements, 'visual')}
          ${this.renderAxes()}
        </div>

        ${!this.readonly && !canConfirm ? html`<p class="dfc-warning">${axesIncomplete ? this.msg.incompleteAxes : this.msg.incomplete}</p>` : nothing}

        <footer class="dfc-footer">
          <button class="dfc-btn" ?disabled=${this.readonly} @click=${() => this.finish('cancel')}>${this.msg.cancel}</button>
          <button class="dfc-btn dfc-confirm" ?disabled=${!canConfirm} @click=${() => this.finish('continue')}>${this.msg.confirm}</button>
        </footer>
      </div>
    `;
  }
}
