/// <mls fileReference="_102047_/l4/financeiro/ontology/Pagador.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const financeiroEntityPagador = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "financeiro",
  "entityId": "Pagador",
  "title": "Pagador",
  "description": "Pessoa pagadora dos títulos a receber e usuária do portal para consultar e pagar os próprios débitos.",
  "displayField": "details.identification.name",
  "relationships": {
    "tituloTemPagador": {
      "relationshipId": "tituloTemPagador",
      "to": "TituloReceber",
      "via": "TituloReceber.pagadorId",
      "cardinality": "1:N",
      "title": "Títulos do pagador",
      "description": "Títulos a receber que pertencem obrigatoriamente a este pagador.",
      "mode": "fk",
      "direction": "to",
      "required": true,
      "role": "pagador"
    },
    "extratoDoPagador": {
      "relationshipId": "extratoDoPagador",
      "to": "ExtratoPagador",
      "via": "ExtratoPagador.pagadorId",
      "cardinality": "1:N",
      "title": "Extratos do pagador",
      "description": "Extratos emitidos para este pagador.",
      "mode": "fk",
      "direction": "to",
      "required": true,
      "role": "destinatário"
    },
    "pagadorTemRecebimentos": {
      "relationshipId": "pagadorTemRecebimentos",
      "to": "Recebimento",
      "via": "Recebimento",
      "cardinality": "1:N",
      "title": "Recebimentos do pagador",
      "description": "Recebimentos obtidos pelos títulos a receber vinculados a este pagador.",
      "mode": "throughTable",
      "path": "Pagador <- TituloReceber.pagadorId; Recebimento.tituloReceberId -> TituloReceber",
      "derived": true,
      "role": "pagador"
    }
  },
  "capabilities": {
    "read.byId": "Consulta um pagador pelo identificador mestre, carregando seu documento cadastral, para o caixa, gerente financeiro e portal do pagador.",
    "locate.byName": "Localiza pagadores pelo nome no índice mestre para o gerente financeiro selecionar a pessoa do extrato.",
    "locate.byDocument": "Localiza um pagador pelo documento nacional para deduplicar seu cadastro antes de vinculá-lo a títulos recebidos de outros módulos.",
    "locate.byContact": "Localiza o pagador pelo canal de contato vinculado na plataforma para caixa e gerente financeiro identificarem a pessoa correta.",
    "register.createOrAttach": "Cria o registro mestre quando ausente ou anexa o papel de Pagador quando já existe, por documento ou contato, para a entrada de cobranças de outros módulos.",
    "edit.platformFields": "Atualiza nome, documento, endereços e consentimento nas camadas da plataforma para quem mantém o cadastro do pagador.",
    "inactivate": "Inativa ou reativa o papel de pagador sem apagar o registro mestre, para quem mantém cadastros financeiros.",
    "listLinks": "Lista os vínculos e referências do pagador para o gerente financeiro conferir seus títulos, extratos e relações cadastradas.",
    "statusHistory.read": "Exibe o histórico de situação do cadastro mestre do pagador para quem mantém o cadastro.",
    "audit": "Consulta quem alterou o cadastro ou o papel financeiro do pagador e quando, para o gerente financeiro autorizado.",
    "invite.login": "Concede ao pagador um login por convite, registrado no índice de login da plataforma, para que ele acesse o portal e veja somente seus dados."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace",
    "rule-person-privacy-consent-required-br-eu"
  ],
  "writer": "inbound",
  "kind": "role",
  "subtype": "Person",
  "roleTag": "financeiro.Pagador",
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
        "description": "Documento mestre da pessoa que paga títulos no contas a receber.",
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
                    "description": "Pessoa natural cadastrada na plataforma."
                  }
                ],
                "description": "Identifica este registro mestre como uma pessoa pagadora.",
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
                "description": "Nome pelo qual o pagador é identificado nos títulos, recebimentos e extratos.",
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
                    "description": "Cadastro fora de uso."
                  },
                  {
                    "value": "Merged",
                    "title": "Mesclado",
                    "description": "Cadastro incorporado a outro registro mestre."
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado",
                    "description": "Cadastro bloqueado pela plataforma."
                  }
                ],
                "title": "Situação do cadastro",
                "description": "Situação mestre do pagador na plataforma.",
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
                    "description": "Documento de viagem da pessoa."
                  },
                  {
                    "value": "NationalId",
                    "title": "Documento nacional",
                    "description": "Documento nacional de identificação."
                  },
                  {
                    "value": "Other",
                    "title": "Outro",
                    "description": "Outro documento aceito pela plataforma."
                  }
                ],
                "title": "Tipo de documento",
                "description": "Tipo do documento nacional usado para identificar e deduplicar o pagador.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "Número do documento nacional do pagador, usado na deduplicação do cadastro.",
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
                "maxLength": 0,
                "default": "US",
                "description": "Código do país que determina as regras aplicáveis ao documento e à privacidade do pagador.",
                "title": "País",
                "min": 0,
                "max": 0
              },
              "tags": {
                "type": "string",
                "required": true,
                "collection": true,
                "derived": true,
                "description": "Etiquetas derivadas pela plataforma, incluindo o papel financeiro.Pagador.",
                "title": "Etiquetas",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados de identificação da pessoa pagadora mantidos pela plataforma."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados básicos da pessoa mantidos pela plataforma; nenhum dado básico adicional é usado especificamente neste papel."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "privacyConsent": {
                "type": "object",
                "of": "PrivacyConsent",
                "description": "Consentimento de privacidade do pagador, exigido pela plataforma para residentes no Brasil e na União Europeia.",
                "title": "Consentimento de privacidade",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados próprios de pessoa natural utilizados para atender às regras de privacidade aplicáveis ao pagador."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Dados promovidos pela organização para uso compartilhado entre módulos; este módulo somente os lê."
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

export type FinanceiroEntityPagadorType = typeof financeiroEntityPagador;

export default financeiroEntityPagador;
