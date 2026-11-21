/// <mls fileReference="_102047_/l4/financeiro/journeys/index.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyIndexArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const financeiroJourneyIndex = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "moduleName": "financeiro",
  "journeys": [
    {
      "journeyId": "receberTitulo",
      "actorRef": "caixa",
      "title": "Receber título no caixa"
    },
    {
      "journeyId": "estornarRecebimento",
      "actorRef": "caixa",
      "title": "Estornar recebimento do dia"
    },
    {
      "journeyId": "acompanharRecebiveis",
      "actorRef": "gerenteFinanceiro",
      "title": "Acompanhar recebíveis e vencidos"
    },
    {
      "journeyId": "emitirExtratoPagador",
      "actorRef": "gerenteFinanceiro",
      "title": "Emitir extrato por pagador"
    },
    {
      "journeyId": "consultarMeusTitulos",
      "actorRef": "pagador",
      "title": "Consultar meus títulos"
    },
    {
      "journeyId": "pagarTituloCartao",
      "actorRef": "pagador",
      "title": "Pagar título com cartão"
    }
  ],
  "systemDecisions": []
} as const satisfies Ns5Readonly<Ns5JourneyIndexArtifact>;

export type FinanceiroJourneyIndexType = typeof financeiroJourneyIndex;

export default financeiroJourneyIndex;
