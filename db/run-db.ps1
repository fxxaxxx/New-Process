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
  (Join-Path $dir "06_p5_additions.sql") `
  (Join-Path $dir "07_p5b_additions.sql") `
  (Join-Path $dir "08_p5c_additions.sql") `
  (Join-Path $dir "09_p5_month_end.sql") `
  (Join-Path $dir "10_p5_material_cost.sql") `
  (Join-Path $dir "11_mo_tracking.sql") `
  (Join-Path $dir "12_purchase_order.sql") `
  (Join-Path $dir "13_purchase_return.sql") `
  (Join-Path $dir "14_scrap_doc.sql") `
  (Join-Path $dir "migrate_semi_finished_common_materials.sql") `
  (Join-Path $dir "seed_semi_finished_common_materials_perms.sql") `
  (Join-Path $dir "migrate_semi_finished_label_orders.sql") `
  (Join-Path $dir "seed_semi_finished_label_order_perms.sql") `
  (Join-Path $dir "migrate_semi_warehouse_returns.sql") `
  (Join-Path $dir "seed_semi_warehouse_return_perms.sql")
