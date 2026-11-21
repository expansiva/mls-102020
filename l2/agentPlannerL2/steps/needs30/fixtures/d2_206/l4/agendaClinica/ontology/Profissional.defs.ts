/// <mls fileReference="_102047_/l4/agendaClinica/ontology/Profissional.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agendaClinicaEntityProfissional = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agendaClinica",
  "entityId": "Profissional",
  "title": "Profissional",
  "description": "Pessoa profissional da clínica, médica ou terapeuta, responsável por sua própria agenda e atendimentos.",
  "displayField": "details.identification.name",
  "relationships": {
    "consultas": {
      "relationshipId": "consultaProfissional",
      "to": "Consulta",
      "via": "Consulta.profissionalId",
      "cardinality": "1:N",
      "title": "Consultas do profissional",
      "description": "Consultas atribuídas a este profissional em sua agenda.",
      "mode": "fk",
      "direction": "to",
      "required": "Sempre que uma consulta for agendada.",
      "role": "profissional responsável"
    }
  },
  "capabilities": {
    "read.byId": "Lê o cadastro mestre de um profissional pelo identificador para exibir seu nome nas consultas e permitir que ele acesse seus próprios dados.",
    "locate.byName": "Localiza profissionais pelo nome para que a recepcionista selecione o responsável ao agendar uma consulta.",
    "locate.byDocument": "Localiza um profissional pelo documento para evitar duplicidade ao cadastrá-lo ou vinculá-lo à agenda clínica.",
    "locate.byTag": "Lista os registros com a função agendaClinica.Profissional para disponibilizar os profissionais da clínica no agendamento.",
    "register.createOrAttach": "Cria ou reutiliza o registro mestre de uma pessoa e o vincula como profissional da agenda clínica, gravando seu tipo de atuação, para a recepcionista autorizada.",
    "edit.platformFields": "Atualiza os dados de identificação permitidos do profissional no registro mestre para a recepcionista autorizada.",
    "edit.moduleNamespace": "Atualiza somente o tipo de atuação em dados da agenda clínica para a recepcionista autorizada.",
    "inactivate": "Inativa ou reativa o profissional no cadastro mestre para impedir ou restabelecer seu uso pela recepcionista autorizada.",
    "invite.login": "Concede ao profissional um convite de acesso para que ele entre no sistema e consulte exclusivamente sua própria agenda diária."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace",
    "rule-person-privacy-consent-required-br-eu"
  ],
  "writer": "crud",
  "kind": "role",
  "subtype": "Person",
  "roleTag": "agendaClinica.Profissional",
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
        "description": "Documento mestre da pessoa profissional, com dados da plataforma e informações próprias da agenda clínica.",
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
                    "description": "Registro de pessoa natural."
                  }
                ],
                "description": "Indica que este registro mestre representa uma pessoa.",
                "title": "Tipo de registro",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 0,
                "description": "Nome pelo qual o profissional é identificado nas agendas e consultas.",
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
                    "description": "Registro disponível para uso."
                  },
                  {
                    "value": "Inactive",
                    "title": "Inativo",
                    "description": "Registro fora de uso."
                  },
                  {
                    "value": "Merged",
                    "title": "Mesclado",
                    "description": "Registro incorporado a outro registro mestre."
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado",
                    "description": "Registro bloqueado pela plataforma."
                  }
                ],
                "title": "Situação no cadastro mestre",
                "description": "Situação de atividade do registro mestre do profissional.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docType": {
                "type": "enum",
                "indexed": true,
                "values": [
                  {
                    "value": "CPF",
                    "title": "CPF",
                    "description": "Cadastro de Pessoas Físicas."
                  },
                  {
                    "value": "Passport",
                    "title": "Passaporte",
                    "description": "Documento de viagem."
                  },
                  {
                    "value": "NationalId",
                    "title": "Documento nacional",
                    "description": "Documento nacional de identificação."
                  },
                  {
                    "value": "Other",
                    "title": "Outro",
                    "description": "Outro documento aceito."
                  }
                ],
                "title": "Tipo de documento",
                "description": "Tipo do documento nacional usado para identificar e evitar duplicidade do profissional.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "Número do documento nacional do profissional, quando informado.",
                "title": "Número do documento",
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
                "description": "Código do país aplicável ao documento e às regras legais do profissional.",
                "title": "País",
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados de identificação da pessoa profissional usados pela clínica."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados básicos compartilhados da plataforma que esta função não utiliza diretamente."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "privacyConsent": {
                "type": "object",
                "of": "PrivacyConsent",
                "description": "Consentimento de privacidade do profissional, quando exigido pelas regras aplicáveis.",
                "title": "Consentimento de privacidade",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados de pessoa natural aplicáveis ao profissional."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Dados promovidos pela organização e somente lidos pela agenda clínica."
          },
          "agendaClinica": {
            "type": "object",
            "owner": "module",
            "fields": {
              "professionalType": {
                "type": "enum",
                "required": true,
                "of": "Address",
                "values": [
                  {
                    "value": "medical",
                    "title": "Médico(a)",
                    "description": "Profissional que atua como médico(a)."
                  },
                  {
                    "value": "therapist",
                    "title": "Terapeuta",
                    "description": "Profissional que atua como terapeuta."
                  }
                ],
                "title": "Tipo de profissional",
                "description": "Indica se o profissional atua como médico ou terapeuta na clínica.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Informações próprias da agenda clínica sobre a atuação deste profissional."
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgendaClinicaEntityProfissionalType = typeof agendaClinicaEntityProfissional;

export default agendaClinicaEntityProfissional;
