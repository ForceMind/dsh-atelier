# Cache diagnosis and safe optimization

## What is measured

Cache hit ratio is `cacheRead / (uncachedInput + cacheRead + cacheWrite)` for DSH's disjoint API buckets. It is not context occupancy, not the fraction of requests that hit, and not cache savings in money. Recent samples are token-weighted, not averaged percentages.

A response lacking `cacheReadTokens` is **unreported**, not proven zero. An explicit numeric zero is a reported zero. This distinction does not prove that omitted fields hide real hits: some adapters omit zero values, others may not forward cache details. Show the report coverage alongside the ratio.

- **Latest:** the newest actual API usage, or `—` if absent.
- **Recent:** the latest 20 retained completed attempts, including errors/retries in the sample count. The ratio includes only requests reporting valid cache counters. Partial/missing usage is not reconstructed from character estimates.
- **Observed share:** reported cache-read tokens divided by all valid input amounts in the same recent window. Unreported cache values contribute no guessed hits. It is a conservative observation, not a guaranteed global lower bound when some inputs are themselves unknown or channel usage semantics are incomplete. Compare it alongside the reported-only ratio and field coverage.
- **Lifetime:** committed session responses, replayed into `cacheAccounting`; reported/missing counts remain separate. This scope differs from recent attempts.

## Prefix checks

The cache action compares at most eight retained completed requests. It reports changes in route, system/developer content, ordered tool definitions, request options, and whether message history is append-only. A shared-message count is not a token-prefix length.

For new requests, SHA-256 fingerprints are computed from normalized original options in memory. Only booleans and counts are persisted, not hashes or extra bodies. The last fingerprint is bounded (4,096 messages, 100 Agent sessions), cleared on Agent disposal/plugin unload. Diagnostics return no request prose or hashes. Historical comparisons use already-redacted captured requests; capture disabled/retention gaps can make those comparisons unavailable. A schema update/reload creates a cold comparison boundary and can itself change the next request's tool definitions.

This observes DSH's **pre-adapter normalized request**, not final HTTP bytes, provider cache keys, backend placement or cache TTL. Similar normalized input does not prove identical upstream serialization. Low hit ratio under a stable prefix identifies a question for the provider, not proof of provider malfunction.

## Implemented optimization

Saving only prices, retention, activity phrases or other non-prompt settings no longer disposes and re-registers system-prompt contributions. Identity/extra-instruction changes still apply through normal prompt assembly. This removes unnecessary registration churn; it does **not** guarantee better provider caching. The rotating waiting phrases remain Client-only and are not inserted into model requests by Atelier.

No request is rewritten, no safety/tool guidance is removed, no tool is hidden, no cache TTL/key is guessed, and no extra paid warm-up request is sent.

## Practical actions

1. Keep the same model/provider and reasoning settings for an ongoing task when practical.
2. Load tools when needed; avoid toggling the tool inventory or redeploying plugins mid-task solely to chase a ratio.
3. Keep stable instructions ahead of dynamic content. Avoid unconditional timestamps or random values at the beginning of a prompt you control.
4. Expect a new warm-up boundary after compaction, a major history rewrite, or a prompt/schema change. Compaction can still reduce total cost even if it temporarily reduces cache reuse.
5. If stable requests fluctuate, ask the channel to confirm cache-field forwarding, route/backend affinity, retention and request normalization. Do not send credentials or complete private logs when asking.
6. Prefer short, bounded diagnostic output and stop repeated identical failing tool calls. A higher cache ratio does not justify repeatedly sending an enormous conversation; total tokens and paid cost matter more.

Open **Atelier → Request logs → Cache diagnostics → Analyze recent requests**, or call the `atelier` tool with `action: cache`. The cache metric's click popover shows the latest/recent/lifetime ratios and missing-field coverage. Analysis is manual; the footer polls metadata only, not full request bodies.
