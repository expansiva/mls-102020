/// <mls fileReference="_102047_/l4/financeiro/ontology/PainelRecebiveis.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const financeiroEntityPainelRecebiveis = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "financeiro",
  "entityId": "PainelRecebiveis",
  "title": "Painel de recebíveis",
  "description": "Totais a receber, recebidos, em aberto e vencidos, agrupados por período e por origem, recalculados a partir dos títulos e recebimentos.",
  "displayField": "periodo",
  "relationships": {},
  "capabilities": {
    "aggregate.byWindow": "Resume os títulos a receber e os recebimentos por dia e por origem, com um agregado contínuo do Timescale, para o painel de recebíveis do gerente financeiro.",
    "store.timeSeries": "Guarda o painel como série em hypertable particionada pelo período, para que o gerente financeiro leia um intervalo sem varrer toda a tabela.",
    "read.window": "Lê os totais a receber, recebidos, em aberto e vencidos de um período e de uma origem, filtrando pelas colunas indexadas de período e origem; usado na tela do painel do gerente financeiro.",
    "refresh": "Mantém o painel atualizado à medida que títulos chegam dos outros módulos e o caixa registra ou estorna recebimentos, por política de atualização do agregado executada pela plataforma.",
    "rebuild": "Recalcula todo o painel a partir dos títulos e recebimentos quando o módulo é publicado ou migrado.",
    "resample": "Oferece ao gerente financeiro a visão por mês a partir da série diária, por um segundo agregado declarado sobre o primeiro.",
    "retain": "Descarta linhas do painel mais antigas que o horizonte de análise definido, por política de retenção executada pela plataforma."
  },
  "rules": [
    "painelSomenteGerenteFinanceiro",
    "estornoExcluiDoRecebido",
    "tituloVencidoEmAbertoAposVencimento"
  ],
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
      "periodo": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "derived": true,
        "title": "Período",
        "description": "Início da janela (dia) que esta linha resume, calculado a partir do vencimento dos títulos a receber e da data dos recebimentos."
      },
      "origem": {
        "type": "string",
        "indexed": true,
        "derived": true,
        "title": "Origem",
        "description": "Código do módulo de origem das cobranças resumidas nesta linha (por exemplo restaurante, academia, assistência técnica), copiado da origem do título a receber.",
        "maxLength": 60
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Totais do período",
        "description": "Medidas recalculadas a partir dos títulos a receber e dos recebimentos do período e da origem; ninguém as digita.",
        "fields": {
          "totalAReceber": {
            "type": "money",
            "required": true,
            "derived": true,
            "title": "Total a receber",
            "description": "Soma dos valores dos títulos a receber com vencimento no período, não cancelados."
          },
          "totalRecebido": {
            "type": "money",
            "required": true,
            "derived": true,
            "title": "Total recebido",
            "description": "Soma dos recebimentos registrados no período, descontados os estornos."
          },
          "totalEmAberto": {
            "type": "money",
            "required": true,
            "derived": true,
            "title": "Total em aberto",
            "description": "Saldo ainda não recebido dos títulos com vencimento no período, considerando as baixas parciais."
          },
          "totalVencido": {
            "type": "money",
            "required": true,
            "derived": true,
            "title": "Total vencido",
            "description": "Saldo em aberto dos títulos do período cujo vencimento já passou."
          },
          "quantidadeTitulos": {
            "type": "integer",
            "required": true,
            "derived": true,
            "title": "Quantidade de títulos",
            "description": "Número de títulos a receber com vencimento no período."
          },
          "quantidadeVencidos": {
            "type": "integer",
            "required": true,
            "derived": true,
            "title": "Quantidade de títulos vencidos",
            "description": "Número de títulos do período em aberto e com vencimento anterior a hoje."
          },
          "quantidadeRecebimentos": {
            "type": "integer",
            "required": true,
            "derived": true,
            "title": "Quantidade de recebimentos",
            "description": "Número de recebimentos válidos (não estornados) registrados no período."
          }
        },
        "derived": true
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type FinanceiroEntityPainelRecebiveisType = typeof financeiroEntityPainelRecebiveis;

export default financeiroEntityPainelRecebiveis;
