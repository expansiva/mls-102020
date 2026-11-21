/// <mls fileReference="_102047_/l4/mensalidadesAcademia/ontology/Pagamento.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaEntityPagamento = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "mensalidadesAcademia",
  "entityId": "Pagamento",
  "title": "Pagamento",
  "description": "Pagamento recebido pela recepção para uma mensalidade, com data, valor e forma de pagamento.",
  "displayField": "dataPagamento",
  "relationships": {
    "mensalidade": {
      "relationshipId": "pagamentoMensalidade",
      "to": "Mensalidade",
      "via": "Pagamento.mensalidadeId",
      "cardinality": "N:1",
      "title": "Mensalidade quitada",
      "description": "O pagamento quita uma mensalidade; uma mensalidade pode receber um ou mais pagamentos.",
      "mode": "fk",
      "required": true
    }
  },
  "capabilities": {
    "create": "Registra um novo pagamento com data, valor e forma, lançado pela recepção ao receber a mensalidade do aluno.",
    "transaction": "Grava o pagamento e marca a mensalidade como paga na mesma operação, tudo ou nada, quando a recepção lança o recebimento.",
    "read.byId": "Lê um pagamento pelo id para a recepção ou a gerência conferirem o lançamento.",
    "listByForeignKey": "Lista os pagamentos de uma mensalidade pela coluna mensalidadeId, usado pela recepção ao conferir a mensalidade antes de receber.",
    "locate.byColumn": "Lista pagamentos filtrados e ordenados pela data do pagamento, usado pela gerência para acompanhar os recebimentos do mês.",
    "count": "Conta os pagamentos de um período pela data do pagamento, para totais em listas da gerência.",
    "read.mdmRecord": "Lê o registro mestre do aluno por trás da mensalidade paga, para a recepção ver o nome do aluno no pagamento.",
    "update": "Corrige data, valor ou forma de um pagamento lançado com erro pela recepção.",
    "attach.document": "Anexa ao pagamento o comprovante (Pix, recibo de cartão ou transferência) apresentado pelo aluno à recepção.",
    "comment": "Permite à recepção e à gerência deixar notas sobre um pagamento, como acordos ou divergências de valor."
  },
  "rules": [
    "pagamentoValorPositivo",
    "pagamentoSomenteMensalidadeEmAberto",
    "pagamentoQuitaMensalidade",
    "regularizacaoDesbloqueiaAluno"
  ],
  "kind": "entity",
  "class": "event",
  "storage": {
    "target": "moduleDatabase",
    "table": "mensalidadesAcademia_pagamento",
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
      "mensalidadeId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Mensalidade"
        ],
        "title": "Mensalidade",
        "description": "Mensalidade que este pagamento quita. Usada para listar os pagamentos de uma mensalidade e calcular quanto já foi pago."
      },
      "dataPagamento": {
        "type": "date",
        "required": true,
        "indexed": true,
        "title": "Data do pagamento",
        "description": "Data em que o aluno pagou, informada pela recepção. Usada para ordenar os pagamentos e somar o total recebido no mês."
      },
      "registradoEm": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "derived": true,
        "title": "Registrado em",
        "description": "Momento em que a recepção lançou o pagamento no sistema, preenchido automaticamente."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Detalhes do pagamento",
        "description": "Dados do pagamento que são apenas exibidos.",
        "fields": {
          "valor": {
            "type": "money",
            "required": true,
            "title": "Valor pago",
            "description": "Valor recebido pela recepção neste pagamento.",
            "min": 0.01
          },
          "formaPagamento": {
            "type": "enum",
            "required": true,
            "values": [
              {
                "value": "cash",
                "title": "Dinheiro"
              },
              {
                "value": "pix",
                "title": "Pix"
              },
              {
                "value": "debitCard",
                "title": "Cartão de débito"
              },
              {
                "value": "creditCard",
                "title": "Cartão de crédito"
              },
              {
                "value": "bankTransfer",
                "title": "Transferência bancária"
              },
              {
                "value": "bankSlip",
                "title": "Boleto"
              }
            ],
            "title": "Forma de pagamento",
            "description": "Meio pelo qual o aluno pagou a mensalidade."
          },
          "observacao": {
            "type": "text",
            "title": "Observação",
            "description": "Anotação livre da recepção sobre o recebimento.",
            "maxLength": 500
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type MensalidadesAcademiaEntityPagamentoType = typeof mensalidadesAcademiaEntityPagamento;

export default mensalidadesAcademiaEntityPagamento;
