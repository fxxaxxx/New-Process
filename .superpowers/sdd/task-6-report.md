# Task 6 Report

## Changed Hunks

- `web/src/pages/styles/BomSetupPage.tsx`
  - Hydrates extension fields, BOM row `工模编号`/`备注`, and persisted quote rows in service order.
  - Saves extension data, ordered quotes, and BOM row metadata through the typed `stylesApi` payload.
  - Derives the `单价` permission, masks protected extension/quote prices as `***`, disables their editors, and omits protected price edits from the client payload while retaining backend enforcement.
  - Uses assembly route context plus actual response section presence, clears omitted extension/quote state during document switches, and keeps legacy `/bom-setup` saves free of new sections unless the assembly flow activates them.
  - Replaces the selected partner on an existing quote row without dropping its material, quote, or audit metadata; explicit new partner selections remain append operations.
  - Guards document hydration with a request version so stale responses cannot overwrite a newer load.
  - Uses the existing `/styles/{款号}/audit` and `/reverse-audit` endpoints, refreshes after state changes, and keeps audited details read-only until reverse audit.
  - Honors `款号` and `return` query parameters; close returns to the supplied route or browser history.
- `web/src/__tests__/bomSetupAssemblyPersistence.test.ts`
  - Replaces raw source-string checks with component/behavioral coverage for price masking/disablement, omitted-section document switches, legacy payload omission, quote partner replacement, and stale response ordering.

## Verification

- Focused Vitest: `1` file, `5` tests passed.
- Full Vitest: `45` files, `153` tests passed.
- TypeScript and production build: `npm run build` passed; Vite emitted the existing large-chunk warning.
- Production build: `npm run build` passed; Vite emitted the existing large-chunk warning.

## Commit

`fix: harden assembly material detail workflow`
