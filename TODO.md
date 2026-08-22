# OmaYokai plugin completion ledger

Goal: create `spencerbull/oma-yokai` as a bounded native Omarchy plugin without
changing inherited Go-service or OpenTUI behavior outside the identity and
integration work needed for the plugin.

Current live-install follow-up (2026-08-22): stopped/exited services remain
visible but neutral, alerts are reserved for actual unhealthy/error states, and
quick summaries distinguish running, transitioning, and stopped services. Both
local binaries and the native plugin are installed from the same clean revision;
desktop actions remain read-only except for cycling this plugin, its daemon, and
loop-owned verification windows.

## Done criteria

- [x] Root `schemaVersion: 1` manifest exposes only native `bar-widget` and `service` entry points.
- [x] Compact bar glance opens a simple panel and a deliberate Dive in view for overview, devices, services, deploy, and settings.
- [x] Open TUI launches the existing `yokai` workflow; Omarchy clone-only installation behavior is documented.
- [x] Destructive UI actions require confirmation and the panel snapshot model whitelists non-secret settings fields.
- [x] Dynamic API path/query values are encoded and helper scripts fail coherently on invalid input or partial snapshots.
- [x] Module, release archives, updater, installer, docs, CI, and TUI package are OmaYokai-owned.
- [x] Only the four baseline-proven byte-identical `.github/.github` duplicates are removed.
- [x] Deterministic FleetModel and plugin/script contract tests cover sorting, settings redaction, native entry points, keyboard ownership, identity, snapshot failure, body handling, address bounds, and binary paths.
- [x] Independent final diff review has no unresolved actionable findings.
- [x] All required local gates pass; this ledger is included in the scoped branch commit.
- [x] Public GitHub repository `spencerbull/oma-yokai` exists and is configured as `origin`.

## Worktree and branch

- Worktree: `/home/sbull/worktrees/oma-yokai-complete-plugin`
- Branch: `complete-plugin`
- Baseline: `625f000` (inherited `main` snapshot plus incomplete plugin draft)
- Existing work at start: clean worktree; all current changes belong to this completion stream.
- Landed on local `main` through merge commit `Merge native OmaYokai plugin rewrite`.

## Allowed actions

- Edit and test this worktree on `complete-plugin`.
- Add plugin QML, scripts, tests, docs, CI, module/release/update identity, and a local commit.
- Read current installed Omarchy files for native contract and component patterns.

## Forbidden actions

- Do not edit `/usr/share/omarchy`, `~/.config/omarchy`, installed plugins, or services.
- Do not enable/install the plugin, run privileged build hooks, use secrets, or expose credential values.
- Worker streams do not create, push, or otherwise mutate remote repositories;
  the orchestrator owns the user-authorized repository creation and initial push.
- Do not change unrelated inherited Yokai behavior.

## Required gates

- `./scripts/validate-plugin .`
- `omarchy plugin validate .`
- `bun test tests/plugin`
- `go test ./...`
- `go build -o /tmp/oma-yokai-yokai ./cmd/yokai`
- `bun test`, `bun run build`, and standalone compile under `ui/tui`
- `git diff --check`
- Independent diff review

Current evidence (2026-08-22): source-tree portable validation passes; native
validation of the exact `git archive` payload passes. Native validation of the
developer checkout itself correctly
rejects ignored `ui/tui/node_modules/.bin` symlinks created for TUI testing; the
validator was not weakened. The orchestrator independently reran 17/17 plugin
tests, the complete Go suite, 26/26 TUI tests, the bundled TUI build, both plugin
validators, and `git diff --check`; the worker also passed Go/standalone builds
and shell syntax checks.

`qmlimportscanner` resolves the current native imports without installation, but
the installed `qmllint` reports parser errors in its own Qt/Quickshell dependency
files. Treat QML lint as inconclusive rather than a pass; do not install a second
toolchain for this bounded change.

The available `actionlint` command is only an unconfigured mise shim and could
not run without installing a new tool version. Release-trigger behavior is
covered by the plugin contract test instead.

Stopped-service source evidence (2026-08-22): plugin 17/17 and OpenTUI 27/27
tests pass; Go tests, production TUI build/compile, portable validation, native
validation of the clean payload, isolated-cache golangci-lint, and
`git diff --check` pass. The independent follow-up review returned GO. The clean
installed plugin, both binary hashes, live daemon inode/version, enabled bar
placement, resident shell reload, and live QML/OpenTUI classification all match;
visual interaction remains gated only by the user's active screen lock.

## Streams

