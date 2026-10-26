# Changelog

All notable public-release changes are documented here. Versions follow Semantic Versioning; the early DSH integration remains experimental.

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

[1.4.1]: https://github.com/ForceMind/dsh-atelier/releases/tag/v1.4.1
