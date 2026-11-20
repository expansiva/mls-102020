/// <mls fileReference="_102047_/l2/agendaClinica/web/mobile/page11/agenda_diaria.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';
import { AgendaClinicaAgenda_diariaShared } from '/_102047_/l2/agendaClinica/web/shared/agenda_diaria.js';
import '/_102040_/l2/molecules/groupentertext/ml-multiline-text.js';
import '/_102040_/l2/molecules/grouptriggeraction/ml-button-standard.js';
import '/_102040_/l2/molecules/groupviewcard/ml-profile-card.js';
import '/_102040_/l2/molecules/groupviewdata/ml-vertical-record-list.js';
import '/_102020_/l2/molecules/ml-scenary.js';
const pageMessage_pt = {
pageTitle: 'Agenda de hoje',
agendaScene: 'Agenda de hoje',
consultationScene: 'Consulta selecionada',
todayCaption: 'Consultas do profissional autenticado',
time: 'Horário',
patient: 'Paciente',
status: 'Situação',
openConsultation: 'Abrir consulta',
noConsultations: 'Nenhuma consulta prevista para hoje.',
loadingAgenda: 'Carregando sua agenda…',
agendaError: 'Não foi possível carregar a agenda. Tente novamente.',
selectedConsultation: 'Consulta',
scheduledAt: 'Data e horário',
professional: 'Profissional',
attendanceNote: 'Anotação do atendimento',
attendanceNotePlaceholder: 'Descreva o atendimento realizado',
attendanceNoteHelper: 'A anotação é obrigatória para marcar a consulta como atendida.',
registerAttendance: 'Registrar atendimento',
registeringAttendance: 'Registrando atendimento…',
attendanceSuccess: 'Atendimento registrado com sucesso.',
attendanceError: 'Não foi possível registrar o atendimento. Tente novamente.',
consultationError: 'Não foi possível abrir esta consulta. Tente novamente.',
backToAgenda: 'Voltar para a agenda',
loadMore: 'Carregar mais consultas',
loadingMore: 'Carregando mais consultas…',
scheduled: 'Agendada',
confirmed: 'Confirmada',
noShow: 'Falta',
attended: 'Atendida'
};
type PageMessageType = typeof pageMessage_pt;
const pageMessages: Record<string, PageMessageType> = { pt: pageMessage_pt };
type ConsultaStatus = 'scheduled' | 'confirmed' | 'noShow' | 'attended';
const formatDateTime = (value: string) => new Intl.DateTimeFormat(document.documentElement.lang || undefined, {
dateStyle: 'short',
timeStyle: 'short'
}).format(new Date(value));
const statusLabel = (status: ConsultaStatus, msg: PageMessageType) => ({
scheduled: msg.scheduled,
confirmed: msg.confirmed,
noShow: msg.noShow,
attended: msg.attended
}[status]);
@customElement('agenda-clinica--web--mobile--page11--agenda_diaria-102047')
export class AgendaClinicaMobilePage11Agenda_diariaPage extends AgendaClinicaAgenda_diariaShared {
private msg!: PageMessageType;
render() {
this.msg = pageMessages[this.getMessageKey(pageMessages)];
const consultations = this.carregarAgendaDiariaConsultas?.items ?? [];
const selected = this.consultationSummary;
const agendaLoading = this.carregarAgendaDiariaStatus === 'loading' || this.pageStatus === 'loading';
const moreLoading = this.carregarMaisConsultasDoDiaStatus === 'loading';
const registering = this.registrarAtendimentoStatus === 'loading';
const note = this.registerAttendanceDraft.details?.attendanceNote ?? '';
return html`
<main class="min-h-screen bg-[var(--page-bg,transparent)] px-4 py-5 text-[var(--text-default,currentColor)]">
<header class="mb-5">
<h1 class="text-2xl font-semibold text-[var(--text-strong,currentColor)]">${this.msg.pageTitle}</h1>
<p class="mt-1 text-sm text-[var(--text-muted,currentColor)]">${this.msg.todayCaption}</p>
</header>
<molecules--ml-scenary-102020
mode="scenary"
.value=${this.scenary || 'agenda'}
backLabel=${this.msg.backToAgenda}
@change=${(e: CustomEvent<{ value: string }>) => {
if (e.target === e.currentTarget) this.setScenario(e.detail.value);
}}>
<Scene value="agenda" title=${this.msg.agendaScene}>
<section data-organism-id="dayConsultations" aria-label=${this.msg.agendaScene} class="space-y-3">
${this.carregarAgendaDiariaError ? html`<p role="alert" aria-live="polite" class="rounded-lg border border-[var(--border-default,currentColor)] bg-[var(--status-error-bg,transparent)] p-3 text-sm text-[var(--status-error-text,currentColor)]">${this.msg.agendaError}</p>` : nothing}
<groupviewdata--ml-vertical-record-list .loading=${agendaLoading} hoverable="true" @row-click=${(e: CustomEvent<{ index: number }>) => {
const row = consultations[e.detail.index];
if (row) {
this.selectConsultaId(row.id);
this.setScenario('consulta');
}
}}>
<Columns>
<Column field="scheduledAt" header=${this.msg.time}></Column>
<Column field="patient" header=${this.msg.patient}></Column>
<Column field="status" header=${this.msg.status}></Column>
</Columns>
<Rows>
${consultations.map((consulta, index) => html`
<Row ?selected=${consulta.id === this.selectedConsulta}>
<Cell>
<div class="font-semibold text-[var(--text-strong,currentColor)]">${formatDateTime(consulta.scheduledAt)}</div>
<div class="text-xs text-[var(--text-muted,currentColor)]">${this.msg.openConsultation}</div>
</Cell>
<Cell>${consulta.paciente.details.details.identification.name}</Cell>
<Cell><span class="rounded-full bg-[var(--status-neutral-bg,transparent)] px-2 py-1 text-xs text-[var(--status-neutral-text,currentColor)]">${statusLabel(consulta.status, this.msg)}</span></Cell>
</Row>
`)}
</Rows>
<Empty><div class="py-8 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.noConsultations}</div></Empty>
<Loading><div class="py-8 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.loadingAgenda}</div></Loading>
</groupviewdata--ml-vertical-record-list>
${this.carregarMaisConsultasDoDiaStatus === 'error' ? html`<p role="alert" aria-live="polite" class="text-sm text-[var(--status-error-text,currentColor)]">${this.msg.agendaError}</p>` : nothing}
${this.carregarMaisConsultasDoDiaStatus !== 'error' && consultations.length > 0 ? html`
<grouptriggeraction--ml-button-standard
data-variant="secondary" size="md" data-class="w-full"
.loading=${moreLoading} .disabled=${moreLoading}
@action=${() => this.carregarMaisConsultasDoDia()}>
<Label>${moreLoading ? this.msg.loadingMore : this.msg.loadMore}</Label>
</grouptriggeraction--ml-button-standard>
` : nothing}
</section>
</Scene>
<Scene value="consulta" title=${this.msg.consultationScene} nav="back" backTo="agenda">
<div class="space-y-4">
<section data-organism-id="consultationSummary" aria-label=${this.msg.selectedConsultation}>
${this.carregarConsultaSelecionadaStatus === 'loading' ? html`<groupviewcard--ml-profile-card .loading=${true}></groupviewcard--ml-profile-card>` : selected ? html`
<groupviewcard--ml-profile-card data-class="w-full" .selected=${true}>
<CardHeader>
<CardTitle>${selected.paciente.details.details.identification.name}</CardTitle>
<CardDescription>${this.msg.selectedConsultation}</CardDescription>
</CardHeader>
<CardContent>
<dl class="space-y-2 text-sm">
<div class="flex justify-between gap-3"><dt class="text-[var(--text-muted,currentColor)]">${this.msg.scheduledAt}</dt><dd class="text-right font-medium text-[var(--text-strong,currentColor)]">${formatDateTime(selected.scheduledAt)}</dd></div>
<div class="flex justify-between gap-3"><dt class="text-[var(--text-muted,currentColor)]">${this.msg.professional}</dt><dd class="text-right font-medium text-[var(--text-strong,currentColor)]">${selected.profissional.details.details.identification.name}</dd></div>
<div class="flex justify-between gap-3"><dt class="text-[var(--text-muted,currentColor)]">${this.msg.status}</dt><dd class="text-right">${statusLabel(selected.status, this.msg)}</dd></div>
</dl>
</CardContent>
</groupviewcard--ml-profile-card>
` : html`<p role="alert" aria-live="polite" class="rounded-lg border border-[var(--border-default,currentColor)] bg-[var(--status-error-bg,transparent)] p-3 text-sm text-[var(--status-error-text,currentColor)]">${this.msg.consultationError}</p>`}
</section>
<section data-organism-id="attendanceForm" aria-label=${this.msg.attendanceNote}>
<groupentertext--ml-multiline-text
data-class="w-full"
rows="5"
name="attendanceNote"
.value=${note}
.required=${true}
.disabled=${registering || !selected}
placeholder=${this.msg.attendanceNotePlaceholder}
@input=${(e: CustomEvent<{ value: string }>) => this.setRegisterAttendance({
id: this.registerAttendanceDraft.id,
version: this.registerAttendanceDraft.version,
details: { attendanceNote: e.detail.value }
})}>
<Label>${this.msg.attendanceNote}</Label>
<Helper>${this.msg.attendanceNoteHelper}</Helper>
</groupentertext--ml-multiline-text>
</section>
<section data-organism-id="attendanceActions" aria-label=${this.msg.registerAttendance}>
${this.registrarAtendimentoError ? html`<p role="alert" aria-live="polite" class="mb-3 text-sm text-[var(--status-error-text,currentColor)]">${this.msg.attendanceError}</p>` : nothing}
${this.registrarAtendimentoStatus === 'success' ? html`<p aria-live="polite" class="mb-3 rounded-lg bg-[var(--status-success-bg,transparent)] p-3 text-sm text-[var(--status-success-text,currentColor)]">${this.msg.attendanceSuccess}</p>` : nothing}
<grouptriggeraction--ml-button-standard
data-variant="primary" size="lg" data-class="w-full"
.loading=${registering}
.disabled=${registering || !selected || note.trim().length === 0}
@action=${() => this.registrarAtendimento()}>
<Label>${registering ? this.msg.registeringAttendance : this.msg.registerAttendance}</Label>
</grouptriggeraction--ml-button-standard>
</section>
</div>
</Scene>
</molecules--ml-scenary-102020>
</main>
`;
}
}
/// **collab_i18n_start**
/// **collab_i18n_end**
