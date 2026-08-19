// 客户排期 Excel 导入弹窗:选 xlsx/xls/csv → 逐工作表解析(状态按表名推定) → 预览 → 确认导入 → 显示结果
// 与物料导入(MaterialImportModal)不同:排期表一个文件多个工作表(总排期/已走货/取消单…),需要全部解析。
import { useState } from "react";
import { Alert, Button, Input, Modal, Space, Table, Tag, Upload, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import type * as XLSXT from "xlsx";
import { decodeCsvBuffer, splitDelimited } from "../../utils/bomImport";
import {
  guessScheduleCustomer, parseScheduleGrid, yearFromFileName,
  type ScheduleImportRowData, type ScheduleSheetParseResult,
} from "../../utils/schedulingImport";
import type { ScheduleImportResult } from "../../api/scheduling";

interface Props {
  open: boolean;
  onImport: (排期客户: string, 文件名: string, rows: Record<string, unknown>[]) => Promise<ScheduleImportResult>;
  onClose: () => void;
  onDone: () => void; // 导入成功后刷新列表
}

const MAX_COLS = 60;   // 排期表真实数据在前 ~20 列;Excel 整表格式可能把范围撑到 16384 列,必须截断

// 有界读取工作表:按 !ref 范围截断到 MAX_COLS 列,逐格取稀疏单元格,避免巨大空白区域撑爆内存
function sheetToGrid(XLSX: typeof XLSXT, ws: XLSXT.WorkSheet): unknown[][] {
  const ref = ws["!ref"];
  if (!ref) return [];
  const range = XLSX.utils.decode_range(ref);
  range.e.c = Math.min(range.e.c, range.s.c + MAX_COLS - 1);
  const grid: unknown[][] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const cells: unknown[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      cells.push(cell ? cell.v : "");
    }
    grid.push(cells);
  }
  return grid;
}

const STATUS_COLOR: Record<string, string> = { 在排: "blue", 已走货: "green", 已取消: "red" };

