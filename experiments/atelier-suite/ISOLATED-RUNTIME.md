# Isolated rc.5 runtime fixture

Workspace directory: `atelier-suite-runtime` beside the Atelier checkout. It is not a profile and is not the installed Desktop application. Its package list pins `@deepseek-ai/dsh@0.2.1-rc.5` plus the originally tested four modules (historical fixture; BrowserSkill is now excluded from the candidate). Install uses `--ignore-scripts --legacy-peer-deps --no-audit --no-fund`; no upstream lifecycle script is authorized by this fixture.

Before any launch:

- Confirm the installed CLI version and `--help` successfully execute. An installed dependency tree is not proof that native runtime assets are available.
- Use a newly created fixture-only `DSH_HOME` and `DSH_AGENTS_HOME`; verify resolved paths are inside the workspace. Do not inherit Desktop profile paths or copy its credentials/settings/sessions.
- Disable paid model credentials, automatic title LLM, telemetry and log-upload features for the fixture. Use a no-network mock model for interaction tests.
- Never invoke the current profile plugin-manager tools to pretend they address this fixture. Use a sanctioned CLI/custom standalone composition only after checking its documented arguments. If unavailable, report fixture operation unsupported rather than edit the current profile.
- Bind loopback on an ephemeral port, track/collect the job, do not expose bootstrap authentication URLs in repository or final text. This is a user-requested isolated integration fixture, not a replacement daily server.
- First enable reasoning alone and verify Host/Client single ownership, settings readback and disposal; only later test context; BrowserSkill remains independent. No real session deletion or provider probing.

## Completed preflight

- Installed rc.5 CLI plus pinned suite modules without lifecycle scripts. CLI initially failed because `@deepseek-ai/cordis-plugin-group` is a required boot peer skipped by legacy peer installation; adding its documented `~1.0.5` range to this isolated runtime fixed CLI import.
- `--version` reports `0.2.1-rc.5`; `--help` succeeds.
- With fresh workspace-only home/agents directories, `--profile web --dump-config` succeeds. A separate all-disabled four-module overlay also composes without stderr diagnostics and contains all candidate row IDs.
- Initial Host launch exposed additional missing declared host peers; matching rc.5 packages were added only to the isolated fixture. No native rebuild or lifecycle scripts ran.
- Reasoning-only Host launch succeeds with autofill/modalityAutofill/defaultGuard/uaOverride disabled for minimal admission. A fixture-owned one-shot audit confirmed exactly one `dsh-better-reasoning-effort` Client graph entry and available model/settings services. The server was stopped and its job collected after each check.
- Initial browser boot was blocked by auth/session capacity; later the independently installed BrowserSkill DSH plugin was user-approved upgraded from0.3.3 to0.4.1 (CLI and extension also0.4.1). Real fixture settings and composer slider are now verified interactive. A graph entry alone still is not parity proof.
- Full-default reasoning config `{}` also boots successfully on a fresh empty fixture, with exactly one Client graph entry. A separate restart using the same fixture with that row disabled reports zero reasoning entries while model/settings services remain available. Both servers were stopped and jobs collected. This verifies startup graph selection, NOT live hot-unload or UI cleanup.
- Complete dsh-context0.73.3 with default config also boots in a separate empty context fixture. The audit shows context Client entries=1, reasoning entries=0, model/settings services available. Server stopped and job collected; Context UI, history analytics and Fleet remain unverified.
- Real composer checks: keyboard high→low updates selection/label. An adapter advertising default high causes official model choices to submit explicit high, so A low→B high→A high is expected; it does NOT test effort-less memory. Source inspection confirmed explicit efforts bypass the plugin fallback chain.
- Corrected no-adapter-default fixture (`suite-memory`, distinct model IDs) completed one uninterrupted short chain: Memory A Default→explicit high→Memory B Default→Memory A high. The same browser context survived; trigger labels, not thumb position, were checked. This verifies effort-less model-switch restoration for this fixture, not configured pi-ai default precedence or cross-restart memory.
- Captured native selector baseline returns HTTP200 (~27ms); enabled-plugin selections return HTTP200 (~21–33ms). Later failed clicks recorded no matching request and an earlier website console error says WebSocket closed because page entered Back-Forward Cache. This is lifecycle evidence, not proof the plugin caused navigation. Do not infer ordinary HMR equals document reload.
- A single-request network-block experiment intended to test selection rollback was registered but the page became unresponsive before any request; zero hits/requests, capture stopped and rules cleared. Rollback remains unexecuted.
- Real row configuration migration, configured defaults, live disposal/rollback and context parity tests remain outstanding; no model-generation request was made.

No native rebuild or dependency installation scripts have been approved or run.

## Scope cleanup

By explicit user decision BrowserSkill is no longer part of suite dependencies, Loader rows or migration planning. Old fixture/download artifacts are not proof of an included browser module and are not shipped. Installed BrowserSkill/CLI/extension/pairing are untouched. The latest blocker was CLI0.4.1 versus DSH-plugin0.3.3 protocol mismatch (cooperate context missing), not a reason to merge or weaken browser policy.
