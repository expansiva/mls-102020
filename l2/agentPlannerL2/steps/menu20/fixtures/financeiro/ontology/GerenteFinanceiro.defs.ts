/// <mls fileReference="_102047_/l4/financeiro/ontology/GerenteFinanceiro.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const financeiroEntityGerenteFinanceiro = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "financeiro",
  "entityId": "GerenteFinanceiro",
  "title": "Gerente financeiro",
  "description": "Pessoa da organização que exerce o papel de gerente financeiro e é a referência pessoal para o escopo de suas ações no módulo.",
  "displayField": "details.identification.name",
  "relationships": {},
  "capabilities": {
    "read.byId": "Lê o gerente financeiro pelo identificador mestre para apresentar a referência pessoal em telas do módulo; usado pelo módulo financeiro.",
    "locate.byName": "Localiza pessoas pelo nome para selecionar ou conferir o gerente financeiro; usado por administradores internos autorizados.",
    "locate.byDocument": "Localiza a pessoa pelo documento nacional antes de criar ou vincular o papel de gerente financeiro; usado por administradores internos autorizados.",
    "register.createOrAttach": "Cria a pessoa quando não existir ou anexa o papel financeiro.GerenteFinanceiro à pessoa já identificada pelo documento; usado por administradores internos autorizados.",
    "edit.platformFields": "Atualiza os dados de identificação da pessoa mantidos pela plataforma, preservando o papel de gerente financeiro; usado por administradores internos autorizados.",
    "edit.moduleNamespace": "Atualiza exclusivamente o namespace financeiro do gerente financeiro, que permanece sem dados específicos neste módulo; usado pelo módulo financeiro.",
    "inactivate": "Inativa ou reativa o registro mestre do gerente financeiro sem excluir seu histórico; usado por administradores internos autorizados.",
    "audit": "Consulta quem alterou os dados mestres do gerente financeiro e quando; usado por administradores internos autorizados.",
    "invite.login": "Concede convite de acesso à pessoa que atua como gerente financeiro para que possa autenticar-se na plataforma; usado por administradores internos autorizados."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace",
    "rule-person-ssn-unique-for-us",
    "rule-person-privacy-consent-required-br-eu"
  ],
  "writer": "crud",
  "kind": "role",
  "subtype": "Person",
  "roleTag": "financeiro.GerenteFinanceiro",
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
        "description": "Documento mestre da pessoa que exerce o papel de gerente financeiro no módulo.",
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
                    "description": "Pessoa natural."
                  }
                ],
                "description": "Indica que este registro mestre é uma pessoa.",
                "title": "Subtipo",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 0,
                "description": "Nome pelo qual o gerente financeiro é identificado no módulo.",
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
                    "description": "Registro mestre ativo."
                  },
                  {
                    "value": "Inactive",
                    "title": "Inativo",
                    "description": "Registro mestre inativo."
                  },
                  {
                    "value": "Merged",
                    "title": "Mesclado",
                    "description": "Registro mestre incorporado a outro."
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado",
                    "description": "Registro mestre bloqueado."
                  }
                ],
                "title": "Situação",
                "description": "Situação do registro mestre da pessoa.",
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
                    "description": "Número de seguridade social dos Estados Unidos."
                  },
                  {
                    "value": "Passport",
                    "title": "Passaporte",
                    "description": "Passaporte."
                  },
                  {
                    "value": "DriversLicense",
                    "title": "Carteira de motorista",
                    "description": "Documento de habilitação."
                  },
                  {
                    "value": "NationalId",
                    "title": "Documento nacional",
                    "description": "Documento nacional de identificação."
                  },
                  {
                    "value": "CPF",
                    "title": "CPF",
                    "description": "Cadastro de Pessoas Físicas."
                  }
                ],
                "title": "Tipo de documento",
                "description": "Tipo do documento nacional usado para identificar e deduplicar o gerente financeiro.",
                "required": true,
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "Número do documento usado para identificar e deduplicar o gerente financeiro.",
                "title": "Número do documento",
                "required": true,
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
                "description": "Código ISO do país que rege o documento e as regras aplicáveis ao gerente financeiro.",
                "title": "País",
                "min": 0,
                "max": 0
              },
              "tags": {
                "type": "string",
                "required": true,
                "collection": true,
                "derived": true,
                "description": "Etiquetas derivadas, incluindo o papel financeiro.GerenteFinanceiro.",
                "title": "Etiquetas",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados de identificação da pessoa usados para reconhecer e manter seu papel no módulo financeiro."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados base compartilhados da pessoa; este papel não precisa declarar campos adicionais nesta camada."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados próprios de pessoa natural; este papel não precisa declarar campos adicionais nesta camada."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Dados promovidos pela organização, lidos pelo módulo financeiro e definidos no registro da organização."
          },
          "financeiro": {
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

export type FinanceiroEntityGerenteFinanceiroType = typeof financeiroEntityGerenteFinanceiro;

export default financeiroEntityGerenteFinanceiro;
