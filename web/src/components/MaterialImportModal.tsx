// 物料档案 Excel 导入弹窗:选 xlsx/csv → 解析预览 → 确认导入 → 显示结果(来料/塑胶两页共用)
import { useState } from "react";
import { Alert, Button, Modal, Space, Table, Upload, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import type { ImportResult } from "../api/importResult";
import { decodeCsvBuffer, splitDelimited } from "../utils/bomImport";
import {
  parseMaterialGrid, type MaterialImportParsedRow, type MaterialImportSpec,
} from "../utils/materialImport";

interface Props {
  open: boolean;
  title: string;
  spec: MaterialImportSpec;
  onImport: (rows: Record<string, unknown>[]) => Promise<ImportResult>;
  onClose: () => void;
  onDone: () => void; // 导入成功后刷新列表/类别树
}

export default function MaterialImportModal({ open, title, spec, onImport, onClose, onDone }: Props) {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<MaterialImportParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const reset = () => { setFileName(""); setRows([]); setResult(null); };
  const handleClose = () => { reset(); onClose(); };

  const readFile = async (file: File) => {
    reset();
    try {
      const buf = await file.arrayBuffer();
      let grid: unknown[][];
      if (file.name.toLowerCase().endsWith(".csv")) {
        grid = splitDelimited(decodeCsvBuffer(buf));
      } else {
        const wb = XLSX.read(buf);
        grid = XLSX.utils.sheet_to_json<unknown[]>(
          wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: "" });
      }
      const parsed = parseMaterialGrid(grid, spec);
      if (!parsed.hasHeader || parsed.rows.length === 0) {
        message.error("未解析到数据(找不到含“物料编号”的表头行)");
        return;
      }
      setFileName(file.name);
      setRows(parsed.rows);
      setResult(null);
    } catch {
      message.error("文件解析失败,请确认是 xlsx 或 csv 文件");
    }
  };

  const validCount = rows.filter(r => !r.错误).length;

  const confirm = async () => {
    setImporting(true);
    try {
      const payload = rows.filter(r => !r.错误).map(r => ({ 行号: r.行号, ...r.数据 }));
      const res = await onImport(payload);
      setResult(res);
      if (res.新增 > 0) onDone();
    } catch {
      message.error("导入失败");
    } finally {
      setImporting(false);
    }
  };

  const columns = [
    { title: "行号", dataIndex: "行号", width: 64 },
    { title: "物料编号", dataIndex: ["数据", "物料编号"], width: 110 },
    { title: "物料名称", dataIndex: ["数据", "物料名称"], width: 130 },
    { title: "规格", dataIndex: ["数据", "规格"], width: 100 },
    { title: "颜色", dataIndex: ["数据", "颜色"], width: 90 },
    { title: "单位", dataIndex: ["数据", "单位"], width: 64 },
    { title: "单价", dataIndex: ["数据", "单价"], width: 90, align: "right" as const },
    { title: "备注", dataIndex: ["数据", "备注"], ellipsis: true },
    {
      title: "错误", dataIndex: "错误", width: 140,
      render: (v?: string) => (v ? <span style={{ color: "#cf1322" }}>{v}</span> : ""),
    },
  ];

  return (
    <Modal
      title={title} open={open} onCancel={handleClose} onOk={confirm}
      okText="确认导入" confirmLoading={importing} width={960} destroyOnClose
      okButtonProps={{ disabled: validCount === 0 || result !== null }}
    >
      <style>{".material-import-row-error > td { background: #fff1f0; }"}</style>
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        <Space wrap>
          <Upload
            accept=".xlsx,.csv" showUploadList={false}
            beforeUpload={file => { void readFile(file); return false; }}
          >
            <Button icon={<UploadOutlined />}>选择 xlsx / csv 文件</Button>
          </Upload>
          {fileName && <span style={{ color: "#888" }}>{fileName}</span>}
          {rows.length > 0 && (
            <span style={{ color: "#888" }}>
              共 {rows.length} 行,可导入 {validCount} 行{rows.length - validCount > 0 ? `,${rows.length - validCount} 行有误` : ""}
            </span>
          )}
        </Space>
        {rows.length > 0 && (
          <Table
            size="small" rowKey="行号" dataSource={rows} columns={columns}
            rowClassName={r => (r.错误 ? "material-import-row-error" : "")}
            scroll={{ x: true, y: 320 }} pagination={false}
          />
        )}
        {result && (
          <Alert
            type={result.失败 > 0 ? "warning" : "success"} showIcon
            message={`导入完成:新增 ${result.新增} 条,跳过 ${result.跳过} 条(编号已存在),失败 ${result.失败} 条`}
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
