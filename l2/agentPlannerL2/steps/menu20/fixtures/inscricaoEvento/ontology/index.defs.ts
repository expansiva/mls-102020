/// <mls fileReference="_102047_/l4/inscricaoEvento/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexV3 } from '/_102035_/l2/solution/types.js';

export const inscricaoEventoOntologyIndex = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "inscricaoEvento",
  "businessDomain": "Inscrição e gestão de eventos",
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
      "relationshipId": "inscricaoDoEvento",
      "from": "Inscricao",
      "to": "Evento",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada inscrição pertence obrigatoriamente a um evento.",
      "field": "Inscricao.eventoId"
    },
    {
      "relationshipId": "participanteDaInscricao",
      "from": "Inscricao",
      "to": "Participante",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada inscrição identifica obrigatoriamente a pessoa participante.",
      "field": "Inscricao.participanteId"
    },
    {
      "relationshipId": "emailDaInscricao",
      "from": "Inscricao",
      "to": "EmailParticipante",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada inscrição referencia obrigatoriamente o e-mail informado pelo participante.",
      "field": "Inscricao.emailParticipanteId"
    },
    {
      "relationshipId": "contatoDoParticipante",
      "from": "Participante",
      "to": "EmailParticipante",
      "type": "oneToMany",
      "required": true,
      "mode": "mdmRelationship",
      "description": "O participante possui um ou mais canais de contato, incluindo o e-mail usado na inscrição.",
      "catalogType": "HasContact"
    }
  ]
} as const satisfies Ns5OntologyIndexV3;

export type InscricaoEventoOntologyIndexType = typeof inscricaoEventoOntologyIndex;

export default inscricaoEventoOntologyIndex;
