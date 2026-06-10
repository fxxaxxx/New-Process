import { useCallback, useEffect, useState } from "react";
import { Card, Input, Space, Table, message } from "antd";
import { useNavigate } from "react-router-dom";
import { productionReportApi, type BomStyleRow } from "../../api/productionReports";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "生产制单";

export default function BomStyleQueryPage() {
  const perms = usePerms();
  const nav = useNavigate();
  const canOpen = can(perms, MENU, "打开");
  const priceHidden = hidePrice(perms, MENU);

  const [rows, setRows] = useState<BomStyleRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (kw: string) => {
    if (!canOpen) return;
    setLoading(true);
    try { setRows(await productionReportApi.bomStyles(kw)); }
    catch { message.error("加载 BOM货号查询 失败"); }
    finally { setLoading(false); }
  }, [canOpen]);

  useEffect(() => { load(""); }, [load]);

  const go = (款号?: string) => { if (款号) nav(`/bom-setup?款号=${encodeURIComponent(款号)}`); };

  const columns = [
    {
      title: "款号", dataIndex: "款号", width: 160,
      render: (v: string) => <a className="erp-num" onClick={() => go(v)}>{v}</a>,
    },
    { title: "款式", dataIndex: "款式" },
    ...(priceHidden ? [] : [
      { title: "单价", dataIndex: "单价", width: 120, align: "right" as const },
    ]),
    { title: "物料项数", dataIndex: "物料项数", width: 110, align: "right" as const },
  ];

  if (!canOpen) {
    return (
      <Card variant="borderless">
        <div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少“生产制单·打开”权限）。</div>
      </Card>
    );
  }

  return (
    <Card title="BOM货号查询" variant="borderless">
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="款号 / 款式" allowClear style={{ width: 300 }}
          onSearch={(v) => load(v)}
        />
      </Space>
      <Table
        size="small" rowKey={(_, i) => `r-${i}`} loading={loading}
        dataSource={rows} columns={columns} scroll={{ x: 700 }}
        onRow={(r) => ({ onClick: () => go(r.款号), style: { cursor: "pointer" } })}
        pagination={{ pageSize: 50, showSizeChanger: false, showTotal: (t) => `共 ${t} 条` }}
      />
    </Card>
  );
}
