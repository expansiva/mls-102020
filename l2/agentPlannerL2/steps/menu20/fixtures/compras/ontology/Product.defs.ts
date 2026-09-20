/// <mls fileReference="_102047_/l4/compras/ontology/Product.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const comprasEntityProduct = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "compras",
  "entityId": "Product",
  "title": "Produto",
  "description": "Produto do cadastro mestre que pode ser fornecido, pedido e recebido nas compras.",
  "displayField": "details.identification.name",
  "relationships": {
    "suppliers": {
      "relationshipId": "supplierSuppliesProduct",
      "to": "Supplier",
      "via": "SuppliesProduct",
      "cardinality": "N:N",
      "title": "Fornecedores do produto",
      "description": "Fornecedores que podem fornecer este produto para a organização.",
      "direction": "to"
    },
    "supplierOfferings": {
      "relationshipId": "supplierOfferingProduct",
      "to": "SupplierOffering",
      "via": "SupplierOffering.productId",
      "cardinality": "1:N",
      "title": "Condições de fornecimento",
      "description": "Condições de fornecimento que definem preços combinados deste produto por fornecedor.",
      "mode": "fk",
      "direction": "to",
      "required": "Sempre que uma condição de fornecimento for cadastrada."
    }
  },
  "capabilities": {
    "read.byId": "Lê o produto mestre pelo identificador · consulta o registro mestre pelo mdmId · usado pelo comprador e pelo almoxarife ao exibir produtos vinculados a condições, pedidos e recebimentos.",
    "locate.byName": "Localiza produtos pelo nome · pesquisa o índice de produtos ativos pelo texto informado · usada pelo comprador ao adicionar um produto às condições de fornecimento.",
    "register.createOrAttach": "Cria ou vincula o papel de produto nas compras · localiza o cadastro mestre existente e anexa a tag compras.Product, criando-o somente se estiver ausente · executado pelo mecanismo ao registrar uma condição de fornecimento.",
    "link": "Vincula um fornecedor a este produto · cria o relacionamento mestre SuppliesProduct com histórico de vigência · usado pelo comprador ao disponibilizar o produto para compra daquele fornecedor.",
    "unlink": "Encerra o vínculo de fornecimento do produto · inativa o relacionamento mestre SuppliesProduct preservando seu histórico · usado pelo comprador quando o fornecedor deixa de fornecer o produto.",
    "listLinks": "Lista fornecedores e condições relacionados ao produto · consulta os relacionamentos ativos e seu histórico de vigência · usada pelo comprador para conferir as fontes de fornecimento do produto."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace"
  ],
  "kind": "role",
  "subtype": "Product",
  "roleTag": "compras.Product",
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
        "description": "Documento mestre do produto lido pelo módulo de compras, incluindo somente os dados necessários para fornecimento, pedido e recebimento.",
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
                    "value": "Product",
                    "title": "Produto",
                    "description": "Item de catálogo ou estoque que pode ser comprado e recebido."
                  }
                ],
                "description": "Subtipo mestre do registro, mantido como Produto.",
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
                "description": "Nome pelo qual o comprador localiza o produto para incluí-lo nas condições de fornecimento e nos pedidos de compra.",
                "title": "Nome do produto",
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
                    "description": "Produto disponível no cadastro mestre."
                  },
                  {
                    "value": "Inactive",
                    "title": "Inativo",
                    "description": "Produto inativado no cadastro mestre."
                  },
                  {
                    "value": "Merged",
                    "title": "Mesclado",
                    "description": "Produto incorporado a outro registro mestre."
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado",
                    "description": "Produto bloqueado no cadastro mestre."
                  }
                ],
                "title": "Situação do cadastro mestre",
                "description": "Situação mestre que indica se o produto pode continuar sendo utilizado nas compras.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados de identificação do cadastro mestre usados para localizar e verificar a situação do produto nas compras."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados comuns do cadastro mestre do produto que este módulo não precisa declarar."
          },
          "product": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "sku": {
                "type": "string",
                "description": "Código interno do produto usado pelo almoxarifado para reconhecer o item recebido.",
                "title": "SKU",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "unitOfMeasure": {
                "type": "string",
                "description": "Unidade em que a quantidade do produto é pedida e recebida, como unidade, caixa, quilograma ou litro.",
                "title": "Unidade de medida",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "isInventoried": {
                "type": "boolean",
                "description": "Indica se o recebimento deste produto deve gerar entrada no estoque.",
                "title": "Controla estoque",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Características do catálogo mestre necessárias para identificar o item e registrar seu recebimento no estoque."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Dados promovidos pela organização, lidos pelo módulo de compras e declarados no registro organizacional."
          },
          "compras": {
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

export type ComprasEntityProductType = typeof comprasEntityProduct;

export default comprasEntityProduct;
