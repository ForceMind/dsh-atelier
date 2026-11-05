# Configuration identity compatibility gate

## Discovered issue

The distinct suite-owned row IDs used by ownership.0/.1 avoid accidental takeover while old bundles are selected, but change Host settings namespaces. In rc.5, descriptors use `entry.options.id` and writes address that ID. Context0.73.3 Client explicitly binds `configForms.get('dsh-context')` and `whileServed(['dsh-context'])`. Moving its row to `atelier-suite-context` preserves raw Host values but does not establish correct Client preference binding.

Therefore the earlier synthetic config readback passes are **Host-layer only**; they must not be presented as complete Client config migration. Cloning the original config component does not fix its closed-over namespace.

Context's own settings button is a separate issue: its DOM-based helper clicks the Plugins sidebar then looks for `[data-plugin-package="dsh-context"]`. With only Suite installed, that card is absent. Observed result is the generic Plugins list. The upstream `plugins.bundle.config` also targets the old package key.

## Verified isolated correction path

A local-only ownership.2 Suite variant retains canonical row IDs: `dsh-atelier`, `dsh-better-reasoning-effort`, `dsh-context`. It must be installed by an **exclusive stopped-Host handoff**: first remove original standalone selected bundle layers, then install the Suite and enable the retained IDs. It must never be activated with original bundle layers still selected; even disabled duplicate rows can conflict in identity and config ownership.

Actual isolated official-CLI run:

1. Stop all fixture Hosts. Remove standalone installation records with official CLI; daily profile unchanged.
2. Install actual ownership.2 tarball containing canonical IDs, complete pinned dependencies and the latest frozen Atelier baseline.
3. Boot with fixture-only enablement overrides of those existing canonical rows, plus read-only config/namespace audit.
4. Host starts successfully with reasoning1/context1 resources. `settings.describe` again emits the exact `dsh-context` namespace, and `configEditor` readback confirms all previously persisted synthetic non-default values automatically remain on the same IDs. No config copy or secret restatement required in this specific path.
5. Stop Host and collect job. This test has NOT yet verified the upstream Client form itself under canonical IDs or navigation; descriptor availability is necessary, not sufficient.

`prepare-ownership-fixture.mjs --canonical` reproduces the private package shape. It does not install or mutate profiles. The checked-in candidate still uses distinct disabled IDs until an explicit release/migration design is selected; do not silently mix both modes.

## Remaining blocker

Follow-up2026-11-05: Suite-owned `plugins.row.config` is implemented and the exact installed canonical fixture passed UI non-default readback, Cancel, Save, reopen, restart restoration and original standalone installation rollback. See [acceptance evidence](CONTEXT-CONFIG-TEST.md). This solves a reachable Suite component configuration page, NOT the original Insights settings button or every preference's runtime consumption.

Retaining row IDs alone fixes the known namespace mismatch but not navigation. Follow-up: the exact original Insights button now opens the correct Suite bundle's original upstream context form in the private fixed-digest navigation fixture, with synthetic non-default values verified twice. See [separate navigation acceptance](NAVIGATION-TEST.md). Normal upstream0.73.3 dependency remains unmodified; maintained/distributable adaptation strategy is still required. Original options considered:

- Suite-owned formal `plugins.row.config`/`plugins.bundle.config` form plus explicit Suite navigation; preserve non-Suite behavior. This does not automatically repair the old button.
- A small licensed upstream/source adapter allowing a configurable settings bundle target and form placement, with a packaged modified module and attribution.
- Upstream configurable navigation/config extension support.

Do not monkeypatch DOM, internal manager stores or service methods; do not resurrect a fake standalone card. Public `pluginNavigation` supports `openBundle` and `openList`, not external `openRow`. Only after formal configuration UI and all config layers pass can daily replacement be proposed.
