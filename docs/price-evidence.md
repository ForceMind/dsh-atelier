# Price evidence — 2026-10-26

This is a provenance report, **not a live rate guarantee**. Direct official-site retrieval failed under the current network restrictions. The evidence below was read through GitHub's API from verified official organizations at immutable commits. No browser automation, API credentials or request bodies are needed to use this module.

## Executable presets

The package exposes five exact-ID presets in `price-catalog.mjs`, visible in Global settings. Import appends missing provider/model selectors to the **draft**; it does not replace existing prices or save automatically. Fresh installations still start with an empty active table.

| Exact API ID | USD input / million | USD output / million | Cache read | Default cache write | Evidence |
| --- | ---: | ---: | ---: | ---: | --- |
| `claude-opus-5-5` | 4 | 20 | 0.20 | 5 | [Official fixed migration document](https://github.com/anthropics/skills/blob/dbd4588f9e1033efb41dad4bef2f7947c8993d44/skills/claude-api/shared/model-migration.md#L2030-L2036) |
| `claude-sonnet-5-5` | 2 | 10 | 0.20 | 2.50 | [Official fixed migration document and ID](https://github.com/anthropics/skills/blob/dbd4588f9e1033efb41dad4bef2f7947c8993d44/skills/claude-api/shared/model-migration.md#L2077-L2083) |
| `mimo-v2.5-pro` | 1 | 3 | 0.20 | Unknown | [Vendor's pay-as-you-go integration example](https://github.com/XiaomiMiMo/awesome-mimo-agent/blob/9b84a73ac88ca2bbe5fc560d073a7767abb87dc8/docs/pi_mono.md#L47-L67); example snapshot, not live tariff |
| `MiniMax-M2.5` | 0.15 | 1.20 | Unknown | Unknown | [Official fixed README](https://github.com/MiniMax-AI/MiniMax-M2.5/blob/415f5fa67d4f21150b305dd0830e336df1a150cc/README.md#L129-L133); cached usage is unpriced |
| `claude-haiku-5-5` ≤100K prompt | 0.10 | 0.50 | 0.01 | 0.125 | [Official fixed 100K-tier document](https://github.com/anthropics/skills/blob/dbd4588f9e1033efb41dad4bef2f7947c8993d44/skills/claude-api/shared/model-migration.md#L2230-L2236) |
| `claude-haiku-5-5` >100K prompt | 0.50 | 2.50 | 0.05 | 0.625 | Same source; selected per request, including cached input |

Standard API-equivalent only; no Fast/Batch, reseller multiplier or tax. The default Claude cache-write rate is explicitly the documented **5-minute** rate. The same source documents higher 1-hour rates (Opus 8 / Sonnet 4), but the host currently does not report that TTL. These presets must not be advertised as recognizing the actual cache TTL or as reproducing an invoice. The legacy `cacheWrite12h` extension is not a Claude 1-hour field.

`provider:'*'` permits an exact model name on another channel to receive an equivalent estimate. It does not establish that channel's upstream model. An exact-provider user rule wins.

## User-supplied reference groups — added 2026-10-26

The user supplied CNY and USD API comparison tables. They cite `api.foo`, a third-party reference; we did not independently verify those numbers against live vendor tariffs. They are stored separately from the five official-document/example snapshot presets as `basis: user-supplied-unverified`.

Six manual groups contain 21 alternative rows: Kimi/GLM USD (6), DeepSeek USD peak (2), USD off-peak (2), Kimi/GLM CNY (7, including the user's GLM-4.7-Flash free claim), DeepSeek CNY peak (2), CNY off-peak (2). No exchange rate is calculated. The USD table does not contain a free GLM row and none was invented.

**Import chooses a fixed price scenario, not a time schedule.** Existing provider/model selectors are skipped even when currency or period differs. To switch a price already in the draft, explicitly edit/remove the old row first. Do not append duplicate selectors: the normal precedence uses the first match. Saving a new rule reprices the entire retained session aggregate; it is not a request-time billing ledger. No automatic weekday, holiday, adjusted-workday or peak/off-peak classification was implemented.

The supplied labels were mapped to exact candidate API identifiers: `kimi-k3`, `kimi-k2.7-code`, `kimi-k2.6`, `glm-5.3`, `glm-5.3-flashx`, `glm-5.3-flash`, `glm-4.7-flash`, `deepseek-v4-pro`, and `deepseek-flash` (V4.1 Flash). Verify exact spelling/case and actual route identity before applying; no wildcard family or capitalization alias is silently added.

All user rows use `requireCacheRates:true`: cache-read prices are supplied, but cache-write rates are absent, so nonzero write usage remains unknown. The zero-priced GLM entry is an explicit user-supplied claim, not a guarantee of free access, eligibility, quotas or future price.

The no-cache examples were checked arithmetically. USD DeepSeek Pro peak is exactly `0.02112` per request and off-peak `0.01056`; the supplied four-decimal display values are rounded. CNY and USD must remain separate buckets.

## Requested coverage still incomplete

- **Kimi:** official repositories confirm models, but no official token rate table was obtained. [Kimi K3 fixed README](https://github.com/MoonshotAI/Kimi-K3/blob/3cb39dfd32e51c3328e2e4b4af21341247d06c43/README.md#L605-L619) confirms `kimi-k3`, not its price.
- **GLM:** global / mainland-China platform conditions differ; current fee evidence was not obtained. [Official historical platform distinction](https://github.com/zai-org/GLM-4.5/blob/efe827d735c508a9365f3d21e472cc6f6d8edeae/README.md#L9-L15).
- **MiniMax:** [official M2.5 README](https://github.com/MiniMax-AI/MiniMax-M2.5/blob/415f5fa67d4f21150b305dd0830e336df1a150cc/README.md#L129-L133) says M2.5-Lightning costs USD 0.30 / 2.40 per million input/output tokens and M2.5 costs half as much (0.15 / 1.20, arithmetic from that statement). [The official API example](https://github.com/MiniMax-AI/Mini-Agent/blob/d76a4f6389688cabda39c224a6cdfa274215d47c/examples/05_provider_selection.py#L26-L31) confirms `MiniMax-M2.5`. Its rule sets `requireCacheRates:true`: uncached requests use the documented input/output prices; any nonzero cache usage stays unknown until cache prices are documented. Lightning's exact API ID remains unverified.
- **MiMo:** the [official pay-as-you-go Pi example](https://github.com/XiaomiMiMo/awesome-mimo-agent/blob/9b84a73ac88ca2bbe5fc560d073a7767abb87dc8/docs/pi_mono.md#L47-L67) explicitly provides the exact `mimo-v2.5-pro` ID and cost fields. The [Pi cost schema](https://github.com/badlogic/pi-mono/blob/d5b3de22d0e24a3e9c38a9410d3329b099717283/packages/ai/src/providers/model-schema.ts#L28-L33) defines those fields in USD per million tokens. The preset is labeled an official integration-example snapshot, not a current live rate card. Its `cacheWrite:0` example field is deliberately omitted from active pricing: nonzero write usage remains unknown. Other MiMo model rates and context-dependent tariffs remain unverified.
- **DeepSeek:** [R1](https://github.com/deepseek-ai/DeepSeek-R1/blob/0cf78561f1d51c84a21b2190626b21116d5c68bb/README.md#L157-L160) and [V3](https://github.com/deepseek-ai/DeepSeek-V3/blob/9b4e9788e4a3a731f7567338ed15d3ec549ce03b/README.md#L222-L225) point to the official API platform but do not provide the current rate table in the inspected text.

Haiku's 100K boundary is now supported with its own regression tests. Projection stateVersion 4 rebuilds old two-band checkpoints from committed session events; it does not approximate the new threshold from previously collapsed totals.

Missing evidence does not mean a model is unavailable or free. Pending entries carry no zero placeholder rates and are not fed into cost calculations. Do not silently change existing historical calculations by pretending uncertain defaults are verified.
