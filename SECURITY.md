# Security policy

## Supported releases

Security fixes target the latest published release. This project is experimental and has been exercised with DeepSeek Harness 0.2.1-rc.3. A compatible version range is not a guarantee that every future host release is supported.

## Report privately

Use [GitHub private vulnerability reporting](https://github.com/ForceMind/dsh-atelier/security/advisories/new) when available. If private reporting is unavailable, open an issue asking for a private contact **without including the vulnerability, credentials, private code or request logs**. Do not disclose sensitive material in a public issue or PR.

## Trust boundary

- A DSH Host plugin executes inside the host process. Install only code you trust.
- Request-body capture is **off by default** in the public release. Enabling it stores conversations, system/developer prompts, tool schemas, arguments, code, and model output locally in the active profile's storage backend.
- Metadata is still recorded with capture disabled: timestamps, model/provider, usage, finish state, and diagnostic errors. Error strings may themselves be sensitive.
- Redaction is best-effort pattern matching, **not a DLP system**. Unknown credentials and personal information may remain. Review any export manually.
- Stream deltas are buffered in memory until an attempt ends, then reconstructed and redacted before persistence. Reconstructed boundaries are marked `rebuiltForRedaction` and are not an exact provider-frame replay.
- The package does not add an outbound telemetry endpoint, fetch prices automatically, or upload logs. It uses DSH's authenticated local transport; this does not change telemetry or network behavior owned by DSH itself or other plugins.
- Settings belong to the profile, not one session. The `atelier` agent tool can change the same settings exposed by the UI; it cannot authorize tools or change the host permission policy.
- Prompt customization is not an anonymizing gateway. History, tool definitions, protocol details, paths and headers can identify a client. We do not strip sandbox or approval instructions.

## Retention and removal

The default retention policy is 14 days / 256 MiB, with a 32 MiB per-attempt capture budget. Cleanup runs on plugin start, request completion and settings save; it is not a strict wall-clock deletion service. JSON formatting and redaction markers can make the stored record slightly larger than its capture budget. Crashes may leave only a starting record. Removing the plugin does not delete its storage domain. See [configuration](docs/configuration.md) before deleting any profile data.
