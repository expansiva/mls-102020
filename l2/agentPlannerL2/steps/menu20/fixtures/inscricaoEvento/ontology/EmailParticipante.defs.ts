/// <mls fileReference="_102047_/l4/inscricaoEvento/ontology/EmailParticipante.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const inscricaoEventoEntityEmailParticipante = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "inscricaoEvento",
  "entityId": "EmailParticipante",
  "title": "E-mail do participante",
  "description": "Canal de contato por e-mail do participante, usado para identificá-lo e impedir inscrição duplicada no mesmo evento.",
  "displayField": "details.contactChannel.value",
  "relationships": {
    "inscricoesPorEmail": {
      "relationshipId": "emailDaInscricao",
      "to": "Inscricao",
      "via": "Inscricao.emailParticipanteId",
      "cardinality": "1:N",
      "title": "Inscrições realizadas com este e-mail",
      "description": "Inscrições que referenciam obrigatoriamente este e-mail de participante.",
      "mode": "fk",
      "direction": "to",
      "required": true,
      "role": "e-mail informado na inscrição"
    },
    "participanteDoContato": {
      "relationshipId": "contatoDoParticipante",
      "to": "Participante",
      "via": "HasContact",
      "cardinality": "N:1",
      "title": "Participante titular do contato",
      "description": "Participante que possui este canal de e-mail por meio do relacionamento HasContact.",
      "direction": "to",
      "required": "quando o e-mail for usado por um participante",
      "role": "e-mail"
    }
  },
  "capabilities": {
    "read.byId": "Lê o canal de e-mail pelo identificador MDM já conhecido · consulta direta pelo id no índice e no documento MDM · listas de inscrições e telas do organizador.",
    "locate.byContact": "Localiza um canal pelo endereço de e-mail informado · busca o valor do contato para reaproveitar o mesmo registro mestre · inscrição pública e processamento da inscrição.",
    "register.createOrAttach": "Cria o canal de e-mail quando ainda não existir ou anexa o papel EmailParticipante ao registro encontrado · resolve o contato e grava somente o namespace do módulo · inscrição pública.",
    "link": "Vincula o canal de e-mail ao participante pela relação HasContact · cria o vínculo versionado no MDM · processamento da inscrição ao associar o contato ao participante.",
    "listLinks": "Lista participantes e inscrições relacionados a este e-mail · consulta os vínculos ativos e seu histórico no MDM · organizador ao conferir os inscritos."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace",
    "rule-contact-value-unique-per-type"
  ],
  "kind": "role",
  "subtype": "ContactChannel",
  "roleTag": "inscricaoEvento.EmailParticipante",
  "source": "/_102034_/l4/ontology/mdm.defs.ts",
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "indexed": true,
        "derived": true,
        "description": "mdmId; stable through promotion and merge."
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true,
        "description": "Bumped by the engine on every write; optimistic concurrency."
      },
      "details": {
        "type": "object",
        "required": true,
        "description": "Documento MDM do canal de contato usado nas inscrições em eventos.",
        "fields": {
          "identification": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "subtype": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "ContactChannel",
                    "title": "Canal de contato",
                    "description": "Canal de contato do MDM."
                  }
                ],
                "description": "Indica que este registro mestre é um canal de contato.",
                "title": "Subtipo",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 254,
                "description": "Texto pelo qual o organizador reconhece o canal; para este papel, identifica o e-mail informado pelo participante.",
                "title": "Nome de identificação",
                "min": 0,
                "max": 0
              },
              "status": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "Active",
                    "title": "Ativo",
                    "description": "Canal disponível para uso."
                  },
                  {
                    "value": "Inactive",
                    "title": "Inativo",
                    "description": "Canal fora de uso."
                  },
                  {
                    "value": "Merged",
                    "title": "Mesclado",
                    "description": "Canal incorporado a outro registro mestre."
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado",
                    "description": "Canal bloqueado pela plataforma."
                  }
                ],
                "title": "Situação",
                "description": "Situação do registro mestre do canal de e-mail, administrada pela plataforma.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 2,
                "default": "US",
                "description": "Código ISO do país associado ao canal de contato.",
                "title": "País",
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados de identificação e situação do canal de e-mail no MDM."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados base compartilhados do MDM; este papel não utiliza campos adicionais desta seção."
          },
          "contactChannel": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "contactType": {
                "type": "enum",
                "required": true,
                "values": [
                  {
                    "value": "Email",
                    "title": "E-mail",
                    "description": "Endereço de e-mail."
                  }
                ],
                "title": "Tipo de contato",
                "description": "Tipo do canal utilizado na inscrição; neste papel é sempre e-mail.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "value": {
                "type": "string",
                "required": true,
                "description": "Endereço de e-mail informado pelo participante e usado para impedir duplicidade de inscrição no mesmo evento.",
                "title": "E-mail",
                "pattern": "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
                "maxLength": 254,
                "min": 0,
                "max": 0
              },
              "isVerified": {
                "type": "boolean",
                "required": true,
                "title": "E-mail verificado",
                "description": "Indica se a plataforma registrou a verificação deste canal de e-mail.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados do e-mail fornecido pelo participante para realizar inscrições."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Campos promovidos pela organização e somente lidos por este módulo."
          },
          "inscricaoEvento": {
            "type": "object",
            "owner": "module",
            "fields": {},
            "description": "Module namespace; the prompt asked for no data of this module about the record."
          }
        }
      }
    }
  }
} as const satisfies Ns5OntologyEntityV3;

export type InscricaoEventoEntityEmailParticipanteType = typeof inscricaoEventoEntityEmailParticipante;

export default inscricaoEventoEntityEmailParticipante;
