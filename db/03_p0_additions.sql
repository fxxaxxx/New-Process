-- P0 新增：库存滚存快照、单号流水、系统配置；并为登录锁定加列、移除明文错密依赖
SET XACT_ABORT ON;

IF OBJECT_ID(N'[结存快照表]') IS NULL
CREATE TABLE [结存快照表] (
    [ID] bigint IDENTITY(1,1) PRIMARY KEY,
    [年月] char(6) NOT NULL,            -- 期末 yyyyMM
    [仓库] nvarchar(20) NOT NULL,
    [款号] nvarchar(30) NOT NULL,
    [款式] nvarchar(40) NULL,
    [色号] nvarchar(20) NULL,
    [颜色] nvarchar(20) NULL,
    [尺码] nvarchar(10) NULL,
    [期初] decimal(18,4) NOT NULL DEFAULT 0,
    [本期入] decimal(18,4) NOT NULL DEFAULT 0,
    [本期出] decimal(18,4) NOT NULL DEFAULT 0,
    [结存] decimal(18,4) NOT NULL DEFAULT 0,
    [生成时间] datetime2(0) NOT NULL
);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_结存快照_维度')
CREATE UNIQUE INDEX UX_结存快照_维度 ON [结存快照表]
    ([年月],[仓库],[款号],[色号],[颜色],[尺码]);

IF OBJECT_ID(N'[单号流水表]') IS NULL
CREATE TABLE [单号流水表] (
    [单据类型] nvarchar(20) NOT NULL,
    [业务日期] char(8) NOT NULL,        -- yyyyMMdd
    [当日流水] int NOT NULL,
    CONSTRAINT PK_单号流水 PRIMARY KEY ([单据类型],[业务日期])
);

IF OBJECT_ID(N'[系统配置表]') IS NULL
CREATE TABLE [系统配置表] (
    [键] nvarchar(60) NOT NULL PRIMARY KEY,
    [值] nvarchar(max) NULL,
    [是否加密] bit NOT NULL DEFAULT 0,
    [备注] nvarchar(200) NULL
);

IF COL_LENGTH(N'sysfileuser', N'登录失败次数') IS NULL
    ALTER TABLE [sysfileuser] ADD [登录失败次数] int NOT NULL DEFAULT 0;
IF COL_LENGTH(N'sysfileuser', N'锁定到期') IS NULL
    ALTER TABLE [sysfileuser] ADD [锁定到期] datetime2(0) NULL;
