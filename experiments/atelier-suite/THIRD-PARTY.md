# Third-party components

This candidate references unmodified upstream npm packages by exact version. Each dependency retains its own license, copyright, package identity and documentation. They are not represented as original Atelier implementations.

| Package | Version | License | Upstream |
|---|---|---|---|
| dsh-atelier-plugin | 1.7.0 | MIT | ForceMind/dsh-atelier |
| dsh-better-reasoning-effort | 0.5.4 | MIT, Copyright 2026 HaoyueQin | HaoyueQin/dsh-better-reasoning-effort; upstream acknowledges HanaAyane slider |
| dsh-context | 0.73.3 | Apache-2.0, bowenliang123 | bowenliang123/dsh-context |

The normal candidate dependency manifest still obtains intact upstream distributions. The separate private navigation fixture DOES modify the reviewed dsh-context0.73.3 Client at build time; it retains original LICENSE/metadata/locales/applicable NOTICE, adds a modification header and ATELIER-NAVIGATION-NOTICE.md, and must not be published under the original upstream name. See [navigation provenance and test](NAVIGATION-TEST.md). If later bundled offline, include all applicable licenses/NOTICE/copyright resources in the packed dependency trees and audit bundled third-party code. No BrowserSkill CLI or browser extension artifact is included. Their separate prerequisites and licenses are not waived by the npm plugin's license.

BrowserSkill is excluded from this candidate by user decision; its installed plugin, CLI and extension remain independent.
