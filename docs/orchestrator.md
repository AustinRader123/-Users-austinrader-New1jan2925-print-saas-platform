**Orchestrator**
- **Purpose**: start mock DN, backend, worker, frontend, run non-interactive bootstrap, capture logs.

- **Important env vars**:
  - `BACKEND_PORT` (default 3000)
  - `FRONTEND_PORT` (default 5173)
  - `MOCK_PORT` (default 6060)
  - `BOOT_TIMEOUT` (seconds, default 90)
  - `HEALTH_TIMEOUT` (seconds, default 30)
  - `DEBUG=1` enable verbose tracing

- **Logs**:
  - `artifacts/logs/mock-dn.log`
  - `artifacts/logs/backend.log`
  - `artifacts/logs/worker.log`
  - `artifacts/logs/bootstrap.invoke.log`
  - `artifacts/logs/master-debug.trace.log` (when tracing run used)

- **Common failures & actions**:
  - Mock DN not ready -> check `mock-dn.log`
  - Backend /ready failing -> DB unreachable; ensure `DATABASE_URL` accessible and run Prisma migrations
  - Worker bootstrap stalls -> check Redis (Bull) availability and `worker.log`

- **Commands**:

Run debug orchestrator (fails fast on errors):

```bash
DEBUG=1 bash master-debug-run.sh  # debug, verbose
bash master-debug-run.sh         # normal
```

Diagnose current state:

```bash
bash scripts/diagnose-orchestrator.sh
```

