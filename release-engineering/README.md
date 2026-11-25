# Atelier Suite: reproducible source build

This guide builds and checks the **private in-memory Suite plan**. It does not produce or publish a tarball, install a plugin, start DeepSeek Harness, or modify a user's profile. The repository root is the standalone Atelier package, **not** the Suite. Do not run `npm publish` or use the older experiment's npm scripts to build or release the Suite.

## Prerequisites

- Use a checkout from the reviewed Suite source tree, with original file bytes and line endings preserved (on Windows, use `core.autocrlf=false` at checkout). The build refuses changed locked inputs.
- Use Node.js 24 and Python 3.12. This procedure was verified on Windows with Node.js `24.21.0` and Python `3.12.14`; this is not a cross-platform runtime compatibility claim.
- Run commands from the repository root. Use your actual Python and Node executable names if they are not `python` and `node`.

## Obtain the locked inputs

For a fresh checkout with direct HTTPS access to the public npm registry:

```text
python -I -S -B release-engineering/inputs/acquire.py --fetch
```

This fetches only the missing **exact** tarballs in [inputs/lock.json](<inputs/lock.json>). It does not use npm credentials, follow redirects, resolve version ranges, or run package scripts. If direct registry access is unavailable, place the eight exact locked tarballs in `release-engineering/.inputs/archives/`, each named `<archiveSha256>.tgz` using its lock entry. Then use the offline command instead:

```text
python -I -S -B release-engineering/inputs/acquire.py --offline
```

Either mode verifies the archives and materializes a local input snapshot. Keep `release-engineering/.inputs/` out of Git and out of any release artifact. A complete snapshot can be checked again with `--verify`, which does not fetch or rebuild it. If the tool refuses an incomplete or changed snapshot, preserve it for diagnosis and use a fresh checkout; do not weaken the pins.

## Reproduce and test the plan

```text
python -I -S -B release-engineering/inputs/acquire.py --verify
node release-engineering/recipe/suite-plan.mjs
python -I -S -B release-engineering/inputs/acquire.test.py
node --test release-engineering/recipe/suite-plan.test.mjs release-engineering/context083/port.test.mjs release-engineering/draft/policy.test.mjs release-engineering/draft/integration.test.mjs
```

The planner prints a summary. Add `--full` to print the complete sorted member list and checksums without writing a file. For the reviewed source snapshot documented here, expect `1,723` files, `88` internal directories, and this tree SHA-256:

```text
367845c03c44556b190b2e6db270f773394ccd3d3f61102e1ba508e21f953580
```

Compare the tree SHA-256 only when using the same source inputs. It identifies the in-memory member list, **not** the SHA-256 of a `.tgz` file. The tests expect eight archives, separate Zod copies (`4.6.7` for the Suite and `4.4.3` for Context), exactly one configuration row for each component, and no bundled BrowserSkill or GameForge.

## Local 0.1.0 acceptance archive (not published)

The development-plan hash above is not the release archive hash. The local release-candidate builder adds public package metadata, bilingual installation instructions and localized display names. The audited 0.1.0 candidate has SHA-256 `0e85bf7002147237b2e1ca2a10c68fdc3d936672a7d671f261d61da3fd12d491`. See the [English](recipe/README.release.en.md) or [Chinese](recipe/README.release.zh-CN.md) installation and rollback guide. Never publish from the repository root.

## What these checks do not establish

Offline tests check the source transformations and package plan. They do not verify the installed Host loader, browser behavior, persisted data upgrades, the exact public tarball, or anonymous installation from npm. Those checks must be performed separately on an approved artifact. Suite-owned code is MIT; bundled modules retain their respective licenses, including Apache-2.0 for Context. The plan carries source provenance, original licenses, and modification notices.
