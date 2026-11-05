# Atelier Suite candidate

This is a not-yet-released integration candidate, not a completed daily-profile replacement. A real installation/standalone-removal/restart/rollback test passed in an empty rc.5 profile; see [ownership test evidence](OWNERSHIP-TEST.md).

## Meaning of consolidation

One installation supplies pinned complete upstream modules. Removing a separate top-level installation is possible only after migration; the dependency code remains required. This is packaging consolidation, not a claim that Atelier independently reimplemented reasoning compatibility or context analytics. Dependency installation alone does not prove activation or safe removal.

Pinned modules: Atelier1.7.0, Better Reasoning Effort0.5.4 and dsh-context0.73.3. The upstream package names/client IDs remain unchanged.

The Suite-owned context component configuration page is implemented and passed real isolated read/edit/cancel/save/reopen/restart/standalone-rollback acceptance. See [context configuration evidence](CONTEXT-CONFIG-TEST.md). A separate fixed-digest, licensed build-time adaptation now also passes the original Insights settings-button navigation in a NEW private canonical fixture; see [navigation evidence](NAVIGATION-TEST.md). This adaptation is not enabled in the normal dependency manifest or published; full preference-consumption parity still requires separate work.

BrowserSkill remains independent by explicit user decision. It is not installed, activated, migrated or removed by this candidate. Its CLI, browser extension, permissions and pairing remain independently managed.

## Current state

- Candidate manifest and unique, disabled-by-default module rows authored.
- Not installed in the daily profile. No old plugin disabled/uninstalled.
- Matching rc.5 client-modules documentation confirms enabled-Loader-entry scanning, asynchronous disposal on disable, and rejection of distinct active sources for one package name. This is a documented contract, not an executed suite transition test; isolated composition and runtime checks remain required.
- Workspace-only `npm install --ignore-scripts --legacy-peer-deps --no-audit --no-fund` completed and generated a lockfile. `verify-artifacts.mjs` confirmed every pinned version, Host/Client entry and license. No installation scripts ran.
- `npm ls` reports required host peers missing in this standalone directory. This is NOT a clean runtime: Cordis/DSH services/React must be provided by a compatible Harness environment, not silently duplicated to suppress the warning.
- Current candidate pins published Atelier1.7.0 and ships its own row configuration Client. Canonical config fixture0.1.0-config.0 was actually installed using normal npm dependencies and passed the documented UI/rollback test. Historical ownership.0/.1 packages used local tarball references; they remain fixture-only, not release artifacts. The preparation script still generates private frozen pairs, now including Suite Client resources.
- No bundledDependencies yet: normal dependency resolution fetches upstream npm packages, not an offline artifact. Native peer resolution and no-duplicate React/Cordis require inspection.

## Required migration order

1. Inspect complete current configurations through sanctioned config mechanisms; preserve expressions and secrets without writing them to repository. Unique suite row IDs change Config identity: copy reviewed configuration before enabling, test settings links and upstream hard-coded namespaces.
2. Isolated composition tests for exact host versions, dependencies, client discovery, metadata and all feature acceptance tests. Never exercise by deleting real data or sending paid probes.
3. Leave the independent BrowserSkill installation, sessions and pairing untouched.
4. With explicit user confirmation, disable one old row, enable the matching suite row, verify exactly one host/client instance. BRE double activation can duplicate prepareCall/stream/fetch wrappers; scanner dedup alone is insufficient.
5. Verify feature parity, saved model/default/memory behavior, settings readback, context/history/Fleet. Fail closed and restore the old row on any problem.
6. Only after parity passes and user confirmation, remove standalone installation records, not transitive dependency contents. Verify plugin-manager ownership: removing or disabling an old bundle must not turn off shared suite runtime rows.

## Guarded handoff planner

`migration-plan.mjs` is a pure, no-write admission planner. It rejects duplicate active implementations, pending/loading/unloading transitions, missing configuration review. It requires explicit exact-ID disposal confirmation before emitting an isolated-enable plan. It never permits automatic removal, serializes no configuration/secrets, and treats local/public Atelier as competing implementations. Twelve candidate/plan/config-transfer tests pass. `config-transfer.mjs` preserves explicit raw row config and expressions, keeps the candidate disabled, refuses redacted/unverified snapshots, detects source changes and blocks rollback over a changed target. Transfer plans contain private raw configuration and MUST NOT be logged or committed. Tests use synthetic data only; the planner is not a production migration operation. A real isolated package installation used the transfer helper with verified synthetic row config and passed takeover/readback/standalone rollback; see [non-default config evidence](NONDEFAULT-CONFIG-TEST.md). Actual Suite Context Insights empty state and component inventory were observed; settings navigation has an unresolved gap.

## Remaining engineering

Compatible isolated host/peer setup; actual Loader and scanner transition tests; configuration transfer with rollback; full feature matrix; current rc5 compatibility; package license/content audit; runtime UI verification. Dependency download/lockfile and artifact-presence audit are complete, not runtime activation.
