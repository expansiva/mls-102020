/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e3/widgetNs4AccessMatrix.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import {
  Ns4AccessGrant,
  Ns4E3Review,
  Ns4E3ReviewEvent,
} from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';

const labels = {
  en: {
    subtitle: 'Review who may perform each capability and exactly which information may be disclosed.',
    round: 'Review', profiles: 'Access profiles', internal: 'Internal', external: 'External',
    actors: 'E2 actors', landing: 'Starting point', matrix: 'Profile × authority matrix',
    authority: 'Authority', noAccess: 'No access', full: 'Full record', limited: 'Limited',
    details: 'Access details', reason: 'Business reason', scope: 'Data scope', disclosure: 'Disclosure boundary',
    allowed: 'May expose', denied: 'Must not expose', constraints: 'Constraints', journeySteps: 'Journey steps',
    informationNeeds: 'Information needs', changes: 'Changes in this round', adjustment: 'What should change?',
    placeholder: 'Example: Add authority to view project budgets; some clients may see a summary without seeing the whole project.',
    requestChanges: 'Generate another proposal', approve: 'Approve access matrix',
    adjustmentRequired: 'Describe the required change before generating another proposal.', empty: 'No access matrix available.',
  },
  pt: {
    subtitle: 'Revise quem pode executar cada capacidade e exatamente quais informações podem ser expostas.',
    round: 'Revisão', profiles: 'Perfis de acesso', internal: 'Interno', external: 'Externo',
    actors: 'Atores do E2', landing: 'Ponto de entrada', matrix: 'Matriz perfil × autoridade',
    authority: 'Autoridade', noAccess: 'Sem acesso', full: 'Registro completo', limited: 'Limitado',
    details: 'Detalhes do acesso', reason: 'Motivo de negócio', scope: 'Escopo dos dados', disclosure: 'Limite de exposição',
    allowed: 'Pode expor', denied: 'Não pode expor', constraints: 'Restrições', journeySteps: 'Passos das jornadas',
    informationNeeds: 'Necessidades de informação', changes: 'Alterações desta revisão', adjustment: 'O que deve mudar?',
    placeholder: 'Exemplo: adicione autoridade para ver orçamentos; alguns clientes podem ver um resumo sem acessar o projeto inteiro.',
    requestChanges: 'Gerar nova proposta', approve: 'Aprovar matriz de acesso',
    adjustmentRequired: 'Descreva a alteração necessária antes de gerar outra proposta.', empty: 'Nenhuma matriz de acesso disponível.',
  },
  es: {
    subtitle: 'Revise quién puede ejecutar cada capacidad y exactamente qué información puede exponerse.',
    round: 'Revisión', profiles: 'Perfiles de acceso', internal: 'Interno', external: 'Externo',
    actors: 'Actores de E2', landing: 'Punto de entrada', matrix: 'Matriz perfil × autoridad',
    authority: 'Autoridad', noAccess: 'Sin acceso', full: 'Registro completo', limited: 'Limitado',
    details: 'Detalles del acceso', reason: 'Motivo de negocio', scope: 'Alcance de datos', disclosure: 'Límite de exposición',
    allowed: 'Puede exponer', denied: 'No puede exponer', constraints: 'Restricciones', journeySteps: 'Pasos de jornadas',
    informationNeeds: 'Necesidades de información', changes: 'Cambios de esta revisión', adjustment: '¿Qué debe cambiar?',
    placeholder: 'Ejemplo: agregue autoridad para ver presupuestos; algunos clientes pueden ver un resumen sin acceder al proyecto completo.',
    requestChanges: 'Generar otra propuesta', approve: 'Aprobar matriz de acceso',
    adjustmentRequired: 'Describa el cambio necesario antes de generar otra propuesta.', empty: 'No hay matriz de acceso disponible.',
  },
};

@customElement('widget-ns4-access-matrix-102020')
export class WidgetNs4AccessMatrix102020 extends StateLitElement {
  @property({ type: Object }) value: Ns4E3Review | null = null;
  @property({ type: Boolean }) readonly = false;

  @state() private adjustment = '';
  @state() private submitting = false;
  @state() private selectedGrantKey = '';

  private text() {
    const language = this.value?.userLanguage?.toLowerCase() || 'en';
    if (language.startsWith('pt')) return labels.pt;
    if (language.startsWith('es')) return labels.es;
    return labels.en;
  }

  private submit(action: Ns4E3ReviewEvent['action']) {
    if (!this.value || this.readonly || this.submitting) return;
    const text = this.text();
    if (action === 'requestChanges' && !this.adjustment.trim()) {
      window.alert(text.adjustmentRequired);
      return;
    }
    this.submitting = true;
    this.dispatchEvent(new CustomEvent<Ns4E3ReviewEvent>('ns4-access-matrix-review', {
      detail: { action, adjustment: this.adjustment.trim(), review: this.value },
      bubbles: true,
      composed: true,
    }));
  }

  private grantKey(grant: Ns4AccessGrant): string {
    return `${grant.profileRef}\u0000${grant.authorityRef}`;
  }

