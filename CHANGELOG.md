# Changelog

## [2.0.8] — 2026-11-13 (unreleased candidate)

- Restore ownership in the parent pnpm workspace and local Core/UI development dependencies.
- Use TypeScript 5.9.3 for the existing declaration plugin; align Core/UI peer minimums to 2.0.8.
- Retain the existing ESM/CommonJS exports and spatial runtime APIs.
- Document the approved TypeScript 5.9.3 browser-consumer profile and the known TypeScript 7.0.2 default-DOM/WebGPU declaration incompatibility. Runtime APIs and dependency constraints are unchanged.

Compatibility: internal workspace specifications are retained. No public API redesign, PostgreSQL backend, persistence migration or automatic SQLite activation is introduced by this preparation.

Validation: package builds and available tests are recorded in the coordinated Gate 2 report. Gate 3 must verify the exact packed artifacts and clean-consumer compatibility before publication. These entries describe verified checked-out capabilities and release-preparation deltas; they do not claim that every capability is new relative to the last npm artifact.

