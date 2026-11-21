/// <mls fileReference="_102047_/l4/mensalidadesAcademia/ontology/Recepcao.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaEntityRecepcao = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "mensalidadesAcademia",
  "entityId": "Recepcao",
  "title": "Atendente da recepção",
  "description": "Pessoa da recepção que registra matrículas; usada para delimitar as matrículas atribuídas a ela.",
  "displayField": "details.identification.name",
  "relationships": {
    "matriculas": {
      "relationshipId": "matriculaRecepcao",
      "to": "Matricula",
      "via": "Matricula.recepcaoId",
      "cardinality": "1:N",
      "title": "Matrículas registradas",
      "description": "Matrículas que este atendente da recepção registrou; delimita as matrículas atribuídas a ele.",
      "mode": "fk",
      "direction": "to"
    }
  },
  "capabilities": {
    "read.byId": "Lê o atendente pelo id para exibir seu nome nas matrículas que ele registrou; usado pelas telas de matrícula.",
    "locate.byName": "Busca o atendente pelo nome no índice, filtrando pessoas com o papel de recepção; usado pela gerência ao manter a equipe.",
    "locate.byDocument": "Localiza o atendente pelo CPF antes de cadastrá-lo, evitando duplicidade; usado pela gerência.",
    "locate.byLogin": "Resolve, pelo e-mail de login da sessão, qual atendente está registrando a matrícula; usado pela plataforma.",
    "register.createOrAttach": "Cadastra o atendente ou anexa o papel de recepção a uma pessoa já existente no cadastro mestre; usado pela gerência.",
    "edit.platformFields": "Atualiza nome, documento e consentimento do atendente; usado pela gerência.",
    "inactivate": "Inativa o atendente que deixou a recepção, mantendo o histórico das matrículas que registrou; usado pela gerência.",
    "link.contact": "Adiciona telefone ou e-mail do atendente como canal de contato vinculado; usado pela gerência.",
    "listLinks": "Mostra os vínculos do atendente, como contatos e matrículas registradas; usado na ficha do atendente.",
    "invite.login": "Concede login ao atendente para que acesse o módulo como recepção; usado pela gerência.",
    "audit": "Mostra quem alterou o cadastro do atendente e quando; usado pela gerência."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-identity-never-in-namespace",
    "rule-document-shape-validated",
    "rule-person-privacy-consent-required-br-eu",
    "rule-delete-blocked-by-relationships"
  ],
  "writer": "crud",
  "kind": "role",
  "subtype": "Person",
  "roleTag": "mensalidadesAcademia.Recepcao",
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
                    "value": "Person",
                    "title": "Pessoa"
                  }
                ],
                "description": "Sempre pessoa física para o atendente da recepção.",
                "title": "Subtipo"
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 200,
                "description": "Nome do atendente da recepção, mostrado nas matrículas que ele registrou.",
                "title": "Nome"
              },
              "status": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  "Active",
                  "Inactive",
                  "Merged",
                  "Blocked"
                ],
                "title": "Situação no cadastro",
                "description": "Situação do cadastro mestre do atendente (ativo ou inativo)."
              },
              "docType": {
                "type": "enum",
                "indexed": true,
                "values": [
                  {
                    "value": "CPF",
                    "title": "CPF"
                  },
                  {
                    "value": "Passport",
                    "title": "Passaporte"
                  },
                  {
                    "value": "NationalId",
                    "title": "Documento nacional"
                  },
                  {
                    "value": "Other",
                    "title": "Outro"
                  }
                ],
                "title": "Tipo de documento",
                "description": "Tipo do documento nacional do atendente, usado para evitar cadastro duplicado."
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "Número do documento nacional do atendente.",
                "title": "Número do documento"
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 2,
                "default": "US",
                "description": "País do documento e das regras legais aplicáveis ao atendente.",
                "title": "País"
              }
            },
            "description": "Identificação da pessoa que trabalha na recepção da academia."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "aliases": {
                "type": "string",
                "required": true,
                "collection": true,
                "description": "Outros nomes pelos quais o atendente é conhecido na academia.",
                "title": "Apelidos"
              },
              "contacts": {
                "type": "object",
                "required": true,
                "collection": true,
                "of": "ContactSummary",
                "derived": true,
                "description": "Resumo dos canais de contato do atendente, vinculados como registros próprios.",
                "title": "Contatos"
              }
            },
            "description": "Dados comuns do cadastro mestre que a recepção consulta."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "privacyConsent": {
                "type": "object",
                "of": "PrivacyConsent",
                "description": "Consentimento LGPD do atendente para tratamento dos seus dados pessoais.",
                "title": "Consentimento de privacidade"
              }
            },
            "description": "Dados de pessoa física do atendente."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Campos promovidos pela organização; apenas leitura neste módulo."
          },
          "mensalidadesAcademia": {
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

export type MensalidadesAcademiaEntityRecepcaoType = typeof mensalidadesAcademiaEntityRecepcao;

export default mensalidadesAcademiaEntityRecepcao;
