/// <mls fileReference="_102047_/l4/inscricaoEvento/ontology/Inscricao.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const inscricaoEventoEntityInscricao = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "inscricaoEvento",
  "entityId": "Inscricao",
  "title": "Inscrição",
  "description": "Inscrição de uma pessoa em um evento publicado, com ordem de chegada; fica confirmada enquanto houver vagas ou em lista de espera quando acabam, pode ser cancelada e é promovida da lista de espera quando uma vaga é liberada. Um mesmo participante (e-mail) só se inscreve uma vez por evento.",
  "displayField": "registrationCode",
  "relationships": {
    "evento": {
      "relationshipId": "inscricaoEvento",
      "to": "Evento",
      "via": "Inscricao.eventoId",
      "cardinality": "N:1",
      "title": "Evento da inscrição",
      "description": "Cada inscrição pertence a um evento publicado.",
      "mode": "fk",
      "required": true
    },
    "participante": {
      "relationshipId": "inscricaoParticipante",
      "to": "Participante",
      "via": "Inscricao.participanteId",
      "cardinality": "N:1",
      "title": "Participante inscrito",
      "description": "Cada inscrição é de um participante; um participante tem no máximo uma inscrição por evento.",
      "mode": "fk",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Abre uma inscrição pelo id para a pessoa conferir a situação antes de cancelar e para o organizador ver o detalhe.",
    "locate.byColumn": "Localiza inscrições por código, evento, participante ou situação, ordenadas pela ordem de chegada; usada pelo público para achar a própria inscrição e pelo organizador para listar inscritos.",
    "listByForeignKey": "Lista as inscrições de um evento (inscritos e lista de espera) para a tela do organizador e para a promoção da fila.",
    "count": "Conta as inscrições confirmadas e em lista de espera de um evento para mostrar vagas ocupadas, restantes e tamanho da fila ao organizador e na página pública.",
    "create": "Cria a inscrição a partir da página pública com nome e e-mail, como confirmada se houver vaga ou em lista de espera se as vagas acabaram; feita pelo público.",
    "transition": "Move a inscrição para cancelada quando o público cancela e para confirmada quando o processo promove o primeiro da lista de espera.",
    "uniqueKey": "Recusa uma segunda inscrição do mesmo participante (e-mail) no mesmo evento, pela chave evento + participante.",
    "transaction": "Grava o cancelamento e a promoção do primeiro da lista de espera juntos, tudo ou nada.",
    "read.mdmRecord": "Lê nome e e-mail do participante no cadastro mestre para exibir na lista de inscritos e no CSV do organizador.",
    "sequence.next": "Emite o código da inscrição informado à pessoa, na criação.",
    "inscricaoEvento.exportarCsv": "Gera o arquivo CSV com os inscritos do evento (nome, e-mail, situação e ordem de chegada) para o organizador baixar."
  },
  "rules": [
    "inscricaoUnicaPorEmailEvento",
    "inscricaoSomenteEventoPublicado",
    "listaEsperaQuandoVagasEsgotadas",
    "ordemChegadaListaEspera",
    "promoverPrimeiroListaEsperaAoCancelar",
    "cancelamentoSomentePropriaInscricao"
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
      "registrationCode": {
        "type": "string",
        "required": true,
        "unique": true,
        "indexed": true,
        "derived": true,
        "title": "Código da inscrição",
        "description": "Número da inscrição informado à pessoa e usado para localizá-la; emitido pelo sistema na criação, por evento.",
        "maxLength": 20
      },
      "eventoId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Evento"
        ],
        "title": "Evento",
        "description": "Evento publicado no qual a pessoa se inscreveu."
      },
      "participanteId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Participante"
        ],
        "title": "Participante",
        "description": "Pessoa inscrita; nome e e-mail ficam no cadastro mestre do participante."
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "confirmed",
            "title": "Confirmada"
          },
          {
            "value": "waitlisted",
            "title": "Em lista de espera"
          },
          {
            "value": "cancelled",
            "title": "Cancelada"
          }
        ],
        "title": "Situação",
        "description": "Situação da inscrição: confirmada (ocupa vaga), em lista de espera ou cancelada."
      },
      "receivedAt": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "derived": true,
        "title": "Recebida em",
        "description": "Momento em que a inscrição chegou; define a ordem de chegada da lista de inscritos e da lista de espera."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Detalhes",
        "description": "Demais dados da inscrição.",
        "fields": {
          "promotedAt": {
            "type": "timestamp",
            "title": "Promovida em",
            "description": "Momento em que a inscrição saiu da lista de espera e passou a ocupar uma vaga."
          },
          "cancelledAt": {
            "type": "timestamp",
            "title": "Cancelada em",
            "description": "Momento em que a pessoa cancelou a inscrição."
          },
          "posicaoListaEspera": {
            "type": "integer",
            "derived": true,
            "title": "Posição na lista de espera",
            "description": "Para uma inscrição em lista de espera, quantas inscrições do mesmo evento também em lista de espera chegaram antes dela, mais um; vazio quando não está na lista de espera."
          },
          "ocupaVaga": {
            "type": "boolean",
            "derived": true,
            "title": "Ocupa vaga",
            "description": "Verdadeiro quando a inscrição está confirmada e conta entre as vagas ocupadas do evento."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "eventoId",
      "participanteId"
    ]
  ],
  "lifecycleStates": [
    {
      "state": "confirmed",
      "reachedBy": "command"
    },
    {
      "state": "waitlisted",
      "reachedBy": "command"
    },
    {
      "state": "cancelled",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "cancelar",
      "from": [
        "confirmed",
        "waitlisted"
      ],
      "to": "cancelled",
      "by": [
        "publico"
      ],
      "description": "A pessoa cancela a própria inscrição; se ela ocupava vaga, a vaga é liberada e o primeiro da lista de espera é promovido.",
      "payload": [],
      "ruleRefs": [
        "cancelamentoSomentePropriaInscricao",
        "promoverPrimeiroListaEsperaAoCancelar"
      ]
    },
    {
      "transitionId": "promover",
      "from": [
        "waitlisted"
      ],
      "to": "confirmed",
      "by": [],
      "description": "O processo de promoção move a primeira inscrição da lista de espera, por ordem de chegada, para confirmada quando uma vaga é liberada.",
      "payload": [
        "details.promotedAt"
      ],
      "ruleRefs": [
        "ordemChegadaListaEspera",
        "promoverPrimeiroListaEsperaAoCancelar"
      ]
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type InscricaoEventoEntityInscricaoType = typeof inscricaoEventoEntityInscricao;

export default inscricaoEventoEntityInscricao;
