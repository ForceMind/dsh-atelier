# Release process

## Preflight

1. Review changes, [security policy](../SECURITY.md), migration notes and changelog.
2. Update the package version, Host/Client build labels and changelog together.
3. Install with the committed lockfile, build, run all checks and inspect the package:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
pnpm check
npm pack --dry-run --ignore-scripts
```

4. Inspect `git diff`, then the actual tarball file list. Never include user logs, profile configuration, credentials, `node_modules`, or the original developer screenshot.
5. Confirm the generated bundle matches source and every package/module/patch ID is `dsh-atelier-plugin`.
6. Test the packed artifact in a clean DSH profile on a declared-compatible runtime. Disable the legacy local bundle before testing a migration.

## Publish

The maintainer publishes only after explicit authorization. No npm token is stored in this repository.

```sh
npm whoami --registry=https://registry.npmjs.org
npm publish --access public --registry=https://registry.npmjs.org
```

If npm requires a one-time passcode or browser approval, complete it privately. Do not paste credentials into an issue, commit, tool argument, or chat. `prepack` rebuilds the browser module but never runs on end-user package installation.

After registry verification, create the matching Git tag / GitHub Release and attach the exact reviewed `.tgz`. Verify `name`, version, `repository`, `dist.integrity`, published time, and package contents via npm. Do not mark a registry publish successful from an unverified CLI message alone.

## Catalog submission

The configured community catalog is [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin). Read its current [contribution rules](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md) before every submission. As inspected on 2026-10-26:

- Submit one PR adding `data/plugins/ForceMind__dsh-atelier.yml`; do not edit generated READMEs/indexes.
- The repository must be public, installable, tagged `dsh-plugin`, and at least one day old. A new repository's age check can be re-gated automatically; do not bypass it.
- Entry fields are `url`, `name`, one `category`, `description.en` / optional `description.zh`, and optional allowed image/tarball URLs. Do not add invented `npm`, `version`, `author`, or `installTarget` fields.
- npm metadata must point to this GitHub repository. Package association is probed automatically.
- Website GitHub-only listing and install-index publication are different. The configured `dsh-plugin-catalog/index.json` generator currently emits npm sources only, so an npm version is needed for that index.

Example entry (verify schema and description before submission):

```yaml
url: https://github.com/ForceMind/dsh-atelier
name: ForceMind/dsh-atelier
category: dev
description:
  en: 'A local workbench with model metrics, cost estimates, prompt presets, and optional request auditing for DeepSeek Harness.'
  zh: '为 DeepSeek Harness 提供模型指标、费用估算、提示词库与可选请求审计的本地工作台。'
```

## Verify market state separately

1. Source repository push and GitHub Release exist.
2. Public npm version resolves with the correct repository mapping.
3. Catalog PR is accepted/merged and its main-branch entry exists.
4. Catalog scheduled publish probes the package, emits a new known version and CDN cache refreshes. As inspected, npm-catalog publishing is nightly at 02:23 UTC or manual maintainer dispatch, not every merge.
5. Query the exact versioned catalog `index.json`, then the user's unversioned configured URL. Verify package/version/repository/source.
6. `plugin_market` discovers `dsh-atelier-plugin@<version>` as its actual install target.

Report each state honestly. A submitted PR is not a live market listing, and a merged website entry is not proof that the installation index has updated.
