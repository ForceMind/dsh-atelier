# Architecture

DSH Atelier is one Cordis bundle with a Host half and a self-contained Web Client half. It does not fork DSH, run a proxy, start a server, or import a duplicate React runtime.

```text
                       DSH session event log
                                │
                         pure stats projection
                                │ wire.view
                                ▼
Settings UI ─┐              compact footer
             ├─ authenticated local transport ─┐
Agent tool ──┘                                │
                                      shared Host operate()
                                              │
                           global settings / per-session audit store
                                              ▲
DSH llm/stream ── read-only wrapper ── unchanged chunks to Agent
                    │
                    └─ buffer → reconstruct → redact → persist at end
```

## Host

`host.js` injects the actual services it uses. A disabled bundle produces no registrations. Opening the domain immediately registers a disposer; per-Agent prompt contributions have both Agent and plugin cleanup ownership.

- `core.mjs`: dependency-free validation, prompt library, normalized text, redaction, pricing, immutable session fold.
- Session projection derives committed-response counters, per-model usage and short/long context buckets. Missing/invalid usage has its own unknown counter.
- `llm/stream`: observes options, calls `next()`, and yields the exact upstream chunk objects. It never rewrites frozen request messages, tool policy or provider selection. Storage failures are recorded separately; upstream exceptions remain upstream exceptions.
- Settings saves are serialized with revision CAS. Successful prompt changes dispose/re-register known sections on each live Agent, while `agent/created` covers future agents.
- Capture uses a bounded metadata index for retention/list/status; periodic footer polling does not stringify every request body.

A normalized request still precedes adapter file/image/tool projection; a normalized response already follows adapter conversion. Neither is raw HTTP/SSE. Redaction reconstructs delta strings per block/type to detect credentials split across frames, marks reconstruction and preserves metadata ordering. Exact token boundaries are intentionally sacrificed for safer export.

## Client

`client-source.js` registers package ID `dsh-atelier-plugin` through DSH's module loader. `build-client.mjs` inlines `activity.mjs` and `ui-format.mjs` into the committed `client.js`; React comes from the host baseline module table.

Public surfaces:

| Slot | Purpose |
| --- | --- |
| `conversation.composer.dock` / `activity` | Compact metrics-only footer, lower numeric priority than the native activity cell |
| `conversation.view` / `atelier` | Session request-log view and access to global settings |
| `settings.section` / `atelier-global` | Profile settings independent of a selected session |
| `shell.overlay` / `atelier-activity-monitor` | Invisible framework-owned running-state subscription; renders no extra DOM |

Components consume provided selector hooks, not session-event scans. Colors use DSH theme tokens. SVG metrics icons and the GPT orbital mark are original and respect reduced-motion preferences.

## Dynamic labels

Current DSH Chat appends its `RunningStatus` directly and has no narrow icon/label Slot. Replacing the entire ChatFlow would risk unrelated behavior. The opt-in adapter instead registers unique language variants with built-in fallback and changes two `chat` translation keys. The stable accessibility key does not rotate; the elapsed-time key retains `{duration}`.

This is intentionally a language preference change, not a hidden CSS/DOM replacement. It is documented, reversible while active, and off by default. Dictionary changes produce global locale revisions, so rotation stops while no session is running.

## Testing boundaries

The suite tests pure logic, Host-adapter operations, locale registration/timer lifecycle and release identity/build integrity. Host mocks are not a substitute for installed runtime checks. Before claiming a visual fix, inspect the actual installed Client registration, check real activation diagnostics and, when browser access is available, the existing DSH page. A mock screenshot is not runtime evidence.

## Explicit non-goals

- Anonymous or undetectable client transport.
- A general proxy / raw wire recorder / credential inspector.
- Provider invoice reconciliation or billing of all failed requests/tool fees.
- Replacing ChatFlow, permission enforcement or the app root.
- Automatic model routing or fetching/updating live price data.