| Stream | Branch / tree | Status | Evidence |
| --- | --- | --- | --- |
| Inherited source | `main` / baseline `625f000` | done | Exact Yokai `origin/main@0f170d6` inheritance was established before implementation. |
| Native shell | `complete-plugin` worktree | done | `Panel.qml`, compact `BarWidget.qml`, simple/deep views, native theme/panel components, editor-key blocking. |
| Service/scripts | same tree | done | Encoded dynamic URLs, stdin-only JSON handoff, loopback bounds, rearmed daemon recovery, coherent process exits, safe structured errors, deterministic/fail-closed snapshot. |
| Tests/identity/docs/CI | same tree | done | Plugin/FleetModel tests, proven BKC image preservation, tag/manual-only release publishing, OmaYokai module/release/update/docs identity, CI gates, duplicate cleanup. |
| Review/gates/commit | same tree | done | Independent review findings are resolved; all local source/payload, Go, plugin, shell, and TUI gates pass; this ledger is included in the scoped commit. |
| Repository | local `main` / `spencerbull/oma-yokai` | ready to push | Public repository created; ordinary `main` pushes cannot create tags or releases. |
| Stopped-service semantics | local `main` | installed; visual check pending unlock | QML and OpenTUI agree on 2 running, 1 transitioning, 13 stopped, and 0 alerts against the live daemon; exact installed tree/binaries/daemon and CI verified. |

## Workers

| Name / kind | Location | State | Scope / evidence | Cleanup owner |
| --- | --- | --- | --- | --- |
| `plugin_contract` / Codex | pane `w1H:p3`, workspace `w1H`; read-only in Yokai | done, report returned | Established the installed/official Omarchy 4.0.0-1 native manifest, service, settings, theming, lifecycle, and process constraints. | Orchestrator after push |
| `yokai_upstream` / Codex | pane `w1H:p4`, workspace `w1H`; read-only in Yokai | done, report returned | Confirmed current official and marketplace submission/security bounds from primary sources. | Orchestrator after push |
| `plugin_builder` / Codex | pane `w1N:p1`, workspace `w1N`; `complete-plugin` | done, commit `c40ae8c` | Implemented the scoped plugin rewrite and returned clean post-commit validation evidence. | Orchestrator after merge/push |
| `oma_repo_audit` / Codex | pane `w1N:p2`, tab `w1N:t1`, workspace `w1N`; this worktree/branch | done, pane closed | Final review found the unproven BKC image rename, secret-capable argv bodies, and one-shot daemon recovery. All three were fixed and covered by focused tests. | Orchestrator, complete |
| `oma_contract_audit` / Codex | pane `w1N:p3`, tab `w1N:t1`, workspace `w1N`; this worktree/branch | done, pane closed | Confirmed Omarchy 4.0.0-1 root-v1 manifest, long-lived unsandboxed QML, native panel/key patterns, clone/validate/enable lifecycle, and missing contract tests. | Orchestrator, complete |
| `yokai-stopped-review` / Codex | pane `w1M:p1`, workspace `w1M`; read-only on local `main` | done, GO | Found stale stopped-health display and running/transition drift; verified the corrected final diff with no unresolved actionable issue. | Orchestrator after report |

## Human gates and residual checks

- The session is locked, so Omarchy correctly refused a shell restart and the
  final simple/deep panel interaction is deferred until unlock. The resident
  shell did reload the exact plugin without OmaYokai QML errors.
- The original rewrite task prohibited installation; this follow-up explicitly
  allowed it. Simple and deep panels rendered during the install loop before the
  final semantics patch, and the exact final reload has no QML errors.
- The repository exists, but no initial release was created; `install.sh` and
  `yokai upgrade` need an explicit future release before they can download
  OmaYokai archives.
- Implementation audit panes were closed after final review; remaining loop-owned
  research/builder resources are cleaned up after the push checkpoint.

## Duplicate proof

At baseline `625f000`, each removed nested artifact exactly matched its canonical
counterpart by SHA-256: `CODEOWNERS` `3e83cb24977c56a34061527228bfb28e10f770c3e9e4cc1bf3b10d368307ebb6`,
`ci.yml` `90c0539729a1ccdd56c40ed7fc6536276debe8c076907d876463c157691f2f3e`,
`comfyui-image.yml` `48844d4d4e02da792c4f5361bbfae0712e37981bfe21ce6f732e55b6ac9dd436`,
and `release.yml` `9157670865d2a725c0a75aa8e0948f9763d6d20998cbd0876498b60850e8ad63`.
