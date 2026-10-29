# Configuration and data reference

## Scope and defaults

All settings are one profile-global record; logs are addressed by session ID. Persisted settings use optimistic `revision` checking and a serialized save queue. A stale save fails; reload before retrying. Existing stores are merged with new defaults, not silently reset.

| Field | Fresh-store default | Accepted values / meaning |
| --- | --- | --- |
| `identityEnabled` | `false` | Override only `harness:identity` when enabled |
| `identityText` | `You are a helpful AI coding assistant.` | Literal string, max 50,000 characters; unused while disabled |
| `extraPrompt` | empty | Literal extra instructions, max 200,000 characters |
| `hideClientIdentity` | `false` | Neutralize the known `harness:source` / `app:web-surface` sections and optional contexts |
| `chatDynamicLabels` | `false` | Opt into the shared fallback-language preference |
| `sidebarRecentMarks` | `true` | Rolling 24-hour dot before nonblank session titles, using native summary `updatedAt`; not unread state |
| `sidebarRecentSnap` | `true` | Brief one-shot top-edge stop for recent-hour sessions crossing in either direction, followed by one soft highlight; disabled under reduced motion, no wheel cancellation. Uses inspected DSH 0.2.1-rc.3 sidebar markup; future class changes need re-verification |
| `captureEnabled` | `false` | Persist full normalized request/response bodies for new attempts |
| `retentionDays` | `14` | Integer 1–365; checked on startup / completion / save |
| `maxLogMB` | `256` | Integer 1–4096; MiB despite the historical field name |
| `rotationSeconds` | `4` | Number 1–60 |
| `onboardingCompleted` | `false` | Marks explicit completion of the three-step setup guide; does not imply consent to capture |
| `phrases` | 76 original Chinese phrases | 1–100 nonblank strings, max 200 chars each |
| `priceCurrency` | `USD` | Global USD/CNY price-book selection for statistics and footer; no exchange conversion |
| `pricePeriod` | `peak` | Retained DeepSeek estimate scenario; both peak/off-peak rows are shown together, with the active estimate marked. No automatic clock/holiday billing |
| `prices` | `[]` | Up to 100 custom overrides; only the selected currency participates |
| `promptLibrary` | `[]` | Up to 50 user entries, in addition to immutable built-ins |

Unknown fields and invalid types are rejected. User strings are not template-interpolated into prompt variables. Adding a prompt entry does not apply it until you choose/save the corresponding fields.

## Workbench and provider models

Settings are grouped into Appearance, Prompts, Logs and API pricing. Category switching retains drafts; one Save commits the form. CNY/USD reference tables are prefilled, not imported. User-provided prices remain unverified. Custom overrides and explicit-apply JSON share one rule set, under advanced details; invalid or unapplied JSON cannot replace table data or be silently saved.

Configured pi-ai provider cards show their model list and bulk context/output controls in place. The previous reasoning-effort extension is retained in the same card. Only contextWindow/maxTokens are allowed: preview first, confirm once, compare the exact settings revision, then read back effective capacities. A preview expires after five minutes; conflicts require a new preview. No credentials, headers, IDs or reasoning capability fields are changed. Inherited model arrays require an explicitly disclosed user-layer snapshot; catalog models use per-model overrides. Future model-specific limits can still override provider defaults. The operation does not add upstream capability.

## Price rule

Required: `provider`, `model`, `currency`, `input`, `output`.

- `provider`: exact ID or `*`.
- `model`: exact ID or `*` glob; metacharacters other than `*` are literal.
- `currency`: three uppercase letters; currencies are accumulated separately, not converted.
- `input`, `output`, `cacheRead`, `cacheWrite`, `cacheWrite12h`: nonnegative per-million-token amounts up to 1,000,000. Missing cache rates fall back to input/write rate.
- `requireCacheRates`: optional boolean. When true, nonzero cache-read/write usage without its matching explicit rate returns unknown instead of falling back to input price; used by incompletely documented catalog presets. Existing user rules keep their previous fallback behavior unless they opt in.
- `source`, `checkedAt`, `label`: optional provenance strings. They are not fetched or independently validated as current prices.
- `longContext`: optional `{threshold:100000|272000,input,output,cacheRead?,cacheWrite?,cacheWrite12h?}`. It applies when one request's uncached input + cache read + cache write exceeds the threshold. Exactly 100K or 272K remains in the lower tier. The projection keeps disjoint ≤100K, >100K–272K and >272K buckets; it never selects a tier from a session-wide token sum.

