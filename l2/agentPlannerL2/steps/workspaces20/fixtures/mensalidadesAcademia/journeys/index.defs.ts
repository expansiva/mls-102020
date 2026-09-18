/// <mls fileReference="_102047_/l4/mensalidadesAcademia/journeys/index.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyIndexArtifact } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaJourneyIndex = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "moduleName": "mensalidadesAcademia",
  "journeys": [
    {
      "journeyId": "matricularAluno",
      "actorRef": "recepcao",
      "title": "Matricular aluno em um plano"
    },
    {
      "journeyId": "gerarMensalidadesDoMes",
      "actorRef": "gerencia",
      "title": "Gerar mensalidades do mês"
    },
    {
      "journeyId": "registrarPagamentoMensalidade",
      "actorRef": "recepcao",
      "title": "Registrar pagamento de mensalidade"
    },
    {
      "journeyId": "acompanharIndicadoresAcademia",
      "actorRef": "gerencia",
      "title": "Acompanhar indicadores da academia"
    },
    {
      "journeyId": "cancelarPropriaMatricula",
      "actorRef": "aluno",
      "title": "Cancelar própria matrícula"
    }
  ],
  "systemDecisions": []
} as const satisfies Ns5JourneyIndexArtifact;

export type MensalidadesAcademiaJourneyIndexType = typeof mensalidadesAcademiaJourneyIndex;

export default mensalidadesAcademiaJourneyIndex;
