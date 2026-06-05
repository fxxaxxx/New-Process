param([string]$ConnectionString = $env:ERP_DB)
$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($ConnectionString)) { throw "未提供连接串(参数 -ConnectionString 或环境变量 ERP_DB)" }
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $dir
dotnet run --project (Join-Path $root "tools\DbDeploy") -- $ConnectionString `
  ("lenient:" + (Join-Path $dir "01_rebuild_schema.sql")) `
  ("lenient:" + (Join-Path $dir "02_rebuild_relations.sql")) `
  (Join-Path $dir "03_p0_additions.sql") `
  (Join-Path $dir "04_p4_additions.sql") `
  (Join-Path $dir "05_p4m7_additions.sql") `
  (Join-Path $dir "06_p5_additions.sql")
