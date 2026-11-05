# Contributing

Thank you for improving DSH Atelier. Small, focused pull requests are easiest to review.

## Development

Requirements: Node.js >=22.19.0 and pnpm 11.28.5. Planned 1.7.0 runtime integration targets DSH >= 0.2.1-rc.5 <0.3.0, with rc.5 as the exercised baseline. Earlier rc.3 checks are historical features only; do not label new reply-candidate behavior rc.3-verified. This documentation does not publish 1.7.0.

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
- Document automatic inference prominently: reply candidates default ON/5 seconds, use an independent available Luna recommendation at low, and can incur API fees. Do not describe the feature as opt-in or equate body-capture OFF with no outbound calls.
- Preserve bounded recent context (6 user turns/12 user-assistant rows/24K text chars), excluded system/reasoning/tool/attachment categories, explicit truncation and sensitive-operation confirmation limits. Private text can still reach the provider; do not claim DLP.
- Mouse and keyboard Tab must share accept-only behavior. Editing hides the cache; clearing restores it without a second call. Do not add auto-send, change the normal conversation model, or hide independent draft-call costs inside conversation totals.
- Keep turn-plus-session running-time semantics: include the active turn once, exclude idle gaps. Do not relabel reasoning-stream measurements as internal model thinking time.
- Integration & dependencies is navigation only. Suite replacement remains incomplete; retain Better Reasoning Effort/dsh-context separately and BrowserSkill independently until real migration acceptance and explicit authorization.
- Never add real request logs, user configuration, screenshots with private material, keys, or personal machine paths to a commit.

## Pull request checklist

- [ ] Focused change with a clear rationale.
- [ ] `pnpm build` and `pnpm check` pass.
- [ ] Generated bundle committed and package files reviewed.
- [ ] Regression tests added for behavior changes.
- [ ] English and Chinese copy updated where needed.
- [ ] Security / global-state / locale side effects documented, including default automatic API calls, privacy payload, fees excluded from conversation totals and no-auto-send behavior.
- [ ] Reply UI tested for pointer-transparent candidate text, typed-then-cleared restoration, stale-source/version rejection and mouse/keyboard Tab parity; no live paid probes without authorization.
- [ ] No sensitive logs, credentials or vendored dependencies.

Use mock adapters for automated generation tests; they verify payload/controls, not real-model candidate quality or billing. Unit and Host-adapter tests do not prove visual correctness. For UI work, test the **installed plugin in the existing DSH application**, in light/dark themes and at a narrow width, and describe verification limits in the PR.

## Issues and licensing

Use the bug template with minimal sanitized evidence. Please read [SECURITY.md](SECURITY.md) before reporting a security concern. Contributions are licensed under the project's MIT license.
