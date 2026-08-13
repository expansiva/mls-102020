/// <mls fileReference="_102020_/l2/agentNewSolution4/widgets/widgetNs4Final.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import type { Ns4E10RepairStep, Ns4E10ReviewEvent, Ns4E10ValidationReport } from '/_102020_/l2/agentNewSolution4/steps/e10/contracts.js';

const repairSteps: Ns4E10RepairStep[] = ['e2-journeys', 'e3-access-matrix', 'e4-ontology', 'e5-rules', 'e6-behaviors', 'e7-realization', 'e8-workspaces', 'e9-navigation-compiler'];

@customElement('widget-ns4-final-102020')
export class WidgetNs4Final102020 extends StateLitElement {
  @property({ type: Object }) value: Ns4E10ValidationReport | null = null;
  @state() private submitting = false;
  @state() private adjustment = '';
  @state() private repairStep: Ns4E10RepairStep = 'e8-workspaces';

  setSubmitting(value: boolean): void { this.submitting = value; }

  render() {
    const report = this.value; if (!report) return html``;
    const general = report.menuPreview.navigation.filter(item => !item.hub);
    const hubs = new Map<string, typeof report.menuPreview.navigation>();
    report.menuPreview.navigation.filter(item => item.hub).forEach(item => hubs.set(item.hub!, [...(hubs.get(item.hub!) || []), item]));
    return html`<section class="ns4-final">
      <header><p>👤 E10 — Validate the finished solution</p><h2>${report.moduleName}</h2><span class="ok">Validation passed</span></header>
      <section class="counts">
        ${this.count('Workspaces', report.counts.workspaces)}${this.count('Scenarios', report.counts.scenarios)}
        ${this.count('Contracts', report.counts.contracts)}${this.count('Notifications', report.counts.notifications)}
      </section>
      <section><h3>Validation</h3><div class="checks">${report.checks.map(check => html`<article class=${check.status}>
        <strong>${check.checkId}</strong><span>${check.status}</span><small>${check.errorCount} errors · ${check.warningCount} warnings · ${check.registrarCount} records</small>
      </article>`)}</div></section>
      ${report.warnings.length ? html`<details><summary>Warnings (${report.warnings.length})</summary>${report.warnings.map(item => html`<p><code>${item.code}</code> ${item.message}</p>`)}</details>` : ''}
      ${report.registrars.length ? html`<details><summary>Registrar findings (${report.registrars.length})</summary>${report.registrars.map(item => html`<p><code>${item.code}</code> ${item.message}</p>`)}</details>` : ''}
      <section><h3>Header links</h3>${report.menuPreview.headerLinks.map(item => html`<p><strong>${item.label}</strong> <code>${item.href}</code> · ${item.actors.join(', ') || '—'} · manageable</p>`)}</section>
      <section><h3>General navigation</h3>${general.length ? general.map(item => this.nav(item)) : html`<p>—</p>`}</section>
      ${[...hubs].map(([hub, items]) => html`<section><h3>Hub · ${hub}</h3>${items.map(item => this.nav(item))}</section>`)}
      <details><summary>Assumed decisions (${report.counts.decisions})</summary>
        ${report.policyDecisions.map(decision => html`<p><code>${decision.decisionId}</code> → ${decision.selectedChoice} <small>(${decision.selectedBy})</small></p>`)}
        ${report.systemDecisions.map(decision => html`<p><code>${decision.findingRef}</code> → ${decision.chosen} <small>(${decision.decidedBy})</small></p>`)}
      </details>
      <section class="reopen"><h3>Reopen a stage</h3><select .value=${this.repairStep} ?disabled=${this.submitting} @change=${(event: Event) => { this.repairStep = (event.target as HTMLSelectElement).value as Ns4E10RepairStep; }}>${repairSteps.map(item => html`<option value=${item}>${item}</option>`)}</select>
        <textarea .value=${this.adjustment} ?disabled=${this.submitting} placeholder="Reason for reopening" @input=${(event: Event) => { this.adjustment = (event.target as HTMLTextAreaElement).value; }}></textarea></section>
      <footer><button @click=${() => this.submit('requestChanges')} ?disabled=${this.submitting || !this.adjustment.trim()}>Reopen selected stage</button><button class="primary" @click=${() => this.submit('approve')} ?disabled=${this.submitting || Boolean(this.adjustment.trim())}>Approve finished solution</button></footer>
    </section>`;
  }
  private count(label: string, value: number) { return html`<article><strong>${value}</strong><span>${label}</span></article>`; }
  private nav(item: Ns4E10ValidationReport['menuPreview']['navigation'][number]) { return html`<p><strong>${item.label}</strong> <code>${item.href}</code> · ${item.actors.join(', ') || '—'}</p>`; }
  private submit(action: Ns4E10ReviewEvent['action']): void {
    if (!this.value || this.submitting) return; this.submitting = true;
    this.dispatchEvent(new CustomEvent<Ns4E10ReviewEvent>('ns4-final-review', { detail: { action, moduleName: this.value.moduleName,
      ...(action === 'requestChanges' ? { repairStep: this.repairStep } : {}), adjustment: this.adjustment.trim() }, bubbles: true, composed: true }));
  }
}
declare global { interface HTMLElementTagNameMap { 'widget-ns4-final-102020': WidgetNs4Final102020; } }
