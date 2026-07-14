# Task 6 Report

## Changed Hunks

- `src/ErpApi/Features/Styles/StyleService.cs` and `StyleDtos.cs`
  - Preserve optional-section presence in `GET /api/styles/{款号}/materials`: absent extension data is `扩展: null`, and absent quote rows are `报价: null`.
  - Keep non-empty persisted quote rows as an ordered array; save semantics still distinguish omitted sections from an explicit empty quote list.
- `src/ErpApi/Features/Styles/StyleMaterialsPricePolicy.cs`
  - Redaction preserves null optional sections while continuing to clear protected prices.
- `web/src/pages/styles/BomSetupPage.tsx`
  - Keeps optional sections omitted until the assembly route loads them or the user intentionally edits assembly/quote state.
  - Gates audit and reverse-audit controls and calls to `/assembly-material-setup`; legacy `/bom-setup` cannot create the new extension through audit.
  - Retains price masking, price-preserving server policy, stale-load protection, quote partner replacement, read-only audited state, and close navigation behavior.
- `tests/ErpApi.Tests/StyleAssemblyMaterialsDbTests.cs` and `StyleMaterialsPricePermissionTests.cs`
  - Cover absent-section service hydration, explicit empty quote clearing, and null-safe price redaction; DB round-trip/audit tests remain skippable when `ERP_TEST_DB` is unavailable.
- `web/src/__tests__/bomSetupAssemblyPersistence.test.ts`
  - Covers optional-section activation after an assembly edit, extension/quote hydrate-save, legacy audit gating, assembly audit endpoint use, audited read-only state, close routing, and prior regressions.

## Verification

- Focused Vitest: `1` file, `11` tests passed.
- Full Vitest: `45` files, `159` tests passed.
- Frontend production build: `npm run build` passed; Vite emitted the existing large-chunk warning.
- Focused backend non-DB policy tests: `4` passed.
- Relevant assembly DB tests: `6` skipped because the configured LocalDB `ERP_TEST_DB` connection is unavailable.
- Relevant price-permission API DB test: `1` skipped for the same unavailable `ERP_TEST_DB` connection.
- Backend Release build: passed with `0` warnings and `0` errors.

## Commit

`fix: preserve assembly optional section compatibility`
