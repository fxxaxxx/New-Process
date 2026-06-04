-- P4 M6 裁床：裁床单号列原为 nvarchar(10)，容不下单号(前缀+yyyyMMdd+3位=13字符)，扩到 20；
-- 裁床总表 不在 P0 可过账白名单，缺 审核人/审核日期 留痕列，补齐(供审核过账引擎②)。幂等。
SET XACT_ABORT ON;

IF COL_LENGTH(N'裁床总表', N'裁床单号') < 40   -- nvarchar(20) 的字节长度=40；<40 说明还是10(=20字节)
    ALTER TABLE [裁床总表] ALTER COLUMN [裁床单号] nvarchar(20);
IF COL_LENGTH(N'裁床明细表', N'裁床单号') < 40
    ALTER TABLE [裁床明细表] ALTER COLUMN [裁床单号] nvarchar(20);
IF COL_LENGTH(N'计件表', N'裁床单号') < 40
    ALTER TABLE [计件表] ALTER COLUMN [裁床单号] nvarchar(20);

IF COL_LENGTH(N'裁床总表', N'审核人') IS NULL
    ALTER TABLE [裁床总表] ADD [审核人] nvarchar(20) NULL;
IF COL_LENGTH(N'裁床总表', N'审核日期') IS NULL
    ALTER TABLE [裁床总表] ADD [审核日期] datetime2(0) NULL;
