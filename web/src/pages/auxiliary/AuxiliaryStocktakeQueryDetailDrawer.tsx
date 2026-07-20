import { useEffect, useState } from "react";
import { Descriptions, Drawer, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { auxiliaryStocktakeQueryApi } from "../../api/auxiliaryStocktakeQuery";
import type { MSDetail, MSHeader, MSLineRow } from "../../api/materialStocktake";

type AuxiliaryStocktakeHeader = MSHeader & { 电脑单号?: string };

interface AuxiliaryStocktakeQueryDetailDrawerProps {
  open: boolean;
  单号?: string;
  onClose: () => void;
}

export default function AuxiliaryStocktakeQueryDetailDrawer({
  open,
  单号,
  onClose,
}: AuxiliaryStocktakeQueryDetailDrawerProps) {
  const [detail, setDetail] = useState<MSDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    if (!open || !单号) {
      setDetail(null);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setDetail(null);
    setLoading(true);

    (async () => {
      try {
        const next = await auxiliaryStocktakeQueryApi.get(单号);
        if (!active) return;

        const head = next?.单头 as AuxiliaryStocktakeHeader | undefined;
        if (head?.仓库 === "辅料仓库") {
          setDetail(next);
          return;
        }

        if (head?.仓库 !== "辅料仓库") {
          setDetail(null);
          message.warning("该盘点单不是辅料仓库单据");
        }
      } catch {
        if (active) {
          setDetail(null);
          message.error("加载辅料盘点单失败");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [open, 单号]);

  const head = detail?.单头 as AuxiliaryStocktakeHeader | undefined;
  const lines = detail?.明细 ?? [];
  const columns: ColumnsType<MSLineRow> = [
    { title: "物料编号", dataIndex: "物料编号" },
    { title: "物料名称", dataIndex: "物料名称" },
    { title: "规格", dataIndex: "规格" },
    { title: "单位", dataIndex: "单位" },
    { title: "系统数量", dataIndex: "系统数量", align: "right" },
    { title: "盘点数量", dataIndex: "盘点数量", align: "right" },
    { title: "盈亏数量", dataIndex: "盈亏数量", align: "right" },
  ];

  return (
    <Drawer
      title={`辅料盘点单${单号 ? ` ${单号}` : ""}`}
      open={open}
      onClose={onClose}
      width={900}
      loading={loading}
    >
      {head && (
        <>
          <Descriptions size="small" column={3} bordered style={{ marginBottom: 16 }}>
            <Descriptions.Item label="单号">{head.单号 ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="日期">{head.日期?.slice(0, 10) ?? "-"}</Descriptions.Item>
            {head.电脑单号 && <Descriptions.Item label="电脑单号">{head.电脑单号}</Descriptions.Item>}
            <Descriptions.Item label="操作员">{head.操作员 ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="审核">
              {head.审核 === "1" ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="仓库">{head.仓库 ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="备注" span={3}>{head.备注 ?? "-"}</Descriptions.Item>
          </Descriptions>
          <Table<MSLineRow>
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={lines}
            columns={columns}
            scroll={{ x: "max-content" }}
          />
        </>
      )}
    </Drawer>
  );
}
