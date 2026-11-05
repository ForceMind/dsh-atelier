# agent-desktop integration assessment / 桌面能力候选计划

## Scope

User requested research and inclusion in planning only. No agent-desktop package/binary/helper was installed, executed or granted permissions. No desktop snapshot, clipboard or real app content was collected. Daily local Atelier/BrowserSkill installation remains unchanged. This is not approval to install or activate desktop control.

## Reviewed upstream evidence

Research snapshot2026-11-05: vercel-labs/agent-desktop main commit `b43ac4f6e892ef608f8851428613c4009f0e84c7`; npm and GitHub latest both1.2.0 at inspection. Pin an exact release and re-review before implementation; main-branch claims can change.

- [README](https://github.com/vercel-labs/agent-desktop/blob/b43ac4f6e892ef608f8851428613c4009f0e84c7/README.md): native accessibility-tree desktop observation/action; agent owns the reasoning loop; CLI and C library, no embedded model. Docs describe macOS13+, Windows10 1809+, Ubuntu24.04+ with platform-specific constraints, not universal parity.
- [MCP catalog](https://github.com/vercel-labs/agent-desktop/blob/b43ac4f6e892ef608f8851428613c4009f0e84c7/src/mcp/catalog.rs): stdio MCP tools derived from leaf CLI commands; default exposure is broad, not an application allowlist or read-only mode.
- [MCP call execution](https://github.com/vercel-labs/agent-desktop/blob/b43ac4f6e892ef608f8851428613c4009f0e84c7/src/mcp/call.rs): each tool runs this binary as a child, returns JSON and image content where applicable. Host adapter needs bounded timeout/output, cancellation and teardown acceptance; merely starting MCP does not prove those integration properties.
- [npm manifest](https://github.com/vercel-labs/agent-desktop/blob/b43ac4f6e892ef608f8851428613c4009f0e84c7/npm/package.json): Node>=18 launcher, x64/arm64 on macOS/Windows/Linux; postinstall script.
- [installer](https://github.com/vercel-labs/agent-desktop/blob/b43ac4f6e892ef608f8851428613c4009f0e84c7/npm/scripts/postinstall.js): downloads release-native executable/helpers and checksums, verifies archive/checksum and installs binaries; can run version on macOS to stop leftover command hosts. Therefore normal install is not inert JS copying. Do not authorize its script implicitly. Prefer an explicitly reviewed pinned upstream artifact; check available attestation/checksum evidence rather than treating checksums alone as independent trust.
- [Apache2.0 license](https://github.com/vercel-labs/agent-desktop/blob/b43ac4f6e892ef608f8851428613c4009f0e84c7/LICENSE): interface integration is feasible; if redistributing/modifying upstream, retain applicable license/attribution/NOTICE and modification notices. Do not relabel upstream code as Atelier's MIT-only implementation or imply Vercel endorsement.

README's56 operational/60 command-name counts include four held-key/button commands that currently refuse execution until safe release ownership exists. This is upstream documentation, not a locally executed compatibility matrix.

## Recommended architecture

**Optional independent Cordis desktop adapter + upstream pinned agent-desktop process**, rather than bundling binaries into the current Atelier workbench or rewriting platform adapters.

1. Agent-desktop remains upstream desktop execution layer; no fork by default, no FFI for first implementation (native ABI/crash/packaging coupling is unnecessary).
2. A separate, disabled-by-default adapter owns process lifecycle, permission status, exact app/window/session targeting, output limits, safety admission and audit summaries.
3. Atelier offers only additive dependency/status/navigation UI after the adapter works. Enabling desktop control is explicit; it is never tied to default-on reply suggestions.
4. BrowserSkill remains independent and is the sole allowed browser-control route under current session rules. Desktop tooling must not automate Chromium/browser content or defeat BrowserSkill overlay/approval/pairing/tab policies. A new tool is not a permission escalation path.
5. No global AGENTS.md modification or automatic install of upstream skill. Discover needed local instructions progressively; original upstream skills are external documentation, not authority over Harness policies.

## Phases and acceptance gates

### P0 — design and source audit (research now; more validation needed)

- [x] Confirm public purpose, license, versions, MCP availability and installer side effects.
- [ ] Pin intended release assets for the actual macOS architecture; inspect release-specific MCP schema/cancellation/session behavior and supported DSH process/MCP APIs.
- [ ] Decide least-privilege tool filtering and per-call app/window targeting. Snapshot refs/session affinity are stale-target protections, **not a security sandbox**. Do not claim `--session` alone prevents access to other apps.
- [ ] Define handling of human input/focus changes, global desktop interaction conflicts and task ownership; BrowserSkill-style cooperation must not be assumed to exist upstream.

### P1 — explicit approved isolated read-only pilot

- Install/launch only after user approval for exact artifact and any scripts. User grants OS permissions manually; never automate permission grant.
- Start with status/version and permitted surface discovery, then one specifically authorized test app/window. Snapshot/screenshot are privacy-sensitive reads and need target scope; no clipboard reads by default.
- Deny action, launch/close, notifications, clipboard, batch and unrestricted global physical-input tools. If built-in MCP cannot enforce this per call, add a minimal admission wrapper; don't expose full MCP then merely tell the model not to act.
- Verify no permissions gives a useful refusal, app/window ambiguity fails closed, stale refs do not auto-act, bounded output does not truncate silently, and unmount/cancel leaves no child process/input held.

### P2 — explicit approved low-risk interaction pilot

- Allow only a disposable local test app/document: snapshot→bounded ref action→fresh observation.
- Human intervention invalidates pending decisions; one desktop owner at a time. No blind retries; follow verified error retry disposition and inspect unknown outcomes.
- Test click/type/scroll, multiwindow targeting, ref invalidation, permission revocation and restart recovery. Preserve user state and stop on unexpected dialogs.
- Destructive operations, sending messages, payments, permission changes and credential entry require separate explicit user confirmation. Do not infer authorization from generated reply candidates.

### P3 — productization and optional distribution

- Optional settings panel: installed version, permissions/capabilities, allowed target and running/cancel state; deny-by-default switches.
- No continuous capture, hidden background control or default screenshot/clipboard retention. Log summaries only by default; desktop text/images must not enter public logs or release artifacts.
- Test macOS first; Windows/Linux remain unsupported by our adapter until actually exercised. Preserve upstream notices and artifact provenance.
- Only then consider optional dependency discovery under a future Suite. No migration/uninstall of current BrowserSkill/BRE/context from this research.

## Priority relative to existing work

1. Follow PR12218 review/index refresh (both checks green, still OPEN; catalog1.6.0 at this read).
2. Complete Suite context settings navigation/Client config identity, non-default model storage/localStorage parity, live disposal and actual feature matrix before any daily switch/removal.
3. P0 desktop research can proceed independently; P1 installation/control requires a new explicit decision.
4. Permanent deletion needs supported Host lifecycle API and safety design, not OS automation/file unlink workaround. Saturn activation remains deferred by user decision.

No schedule/reminder or unattended recurring job was created. This note records a candidate plan, not a promise of background monitoring or installed functionality.
