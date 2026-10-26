# Contributing

Thank you for improving DSH Atelier. Small, focused pull requests are easiest to review.

## Development

Requirements: Node.js >=22.19.0 and pnpm 11.28.5. Runtime integration currently targets DSH 0.2.1-rc.3.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
pnpm check
```

Edit `client-source.js`, `activity.mjs` or `ui-format.mjs`, **not the generated `client.js` alone**. Commit the rebuilt `client.js`. The release tests check byte-for-byte agreement, package identity, default privacy settings and local resource exports.

## Design rules

- Discover and use public Cordis/DSH extension points; do not monkeypatch global `fetch`, mutate frozen model requests, replace the app root, or manipulate another plugin's DOM.
- Preserve logged request reconstructability, tool guidance and host permission enforcement.
- Host services own shared operations; the UI and agent tool use the same operation path.
- Register timers, languages, effects and listeners with lifecycle cleanup.
- Use host theme tokens and accessible labels. Respect reduced-motion preferences.
- Unknown price or missing usage is **unknown**, not free. Price changes need a primary source, verification date, units, context threshold and tests.
- Never add real request logs, user configuration, screenshots with private material, keys, or personal machine paths to a commit.

## Pull request checklist

- [ ] Focused change with a clear rationale.
- [ ] `pnpm build` and `pnpm check` pass.
- [ ] Generated bundle committed and package files reviewed.
- [ ] Regression tests added for behavior changes.
- [ ] English and Chinese copy updated where needed.
- [ ] Security / global-state / locale side effects documented.
- [ ] No sensitive logs, credentials or vendored dependencies.

Unit and Host-adapter tests do not prove visual correctness. For UI work, test the **installed plugin in the existing DSH application**, in light/dark themes and at a narrow width, and describe verification limits in the PR.

## Issues and licensing

Use the bug template with minimal sanitized evidence. Please read [SECURITY.md](SECURITY.md) before reporting a security concern. Contributions are licensed under the project's MIT license.
