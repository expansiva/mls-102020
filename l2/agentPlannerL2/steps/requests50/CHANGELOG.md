# requests50

## 2026-09-18 (p2_05)

- One `pool/l1` message per BFF call from the contracts30 draft. No LLM.
- Trace `processed` + `delivered` on the l2 pipeline via `tracePoolAt`; delete the `pool/l2` message via `deletePoolMessageAt` last.
- Filenames increment one second so `<stamp>_<thread>_<round>` does not collide inside the same box.
