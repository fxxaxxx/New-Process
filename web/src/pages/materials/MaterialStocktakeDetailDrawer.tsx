import { useEffect, useState } from "react";
import { Descriptions, Drawer, Table, Tag, message } from "antd";
import { materialStocktakeApi, type MSDetail } from "../../api/materialStocktake";

// 盘点单只读详情抽屉：双击查询明细行的「单号」打开整单(单头 + 系统/盘点/盈亏 明细)。
// 盘点无单价保密——本抽屉不展示价格列。
export default function MaterialStocktakeDetailDrawer({ 单号, onClose }: {
  单号: string | null; onClose: () => void;
}) {
  const [detail, setDetail] = useState<MSDetail | null>(null);

  useEffect(() => {
    if (!单号) { setDetail(null); return; }
    (async () => {
      try { setDetail(await materialStocktakeApi.get(单号)); }
      catch { message.error("加载盘点单详情失败"); }
    })();
  }, [单号]);

  const h = detail?.单头;

  return (
    <Drawer title={`盘点单 ${单号 ?? ""}`} width={760} open={!!单号} onClose={onClose}>
      {detail && (
        <>
          <Descriptions size="small" column={3} bordered style={{ marginBottom: 16 }}
            items={[
              { key: "no", label: "单号", children: h?.单号 ?? "-" },
              { key: "wh", label: "仓库", children: h?.仓库 ?? "-" },
              { key: "st", label: "状态", children: h?.审核 === "1" ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag> },
              { key: "date", label: "日期", children: h?.日期?.slice(0, 10) ?? "-" },
              { key: "op", label: "操作员", children: h?.操作员 ?? "-" },
              { key: "memo", label: "备注", children: h?.备注 ?? "-" },
            ]} />
          <Table size="small" rowKey="id" pagination={false} dataSource={detail.明细} scroll={{ x: true }}
            columns={[
              { title: "物料编号", dataIndex: "物料编号" }, { title: "物料名称", dataIndex: "物料名称" },
              { title: "规格", dataIndex: "规格" }, { title: "单位", dataIndex: "单位" },
              { title: "系统数量", dataIndex: "系统数量", align: "right" as const },
              { title: "盘点数量", dataIndex: "盘点数量", align: "right" as const },
              { title: "盈亏数量", dataIndex: "盈亏数量", align: "right" as const },
            ]} />
        </>
      )}
    </Drawer>
  );
}
