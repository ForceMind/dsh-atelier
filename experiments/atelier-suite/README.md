# Atelier Suite candidate

This is an uninstalled integration candidate, not a completed replacement.

## Meaning of consolidation

One installation supplies pinned complete upstream modules. Removing a separate top-level installation is possible only after migration; the dependency code remains required. This is packaging consolidation, not a claim that Atelier independently reimplemented browser automation, reasoning compatibility or context analytics. Dependency installation alone does not prove activation or safe removal.

Pinned modules: Atelier1.6.0, Better Reasoning Effort0.5.4, dsh-context0.73.3, BrowserSkill plugin0.3.3. The upstream package names/client IDs remain unchanged. BrowserSkill still requires matching CLI and browser extension; neither is distributed by this candidate.

## Current state

- Candidate manifest and unique, disabled-by-default module rows authored.
- Not installed in the daily profile. No old plugin disabled/uninstalled.
- Matching rc.5 client-modules documentation confirms enabled-Loader-entry scanning, asynchronous disposal on disable, and rejection of distinct active sources for one package name. This is a documented contract, not an executed suite transition test; isolated composition and runtime checks remain required.
- Workspace-only `npm install --ignore-scripts --legacy-peer-deps --no-audit --no-fund` completed and generated a lockfile. `verify-artifacts.mjs` confirmed every pinned version, Host/Client entry and license. No installation scripts ran.
- `npm ls` reports required host peers missing in this standalone directory. This is NOT a clean runtime: Cordis/DSH services/React must be provided by a compatible Harness environment, not silently duplicated to suppress the warning.
- Candidate uses published Atelier1.6.0, not later local unshipped integration hub changes.
- No bundledDependencies yet: normal dependency resolution fetches upstream npm packages, not an offline artifact. Native peer resolution and no-duplicate React/Cordis require inspection.

## Required migration order

1. Inspect complete current configurations through sanctioned config mechanisms; preserve expressions and secrets without writing them to repository. Unique suite row IDs change Config identity: copy reviewed configuration before enabling, test settings links and upstream hard-coded namespaces.
2. Isolated composition tests for exact host versions, dependencies, client discovery, metadata and all feature acceptance tests. Never exercise by deleting real data or sending paid probes.
3. Stop BrowserSkill-owned sessions through its normal lifecycle; preserve browser pairing and CLI state.
4. With explicit user confirmation, disable one old row, enable the matching suite row, verify exactly one host/client instance. BRE double activation can duplicate prepareCall/stream/fetch wrappers; scanner dedup alone is insufficient.
5. Verify feature parity, saved model/default/memory behavior, settings readback, context/history/Fleet, browser tools/skills/help/cleanup. Fail closed and restore the old row on any problem.
6. Only after parity passes and user confirmation, remove standalone installation records, not transitive dependency contents. Verify plugin-manager ownership: removing or disabling an old bundle must not turn off shared suite runtime rows.

## Guarded handoff planner

`migration-plan.mjs` is a pure, no-write admission planner. It rejects duplicate active implementations, pending/loading/unloading transitions, missing configuration review, and open BrowserSkill sessions. It requires explicit exact-ID disposal confirmation before emitting an isolated-enable plan. It never permits automatic removal, serializes no configuration/secrets, and treats local/public Atelier as competing implementations. Six candidate/plan tests pass. These tests use synthetic inventory; the planner is not yet connected to real plugin-manager operations and cannot itself enforce ownership or perform rollback.

## Remaining engineering

Compatible isolated host/peer setup; actual Loader and scanner transition tests; configuration transfer with rollback; full feature matrix; current rc5 compatibility; package license/content audit; runtime UI verification. Dependency download/lockfile and artifact-presence audit are complete, not runtime activation.
