# entry10 (agentM3Entry)

Entrada: o prompt `{ project, module, pages, devices, runDir }` fixado pelo root; o texto da mensagem original (`command`).
Saída: `run.json` em `pipeline/trace/agentMaterializeL2v3/<runDir>/` e o marcador `entry10-done`.

Invariantes:
- Sem LLM. Não lê nem escreve nada fora da pasta do run.
- Um `runDir` que já tem arquivo falha com `M3_RUN_DIR_TAKEN`; nada é sobrescrito (D-007).
- Toda falha deixa uma degradação e um `summary.json` com `verdict: failed` antes de devolver `failed`.
- `run.json`: `{ schemaVersion, project, module, pages, devices, runDir, startedAt, command }`.
