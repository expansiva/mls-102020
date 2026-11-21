/// <mls fileReference="_102047_/l4/inscricaoEvento/ontology/Participante.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const inscricaoEventoEntityParticipante = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "inscricaoEvento",
  "entityId": "Participante",
  "title": "Participante",
  "description": "Pessoa do público que se inscreve em eventos informando nome e e-mail; é criada ou associada ao registro mestre pelo e-mail no momento da inscrição.",
  "displayField": "details.identification.name",
  "relationships": {
    "inscricoes": {
      "relationshipId": "inscricaoParticipante",
      "to": "Inscricao",
      "via": "Inscricao.participanteId",
      "cardinality": "1:N",
      "title": "Inscrições do participante",
      "description": "Inscrições feitas por esta pessoa; no máximo uma por evento.",
      "mode": "fk",
      "direction": "to",
      "required": true
    },
    "emails": {
      "relationshipId": "participanteEmail",
      "to": "EmailParticipante",
      "via": "HasContact",
      "cardinality": "1:N",
      "title": "E-mail do participante",
      "description": "E-mail informado na inscrição, registrado como canal de contato (HasContact).",
      "required": "sempre que a pessoa se inscreve"
    },
    "eventos": {
      "relationshipId": "eventosDoParticipante",
      "to": "Evento",
      "via": "Inscricao",
      "cardinality": "N:N",
      "title": "Eventos do participante",
      "description": "Eventos em que a pessoa está inscrita, obtidos pelas suas inscrições.",
      "mode": "throughTable",
      "path": "Participante <- Inscricao.participanteId -> Inscricao.eventoId -> Evento",
      "derived": true
    }
  },
  "capabilities": {
    "read.byId": "Lê o participante pelo mdmId para preencher nome e e-mail na lista de inscritos e no CSV que o organizador baixa.",
    "locate.byContact": "Encontra a pessoa dona do e-mail digitado na página pública, para reaproveitar o registro mestre em vez de duplicá-lo a cada inscrição.",
    "locate.byName": "Permite ao organizador procurar um inscrito pelo nome dentro do cadastro.",
    "register.createOrAttach": "Na inscrição pelo público, cria a pessoa quando o e-mail não existe e, em qualquer caso, marca o papel inscricaoEvento.Participante.",
    "link.contact": "Registra o e-mail informado na inscrição como canal de contato ligado por HasContact.",
    "listLinks": "Mostra ao organizador os canais de contato ligados ao participante.",
    "edit.platformFields": "Permite ao organizador corrigir o nome de um participante digitado errado na inscrição.",
    "inactivate": "Retira o papel de participante de uso sem apagá-lo, podendo ser reativado numa nova inscrição.",
    "comment": "O organizador deixa observações sobre o participante, como pedidos especiais.",
    "tag": "O organizador marca participantes com rótulos livres dentro do namespace do módulo.",
    "statusHistory.read": "Mostra quando o cadastro do participante foi ativado ou inativado e por quem.",
    "audit": "Informa quem alterou os dados do participante e quando."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-identity-never-in-namespace",
    "rule-document-shape-validated",
    "rule-person-privacy-consent-required-br-eu",
    "rule-delete-blocked-by-relationships",
    "umaInscricaoPorEmailPorEvento"
  ],
  "kind": "role",
  "subtype": "Person",
  "roleTag": "inscricaoEvento.Participante",
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
        "description": "Registro mestre da pessoa que se inscreve em eventos, como o MDM o guarda e devolve.",
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
                    "value": "Person",
                    "title": "Pessoa"
                  }
                ],
                "description": "Sempre Person: o participante é uma pessoa física.",
                "title": "Subtipo"
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 200,
                "description": "Nome informado pela pessoa na página pública do evento ao se inscrever; é como o organizador a reconhece na lista de inscritos e no CSV.",
                "title": "Nome"
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
                "title": "Situação no cadastro",
                "description": "Situação do registro mestre (ativo ou inativo); não é a situação da inscrição, que vive na própria inscrição."
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 2,
                "default": "US",
                "description": "País da pessoa (ISO 3166-1 alfa-2), que define as regras de privacidade aplicáveis à inscrição.",
                "title": "País"
              },
              "tags": {
                "type": "string",
                "required": true,
                "collection": true,
                "derived": true,
                "description": "Papéis de módulo do registro; inclui inscricaoEvento.Participante, gravado na primeira inscrição.",
                "title": "Papéis"
              },
              "createdAt": {
                "type": "string",
                "required": true,
                "indexed": true,
                "derived": true,
                "title": "Criado em",
                "description": "Momento em que a pessoa entrou no cadastro mestre."
              },
              "updatedAt": {
                "type": "string",
                "required": true,
                "indexed": true,
                "derived": true,
                "title": "Atualizado em",
                "description": "Momento da última alteração do cadastro."
              }
            },
            "description": "Colunas de índice da plataforma usadas para localizar o participante."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "contacts": {
                "type": "object",
                "required": true,
                "collection": true,
                "of": "ContactSummary",
                "derived": true,
                "description": "Resumo dos canais de contato ligados por HasContact; aqui aparece o e-mail com que a pessoa se inscreveu, exibido na lista de inscritos e no CSV.",
                "title": "Contatos"
              }
            },
            "description": "Dados comuns a todo registro mestre que o módulo lê."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "privacyConsent": {
                "type": "object",
                "of": "PrivacyConsent",
                "description": "Consentimento LGPD/GDPR dado pela pessoa ao enviar seus dados na página pública de inscrição.",
                "title": "Consentimento de privacidade"
              }
            },
            "description": "Ramo de pessoa física da plataforma."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Campos promovidos pela organização; o módulo apenas lê."
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

export type InscricaoEventoEntityParticipanteType = typeof inscricaoEventoEntityParticipante;

export default inscricaoEventoEntityParticipante;
