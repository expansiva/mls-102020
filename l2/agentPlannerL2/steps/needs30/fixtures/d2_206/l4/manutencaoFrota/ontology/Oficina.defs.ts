/// <mls fileReference="_102047_/l4/manutencaoFrota/ontology/Oficina.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaEntityOficina = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "manutencaoFrota",
  "entityId": "Oficina",
  "title": "Oficina",
  "description": "Empresa que executa as ordens de manutenção dos veículos.",
  "displayField": "details.identification.name",
  "relationships": {
    "ordens": {
      "relationshipId": "ordemOficina",
      "to": "OrdemManutencao",
      "via": "OrdemManutencao.oficinaId",
      "cardinality": "1:N",
      "title": "Ordens de manutenção executadas",
      "description": "Ordens de manutenção executadas nesta oficina.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Lê a oficina pelo id para exibir seu nome nas ordens de manutenção; usado pelas telas do gestor.",
    "locate.byName": "Localiza a oficina pelo nome ao escolher onde a ordem de manutenção será executada; usado pelo gestor.",
    "locate.byDocument": "Localiza a oficina pelo CNPJ antes de cadastrar, evitando duplicidade; usado pelo gestor.",
    "register.createOrAttach": "Cadastra a oficina ou vincula uma empresa já existente com o papel manutencaoFrota.Oficina; usado pelo gestor.",
    "edit.platformFields": "Altera nome, razão social, CNPJ e endereço da oficina; usado pelo gestor.",
    "inactivate": "Inativa a oficina que deixou de atender a frota, sem apagar o histórico de ordens, e a reativa quando volta a atender; usado pelo gestor.",
    "link.contact": "Registra telefone, WhatsApp ou e-mail da oficina como canal de contato vinculado por HasContact; usado pelo gestor.",
    "listLinks": "Mostra os contatos e vínculos da oficina na sua ficha; usado pelo gestor.",
    "comment": "Registra observações sobre o atendimento da oficina; usado pelo gestor.",
    "attach.document": "Anexa contratos ou orçamentos à ficha da oficina; usado pelo gestor.",
    "audit": "Mostra quem alterou o cadastro da oficina e quando; usado pelo administrador."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-identity-never-in-namespace",
    "rule-document-shape-validated",
    "rule-company-legal-name-required",
    "rule-delete-blocked-by-relationships",
    "oficinaInativaSemNovasOrdens"
  ],
  "writer": "crud",
  "kind": "role",
  "subtype": "Company",
  "roleTag": "manutencaoFrota.Oficina",
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
        "description": "Documento mestre da oficina, ramo a ramo.",
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
                    "value": "Company",
                    "title": "Empresa"
                  }
                ],
                "description": "Sempre Company: a oficina é uma empresa.",
                "title": "Subtipo"
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 200,
                "description": "Nome pelo qual o gestor de frota reconhece a oficina ao abrir uma ordem de manutenção.",
                "title": "Nome da oficina"
              },
              "status": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "Active",
                    "title": "Ativa"
                  },
                  {
                    "value": "Inactive",
                    "title": "Inativa"
                  },
                  {
                    "value": "Merged",
                    "title": "Mesclada"
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueada"
                  }
                ],
                "title": "Situação",
                "description": "Situação do cadastro mestre; oficina inativa não recebe novas ordens de manutenção."
              },
              "docType": {
                "type": "enum",
                "indexed": true,
                "values": [
                  {
                    "value": "CNPJ",
                    "title": "CNPJ"
                  },
                  {
                    "value": "EIN",
                    "title": "EIN"
                  },
                  {
                    "value": "VAT",
                    "title": "VAT"
                  },
                  {
                    "value": "Other",
                    "title": "Outro"
                  }
                ],
                "title": "Tipo de documento",
                "description": "Documento nacional da oficina, normalmente CNPJ."
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "Número do CNPJ da oficina, usado para evitar cadastro duplicado.",
                "title": "Número do documento"
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 2,
                "default": "US",
                "description": "País da oficina (ISO 3166-1 alfa-2), em geral BR.",
                "title": "País"
              }
            },
            "description": "Identificação da oficina no cadastro mestre da organização."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "aliases": {
                "type": "string",
                "required": true,
                "collection": true,
                "description": "Nomes fantasia ou apelidos pelos quais a oficina também é conhecida.",
                "title": "Outros nomes"
              },
              "addresses": {
                "type": "object",
                "required": true,
                "collection": true,
                "of": "Address",
                "title": "Endereços",
                "description": "Endereço onde os veículos são levados para manutenção."
              },
              "contacts": {
                "type": "object",
                "required": true,
                "collection": true,
                "of": "ContactSummary",
                "derived": true,
                "description": "Resumo dos canais de contato da oficina (telefone, WhatsApp, e-mail), vinculados por HasContact.",
                "title": "Contatos"
              },
              "notes": {
                "type": "string",
                "maxLength": 1000,
                "title": "Observações",
                "description": "Observações gerais sobre a oficina."
              }
            },
            "description": "Dados comuns do cadastro mestre usados pelo gestor para localizar e visitar a oficina."
          },
          "company": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "companyKind": {
                "type": "enum",
                "required": true,
                "values": [
                  {
                    "value": "LegalEntity",
                    "title": "Pessoa jurídica"
                  },
                  {
                    "value": "Branch",
                    "title": "Filial"
                  },
                  {
                    "value": "Franchise",
                    "title": "Franquia"
                  }
                ],
                "description": "A oficina é uma pessoa jurídica, uma filial ou uma franquia de uma rede.",
                "title": "Tipo de organização"
              },
              "legalName": {
                "type": "string",
                "required": true,
                "description": "Razão social registrada da oficina.",
                "title": "Razão social"
              },
              "tradeName": {
                "type": "string",
                "description": "Nome comercial da oficina.",
                "title": "Nome fantasia"
              }
            },
            "description": "Dados da oficina como pessoa jurídica."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Campos promovidos pela organização; lidos, não declarados aqui."
          },
          "manutencaoFrota": {
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

export type ManutencaoFrotaEntityOficinaType = typeof manutencaoFrotaEntityOficina;

export default manutencaoFrotaEntityOficina;
