/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i4-inherit/widgetInheritChoice.ts" enhancement="_102027_/l2/enhancementLit"/>

// "Inherit Choice" widget: the human decides WHERE a fix goes on an inherited shell.
//
// A separate widget from n2-plan's on purpose (flow.json): that one confirms REQUIREMENTS, this one
// presents three options whose CONSEQUENCES differ, and the consequence is what the user needs
// before clicking — not after.
//
// The three are not equal and the widget must not present them as if they were:
//   - `.less` keeps the shell inheriting everything;
//   - an override makes the shell stop inheriting THAT member forever, which the card says out
//     loud, and says louder for render();
//   - `parent` writes nothing at all and ends the run with an instruction.
//
// No Shadow DOM (StateLitElement) — styles live in the sibling .less scoped under the tag.

import { html, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import {
  applyInheritMember,
  applyInheritWhere,
  buildInheritResult,
  canConfirmInherit,
  inheritBlockingIssues,
  isExpensiveOverride,
  offerableMembers,
  type InheritChoiceData,
  type InheritChoiceValue,
  type InheritWhere,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i4-inherit/widgetInheritChoiceLogic.js';

/// **collab_i18n_start**
const message_pt = {
  title: 'Onde aplicar a correção',
  intro: 'Esta molécula herda de outra, que vive em outro projeto. O agente nunca altera o código do pai — escolha onde a correção entra aqui.',
  shellOf: 'Herda de',
  suggestion: 'Sugestão',
  lessTitle: 'Só estilo, no .less desta molécula',
  lessBody: 'A correção é visual e cabe na folha própria da casca. Continua herdando tudo do pai.',
  overrideTitle: 'Sobrescrever um membro aqui',
  overrideBody: 'Resolve qualquer coisa. Em troca, esta casca PARA DE HERDAR esse membro: uma correção futura na base não chega mais aqui.',
  overrideExpensive: 'Sobrescrever render() abre mão de todo o markup do pai. Nenhuma das 84 cascas existentes faz isso.',
  parentTitle: 'A correção é do componente base',
  parentBody: 'Nada será alterado. O agente encerra e informa qual arquivo abrir no projeto da base — é onde este pedido deve ser feito.',
  memberLabel: 'Membro a sobrescrever',
  memberPlaceholder: 'nome do membro no pai',
  alreadyOverridden: 'já sobrescrito aqui',
  costProperty: 'propriedade',
  costMethod: 'método',
  parentUnreadable: 'O código do pai não pôde ser lido daqui; digite o nome do membro.',
  noLess: 'Esta molécula ainda não tem .less. Escolher esta opção faz o agente criar um.',
  needMember: 'Escolha o membro a sobrescrever.',
  cancel: 'Cancelar',
  confirm: 'Confirmar',
};

const message_en = {
  title: 'Where the fix goes',
  intro: 'This molecule inherits from another, living in a different project. The agent never changes the parent — choose where the fix goes here.',
  shellOf: 'Inherits from',
  suggestion: 'Suggestion',
  lessTitle: 'Style only, in this molecule\'s .less',
  lessBody: 'The fix is visual and fits the shell\'s own sheet. It keeps inheriting everything from the parent.',
  overrideTitle: 'Override a member here',
  overrideBody: 'Solves anything. In exchange, this shell STOPS INHERITING that member: a later fix in the base no longer reaches it.',
  overrideExpensive: 'Overriding render() gives up all of the parent\'s markup. None of the 84 existing shells does this.',
  parentTitle: 'The fix belongs to the base component',
  parentBody: 'Nothing will be changed. The agent ends and tells you which file to open in the base project — that is where this request belongs.',
  memberLabel: 'Member to override',
  memberPlaceholder: 'member name in the parent',
  alreadyOverridden: 'already overridden here',
  costProperty: 'property',
  costMethod: 'method',
  parentUnreadable: 'The parent source could not be read from here; type the member name.',
  noLess: 'This molecule has no .less yet. Choosing this makes the agent create one.',
  needMember: 'Choose the member to override.',
  cancel: 'Cancel',
  confirm: 'Confirm',
};

type MessageType = typeof message_en;

const messages: { [key: string]: MessageType } = {
  'en': message_en,
  'pt': message_pt,
};
/// **collab_i18n_end**

@customElement('widget-inherit-choice-102020')
export class WidgetInheritChoice102020 extends StateLitElement {
  @property({ type: Object }) value: InheritChoiceValue | null = null;
  @property({ type: Boolean }) readonly = false;

  @state() private data: InheritChoiceData = { where: 'less', member: '' };
  @state() private initialized = false;

  private msg: MessageType = messages['en'];

  private choose(where: InheritWhere) {
    if (this.readonly) return;
    this.data = applyInheritWhere(this.data, where);
  }

  private pickMember(member: string) {
    if (this.readonly) return;
    this.data = applyInheritMember(this.data, member);
  }

  private finish(action: 'continue' | 'cancel') {
    this.dispatchEvent(new CustomEvent('clarification-finish', {
      detail: { value: buildInheritResult(this.data, action), action },
      bubbles: true,
      composed: true,
    }));
  }

  private renderOption(where: InheritWhere, title: string, body: string, extra: TemplateResult | typeof nothing = nothing): TemplateResult {
    const selected = this.data.where === where;
    return html`
      <div class="ihc-option ${selected ? 'is-selected' : ''} ihc-option-${where}" @click=${() => this.choose(where)}>
        <div class="ihc-option-head">
          <span class="ihc-radio ${selected ? 'is-on' : ''}"></span>
          <span class="ihc-option-title">${title}</span>
          ${this.value?.suggested.where === where ? html`<span class="ihc-badge">${this.msg.suggestion}</span>` : nothing}
        </div>
        <p class="ihc-option-body">${body}</p>
        ${selected ? extra : nothing}
      </div>
    `;
  }

  private renderMemberPicker(): TemplateResult {
    const value = this.value!;
    const offered = offerableMembers(value);
    const expensive = isExpensiveOverride(this.data.member);

    return html`
      <div class="ihc-member">
        <label class="ihc-member-label">${this.msg.memberLabel}</label>
        ${offered.length ? html`
          <div class="ihc-member-list">
            ${offered.map(member => html`
              <button
                class="ihc-member-item ${this.data.member === member.name ? 'is-on' : ''} ${isExpensiveOverride(member.name) ? 'is-expensive' : ''}"
                @click=${(event: Event) => { event.stopPropagation(); this.pickMember(member.name); }}>
                <span class="ihc-member-name">${member.name}</span>
                <span class="ihc-member-kind">${member.kind === 'property' ? this.msg.costProperty : this.msg.costMethod}</span>
                ${member.alreadyOverridden ? html`<span class="ihc-member-note">${this.msg.alreadyOverridden}</span>` : nothing}
              </button>
            `)}
          </div>
        ` : html`
          <p class="ihc-hint">${this.msg.parentUnreadable}</p>
          <input
            class="ihc-member-input"
            .value=${this.data.member}
            placeholder=${this.msg.memberPlaceholder}
            @click=${(event: Event) => event.stopPropagation()}
            @input=${(event: Event) => this.pickMember((event.target as HTMLInputElement).value)}>
        `}
        ${expensive ? html`<p class="ihc-warning">${this.msg.overrideExpensive}</p>` : nothing}
      </div>
    `;
  }

  protected render(): TemplateResult {
    this.msg = messages[this.getMessageKey(messages)];
    const value = this.value;
    if (!value) return html`<div class="ihc-empty">No clarification.</div>`;

    // The model's suggestion is the starting point, not the answer. It is applied once, so a
    // re-render never drags the user's own choice back to it.
    if (!this.initialized) {
      this.data = { where: value.suggested.where, member: value.suggested.member };
      this.initialized = true;
    }

    const blocking = inheritBlockingIssues(this.data, value);
    const canConfirm = canConfirmInherit(this.data, value);

    return html`
      <div class="ihc">
        <div class="ihc-header">
          <h3 class="ihc-title">${value.title || this.msg.title}</h3>
          <p class="ihc-intro">${this.msg.intro}</p>
          <p class="ihc-parent">
            <strong>${value.tag}</strong> · ${this.msg.shellOf} <code>${value.parentClassName}</code>
            <span class="ihc-parent-ref">${value.parentReference}</span>
          </p>
          ${value.suggestionReason ? html`<p class="ihc-reason">${value.suggestionReason}</p>` : nothing}
        </div>

        <div class="ihc-options">
          ${this.renderOption('less', this.msg.lessTitle, this.msg.lessBody,
            value.hasLess ? nothing : html`<p class="ihc-hint">${this.msg.noLess}</p>`)}
          ${this.renderOption('override', this.msg.overrideTitle, this.msg.overrideBody, this.renderMemberPicker())}
          ${this.renderOption('parent', this.msg.parentTitle, this.msg.parentBody)}
        </div>

        ${blocking.includes('no_member') || blocking.includes('unknown_member')
          ? html`<p class="ihc-blocking">${this.msg.needMember}</p>` : nothing}

        <div class="ihc-footer">
          <button class="ihc-btn ihc-cancel" @click=${() => this.finish('cancel')}>${this.msg.cancel}</button>
          <button class="ihc-btn ihc-confirm" ?disabled=${!canConfirm || this.readonly} @click=${() => this.finish('continue')}>
            ${this.msg.confirm}
          </button>
        </div>
      </div>
    `;
  }
}