  private selectedGrant(): Ns4AccessGrant | undefined {
    if (!this.value) return undefined;
    return this.value.grants.find(grant => this.grantKey(grant) === this.selectedGrantKey) || this.value.grants[0];
  }

  render() {
    const text = this.text();
    if (!this.value) return html`<div class="ns4-empty">${text.empty}</div>`;
    const selected = this.selectedGrant();
    return html`
      <section class="ns4-access-matrix">
        <header>
          <div><h2>${this.value.title}</h2><p>${text.subtitle}</p></div>
          <span>${text.round} ${this.value.reviewRound}</span>
        </header>

        ${this.value.changeSummary.length ? html`
          <section class="ns4-changes"><h3>${text.changes}</h3><ul>${this.value.changeSummary.map(item => html`<li>${item}</li>`)}</ul></section>
        ` : ''}

        <section class="ns4-profiles">
          <h3>${text.profiles}</h3>
          <div>${this.value.profiles.map(profile => html`
            <article>
              <div><strong>${profile.title}</strong><span class=${profile.kind}>${profile.kind === 'external' ? text.external : text.internal}</span></div>
              <p>${profile.description}</p>
              <dl>
                <div><dt>${text.actors}</dt><dd>${profile.actorRefs.join(', ') || '—'}</dd></div>
                <div><dt>${text.landing}</dt><dd>${profile.landingIntent}</dd></div>
              </dl>
            </article>
          `)}</div>
        </section>

        <section class="ns4-matrix-card">
          <h3>${text.matrix}</h3>
          <div class="ns4-table-scroll"><table>
            <thead><tr><th>${text.authority}</th>${this.value.profiles.map(profile => html`<th>${profile.title}</th>`)}</tr></thead>
            <tbody>${this.value.authorities.map(authority => html`
              <tr>
                <th><strong>${authority.title}</strong><code>${authority.authorityRef}</code></th>
                ${this.value!.profiles.map(profile => {
                  const grant = this.value!.grants.find(item => item.profileRef === profile.profileId && item.authorityRef === authority.authorityRef);
                  if (!grant) return html`<td><span class="ns4-none" title=${text.noAccess}>—</span></td>`;
                  const key = this.grantKey(grant);
                  const full = grant.disclosure.mode === 'fullRecord';
                  return html`<td><button
                    class="ns4-grant ${this.selectedGrantKey === key || (!this.selectedGrantKey && selected === grant) ? 'selected' : ''} ${full ? 'full' : 'limited'}"
                    title=${grant.reason}
                    @click=${() => { this.selectedGrantKey = key; }}
                  >${full ? text.full : text.limited}</button></td>`;
                })}
              </tr>
            `)}</tbody>
          </table></div>
        </section>

        ${selected ? this.renderDetails(selected, text) : ''}

        <footer>
          <label><span>${text.adjustment}</span><textarea
            .value=${this.adjustment}
            placeholder=${text.placeholder}
            ?disabled=${this.submitting || this.readonly}
            @input=${(event: Event) => { this.adjustment = (event.target as HTMLTextAreaElement).value; }}
          ></textarea></label>
          <div>
            <button class="secondary" ?disabled=${this.submitting || this.readonly} @click=${() => this.submit('requestChanges')}>${text.requestChanges}</button>
            <button class="primary" ?disabled=${this.submitting || this.readonly} @click=${() => this.submit('approve')}>${text.approve}</button>
          </div>
        </footer>
      </section>
    `;
  }

  private renderDetails(grant: Ns4AccessGrant, text: typeof labels.en) {
    const profile = this.value!.profiles.find(item => item.profileId === grant.profileRef);
    const authority = this.value!.authorities.find(item => item.authorityRef === grant.authorityRef);
    return html`
      <section class="ns4-details">
        <div class="ns4-details-head"><div><h3>${text.details}</h3><p>${profile?.title} → ${authority?.title}</p></div><code>${grant.authorityRef}</code></div>
        <div class="ns4-detail-grid">
          <article><h4>${text.reason}</h4><p>${grant.reason}</p></article>
          <article><h4>${text.scope}</h4><strong>${grant.dataScope.mode}</strong><p>${grant.dataScope.description}</p></article>
          <article><h4>${text.disclosure}</h4><strong>${grant.disclosure.mode}</strong><p>${grant.disclosure.description}</p></article>
          <article><h4>${text.journeySteps}</h4><p>${authority?.journeyStepRefs.join(', ') || '—'}</p></article>
        </div>
        <div class="ns4-detail-lists">
          <article><h4>${text.allowed}</h4><ul>${grant.disclosure.allowedInformation.map(item => html`<li>${item}</li>`)}</ul></article>
          <article><h4>${text.denied}</h4><ul>${grant.disclosure.deniedInformation.map(item => html`<li>${item}</li>`)}</ul></article>
          <article><h4>${text.constraints}</h4><ul>${grant.constraints.map(item => html`<li>${item}</li>`)}</ul></article>
          <article><h4>${text.informationNeeds}</h4><ul>${authority?.informationNeeds.map(item => html`<li>${item}</li>`)}</ul></article>
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'widget-ns4-access-matrix-102020': WidgetNs4AccessMatrix102020;
  }
}
