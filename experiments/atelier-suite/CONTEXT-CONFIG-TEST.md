# Suite-owned context configuration acceptance

Executed2026-11-05 in workspace-only rc.5 `ownership-home` profile. No daily installation, credentials, model requests or real session data were changed. Fixture browser and every Host job were stopped/collected.

## Implementation

Suite now ships its own Client and registers `plugins.row.config` at both exact supported keys:

- `@forcemind/dsh-atelier-suite#dsh-context` (exclusive canonical handoff fixture)
- `@forcemind/dsh-atelier-suite#atelier-suite-context` (disabled distinct-ID candidate)

The manager supplies `{state,mutate}` for that exact row. No private module imports, undocumented configForms lookup, DOM navigation monkeypatch or fabricated standalone card. The form exposes11 volatile upstream preferences only; ordinary fold-limit settings are not falsely offered as live editable controls.

Edits remain local until Save. Mutations contain only changed field paths with the revision captured when editing began. Cancel writes nothing; conflict disables Save and retains the draft; false/refused mutations do not show success or retry. Untouched fields/expressions remain untouched. No Reset-to-inheritance claim is made because rc.5 unset may materialize inherited values rather than remove the raw key. Prefix/suffix have an explicit context-content warning.

## Actual artifact and run

1. Checked-in candidate dependency advanced from Atelier1.6.0 to published1.7.0 (BRE0.5.4/context0.73.3 unchanged). Local private canonical test tarball `0.1.0-config.0` includes the new Suite Client and original row IDs; no upstream package source modified.
2. Official isolated CLI installed that real tarball over the earlier canonical Suite fixture. Original standalone bundle layers were absent. Fixture-only enablement overrides activate existing canonical rows, not alternate inserts.
3. Host boot succeeds: reasoning/context Client entries each1; previously seeded synthetic row configuration readback succeeds.
4. Injected BrowserSkill opens the exact installed runtime. Plugin manager shows one installed Suite with4 running components and **Configure Context** button. Clicking it opens the Suite-owned form.
5. Actual form readback: granularityturn, trenddelta, synthetic prefix`SYNTHETIC_SUITE_CONFIG_TEST`, remaining defaults and empty suffix. This verifies UI binding, not just Host configuration.
6. Set turn→step then Cancel: field returns toturn and Save disabled. Set turn→step then Save: Host accepts and UI says Saved. Leave page, reopen through Suite's Configure button: step persists.
7. Restore step→turn and Save. Stop browser and Host, reboot with read-only synthetic audit: all original seeded values match.
8. Stop Host. Official CLI removes Suite FIRST, then re-adds standalone Atelier1.7.0/BRE0.5.4/context0.73.3. Restart original standalone layers with the audit: all original synthetic non-default values preserved, each upstream client entry1. Stop/collect final Host.

## Verification limits and remaining work

-17 Suite tests cover exact row keys, enums, changed-path mutation, revision fencing, refused/transport writes, missing/read-only form and source packing. Main153 checks remain green.
- Browser tested one changed enum and cancellation, unchanged synthetic prompt preservation, navigation reopen, Host restart and installation rollback. Concurrent-window refusal/transport failure are mocked, not a full live multiwindow matrix. Prompt text editing and all11 preference behaviors are not fully exercised.
- A reachable **Suite component Configure page is fixed**. The original Context Insights **Plugin settings** button still searches the old standalone bundle card; it is NOT fixed by this new page. Need a licensed source-level configurable upstream route/form target or an upstream-supported hook, not DOM interception.
- Canonical IDs are required for unchanged upstream Client preferences to consume the original namespace; exclusive stopped-Host handoff remains mandatory. New distinct-ID form availability does not make the old upstream Client hardcoded namespace compatible.
- No full context history/trend/Fleet functionality, BRE compatibility, in-flight disposal, model-storage/localStorage migration or daily switch approval is established here.

This candidate is private/unpublished. Current public Atelier1.7.0 stays unchanged. Do not uninstall daily upstream plugins based on this acceptance step alone.
