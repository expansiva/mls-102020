/// <mls fileReference="_102047_/l4/agendaClinica/ontology/Paciente.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agendaClinicaEntityPaciente = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agendaClinica",
  "entityId": "Paciente",
  "title": "Paciente",
  "description": "Pessoa atendida pela clínica e identificada para receber consultas.",
  "displayField": "details.identification.name",
  "relationships": {
    "consultas": {
      "relationshipId": "consultaPaciente",
      "to": "Consulta",
      "via": "Consulta.pacienteId",
      "cardinality": "1:N",
      "title": "Consultas do paciente",
      "description": "Consultas agendadas para este paciente; cada consulta aponta obrigatoriamente para um paciente.",
      "mode": "fk",
      "direction": "to",
      "required": "Não é obrigatório para o paciente; é obrigatório em cada consulta."
    }
  },
  "capabilities": {
    "read.byId": "Lê o paciente pelo identificador mestre · consulta o índice e o documento mestre pelo mdmId · telas de consulta e a agenda ao exibir o paciente de uma consulta.",
    "locate.byName": "Localiza pacientes pelo nome informado · pesquisa o nome no índice de pessoas · recepcionista ao escolher o paciente para agendar uma consulta.",
    "locate.byDocument": "Localiza um paciente pelo documento nacional · consulta o índice de documento para evitar cadastros duplicados · recepcionista durante o cadastro.",
    "locate.byContact": "Localiza o paciente por telefone ou outro canal de contato · procura o proprietário do ContactChannel vinculado · recepcionista ao confirmar uma consulta por telefone.",
    "register.createOrAttach": "Cadastra ou associa a pessoa já existente ao papel de paciente · procura por documento e cria somente quando ausente, anexando a função agendaClinica.Paciente · recepcionista no cadastro de pacientes.",
    "edit.platformFields": "Atualiza os dados de identificação e os dados pessoais permitidos do paciente · altera os campos da plataforma e atualiza o índice quando necessário · recepcionista ao manter o cadastro.",
    "inactivate": "Inativa ou reativa o cadastro do paciente sem apagá-lo · muda a situação mestre entre ativo e inativo · recepcionista ao retirar ou devolver um paciente ao uso.",
    "link.contact": "Vincula um telefone ou outro canal de contato ao paciente · cria um ContactChannel e o relaciona por HasContact · recepcionista para viabilizar a confirmação telefônica.",
    "listLinks": "Lista os vínculos ativos e históricos do paciente · consulta os relacionamentos versionados do registro mestre · recepcionista ao consultar os contatos e as relações do paciente.",
    "statusHistory.read": "Mostra o histórico de mudanças de situação do paciente · consulta o histórico de status do MDM · recepcionista ao verificar quando o cadastro foi inativado ou reativado."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace",
    "rule-person-privacy-consent-required-br-eu"
  ],
  "kind": "role",
  "subtype": "Person",
  "roleTag": "agendaClinica.Paciente",
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
        "description": "Documento mestre da pessoa atendida pela clínica, com os dados da plataforma e o espaço próprio da agenda clínica.",
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
                    "description": "Pessoa física cadastrada na plataforma."
                  }
                ],
                "description": "Indica que este registro mestre é uma pessoa.",
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
                "description": "Nome pelo qual o paciente é identificado e localizado pela recepcionista.",
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
                    "description": "Cadastro disponível para uso."
                  },
                  {
                    "value": "Inactive",
                    "title": "Inativo",
                    "description": "Cadastro retirado de uso."
                  },
                  {
                    "value": "Merged",
                    "title": "Mesclado",
                    "description": "Cadastro unido a outro registro mestre."
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado",
                    "description": "Cadastro bloqueado pela plataforma."
                  }
                ],
                "title": "Situação do cadastro",
                "description": "Situação mestre do paciente, usada para impedir o uso de cadastros inativos, mesclados ou bloqueados.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docType": {
                "type": "enum",
                "indexed": true,
                "values": [
                  {
                    "value": "SSN",
                    "title": "SSN",
                    "description": "Social Security Number."
                  },
                  {
                    "value": "EIN",
                    "title": "EIN",
                    "description": "Employer Identification Number."
                  },
                  {
                    "value": "Passport",
                    "title": "Passaporte",
                    "description": "Documento de viagem."
                  },
                  {
                    "value": "DriversLicense",
                    "title": "Carteira de habilitação",
                    "description": "Documento de habilitação."
                  },
                  {
                    "value": "NationalId",
                    "title": "Documento nacional",
                    "description": "Documento nacional de identidade."
                  },
                  {
                    "value": "CPF",
                    "title": "CPF",
                    "description": "Cadastro de Pessoas Físicas."
                  },
                  {
                    "value": "CNPJ",
                    "title": "CNPJ",
                    "description": "Cadastro Nacional da Pessoa Jurídica."
                  },
                  {
                    "value": "VAT",
                    "title": "Identificação fiscal",
                    "description": "Identificação fiscal estrangeira."
                  },
                  {
                    "value": "Other",
                    "title": "Outro",
                    "description": "Outro documento de identificação."
                  }
                ],
                "title": "Tipo de documento",
                "description": "Tipo do documento nacional usado para identificar e deduplicar o paciente quando informado.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "Número do documento nacional informado para identificar o paciente e evitar duplicidade.",
                "title": "Número do documento",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados de identificação da pessoa usados pela clínica para localizar e reconhecer o paciente."
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
                "description": "Resumo derivado dos canais de contato vinculados ao paciente, consultado para a confirmação telefônica da consulta.",
                "title": "Contatos",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados comuns do registro mestre utilizados pela clínica."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "privacyConsent": {
                "type": "object",
                "of": "PrivacyConsent",
                "description": "Consentimento de privacidade do paciente, exigido pela plataforma para residentes no Brasil e na União Europeia.",
                "title": "Consentimento de privacidade",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados pessoais do paciente mantidos pela plataforma."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Dados promovidos pela organização para uso compartilhado entre módulos; a agenda clínica apenas os lê."
          },
          "agendaClinica": {
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

export type AgendaClinicaEntityPacienteType = typeof agendaClinicaEntityPaciente;

export default agendaClinicaEntityPaciente;
