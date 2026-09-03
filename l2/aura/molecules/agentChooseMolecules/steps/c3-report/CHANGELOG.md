# CHANGELOG — c3-report

## 2026-08-21 — custo real das chamadas, e o `run.json` virou `report.json`

**A plataforma expõe consumo, e eu tinha registrado que não.** Não está no contrato do passo — foi onde eu
procurei em 19/08 — e sim numa linha que o runtime acrescenta ao `interaction.trace`:

```
provider: openrouter model:… alias:reasoning inputTokens:7727 outputTokens:649 cost:$0.0239
```

Agora cada tentativa grava `usage` no seu trace e o relatório soma tokens de entrada, de saída e dólares.
A estimativa **continua**, porque as duas respondem coisas diferentes: a estimativa dimensiona o bloco de
CATÁLOGO (o que o desenho de três níveis discute) e o número real é o que a chamada custou. O relatório traz
a razão entre os dois — no run de 21/08 o c1 montou ~1.203 tokens estimados e o provedor contou **7.727** de
entrada, ou seja a plataforma acrescenta ~6× por conta dela (Content Memory, schema da tool, contexto da
thread). Passo cuja linha não apareceu entra como **"não medido"**, nunca como zero.

**`run.json` → `report.json`.** Num run de 21/08 o arquivo `run.json` da pasta continha um dump de
`TaskData` — a task da plataforma, não este relatório, e nem do mesmo run da pasta. Não foi este agente
(ele nunca tem um TaskData em mãos); seja quem for, o nome é disputado, e este é o único artefato que um run
não pode perder.

## 2026-08-19 — nascimento

Primeira versão. Decisões:

- **mecânico, sem chamada de LLM.** Uma quarta chamada sujaria a própria medição de tokens que o run
  existe para tomar, e resumo é onde métrica não medida aparece. A aritmética fica no `report.ts` puro.
- **roda sempre**, inclusive sem nenhum grupo escolhido: o caso #10 da bateria (upload + gráfico) só
  está correto se produzir relatório de duas regiões sem grupo, com as justificativas.
- **`run.json` é o artefato de pontuação.** A tabela junta região → grupo → molécula → cenário com as
  duas justificativas, porque a pontuação contra o gabarito é manual (decisão 4 de 19/08).
- **rótulos em português.** O público é a equipe que roda a bateria; o que o modelo escreveu continua na
  língua do pedido.
