import { useCallback, useEffect, useState } from "react";
import { Card, Input, Modal, Space, Table, message } from "antd";
import { useNavigate } from "react-router-dom";
import { productionReportApi, type BomMaterialRow } from "../../api/productionReports";
import { masterApi } from "../../api/master";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "生产制单";
const materialsApi = masterApi("materials");

interface MatLookupRow {
  物料编号?: string; 物料名称?: string; 规格?: string; 物料类别?: string;
  颜色?: string; 单位?: string; 备注?: string; [k: string]: unknown;
}

export default function BomMaterialQueryPage() {
  const perms = usePerms();
  const nav = useNavigate();
  const canOpen = can(perms, MENU, "打开");

  const [rows, setRows] = useState<BomMaterialRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (kw: string) => {
    if (!canOpen) return;
    setLoading(true);
    try { setRows(await productionReportApi.bomMaterials(kw)); }
    catch { message.error("加载 BOM物料查询 失败"); }
    finally { setLoading(false); }
  }, [canOpen]);

  useEffect(() => { load(""); }, [load]);

  // —— 物料资料查看弹窗（产品资料查询A，只读）——
  const [lookOpen, setLookOpen] = useState(false);
  const [lookKw, setLookKw] = useState("");
  const [lookRows, setLookRows] = useState<MatLookupRow[]>([]);
  const [lookLoading, setLookLoading] = useState(false);

  const loadLookup = useCallback(async (kw: string) => {
    setLookLoading(true);
    try { const r = await materialsApi.list(1, 50, kw); setLookRows((r.items ?? []) as MatLookupRow[]); }
    catch { message.error("加载物料资料失败"); }
    finally { setLookLoading(false); }
  }, []);

  const openLookup = (物料编号?: string, 物料名称?: string) => {
    const kw = (物料编号 || 物料名称 || "").trim();
    setLookKw(kw); setLookOpen(true); loadLookup(kw);
  };

  const go = (款号?: string) => { if (款号) nav(`/bom-setup?款号=${encodeURIComponent(款号)}`); };

  const columns = [
    {
      title: "款号", dataIndex: "款号", width: 120,
      render: (v: string) => <a className="erp-num" onClick={() => go(v)}>{v}</a>,
    },
    { title: "款式", dataIndex: "款式", width: 140 },
    { title: "物料编号", dataIndex: "物料编号", width: 120 },
    {
      title: "物料名称", dataIndex: "物料名称",
      render: (v: string, r: BomMaterialRow) =>
        <a onClick={() => openLookup(r.物料编号, v)}>{v}</a>,
    },
    { title: "物料类别", dataIndex: "物料类别", width: 110 },
    { title: "规格", dataIndex: "规格", width: 120 },
    { title: "颜色", dataIndex: "颜色", width: 90 },
    { title: "单位", dataIndex: "单位", width: 70 },
    { title: "使用数量", dataIndex: "使用数量", width: 100, align: "right" as const },
  ];

  const lookColumns = [
    { title: "物料编号", dataIndex: "物料编号", width: 130 },
    { title: "物料名称", dataIndex: "物料名称" },
    { title: "规格", dataIndex: "规格", width: 130 },
    { title: "材料", dataIndex: "物料类别", width: 110 },
    { title: "颜色", dataIndex: "颜色", width: 90 },
    { title: "单位", dataIndex: "单位", width: 70 },
    { title: "备注", dataIndex: "备注", width: 160 },
  ];

  if (!canOpen) {
    return (
      <Card variant="borderless">
        <div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少“生产制单·打开”权限）。</div>
      </Card>
    );
  }

  return (
    <Card title="BOM物料查询" variant="borderless">
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="款号 / 物料编号 / 物料名称" allowClear style={{ width: 300 }}
          onSearch={(v) => load(v)}
        />
      </Space>
      <Table
        size="small" rowKey={(_, i) => `r-${i}`} loading={loading}
        dataSource={rows} columns={columns} scroll={{ x: 1100 }}
        pagination={{ pageSize: 50, showSizeChanger: false, showTotal: (t) => `共 ${t} 条` }}
      />

      <Modal
        title="产品资料查询A · 物料资料" open={lookOpen} footer={null} width={900}
        onCancel={() => setLookOpen(false)}
      >
        <Space style={{ marginBottom: 12 }}>
          <Input.Search
            key={lookKw}
            placeholder="物料编号 / 物料名称" allowClear style={{ width: 300 }}
            defaultValue={lookKw} onSearch={loadLookup}
          />
        </Space>
        <Table
          size="small" rowKey={(_, i) => `l-${i}`} loading={lookLoading}
          dataSource={lookRows} columns={lookColumns} scroll={{ x: 760, y: 360 }}
          pagination={{ pageSize: 50, showSizeChanger: false }}
        />
      </Modal>
    </Card>
  );
}