Specificity: exact provider → exact model → most-specific model glob → earliest rule. Set an exact provider rule to override an official-equivalent wildcard for your reseller's real rates.

Input buckets follow DSH's disjoint semantics. The calculation accepts an explicit `inputIncludesCache:true` only for callers adapting inclusive counters. The current DSH public usage contract does not report a 12-hour cache TTL. A separately supplied `cacheWrite12hTokens` counter is an extension, not inferred metadata.

Do not put API keys or authenticated URLs in `source`. Public examples use placeholder rates; there is no automatic price-update service.

## Setup and cost breakdown (1.5.0 development)

The setup guide lives inside Global settings, not in a blocking application modal. It reviews body capture, prompt preset and pricing. Clicking Next only edits the form draft; only Save and finish calls the shared revision-checked save operation. Later hides the guide for the current mounted form, without setting the durable completion flag. Existing capture/identity preferences are not silently reset.

Status costs include `components[currency]` with `input`, `output`, `cacheRead` and `cacheWrite`. Each currency is separate; no exchange rate is inferred. Components use the same per-request context tiers and rates as the total. Rounding can create sub-display-cent differences. Unknown responses stay explicit; the breakdown is only for the known subtotal. Reasoning remains inside output, never a second fee.

## Prompt library entries

Built-ins:

- `dsh-original`: removes this plugin's identity and client-hint overrides.
- `coding-assistant`: applies the generic coding identity and neutral client hints.

Custom schema:

```json
{
  "id": "user-example",
  "name": "My coding prompt",
  "description": "Optional one-line note",
  "identityEnabled": true,
  "identityText": "You are a helpful AI coding assistant.",
  "extraPrompt": "Explain trade-offs concisely.",
  "hideClientIdentity": true
}
```

IDs accept letters, digits, `_` and `-`; IDs must be unique and cannot replace built-ins. `name` max 100 chars, `description` max 500. Settings affect all Agent sessions from their next admitted step, not past events. Presets do not change host permissions or tool schemas.

## Tool / command

The UI uses authenticated DSH transport at `/api/atelier`. The `atelier` tool calls the same Host operation and binds log access to its initiating session; a forged `sessionId` cannot select another session through that tool.

| Action | Result |
| --- | --- |
| `status` | Compact stats, known-cost subtotal, unknown count, current attempt metadata and warnings |
| `settings` | Global settings, revision, scope and prompt library |
| `save` | Validates complete settings with expected revision, persists then rebinds prompts |
| `logs` | Session metadata page (`offset`, `limit` ≤100) |
| `get` | Record view `json` / `text` / `chunks` / `response`; bounded character pages |
| `diagnose` | Actual prompt section sizes, identity-match flags, remaining labels and Client state; no full system-prompt dump |
| `cache` | Recent-20 reported-cache coverage and weighted ratio; latest-eight bounded normalized-prefix comparisons with no prose/hash output |
| `display` | Small activity-text configuration |

`/atelier` is a read-only summary command. The UI's private `client-report` operation stores bounded local activation metadata; it is not a network telemetry destination. Reports from multiple windows are best-effort last-writer diagnostics.

## Storage and deletion

Host domain: **`dsh_atelier_v1`**, routed by the active DSH `storageDomain` backend. The project does not embed a machine-specific path. Use the host/profile storage tools to locate it; do not assume every deployment uses JSON files.

- `global`: settings + revision.
- `requests`: per-attempt normalized record.
- `atelierStats`: derived in-memory/checkpointed session projection, rebuilt from committed events.

Capture disabled: body fields are omitted, but metadata and errors remain. Retention prunes on plugin start, request completion and save. There is no strict wall-clock expiry or in-UI erase-all control. Uninstall leaves data intact by design. To erase data, stop/disable the plugin, back up if necessary, and delete **only its identified domain** using the host's backend-specific procedure. Never delete an entire profile to remove these logs.

The 32 MiB budget is for serialized capture content, not a process-memory limit or a guarantee of final on-disk bytes. Start/end snapshots are durable; partial live deltas are not persisted before sanitization.

## Migration

The public package replaces the local `@local/dsh-atelier` prototype; it must not run beside it. Keeping the storage domain preserves old settings and logs. Fresh-store safe defaults do not override an existing user's previously enabled options. The npm package named `dsh-atelier` is unrelated to this repository.
