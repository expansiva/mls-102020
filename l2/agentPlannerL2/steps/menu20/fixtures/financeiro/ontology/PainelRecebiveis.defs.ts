/// <mls fileReference="_102047_/l4/financeiro/ontology/PainelRecebiveis.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const financeiroEntityPainelRecebiveis = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "financeiro",
  "entityId": "PainelRecebiveis",
  "title": "Painel de recebíveis",
  "description": "Série consolidada e recalculada de recebíveis por período e origem, incluindo indicadores de títulos vencidos.",
  "displayField": "period",
  "relationships": {},
  "capabilities": {
    "aggregate.byWindow": "Consolida os títulos a receber e os recebimentos por janela de tempo e origem, por meio de agregado contínuo declarado na persistência, para o painel usado pelo gerente financeiro.",
    "store.timeSeries": "Mantém as consolidações por período e origem como série temporal, usando hypertable quando o TimescaleDB estiver disponível, para leitura eficiente do painel pelo gerente financeiro.",
    "read.window": "Consulta os indicadores de recebíveis por período e origem, filtrando pelas colunas indexadas da série, para o gerente financeiro acompanhar os recebíveis e os vencidos.",
    "refresh": "Atualiza automaticamente a consolidação à medida que títulos e recebimentos são registrados ou estornados, por política de agregado contínuo, para manter o painel do gerente financeiro atualizado.",
    "rebuild": "Recria a série consolidada a partir de TituloReceber e Recebimento durante uma publicação ou migração, por meio da reconstrução da definição de agregado, para a organização."
  },
  "rules": [],
  "kind": "entity",
  "class": "supporting",
  "storage": {
    "target": "moduleDatabase",
    "table": "financeiro_painelrecebiveis",
    "kind": "timeSeries"
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
      "period": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "of": "Address",
        "title": "Período",
        "description": "Início da janela de tempo consolidada do painel de recebíveis.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "derived": true
      },
      "groupKey": {
        "type": "string",
        "required": true,
        "indexed": true,
        "of": "Address",
        "title": "Origem",
        "description": "Chave da origem que gerou os títulos consolidados no período, como restaurante, academia ou assistência técnica.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "derived": true
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "Address",
        "title": "Indicadores de recebíveis",
        "description": "Medidas calculadas a partir dos títulos a receber e dos recebimentos da origem no período.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "quantidadeTitulosEmAberto": {
            "type": "integer",
            "required": true,
            "of": "Address",
            "title": "Títulos em aberto",
            "description": "Quantidade de títulos que ainda possuem saldo a receber no período e na origem.",
            "maxLength": 0,
            "min": 0,
            "max": 0,
            "derived": true
          },
          "valorEmAberto": {
            "type": "money",
            "required": true,
            "of": "Address",
            "title": "Valor em aberto",
            "description": "Soma dos saldos ainda a receber dos títulos no período e na origem.",
            "maxLength": 0,
            "min": 0,
            "max": 0,
            "derived": true
          },
          "valorRecebido": {
            "type": "money",
            "required": true,
            "of": "Address",
            "title": "Valor recebido",
            "description": "Soma dos recebimentos válidos registrados para os títulos no período e na origem.",
            "maxLength": 0,
            "min": 0,
            "max": 0,
            "derived": true
          },
          "quantidadeTitulosVencidos": {
            "type": "integer",
            "required": true,
            "of": "Address",
            "title": "Títulos vencidos",
            "description": "Quantidade de títulos em aberto com vencimento anterior à data atual no período e na origem.",
            "maxLength": 0,
            "min": 0,
            "max": 0,
            "derived": true
          },
          "valorVencido": {
            "type": "money",
            "required": true,
            "of": "Address",
            "title": "Valor vencido",
            "description": "Soma dos saldos em aberto dos títulos com vencimento anterior à data atual no período e na origem.",
            "maxLength": 0,
            "min": 0,
            "max": 0,
            "derived": true
          }
        },
        "derived": true
      }
    }
  }
} as const satisfies Ns5OntologyEntityV3;

export type FinanceiroEntityPainelRecebiveisType = typeof financeiroEntityPainelRecebiveis;

export default financeiroEntityPainelRecebiveis;
