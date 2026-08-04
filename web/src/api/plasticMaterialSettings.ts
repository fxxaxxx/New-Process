import { api } from "./client";
import type { Paged } from "./master";

export interface PlasticMaterialSettingRow {
  ID?: number | null;
  物料编号: string;
  物料名称?: string | null;
  规格?: string | null;
  单位?: string | null;
  默认仓库?: string | null;
  损耗率?: number | null;
  备注?: string | null;
  操作员?: string | null;
  更新时间?: string | null;
}

export interface PlasticMaterialSettingSave {
  默认仓库?: string | null;
  损耗率?: number | null;
  备注?: string | null;
}

const base = "/plastic-material-settings";
const enc = encodeURIComponent;

export const plasticMaterialSettingsApi = {
  list: (page = 1, size = 20, keyword = "") =>
    api.get<Paged<PlasticMaterialSettingRow>>(base, { params: { page, size, keyword } })
      // 后端按 camelCase 序列化为 id，这里归一化为 ID（页面据此判断"已设置"）
      .then(r => ({ ...r.data, items: r.data.items.map(x => ({ ...x, ID: (x as unknown as { id?: number }).id ?? x.ID })) })),
  // 下游单据预填用(任何登录用户可读), 未设置返回 404
  lookup: (物料编号: string) =>
    api.get<PlasticMaterialSettingLookup>(`${base}/lookup/${enc(物料编号)}`).then(r => r.data),
  save: (物料编号: string, body: PlasticMaterialSettingSave) =>
    api.put<PlasticMaterialSettingRow>(`${base}/${enc(物料编号)}`, body).then(r => r.data),
  remove: (物料编号: string) => api.delete(`${base}/${enc(物料编号)}`),
};

export interface PlasticMaterialSettingLookup {
  物料编号: string;
  默认仓库?: string | null;
  损耗率?: number | null;
}
