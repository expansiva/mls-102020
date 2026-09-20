/// <mls fileReference="_102047_/l4/inscricaoEvento/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact } from '/_102035_/l2/solution/types.js';

export const inscricaoEventoAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "inscricaoEvento",
  "actors": [
    {
      "actorId": "organizador",
      "kind": "internal",
      "origin": "named",
      "title": "Organizador",
      "description": "Cadastra e publica eventos, acompanha inscritos e exporta a lista de inscrições."
    },
    {
      "actorId": "publico",
      "kind": "external",
      "origin": "named",
      "title": "Público",
      "description": "Acessa a página pública do evento e realiza sua inscrição."
    }
  ],
  "grants": [
    {
      "grantId": "organizadorGerenciarEventos",
      "actorRef": "organizador",
      "title": "Gerenciar eventos",
      "description": "Permite ao organizador cadastrar, publicar e consultar todos os eventos da organização, incluindo capacidade e ocupação.",
      "entityRefs": [
        "Evento"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange todos os eventos da organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "O organizador visualiza todas as informações do evento necessárias para seu cadastro, publicação e acompanhamento."
      }
    },
    {
      "grantId": "organizadorAcompanharInscricoes",
      "actorRef": "organizador",
      "title": "Acompanhar inscrições",
      "description": "Permite ao organizador consultar e exportar as inscrições dos eventos, com o nome e o e-mail dos participantes.",
      "entityRefs": [
        "Inscricao",
        "Participante",
        "EmailParticipante"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange todas as inscrições e os dados de participantes vinculados a eventos da organização."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "O organizador visualiza a situação e a data das inscrições, o nome do participante e o endereço de e-mail informado para contato e exportação.",
        "allowedFields": [
          "Inscricao.id",
          "Inscricao.eventoId",
          "Inscricao.participanteId",
          "Inscricao.emailParticipanteId",
          "Inscricao.status",
          "Inscricao.createdAt",
          "Participante.details.identification",
          "EmailParticipante.details.contactChannel"
        ]
      }
    },
    {
      "grantId": "publicoConsultarPropriaInscricao",
      "actorRef": "publico",
      "title": "Consultar e cancelar a própria inscrição",
      "description": "Permite ao público consultar a situação da própria inscrição e cancelá-la quando necessário.",
      "entityRefs": [
        "Inscricao",
        "Participante"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Abrange somente inscrições vinculadas ao participante da sessão.",
        "anchorEntity": "Participante"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "O participante visualiza sua própria identificação e os dados necessários para conferir a situação de sua inscrição.",
        "allowedFields": [
          "Inscricao.id",
          "Inscricao.eventoId",
          "Inscricao.status",
          "Inscricao.createdAt",
          "Participante.details.identification"
        ]
      }
    }
  ]
} as const satisfies Ns5AccessArtifact;

export type InscricaoEventoAccessType = typeof inscricaoEventoAccess;

export default inscricaoEventoAccess;
