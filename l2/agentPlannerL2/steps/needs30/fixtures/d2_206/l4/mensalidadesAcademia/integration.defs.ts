/// <mls fileReference="_102047_/l4/mensalidadesAcademia/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaIntegration = {
  "schemaVersion": "2026-09-12-ns5-integration-v2",
  "moduleName": "mensalidadesAcademia",
  "inbound": [],
  "outbound": [
    {
      "id": "matriculaRealizada",
      "kind": "event",
      "to": "any",
      "event": "matriculaRealizada",
      "on": "Matricula.create",
      "description": "Publica a matrícula registrada pela recepção, com o aluno, o plano escolhido e a data de início, para módulos interessados (por exemplo, o financeiro).",
      "entityRefs": [
        "Matricula",
        "Aluno",
        "Plano"
      ]
    },
    {
      "id": "matriculaCancelada",
      "kind": "event",
      "to": "any",
      "event": "matriculaCancelada",
      "on": "Matricula.cancelar",
      "description": "Publica o cancelamento da matrícula, que encerra a geração das próximas mensalidades, para que outros módulos parem de cobrar o aluno.",
      "entityRefs": [
        "Matricula",
        "Aluno"
      ]
    },
    {
      "id": "mensalidadeGerada",
      "kind": "event",
      "to": "any",
      "event": "mensalidadeGerada",
      "on": "Mensalidade.create",
      "description": "Publica cada mensalidade gerada no mês, com valor do plano e data de vencimento, para módulos que controlam valores a receber.",
      "entityRefs": [
        "Mensalidade",
        "Matricula",
        "Aluno"
      ]
    },
    {
      "id": "mensalidadeQuitada",
      "kind": "event",
      "to": "any",
      "event": "mensalidadeQuitada",
      "on": "Mensalidade.quitar",
      "description": "Publica a quitação da mensalidade após o pagamento registrado pela recepção (data, valor e forma), para módulos que acompanham o que foi recebido.",
      "entityRefs": [
        "Mensalidade",
        "Pagamento",
        "Aluno"
      ]
    }
  ],
  "plugins": []
} as const satisfies Ns5Readonly<Ns5IntegrationArtifact>;

export type MensalidadesAcademiaIntegrationType = typeof mensalidadesAcademiaIntegration;

export default mensalidadesAcademiaIntegration;
