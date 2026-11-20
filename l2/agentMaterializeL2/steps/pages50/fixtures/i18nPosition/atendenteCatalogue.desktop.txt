/// <mls fileReference="_102039_/l2/controleChamados/web/desktop/page11/atendenteCatalogue.ts" enhancement="_102020_/l2/enhancementAura"/>

import { html, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';
import { ControleChamadosAtendenteCatalogueBase } from '/_102039_/l2/controleChamados/web/shared/atendenteCatalogue.js';
import '/_102020_/l2/molecules/ml-scenary.js';
import type {
QryListAtendenteOutput,
QryGetAtendenteOutput,
} from '/_102039_/l2/controleChamados/web/shared/atendenteCatalogue.js';
/// **collab_i18n_start**
// The catalogue of this page. The keys below come from the module plan — do NOT edit their
// text and do NOT inline a string in the template: reference a key, or add your own SHORT
// key here (in EVERY locale) — 'orders.empty': 'No orders yet',
const pageMessage_pt_br = {
'section.recordList.title': 'Atendentes',
'organism.qryListAtendente.title': 'Listar Atendente',
'intent.qryListAtendente.list.title': 'Listar Atendente',
'intent.qryListAtendente.list.empty': 'Nenhum registro encontrado',
'intent.qryListAtendente.list.column.atendenteId.label': 'Identificador do atendente',
'intent.qryListAtendente.list.column.platformUserId.label': 'Usuário da plataforma',
'organism.qryGetAtendente.title': 'Obter Atendente',
'intent.qryGetAtendente.list.title': 'Obter Atendente',
'intent.qryGetAtendente.list.empty': 'Nenhum registro encontrado',
'intent.qryGetAtendente.list.column.atendenteId.label': 'Identificador do atendente',
'intent.qryGetAtendente.list.column.platformUserId.label': 'Usuário da plataforma',
'organism.cmdInactivateAtendente.title': 'Desativar Atendente',
'intent.cmdInactivateAtendente.form.title': 'Desativar Atendente',
'intent.cmdInactivateAtendente.form.action.cmdInactivateAtendente': 'Desativar Atendente',
'organism.cmdReactivateAtendente.title': 'Reativar Atendente',
'intent.cmdReactivateAtendente.form.title': 'Reativar Atendente',
'intent.cmdReactivateAtendente.form.action.cmdReactivateAtendente': 'Reativar Atendente',
'section.recordForm.title': 'Cadastro e correção',
'organism.cmdCreateAtendente.title': 'Criar Atendente',
'intent.cmdCreateAtendente.form.title': 'Criar Atendente',
'intent.cmdCreateAtendente.form.action.cmdCreateAtendente': 'Criar Atendente',
'intent.cmdCreateAtendente.form.field.platformUserId.label': 'Usuário da plataforma',
'organism.cmdUpdateAtendente.title': 'Atualizar Atendente',
'intent.cmdUpdateAtendente.form.title': 'Atualizar Atendente',
'intent.cmdUpdateAtendente.form.action.cmdUpdateAtendente': 'Atualizar Atendente',
'intent.cmdUpdateAtendente.form.field.platformUserId.label': 'Usuário da plataforma',
'action.cmdCreateAtendente.success': 'Criar Atendente: OK',
'action.cmdCreateAtendente.error': 'Criar Atendente: falhou',
'action.cmdUpdateAtendente.success': 'Atualizar Atendente: OK',
'action.cmdUpdateAtendente.error': 'Atualizar Atendente: falhou',
'action.cmdInactivateAtendente.success': 'Desativar Atendente: OK',
'action.cmdInactivateAtendente.error': 'Desativar Atendente: falhou',
'action.cmdReactivateAtendente.success': 'Reativar Atendente: OK',
'action.cmdReactivateAtendente.error': 'Reativar Atendente: falhou',
'scenary.base': 'Listar Atendente',
'scenary.detail': 'Obter Atendente',
'scenary.createAtendente': 'Criar Atendente',
'scenary.updateAtendente': 'Atualizar Atendente',
'scenary.inactivateAtendente': 'Desativar Atendente',
'scenary.reactivateAtendente': 'Reativar Atendente',
'scenary.back': 'Voltar',
// The copy you invent, with short keys. Only this part repeats per language.
'page.title': 'Cadastro de atendente',
'action.new': 'Novo atendente',
'action.refresh': 'Atualizar lista',
'action.view': 'Ver detalhes',
'action.edit': 'Editar',
'action.inactivate': 'Desativar',
'action.reactivate': 'Reativar',
'field.atendenteId': 'Identificador',
'field.platformUserId': 'Usuário da plataforma',
'form.cancel': 'Cancelar',
'form.submit': 'Salvar',
'form.loading': 'Salvando…',
'form.selectRecord': 'Selecione um atendente',
'form.requiredSelection': 'Selecione um atendente antes de continuar.',
'detail.empty': 'Selecione um atendente para consultar.',
'detail.loading': 'Carregando dados do atendente…',
'detail.notFound': 'Os dados do atendente não estão disponíveis.',
'list.loading': 'Carregando atendentes…',
'list.error': 'Não foi possível carregar os atendentes.',
'list.selectHint': 'Selecione uma linha para ver os detalhes e ações.',
'feedback.dismiss': 'Fechar mensagem',
};
type PageMessageType = typeof pageMessage_pt_br;
const pageMessages: { [key: string]: PageMessageType } = { 'pt-br': pageMessage_pt_br };
/// **collab_i18n_end**
const pageFallback = pageMessages[Object.keys(pageMessages)[0]];
@customElement('controle-chamados--web--desktop--page11--atendente-catalogue-102039')
export class ControleChamadosDesktopPage11AtendenteCataloguePage extends ControleChamadosAtendenteCatalogueBase {
#msgLang: string | null = null;
#msgCache: PageMessageType = pageFallback;
/** i18n catalog — resolved once per language, refreshed only when the document language changes. */
protected get msg(): PageMessageType {
const lang = (document.documentElement.lang || '').toLowerCase();
if (lang !== this.#msgLang) {
this.#msgLang = lang;
this.#msgCache = pageMessages[this.getMessageKey(pageMessages)] || pageFallback;
}
return this.#msgCache;
}
/** Main render. The scenary host and Scene list are fixed — fill renderScenary<X>(), not this. */
render() {
const msg = this.msg;
return html`
<molecules--ml-scenary-102020 mode="scenary" .value=${this.uiScenary}
@change=${this.handleUiScenaryChange} backLabel=${msg['scenary.back']}>
<Scene value="base" title=${msg['scenary.base']}>
${this.renderScenaryBase()}
</Scene>
<Scene value="detail" title=${msg['scenary.detail']} nav="back">
${this.renderScenaryDetail()}
</Scene>
<Scene value="createAtendente" title=${msg['scenary.createAtendente']}>
${this.renderScenaryCreateAtendente()}
</Scene>
<Scene value="updateAtendente" title=${msg['scenary.updateAtendente']}>
${this.renderScenaryUpdateAtendente()}
</Scene>
<Scene value="inactivateAtendente" title=${msg['scenary.inactivateAtendente']}>
${this.renderScenaryInactivateAtendente()}
</Scene>
<Scene value="reactivateAtendente" title=${msg['scenary.reactivateAtendente']}>
${this.renderScenaryReactivateAtendente()}
</Scene>
</molecules--ml-scenary-102020>
`;
}
renderScenaryBase() {
const msg = this.msg;
const rows: QryListAtendenteOutput[] = this.qryListAtendenteData;
const selectedId = this.qryGetAtendenteAtendenteId;
const success = this.cmdCreateAtendenteState === 'success' ? msg['action.cmdCreateAtendente.success']
: this.cmdUpdateAtendenteState === 'success' ? msg['action.cmdUpdateAtendente.success']
: this.cmdInactivateAtendenteState === 'success' ? msg['action.cmdInactivateAtendente.success']
: this.cmdReactivateAtendenteState === 'success' ? msg['action.cmdReactivateAtendente.success'] : '';
return html`
<div class="min-h-full bg-[var(--page-bg,#f8fafc)]">
<div class="max-w-6xl mx-auto px-4 py-6 space-y-6">
<header class="flex flex-wrap items-center justify-between gap-4">
<h1 class="text-2xl font-bold text-[var(--text-strong,#0f172a)]">${msg['page.title']}</h1>
<div class="flex gap-2">
<button class="rounded-md bg-[var(--button-primary-bg,#2563eb)] px-4 py-2 text-[var(--button-primary-text,#ffffff)]" @click=${() => this.setUiScenary('createAtendente')}>${msg['action.new']}</button>
<button class="rounded-md border border-[var(--button-secondary-border,#cbd5e1)] bg-[var(--button-secondary-bg,#ffffff)] px-4 py-2 text-[var(--button-secondary-text,#0f172a)]" @click=${this.handleQryListAtendenteClick}>${msg['action.refresh']}</button>
</div>
</header>
${success ? html`<div class="rounded-md bg-[var(--status-success-bg,#dcfce7)] p-3 text-[var(--status-success-text,#166534)]" role="status">${success}</div>` : nothing}
<section class="rounded-lg bg-[var(--surface-bg,#ffffff)] p-5 shadow-sm">
<h2 class="mb-4 text-lg font-semibold text-[var(--text-strong,#0f172a)]">${msg['section.recordList.title']}</h2>
${this.qryListAtendenteState === 'loading' ? html`<p class="text-[var(--text-muted,#64748b)]">${msg['list.loading']}</p>` : nothing}
${this.qryListAtendenteState === 'error' ? html`<p class="text-[var(--status-error-text,#b91c1c)]" role="alert">${msg['list.error']}</p>` : nothing}
${this.qryListAtendenteState !== 'loading' && rows.length === 0 ? html`<p class="text-[var(--text-muted,#64748b)]">${msg['intent.qryListAtendente.list.empty']}</p>` : nothing}
${rows.length > 0 ? html`<p class="mb-3 text-sm text-[var(--text-muted,#64748b)]">${msg['list.selectHint']}</p><div class="overflow-x-auto"><table class="w-full text-left"><thead><tr class="border-b border-[var(--border-subtle,#e2e8f0)]"><th class="px-3 py-2">${msg['intent.qryListAtendente.list.column.atendenteId.label']}</th><th class="px-3 py-2">${msg['intent.qryListAtendente.list.column.platformUserId.label']}</th><th class="px-3 py-2">${msg['action.view']}</th></tr></thead><tbody>${rows.map((item: QryListAtendenteOutput) => html`<tr class=${item.atendenteId === selectedId ? 'bg-[var(--selected-bg,#eff6ff)]' : ''} @click=${() => { this.setQryGetAtendenteAtendenteId(String(item.atendenteId)); this.setCmdUpdateAtendenteAtendenteId(String(item.atendenteId)); this.setCmdInactivateAtendenteAtendenteId(String(item.atendenteId)); this.setCmdReactivateAtendenteAtendenteId(String(item.atendenteId)); void this.loadQryGetAtendente(); }}><td class="px-3 py-2">${item.atendenteId}</td><td class="px-3 py-2">${item.platformUserId}</td><td class="px-3 py-2"><button class="text-[var(--link-text,#2563eb)]" @click=${(event: Event) => { event.stopPropagation(); this.setQryGetAtendenteAtendenteId(String(item.atendenteId)); void this.loadQryGetAtendente(); }}>${msg['action.view']}</button></td></tr>`)}</tbody></table></div>` : nothing}
</section>
</div></div>`;
}
renderScenaryDetail() {
const msg = this.msg;
const detail: QryGetAtendenteOutput | null = this.qryGetAtendenteData;
const id = this.qryGetAtendenteAtendenteId;
return html`<div class="min-h-full bg-[var(--page-bg,#f8fafc)]"><div class="max-w-6xl mx-auto px-4 py-6"><section class="rounded-lg bg-[var(--surface-bg,#ffffff)] p-5 shadow-sm">${this.qryGetAtendenteState === 'loading' ? html`<p>${msg['detail.loading']}</p>` : detail ? html`<dl class="grid gap-4 sm:grid-cols-2"><div><dt class="text-sm text-[var(--text-muted,#64748b)]">${msg['field.atendenteId']}</dt><dd class="text-[var(--text-default,#0f172a)]">${detail.atendenteId}</dd></div><div><dt class="text-sm text-[var(--text-muted,#64748b)]">${msg['field.platformUserId']}</dt><dd class="text-[var(--text-default,#0f172a)]">${detail.platformUserId}</dd></div></dl><div class="mt-5 flex flex-wrap gap-2"><button class="rounded-md bg-[var(--button-primary-bg,#2563eb)] px-4 py-2 text-[var(--button-primary-text,#ffffff)]" @click=${() => this.setUiScenary('updateAtendente')}>${msg['action.edit']}</button><button class="rounded-md bg-[var(--button-danger-bg,#dc2626)] px-4 py-2 text-[var(--button-danger-text,#ffffff)]" ?disabled=${!id} title=${!id ? msg['form.requiredSelection'] : ''} @click=${() => this.setUiScenary('inactivateAtendente')}>${msg['action.inactivate']}</button><button class="rounded-md bg-[var(--button-secondary-bg,#ffffff)] px-4 py-2 text-[var(--button-secondary-text,#0f172a)]" ?disabled=${!id} title=${!id ? msg['form.requiredSelection'] : ''} @click=${() => this.setUiScenary('reactivateAtendente')}>${msg['action.reactivate']}</button></div>` : html`<p class="text-[var(--text-muted,#64748b)]">${msg['detail.empty']}</p>`}</section></div></div>`;
}
renderScenaryCreateAtendente() {
const msg = this.msg;
const busy = this.cmdCreateAtendenteState === 'loading';
return html`<div class="min-h-full bg-[var(--page-bg,#f8fafc)]"><div class="max-w-6xl mx-auto px-4 py-6"><section class="rounded-lg bg-[var(--surface-bg,#ffffff)] p-5 shadow-sm"><h2 class="mb-4 text-lg font-semibold">${msg['section.recordForm.title']}</h2>${this.cmdCreateAtendenteState === 'success' ? html`<p class="mb-4 rounded-md bg-[var(--status-success-bg,#dcfce7)] p-3 text-[var(--status-success-text,#166534)]" role="status">${msg['action.cmdCreateAtendente.success']}</p>` : nothing}${this.cmdCreateAtendenteState === 'error' ? html`<p class="mb-4 text-[var(--status-error-text,#b91c1c)]" role="alert">${this.cmdCreateAtendenteError || msg['action.cmdCreateAtendente.error']}</p>` : nothing}<label class="block"><span class="mb-1 block text-sm text-[var(--text-muted,#64748b)]">${msg['intent.cmdCreateAtendente.form.field.platformUserId.label']}</span><input class="w-full rounded-md border border-[var(--border-default,#cbd5e1)] bg-[var(--input-bg,#ffffff)] p-2" .value=${this.cmdCreateAtendentePlatformUserId} @input=${this.handleCmdCreateAtendentePlatformUserIdChange}></label><div class="mt-5 flex gap-2"><button class="rounded-md bg-[var(--button-primary-bg,#2563eb)] px-4 py-2 text-[var(--button-primary-text,#ffffff)]" ?disabled=${busy} @click=${this.handleCmdCreateAtendenteClick}>${busy ? msg['form.loading'] : msg['intent.cmdCreateAtendente.form.action.cmdCreateAtendente']}</button><button class="rounded-md border border-[var(--button-secondary-border,#cbd5e1)] px-4 py-2" @click=${() => this.setUiScenary('base')}>${msg['form.cancel']}</button></div></section></div></div>`;
}
renderScenaryUpdateAtendente() {
const msg = this.msg;
const busy = this.cmdUpdateAtendenteState === 'loading';
return html`<div class="min-h-full bg-[var(--page-bg,#f8fafc)]"><div class="max-w-6xl mx-auto px-4 py-6"><section class="rounded-lg bg-[var(--surface-bg,#ffffff)] p-5 shadow-sm"><h2 class="mb-4 text-lg font-semibold">${msg['organism.cmdUpdateAtendente.title']}</h2>${this.cmdUpdateAtendenteState === 'success' ? html`<p class="mb-4 rounded-md bg-[var(--status-success-bg,#dcfce7)] p-3 text-[var(--status-success-text,#166534)]" role="status">${msg['action.cmdUpdateAtendente.success']}</p>` : nothing}${this.cmdUpdateAtendenteState === 'error' ? html`<p class="mb-4 text-[var(--status-error-text,#b91c1c)]" role="alert">${this.cmdUpdateAtendenteError || msg['action.cmdUpdateAtendente.error']}</p>` : nothing}<p class="mb-4 text-sm text-[var(--text-muted,#64748b)]">${this.cmdUpdateAtendenteAtendenteId || msg['form.requiredSelection']}</p><label class="block"><span class="mb-1 block text-sm text-[var(--text-muted,#64748b)]">${msg['intent.cmdUpdateAtendente.form.field.platformUserId.label']}</span><input class="w-full rounded-md border border-[var(--border-default,#cbd5e1)] bg-[var(--input-bg,#ffffff)] p-2" .value=${this.cmdUpdateAtendentePlatformUserId} @input=${this.handleCmdUpdateAtendentePlatformUserIdChange}></label><div class="mt-5 flex gap-2"><button class="rounded-md bg-[var(--button-primary-bg,#2563eb)] px-4 py-2 text-[var(--button-primary-text,#ffffff)]" ?disabled=${busy || !this.cmdUpdateAtendenteAtendenteId} title=${!this.cmdUpdateAtendenteAtendenteId ? msg['form.requiredSelection'] : ''} @click=${this.handleCmdUpdateAtendenteClick}>${busy ? msg['form.loading'] : msg['intent.cmdUpdateAtendente.form.action.cmdUpdateAtendente']}</button><button class="rounded-md border border-[var(--button-secondary-border,#cbd5e1)] px-4 py-2" @click=${() => this.setUiScenary('base')}>${msg['form.cancel']}</button></div></section></div></div>`;
}
renderScenaryInactivateAtendente() {
const msg = this.msg;
const busy = this.cmdInactivateAtendenteState === 'loading';
return html`<div class="min-h-full bg-[var(--page-bg,#f8fafc)]"><div class="max-w-6xl mx-auto px-4 py-6"><section class="rounded-lg bg-[var(--surface-bg,#ffffff)] p-5 shadow-sm"><h2 class="mb-4 text-lg font-semibold">${msg['intent.cmdInactivateAtendente.form.title']}</h2>${this.cmdInactivateAtendenteState === 'success' ? html`<p class="mb-4 rounded-md bg-[var(--status-success-bg,#dcfce7)] p-3 text-[var(--status-success-text,#166534)]" role="status">${msg['action.cmdInactivateAtendente.success']}</p>` : nothing}${this.cmdInactivateAtendenteState === 'error' ? html`<p class="mb-4 text-[var(--status-error-text,#b91c1c)]" role="alert">${this.cmdInactivateAtendenteError || msg['action.cmdInactivateAtendente.error']}</p>` : nothing}<p class="mb-5 text-[var(--text-default,#0f172a)]">${this.cmdInactivateAtendenteAtendenteId || msg['form.requiredSelection']}</p><div class="flex gap-2"><button class="rounded-md bg-[var(--button-danger-bg,#dc2626)] px-4 py-2 text-[var(--button-danger-text,#ffffff)]" ?disabled=${busy || !this.cmdInactivateAtendenteAtendenteId} title=${!this.cmdInactivateAtendenteAtendenteId ? msg['form.requiredSelection'] : ''} @click=${this.handleCmdInactivateAtendenteClick}>${busy ? msg['form.loading'] : msg['intent.cmdInactivateAtendente.form.action.cmdInactivateAtendente']}</button><button class="rounded-md border border-[var(--button-secondary-border,#cbd5e1)] px-4 py-2" @click=${() => this.setUiScenary('base')}>${msg['form.cancel']}</button></div></section></div></div>`;
}
renderScenaryReactivateAtendente() {
const msg = this.msg;
const busy = this.cmdReactivateAtendenteState === 'loading';
return html`<div class="min-h-full bg-[var(--page-bg,#f8fafc)]"><div class="max-w-6xl mx-auto px-4 py-6"><section class="rounded-lg bg-[var(--surface-bg,#ffffff)] p-5 shadow-sm"><h2 class="mb-4 text-lg font-semibold">${msg['intent.cmdReactivateAtendente.form.title']}</h2>${this.cmdReactivateAtendenteState === 'success' ? html`<p class="mb-4 rounded-md bg-[var(--status-success-bg,#dcfce7)] p-3 text-[var(--status-success-text,#166534)]" role="status">${msg['action.cmdReactivateAtendente.success']}</p>` : nothing}${this.cmdReactivateAtendenteState === 'error' ? html`<p class="mb-4 text-[var(--status-error-text,#b91c1c)]" role="alert">${this.cmdReactivateAtendenteError || msg['action.cmdReactivateAtendente.error']}</p>` : nothing}<p class="mb-5 text-[var(--text-default,#0f172a)]">${this.cmdReactivateAtendenteAtendenteId || msg['form.requiredSelection']}</p><div class="flex gap-2"><button class="rounded-md bg-[var(--button-primary-bg,#2563eb)] px-4 py-2 text-[var(--button-primary-text,#ffffff)]" ?disabled=${busy || !this.cmdReactivateAtendenteAtendenteId} title=${!this.cmdReactivateAtendenteAtendenteId ? msg['form.requiredSelection'] : ''} @click=${this.handleCmdReactivateAtendenteClick}>${busy ? msg['form.loading'] : msg['intent.cmdReactivateAtendente.form.action.cmdReactivateAtendente']}</button><button class="rounded-md border border-[var(--button-secondary-border,#cbd5e1)] px-4 py-2" @click=${() => this.setUiScenary('base')}>${msg['form.cancel']}</button></div></section></div></div>`;
}
}
