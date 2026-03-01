# Release Guide

## Versioning

Use semantic pre-1.0 tags:
- `v0.x.y`
- `x` = minor release with backward-compatible features
- `y` = patch release and hotfixes

## Local Release Gate

Run the full release matrix from repository root:

```bash
npm run release:check
```

Expected outcomes:
- All build and smoke steps pass.
- `smoke:phase6` may print `SKIP smoke:phase6: Docker unavailable (...)` on local machines without Docker.
- A skipped `smoke:phase6` is allowed locally and is reported in the matrix output.

## CI Gate (Required)

Before deploying, confirm the CI workflow `CI` is green on the release commit/PR, including:
- backend-build-test
- frontend-build
- smoke-suite
- compose-smoke

`compose-smoke` sets:
- `CI=true`
- `REQUIRE_DOCKER=1`

This guarantees phase6 compose smoke fails if Docker/daemon is not usable in CI.

## Tagging a Release

From a clean branch after CI passes:

```bash
git checkout main
git pull --ff-only
git tag -a v0.x.y -m "Release v0.x.y"
git push origin v0.x.y
```

Then create the GitHub release from the new tag.

## Deploy + Rollback

Deploy using your normal deployment pipeline only after CI is fully green.

Rollback helpers:
- Database backup: `npm run backup:db`
- Database restore: `npm run restore:db -- --yes <backup.sql.gz>`
- Code/database rollback: `npm run rollback -- --yes --ref <git-ref> --backup <backup.sql.gz>`

Always validate post-rollback health:
- `GET /health`
- `GET /ready`
- `npm run smoke:prod_sim`
