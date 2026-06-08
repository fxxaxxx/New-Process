-- P5 月结：扩展结存快照表支持「口径(成品/半成品)」与半成品物料维度。幂等。
SET XACT_ABORT ON;

IF COL_LENGTH(N'结存快照表', N'口径') IS NULL
    ALTER TABLE [结存快照表] ADD [口径] nvarchar(8) NOT NULL DEFAULT N'成品';
IF COL_LENGTH(N'结存快照表', N'物料编号') IS NULL
    ALTER TABLE [结存快照表] ADD [物料编号] nvarchar(30) NULL;
IF COL_LENGTH(N'结存快照表', N'物料名称') IS NULL
    ALTER TABLE [结存快照表] ADD [物料名称] nvarchar(40) NULL;
IF COL_LENGTH(N'结存快照表', N'规格') IS NULL
    ALTER TABLE [结存快照表] ADD [规格] nvarchar(40) NULL;
IF COL_LENGTH(N'结存快照表', N'单位') IS NULL
    ALTER TABLE [结存快照表] ADD [单位] nvarchar(10) NULL;

-- 重建唯一索引：纳入 口径 + 物料编号。成品行靠款号维度唯一、半成品行靠物料编号+颜色唯一。表当前为空，重建安全。
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_结存快照_维度')
    DROP INDEX UX_结存快照_维度 ON [结存快照表];
CREATE UNIQUE INDEX UX_结存快照_维度 ON [结存快照表]
    ([年月],[仓库],[口径],[款号],[色号],[颜色],[尺码],[物料编号]);
