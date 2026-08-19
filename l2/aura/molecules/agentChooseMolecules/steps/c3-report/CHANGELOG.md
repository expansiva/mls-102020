# CHANGELOG — c3-report

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
