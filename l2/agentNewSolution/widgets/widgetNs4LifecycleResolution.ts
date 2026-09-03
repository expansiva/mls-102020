/// <mls fileReference="_102020_/l2/agentNewSolution/widgets/widgetNs4LifecycleResolution.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import type { Ns4E7LifecycleResolutionEvent, Ns4E7LifecycleResolutionReview } from '/_102020_/l2/agentNewSolution/steps/e7/lifecycleResolution.js';

@customElement('widget-ns4-lifecycle-resolution-102020')
export class WidgetNs4LifecycleResolution102020 extends StateLitElement {
  @property({ type: Object }) value: Ns4E7LifecycleResolutionReview | null = null;
  @state() private choices: Record<string, 'operateState' | 'shrinkLifecycle'> = {};

  render() {
    const review = this.value;
    if (!review) return html``;
    return html`<section class="ns4-lifecycle-resolution">
      <header><p>👤 E7 — Lifecycle decisions</p><h2>Resolve each lifecycle finding</h2>
        <p>Choose whether a journey must operate the state (E2) or whether the lifecycle must shrink (E4). No model retry will run.</p></header>
      ${review.findings.map(finding => html`<article>
        <strong>${finding.code}</strong><p>${finding.message}</p>
        <label>Resolution <select .value=${this.choices[finding.findingId] || ''}
          @change=${(event: Event) => { const action = (event.target as HTMLSelectElement).value; if (action === 'operateState' || action === 'shrinkLifecycle') this.choices = { ...this.choices, [finding.findingId]: action }; }}>
          <option value="">Choose…</option><option value="operateState">Operate state in E2</option><option value="shrinkLifecycle">Shrink lifecycle in E4</option>
        </select></label>
      </article>`)}
      <footer><button ?disabled=${review.findings.some(finding => !this.choices[finding.findingId])} @click=${this.submit}>Continue with selected upstream rounds</button></footer>
    </section>`;
  }

  private submit(): void {
    if (!this.value || this.value.findings.some(finding => !this.choices[finding.findingId])) return;
    const detail: Ns4E7LifecycleResolutionEvent = {
      moduleName: this.value.moduleName,
      selections: this.value.findings.map(finding => ({ findingId: finding.findingId, action: this.choices[finding.findingId] })),
    };
    this.dispatchEvent(new CustomEvent<Ns4E7LifecycleResolutionEvent>('ns4-lifecycle-resolution', { detail, bubbles: true, composed: true }));
  }
}

declare global { interface HTMLElementTagNameMap { 'widget-ns4-lifecycle-resolution-102020': WidgetNs4LifecycleResolution102020; } }
