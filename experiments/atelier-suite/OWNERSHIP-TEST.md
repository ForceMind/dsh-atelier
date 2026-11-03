# Actual Suite installation / ownership test

## Result

**The packaging handoff and rollback route works in an empty rc.5 profile using the supported `dsh plugin` CLI.** This is not daily-profile migration or feature parity acceptance.

BrowserSkill is excluded and remains independently installed. No daily profile, real model credentials or real session was modified; no model request was sent. All fixture servers were stopped and collected.

## Frozen baseline

Source starting point: `03a0203` (including previously accepted turn+session-total time, integration navigation, independent reasoning information and spacecraft styling).

A file-whitelist copy was built/tested as local-only `dsh-atelier-plugin@1.7.0-suite.0`, with diagnostic labels updated to the same candidate identity. The maintained public package version stays1.6.0; neither fixture artifact was published. The baseline passed108 checks.

Reviewed baseline tarball SHA-512:

```
sha512-8Lned7/b3Jftcv0xXWNmwb7yNW4nTGJOCg/xA/+umCu/ptfkblhq/vldAicAhkUq5j9lTPI0ZHWqvdS+Pnompg==
```

Test Suite `@forcemind/dsh-atelier-suite@0.1.0-ownership.0` references that exact local file tarball, plus BRE0.5.4 and dsh-context0.73.3. Local file references make it a workspace fixture, **not a portable or publishable release**. Current candidate manifest with Atelier1.6.0 was NOT silently treated as latest baseline.

`prepare-ownership-fixture.mjs` reproduces the preparation in a new ignored `.release/ownership-*` directory, runs build/checks, audits whitelisted paths and writes artifact integrity metadata. It does not install, launch, publish or modify profile files.

## Actual procedure executed

1. Used workspace-installed official `@deepseek-ai/dsh@0.2.1-rc.5` CLI, with the bundled Node+pnpm invocation provided only via a fixture-local executable wrapper. Fresh `DSH_HOME`/`DSH_AGENTS_HOME` under the workspace; profile name `web`, not Desktop.
2. `dsh plugin --profile web add <baseline.tgz> dsh-better-reasoning-effort@0.5.4 dsh-context@0.73.3 --ignore-scripts --registry=https://registry.npmjs.org` created three direct dependencies and selected bundle layers. No hand-written profile manifest/patch changes.
3. `dsh plugin --profile web add <suite.tgz> --ignore-scripts --registry=...` installed the real Suite archive. Candidate module rows stayed disabled until explicit fixture invocation.
4. Stopped-host removal used official `dsh plugin --profile web remove dsh-atelier-plugin dsh-better-reasoning-effort dsh-context`. Registry and ignore-scripts supplied via npm environment because this pnpm remove does not accept those flags. An initial wrong-flags invocation failed before changing the manifest; corrected command succeeded.
5. Readback: **only Suite is an external direct dependency and selected external bundle**; base/web shipped bundles remain. From the Suite's actual package entry, all three dependencies resolve: Atelier1.7.0-suite.0, BRE0.5.4, context0.73.3. `--dump-config` succeeds with no diagnostics.
6. Fixture-only `--patch` overrides `disabled:false` on the installed Suite's existing module IDs. It does NOT insert alternative copies of those module rows. Real Host launch succeeds; graph contains reasoning1/context1. Host `clientModules.clientPath` content check confirms actual published Atelier client contains candidate label1.7.0-suite.0 and `sessionTiming`, so adjacent runtime Atelier1.6.0 was not mistaken for the candidate. All configs are defaults in this test.
7. Host stopped before rollback. Official CLI re-added the three original direct dependencies, then removed Suite. Readback restores three original selected external bundle layers and removes Suite declaration. Host boot using those original bundle layers succeeds; graph reasoning1/context1 and latest-baseline timing remains present. Server stopped and job collected.

## What remains

- Real user-config transfer, settings identity and local storage continuity across old/suite row names.
- Live HMR disable/enable and in-flight work settlement; the test used stopped-host/restart boundaries.
- Real installed Suite browser acceptance (earlier UI/mock tests loaded upstream module overlays, not this exact archive).
- Feature matrix: configured defaults, row Save/Cancel, failed writes, autofill/compat/header behavior; context historical composition/trend/Fleet; actual rollback of non-default settings.
- Portable release dependency construction, peer and package-manager ownership testing, third-party notices and package audit for final artifact.
- Explicit user approval before daily migration, and separate approval before uninstall. No original daily plugin is removable on the strength of this empty-profile test alone.
