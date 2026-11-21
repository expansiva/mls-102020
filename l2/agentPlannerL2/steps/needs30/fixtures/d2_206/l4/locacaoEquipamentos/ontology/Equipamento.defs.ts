/// <mls fileReference="_102047_/l4/locacaoEquipamentos/ontology/Equipamento.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const locacaoEquipamentosEntityEquipamento = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "locacaoEquipamentos",
  "entityId": "Equipamento",
  "title": "Equipamento",
  "description": "Equipamento de construção operado pela locadora, com código, descrição, valor da diária e situação (disponível, locado ou em manutenção); 'locado' decorre dos contratos ativos que apontam para ele.",
  "displayField": "codigo",
  "relationships": {
    "itens": {
      "relationshipId": "itemEquipamento",
      "to": "ItemContrato",
      "via": "ItemContrato.equipamentoId",
      "cardinality": "1:N",
      "title": "Itens de contrato",
      "description": "Itens de contrato que locam este equipamento ao longo do tempo, sem períodos sobrepostos.",
      "mode": "fk",
      "direction": "to",
      "required": true
    },
    "contratos": {
      "relationshipId": "equipamentoContratos",
      "to": "ContratoLocacao",
      "via": "ItemContrato",
      "cardinality": "N:N",
      "title": "Contratos do equipamento",
      "description": "Contratos em que o equipamento foi ou está locado, através dos itens de contrato; usados para mostrar o contrato atual e derivar 'locado'.",
      "mode": "throughTable",
      "path": "Equipamento <- ItemContrato.equipamentoId -> ItemContrato.contratoId -> ContratoLocacao",
      "derived": true
    }
  },
  "capabilities": {
    "read.byId": "Lê um equipamento pelo id já conhecido; usado pelo gerente na tela de detalhe e pelo item de contrato para mostrar código e diária.",
    "locate.byColumn": "Lista equipamentos filtrando pela situação cadastral e pelo código nas colunas indexadas, paginado; o gerente usa para ver os equipamentos por situação.",
    "locate.byText": "Pesquisa equipamentos por parte do código ou da descrição (ILIKE); o atendente usa para escolher o que incluir no contrato.",
    "count": "Conta os equipamentos de um filtro; o gerente usa para os totais de disponíveis, locados e em manutenção.",
    "listByForeignKey": "Lista os itens de contrato que apontam para o equipamento pela chave equipamentoId; usado para achar o contrato atual e conferir sobreposição de períodos.",
    "create": "Cadastra um novo equipamento com código, descrição, valor da diária e situação; feito pelo gerente.",
    "update": "Altera descrição, valor da diária ou situação cadastral (disponível ou em manutenção) do equipamento; feito pelo gerente.",
    "uniqueKey": "Garante pelo índice único na coluna código que não existam dois equipamentos com o mesmo código; aplicado pelo motor na gravação.",
    "comment": "Registra observações sobre o equipamento, como avarias ou histórico de manutenção; usado pelo gerente e pelo atendente.",
    "locacaoEquipamentos.consultarDisponibilidade": "Informa se o equipamento está livre em um período (retirada e devolução prevista), cruzando seus itens de contrato ativos e a situação cadastral; usado pelo atendente ao montar o contrato."
  },
  "rules": [
    "equipamentoCodigoUnico",
    "equipamentoSemPeriodosSobrepostos",
    "equipamentoEmManutencaoNaoLocavel",
    "equipamentoLocadoDecorreDeContratoAtivo",
    "valorDiariaPositivo"
  ],
  "writer": "crud",
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "locacaoEquipamentos_equipamento",
    "kind": "relational"
  },
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "derived": true,
        "indexed": true,
        "title": "Id"
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true
      },
      "codigo": {
        "type": "string",
        "required": true,
        "unique": true,
        "indexed": true,
        "title": "Código",
        "description": "Código do equipamento usado pelo atendente para localizá-lo e que o identifica no contrato; não se repete.",
        "maxLength": 30
      },
      "descricao": {
        "type": "string",
        "required": true,
        "indexed": true,
        "title": "Descrição",
        "description": "Descrição do equipamento de construção (por exemplo, betoneira 400 L); o atendente pesquisa por parte do texto.",
        "maxLength": 200
      },
      "situacao": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "disponivel",
            "title": "Disponível",
            "description": "Pode ser incluído em um novo contrato, se não houver contrato com período sobreposto."
          },
          {
            "value": "emManutencao",
            "title": "Em manutenção",
            "description": "Fora de circulação; não pode ser incluído em contratos."
          }
        ],
        "title": "Situação cadastral",
        "description": "Situação mantida por quem cadastra o equipamento: disponível para locação ou em manutenção. 'Locado' não é gravado: decorre dos contratos ativos que apontam para o equipamento."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Detalhes",
        "description": "Demais dados do equipamento, sem filtro próprio.",
        "fields": {
          "valorDiaria": {
            "type": "money",
            "required": true,
            "title": "Valor da diária",
            "description": "Valor cobrado por dia de locação; base do cálculo da multa por atraso (diária × dias de atraso × 1,5).",
            "min": 0
          },
          "locado": {
            "type": "boolean",
            "derived": true,
            "title": "Locado",
            "description": "Verdadeiro quando o equipamento consta em um item de contrato de locação ativo que ainda não teve a devolução registrada."
          },
          "contratoAtual": {
            "type": "record",
            "derived": true,
            "title": "Contrato atual",
            "description": "Contrato de locação ativo, ainda sem devolução registrada, em que o equipamento está locado; vazio quando o equipamento não está locado."
          },
          "situacaoAtual": {
            "type": "enum",
            "derived": true,
            "title": "Situação atual",
            "description": "Situação mostrada ao gerente: em manutenção quando a situação cadastral é em manutenção; locado quando há contrato ativo sem devolução apontando para o equipamento; caso contrário, disponível."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "codigo"
    ]
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type LocacaoEquipamentosEntityEquipamentoType = typeof locacaoEquipamentosEntityEquipamento;

export default locacaoEquipamentosEntityEquipamento;
