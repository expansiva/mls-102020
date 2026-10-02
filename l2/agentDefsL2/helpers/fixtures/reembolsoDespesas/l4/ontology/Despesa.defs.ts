/// <mls fileReference="_102047_/l4/reembolsoDespesas/ontology/Despesa.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const reembolsoDespesasEntityDespesa = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "reembolsoDespesas",
  "entityId": "Despesa",
  "title": "Despesa",
  "description": "Solicitação de reembolso de uma despesa registrada por um colaborador, submetida à aprovação e posteriormente ao pagamento.",
  "displayField": "id",
  "relationships": {
    "colaborador": {
      "relationshipId": "despesaDoColaborador",
      "to": "Colaborador",
      "via": "Despesa.colaboradorId",
      "cardinality": "N:1",
      "title": "Colaborador da despesa",
      "description": "Colaborador que registrou a despesa e ao qual ela pertence.",
      "mode": "fk",
      "required": "sempre",
      "role": "registrante"
    }
  },
  "capabilities": {
    "read.byId": "Consulta uma despesa pelo identificador da solicitação · busca a linha pelo id no repositório · colaborador, gestor da equipe e financeiro em suas telas autorizadas.",
    "locate.byColumn": "Lista despesas por colaborador e situação, com ordenação e paginação · filtra as colunas indexadas colaboradorId e status · colaborador nas próprias despesas, gestor nas despesas da equipe e financeiro nas aprovadas.",
    "count": "Conta as despesas que atendem aos filtros de colaborador e situação · executa a mesma consulta filtrada sem paginação · colaborador, gestor da equipe e financeiro nos totais das listas.",
    "listByForeignKey": "Lista as despesas vinculadas a um ou mais colaboradores · consulta pela chave estrangeira colaboradorId · telas de acompanhamento de despesas do colaborador e da equipe.",
    "create": "Registra uma nova despesa própria já pendente de aprovação · insere a solicitação com seus dados e o vínculo ao colaborador da sessão · colaborador.",
    "update": "Corrige os dados de uma despesa rejeitada antes do reenvio · atualiza parcialmente a linha pelo id · colaborador titular da despesa.",
    "transition": "Move a despesa entre pendente de aprovação, rejeitada, aprovada e paga · atualiza a coluna indexada de situação sob as regras da solicitação · colaborador, gestor da equipe e financeiro conforme cada transição.",
    "read.mdmRecord": "Lê o registro mestre do colaborador vinculado à despesa · hidrata o registro indicado por colaboradorId · telas que precisam identificar o colaborador titular.",
    "attach.document": "Anexa o comprovante da despesa à solicitação · armazena o arquivo por categoria ancorado na linha da despesa · colaborador ao registrar ou corrigir a despesa e gestor ao consultá-la."
  },
  "rules": [
    "despesaPropria",
    "despesaDaEquipe",
    "comprovanteObrigatorio",
    "motivoRejeicaoObrigatorio",
    "unicoReenvioPermitido",
    "pagamentoApenasAprovada",
    "dataPagamentoObrigatoria"
  ],
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "reembolsoDespesas_despesa",
    "kind": "relational"
  },
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "derived": true,
        "indexed": true,
        "title": "Id"
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true
      },
      "colaboradorId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "to": [
          "Colaborador"
        ],
        "title": "Colaborador",
        "description": "Colaborador ao qual a solicitação de reembolso pertence.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "values": [
          {
            "value": "pendingApproval",
            "title": "Pendente de aprovação",
            "description": "Aguardando a avaliação do gestor da equipe."
          },
          {
            "value": "rejected",
            "title": "Rejeitada",
            "description": "Rejeitada pelo gestor e disponível para uma única correção e reenvio."
          },
          {
            "value": "approved",
            "title": "Aprovada",
            "description": "Aprovada pelo gestor e disponível para registro do pagamento."
          },
          {
            "value": "paid",
            "title": "Paga",
            "description": "Pagamento registrado pelo financeiro."
          }
        ],
        "title": "Situação",
        "description": "Etapa atual da solicitação de reembolso.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "ContactSummary",
        "title": "Dados da despesa",
        "description": "Dados informados para solicitar o reembolso, a decisão do gestor e o pagamento.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "expenseDate": {
            "type": "date",
            "required": true,
            "of": "ContactSummary",
            "title": "Data da despesa",
            "description": "Data em que a despesa foi realizada.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "category": {
            "type": "string",
            "required": true,
            "of": "ContactSummary",
            "title": "Categoria",
            "description": "Categoria informada pelo colaborador para classificar a despesa.",
            "maxLength": 100,
            "min": 0,
            "max": 0
          },
          "amount": {
            "type": "money",
            "required": true,
            "of": "ContactSummary",
            "title": "Valor",
            "description": "Valor solicitado para reembolso.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "description": {
            "type": "text",
            "required": true,
            "of": "ContactSummary",
            "title": "Descrição",
            "description": "Descrição da despesa informada pelo colaborador.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "rejectionReason": {
            "type": "text",
            "of": "ContactSummary",
            "title": "Motivo da rejeição",
            "description": "Motivo informado pelo gestor quando rejeita a despesa.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "resubmissionCount": {
            "type": "integer",
            "required": true,
            "of": "ContactSummary",
            "title": "Quantidade de reenvios",
            "description": "Quantidade de vezes que a despesa rejeitada foi corrigida e reenviada para avaliação.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "paymentDate": {
            "type": "date",
            "of": "ContactSummary",
            "title": "Data de pagamento",
            "description": "Data em que o financeiro registrou o pagamento da despesa aprovada.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          }
        }
      }
    }
  },
  "lifecycleStates": [
    {
      "state": "pendingApproval",
      "reachedBy": "actor"
    },
    {
      "state": "rejected",
      "reachedBy": "actor"
    },
    {
      "state": "approved",
      "reachedBy": "actor"
    },
    {
      "state": "paid",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "reenviarParaAprovacao",
      "from": [
        "rejected"
      ],
      "to": "pendingApproval",
      "by": [
        "colaborador"
      ],
      "description": "Reenvia uma despesa rejeitada, após correção, para nova avaliação do gestor.",
      "ruleRefs": [
        "unicoReenvioPermitido",
        "despesaPropria"
      ]
    },
    {
      "transitionId": "registrarDecisaoDaDespesa",
      "from": [
        "pendingApproval"
      ],
      "to": "approved",
      "by": [
        "gestorEquipe"
      ],
      "description": "Registra a aprovação do gestor e encaminha a despesa ao financeiro para pagamento.",
      "ruleRefs": [
        "despesaDaEquipe"
      ]
    },
    {
      "transitionId": "rejeitarDespesa",
      "from": [
        "pendingApproval"
      ],
      "to": "rejected",
      "by": [
        "gestorEquipe"
      ],
      "description": "Registra a rejeição do gestor, com o motivo disponível ao colaborador.",
      "ruleRefs": [
        "despesaDaEquipe",
        "motivoRejeicaoObrigatorio"
      ]
    },
    {
      "transitionId": "registrarPagamento",
      "from": [
        "approved"
      ],
      "to": "paid",
      "by": [
        "financeiro"
      ],
      "description": "Registra o pagamento de uma despesa aprovada.",
      "ruleRefs": [
        "pagamentoApenasAprovada",
        "dataPagamentoObrigatoria"
      ]
    }
  ]
} as const satisfies Ns5OntologyEntityV3;

export type ReembolsoDespesasEntityDespesaType = typeof reembolsoDespesasEntityDespesa;

export default reembolsoDespesasEntityDespesa;
