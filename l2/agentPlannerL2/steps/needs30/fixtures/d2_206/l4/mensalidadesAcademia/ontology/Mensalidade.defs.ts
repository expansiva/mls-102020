/// <mls fileReference="_102047_/l4/mensalidadesAcademia/ontology/Mensalidade.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaEntityMensalidade = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "mensalidadesAcademia",
  "entityId": "Mensalidade",
  "title": "Mensalidade",
  "description": "Cobrança mensal gerada para uma matrícula ativa, com mês de referência, valor do plano e vencimento; única por matrícula e mês. Vencida é derivada: em aberto e com vencimento anterior a hoje.",
  "displayField": "competencia",
  "relationships": {
    "matricula": {
      "relationshipId": "mensalidadeMatricula",
      "to": "Matricula",
      "via": "Mensalidade.matriculaId",
      "cardinality": "N:1",
      "title": "Matrícula da mensalidade",
      "description": "Cada mensalidade pertence a uma matrícula ativa, uma por mês de referência.",
      "mode": "fk",
      "required": true
    },
    "pagamentos": {
      "relationshipId": "pagamentoMensalidade",
      "to": "Pagamento",
      "via": "Pagamento.mensalidadeId",
      "cardinality": "1:N",
      "title": "Pagamentos da mensalidade",
      "description": "Pagamentos registrados pela recepção que quitam esta mensalidade.",
      "mode": "fk",
      "direction": "to",
      "required": true
    },
    "aluno": {
      "relationshipId": "alunoMensalidades",
      "to": "Aluno",
      "via": "Matricula",
      "cardinality": "N:1",
      "title": "Aluno da mensalidade",
      "description": "Aluno dono da mensalidade, alcançado pela matrícula.",
      "mode": "throughTable",
      "path": "Aluno <- Matricula.alunoId <- Mensalidade.matriculaId",
      "derived": true,
      "direction": "to"
    }
  },
  "capabilities": {
    "read.byId": "Abre uma mensalidade pelo id para a recepção conferir valor, vencimento e situação antes de receber.",
    "locate.byColumn": "Lista mensalidades por mês de referência, situação e vencimento, para a gerência revisar as geradas no mês e abrir as vencidas dos inadimplentes.",
    "listByForeignKey": "Lista as mensalidades das matrículas do aluno, em aberto ou vencidas, para a recepção localizar a que vai receber.",
    "count": "Conta as mensalidades geradas ou vencidas de um mês para os totais das listas da gerência.",
    "create": "Grava cada mensalidade gerada pela gerência com o valor do plano e o vencimento no dia do plano.",
    "uniqueKey": "Recusa uma segunda mensalidade para a mesma matrícula e o mesmo mês de referência, evitando duplicar na geração.",
    "transaction": "Gera todas as mensalidades do mês de uma vez, tudo ou nada; e grava o pagamento junto com a quitação da mensalidade.",
    "transition": "Passa a mensalidade de em aberto para paga quando o pagamento registrado pela recepção quita o valor.",
    "read.mdmRecord": "Lê o nome do aluno por trás da matrícula para mostrar nas listas da recepção e da gerência.",
    "comment": "Permite à recepção ou à gerência deixar uma observação sobre uma cobrança, como um acordo de pagamento.",
    "mensalidadesAcademia.gerarMensalidadesMes": "Gera, para o mês de referência informado pela gerência, uma mensalidade por matrícula ativa com o valor do plano e o vencimento no dia do plano, ignorando as já geradas e as matrículas canceladas."
  },
  "rules": [
    "mensalidadeUnicaPorMatriculaMes",
    "gerarSomenteMatriculaAtiva",
    "valorDoPlanoNaGeracao",
    "vencimentoNoDiaDoPlano",
    "mensalidadeVencida",
    "quitacaoPorPagamento",
    "alunoBloqueadoDuasVencidas",
    "cancelamentoEncerraGeracao"
  ],
  "kind": "entity",
  "class": "event",
  "storage": {
    "target": "moduleDatabase",
    "table": "mensalidadesAcademia_mensalidade",
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
      "matriculaId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Matricula"
        ],
        "title": "Matrícula",
        "description": "Matrícula ativa para a qual a mensalidade foi gerada; por ela se chega ao aluno e ao plano."
      },
      "competencia": {
        "type": "string",
        "required": true,
        "indexed": true,
        "title": "Mês de referência",
        "description": "Mês de referência da cobrança (AAAA-MM), informado pela gerência na geração; com a matrícula, identifica a mensalidade.",
        "pattern": "^\\d{4}-(0[1-9]|1[0-2])$",
        "maxLength": 7
      },
      "vencimento": {
        "type": "date",
        "required": true,
        "indexed": true,
        "title": "Vencimento",
        "description": "Data de vencimento no mês de referência, no dia de vencimento do plano; usada para listar e para saber se está vencida."
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "aberta",
            "title": "Em aberto"
          },
          {
            "value": "paga",
            "title": "Paga"
          }
        ],
        "title": "Situação de pagamento",
        "description": "Em aberto desde a geração; passa a paga quando os pagamentos registrados quitam o valor. Vencida não é situação gravada: é derivada."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Detalhes",
        "description": "Dados da cobrança que são apenas exibidos.",
        "fields": {
          "valor": {
            "type": "money",
            "required": true,
            "title": "Valor",
            "description": "Valor cobrado, copiado do valor do plano da matrícula no momento da geração.",
            "min": 0
          },
          "geradaEm": {
            "type": "timestamp",
            "required": true,
            "derived": true,
            "title": "Gerada em",
            "description": "Momento em que a gerência gerou a mensalidade do mês."
          },
          "quitadaEm": {
            "type": "date",
            "title": "Quitada em",
            "description": "Data do pagamento que quitou a mensalidade, preenchida quando ela passa a paga."
          },
          "vencida": {
            "type": "boolean",
            "derived": true,
            "title": "Vencida",
            "description": "Em aberto e com vencimento anterior a hoje."
          },
          "totalPago": {
            "type": "money",
            "derived": true,
            "title": "Total pago",
            "description": "Soma dos pagamentos registrados para esta mensalidade."
          },
          "saldoDevedor": {
            "type": "money",
            "derived": true,
            "title": "Saldo devedor",
            "description": "Valor da mensalidade menos a soma dos pagamentos registrados para ela, nunca abaixo de zero."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "matriculaId",
      "competencia"
    ]
  ],
  "lifecycleStates": [
    {
      "state": "aberta",
      "reachedBy": "command"
    },
    {
      "state": "paga",
      "reachedBy": "command"
    }
  ],
  "transitions": [
    {
      "transitionId": "quitar",
      "from": [
        "aberta"
      ],
      "to": "paga",
      "by": [],
      "description": "Quando o pagamento registrado pela recepção completa o valor da mensalidade, ela passa a paga automaticamente.",
      "payload": [
        "details.quitadaEm"
      ],
      "ruleRefs": [
        "quitacaoPorPagamento"
      ]
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type MensalidadesAcademiaEntityMensalidadeType = typeof mensalidadesAcademiaEntityMensalidade;

export default mensalidadesAcademiaEntityMensalidade;
