/// <mls fileReference="_102047_/l4/locacaoEquipamentos/ontology/Cliente.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const locacaoEquipamentosEntityCliente = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "locacaoEquipamentos",
  "entityId": "Cliente",
  "title": "Cliente",
  "description": "Pessoa cadastrada no MDM que celebra contratos de locação de equipamentos.",
  "displayField": "details.identification.name",
  "relationships": {
    "contratosLocacao": {
      "relationshipId": "clienteContratosLocacao",
      "to": "ContratoLocacao",
      "via": "ContratoLocacao.clienteId",
      "cardinality": "1:N",
      "title": "Contratos de locação do cliente",
      "description": "Contratos de locação celebrados pelo cliente; cada contrato pertence a um único cliente.",
      "mode": "fk",
      "required": "ao criar um contrato de locação",
      "role": "cliente"
    }
  },
  "capabilities": {
    "read.byId": "Lê o cadastro mestre pelo identificador MDM para exibir o cliente do contrato · consulta direta por id no índice e documento MDM · atendente e gerente.",
    "locate.byName": "Localiza clientes pelo nome informado ao abrir uma locação · busca por nome no índice de pessoas · atendente.",
    "locate.byDocument": "Localiza um cliente pelo documento nacional para evitar cadastro duplicado · consulta por tipo e número de documento no MDM · atendente.",
    "register.createOrAttach": "Cria a pessoa no MDM quando ausente ou anexa a função de Cliente quando já existe · deduplicação por documento e inclusão da tag locacaoEquipamentos.Cliente · atendente ao criar contrato.",
    "edit.platformFields": "Atualiza os dados de identificação do cliente mantidos pela plataforma · atualização do documento mestre e do índice de identificação · atendente.",
    "inactivate": "Inativa ou reativa o cliente sem apagar seu histórico de contratos · alteração do status MDM · gerente.",
    "listLinks": "Exibe os contratos de locação vinculados ao cliente · leitura da relação clienteContratosLocacao pelo vínculo de chave estrangeira · atendente e gerente.",
    "comment": "Registra observações sobre o cadastro do cliente · comentário ancorado no registro MDM do cliente · atendente e gerente.",
    "audit": "Consulta quem alterou o cadastro mestre do cliente e quando · leitura da trilha de auditoria do MDM · gerente.",
    "statusHistory.read": "Exibe as mudanças de situação do cadastro do cliente · leitura do histórico de status do MDM · gerente."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace",
    "rule-person-privacy-consent-required-br-eu"
  ],
  "kind": "role",
  "subtype": "Person",
  "roleTag": "locacaoEquipamentos.Cliente",
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
        "description": "Documento mestre da pessoa cliente utilizado pela locadora.",
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
                    "description": "Pessoa física cadastrada como cliente."
                  }
                ],
                "description": "Indica que este registro mestre representa uma pessoa.",
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
                "description": "Nome pelo qual o cliente é identificado ao localizar e celebrar contratos de locação.",
                "title": "Nome",
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
                    "description": "Cadastro de Pessoa Física."
                  },
                  {
                    "value": "NationalId",
                    "title": "Documento nacional",
                    "description": "Documento nacional de identificação."
                  },
                  {
                    "value": "Passport",
                    "title": "Passaporte",
                    "description": "Documento de viagem do cliente."
                  },
                  {
                    "value": "Other",
                    "title": "Outro",
                    "description": "Outro documento de identificação aceito."
                  }
                ],
                "title": "Tipo de documento",
                "description": "Tipo do documento nacional usado para identificar e evitar duplicidade de cliente.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "Número do documento nacional do cliente para identificação e deduplicação.",
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
                "description": "Código ISO do país aplicável ao documento e às regras do cliente.",
                "title": "País",
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados de identificação do cliente mantidos pela plataforma MDM."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados básicos da plataforma MDM que não são necessários nesta locação."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "privacyConsent": {
                "type": "object",
                "of": "PrivacyConsent",
                "description": "Consentimento de privacidade do cliente, aplicado quando exigido pelas regras de proteção de dados.",
                "title": "Consentimento de privacidade",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados pessoais da plataforma aplicáveis ao cliente."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Dados promovidos pela organização, somente para leitura neste módulo."
          },
          "locacaoEquipamentos": {
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

export type LocacaoEquipamentosEntityClienteType = typeof locacaoEquipamentosEntityCliente;

export default locacaoEquipamentosEntityCliente;
