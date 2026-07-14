# Task 3 Report

Implemented transactional assembly material persistence.

Changed files:

- `db/migrate_semi_finished_common_materials.sql`: idempotent `款号物料明细表.工模编号 nvarchar(100)` migration.
- `src/ErpApi/Data/Entities/款号物料明细表.cs`: mapped `工模编号` (existing `备注` retained).
- `src/ErpApi/Features/Styles/StyleDtos.cs`: extension, quote, and row-level contracts.
- `src/ErpApi/Features/Styles/StyleService.cs`: latest load, transactional BOM/extension/quote save, validation, rollback, and audit state.
- `src/ErpApi/Features/Styles/StyleController.cs`: `款号资料`-scoped audit and reverse-audit routes.
- `src/ErpApi/Features/Warehouse/Semi/CommonMaterials/SemiFinishedCommonMaterialService.cs`: audit upsert/state transitions.
- `src/ErpApi/Features/Warehouse/Semi/CommonMaterials/SemiFinishedCommonMaterialController.cs`: common-material permission-scoped audit routes.
- `tests/ErpApi.Tests/StyleAssemblyMaterialsDbTests.cs`: round-trip, rollback, optional preservation/clear, audit lock, and audit-upsert coverage.

Verification:

- Focused style tests: 7 skipped, 0 failed with `ERP_TEST_DB` unset.
- Release build: passed with 0 warnings and 0 errors.
- Static migration/entity/route checks: passed.
- Full backend suite: 42 passed, 415 skipped, 1 unrelated pre-existing failure in `PricingServiceDbTests.Picks_latest_effective_price_on_or_before_date` due an uninitialized DB connection.
- Live DB assertions were not run: configured LocalDB automatic instance is unavailable. No production database was used.

Feature commit: `d5d7e4f` (`feat: persist assembly material setup details`).
