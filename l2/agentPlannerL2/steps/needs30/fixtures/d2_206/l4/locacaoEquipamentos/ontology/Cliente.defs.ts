/// <mls fileReference="_102047_/l4/locacaoEquipamentos/ontology/Cliente.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const locacaoEquipamentosEntityCliente = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "locacaoEquipamentos",
  "entityId": "Cliente",
  "title": "Cliente",
  "description": "Pessoa do cadastro mestre da organização que aluga equipamentos; localizada por nome ou documento e cadastrada pelo atendente quando ainda não existe.",
  "displayField": "details.identification.name",
  "relationships": {
    "contratos": {
      "relationshipId": "contratoCliente",
      "to": "ContratoLocacao",
      "via": "ContratoLocacao.clienteId",
      "cardinality": "1:N",
      "title": "Contratos de locação do cliente",
      "description": "Cada contrato de locação pertence a um cliente; um cliente pode ter vários contratos.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Lê o cliente pelo identificador para exibir nome e documento no contrato de locação; usado pelas telas de contrato do atendente e do gerente.",
    "locate.byName": "Localiza o cliente pelo nome digitado no início da criação do contrato; usado pelo atendente.",
    "locate.byDocument": "Localiza o cliente pelo CPF ou outro documento antes de cadastrar, evitando duplicidade; usado pelo atendente.",
    "locate.byContact": "Localiza o cliente por telefone ou e-mail quando ele entra em contato; usado pelo atendente.",
    "register.createOrAttach": "Cadastra o cliente quando não existe ou anexa o papel locacaoEquipamentos.Cliente a uma pessoa já existente; usado pelo atendente ao criar o contrato.",
    "edit.platformFields": "Corrige nome, documento, endereços e consentimento do cliente; usado pelo atendente.",
    "inactivate": "Inativa o cliente que não deve mais alugar, sem apagar o histórico de contratos, e permite reativá-lo; usado pelo gerente.",
    "link.contact": "Adiciona telefone, WhatsApp ou e-mail do cliente como canal de contato vinculado; usado pelo atendente.",
    "listLinks": "Mostra os vínculos do cliente, como seus canais de contato, na ficha do cliente; usado pelo atendente e pelo gerente.",
    "attach.document": "Anexa cópia do documento ou comprovante de endereço do cliente; usado pelo atendente.",
    "comment": "Registra observações sobre o cliente, como restrições ou preferências de retirada; usado pelo atendente e pelo gerente.",
    "audit": "Mostra quem alterou o cadastro do cliente e quando; consultado pelo gerente."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-identity-never-in-namespace",
    "rule-document-shape-validated",
    "rule-delete-blocked-by-relationships",
    "rule-person-privacy-consent-required-br-eu",
    "clienteInativoNaoLoca"
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
        "writePrecondition": true,
        "description": "Bumped by the engine on every write; optimistic concurrency."
      },
      "details": {
        "type": "object",
        "required": true,
        "description": "Registro mestre da pessoa que aluga equipamentos.",
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
                "description": "Sempre pessoa física para o cliente da locadora.",
                "title": "Subtipo"
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 200,
                "description": "Nome do cliente, usado pelo atendente para localizá-lo ao criar o contrato.",
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
                "title": "Situação cadastral",
                "description": "Situação do registro mestre; cliente inativo não é oferecido para novos contratos."
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
                    "title": "Documento de identidade"
                  },
                  {
                    "value": "Other",
                    "title": "Outro"
                  }
                ],
                "title": "Tipo de documento",
                "description": "Tipo do documento nacional do cliente, usado para localizar e deduplicar.",
                "required": true
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "Número do documento informado pelo atendente ao cadastrar ou buscar o cliente.",
                "title": "Número do documento",
                "required": true
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 2,
                "default": "US",
                "description": "País do documento e das regras de privacidade aplicáveis (ISO 3166-1 alfa-2).",
                "title": "País"
              },
              "tags": {
                "type": "string",
                "required": true,
                "collection": true,
                "derived": true,
                "description": "Papéis do registro nos módulos; inclui locacaoEquipamentos.Cliente.",
                "title": "Papéis"
              },
              "createdAt": {
                "type": "string",
                "required": true,
                "indexed": true,
                "derived": true,
                "title": "Criado em",
                "description": "Momento em que o registro mestre foi criado."
              },
              "updatedAt": {
                "type": "string",
                "required": true,
                "indexed": true,
                "derived": true,
                "title": "Atualizado em",
                "description": "Momento da última alteração do registro mestre."
              }
            },
            "description": "Dados de identificação do cliente, usados para localizá-lo e evitar duplicidade."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "addresses": {
                "type": "object",
                "required": true,
                "collection": true,
                "of": "Address",
                "title": "Endereços",
                "description": "Endereços do cliente, consultados pelo atendente ao formalizar a locação."
              },
              "contacts": {
                "type": "object",
                "required": true,
                "collection": true,
                "of": "ContactSummary",
                "derived": true,
                "description": "Resumo dos canais de contato vinculados ao cliente, usado para falar com ele sobre retirada e devolução.",
                "title": "Contatos"
              },
              "relationshipRefs": {
                "type": "object",
                "required": true,
                "derived": true,
                "description": "Chaves compactas dos vínculos do cliente, recalculadas pela plataforma.",
                "title": "Vínculos"
              }
            },
            "description": "Dados comuns do registro mestre usados pela locadora."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "privacyConsent": {
                "type": "object",
                "of": "PrivacyConsent",
                "description": "Consentimento LGPD do cliente para o tratamento de seus dados pela locadora.",
                "title": "Consentimento de privacidade"
              }
            },
            "description": "Dados de pessoa física do cliente."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Campos promovidos pela organização; lidos, não declarados aqui."
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
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type LocacaoEquipamentosEntityClienteType = typeof locacaoEquipamentosEntityCliente;

export default locacaoEquipamentosEntityCliente;
