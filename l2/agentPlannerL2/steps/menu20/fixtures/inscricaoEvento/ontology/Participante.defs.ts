/// <mls fileReference="_102047_/l4/inscricaoEvento/ontology/Participante.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const inscricaoEventoEntityParticipante = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "inscricaoEvento",
  "entityId": "Participante",
  "title": "Participante",
  "description": "Pessoa participante identificada no cadastro mestre para realizar ou manter uma inscrição em evento.",
  "displayField": "details.identification.name",
  "relationships": {
    "participanteDaInscricao": {
      "relationshipId": "participanteDaInscricao",
      "to": "Inscricao",
      "via": "Inscricao.participanteId",
      "cardinality": "1:N",
      "title": "Inscrições do participante",
      "description": "Inscrições em eventos que identificam esta pessoa participante.",
      "mode": "fk",
      "direction": "to",
      "required": "ao criar ou manter uma inscrição",
      "role": "participante"
    },
    "contatoDoParticipante": {
      "relationshipId": "contatoDoParticipante",
      "to": "EmailParticipante",
      "via": "HasContact",
      "cardinality": "1:N",
      "title": "E-mails do participante",
      "description": "Canais de contato vinculados à pessoa participante, incluindo o e-mail utilizado para a inscrição.",
      "required": "ao realizar uma inscrição",
      "role": "titular"
    }
  },
  "capabilities": {
    "read.byId": "Consulta um participante pelo identificador mestre para apresentar seus dados na inscrição; usa leitura direta pelo mdmId; utilizado pelo organizador e pelos fluxos de inscrição.",
    "locate.byContact": "Localiza a pessoa participante pelo e-mail já vinculado como canal de contato para evitar duplicidade de pessoa; usa a busca de proprietário do ContactChannel; utilizado pelo público ao se inscrever e pelo fluxo de inscrição.",
    "register.createOrAttach": "Cria ou vincula a pessoa participante encontrada pelo contato disponível e anexa o papel do módulo; usa criação ou associação no cadastro mestre seguida da marca de papel; utilizado pelo público durante a inscrição.",
    "register.asProspect": "Registra uma pessoa interessada sem documento nacional para permitir a inscrição pública com nome e e-mail; usa cadastro de prospecto no MDM; utilizado pelo público na página publicada do evento.",
    "link.contact": "Vincula o e-mail informado pela pessoa ao seu cadastro mestre; cria ou associa o ContactChannel por HasContact; utilizado pelo público durante a inscrição.",
    "listLinks": "Lista os canais de contato vinculados ao participante para conferir o e-mail associado; usa consulta de relacionamentos ativos; utilizado pelos fluxos de inscrição.",
    "edit.platformFields": "Atualiza os dados de identificação permitidos da pessoa participante quando necessário; usa atualização do cadastro mestre e do índice de identificação; utilizado pelo organizador.",
    "edit.moduleNamespace": "Mantém exclusivamente o espaço do módulo no cadastro mestre do participante quando houver dado específico autorizado; usa atualização de details.inscricaoEvento; utilizado pelo módulo de inscrições.",
    "inactivate": "Inativa ou reativa o cadastro mestre do participante sem removê-lo; usa a alteração de situação do MDM; utilizado pelo organizador quando a pessoa não puder mais ser usada.",
    "audit": "Consulta quem alterou os dados do cadastro mestre do participante e quando; usa o histórico de auditoria do MDM; utilizado pelo organizador para acompanhamento administrativo."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace",
    "rule-person-privacy-consent-required-br-eu"
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
        "description": "Bumped by the engine on every write; optimistic concurrency."
      },
      "details": {
        "type": "object",
        "required": true,
        "description": "Documento mestre da pessoa participante, com dados de identificação, dados de pessoa e o espaço exclusivo do módulo de inscrições.",
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
                    "title": "Pessoa",
                    "description": "Pessoa física no cadastro mestre."
                  }
                ],
                "description": "Indica que este cadastro mestre é uma pessoa participante.",
                "title": "Tipo de cadastro",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 0,
                "description": "Nome pelo qual a pessoa participante é identificada na inscrição do evento.",
                "title": "Nome",
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
                    "description": "Cadastro mestre disponível para uso."
                  },
                  {
                    "value": "Inactive",
                    "title": "Inativo",
                    "description": "Cadastro mestre fora de uso."
                  },
                  {
                    "value": "Merged",
                    "title": "Mesclado",
                    "description": "Cadastro mestre unido a outro cadastro."
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado",
                    "description": "Cadastro mestre bloqueado pela plataforma."
                  }
                ],
                "title": "Situação do cadastro",
                "description": "Situação de atividade do cadastro mestre da pessoa participante.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 0,
                "default": "US",
                "description": "Código ISO do país aplicável aos dados e regras da pessoa participante.",
                "title": "País",
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados de identificação da pessoa participante no cadastro mestre."
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
                "description": "Resumo derivado dos canais de contato vinculados à pessoa, incluindo o e-mail usado na inscrição.",
                "title": "Canais de contato",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "relationshipRefs": {
                "type": "object",
                "required": true,
                "derived": true,
                "description": "Referências derivadas dos relacionamentos ativos da pessoa participante.",
                "title": "Referências de relacionamentos",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados básicos de plataforma usados para relacionar a pessoa participante ao seu e-mail de inscrição."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados próprios de pessoa física disponíveis no cadastro mestre."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Dados promovidos pela organização para uso comum entre módulos; este módulo apenas os consulta."
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

export type InscricaoEventoEntityParticipanteType = typeof inscricaoEventoEntityParticipante;

export default inscricaoEventoEntityParticipante;
