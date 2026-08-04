import { useCallback, useEffect, useState } from "react";
import { Button, Empty, Image, Input, Popconfirm, Space, Upload, message } from "antd";
import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { imageNoteApi, imageNoteUrl, type ImageNote } from "../api/imageNotes";

const ACCEPT = ".jpg,.jpeg,.png,.gif,.webp,.bmp";
const MAX_MB = 10;
const errMsg = (e: unknown) =>
  (e as { response?: { data?: { 消息?: string } } }).response?.data?.消息;

// 图片备注面板: 上传(可带备注)+预览+删除。BOM 页传 模块=BOM/单号=款号,生产通知单传 模块=生产单/单号=生产单号。
export default function ImageNotesPanel({ 模块, 单号, canEdit, emptyHint = "请先打开单据" }: {
  模块: string;
  单号: string;
  canEdit: boolean;
  emptyHint?: string;
}) {
  const [rows, setRows] = useState<ImageNote[]>([]);
  const [备注, set备注] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!单号) { setRows([]); return; }
    setLoading(true);
    try { setRows(await imageNoteApi.list(模块, 单号)); }
    catch (e) { message.error(errMsg(e) ?? "加载图片备注失败"); }
    finally { setLoading(false); }
  }, [模块, 单号]);

  useEffect(() => { void load(); }, [load]);

  if (!单号) return <Empty description={emptyHint} style={{ padding: 24 }} />;

  const uploadProps: UploadProps = {
    accept: ACCEPT,
    showUploadList: false,
    disabled: !canEdit || uploading,
    customRequest: async ({ file, onSuccess, onError }) => {
      const f = file as File;
      if (f.size > MAX_MB * 1024 * 1024) { message.error(`图片不能超过 ${MAX_MB}MB`); onError?.(new Error("too large")); return; }
      setUploading(true);
      try {
        await imageNoteApi.upload(模块, 单号, f, 备注 || undefined);
        set备注("");
        message.success("已上传");
        onSuccess?.({});
        await load();
      } catch (e) {
        message.error(errMsg(e) ?? "上传失败");
        onError?.(e as Error);
      } finally { setUploading(false); }
    },
  };

  const remove = async (id: number) => {
    try {
      await imageNoteApi.remove(id);
      message.success("已删除");
      await load();
    } catch (e) { message.error(errMsg(e) ?? "删除失败"); }
  };

  return (
    <div style={{ padding: 12 }}>
      {canEdit && (
        <Space style={{ marginBottom: 12 }} wrap>
          <Input
            value={备注} onChange={e => set备注(e.target.value)}
            placeholder="备注(可选,跟随下一张上传的图片)" style={{ width: 280 }} maxLength={200}
          />
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />} loading={uploading}>上传图片</Button>
          </Upload>
          <span style={{ color: "#999" }}>支持 jpg/png/gif/webp/bmp,不超过 {MAX_MB}MB</span>
        </Space>
      )}
      {rows.length === 0 && !loading ? (
        <Empty description="暂无图片备注" />
      ) : (
        <Image.PreviewGroup>
          <Space wrap size={16}>
            {rows.map(n => (
              <div key={n.ID} style={{ width: 140, textAlign: "center" }}>
                <Image src={imageNoteUrl(n)} alt={n.文件名 ?? ""} width={140} height={140}
                  style={{ objectFit: "cover", border: "1px solid #f0f0f0" }} />
                <div style={{ fontSize: 12, color: "#666", marginTop: 4, wordBreak: "break-all" }}>
                  {n.备注 || n.文件名 || ""}
                </div>
                <div style={{ fontSize: 12, color: "#999" }}>
                  {n.上传人} {n.上传时间 ? n.上传时间.slice(0, 10) : ""}
                </div>
                {canEdit && (
                  <Popconfirm title="确认删除该图片?" onConfirm={() => remove(n.ID)}>
                    <Button type="link" danger size="small" icon={<DeleteOutlined />}>删除</Button>
                  </Popconfirm>
                )}
              </div>
            ))}
          </Space>
        </Image.PreviewGroup>
      )}
    </div>
  );
}
