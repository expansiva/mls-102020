/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/materialize/fixtures/fe2PetShopCatalogue.fixture.ts" enhancement="_blank"/>

// Recortes VERBATIM do run fe2 do petShop (22/08/2026 01:59Z) — a task falhou no gate
// MODULE-COMPILE-FAILED com 15 erros em 5 arquivos. Cada constante abaixo é o pedaço que produziu uma
// das famílias, copiado do arquivo gerado; nada aqui é inventado.

/** Família A — `l2/petShop/web/desktop/page21/businessHoursCatalogue.ts` (6× TS2322 com o irmão page31).
 *  O módulo declara UM idioma (`languages: ["pt-BR"]`) e o modelo escreveu três, cada um `as const`,
 *  com o tipo pinado no valor de um deles. */
export const FE2_PAGE21_HANDWRITTEN_CATALOGUE = `
const collab_i18n_en = {
  'section.businessHoursCatalogue.title': 'Business hours',
} as const;
const collab_i18n_pt = {
  'section.businessHoursCatalogue.title': 'Horários de atendimento',
} as const;
const collab_i18n_es = {
  'section.businessHoursCatalogue.title': 'Horarios de atención',
} as const;
type CollabI18n = typeof collab_i18n_pt;
const collab_i18n: Record<string, CollabI18n> = { en: collab_i18n_en, pt: collab_i18n_pt, es: collab_i18n_es };
`;

/** O MESMO arquivo como o esqueleto o emite: um idioma, default inferido, sem `as const`. */
export const FE2_SKELETON_CATALOGUE = `
/// **collab_i18n_start**
const pageMessage_pt_br = {
  'section.businessHoursCatalogue.title': 'Horários de atendimento',
};
type PageMessageType = typeof pageMessage_pt_br;
const pageMessages: { [key: string]: PageMessageType } = { 'pt-br': pageMessage_pt_br };
/// **collab_i18n_end**
`;

/** Família D — `page11/consultPetHistoryAndPendingServices.ts` (1× TS2353). Os dois consts são o MESMO
 *  idioma (o fantasma da T5: `defaultLocale: 'pt'` colapsado + `runtimeLocales: ['pt-br']`), e a segunda
 *  cópia ganhou uma chave que a primeira — a que define o tipo — não tem. */
export const FE2_PHANTOM_LOCALE_CATALOGUE = `
const pageMessage_pt = {
  'intent.consultPetHistoryAndPendingServices.qryInspectPetServiceOverview.list.column.serviceImages.label': 'Service Images',
};
type PageMessageType = typeof pageMessage_pt;
const pageMessage_pt_br: PageMessageType = {
  'intent.consultPetHistoryAndPendingServices.qryInspectPetServiceOverview.list.column.serviceImages.label': 'Service Images',
  'intent.consultPetHistoryAndPendingServices.qryInspectPetHistoryAndPendingServices.list.column.serviceImages.label': 'Service Images',
};
const pageMessages: { [key: string]: PageMessageType } = { 'pt': pageMessage_pt, 'pt-br': pageMessage_pt_br };
`;

/** O i18nMeta REAL que gerou o fantasma (`web/shared/consultInstitutionalHome.defs.ts`). */
export const FE2_I18N_META = { defaultLocale: 'pt', activeLocales: ['pt'], runtimeLocales: ['pt-br'] } as const;

/** Família B — o outputShape REAL da query (`l4/petShop/operations/locateConfirmedServiceAppointment.defs.ts`)
 *  ao lado dos campos que a página leu de `selected.` sem que existissem nela (7× TS2339). */
export const FE2_QUERY_OUTPUT_FIELDS = ['serviceAppointmentId', 'petId', 'serviceId', 'scheduledAt', 'situation'] as const;
export const FE2_COMMAND_ONLY_FIELDS = ['serviceStartedAt', 'completedAt', 'pickedUpAt', 'inStorePaymentId'] as const;
