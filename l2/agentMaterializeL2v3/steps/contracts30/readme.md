# contracts30 (agentM3Contracts)

Entrada: o prompt do run e o `input.json` do input20.
Saída: `web/contracts/<page>.ts` + `<page>Receipt.json`, `contracts30.json` no trace e o marcador `contracts30-done`.

Invariantes:
- Sem LLM. `renderM3ContractClient` é pura: um cliente tipado sobre `execBff` por rota (D-008).
- Gate de forma: as `export function` da saída são os `requestId` do input, na ordem do contrato.
- Posse: arquivo existente sem `M3_CONTRACT_MARKER` é `M3_FOREIGN_FILE`; nunca sobrescreve.
- Receipt fresco = `reused`: não grava, não compila, não gera receipt novo.
- Compilação no Studio sem reparo: erro de compilação é defeito do agente (`M3_CONTRACT_COMPILE_FAILED`).
- Processa todas as páginas, grava o trace e só então falha se alguma falhou.
