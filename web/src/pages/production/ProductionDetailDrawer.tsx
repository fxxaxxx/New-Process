import { useEffect, useState } from "react";
import { Descriptions, Drawer, Table, Tabs, Tag, message } from "antd";
import { productionApi, type ProductionDetail } from "../../api/production";

const money = (v?: number | null) => (v == null ? "***" : v);

export default function ProductionDetailDrawer({ 生产单号, onClose }: {
  生产单号: string | null; onClose: () => void;
}) {
  const [detail, setDetail] = useState<ProductionDetail | null>(null);

  useEffect(() => {
    if (!生产单号) { setDetail(null); return; }
    (async () => {
      try { setDetail(await productionApi.get(生产单号)); }
      catch { message.error("加载生产制单详情失败"); }
    })();
  }, [生产单号]);

  const h = detail?.单头;

  return (
    <Drawer title={`生产制单 ${生产单号 ?? ""}`} width={860} open={!!生产单号} onClose={onClose}>
      {detail && (
        <>
          <Descriptions size="small" column={3} bordered style={{ marginBottom: 16 }}
            items={[
              { key: "1", label: "款号", children: `${h?.款号 ?? ""} ${h?.款式 ?? ""}` },
              { key: "2", label: "客户", children: h?.客户名称 ?? "-" },
              { key: "3", label: "状态", children: h?.审核 === "1" ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag> },
              { key: "4", label: "加工厂", children: h?.加工厂名称 ?? "-" },
              { key: "5", label: "计划数量", children: String(h?.计划数量 ?? "-") },
              { key: "6", label: "交货日期", children: h?.交货日期?.slice(0, 10) ?? "-" },
              { key: "7", label: "工序数", children: String(h?.工序数 ?? "-") },
              { key: "8", label: "单件工费", children: money(h?.工序单价) },
              { key: "9", label: "物料金额", children: money(h?.物料金额) },
            ]} />
          <Tabs
            items={[
              {
                key: "qty", label: `数量明细 (${detail.数量.length})`,
                children: (
                  <Table size="small" rowKey="id" pagination={false} dataSource={detail.数量}
                    columns={[
                      { title: "颜色", dataIndex: "颜色" }, { title: "尺码", dataIndex: "尺码" },
                      { title: "数量", dataIndex: "数量" },
                    ]} />
                ),
              },
              {
                key: "proc", label: `工序工费 (${detail.工序.length})`,
                children: (
                  <Table size="small" rowKey="id" pagination={false} dataSource={detail.工序}
                    columns={[
                      { title: "工序号", dataIndex: "工序号" }, { title: "工序名称", dataIndex: "工序名称" },
                      { title: "工价", dataIndex: "单价", render: money },
                      { title: "工序类型", dataIndex: "工序类型",
                        render: (v?: string) => v ? <Tag style={{ borderRadius: 6 }}>{v}</Tag> : null },
                    ]} />
                ),
              },
              {
                key: "bom", label: `物料需求 BOM (${detail.物料.length})`,
                children: (
                  <Table size="small" rowKey="id" pagination={false} dataSource={detail.物料} scroll={{ x: true }}
                    columns={[
                      { title: "物料编号", dataIndex: "物料编号" }, { title: "物料名称", dataIndex: "物料名称" },
                      { title: "单位", dataIndex: "单位" },
                      { title: "需求数量", dataIndex: "总数量" },
                      { title: "库存", dataIndex: "库存数量" },
                      {
                        title: "需订(缺料)", dataIndex: "需订数量",
                        render: (v?: number) => (v && v > 0 ? <span style={{ color: "#cf1322", fontWeight: 600 }}>{v}</span> : v),
                      },
                      { title: "预算单价", dataIndex: "预算单价", render: money },
                      { title: "金额", dataIndex: "金额", render: money },
                      { title: "供应商", dataIndex: "供应商名称" },
                    ]} />
                ),
              },
            ]} />
        </>
      )}
    </Drawer>
  );
}
