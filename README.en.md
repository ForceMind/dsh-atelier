# DSH Atelier

**A local-first workbench for DeepSeek Harness: compact metrics, API-equivalent costs, a profile-global prompt library, optional activity text, automatic reply candidates, and opt-in request auditing.**

[简体中文](README.md) · [CI](https://github.com/ForceMind/dsh-atelier/actions/workflows/ci.yml) · [npm](https://www.npmjs.com/package/dsh-atelier-plugin) · [MIT](LICENSE)

> **Important 1.7.0 default: automatic reply generation is ON, not opt-in.** When the current visible conversation is idle with an empty composer after an assistant text reply, the default **5-second** delay can trigger a billable API call through a dedicated **recommended Luna model at low reasoning**, carrying bounded recent dialogue text. Disable it or change the delay in Suggestions. **Candidates never auto-send**: clicking Tab or pressing Tab only accepts into the composer. **Request/response body capture remains OFF and opt-in.** Original identity and language preference are preserved by default. This is not an anonymizing gateway or invoice system.

## Features

- **Compact footer:** model/provider, current/latest turn plus cumulative session running time (excluding idle gaps), observable reasoning-stream time, input/output/cache counts and cumulative API-equivalent cost. Icon-aligned metrics, K/M/B numbers and full-value tooltips; no duplicated waiting sentence.
- **Original GPT orbital mark:** slow motion while running, static when idle, reduced-motion aware. It does not replace DSH's native in-Chat whale.
- **Global prompt library:** restore the host's current dynamic assembly, use a generic coding assistant, or save/select/delete named custom entries.
- **Optional Chat activity labels:** a fallback language pack changes only two native waiting strings while keeping timing, whale, tools, errors and scrolling intact.
- **Local audit views:** paginated normalized request JSON, role-expanded text, response JSONL and response text. File/image references only, not binary copies.
- **Configurable prices:** provider/model precedence, cached input/write buckets, per-request context tiers, sources and review dates. Unknown is never free.
- **Reply candidates:** auto-generation after 5 idle seconds by default; dedicated Luna recommendation/low; recent 6 turns, at most 12 rows and 24K text characters. Click or keyboard Tab only accepts. Editing hides the same-source cache; clearing restores it without another generation call.
- **Integration navigation:** links and dependency explanations only, not a completed Suite or replacement for the upstream plugins.
- **One Host operation path:** the UI, `/atelier` and the `atelier` agent tool use the same settings and log operations.

## What's new in 1.7.0

This documentation describes **1.7.0**. npm, GitHub Releases and marketplace indexing are separate distribution channels; check their actual status. This release adds task-aware reply candidates with independent model selection and accept-only Tab, plus current-turn/session-running-time totals. Session total time excludes idle gaps between turns. Existing pricing evidence and cache limits remain documented in [price evidence](docs/price-evidence.md) and [cache diagnosis](docs/cache-diagnostics.md).

Settings → Integration & dependencies is **navigation only**. Suite consolidation and replacement acceptance are not complete. Keep Better Reasoning Effort and dsh-context separately installed; BrowserSkill remains independently managed. Do not uninstall those plugins on the strength of the shared navigation.

## Install

1.7.0 targets and is exercised with **DSH 0.2.1-rc.5**. The manifest admits `>=0.2.1-rc.5 <0.3.0`; other releases in that range still need verification. Requires the shipped Host and Web Client services. Local development uses Node >=22.19.0 / pnpm 11.28.5.

In DSH **Plugins → Install**, enter:

```text
dsh-atelier-plugin@1.7.0
```

Enable it, then open **Settings → Atelier**, or **Conversation → Atelier → Global settings**. Marketplace indexing is separate from npm publication; use the package name directly if search has not indexed it yet. Follow the manager's actual `applied` / `restart-required` result.

The npm package named `dsh-atelier` belongs to a different author. **This project publishes `dsh-atelier-plugin`.**

### Migrating from the local prototype

Disable/remove `@local/dsh-atelier` **before enabling this package**. They cannot coexist: the storage domain, projection, tool, command and API route are intentionally shared. Back up the profile first. The public package keeps the `dsh_atelier_v1` domain, so prior settings/logs remain; safe defaults apply only to a fresh store, not a silent reset of previously enabled capture.

### From source

```sh
git clone https://github.com/ForceMind/dsh-atelier.git
cd dsh-atelier
pnpm install --frozen-lockfile --ignore-scripts
pnpm build
pnpm check
```

Install the resulting absolute directory with DSH Plugin Manager. Do not hand-edit a profile's dependency manifest or patch file.

## First use

1. Review Suggestions first: auto-generation defaults to ON/5 seconds and can incur API fees. Disable it if unwanted, then inspect the footer.
2. Open global settings. Settings belong to the **profile** and affect current, future, resumed and child sessions; request lists are session-scoped.
3. Choose a prompt preset and/or opt into dynamic labels.
4. Enable body capture only after reviewing the privacy policy.
5. Enter your supplier's rates. New installs ship an empty price table.
6. Save. Prompt changes apply at the next admitted step; past history is not rewritten.

## Reply candidates and automatic calls

- Auto-generation defaults to **ON, 5 seconds**, rather than waiting for the first manual click. Suggestions exposes the switch, integer **0–60 second** delay and a dedicated model picker. Zero schedules immediately when eligible; it does not disable automation.
- The default recommends available Luna routes, preferring exact `gpt-6-luna`; choose another registered provider/model if wanted. The model must support `low`, which is low reasoning, **not thinking off**. Conversation model/effort is not changed. No available Luna produces an informative selection error, not a guessed route or silent source-model fallback.
- The request carries up to **6 recent user turns / 12 user-assistant text rows / 24,000 text characters**, with explicit truncation. System/developer prompts, reasoning, tool results and non-text attachments are excluded. Sensitive information already written in dialogue text can still reach the selected provider; this is not additional redaction.
- Candidates are lighter text, not the actual draft. **Clicking Tab and pressing Tab have the same accept-only behavior**; send afterward with the native Send button. No auto-send. Editing hides and retains the same-source candidate; clearing restores it without a new generation call. New dialogue, session changes or regeneration invalidate stale candidates.
- Host memory allows one automatic attempt per assistant source, including failures, for the latest 500 session/source pairs. Restart does not guarantee deduplication; manual retries can incur another fee.
- **Independent draft-call cost is excluded from conversation totals**, although the provider may bill it. Disabling automation cannot reverse an already dispatched call. Review candidates yourself; destructive, payment, external-send, permission and production actions retain confirmation limits.

See [reply-candidate details](docs/reply-draft.md) for behavior and verification limits.

### Prompt presets

- **DSH original:** removes this plugin's overrides and restores the current DSH/model/preset/plugin assembly, not a frozen prompt snapshot.
- **Generic coding assistant:** `You are a helpful AI coding assistant.` plus neutral built-in client guidance. Tool and permission rules remain.
- **Custom:** edit the identity/extra instructions, name and add an entry, then save. Built-ins cannot be deleted.

Identity reduction only changes known fixed identity/context contributions. History, tool definitions, permission text, protocol details and headers may still reveal the client. Sandbox/approval instructions are not removed.

## Costs

Independent draft calls are excluded from these conversation totals, but may be billed by the provider. Costs are a cumulative **API-equivalent estimate for committed responses**, not credit balance, a single request, or the reseller invoice. Configure per-million-token rates in global settings. See [configuration](docs/configuration.md) for the schema.

Exact provider rules outrank wildcard providers; exact model rules outrank model globs. DSH's uncached input, cache read and cache write buckets are disjoint. Reasoning tokens are already included in output and are not charged again. Context tiers are selected **per request**, then summed. The current development tier extension supports 100,000- and 272,000-token thresholds, retaining disjoint per-request ranges.

Missing/invalid usage and unmatched pricing remain explicitly unknown, even if a known subtotal exists. Failed attempts may be billed by the supplier but are not in the committed-response total. Fast/Flex/Batch, taxes, regional uplifts, reseller multipliers and tool fees are not included. Cache-write TTL is not reported by the current DSH usage API; extended 12-hour counters are accepted only when explicitly supplied.

No automatic price fetching or silently applied current-rate catalog is included. Verify rates against the supplier's primary source, such as [OpenAI pricing](https://developers.openai.com/api/docs/pricing), and record `source` / `checkedAt`.

## Privacy and capture boundaries

Body capture is **off by default**. Metadata remains local even when body capture is off: provider/model, timestamps, usage, finish status and diagnostic errors. Enabling capture can retain system/developer prompts, conversation, private code, tool schemas/arguments and output.

The official `llm/stream` seam exposes:

```text
DSH normalized request (before adapter conversion)
              → provider adapter →
DSH normalized response chunks (after conversion)
```

It is **not** final HTTP JSON, headers or raw provider SSE. This package does not monkeypatch global fetch, read API keys, upload logs, or add an outbound telemetry endpoint. The default-enabled reply-candidate feature does send recent dialogue text through the configured model adapter and may incur API fees. It does not alter DSH's own network/telemetry policy or other plugins.

Redaction is best-effort, not DLP. Review exports manually. Completed streams are rebuilt across chunk boundaries before redaction; `rebuiltForRedaction` means exact token boundaries no longer match the original. Only new requests are captured; a crash may retain just the start record.

Default policy: 14 days / 256 MiB, with a 32 MiB per-attempt capture budget. Cleanup runs at startup, request completion and settings save, not as a strict timed-deletion service. Formatting/redaction markers may increase stored size. Uninstall does not erase the domain. Downloads contain loaded pages only; incomplete names include `partial`. Read [SECURITY.md](SECURITY.md).

## Dynamic activity language pack

Opting in switches built-in Chinese/English to `zh-x-atelier` / `en-x-atelier`, using official language fallbacks for all other copy. This persists a **shared profile language preference**. Disabling/unloading restores the corresponding base language only if the plugin variant is still selected; manual selection of another language is respected. Original browser-auto preference cannot be reconstructed.

Rotation runs only while a session is running, normally every four seconds. Dictionary changes produce global locale revisions. Screen-reader announcements remain stable; only the visible elapsed-time string rotates. No host DOM manipulation or entire Chat renderer replacement is used.

## Deep-space reasoning slider

When Better Reasoning Effort 0.5.4 and its composer slider are enabled, Atelier styles the existing control with original space/ship artwork: a 320px-long, 28px-thick track and a 96×72 ship that may extend beyond it. Reduced motion stops animation. This is version-scoped `.bre-*` appearance compatibility, not a second slider or a stable cross-plugin API; supported levels and persistence remain owned by the original plugin. See [reasoning semantics](docs/reasoning-integration.md) for the host limitation on strict session-only selection/reset.

Permanent session deletion is not implemented: the targeted stock host has no safe supported deletion path used by this release. The [follow-up plan](docs/session-deletion-plan.md) is deliberately separate from archive and this release.

## Development

```sh
pnpm build
pnpm check
npm pack --dry-run --ignore-scripts
```

Edit `client-source.js`, `activity.mjs` and `ui-format.mjs`; commit the generated `client.js`. Release tests validate byte equality, module identity, privacy defaults and exported resources. Unit/adapter tests are not visual verification or supplier billing reconciliation.

- [Architecture](docs/architecture.md)
- [Configuration and data](docs/configuration.md)
- [Contributing](CONTRIBUTING.md)
- [Release process](docs/releasing.md)
- [Changelog](CHANGELOG.md)

## Compatibility and limitations

1.7.0 is primarily exercised on macOS Desktop/Web with DSH 0.2.1-rc.5. Earlier rc.3 verification covers historical features only, not the new reply-candidate functionality. Other operating systems, third-party themes and future host releases are not comprehensively tested. A successful Host install alone does not prove Client activation; inspect `atelier diagnose` and the existing application. Observable reasoning-stream time is not the model's internal thinking time; absent data is shown as `—`.

The agent tool can modify the same global settings as the UI; restrict that tool through host policy if required. It cannot approve tool calls or change sandbox policy. Do not run the prototype and public package together.

## Roadmap and Saturn experiment

See the [roadmap](ROADMAP.md) for implemented-but-unreleased work, internal model mapping, cache verification and optional suggestions. The [Mini Saturn source experiment](experiments/mini-saturn/README.md) requires a patched Harness build; it has not replaced the whale in the current application. Production activation is deferred by user decision.

## Credits and license

Inspired by the Chinese-language experience of [Claude-Code-Chinese-Simplified](https://github.com/ForceMind/Claude-Code-Chinese-Simplified). No code or phrase list was copied. Artwork and orbital animation are original.

Community software, not an official DeepSeek or OpenAI product. Names/trademarks belong to their owners. Released under [MIT](LICENSE).
