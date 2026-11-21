/// <mls fileReference="_102047_/l4/controleEstoque/ontology/Produto.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const controleEstoqueEntityProduto = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "controleEstoque",
  "entityId": "Produto",
  "title": "Produto",
  "description": "Item de estoque compartilhado da organização. Neste módulo recebe o saldo mínimo para aviso; o saldo atual e a situação abaixo do mínimo são derivados das movimentações.",
  "displayField": "details.identification.name",
  "relationships": {
    "movimentacoes": {
      "relationshipId": "produtoDaMovimentacao",
      "to": "Movimentacao",
      "via": "Movimentacao.produtoId",
      "cardinality": "1:N",
      "title": "Movimentações de estoque",
      "description": "Entradas e saídas registradas para este produto; o saldo atual é calculado a partir delas.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Lê um produto já identificado para exibir nome, saldo mínimo, saldo atual e se está abaixo do mínimo · busca pelo mdmId no índice e no documento · estoquista nas telas de saldo, aviso e movimentação",
    "locate.byName": "Encontra produtos pelo nome para escolher o item a cadastrar, movimentar, consultar o saldo ou conferir o aviso · filtra pelo subtipo Product e pelo texto do nome · estoquista",
    "register.createOrAttach": "Cadastra o produto no estoque ou anexa o papel deste módulo a um produto já existente, gravando o saldo mínimo · cria o registro se não houver e marca a tag controleEstoque.Produto · estoquista no cadastro de produto",
    "edit.platformFields": "Altera o nome, o SKU, a unidade de medida e os demais dados de catálogo do produto · atualiza os campos de plataforma e o índice · estoquista",
    "edit.moduleNamespace": "Altera o saldo mínimo que dispara o aviso de estoque baixo · grava apenas a chave controleEstoque do documento · estoquista",
    "inactivate": "Inativa o produto no estoque sem apagá-lo, e permite reativá-lo depois · troca a situação para Inactive · estoquista",
    "comment": "Deixa um comentário no cadastro do produto · nota ancorada no registro e neste módulo · estoquista",
    "tag": "Marca o produto com etiquetas livres deste módulo · índice de tags do MDM · estoquista",
    "statusHistory.read": "Mostra quando o produto foi ativado ou inativado e por quem · histórico de situação do MDM · estoquista",
    "audit": "Mostra quem alterou o cadastro do produto e quando · log de auditoria do MDM · estoquista",
    "controleEstoque.consultarSaldo": "Consulta o saldo atual do produto, o saldo mínimo e se ficou abaixo do mínimo · leitura dos valores derivados e do namespace do módulo · estoquista nas jornadas de saldo e de aviso",
    "controleEstoque.listarAbaixoDoMinimo": "Lista os produtos com saldo atual abaixo do mínimo para o estoquista conferir o aviso · filtro sobre a condição derivada abaixo do mínimo · estoquista"
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-identity-never-in-namespace",
    "rule-document-shape-validated",
    "saldoMinimoNaoNegativo",
    "avisoSaldoAbaixoDoMinimo"
  ],
  "kind": "role",
  "subtype": "Product",
  "roleTag": "controleEstoque.Produto",
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
        "description": "Documento mestre do item de estoque: identificação e catálogo da organização, mais o saldo mínimo que só este módulo grava.",
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
                    "title": "Produto"
                  }
                ],
                "description": "Subtipo mestre deste registro; neste módulo é sempre produto.",
                "title": "Subtipo"
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 200,
                "description": "Nome pelo qual o estoquista reconhece e localiza o produto no estoque.",
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
                "title": "Situação",
                "description": "Se o produto está em uso no estoque, inativo, mesclado ou bloqueado."
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 2,
                "default": "US",
                "description": "País ao qual o cadastro do produto se refere.",
                "title": "País"
              },
              "tags": {
                "type": "string",
                "required": true,
                "collection": true,
                "derived": true,
                "description": "Papéis de módulo deste registro, inclusive o de produto de estoque.",
                "title": "Papéis"
              }
            },
            "description": "Como o estoquista reconhece o produto no cadastro mestre e se ele está em uso no estoque."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "aliases": {
                "type": "string",
                "required": true,
                "collection": true,
                "description": "Outros nomes pelos quais o mesmo produto é conhecido no estoque.",
                "title": "Nomes alternativos"
              }
            },
            "description": "Dados comuns a qualquer registro mestre; neste módulo, os outros nomes do produto."
          },
          "product": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "sku": {
                "type": "string",
                "description": "Código interno com o qual o estoquista identifica o item no estoque.",
                "title": "SKU"
              },
              "productType": {
                "type": "enum",
                "values": [
                  {
                    "value": "Physical",
                    "title": "Físico"
                  },
                  {
                    "value": "Digital",
                    "title": "Digital"
                  },
                  {
                    "value": "Bundle",
                    "title": "Combo"
                  },
                  {
                    "value": "Consumable",
                    "title": "Consumível"
                  },
                  {
                    "value": "Other",
                    "title": "Outro"
                  }
                ],
                "title": "Tipo de produto",
                "description": "Natureza do item no catálogo, para distinguir o que o estoque controla."
              },
              "category": {
                "type": "string",
                "title": "Categoria",
                "description": "Agrupamento do produto para organizar o estoque."
              },
              "brand": {
                "type": "string",
                "title": "Marca",
                "description": "Marca comercial do produto no catálogo."
              },
              "unitOfMeasure": {
                "type": "string",
                "description": "Unidade em que as entradas, as saídas e o saldo deste produto são contados, como unidade, caixa, kg ou litro.",
                "title": "Unidade de medida"
              }
            },
            "description": "Dados de catálogo do item cujas entradas, saídas e saldo este módulo controla."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Campos promovidos pela organização quando mais de um módulo precisou deles; este módulo apenas lê."
          },
          "controleEstoque": {
            "type": "object",
            "owner": "module",
            "fields": {
              "saldoMinimo": {
                "type": "number",
                "required": true,
                "title": "Saldo mínimo",
                "description": "Quantidade mínima em estoque; abaixo dela o estoquista recebe aviso.",
                "min": 0
              },
              "saldoAtual": {
                "type": "number",
                "derived": true,
                "title": "Saldo atual",
                "description": "Soma das quantidades das entradas menos a soma das quantidades das saídas deste produto."
              },
              "abaixoDoMinimo": {
                "type": "boolean",
                "derived": true,
                "title": "Abaixo do mínimo",
                "description": "O saldo atual do produto é menor que o saldo mínimo definido para aviso."
              }
            },
            "description": "O que só este módulo grava sobre o produto: o saldo mínimo que dispara o aviso."
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type ControleEstoqueEntityProdutoType = typeof controleEstoqueEntityProduto;

export default controleEstoqueEntityProduto;
