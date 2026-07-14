# Task 5 Report: Semi-Finished Common Materials Page

## Commit

- Feature commit: `c487ffb` (`feat: add semi common materials page`)

## Files

- `web/src/pages/semi/SemiFinishedCommonMaterialsPage.tsx`
- `web/src/__tests__/semiFinishedCommonMaterialsPage.test.ts`
- `web/src/App.tsx` (owned import and route hunks only)
- `web/src/nav/menuTree.tsx` (owned `g-semi` menu hunk only)

## Delivered

- Modern Ant Design list at `/semi-finished-common-materials`.
- Permission-bound menu entry under `半成品仓库` using `半成品共用物料表`.
- Server-side filters and pagination for the approved nine visible columns.
- Price masking, request-version stale-response protection, and session filter persistence using the `4ba2344` helpers.
- Row selection and double-click navigation to the encoded assembly material detail URL with return state.

## Verification

- `npm test -- semiFinishedCommonMaterialsPage.test.ts semiFinishedCommonMaterials.test.ts` -> 2 files, 12 tests passed.
- `npm run build` -> TypeScript and Vite build passed.
- `git diff --cached --check` -> passed before feature commit.

