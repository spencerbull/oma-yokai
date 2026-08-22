# oma-yokai

Goal: ship Yokai as a first-class Omarchy plugin. Keep the existing daemon/agent
service and OpenTUI, add a native bar glance, and let people dive into the same
fleet, device, deploy, and settings work without leaving the shell.

## Done criteria

- [ ] GitHub repo `spencerbull/oma-yokai` exists and contains this tree
- [ ] `omarchy plugin validate .` passes (manifest, kinds, relative entry points, no symlinks)
- [ ] Plugin kinds: `bar-widget` + `service` with `manifest.json` at repo root
- [ ] Bar widget shows a compact fleet glance (GPU/status/alerts)
- [ ] Click opens a simple panel; "Dive in" reaches devices, services, deploy, settings
- [ ] OpenTUI still launches via `yokai` / `omarchy launch tui yokai`
- [ ] Yokai daemon/agent/TUI source lives in this repo
- [ ] Plugin installer constraint documented: `omarchy plugin add` clones files only
- [ ] Focused tests: Go suite, TUI tests, FleetModel tests, plugin validate

## Allowed actions

- Create local tree, GitHub repo, branches, and initial push
- Copy Yokai service + OpenTUI source into this repo
- Add Omarchy plugin QML, scripts, docs, and CI
- Run local tests and `omarchy plugin validate`

## Forbidden

- Production deploys, secrets, billing, customer data
- Editing `/usr/share/omarchy/`
- Enabling the plugin on this machine without an explicit request
- `omarchy plugin add` install hooks (the installer will not run them)

## Gates

- `omarchy plugin validate .`
- `./scripts/validate-plugin .`
- `bun test tests/plugin`
- `go test ./...` (or `make test` when Go is available)
- Independent review of plugin QML and daemon client scripts before calling it done

## Streams

| Stream | Branch / tree | Status | Evidence |
| --- | --- | --- | --- |
| 0. Sync Yokai | `Yokai` `main` @ `0f170d6` | done | `git fetch --prune --tags origin`; `HEAD...origin/main` = `0 0`; source/TUI diff against this tree is empty. |
| 1. Bootstrap repo + copy service/TUI | `main` @ `a6db5b3` | done | Inherited local draft checkpointed before edits; source copied without `.git`, `bin/`, `node_modules`, `dist`, or `deployments/`. |
| 2. Omarchy plugin shell (manifest, service, bar, simple panel) | `complete-plugin` worktree | in progress | Current draft has manifest/service/widget but is missing `Panel.qml` and deep-view components. |
| 3. Deep dive views (devices, services, deploy, settings, TUI launch) | same tree | pending | |
| 4. Docs, CI, plugin validate, tests | same tree | pending | |
| 5. Create GitHub repo and push | `spencerbull/oma-yokai` | pending | |

## Workers

| Name / kind | Location | State | Scope / evidence | Cleanup owner |
| --- | --- | --- | --- | --- |
| `plugin_contract` / Codex | pane `w1H:p3`, tab `w1H:t1`, workspace `w1H`; cwd `Yokai`; no branch | working | Read-only installed/official Omarchy plugin-contract research. | Orchestrator |
| `plugin_builder` / Codex | Herdr worktree workspace, branch `complete-plugin` | pending | Complete plugin QML, tests, docs, and focused verification. | Orchestrator |

## Open questions

- First GitHub release is not created in this loop; `yokai upgrade` / `install.sh` need a release before they can download binaries.
- Local plugin enable is a human gate so we do not rewrite the running bar without asking.

## Current status

Upstream and inherited source are checkpointed. Researching the current Omarchy
4.0.0-1 contract, then finishing streams 2–4 in an isolated Herdr worktree before
an independent review, merge, repository creation, and initial push.
