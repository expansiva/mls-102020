/// <mls fileReference="_102047_/l4/controleEstoque/journeys/index.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyIndexArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const controleEstoqueJourneyIndex = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "moduleName": "controleEstoque",
  "journeys": [
    {
      "journeyId": "cadastrarProduto",
      "actorRef": "estoquista",
      "title": "Cadastrar produto"
    },
    {
      "journeyId": "registrarMovimentacao",
      "actorRef": "estoquista",
      "title": "Registrar movimentação"
    },
    {
      "journeyId": "consultarSaldo",
      "actorRef": "estoquista",
      "title": "Consultar saldo"
    },
    {
      "journeyId": "conferirAvisoMinimo",
      "actorRef": "estoquista",
      "title": "Conferir aviso de mínimo"
    }
  ],
  "systemDecisions": []
} as const satisfies Ns5Readonly<Ns5JourneyIndexArtifact>;

export type ControleEstoqueJourneyIndexType = typeof controleEstoqueJourneyIndex;

export default controleEstoqueJourneyIndex;
