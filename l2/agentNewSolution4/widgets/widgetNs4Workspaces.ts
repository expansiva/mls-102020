/// <mls fileReference="_102020_/l2/agentNewSolution4/widgets/widgetNs4Workspaces.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import type { Ns4E8ReviewEvent, Ns4E8SkeletonReview } from '/_102020_/l2/agentNewSolution4/steps/e8/contracts.js';

@customElement('widget-ns4-workspaces-102020')
export class WidgetNs4Workspaces102020 extends StateLitElement {
  @property({ type: Object }) value: Ns4E8SkeletonReview | null = null;
  @state() private adjustment = '';
  @state() private submitting = false;

  setSubmitting(value: boolean): void { this.submitting = value; }

  render() {
    const review = this.value;
    if (!review) return html``;
    return html`<section class="ns4-workspaces">
      <header><p>👤 E8 — Workspace map</p><h2>${review.title}</h2></header>
      <section><h3>Header</h3><p>${review.menu.headerLinks.join(' · ') || '—'}</p></section>
      <section><h3>Workspaces</h3>${review.workspaces.map(workspace => html`<article><strong>${workspace.title}</strong> <code>${workspace.workspaceId}</code><p>${workspace.kind}${workspace.anchorEntity ? ` · ${workspace.anchorEntity}` : ''} · ${workspace.profileRefs.join(', ') || '—'}</p><p>${workspace.scenarios.map(scenario => scenario.title).join(' · ')}</p></article>`)}</section>
      <section><h3>Menu</h3>${review.menu.sections.map(section => html`<p><strong>${section.label}</strong>: ${section.workspaceIds.join(', ')}</p>`)}</section>
      <section><h3>Context edges</h3>${review.edges.map(edge => html`<p><code>${edge.from} → ${edge.to}</code> (${edge.carries.join(', ')})</p>`)}</section>
      <label>Changes<textarea .value=${this.adjustment} ?disabled=${this.submitting} @input=${(event: Event) => { this.adjustment = (event.target as HTMLTextAreaElement).value; }}></textarea></label>
      <footer><button @click=${() => this.submit('requestChanges')} ?disabled=${this.submitting || !this.adjustment.trim()}>Request changes</button><button @click=${() => this.submit('approve')} ?disabled=${this.submitting || Boolean(this.adjustment.trim())}>Approve map</button></footer>
    </section>`;
  }
  private submit(action: Ns4E8ReviewEvent['action']): void {
    if (!this.value || this.submitting || action === 'cancel') return;
    this.submitting = true;
    this.dispatchEvent(new CustomEvent<Ns4E8ReviewEvent>('ns4-workspaces-review', { detail: { action, adjustment: this.adjustment.trim(), review: this.value }, bubbles: true, composed: true }));
  }
}
declare global { interface HTMLElementTagNameMap { 'widget-ns4-workspaces-102020': WidgetNs4Workspaces102020; } }
