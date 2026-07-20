import { Alert, Button, Empty, Modal, Space } from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import type { LabelLine } from "../../utils/semiFinishedLabelOrders";
import "./SemiFinishedLabelPrintPreview.css";

type PrintableLine = Omit<LabelLine, "ID"> & { ID?: number | null };

interface PrintLabel extends PrintableLine {
  标签序号: number;
  标签总数: number;
}

interface Props {
  open: boolean;
  documentNo?: string;
  documentDate?: string;
  lines: PrintableLine[];
  onClose: () => void;
}

function buildPrintLabels(lines: PrintableLine[]): PrintLabel[] {
  return lines.flatMap(line => {
    if (!Number.isInteger(line.实需标签数) || line.实需标签数 <= 0) return [];
    return Array.from({ length: line.实需标签数 }, (_value, index) => ({
      ...line,
      标签序号: index + 1,
      标签总数: line.实需标签数,
    }));
  });
}

export default function SemiFinishedLabelPrintPreview({ open, documentNo, documentDate, lines, onClose }: Props) {
  const invalid = lines.some(line =>
    !Number.isFinite(line.实需标签数) || !Number.isInteger(line.实需标签数) || line.实需标签数 < 0,
  );
  const labels = invalid ? [] : buildPrintLabels(lines);

  return (
    <Modal
      open={open}
      title="半成品标签打印预览"
      width={980}
      onCancel={onClose}
      footer={(
        <Space>
          <Button onClick={onClose}>关闭</Button>
          <Button type="primary" icon={<PrinterOutlined />} disabled={invalid || labels.length === 0} onClick={() => window.print()}>
            打印
          </Button>
        </Space>
      )}
      className="semi-label-print-modal"
      destroyOnHidden
    >
      {invalid ? (
        <Alert type="error" showIcon message="实需标签数必须是非负整数" />
      ) : labels.length === 0 ? (
        <Empty description="没有需要打印的标签" />
      ) : (
        <div className="semi-label-print-root">
          {labels.map((label, index) => (
            <article className="semi-label-print-card" key={`${label.配件编号}-${index}`}>
              <header>
                <strong>{label.产品货号 || "-"}</strong>
                <span>{label.标签序号}/{label.标签总数}</span>
              </header>
              <dl>
                <div><dt>产品名称</dt><dd>{label.产品名称 || "-"}</dd></div>
                <div><dt>产品装配名称</dt><dd>{label.产品装配名称 || "-"}</dd></div>
                <div><dt>配件编号</dt><dd>{label.配件编号 || "-"}</dd></div>
                <div><dt>客户</dt><dd>{label.客户 || "-"}</dd></div>
                <div><dt>单据</dt><dd>{documentNo || "未保存"}</dd></div>
                <div><dt>日期</dt><dd>{documentDate || "-"}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </Modal>
  );
}
