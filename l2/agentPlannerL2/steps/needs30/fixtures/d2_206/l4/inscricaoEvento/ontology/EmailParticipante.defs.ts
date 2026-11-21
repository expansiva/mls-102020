/// <mls fileReference="_102047_/l4/inscricaoEvento/ontology/EmailParticipante.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const inscricaoEventoEntityEmailParticipante = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "inscricaoEvento",
  "entityId": "EmailParticipante",
  "title": "E-mail do participante",
  "description": "Canal de contato de e-mail informado pelo participante na inscrição; é por ele que se identifica a pessoa e se garante uma única inscrição por evento.",
  "displayField": "details.identification.name",
  "relationships": {
    "participante": {
      "relationshipId": "participanteEmail",
      "to": "Participante",
      "via": "HasContact",
      "cardinality": "N:1",
      "title": "Participante dono do e-mail",
      "description": "Pessoa que possui este e-mail, ligada por HasContact no cadastro mestre.",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Lê o e-mail pelo id para preencher a lista de inscritos e o CSV que o organizador baixa.",
    "locate.byContact": "Na inscrição pública, procura o e-mail informado para reaproveitar o participante existente e impedir uma segunda inscrição no mesmo evento.",
    "register.createOrAttach": "Cria o canal de e-mail quando ausente, ou anexa o papel do módulo ao existente, quando o público se inscreve num evento.",
    "link": "Liga o e-mail ao participante por HasContact no momento da inscrição.",
    "listLinks": "Mostra ao organizador a qual participante o e-mail pertence.",
    "edit.platformFields": "Permite ao organizador corrigir um e-mail digitado errado por um inscrito.",
    "inactivate": "Retira de uso um e-mail inválido sem apagar o histórico de inscrições; pode ser reativado.",
    "unlink": "Encerra o vínculo do e-mail com o participante preservando o histórico, quando o organizador corrige o cadastro.",
    "audit": "Registra quem alterou o e-mail e quando, consultado pelo administrador."
  },
  "rules": [
    "rule-contact-value-unique-per-type",
    "rule-identity-never-in-namespace",
    "rule-foreign-namespace-refused",
    "rule-delete-blocked-by-relationships",
    "rule-document-shape-validated",
    "umaInscricaoPorEmailPorEvento"
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
        "writePrecondition": true,
        "description": "Bumped by the engine on every write; optimistic concurrency."
      },
      "details": {
        "type": "object",
        "required": true,
        "description": "The JSONB document, as a map of groups (see groups).",
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
                    "title": "Canal de contato"
                  }
                ],
                "description": "Sempre ContactChannel: o e-mail é um canal de contato do cadastro mestre.",
                "title": "Subtipo"
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 200,
                "description": "Como o e-mail aparece na lista de inscritos; normalmente o próprio endereço de e-mail informado na inscrição.",
                "title": "Nome de exibição"
              },
              "status": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "Active",
                    "title": "Ativo"
                  },
                  {
                    "value": "Inactive",
                    "title": "Inativo"
                  },
                  {
                    "value": "Merged",
                    "title": "Mesclado"
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado"
                  }
                ],
                "title": "Situação no cadastro mestre",
                "description": "Ativo ou inativo no cadastro mestre; não é a situação da inscrição."
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 2,
                "default": "US",
                "description": "País (ISO 3166-1 alfa-2) a que se aplicam as regras de privacidade do contato.",
                "title": "País"
              },
              "createdAt": {
                "type": "string",
                "required": true,
                "indexed": true,
                "derived": true,
                "title": "Criado em",
                "description": "Quando o e-mail foi registrado pela primeira vez no cadastro mestre."
              },
              "updatedAt": {
                "type": "string",
                "required": true,
                "indexed": true,
                "derived": true,
                "title": "Atualizado em",
                "description": "Última alteração do registro do e-mail."
              }
            },
            "description": "Colunas de índice do canal de e-mail do participante."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "relationshipRefs": {
                "type": "object",
                "required": true,
                "derived": true,
                "description": "Chaves compactas recalculadas pelo motor, incluindo o participante que possui este e-mail (HasContact).",
                "title": "Referências de vínculos"
              }
            },
            "description": "Dados comuns do cadastro mestre; este módulo não usa nenhum deles além das referências de vínculo derivadas."
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
                    "title": "E-mail"
                  }
                ],
                "title": "Tipo de contato",
                "description": "Neste módulo é sempre e-mail."
              },
              "value": {
                "type": "string",
                "required": true,
                "description": "Endereço de e-mail com que a pessoa se inscreve; identifica o participante e garante uma única inscrição por evento.",
                "title": "E-mail",
                "pattern": "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$",
                "maxLength": 254
              },
              "isVerified": {
                "type": "boolean",
                "required": true,
                "title": "Verificado",
                "description": "Se a plataforma já confirmou que o e-mail pertence a quem se inscreveu."
              },
              "verifiedAt": {
                "type": "timestamp",
                "title": "Verificado em",
                "description": "Momento em que a plataforma confirmou o e-mail."
              }
            },
            "description": "O e-mail informado pelo participante na página pública do evento."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Campos promovidos pela organização; este módulo apenas lê."
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
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type InscricaoEventoEntityEmailParticipanteType = typeof inscricaoEventoEntityEmailParticipante;

export default inscricaoEventoEntityEmailParticipante;
