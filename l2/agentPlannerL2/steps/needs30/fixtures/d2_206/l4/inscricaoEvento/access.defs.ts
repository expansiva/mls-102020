/// <mls fileReference="_102047_/l4/inscricaoEvento/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const inscricaoEventoAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "inscricaoEvento",
  "actors": [
    {
      "actorId": "organizador",
      "kind": "internal",
      "origin": "named",
      "title": "Organizador",
      "description": "Cadastra e publica eventos com título, descrição, data, local e número de vagas; acompanha os inscritos e as vagas ocupadas e baixa a lista de inscritos em CSV.",
      "personEntity": ""
    },
    {
      "actorId": "publico",
      "kind": "external",
      "origin": "named",
      "title": "Público",
      "description": "Qualquer pessoa que acessa a página pública de um evento publicado e se inscreve com nome e e-mail, entrando na lista de espera quando as vagas acabam, e que pode cancelar a própria inscrição.",
      "personEntity": "Participante"
    }
  ],
  "grants": [
    {
      "grantId": "organizadorEventos",
      "actorRef": "organizador",
      "title": "Gerenciar eventos",
      "description": "O organizador cadastra, revisa e publica eventos e acompanha vagas ocupadas, vagas restantes e lista de espera.",
      "entityRefs": [
        "Evento"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todos os eventos da organização."
      },
      "disclosure": {
        "mode": "fullRecord",
        "description": "Registro completo do evento, incluindo os totais de ocupação."
      }
    },
    {
      "grantId": "organizadorInscritos",
      "actorRef": "organizador",
      "title": "Acompanhar inscritos",
      "description": "O organizador vê os inscritos de cada evento com nome, e-mail, situação e ordem de chegada, e baixa a lista em CSV.",
      "entityRefs": [
        "Inscricao",
        "Participante",
        "EmailParticipante"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Todas as inscrições dos eventos da organização e os participantes inscritos."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Inscrição completa e, do participante, apenas nome e e-mail; consentimento e demais dados do cadastro mestre não são exibidos.",
        "allowedFields": [
          "Inscricao",
          "Participante.details.identification.name",
          "Participante.details.identification.status",
          "Participante.details.base.contacts",
          "EmailParticipante.details.identification.name",
          "EmailParticipante.details.contactChannel.value",
          "EmailParticipante.details.contactChannel.isVerified"
        ]
      }
    },
    {
      "grantId": "publicoMinhasInscricoes",
      "actorRef": "publico",
      "title": "Minhas inscrições",
      "description": "A pessoa se inscreve em um evento publicado, consulta a própria inscrição e o evento dela e pode cancelá-la.",
      "entityRefs": [
        "Inscricao",
        "Evento"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Somente as inscrições da própria pessoa e os eventos dessas inscrições.",
        "anchorEntity": "Participante"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Dados da inscrição e do evento visíveis ao público, sem campos internos de controle.",
        "deniedFields": [
          "Inscricao.version",
          "Evento.version",
          "Evento.status",
          "Evento.details.publishedAt"
        ]
      }
    },
    {
      "grantId": "publicoMeuCadastro",
      "actorRef": "publico",
      "title": "Meu cadastro de participante",
      "description": "A pessoa informa e confere o próprio nome, e-mail e consentimento de privacidade ao se inscrever.",
      "entityRefs": [
        "Participante",
        "EmailParticipante"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Somente o próprio registro de participante e o próprio e-mail.",
        "anchorEntity": "Participante"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Nome, país, e-mail e consentimento da própria pessoa.",
        "allowedFields": [
          "Participante.details.identification.name",
          "Participante.details.identification.countryCode",
          "Participante.details.base.contacts",
          "Participante.details.person.privacyConsent",
          "EmailParticipante.details.identification.name",
          "EmailParticipante.details.contactChannel"
        ]
      }
    }
  ]
} as const satisfies Ns5Readonly<Ns5AccessArtifact>;

export type InscricaoEventoAccessType = typeof inscricaoEventoAccess;

export default inscricaoEventoAccess;
