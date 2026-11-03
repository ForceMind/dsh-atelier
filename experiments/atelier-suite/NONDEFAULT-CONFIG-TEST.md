# Non-default configuration handoff test

## Scope and result

The supported configEditor service persisted synthetic non-default row configuration in the isolated rc.5 profile. A real Suite tarball migrated that configuration into its own row IDs; after removing original direct installation records and booting Suite, every chosen value matched. Restoring independent packages and removing Suite preserved the original row values as well.

No daily profile, real credentials or real conversation was read or changed. This is an executed synthetic row-config migration test, not proof of complete real-user migration or data-store continuity.

## Exact configuration tested

Better Reasoning Effort0.5.4:

```json
{"autofill":false,"modalityAutofill":false,"probeTimeoutMs":3210,"bootRetryDelaysMs":[41,83],"defaultGuard":false,"uaOverride":false}
```

dsh-context0.73.3:

```json
{"defaultGranularity":"turn","defaultTrendMode":"delta","defaultToolSort":"count","promptPrefix":"SYNTHETIC_SUITE_CONFIG_TEST","promptSuffix":""}
```

The synthetic prefix is never sent to an upstream model; no generation request was made. These values intentionally do not exercise expressions, secrets, model declaration storage, headers or localStorage migration.

## Executed procedure

1. Start the original standalone bundle installation left by the prior ownership rollback, in workspace-only `ownership-home`/`ownership-agents`.
2. Read actual settings namespaces. Context has a normal `dsh-context` descriptor; reasoning plugin config is not exposed in that descriptor list. Do not invent a reasoning settings namespace.
3. A fixture plugin with declared `configEditor` injection locates each exact original Loader row by `entry.options.id` and `name`. `configEditor.edit` merges the synthetic values, persists through the normal Loader path, then `configuration()` readback confirms every selected field. The fixture does not edit profile YAML directly.
4. Stop Host. Build local-only Suite0.1.0-ownership.1 from the audited baseline1.7.0-suite.0. The actual `prepareConfigTransfer` pure helper copies only the verified synthetic row config to disabled `atelier-suite-reasoning` and `atelier-suite-context` rows. No user-secret snapshot is involved. This local-path fixture is not portable/published.
5. Install that actual tarball with `dsh plugin --profile web add`, then remove the three isolated direct module dependencies with the same supported CLI.
6. Boot with fixture invocation overrides enabling the Suite's own existing rows. `configEditor.configuration()` finds the Suite IDs and verifies all synthetic field values. Startup graph has reasoning1/context1 and no module import failure. `synthetic-suite-verification.json` reports both rows verified.
7. Via injected BrowserSkill0.4.1, open the exact Suite fixture. Dismiss onboarding without adding credentials. The Context Insights page loads, showing correct empty-state metrics and controls. Plugin manager lists only Suite as the installed external bundle; its detail lists the suite inventory row plus workbench/reasoning/context, all four running.
8. Click Context Insights “Plugin settings”: it opens the generic plugin list, not the specific context configuration. This is an observed navigation gap. A hard-coded old bundle/row target is a hypothesis, not yet a verified cause. Do not claim settings navigation parity or patch unrelated routes without inspection.
9. Close the browser session and stop Host. Official CLI restores original direct packages and removes Suite. Restart original bundle layers with a read-only fixture audit: every original synthetic config value matches. `synthetic-rollback-verification.json` reports both rows verified. Stop Host and collect job.

## Remaining acceptance gates

- Repair/verify context settings navigation under Suite ownership.
- Test model declarations, plugin-owned defaults, modalities and headers in the shared llm-pi-ai document; do not confuse these with the above row-level config.
- Browser memory keys, persisted workbench domain and full context historical/Fleet fixtures.
- Live disposal and in-flight resource settlement; tests here use stopped Host / restart boundaries.
- General-purpose migration tooling with current-row validation, conflict handling and no secret logging; this fixture's seeded callback is not a production migration endpoint.
- Portable Suite artifact and explicit daily-profile switch authorization.

The installed daily plugins remain untouched and must not be removed on the basis of this test alone.
