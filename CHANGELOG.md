# Changelog

All notable public-release changes are documented here. Versions follow Semantic Versioning; the early DSH integration remains experimental.

## [1.5.0] - 2026-10-26

### Added
- Six user-supplied, independently unverified CNY/USD reference groups for Kimi, GLM and DeepSeek (21 alternative rows). Draft-only import skips existing selectors; no automatic schedule, exchange conversion or silent overwrite.
- Cache diagnostics: latest / recent-20 / lifetime reported-only token-weighted ratios with missing-field coverage; manual bounded normalized-prefix comparison with no prose/hash output.
- Non-prompt settings saves retain existing prompt registrations; no guaranteed provider hit-rate improvement is claimed. Cache projection stateVersion 5 replays missing-field accounting.
- Read-only metric popovers on all seven footer buttons, with full numbers, accounting scope and bounded pricing provenance.
- Compact, maximum-four-row default view; longer explanations and sources are collapsed under More details.
- Native top-layer popover support, outside-click / Escape dismissal, keyboard focus return, viewport positioning and reduced chrome.
- Escape is consumed by the popover so it cannot reach the host's stop-Agent shortcut.
- Metric detail, compact-content and position regression tests.
- Same-width left-aligned workbench panels; tab changes retain the settings draft, with bounded remembered selection.
- Three-step opt-in setup and 76 original Chinese activity phrases.
- Currency-separated input/output/cache-read/cache-write cost breakdown.
- Metric surface uses the user-requested `#F8F9FA` in light mode and host surface in dark mode, with a faint two-layer shadow matching the native screenshot. The user confirmed horizontal movement fixed, accepted the base color, and approved the final faint shadow.
- Three disjoint pricing-projection ranges preserve both 100K and 272K per-request thresholds; stateVersion 4 invalidates older checkpoints.
- Added the vendor's `mimo-v2.5-pro` integration-example snapshot after confirming SDK cost units as USD per million tokens; the example's zero cache-write field is not assumed free, and nonzero writes remain unknown.
- Official GitHub-snapshot presets for exact Claude Opus 5.5 / Sonnet 5.5 / Haiku 5.5 IDs and MiniMax M2.5, with non-overwriting draft import. MiniMax's undocumented cache rates explicitly remain unknown rather than falling back. Other requested vendors retain pending-verification entries. This is partial coverage, not a current all-vendor rate catalog.

### Fixed
- Mixed strict-cache usage no longer erases known costs from uncached requests in the same context tier; cache-shape subgroups retain known subtotals and unknown response counts.
- Impossible inclusive counters (cache read/write greater than total input) are rejected consistently.
- Cache diagnostics pair reported-only ratios with a conservative observed share across all valid input amounts, so low reporting coverage cannot masquerade as an overall high hit ratio.

### Scope

The three companion plugins have only been evaluated; their navigation and settings are not yet integrated. Budget alerts, manual log deletion/search, per-turn usage switching, diagnostic export and automatic updates are not included. Provider cache-hit improvement and automatic peak/off-peak billing are not claimed.

Verification: 75 regression checks pass; the user reviewed the installed metric popovers and workbench width fix. No private request logs or screenshots are distributed.

## [1.4.1] - 2026-10-26

First public release, extracted from the locally developed 1.4.0 workbench.

### Added
- Compact icon-aligned model, elapsed-time, reasoning, token and API-equivalent cost metrics.
- K/M/B number formatting, full-value tooltips and an original reduced-motion-aware GPT orbital model mark.
- Profile-global prompt library: restore the current DSH assembly, use a generic coding assistant, or save named custom entries.
- Optional dynamic Chat waiting labels through a fallback language pack, preserving native timing, animation and Chat behavior.
- Opt-in local normalized request/response audit views with pagination and exports.
- Context-tiered pricing, source/date metadata and configurable per-provider rules.
- Public package identity `dsh-atelier-plugin`, compatibility declaration, release checks and CI.

### Changed
- Public defaults preserve DSH's identity and language preference; request bodies are not captured until enabled.
- Developer-machine notes, personal settings and request statistics are excluded from the public project.

### Fixed
- Missing/invalid usage now contributes to the aggregate unknown-cost count instead of being silently omitted.
- Explicit extended 12-hour cache-write counters survive projection aggregation. The current DSH usage API does not report that extension; this is not a claim of live TTL detection.

### Known limitations
- Captured JSON/chunks are DSH normalized data, not final HTTP JSON or raw provider SSE.
- Exact visual appearance, all third-party themes, all providers, and all future DSH releases are not guaranteed.
- Dynamic labels persist a shared language preference; uninstall/disable restores the corresponding base language only if the plugin variant is still active.
- Failed-attempt billing is not included in the committed-response aggregate.

[1.5.0]: https://github.com/ForceMind/dsh-atelier/releases/tag/v1.5.0
[1.4.1]: https://github.com/ForceMind/dsh-atelier/releases/tag/v1.4.1
