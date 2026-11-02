# Isolated rc.5 runtime fixture

Workspace directory: `atelier-suite-runtime` beside the Atelier checkout. It is not a profile and is not the installed Desktop application. Its package list pins `@deepseek-ai/dsh@0.2.1-rc.5` plus the four suite modules. Install uses `--ignore-scripts --legacy-peer-deps --no-audit --no-fund`; no upstream lifecycle script is authorized by this fixture.

Before any launch:

- Confirm the installed CLI version and `--help` successfully execute. An installed dependency tree is not proof that native runtime assets are available.
- Use a newly created fixture-only `DSH_HOME` and `DSH_AGENTS_HOME`; verify resolved paths are inside the workspace. Do not inherit Desktop profile paths or copy its credentials/settings/sessions.
- Disable paid model credentials, automatic title LLM, telemetry and log-upload features for the fixture. Use a no-network mock model for interaction tests.
- Never invoke the current profile plugin-manager tools to pretend they address this fixture. Use a sanctioned CLI/custom standalone composition only after checking its documented arguments. If unavailable, report fixture operation unsupported rather than edit the current profile.
- Bind loopback on an ephemeral port, track/collect the job, do not expose bootstrap authentication URLs in repository or final text. This is a user-requested isolated integration fixture, not a replacement daily server.
- First enable reasoning alone and verify Host/Client single ownership, settings readback and disposal; only later test context/browser. No real session deletion or provider probing.

## Completed preflight

- Installed rc.5 CLI plus pinned suite modules without lifecycle scripts. CLI initially failed because `@deepseek-ai/cordis-plugin-group` is a required boot peer skipped by legacy peer installation; adding its documented `~1.0.5` range to this isolated runtime fixed CLI import.
- `--version` reports `0.2.1-rc.5`; `--help` succeeds.
- With fresh workspace-only home/agents directories, `--profile web --dump-config` succeeds. A separate all-disabled four-module overlay also composes without stderr diagnostics and contains all candidate row IDs.
- Initial Host launch exposed additional missing declared host peers; matching rc.5 packages were added only to the isolated fixture. No native rebuild or lifecycle scripts ran.
- Reasoning-only Host launch succeeds with autofill/modalityAutofill/defaultGuard/uaOverride disabled for minimal admission. A fixture-owned one-shot audit confirmed exactly one `dsh-better-reasoning-effort` Client graph entry and available model/settings services. The server was stopped and its job collected after each check.
- Browser boot/interaction remains unverified: direct HTTP index request returned 401, and injected browser session start hit the five-session limit. No auth bypass or foreign window closure was attempted. A graph entry is not proof of mounted Client effects or parity.
- Full-default reasoning config `{}` also boots successfully on a fresh empty fixture, with exactly one Client graph entry. A separate restart using the same fixture with that row disabled reports zero reasoning entries while model/settings services remain available. Both servers were stopped and jobs collected. This verifies startup graph selection, NOT live hot-unload or UI cleanup.
- Settings migration, model/UI behavior, live disposal/rollback and browser/context parity tests remain outstanding; no model request was made.

No native rebuild or dependency installation scripts have been approved or run.
