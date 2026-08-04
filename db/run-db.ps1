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
  (Join-Path $dir "seed_semi_warehouse_return_perms.sql") `
  (Join-Path $dir "migrate_semi_scraps.sql") `
  (Join-Path $dir "seed_semi_scrap_perms.sql") `
  (Join-Path $dir "migrate_finished_receipt_freeselect.sql") `
  (Join-Path $dir "10_production_notice.sql") `
  (Join-Path $dir "15_plastic_material_master.sql") `
  (Join-Path $dir "16_plastic_common_materials.sql") `
  (Join-Path $dir "17_plastic_material_doc.sql") `
  (Join-Path $dir "18_plastic_receipt.sql") `
  (Join-Path $dir "19_plastic_issue_return.sql") `
  (Join-Path $dir "20_plastic_return_scrap.sql") `
  (Join-Path $dir "21_plastic_stocktake.sql") `
  (Join-Path $dir "22_plastic_issue_form.sql") `
  (Join-Path $dir "23_plastic_warehouse_return_form.sql") `
  (Join-Path $dir "24_plastic_supplier_docs_form.sql") `
  (Join-Path $dir "25_plastic_receipt_processing_cols.sql") `
  (Join-Path $dir "26_plastic_warehouse_return_processing_cols.sql") `
  (Join-Path $dir "27_plastic_purchase_order.sql") `
  (Join-Path $dir "28_plastic_process_purchase_order.sql") `
  (Join-Path $dir "29_plastic_white_part_issue.sql") `
  (Join-Path $dir "30_plastic_raw_material.sql") `
  (Join-Path $dir "31_plastic_raw_material_demand.sql") `
  (Join-Path $dir "32_raw_material_purchase_order.sql") `
  (Join-Path $dir "33_raw_material_receipt.sql") `
  (Join-Path $dir "34_raw_material_return.sql") `
  (Join-Path $dir "35_raw_material_stock_return.sql") `
  (Join-Path $dir "36_plastic_raw_material_add_cols.sql") `
  (Join-Path $dir "37_raw_material_stock_issue.sql") `
  (Join-Path $dir "38_raw_material_stocktake.sql") `
  (Join-Path $dir "39_plastic_mold.sql") `
  (Join-Path $dir "40_plastic_common_materials_add_cols.sql") `
  (Join-Path $dir "42_plastic_second_process.sql") `
  (Join-Path $dir "43_assembly_rules.sql") `
  (Join-Path $dir "44_assembly_purchase_order.sql") `
  (Join-Path $dir "46_warehouse_locations.sql") `
  (Join-Path $dir "47_injection_machine_rates.sql") `
  (Join-Path $dir "52_material_label_order.sql") `
  (Join-Path $dir "53_plastic_label_order.sql") `
  (Join-Path $dir "55_image_notes.sql") `
  (Join-Path $dir "56_widen_material_code.sql") `
  (Join-Path $dir "migrate_semi_issue_freeselect.sql") `
  (Join-Path $dir "migrate_semi_stock_returns.sql") `
  (Join-Path $dir "seed_mold_perms.sql") `
  (Join-Path $dir "seed_assembly_purchase_order_perms.sql") `
  (Join-Path $dir "seed_material_label_order_perms.sql") `
  (Join-Path $dir "seed_plastic_label_order_perms.sql") `
  (Join-Path $dir "59_material_label_query_perms.sql") `
  (Join-Path $dir "seed_system_masters_perms.sql") `
  (Join-Path $dir "seed_audit_fix_perms.sql")
