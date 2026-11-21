/// <mls fileReference="_102047_/l4/mensalidadesAcademia/journeys/index.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyIndexArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaJourneyIndex = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "moduleName": "mensalidadesAcademia",
  "journeys": [
    {
      "journeyId": "cadastrarPlano",
      "actorRef": "gerencia",
      "title": "Cadastrar plano"
    },
    {
      "journeyId": "matricularAluno",
      "actorRef": "recepcao",
      "title": "Matricular aluno em plano"
    },
    {
      "journeyId": "gerarMensalidadesMes",
      "actorRef": "gerencia",
      "title": "Gerar mensalidades do mês"
    },
    {
      "journeyId": "registrarPagamento",
      "actorRef": "recepcao",
      "title": "Registrar pagamento de mensalidade"
    },
    {
      "journeyId": "verificarAcessoAluno",
      "actorRef": "recepcao",
      "title": "Verificar liberação de entrada"
    },
    {
      "journeyId": "acompanharPainel",
      "actorRef": "gerencia",
      "title": "Acompanhar painel financeiro"
    },
    {
      "journeyId": "cancelarMatricula",
      "actorRef": "recepcao",
      "title": "Cancelar matrícula"
    }
  ],
  "systemDecisions": []
} as const satisfies Ns5Readonly<Ns5JourneyIndexArtifact>;

export type MensalidadesAcademiaJourneyIndexType = typeof mensalidadesAcademiaJourneyIndex;

export default mensalidadesAcademiaJourneyIndex;
