import { useCallback, useState } from "react";
import { Button, Input, InputNumber, List, Modal, Space, Table, message } from "antd";
import { PlusOutlined, DeleteOutlined, PrinterOutlined, ClearOutlined } from "@ant-design/icons";
import { materialMasterApi, type MaterialRow } from "../../api/materialMaster";
import BarcodeLabel from "./BarcodeLabel";

// 条码批量打印：搜物料→加入打印列表→设份数→预览→打印。
// 打印用 CSS 只输出标签区(visibility 方案)，自包含，可从任意页打开。

interface PrintItem { 物料编号: string; 物料名称?: string; 规格?: string; 份数: number }

export default function BarcodePrintModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [kw, setKw] = useState("");
  const [searchRows, setSearchRows] = useState<MaterialRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [items, setItems] = useState<PrintItem[]>([]);

  const search = useCallback(async () => {
    const q = kw.trim();
    if (!q) { message.warning("输入物料编号/名称再搜"); return; }
    setSearching(true);
    try { setSearchRows((await materialMasterApi.list(undefined, q, 1, 20)).items); }
    catch { message.error("搜索物料失败"); }
    finally { setSearching(false); }
  }, [kw]);

  const add = (m: MaterialRow) => {
    const code = (m.物料编号 ?? "").trim();
    if (!code) return;
    // 条码仅支持英文数字符号，含中文直接提示
    if (!/^[\x20-\x7E]+$/.test(code)) { message.warning(`编号 ${code} 含中文/特殊字符，无法生成条码`); return; }
    setItems(prev => {
      const i = prev.findIndex(x => x.物料编号 === code);
      if (i >= 0) return prev.map((x, j) => j === i ? { ...x, 份数: x.份数 + 1 } : x);
      return [...prev, { 物料编号: code, 物料名称: m.物料名称, 规格: m.规格, 份数: 1 }];
    });
  };

  const setQty = (code: string, n: number) =>
    setItems(prev => prev.map(x => x.物料编号 === code ? { ...x, 份数: Math.max(1, n) } : x));
  const remove = (code: string) => setItems(prev => prev.filter(x => x.物料编号 !== code));

  // 展开份数：每个标签按份数重复
  const labels = items.flatMap(x => Array.from({ length: x.份数 }, () => x));

  return (
    <Modal title="条码标签打印" open={open} onCancel={onClose} width={900} footer={null}>
      {/* 打印样式：只输出标签区 */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #barcode-print-area, #barcode-print-area * { visibility: visible !important; }
          #barcode-print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      <Space style={{ marginBottom: 12 }} wrap>
        <Input.Search placeholder="搜物料编号/名称/规格" allowClear style={{ width: 260 }}
          value={kw} onChange={e => setKw(e.target.value)} onSearch={search} loading={searching} />
        <span style={{ color: "#999", fontSize: 12 }}>点搜索结果加入打印列表</span>
      </Space>

      {searchRows.length > 0 && (
        <Table size="small" rowKey="ID" dataSource={searchRows} pagination={false} scroll={{ y: 180 }}
          style={{ marginBottom: 12 }}
          columns={[
            { title: "物料编号", dataIndex: "物料编号", width: 110 },
            { title: "物料名称", dataIndex: "物料名称", width: 140 },
            { title: "规格", dataIndex: "规格", width: 100 },
            { title: "", key: "_a", width: 60, render: (_: unknown, m: MaterialRow) => <Button size="small" icon={<PlusOutlined />} onClick={() => add(m)} /> },
          ]} />
      )}

      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ width: 300 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>
            打印列表（{items.length} 种 / 共 {labels.length} 张）
            {items.length > 0 && <Button size="small" type="text" icon={<ClearOutlined />} onClick={() => setItems([])} style={{ marginLeft: 8 }}>清空</Button>}
          </div>
          <List size="small" dataSource={items} locale={{ emptyText: "尚未添加物料" }}
            renderItem={x => (
              <List.Item style={{ padding: "6px 0" }}
                actions={[
                  <InputNumber key="q" size="small" min={1} max={999} value={x.份数} onChange={n => setQty(x.物料编号, Number(n ?? 1))} style={{ width: 64 }} />,
                  <Button key="d" size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => remove(x.物料编号)} />,
                ]}>
                <div>
                  <div style={{ fontFamily: "monospace", fontWeight: 600 }}>{x.物料编号}</div>
                  <div style={{ fontSize: 12, color: "#888" }}>{x.物料名称}</div>
                </div>
              </List.Item>
            )} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <Space style={{ marginBottom: 8 }}>
            <Button type="primary" icon={<PrinterOutlined />} disabled={labels.length === 0} onClick={() => window.print()}>
              打印（{labels.length} 张）
            </Button>
            <span style={{ color: "#999", fontSize: 12 }}>预览如下，打印只输出标签</span>
          </Space>
          <div id="barcode-print-area" style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 380, overflowY: "auto", padding: 4, background: "#f5f5f5", borderRadius: 8 }}>
            {labels.map((x, i) => <BarcodeLabel key={`${x.物料编号}-${i}`} value={x.物料编号} title={x.物料名称} subtitle={x.规格} />)}
            {labels.length === 0 && <div style={{ color: "#bbb", padding: 24 }}>暂无标签</div>}
          </div>
        </div>
      </div>
    </Modal>
  );
}
