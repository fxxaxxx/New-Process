import { useEffect, useState } from "react";
import { Descriptions, Drawer, Empty, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  assemblyPurchaseQueryApi,
  type AssemblyPurchaseAccessoryLine,
  type AssemblyPurchaseOrderHeader,
  type AssemblyPurchaseProductLine,
  type AssemblyPurchaseProductionLine,
} from "../../api/assemblyPurchaseQuery";

const fmtDate = (v?: string) => (v ? String(v).slice(0, 10) : "");
const fmtNum = (v?: number | null) => (v == null ? "" : Number(v).toLocaleString());
const fmtMoney = (v?: number | null) => (v == null ? "" : Number(v).toFixed(4));
const show = (v?: string | number | null) => (v == null || v === "" ? "-" : String(v));

export default function AssemblyPurchaseQueryDetailDrawer({
  open,
  单号,
  onClose,
}: {
  open: boolean;
  单号?: string;
  onClose: () => void;
}) {
  const [head, setHead] = useState<AssemblyPurchaseOrderHeader | undefined>();
  const [products, setProducts] = useState<AssemblyPurchaseProductLine[]>([]);
  const [production, setProduction] = useState<AssemblyPurchaseProductionLine[]>([]);
  const [accessories, setAccessories] = useState<AssemblyPurchaseAccessoryLine[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !单号) return;
    setLoading(true);
    assemblyPurchaseQueryApi.get(单号)
      .then(d => {
        setHead(d.单头);
        setProducts(d.产品明细 ?? []);
        setProduction(d.生产明细 ?? []);
        setAccessories(d.辅料表 ?? []);
      })
      .catch(() => {
        setHead(undefined);
        setProducts([]);
        setProduction([]);
        setAccessories([]);
      })
      .finally(() => setLoading(false));
  }, [open, 单号]);

  const productColumns: ColumnsType<AssemblyPurchaseProductLine> = [
    { title: "客户", dataIndex: "客户", width: 120 },
    { title: "产品货号", dataIndex: "产品货号", width: 140 },
    { title: "产品装配名称", dataIndex: "产品装配名称", width: 180 },
    { title: "配件编号", dataIndex: "配件编号", width: 120 },
    { title: "装配方式", dataIndex: "装配方式", width: 140 },
    { title: "加工数量", dataIndex: "加工数量", width: 100, align: "right", render: fmtNum },
    { title: "备注", dataIndex: "备注", width: 160 },
  ];

  const productionColumns: ColumnsType<AssemblyPurchaseProductionLine> = [
    { title: "接单日期", dataIndex: "接单日期", width: 105, render: fmtDate },
    { title: "生产单号", dataIndex: "生产单号", width: 130 },
    { title: "产品货号", dataIndex: "产品货号", width: 130 },
    { title: "产品名称", dataIndex: "产品名称", width: 170 },
    { title: "配件编号", dataIndex: "配件编号", width: 110 },
    { title: "产品装配名称", dataIndex: "产品装配名称", width: 170 },
    { title: "加工数量", dataIndex: "加工数量", width: 95, align: "right", render: fmtNum },
    { title: "单价", dataIndex: "单价", width: 85, align: "right", render: fmtMoney },
    { title: "金额", dataIndex: "金额", width: 100, align: "right", render: fmtMoney },
  ];

  const accessoryColumns: ColumnsType<AssemblyPurchaseAccessoryLine> = [
    { title: "序号", dataIndex: "序号", width: 58 },
    { title: "辅料编号", dataIndex: "辅料编号", width: 120 },
    { title: "辅料名称", dataIndex: "辅料名称", width: 180 },
    { title: "加工总数量", dataIndex: "加工总数量", width: 110, align: "right", render: fmtNum },
    { title: "单个产品需求量", dataIndex: "单个产品需求量", width: 130, align: "right", render: fmtNum },
    { title: "需求数(g)", dataIndex: "需求数克", width: 100, align: "right", render: fmtNum },
    { title: "需求数(个)", dataIndex: "需求数个", width: 100, align: "right", render: fmtNum },
  ];

  return (
    <Drawer open={open} onClose={onClose} width={1320} title={`装配加工采购单 ${单号 ?? ""}`} destroyOnClose>
      {head ? (
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          <Descriptions size="small" bordered column={4}>
            <Descriptions.Item label="供应商">{show([head.供应商编号, head.供应商名称].filter(Boolean).join("，"))}</Descriptions.Item>
            <Descriptions.Item label="出单日期">{fmtDate(head.出单日期)}</Descriptions.Item>
            <Descriptions.Item label="单价(￥)">{fmtMoney(head.单价)}</Descriptions.Item>
            <Descriptions.Item label="金额(￥)">{fmtMoney(head.金额)}</Descriptions.Item>
            <Descriptions.Item label="收货仓库">{show(head.收货仓库)}</Descriptions.Item>
            <Descriptions.Item label="电脑单号">{show(head.电脑单号)}</Descriptions.Item>
            <Descriptions.Item label="审核">
              {head.审核 === "1" ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="客户">{show(head.客户)}</Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>{show(head.备注)}</Descriptions.Item>
            <Descriptions.Item label="开始交货日期">{fmtDate(head.开始交货日期)}</Descriptions.Item>
            <Descriptions.Item label="每天交货">{fmtNum(head.每天交货)}</Descriptions.Item>
            <Descriptions.Item label="完成日期">{fmtDate(head.完成日期)}</Descriptions.Item>
            <Descriptions.Item label="收货人">{show(head.收货人)}</Descriptions.Item>
          </Descriptions>

          <Typography.Text strong>产品明细</Typography.Text>
          <Table
            rowKey={(_, i) => `p-${i}`}
            size="small"
            loading={loading}
            dataSource={products}
            columns={productColumns}
            pagination={false}
            scroll={{ x: "max-content" }}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 12, alignItems: "start" }}>
            <div>
              <Typography.Text strong>生产单明细</Typography.Text>
              <Table
                rowKey={(_, i) => `m-${i}`}
                size="small"
                loading={loading}
                dataSource={production}
                columns={productionColumns}
                pagination={false}
                scroll={{ x: "max-content", y: 420 }}
                style={{ marginTop: 8 }}
              />
            </div>
            <div>
              <Typography.Text strong>辅料表</Typography.Text>
              <Table
                rowKey={(_, i) => `a-${i}`}
                size="small"
                loading={loading}
                dataSource={accessories}
                columns={accessoryColumns}
                pagination={false}
                scroll={{ x: "max-content", y: 420 }}
                style={{ marginTop: 8 }}
              />
            </div>
          </div>
        </Space>
      ) : (
        <Empty description={loading ? "加载中" : "未找到单据详情"} />
      )}
    </Drawer>
  );
}
