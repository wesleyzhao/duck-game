<!-- Replace OWNER/REPO with your GitHub org/repo -->
[![secret-scan](https://github.com/OWNER/REPO/actions/workflows/secret-scan.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/secret-scan.yml)

# Emerson Game Monorepo

This repo contains two DuckWorld apps in a single GitHub project:

- `apps/duckworld-2d` — 2D PixiJS math game with sandboxed "vibecode" tools
- `apps/duckworld-3d` — 3D Three.js version of the world

Each app is a standalone Vite project and can be run independently.

## Run The Apps (Independent)

```bash
cd apps/duckworld-2d
npm install
npm run dev
```

```bash
cd apps/duckworld-3d
npm install
npm run dev
```

## Workspace Shortcuts (Optional)

From the repo root you can also use workspace commands:

```bash
npm run dev:2d
npm run dev:3d
```

## Environment Variables

Each app uses its own `.env` file. These are ignored by git.

- 2D: `apps/duckworld-2d/.env`
- 3D: `apps/duckworld-3d/.env`

## Security Checks

- Local pre-commit hook: `git config core.hooksPath .githooks`
- Manual scans:
  - `npm run secret-scan:staged`
  - `npm run secret-scan:history`

## Docs

- 2D README: `apps/duckworld-2d/README.md`
- 3D README: `apps/duckworld-3d/README.md`
