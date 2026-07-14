# Task 5 Report: Semi-Finished Common Materials Page

## Commit

- Feature commit: `c487ffb` (`feat: add semi common materials page`)
- Review fix commit: `774549a` (`fix: complete semi common materials toolbar`)

## Files

- `web/src/pages/semi/SemiFinishedCommonMaterialsPage.tsx`
- `web/src/__tests__/semiFinishedCommonMaterialsPage.test.ts`
- `web/src/App.tsx` (owned import and route hunks only)
- `web/src/nav/menuTree.tsx` (owned `g-semi` menu hunk only)
- `.superpowers/sdd/task-5-report.md`

## Delivered

- Modern Ant Design list at `/semi-finished-common-materials`.
- Permission-bound menu entry under `半成品仓库` using `半成品共用物料表`.
- Server-side filters and pagination for the approved nine visible columns.
- Price masking, request-version stale-response protection, and session filter persistence using the `4ba2344` helpers.
- Row selection and double-click navigation to the encoded assembly material detail URL with return state.
- Distinct contains-match `查询` and exact-match `精确查询` actions, including Enter submission for contains search.
- Unified Ant Design toolbar actions for table settings, Excel export, print, and close, with data and permission-aware disabled states.

## Verification

- `npm test -- semiFinishedCommonMaterialsPage.test.ts` -> 1 file, 5 tests passed.
- `npm test -- semiFinishedCommonMaterialsPage.test.ts semiFinishedCommonMaterials.test.ts` -> 2 files, 15 tests passed.
- `npm run build` -> TypeScript and Vite build passed.
- `git diff --cached --check` -> passed before the review fix commit.