export default function ScheduleImportModal({ open, onImport, onClose, onDone }: Props) {
  const [fileName, setFileName] = useState("");
  const [排期客户, set排期客户] = useState("");
  const [sheets, setSheets] = useState<ScheduleSheetParseResult[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ScheduleImportResult | null>(null);

  const reset = () => { setFileName(""); set排期客户(""); setSheets([]); setSkipped([]); setResult(null); };
  const handleClose = () => { reset(); onClose(); };

  const readFile = async (file: File) => {
    reset();
    try {
      const buf = await file.arrayBuffer();
      let parsed: ScheduleSheetParseResult[];
      const 默认年份 = yearFromFileName(file.name);
      if (file.name.toLowerCase().endsWith(".csv")) {
        parsed = [parseScheduleGrid(splitDelimited(decodeCsvBuffer(buf)), "CSV", 默认年份)];
      } else {
        // xlsx 库较大,解析文件时才按需加载(不进首屏包);cellDates 让日期格直接给 Date
        const XLSX: typeof XLSXT = await import("xlsx");
        const wb = XLSX.read(buf, { cellDates: true });
        parsed = wb.SheetNames.map(n => parseScheduleGrid(sheetToGrid(XLSX, wb.Sheets[n]), n, 默认年份));
      }
      const ok = parsed.filter(p => p.hasHeader && p.rows.length > 0);
      if (ok.length === 0) {
        message.error("未解析到排期数据(找不到含 货号/PO号/数量 的表头行)");
        return;
      }
      setFileName(file.name);
      set排期客户(guessScheduleCustomer(file.name));
      setSheets(ok);
      setSkipped(parsed.filter(p => !p.hasHeader || p.rows.length === 0).map(p => p.工作表));
      setResult(null);
    } catch {
      message.error("文件解析失败,请确认是 xlsx / xls / csv 文件");
    }
  };

  const allRows = sheets.flatMap(s => s.rows);
  const validCount = allRows.filter(r => !r.错误).length;

  const confirm = async () => {
    const cust = 排期客户.trim();
    if (!cust) { message.warning("请填写排期客户(如 ZURU / TOMY)"); return; }
    setImporting(true);
    try {
      const payload = allRows.filter(r => !r.错误).map(r => {
        const copy: Record<string, unknown> = { ...r };
        delete copy.错误;
        if (copy.原始数据) copy.原始数据 = JSON.stringify(copy.原始数据);
        return copy;
      });
      const res = await onImport(cust, fileName, payload);
      setResult(res);
      if (res.新增 > 0 || res.更新 > 0) onDone();
    } catch (e) {
      const msg = (e as { response?: { data?: { 消息?: string } } }).response?.data?.消息;
      message.error(msg ?? "导入失败");
    } finally {
      setImporting(false);
    }
  };

  const columns = [
    { title: "行号", dataIndex: "行号", width: 64 },
    { title: "状态", dataIndex: "状态", width: 76,
      render: (v: string) => <Tag color={STATUS_COLOR[v]} style={{ borderRadius: 6 }}>{v}</Tag> },
    { title: "工作表", dataIndex: "来源工作表", width: 90, ellipsis: true },
    { title: "PO号", dataIndex: "PO号", width: 110, ellipsis: true },
    { title: "货号", dataIndex: "货号", width: 110, ellipsis: true },
    { title: "品名", dataIndex: "品名", width: 120, ellipsis: true },
    { title: "数量", dataIndex: "数量", width: 80, align: "right" as const },
    { title: "走货期", dataIndex: "走货期", width: 100 },
    {
      title: "错误", dataIndex: "错误", width: 150,
      render: (v?: string) => (v ? <span style={{ color: "#cf1322" }}>{v}</span> : ""),
    },
  ];

  return (
    <Modal
      title="导入客户排期表" open={open} onCancel={handleClose} onOk={confirm}
      okText="确认导入" confirmLoading={importing} width={1000} destroyOnClose
      okButtonProps={{ disabled: validCount === 0 || result !== null }}
    >
      <style>{".schedule-import-row-error > td { background: #fff1f0; }"}</style>
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        <Space wrap>
          <Upload
            accept=".xlsx,.xls,.csv" showUploadList={false}
            beforeUpload={file => { void readFile(file); return false; }}
          >
            <Button icon={<UploadOutlined />}>选择 xlsx / xls / csv 文件</Button>
          </Upload>
          {fileName && <span style={{ color: "#888" }}>{fileName}</span>}
          {fileName && (
            <span>
              排期客户：
              <Input
                value={排期客户} onChange={e => set排期客户(e.target.value)}
                style={{ width: 180 }} placeholder="如 ZURU / TOMY"
              />
            </span>
          )}
        </Space>
        {sheets.length > 0 && (
          <Space wrap size={[8, 4]} style={{ fontSize: 12, color: "#888" }}>
            {sheets.map(s => (
              <span key={s.工作表}>
                {s.工作表}
                <Tag color={STATUS_COLOR[s.状态]} style={{ borderRadius: 6, marginLeft: 4 }}>{s.状态}</Tag>
                {s.rows.length} 行
              </span>
            ))}
            {skipped.length > 0 && <span>跳过工作表:{skipped.join("、")}(无排期表头或为临时筛选页)</span>}
            <span>
              共 {allRows.length} 行,可导入 {validCount} 行
              {allRows.length - validCount > 0 ? `,${allRows.length - validCount} 行有误` : ""}
            </span>
          </Space>
        )}
        {allRows.length > 0 && (
          <Table
            size="small" rowKey={r => `${r.来源工作表}-${r.行号}`} dataSource={allRows} columns={columns}
            rowClassName={(r: ScheduleImportRowData) => (r.错误 ? "schedule-import-row-error" : "")}
            scroll={{ x: true, y: 320 }}
            pagination={{ pageSize: 50, size: "small", showTotal: t => `共 ${t} 行` }}
          />
        )}
        {result && (
          <Alert
            type={result.失败 > 0 ? "warning" : "success"} showIcon
            message={`导入完成:新增 ${result.新增} 条,更新 ${result.更新} 条(重复导入同步状态/日期),失败 ${result.失败} 条`}
            description={result.失败明细.length > 0 && (
              <div style={{ maxHeight: 160, overflow: "auto" }}>
                {result.失败明细.map((f, i) => (
                  <div key={i}>第 {f.行号} 行{f.物料编号 ? `(${f.物料编号})` : ""}:{f.原因}</div>
                ))}
              </div>
            )}
          />
        )}
      </Space>
    </Modal>
  );
}
