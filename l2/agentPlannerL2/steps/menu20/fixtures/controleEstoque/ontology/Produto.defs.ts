/// <mls fileReference="_102047_/l4/controleEstoque/ontology/Produto.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const controleEstoqueEntityProduto = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "controleEstoque",
  "entityId": "Produto",
  "title": "Produto",
  "description": "Produto do cadastro mestre disponibilizado para controle de estoque, com saldo mínimo configurado no namespace do módulo e saldo atual e aviso de reposição calculados pelas movimentações.",
  "displayField": "details.identification.name",
  "relationships": {
    "movimentacoesEstoque": {
      "relationshipId": "produtoMovimentacoesEstoque",
      "to": "MovimentacaoEstoque",
      "via": "MovimentacaoEstoque.produtoId",
      "cardinality": "1:N",
      "title": "Movimentações de estoque",
      "description": "Movimentações de entrada e saída registradas para este produto, cada uma vinculada obrigatoriamente a ele.",
      "mode": "fk",
      "required": "quando houver movimentações de estoque registradas para o produto",
      "role": "produto movimentado"
    }
  },
  "capabilities": {
    "read.byId": "Consulta um produto pelo identificador mestre, carregando seu cadastro, saldo atual calculado e saldo mínimo para o estoquista.",
    "locate.byName": "Localiza produtos pelo nome no índice do cadastro mestre para o estoquista selecionar o item que será acompanhado ou movimentado.",
    "register.createOrAttach": "Cria ou vincula ao controle de estoque o produto localizado no cadastro mestre e grava seu saldo mínimo para o estoquista.",
    "edit.platformFields": "Atualiza os dados de cadastro mestre do produto, como nome e unidade de medida, para o estoquista manter a identificação usada no estoque.",
    "edit.moduleNamespace": "Altera somente o saldo mínimo em details.controleEstoque do produto para o estoquista ajustar o limite de reposição.",
    "inactivate": "Inativa ou reativa o produto no cadastro mestre para o estoquista retirar ou devolver o item ao uso sem apagar seu histórico.",
    "statusHistory.read": "Mostra o histórico de mudanças de situação do produto no cadastro mestre para o estoquista acompanhar quando ele foi ativado ou inativado.",
    "audit": "Consulta a auditoria das alterações do cadastro e do saldo mínimo do produto para o estoquista rastrear quem mudou cada informação.",
    "controleEstoque.consultarSaldo": "Exibe o saldo atual calculado, o saldo mínimo configurado e o aviso de saldo baixo do produto para o estoquista antes e durante o acompanhamento das movimentações.",
    "controleEstoque.listarProdutosComSaldoBaixo": "Lista os produtos cujo saldo atual calculado está abaixo do saldo mínimo para o estoquista priorizar a reposição."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace",
    "saldoMinimoNaoNegativo",
    "saldoAtualCalculadoPelasMovimentacoes",
    "avisoDeSaldoBaixo"
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
        "description": "Bumped by the engine on every write; optimistic concurrency."
      },
      "details": {
        "type": "object",
        "required": true,
        "description": "Documento do produto mestre utilizado pelo controle de estoque.",
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
                    "description": "Item de produto do cadastro mestre."
                  }
                ],
                "description": "Indica que este registro mestre é um produto.",
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
                "description": "Nome pelo qual o estoquista identifica e localiza o produto controlado.",
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
                    "description": "Produto retirado de uso no cadastro mestre."
                  },
                  {
                    "value": "Merged",
                    "title": "Unificado",
                    "description": "Produto incorporado a outro registro mestre."
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado",
                    "description": "Produto bloqueado no cadastro mestre."
                  }
                ],
                "title": "Situação do cadastro",
                "description": "Situação do produto no cadastro mestre; produtos inativos não devem ser usados em novas movimentações.",
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
                "description": "Código do país aplicável ao cadastro mestre do produto.",
                "title": "País",
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados de identificação do produto no cadastro mestre."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados básicos compartilhados do cadastro mestre; este módulo não utiliza campos próprios desta seção."
          },
          "product": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "unitOfMeasure": {
                "type": "string",
                "description": "Unidade em que o produto é contado nas entradas, saídas, saldo atual e saldo mínimo.",
                "title": "Unidade de medida",
                "required": true,
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados próprios do subtipo Produto utilizados para interpretar as quantidades movimentadas."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Dados promovidos pela organização, lidos conforme o cadastro corporativo."
          },
          "controleEstoque": {
            "type": "object",
            "owner": "module",
            "fields": {
              "minimumStock": {
                "type": "number",
                "required": true,
                "of": "Address",
                "title": "Saldo mínimo",
                "description": "Quantidade mínima desejada para o produto antes de emitir aviso de reposição.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "currentStock": {
                "type": "number",
                "derived": true,
                "title": "Saldo atual",
                "description": "Quantidade disponível calculada pelas entradas registradas menos as saídas registradas deste produto."
              },
              "belowMinimumStock": {
                "type": "boolean",
                "derived": true,
                "title": "Aviso de saldo baixo",
                "description": "Indica que o saldo atual calculado do produto está abaixo do saldo mínimo configurado para reposição."
              }
            },
            "description": "Dados específicos deste módulo para definir o limite de reposição do produto."
          }
        }
      }
    }
  }
} as const satisfies Ns5OntologyEntityV3;

export type ControleEstoqueEntityProdutoType = typeof controleEstoqueEntityProduto;

export default controleEstoqueEntityProduto;
