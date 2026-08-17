/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i2a-definition/widgetDefinitionChoice.ts" enhancement="_102020_/l2/enhancementAura"/>

// The route A checkpoint: what this molecule will start promising.
//
// It is the only screen in the agent where a promise moves, so it says the consequence out loud —
// pages already written against this molecule keep working only for what is ADDED; a removal or a
// rename is a break, and the card shows which is which before the click, not after.
//
// The list is the whole widget. Each line can be dropped on its own, dropping all of them disables
// Confirm (that is a cancellation), and nothing is written until Confirm — same contract as the
// inheritance checkpoint.

import { html, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { ImDefinitionChange, imMessageKey } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';
import {
  buildDefinitionResult,
  canConfirmDefinition,
  changeLabelKey,
  definitionBlockingIssues,
  initialSelection,
  toggleSelection,
  type DefinitionAction,
  type DefinitionChoiceResult,
  type DefinitionChoiceValue,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i2a-definition/widgetDefinitionChoiceLogic.js';

/// **collab_i18n_start**
const message_pt = {
  title: 'A definição desta molécula vai mudar',
  intro: 'Isto não é um ajuste: é o que a molécula promete. As páginas que já usam esta tag continuam funcionando no que for ADICIONADO — remover ou renomear quebra quem já escreveu.',
  requestLabel: 'O que foi pedido',
  todayLabel: 'O que ela declara hoje',
  changesLabel: 'O que vai mudar',
  slots: 'slots',
  properties: 'propriedades',
  events: 'eventos',
  none: '(nenhum)',
  slot_add: 'slot novo',
  slot_remove: 'slot removido',
  slot_rename: 'slot renomeado',
  property_add: 'propriedade nova',
  property_remove: 'propriedade removida',
  property_rename: 'propriedade renomeada',
  event_add: 'evento novo',
  event_remove: 'evento removido',
  event_rename: 'evento renomeado',
  breaking: 'quebra páginas existentes',
  wasCalled: 'antes',
  dropHint: 'Desmarque o que não deve entrar.',
  noChange: 'Nada selecionado — confirmar assim seria o mesmo que cancelar.',
  cancelled: 'Cancelado — nada foi alterado. O run para aqui; pode fechar.',
  confirmed: 'Confirmado. O agente está aplicando a mudança.',
  cancel: 'Cancelar',
  confirm: 'Confirmar',
};

const message_en = {
  title: 'This molecule\'s definition is about to change',
  intro: 'This is not an adjustment: it is what the molecule promises. Pages already using this tag keep working for whatever is ADDED — a removal or a rename breaks whoever already wrote one.',
  requestLabel: 'What was asked',
  todayLabel: 'What it declares today',
  changesLabel: 'What will change',
  slots: 'slots',
  properties: 'properties',
  events: 'events',
  none: '(none)',
  slot_add: 'new slot',
  slot_remove: 'slot removed',
  slot_rename: 'slot renamed',
  property_add: 'new property',
  property_remove: 'property removed',
  property_rename: 'property renamed',
  event_add: 'new event',
  event_remove: 'event removed',
  event_rename: 'event renamed',
  breaking: 'breaks existing pages',
  wasCalled: 'was',
  dropHint: 'Uncheck anything that should not go in.',
  noChange: 'Nothing selected — confirming this would be the same as cancelling.',
  cancelled: 'Cancelled — nothing was changed. The run stops here; you can close this.',
  confirmed: 'Confirmed. The agent is applying the change.',
  cancel: 'Cancel',
  confirm: 'Confirm',
};

type MessageType = typeof message_en;

const messages: { [key: string]: MessageType } = {
  'en': message_en,
  'pt': message_pt,
};
/// **collab_i18n_end**

@customElement('widget-definition-choice-102020')
export class WidgetDefinitionChoice102020 extends StateLitElement {
  @property({ type: Object }) value: DefinitionChoiceValue | null = null;
  @property({ type: Boolean }) readonly = false;

  @state() private selection: boolean[] = [];
  @state() private initialized = false;
  /** Set on the click that ends the checkpoint, so the widget can answer before the framework does. */
  @state() private finished: DefinitionAction | null = null;

  private msg: MessageType = messages['en'];

  private toggle(index: number) {
    if (this.readonly || this.finished) return;
    this.selection = toggleSelection(this.selection, index);
  }

  /**
   * ⚠️ THE CLICK HAS TO ANSWER, measured 2026-08-14. The intents are applied with `resume: false`, so
   * the framework does not re-render the checkpoint and the widget stays exactly as it was. The user
   * clicked Cancel, saw nothing move, and only later noticed the step had gone red — "nada aconteceu"
   * followed by an error is the worst possible reading of a button that worked.
   *
   * So the widget answers for itself: it locks and says what it did. The step status still travels
   * the same path — cancelling has to FAIL the step, because i3, i5, i6 and i7 are already planted
   * and waiting on the `i2a-done` anchor. Completing without that anchor would hang the run, which is
   * the 2026-08-10 defect recorded in i4-inherit.
   */
  private finish(action: DefinitionAction) {
    const value = this.value;
    if (!value || this.finished) return;
    const detail: { value: DefinitionChoiceResult; action: DefinitionAction } = {
      value: buildDefinitionResult(value.changes, this.selection, action),
      action,
    };
    this.finished = action;
    this.dispatchEvent(new CustomEvent('clarification-finish', { detail, bubbles: true, composed: true }));
  }

  /** `remove` and `rename` are the two that break a page already written against this molecule. */
  private isBreaking(change: ImDefinitionChange): boolean {
    return change.op === 'remove' || change.op === 'rename';
  }

  private renderToday(): TemplateResult {
    const current = this.value!.current;
    const line = (label: string, names: string[]) => html`
      <li>
        <span class="dfc-today-kind">${label}</span>
        <span class="dfc-today-names">${names.length ? names.join(', ') : this.msg.none}</span>
      </li>
    `;
    return html`
      <ul class="dfc-today">
        ${line(this.msg.slots, current.slots)}
        ${line(this.msg.properties, current.properties)}
        ${line(this.msg.events, current.events)}
      </ul>
    `;
  }

  private renderChange(change: ImDefinitionChange, index: number): TemplateResult {
    const on = this.selection[index];
    const breaking = this.isBreaking(change);
    const label = (this.msg as unknown as Record<string, string>)[changeLabelKey(change)] || changeLabelKey(change);
    return html`
      <li class="dfc-change ${on ? 'is-on' : ''} ${breaking ? 'is-breaking' : ''}" @click=${() => this.toggle(index)}>
        <span class="dfc-check ${on ? 'is-on' : ''}"></span>
        <div class="dfc-change-body">
          <p class="dfc-change-head">
            <code class="dfc-change-name">${change.name}</code>
            <span class="dfc-change-kind">${label}</span>
            ${change.previousName ? html`<span class="dfc-change-was">${this.msg.wasCalled} <code>${change.previousName}</code></span>` : nothing}
            ${breaking ? html`<span class="dfc-breaking">${this.msg.breaking}</span>` : nothing}
          </p>
          <p class="dfc-change-purpose">${change.purpose}</p>
        </div>
      </li>
    `;
  }

  protected render(): TemplateResult {
    const value = this.value;
    // The chrome follows the run's language, not the document's — see imMessageKey.
    this.msg = messages[imMessageKey(value?.userLanguage, Object.keys(messages), this.getMessageKey(messages))];
    if (!value) return html`<div class="dfc-empty">No clarification.</div>`;

    if (!this.initialized) {
      this.selection = initialSelection(value.changes);
      this.initialized = true;
    }

    const blocking = definitionBlockingIssues(value.changes, this.selection);
    const canConfirm = canConfirmDefinition(value.changes, this.selection);

    return html`
      <div class="dfc">
        <div class="dfc-header">
          <h3 class="dfc-title">${value.title || this.msg.title}</h3>
          <p class="dfc-intro">${this.msg.intro}</p>
          <p class="dfc-tag"><strong>${value.tag}</strong></p>
          ${value.request ? html`
            <p class="dfc-request"><span class="dfc-label">${this.msg.requestLabel}:</span> ${value.request}</p>
          ` : nothing}
          ${value.reason ? html`<p class="dfc-reason">${value.reason}</p>` : nothing}
        </div>

        <div class="dfc-section">
          <p class="dfc-label">${this.msg.todayLabel}</p>
          ${this.renderToday()}
        </div>

        <div class="dfc-section">
          <p class="dfc-label">${this.msg.changesLabel}</p>
          <ul class="dfc-changes">
            ${value.changes.map((change, index) => this.renderChange(change, index))}
          </ul>
          <p class="dfc-hint">${this.msg.dropHint}</p>
        </div>

        ${blocking.includes('no_change') && !this.finished ? html`<p class="dfc-blocking">${this.msg.noChange}</p>` : nothing}

        ${this.finished
          ? html`<p class="dfc-finished">${this.finished === 'cancel' ? this.msg.cancelled : this.msg.confirmed}</p>`
          : html`
            <div class="dfc-footer">
              <button class="dfc-btn dfc-cancel" @click=${() => this.finish('cancel')}>${this.msg.cancel}</button>
              <button class="dfc-btn dfc-confirm" ?disabled=${!canConfirm || this.readonly} @click=${() => this.finish('continue')}>
                ${this.msg.confirm}
              </button>
            </div>
          `}
      </div>
    `;
  }
}
