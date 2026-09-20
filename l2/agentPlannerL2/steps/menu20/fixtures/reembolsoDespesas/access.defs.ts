/// <mls fileReference="_102047_/l4/reembolsoDespesas/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact } from '/_102035_/l2/solution/types.js';

export const reembolsoDespesasAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "reembolsoDespesas",
  "actors": [
    {
      "actorId": "colaborador",
      "kind": "internal",
      "origin": "named",
      "title": "Colaborador",
      "description": "Registra, envia, corrige e consulta as próprias despesas para reembolso."
    },
    {
      "actorId": "gestorEquipe",
      "kind": "internal",
      "origin": "named",
      "title": "Gestor da equipe",
      "description": "Avalia as despesas da equipe, aprovando-as ou rejeitando-as com um motivo."
    },
    {
      "actorId": "financeiro",
      "kind": "internal",
      "origin": "named",
      "title": "Financeiro",
      "description": "Consulta as despesas aprovadas e registra a data de pagamento."
    }
  ],
  "grants": [
    {
      "grantId": "colaboradorGerenciaPropriasDespesas",
      "actorRef": "colaborador",
      "title": "Gerenciar próprias despesas",
      "description": "Permite ao colaborador registrar, enviar, corrigir, reenviar e consultar exclusivamente as suas solicitações de reembolso, incluindo decisões e pagamentos vinculados.",
      "entityRefs": [
        "Despesa"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Somente despesas vinculadas ao registro de pessoa do colaborador autenticado.",
        "anchorEntity": "Colaborador"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O colaborador pode consultar todos os dados de suas próprias despesas, inclusive motivo de rejeição e data de pagamento."
      }
    },
    {
      "grantId": "gestorGerenciaProprioCadastro",
      "actorRef": "gestorEquipe",
      "title": "Gerenciar próprio cadastro de gestor",
      "description": "Permite ao gestor manter o próprio papel de gestor de equipe no cadastro mestre do módulo.",
      "entityRefs": [
        "GestorEquipe"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Somente o registro mestre da pessoa autenticada no papel de gestor de equipe.",
        "anchorEntity": "GestorEquipe"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O gestor pode consultar integralmente o seu próprio registro de gestor."
      }
    },
    {
      "grantId": "gestorAvaliaDespesasDaEquipe",
      "actorRef": "gestorEquipe",
      "title": "Avaliar despesas da equipe",
      "description": "Permite ao gestor consultar e decidir sobre as despesas dos colaboradores vinculados à sua equipe.",
      "entityRefs": [
        "Despesa"
      ],
      "dataScope": {
        "mode": "related",
        "description": "Somente despesas de colaboradores que possuem vínculo organizacional de equipe com o gestor autenticado.",
        "anchorEntity": "Colaborador"
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O gestor pode consultar todos os dados das despesas de sua equipe necessários para avaliá-las, inclusive situação, descrição e informações de decisão ou pagamento."
      }
    },
    {
      "grantId": "financeiroRegistraPagamentoDeDespesasAprovadas",
      "actorRef": "financeiro",
      "title": "Registrar pagamento de despesas aprovadas",
      "description": "Permite ao financeiro consultar despesas aprovadas disponíveis para pagamento e registrar a respectiva data de pagamento.",
      "entityRefs": [
        "Despesa"
      ],
      "dataScope": {
        "mode": "related",
        "description": "Somente despesas aprovadas de colaboradores relacionados ao profissional financeiro autenticado e disponíveis para registro de pagamento.",
        "anchorEntity": "Colaborador"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "O financeiro visualiza os dados da despesa necessários para identificar e efetuar o pagamento, sem acessar o motivo de rejeição nem a contagem de reenvios.",
        "allowedFields": [
          "Despesa.id",
          "Despesa.version",
          "Despesa.colaboradorId",
          "Despesa.status",
          "Despesa.details.expenseDate",
          "Despesa.details.category",
          "Despesa.details.amount",
          "Despesa.details.description",
          "Despesa.details.paymentDate"
        ]
      }
    }
  ]
} as const satisfies Ns5AccessArtifact;

export type ReembolsoDespesasAccessType = typeof reembolsoDespesasAccess;

export default reembolsoDespesasAccess;
