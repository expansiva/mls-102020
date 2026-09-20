/// <mls fileReference="_102047_/l4/locacaoEquipamentos/ontology/ContratoLocacao.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const locacaoEquipamentosEntityContratoLocacao = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "locacaoEquipamentos",
  "entityId": "ContratoLocacao",
  "title": "Contrato de locação",
  "description": "Contrato que registra a locação de um cliente, seu período previsto e a devolução efetiva dos equipamentos.",
  "displayField": "id",
  "relationships": {
    "cliente": {
      "relationshipId": "clienteContratosLocacao",
      "to": "Cliente",
      "via": "ContratoLocacao.clienteId",
      "cardinality": "N:1",
      "title": "Cliente do contrato",
      "description": "Cada contrato de locação pertence a um cliente, que pode possuir vários contratos.",
      "mode": "fk",
      "direction": "to",
      "required": "Sempre",
      "role": "locatário"
    },
    "itensLocacao": {
      "relationshipId": "contratoItensLocacao",
      "to": "ItemLocacao",
      "via": "ItemLocacao.contratoLocacaoId",
      "cardinality": "1:N",
      "title": "Itens da locação",
      "description": "O contrato contém um ou mais itens que identificam os equipamentos locados.",
      "mode": "fk",
      "required": "Sempre",
      "role": "contrato"
    }
  },
  "capabilities": {
    "read.byId": "Lê um contrato pelo identificador da linha com consulta por id; usado pelo atendente ao inspecionar o contrato em contexto.",
    "locate.byColumn": "Lista contratos por cliente, situação e datas indexadas, com ordenação e paginação; usado pelo atendente para localizar contratos em aberto e pelo gerente para acompanhar locações.",
    "count": "Conta contratos que atendem aos filtros de cliente, situação e período; usado nas listas do atendente e do gerente.",
    "listByForeignKey": "Lista os contratos vinculados a um cliente pela chave clienteId; usado ao consultar o histórico de locações do cliente.",
    "create": "Cria o contrato com cliente, período e situação em aberto; usado pelo atendente ao registrar uma nova locação.",
    "update": "Altera dados permitidos de um contrato ainda em aberto, como o período previsto, com validação de conflitos; usado pelo atendente antes da devolução.",
    "transition": "Move o contrato de em aberto para devolvido ao registrar a data real de devolução; usado pelo atendente.",
    "transaction": "Grava o contrato e seus itens de locação de forma atômica; usado pelo atendente na criação para não deixar um contrato sem equipamentos.",
    "read.mdmRecord": "Lê o registro mestre apontado por clienteId para exibir os dados do cliente sem copiá-los no contrato; usado nas telas do atendente e do gerente."
  },
  "rules": [
    "contratoComPeloMenosUmItem",
    "periodoLocacaoValido",
    "equipamentoSemSobreposicao",
    "devolucaoAposRetirada",
    "multaPorAtraso"
  ],
  "kind": "entity",
  "class": "event",
  "storage": {
    "target": "moduleDatabase",
    "table": "locacaoEquipamentos_contratolocacao",
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
      "clienteId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "to": [
          "Cliente"
        ],
        "title": "Cliente",
        "description": "Cliente para quem o contrato de locação foi celebrado.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "dataRetirada": {
        "type": "date",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "title": "Data de retirada",
        "description": "Data prevista para a retirada dos equipamentos pelo cliente; é usada para verificar conflitos entre períodos de locação.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "dataPrevistaDevolucao": {
        "type": "date",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "title": "Data prevista de devolução",
        "description": "Data acordada para a devolução dos equipamentos; é usada para verificar conflitos de período e apurar atraso.",
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
            "value": "open",
            "title": "Em aberto",
            "description": "A locação foi criada e aguarda a devolução dos equipamentos."
          },
          {
            "value": "returned",
            "title": "Devolvido",
            "description": "A devolução foi registrada e a locação foi concluída."
          }
        ],
        "title": "Situação do contrato",
        "description": "Indica se a locação ainda está em aberto ou se os equipamentos já foram devolvidos.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "ContactSummary",
        "title": "Dados do contrato",
        "description": "Informações do contrato que não são usadas como critério de filtro, ordenação ou pesquisa.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "dataDevolucaoReal": {
            "type": "date",
            "of": "ContactSummary",
            "title": "Data real de devolução",
            "description": "Data em que os equipamentos foram efetivamente devolvidos pelo cliente.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "multaAtraso": {
            "type": "money",
            "derived": true,
            "title": "Multa por atraso",
            "description": "Valor da multa quando a data real de devolução é posterior à data prevista, calculado pela soma das diárias dos equipamentos locados multiplicada pela quantidade de dias de atraso e por 1,5; é zero quando não houver atraso."
          }
        }
      }
    }
  },
  "lifecycleStates": [
    {
      "state": "open",
      "reachedBy": "actor"
    },
    {
      "state": "returned",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "registrarDevolucao",
      "from": [
        "open"
      ],
      "to": "returned",
      "by": [
        "atendente"
      ],
      "description": "Registra a data real de devolução e conclui a locação dos equipamentos do contrato.",
      "ruleRefs": [
        "devolucaoAposRetirada",
        "multaPorAtraso"
      ]
    }
  ]
} as const satisfies Ns5OntologyEntityV3;

export type LocacaoEquipamentosEntityContratoLocacaoType = typeof locacaoEquipamentosEntityContratoLocacao;

export default locacaoEquipamentosEntityContratoLocacao;
