/// <mls fileReference="_102020_/l2/aura/molecules/shared/widgetThemeConfirmation.ts" enhancement="_102027_/l2/enhancementLit"/>

// Theme Confirmation widget (Checkpoint 2): shows the generated theme's layout
// signature + palette swatches over its background, and emits `clarification-finish`
// with { value: { confirmed }, action: 'continue' | 'cancel' }. Confirm => the agent
// writes theme.ts + theme.html; Exit => discard. No Shadow DOM (styles in the .less).

import { html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import {
  readableTextOn,
  type ConfirmAction,
  type ThemeConfirmationValue,
} from '/_102020_/l2/aura/molecules/shared/widgetThemeConfirmationLogic.js';

@customElement('widget-theme-confirmation-102020')
export class WidgetThemeConfirmation102020 extends StateLitElement {
  @property({ type: Object }) value: ThemeConfirmationValue | null = null;
  @property({ type: Boolean }) readonly = false;

  private finish(action: ConfirmAction): void {
    this.dispatchEvent(new CustomEvent('clarification-finish', {
      detail: { value: { confirmed: action === 'continue' }, action },
      bubbles: true,
    }));
  }

  protected render(): TemplateResult {
    if (!this.value) return html`<div class="empty">No theme to confirm.</div>`;
    const s = this.value.summary;
    return html`
      <div class="tc">
        <h2 class="tc-title">${this.value.title}</h2>

        <div class="tc-preview" style=${`min-height:96px; border-radius:8px; ${s.background.css}`}>
          <span class="tc-preview-name">${s.displayName}</span>
        </div>

        <div class="tc-section-title">Palette</div>
        <div class="tc-swatches">
          ${s.palette.map(sw => html`
            <div class="tc-swatch">
              <div class="tc-chip" style=${`background:${sw.color}; color:${readableTextOn(sw.color)};`}>${sw.color}</div>
              <div class="tc-swatch-label">${sw.label}</div>
              <div class="tc-swatch-token">${sw.token}</div>
            </div>
          `)}
        </div>

        <div class="tc-section-title">Signature</div>
        <table class="tc-signature">
          <tbody>
            ${s.signature.map(row => html`
              <tr><th>${row.aspect}</th><td>${row.value}</td></tr>
            `)}
          </tbody>
        </table>

        <div class="tc-actions">
          <button class="tc-btn tc-exit" ?disabled=${this.readonly} @click=${() => this.finish('cancel')}>Exit</button>
          <button class="tc-btn tc-confirm" ?disabled=${this.readonly} @click=${() => this.finish('continue')}>Confirm &amp; create</button>
        </div>
      </div>
    `;
  }
}
