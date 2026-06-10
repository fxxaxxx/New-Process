import { useState } from "react";
import {
  Button, Card, Input, InputNumber, Result, Space, Table, Tag, message,
} from "antd";
import { PlusOutlined, SaveOutlined } from "@ant-design/icons";
import { stylesApi, type StyleMaterial } from "../../api/styles";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "款号资料";

function errMsg(e: unknown, fallback: string) {
  return (e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? fallback;
}

// BOM物料设置：输入款号带出款式 + 物料明细整组编辑后一次保存（整组替换）
export default function BomSetupPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const canSave = can(perms, MENU, "保存");

  const [款号, set款号] = useState("");
  const [loaded款号, setLoaded款号] = useState("");
  const [款式, set款式] = useState("");
  const [rows, setRows] = useState<StyleMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!canOpen) {
    return <Result status="403" title="无权限" subTitle="您没有打开「款号资料」的权限。" />;
  }

  const load = async (k: string) => {
    const key = k.trim();
    if (!key) return;
    setLoading(true);
    try {
      const full = await stylesApi.full(key);
      setLoaded款号(key);
      set款式(String(full.主档.款式 ?? ""));
      setRows((full.物料 ?? []).map(m => ({
        物料编号: m.物料编号 ?? null,
        物料名称: m.物料名称 ?? null,
        物料类别: (m.物料类别 as string | undefined) ?? null,
        规格: (m.规格 as string | undefined) ?? null,
        颜色: (m.颜色 as string | undefined) ?? null,
        单位: m.单位 ?? null,
        使用数量: m.使用数量 ?? null,
      })));
    } catch (e) {
      setLoaded款号(""); set款式(""); setRows([]);
      message.error(errMsg(e, "款号不存在或加载失败"));
    } finally {
      setLoading(false);
    }
  };

  const set = (i: number, k: keyof StyleMaterial, v: string | number | null) =>
    setRows(prev => prev.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  const save = async () => {
    if (!loaded款号) return;
    setSaving(true);
    try {
      await stylesApi.saveMaterials(loaded款号, rows.filter(r => r.物料编号));
      message.success("BOM物料已保存");
      await load(loaded款号);
    } catch (e) {
      message.error(errMsg(e, "保存失败，请重试"));
    } finally {
      setSaving(false);
    }
  };

  const textCol = (key: keyof StyleMaterial, title: string) => ({
    title,
    render: (_v: unknown, _r: StyleMaterial, i: number) => (
      <Input value={(rows[i][key] as string) ?? ""} onChange={e => set(i, key, e.target.value)} />
    ),
  });

  return (
    <Card
      variant="borderless"
      title="BOM物料设置"
    >
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="输入款号回车带出"
          allowClear
          style={{ width: 280 }}
          value={款号}
          loading={loading}
          onChange={e => set款号(e.target.value)}
          onSearch={load}
        />
        {loaded款号 && (
          <Tag color="blue" style={{ borderRadius: 6 }}>款式：{款式 || "-"}</Tag>
        )}
      </Space>

      {loaded款号 && (
        <>
          <Table
            size="small"
            rowKey={(_r, i) => String(i)}
            pagination={false}
            dataSource={rows}
            columns={[
              { title: "序号", width: 60, render: (_v, _r, i) => i + 1 },
              textCol("物料编号", "物料编号"),
              textCol("物料名称", "物料名称"),
              textCol("物料类别", "材料"),
              textCol("规格", "规格"),
              textCol("颜色", "颜色"),
              textCol("单位", "单位"),
              {
                title: "用量",
                width: 120,
                render: (_v: unknown, _r: StyleMaterial, i: number) => (
                  <InputNumber
                    style={{ width: "100%" }}
                    value={rows[i].使用数量 ?? undefined}
                    onChange={v => set(i, "使用数量", v ?? null)}
                  />
                ),
              },
              {
                title: "操作",
                width: 70,
                render: (_v: unknown, _r: StyleMaterial, i: number) => (
                  <a onClick={() => setRows(prev => prev.filter((_, j) => j !== i))}>删除</a>
                ),
              },
            ]}
          />
          <Space style={{ marginTop: 12 }}>
            <Button
              icon={<PlusOutlined />}
              onClick={() => setRows(prev => [...prev, {}])}
            >
              添加行
            </Button>
            {canSave && (
              <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>
                保存
              </Button>
            )}
          </Space>
        </>
      )}
    </Card>
  );
}
