/// <mls fileReference="_102047_/l4/inscricaoEvento/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const inscricaoEventoOntologyIndex = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "inscricaoEvento",
  "businessDomain": "Inscrição em eventos: cadastro e publicação de eventos com vagas limitadas, inscrição pública por nome e e-mail, lista de espera por ordem de chegada com promoção automática ao cancelar, e acompanhamento dos inscritos pelo organizador com exportação em CSV.",
  "platformOntology": "/_102034_/l4/ontology/mdm.defs.ts",
  "moduleNamespace": {
    "key": "inscricaoEvento",
    "description": "Branch details.inscricaoEvento of the master records this module has a role on; only this module writes it."
  },
  "entities": [
    {
      "entityId": "Evento",
      "kind": "entity",
      "class": "core"
    },
    {
      "entityId": "Inscricao",
      "kind": "entity",
      "class": "event"
    },
    {
      "entityId": "Participante",
      "kind": "role",
      "subtype": "Person"
    },
    {
      "entityId": "EmailParticipante",
      "kind": "role",
      "subtype": "ContactChannel"
    }
  ],
  "relationships": [
    {
      "relationshipId": "inscricaoEvento",
      "from": "Inscricao",
      "to": "Evento",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada inscrição pertence a um evento publicado; o evento reúne seus inscritos e sua lista de espera.",
      "field": "Inscricao.eventoId"
    },
    {
      "relationshipId": "inscricaoParticipante",
      "from": "Inscricao",
      "to": "Participante",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada inscrição é de um participante; o mesmo participante só pode ter uma inscrição por evento.",
      "field": "Inscricao.participanteId"
    },
    {
      "relationshipId": "participanteEmail",
      "from": "Participante",
      "to": "EmailParticipante",
      "type": "oneToMany",
      "required": true,
      "mode": "mdmRelationship",
      "description": "O participante possui o e-mail com que se inscreve, registrado como canal de contato no cadastro mestre.",
      "catalogType": "HasContact"
    },
    {
      "relationshipId": "eventosDoParticipante",
      "from": "Participante",
      "to": "Evento",
      "type": "manyToMany",
      "required": false,
      "mode": "throughTable",
      "description": "Eventos em que o participante está inscrito, obtidos a partir das suas inscrições.",
      "through": "Inscricao",
      "path": "Participante <- Inscricao.participanteId -> Inscricao.eventoId -> Evento",
      "derived": true
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyIndexV3>;

export type InscricaoEventoOntologyIndexType = typeof inscricaoEventoOntologyIndex;

export default inscricaoEventoOntologyIndex;
