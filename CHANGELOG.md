# Changelog

All notable public-release changes are documented here. Versions follow Semantic Versioning; the early DSH integration remains experimental.

## [1.7.0] - 2026-11-05

### Important defaults and compatibility
- Requires DSH >=0.2.1-rc.5 <0.3.0. Earlier rc.3 validation applies to historical versions, not the new composer workflow.
- Automatic reply suggestions are ON by default after5 idle seconds and may incur API fees. The dedicated model defaults to available Luna at low reasoning; low is not thinking off. Suggestions never auto-send. Body capture remains OFF by default; existing profile choices are preserved.

### Added
- Context-aware user reply suggestions from up to6 recent user turns/12 user-assistant text rows, capped at24K characters with explicit truncation. Prompts prefer concrete task progress while retaining confirmation boundaries for sensitive actions; user review remains essential.
- One compact Suggestions entry with persisted auto switch,0–60s delay, independent model selector and Generate now. Empty route chooses advertised Luna, preferring exactgpt-6-luna; no invented route or silent conversation-model change.
- Keyboard Tab and clickable Tab share guarded accept-only behavior; native Send is the only sending action. Editing hides the cached same-source candidate; clearing input restores it without another model call. Source/session/settings changes clear stale results.
- Turn and cumulative session running time together, excluding idle gaps; duplicate end events cannot double-count duration (projection v7).
- Integration/dependency navigation and read-only reasoning-default information; this does not replace Better Reasoning Effort or dsh-context. BrowserSkill remains independent.

### Fixed and safeguards
- Candidate typography matches native input; text height reserves the actual editable hit area, avoiding toolbar overlap. Candidate text is click-through. Tab stays at the candidate corner without an independent blank action row.
- Bounded read-only settings recovery after transient Client/Host update skew, without retrying paid model generation.
- One automatic attempt per session/source in the running Host, including failures (latest500 in memory); stale source/context checks, single-flight admission and guarded insertion protect user edits.
- Independent suggestion charges are not included in conversation usage/cost totals; audit capture may still record the independent request when enabled.

### Verification and exclusions
-153 regression checks pass. Isolated no-network model UI verified candidate/native text geometry, accept-only keyboard/button activation, typing hides and clearing restores, and native editor hit-testing under the overlay.
- Automated physical mouse click was blocked by the BrowserSkill overlay; complete mouse/IME/attachment matrix and real paid Luna output-quality validation are not claimed. The user accepted the local version for release.
- Suite packaging remains experimental and is excluded from the npm artifact. No standalone dependency removal, permanent session deletion or Saturn host patch is shipped.

## [1.6.0] - 2026-10-30

### Planning
- Archive the Mini Saturn dedicated-icon and single-running-status Harness patch plus optional plugin under experiments; production application activation remains deferred. Remaining work and pricing gaps are tracked in ROADMAP.md.

### Fixed
- Apply the October 29 user-supplied Kimi dual-currency table, adding K2.7 HighSpeed and K3.1 Pro variants and correcting K2.7 CNY prices. Missing K3 CNY cache-read and cache-write rates remain unknown; k3-256k is not inferred.
- Hide the shared Conversation content-width handles only while the full-width Atelier View is mounted, removing invisible edge drag targets without changing Chat widths or sidebar resizing.

### Added
- Original deep-space spacecraft appearance for the existing Better Reasoning Effort 0.5.4 composer slider. No duplicate levels/persistence. User-accepted final geometry: 320px-long / 28px-thick track, 96×72 ship, no white padding, unclipped endpoints; reduced-motion and forced-color styles. This depends on version-scoped plugin markup.
- Document default/model/session distinctions and the host limitation preventing a truthful strict-session-only reset control.
- Grouped workbench settings with preserved drafts; prefilled USD/CNY price tables, a global currency selection, and both DeepSeek rate rows visible without a scenario dropdown. Custom rules/JSON are advanced overrides, not parallel editors.
- In-place model list and bulk context/output editing on configured pi-ai cards, preserving the existing reasoning extension. Five-minute previews, revision-checked writes, explicit inheritance snapshots and effective-value verification.
- Sidebar recent dots occupy the native idle-state leading area; activity, approval and completion reminders keep priority.
- Sidebar title dots for nonblank sessions updated within 24 hours, with original activity/unread/approval marks preserved.
- Recent-hour sessions crossing the list's top edge can arm a brief one-shot native stop in either scroll direction; a single soft pulse identifies the aligned row. Ordinary rows no longer have persistent snap points. No wheel cancellation, permanent pinning or list reorder; reduced motion disables stops. Both features can be disabled separately in global settings.
- Styling is intentionally scoped to the inspected DSH 0.2.1-rc.3 sidebar markup; renamed host classes require re-verification. No session history is opened.
- Eighth compact footer metric: average API output speed in `tok/s`, with a read-only detail popover.
- Uses API-reported output tokens divided by observed first-output-delta → usage-arrival duration, excluding initial waiting and tool execution. Includes output accounting for reasoning/tool arguments; not a visible-text tokenizer or provider-internal decode benchmark.
- During generation, explicitly approximate character-based output averages refresh about every 0.5 seconds; completion uses API tokens. Before output, retain the previous valid speed. Older captures use less precise timestamp fallbacks.

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

[1.7.0]: https://github.com/ForceMind/dsh-atelier/releases/tag/v1.7.0
