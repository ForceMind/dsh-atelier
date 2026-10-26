# DSH Atelier

**A local-first workbench for DeepSeek Harness: compact metrics, API-equivalent costs, a profile-global prompt library, optional activity text, and opt-in request auditing.**

[简体中文](README.md) · [CI](https://github.com/ForceMind/dsh-atelier/actions/workflows/ci.yml) · [npm](https://www.npmjs.com/package/dsh-atelier-plugin) · [MIT](LICENSE)

> Public-release defaults preserve DSH's original identity and language preference. **Request/response body capture is disabled.** Prompt customization, body capture and dynamic Chat labels are opt-in. This is not an anonymizing gateway or an invoice system.

## Features

- **Compact footer:** model/provider, turn time, observable reasoning-stream time, input/output/cache counts and cumulative API-equivalent cost. Icon-aligned metrics, K/M/B numbers and full-value tooltips; no duplicated waiting sentence.
- **Original GPT orbital mark:** slow motion while running, static when idle, reduced-motion aware. It does not replace DSH's native in-Chat whale.
- **Global prompt library:** restore the host's current dynamic assembly, use a generic coding assistant, or save/select/delete named custom entries.
- **Optional Chat activity labels:** a fallback language pack changes only two native waiting strings while keeping timing, whale, tools, errors and scrolling intact.
- **Local audit views:** paginated normalized request JSON, role-expanded text, response JSONL and response text. File/image references only, not binary copies.
- **Configurable prices:** provider/model precedence, cached input/write buckets, per-request context tiers, sources and review dates. Unknown is never free.
- **One Host operation path:** the UI, `/atelier` and the `atelier` agent tool use the same settings and log operations.

## What's new in 1.5.0

Clickable metric popovers, per-currency cost breakdown, optional three-step setup, 76 original Chinese activity phrases, stable left-aligned workbench tabs, 100K/272K per-request pricing boundaries, and manual cache-prefix diagnosis. Cache ratios include explicit reporting coverage and an observed share; this does not claim improved provider caching. Five official-document/example snapshots and six **user-supplied, independently unverified** CNY/USD reference groups are available for draft-only import. No exchange conversion or automatic time-of-use billing is performed. See [price evidence](docs/price-evidence.md) and [cache diagnosis](docs/cache-diagnostics.md).

## Install

Tested with **DSH 0.2.1-rc.3**. The manifest admits `>=0.2.1-rc.3 <0.3.0`; other releases in that range still need verification. Requires the shipped Host and Web Client services. Local development uses Node >=22.19.0 / pnpm 11.28.5.

In DSH **Plugins → Install**, enter:

```text
dsh-atelier-plugin@1.5.0
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

1. Inspect the compact footer.
2. Open global settings. Settings belong to the **profile** and affect current, future, resumed and child sessions; request lists are session-scoped.
3. Choose a prompt preset and/or opt into dynamic labels.
4. Enable body capture only after reviewing the privacy policy.
5. Enter your supplier's rates. New installs ship an empty price table.
6. Save. Prompt changes apply at the next admitted step; past history is not rewritten.

### Prompt presets

- **DSH original:** removes this plugin's overrides and restores the current DSH/model/preset/plugin assembly, not a frozen prompt snapshot.
- **Generic coding assistant:** `You are a helpful AI coding assistant.` plus neutral built-in client guidance. Tool and permission rules remain.
- **Custom:** edit the identity/extra instructions, name and add an entry, then save. Built-ins cannot be deleted.

Identity reduction only changes known fixed identity/context contributions. History, tool definitions, permission text, protocol details and headers may still reveal the client. Sandbox/approval instructions are not removed.

## Costs

Costs are a cumulative **API-equivalent estimate for committed responses**, not credit balance, a single request, or the reseller invoice. Configure per-million-token rates in global settings. See [configuration](docs/configuration.md) for the schema.

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

It is **not** final HTTP JSON, headers or raw provider SSE. This package does not monkeypatch global fetch, read API keys, upload logs, or add an outbound telemetry endpoint. It does not alter DSH's own network/telemetry policy or other plugins.

Redaction is best-effort, not DLP. Review exports manually. Completed streams are rebuilt across chunk boundaries before redaction; `rebuiltForRedaction` means exact token boundaries no longer match the original. Only new requests are captured; a crash may retain just the start record.

Default policy: 14 days / 256 MiB, with a 32 MiB per-attempt capture budget. Cleanup runs at startup, request completion and settings save, not as a strict timed-deletion service. Formatting/redaction markers may increase stored size. Uninstall does not erase the domain. Downloads contain loaded pages only; incomplete names include `partial`. Read [SECURITY.md](SECURITY.md).

## Dynamic activity language pack

Opting in switches built-in Chinese/English to `zh-x-atelier` / `en-x-atelier`, using official language fallbacks for all other copy. This persists a **shared profile language preference**. Disabling/unloading restores the corresponding base language only if the plugin variant is still selected; manual selection of another language is respected. Original browser-auto preference cannot be reconstructed.

Rotation runs only while a session is running, normally every four seconds. Dictionary changes produce global locale revisions. Screen-reader announcements remain stable; only the visible elapsed-time string rotates. No host DOM manipulation or entire Chat renderer replacement is used.

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

Primarily exercised on macOS Desktop/Web with DSH 0.2.1-rc.3. Other operating systems, third-party themes and future host releases are not comprehensively tested. A successful Host install alone does not prove Client activation; inspect `atelier diagnose` and the existing application. Observable reasoning-stream time is not the model's internal thinking time; absent data is shown as `—`.

The agent tool can modify the same global settings as the UI; restrict that tool through host policy if required. It cannot approve tool calls or change sandbox policy. Do not run the prototype and public package together.

## Credits and license

Inspired by the Chinese-language experience of [Claude-Code-Chinese-Simplified](https://github.com/ForceMind/Claude-Code-Chinese-Simplified). No code or phrase list was copied. Artwork and orbital animation are original.

Community software, not an official DeepSeek or OpenAI product. Names/trademarks belong to their owners. Released under [MIT](LICENSE).
