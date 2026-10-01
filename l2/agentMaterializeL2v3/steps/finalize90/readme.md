# finalize90 (agentM3Finalize)

Entrada: o prompt do run, `input.json`, `contracts30.json` e `run.json` do trace.
Saída: `summary.json` (sempre) e o status do step; não há marcador de fim.

Invariantes:
- Sem LLM. Recompila no Studio todos os `web/contracts/<page>.ts` do run, inclusive os `reused`.
- Confere o receipt fresco de cada página e consome (`take`) as degradações do run.
- `completed` só com compilação ok, receipts frescos e nenhuma degradação.
- `failed`: alguma página falhou ou o compilador está indisponível. `degraded`: os outros casos.
- O step devolve `completed` só com `verdict === 'completed'`.
- Cobre só o que o contracts30 gera nesta spec; shared40 e pages50 entram depois.
