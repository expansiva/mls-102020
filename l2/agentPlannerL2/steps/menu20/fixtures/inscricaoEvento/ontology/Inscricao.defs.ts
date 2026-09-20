/// <mls fileReference="_102047_/l4/inscricaoEvento/ontology/Inscricao.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const inscricaoEventoEntityInscricao = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "inscricaoEvento",
  "entityId": "Inscricao",
  "title": "Inscrição",
  "description": "Registro da inscrição de uma pessoa em um evento, incluindo sua situação de confirmação, espera ou cancelamento.",
  "displayField": "id",
  "relationships": {
    "evento": {
      "relationshipId": "inscricaoDoEvento",
      "to": "Evento",
      "via": "Inscricao.eventoId",
      "cardinality": "N:1",
      "title": "Evento da inscrição",
      "description": "Cada inscrição pertence obrigatoriamente a um evento.",
      "mode": "fk",
      "required": "Sempre"
    },
    "participante": {
      "relationshipId": "participanteDaInscricao",
      "to": "Participante",
      "via": "Inscricao.participanteId",
      "cardinality": "N:1",
      "title": "Participante da inscrição",
      "description": "Cada inscrição identifica obrigatoriamente a pessoa participante.",
      "mode": "fk",
      "required": "Sempre"
    },
    "emailParticipante": {
      "relationshipId": "emailDaInscricao",
      "to": "EmailParticipante",
      "via": "Inscricao.emailParticipanteId",
      "cardinality": "N:1",
      "title": "E-mail informado",
      "description": "Cada inscrição referencia obrigatoriamente o e-mail informado pelo participante.",
      "mode": "fk",
      "required": "Sempre"
    }
  },
  "capabilities": {
    "read.byId": "Consulta uma inscrição pelo seu identificador, usando a chave primária da tabela, para o público acessar a confirmação recebida.",
    "locate.byColumn": "Localiza inscrições por evento, participante, e-mail ou situação em colunas indexadas, com ordenação e paginação, para o público e o organizador encontrarem registros pertinentes.",
    "count": "Conta inscrições conforme os filtros indexados, especialmente as confirmadas de um evento, para o organizador acompanhar a ocupação das vagas.",
    "listByForeignKey": "Lista as inscrições vinculadas a um evento por eventoId, ordenadas pela data e hora de inscrição, para o organizador acompanhar inscritos e lista de espera.",
    "create": "Cria uma inscrição com participante e e-mail vinculados ao evento publicado, registrando-a como confirmada ou em lista de espera, para o público.",
    "transition": "Move a inscrição entre as situações permitidas com validação das regras do módulo, para o público cancelar e para o processo promover a lista de espera.",
    "uniqueKey": "Impede uma segunda inscrição com o mesmo e-mail no mesmo evento pelo índice único de evento e e-mail, para o público.",
    "transaction": "Grava a inscrição e aplica de forma atômica a verificação de vagas ou a promoção após cancelamento, para o público e os processos do módulo.",
    "read.mdmRecord": "Lê os registros mestre do participante e do e-mail referenciados pelas chaves estrangeiras, para mostrar os dados do inscrito ao organizador sem copiá-los na inscrição.",
    "inscricaoEvento.exportarCsv": "Exporta em CSV a lista de inscrições de um evento consultada pelas chaves indexadas, para o organizador baixar os inscritos e suas situações."
  },
  "rules": [
    "inscricaoUnicaPorEmailNoEvento",
    "inscricaoSomenteEmEventoPublicado",
    "confirmarQuandoHouverVaga",
    "listaEsperaPorOrdemDeChegada",
    "cancelamentoLiberaVaga",
    "promoverPrimeiroDaListaEspera"
  ],
  "kind": "entity",
  "class": "event",
  "storage": {
    "target": "moduleDatabase",
    "table": "inscricaoEvento_inscricao",
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
      "eventoId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "Address",
        "to": [
          "Evento"
        ],
        "title": "Evento",
        "description": "Evento ao qual esta inscrição pertence.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "participanteId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "Address",
        "to": [
          "Participante"
        ],
        "title": "Participante",
        "description": "Pessoa participante identificada para esta inscrição.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "emailParticipanteId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "Address",
        "to": [
          "EmailParticipante"
        ],
        "title": "E-mail do participante",
        "description": "Canal de e-mail informado pelo participante e usado para impedir inscrição duplicada no evento.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "of": "Address",
        "values": [
          {
            "value": "confirmed",
            "title": "Confirmada",
            "description": "A inscrição ocupa uma vaga do evento."
          },
          {
            "value": "waitlisted",
            "title": "Lista de espera",
            "description": "A inscrição aguarda uma vaga, respeitando a ordem de chegada."
          },
          {
            "value": "cancelled",
            "title": "Cancelada",
            "description": "A inscrição foi cancelada e não ocupa vaga."
          }
        ],
        "title": "Situação da inscrição",
        "description": "Situação atual da inscrição no evento.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "createdAt": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "of": "Address",
        "title": "Data e hora da inscrição",
        "description": "Momento de criação da inscrição, usado para ordenar a lista de espera por chegada.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "Address",
        "title": "Detalhes da inscrição",
        "description": "Informações próprias da inscrição que não exigem filtro, ordenação ou deduplicação.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      }
    }
  },
  "uniqueKeys": [
    [
      "eventoId",
      "emailParticipanteId"
    ]
  ],
  "lifecycleStates": [
    {
      "state": "confirmed",
      "reachedBy": "actor"
    },
    {
      "state": "waitlisted",
      "reachedBy": "actor"
    },
    {
      "state": "cancelled",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "cancelarInscricao",
      "from": [
        "confirmed",
        "waitlisted"
      ],
      "to": "cancelled",
      "by": [
        "publico"
      ],
      "description": "Cancela a inscrição; se ela ocupava uma vaga, inicia a promoção da primeira pessoa da lista de espera.",
      "ruleRefs": [
        "cancelamentoLiberaVaga",
        "promoverPrimeiroDaListaEspera"
      ]
    },
    {
      "transitionId": "promoverDaListaEspera",
      "from": [
        "waitlisted"
      ],
      "to": "confirmed",
      "by": [],
      "description": "Promove automaticamente a primeira inscrição da lista de espera quando uma vaga é liberada.",
      "ruleRefs": [
        "promoverPrimeiroDaListaEspera"
      ]
    }
  ]
} as const satisfies Ns5OntologyEntityV3;

export type InscricaoEventoEntityInscricaoType = typeof inscricaoEventoEntityInscricao;

export default inscricaoEventoEntityInscricao;
