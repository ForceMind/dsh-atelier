# Original Insights settings-button navigation acceptance

Executed2026-11-05. Scope: only the original **Context Insights → Plugin settings** entry under Suite ownership. No daily profile, existing standalone installation, credentials or real session was removed/replaced. No public release or market work was performed. All fixture browser/Host resources were stopped and collected.

## Minimal adaptation and provenance

Unmodified dsh-context0.73.3 Client SHA-256:

```
a3c02b20d80a2d8dd220bb1500cc2df9b6a77e9867a5606e5c92e4699e3a5f2b
```

`context-navigation-adapter.mjs` accepts only that reviewed digest and requires exact single-match anchors. Unknown versions fail closed. It creates NEW private fixture bytes, never edits an installed package. Changes:

1. Replace the original settings helper's DOM sidebar click/card lookup/poll with declared `pluginNavigation.openBundle('@forcemind/dsh-atelier-suite')`.
2. Bind/dispose the injected navigation service in the upstream Client lifecycle.
3. Retarget the original upstream `plugins.bundle.config` registration from the old standalone bundle key to the Suite bundle key. Original `dsh-context` config namespace and upstream form/state remain unchanged.
4. Order Client loading after the formal plugin manager and remove the now-invalid sourcemap comment.

The Host code is unchanged. Original package metadata, locales, LICENSE and applicable NOTICE files are retained; the modified Client header and `ATELIER-NAVIGATION-NOTICE.md` identify Atelier's change, upstream bowenliang123 and Apache-2.0. No runtime DOM interception, fake standalone card, private navigation-store mutation or global service replacement.

The helper retains the package name solely in a **local private artifact** version0.73.3-suite-nav.0 so Host/Client identity is preserved. It must NOT be published as an upstream dsh-context release. The normal checked-in Suite dependency still references original0.73.3; this adapter is NOT silently installed for general users.

## Actual artifact test

- A new empty workspace-only `navigation-home`/`navigation-agents` was created through the official isolated CLI. Existing ownership fixture and daily profiles were not switched.
- `prepare-navigation-fixture.mjs <upstream-package-dir>` generated private adapted context and Suite0.1.0-navigation.0 tarballs. The Suite depends on that local file archive, published Atelier1.7.0 and original BRE0.5.4. Absolute local dependency makes this a nonportable fixture, not a release candidate for npm.
- Installed the actual Suite archive via `dsh plugin --profile web add ... --ignore-scripts`. Fixture invocation enables its canonical rows; original standalone layers never selected in this new profile.
- Seeded synthetic context config through invocation layer: granularityturn, trenddelta, prefix`NAVIGATION_SYNTHETIC_CHECK`; no real model/credentials.
- Real Host boot succeeded. Injected BrowserSkill opened the exact running fixture. Opened **Context Insights**, then clicked its ORIGINAL **Plugin settings** button.
- Result: Suite detail heading/version0.1.0-navigation.0 and the actual upstream context settings form appear immediately on the same page, BEFORE the components list. It did not stop on the generic Plugins list and required no second Configure click.
- Form readback shows **轮次 / 增量 / NAVIGATION_SYNTHETIC_CHECK**, proving it is the intended namespace/form rather than an empty unrelated settings page.
- Returned to Insights and clicked the original button again: same correct Suite form and all synthetic values. No setting was edited or saved in this navigation-only test.
- Browser closed, fixture Host stopped and job collected.

## Verification boundary

Two adapter tests verify unknown-source refusal, correct formal route, original form retarget, retained namespace and unchanged source bytes. Entire candidate19 tests and public-workbench153 tests run separately.

This closes the requested navigation entry in the tested private canonical Suite fixture only. It does not establish full context history/Fleet preference parity, new upstream-version compatibility, live unload during an action, or a distributable adapter strategy. The previous Suite-owned component form remains available separately; the upstream form on Suite detail retains its original autosave semantics rather than the Suite-owned Save/Cancel UI.

Before any final Suite release, choose maintained upstream configurable navigation support or an explicitly versioned/attributed adaptation distribution. No daily install or original plugin should be deleted/replaced because this navigation test passes.
