# Atelier Suite

Atelier Suite bundles the Atelier workbench, Better Reasoning Effort (BRE), and Context into one DeepSeek Harness package. BrowserSkill and GameForge remain separate.

[简体中文](README.zh-CN.md) · [Bundled sources and licenses](THIRD-PARTY.md)

## Install and enable

The target for this release is DeepSeek Harness `0.2.2-rc.5` on Windows. Other versions and platforms are not covered by the release checks. Do not set the Node export condition `standard-schema-spec` for this bundle: the bundled upstream dependency does not ship its target file for that condition.

1. Use the DSH plugin manager to add the verified `@forcemind/dsh-atelier-suite@0.1.0` package or its verified local archive. When evaluating a local candidate, use a separate test profile. The standalone Atelier repository root is not a Suite package.
2. A fresh Suite install leaves the three component rows disabled. Enable only the components you want in the Suite details. Open Context preferences from **Plugins → Atelier Suite → Context**, or from **Context Insights → Settings → Atelier Suite → Context**. Both paths use the same form. Use **Save** to apply changes or **Cancel changes** to discard them.
3. Do not select the Suite and any of the three original standalone bundle layers together, even if their component rows are disabled. They deliberately retain the same configuration and loader identities.

## Upgrade and roll back

Before switching an existing profile, record its package versions, enabled components and local package sources. Keep the original install media and take a private, readable backup of its raw configuration and persistent state. Finish requests and stop the target Host before changing the selected layers. Use the supported DSH plugin management path; if it cannot complete the change without loading both layers, stop. Do not edit installed modules or overwrite the profile with an exported view of effective settings.

Verify the enabled components, preserved model settings, price rules and history after switching. For rollback, stop the target Host again and restore the prior package selection without enabling two owners for the same component. Preserve edits made after switching: review differences before restoring any backup, and do not overwrite newer data with a stale snapshot. Browser preferences are scoped to the browser origin; changing it does not migrate preferences automatically. Derived Context caches are not replacements for the original sessions or attachments.

## Data and licensing

Automatic reply suggestions may produce no draft when there is no grounded next action. A suggestion may require a model request even when nothing is shown. Accepting a suggestion inserts text only; it does not send it. Existing custom price rules remain user settings. Suite-owned code is MIT; bundled modules retain their original licenses, including Apache-2.0 for Context. See the bundled source manifest and modification notices for details.
