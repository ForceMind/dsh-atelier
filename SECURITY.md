# Security policy

## Supported releases

Security fixes target the latest published release. Planned 1.7.0 targets DeepSeek Harness >= 0.2.1-rc.5 <0.3.0 and is exercised on rc.5. This is release preparation, not a publication claim. Earlier rc.3 checks cover historical features only, not the reply-candidate feature. A compatible version range is not a guarantee that every future host release is supported.

## Report privately

Use [GitHub private vulnerability reporting](https://github.com/ForceMind/dsh-atelier/security/advisories/new) when available. If private reporting is unavailable, open an issue asking for a private contact **without including the vulnerability, credentials, private code or request logs**. Do not disclose sensitive material in a public issue or PR.

## Important default: automatic model calls

**Automatic reply-candidate generation is enabled by default (`replyDraftAuto:true`, `replyDraftDelaySeconds:5`), not opt-in.** In an eligible visible, idle conversation with an empty composer, it can send recent dialogue text to the dedicated configured model (default recommendation: available Luna at low reasoning), causing API charges. Disable it in Suggestions if unwanted. Zero delay means immediate eligible scheduling, not disable. An older store lacking these fields also receives their defaults; body-capture consent does not control model calls.

The request includes up to 6 user turns/12 user-assistant text messages/24,000 characters. It excludes system/developer messages, reasoning blocks, tool results, model-selection notices and non-text attachments, but **private information present in ordinary dialogue text is still sent**. This is not DLP. Low reasoning is not thinking off. Independent draft cost is excluded from the workbench's conversation totals but may be billed by the provider; already dispatched calls cannot be unbilled by disabling automation.

Candidates are suggestions, not evidence of consent or completion. **Mouse Tab and keyboard Tab only accept into the composer; no auto-send.** Editing hides the same-source cache; clearing restores it without a new call. Sending uses the native user-operated Send action. The prompt preserves confirmation restrictions for destructive, payment, external-send, permission, credential and production actions; prompt instructions alone are not an authorization boundary. Automatic attempts are deduplicated only in bounded Host memory, so restart is not a durable once-only guarantee.

## Trust boundary

- A DSH Host plugin executes inside the host process. Install only code you trust.
- Request-body capture is **off by default** in the public release. Enabling it stores conversations, system/developer prompts, tool schemas, arguments, code, and model output locally in the active profile's storage backend.
- Metadata is still recorded with capture disabled: timestamps, model/provider, usage, finish state, and diagnostic errors. Error strings may themselves be sensitive.
- Redaction is best-effort pattern matching, **not a DLP system**. Unknown credentials and personal information may remain. Review any export manually.
- Stream deltas are buffered in memory until an attempt ends, then reconstructed and redacted before persistence. Reconstructed boundaries are marked `rebuiltForRedaction` and are not an exact provider-frame replay.
- Reply suggestions call the selected model through DSH adapters; this is outbound inference, not telemetry. The package does not add an outbound telemetry endpoint, fetch prices automatically, or upload logs. It uses DSH's authenticated local transport; this does not change telemetry or network behavior owned by DSH itself or other plugins.
- Integration navigation does not replace upstream lifecycle/security boundaries. Suite migration is incomplete; Better Reasoning Effort and dsh-context remain separate, BrowserSkill is independent.
- Settings belong to the profile, not one session. The `atelier` agent tool can change the same settings exposed by the UI; it cannot authorize tools or change the host permission policy.
- Prompt customization is not an anonymizing gateway. History, tool definitions, protocol details, paths and headers can identify a client. We do not strip sandbox or approval instructions.

## Retention and removal

The default retention policy is 14 days / 256 MiB, with a 32 MiB per-attempt capture budget. Cleanup runs on plugin start, request completion and settings save; it is not a strict wall-clock deletion service. JSON formatting and redaction markers can make the stored record slightly larger than its capture budget. Crashes may leave only a starting record. Removing the plugin does not delete its storage domain. See [configuration](docs/configuration.md) before deleting any profile data.
