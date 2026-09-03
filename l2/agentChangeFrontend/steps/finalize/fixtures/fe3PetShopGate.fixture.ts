/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/finalize/fixtures/fe3PetShopGate.fixture.ts" enhancement="_blank"/>

// Recortes VERBATIM do working tree do petShop após o run fe3 (22/08/2026). O gate fechou "done"
// e o `tsc -p tsconfig.frontend.json` do mls-base ainda vê 8 erros. Nada aqui é inventado.

/** Família B — `page21/recordInStoreServiceAttendance.ts` (5× TS2339). O campo inventado NÃO está
 *  numa interpolação: é argumento de setter, num callback tipado como o Output da query. */
export const FE3_PAGE21_CHOOSE_SERVICE_EXECUTION = `
    const rows: QryLocateConfirmedServiceAppointmentOutput[] = this.qryLocateConfirmedServiceAppointmentData ?? [];
    const selectedId = this.cmdRegisterPetArrivalServiceAppointmentServiceAppointmentId ||
      this.cmdRegisterServiceStartServiceAppointmentServiceAppointmentId ||
      this.cmdRegisterServiceCompletionServiceAppointmentServiceAppointmentId ||
      this.cmdRegisterPetPickupServiceAppointmentServiceAppointmentId;
    const selected = rows.find((row: QryLocateConfirmedServiceAppointmentOutput) => row.serviceAppointmentId === selectedId) ?? rows[0];
    const choose = (row: QryLocateConfirmedServiceAppointmentOutput): void => {
      this.setCmdRegisterPetArrivalServiceAppointmentServiceAppointmentId(row.serviceAppointmentId);
      this.setCmdRegisterServiceStartServiceAppointmentServiceAppointmentId(row.serviceAppointmentId);
      this.setCmdRegisterServiceCompletionServiceAppointmentServiceAppointmentId(row.serviceAppointmentId);
      this.setCmdRegisterPetPickupServiceAppointmentServiceAppointmentId(row.serviceAppointmentId);
      this.setCmdRegisterServiceStartServiceExecutionServiceExecutionId(row.serviceExecutionId);
      this.setCmdRegisterServiceCompletionServiceExecutionServiceExecutionId(row.serviceExecutionId);
      this.setCmdRegisterInStorePaymentServiceExecutionServiceExecutionId(row.serviceExecutionId);
      this.setCmdRegisterPetPickupServiceExecutionServiceExecutionId(row.serviceExecutionId);
      this.setCmdHandoffCompletedServiceServiceExecutionServiceExecutionId(row.serviceExecutionId);
    };
`;

/** Família C — `page11/petServiceOverviewView.ts` (TS7023/TS7024). Helper recursivo sem tipo de retorno. */
export const FE3_PAGE11_RECURSIVE_RENDER_RECORD = `
function renderRecord(value: unknown, imageAlt: string) {
if (value === null || value === undefined) return nothing;
if (typeof value !== 'object') return html\`<span>\${String(value)}</span>\`;
const record = value as Record<string, unknown>;
const entries = Object.entries(record);
return html\`<div class="space-y-2">
\${entries.map(([key, entry]: [string, unknown]) => {
const isImage = /(?:imageUrl|photoUrl|logoUrl|avatarUrl|pictureUrl|thumbnailUrl)$/.test(key);
if (isImage && typeof entry === 'string' && entry.length > 0) {
return html\`<img class="h-20 w-20 rounded-md object-cover" src=\${entry} alt=\${imageAlt} loading="lazy">\`;
}
if (isImage) return nothing;
if (entry !== null && typeof entry === 'object') return renderRecord(entry, imageAlt);
return entry === undefined || entry === null || entry === '' ? nothing : html\`<span class="block">\${String(entry)}</span>\`;
})}
\`;
}
`;

/** Família D — `page11/consultPetHistoryAndPendingServices.ts` (TS2353). Chave órfã no catálogo. */
export const FE3_PAGE11_ORPHAN_I18N_KEY = 'intent.consultPetHistoryAndPendingServices.qryInspectPetHistoryAndPendingServices.list.column.serviceImages.label';

export const FE3_PAGE21_CONTRACT = `
export interface QryLocateConfirmedServiceAppointmentOutput {
  serviceAppointmentId: string;
  petId: string;
  status: string;
}
`;
