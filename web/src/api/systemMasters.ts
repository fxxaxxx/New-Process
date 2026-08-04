import { api } from "./client";

export interface Paged<T> { items: T[]; total: number }

// 仓库位置设置(仓库/仓位主数据,物料资料.仓位号 引用)
export interface WarehouseLocation { id: number; 编号?: string; 名称?: string; 备注?: string }
export type WarehouseLocationSave = Omit<WarehouseLocation, "id">;

export const warehouseLocationApi = {
  list: (page: number, size: number, keyword: string) =>
    api.get<Paged<WarehouseLocation>>("/master/warehouse-locations", { params: { page, size, keyword } }).then(r => r.data),
  create: (body: WarehouseLocationSave) =>
    api.post<WarehouseLocation>("/master/warehouse-locations", body).then(r => r.data),
  update: (id: number, body: WarehouseLocationSave) =>
    api.put(`/master/warehouse-locations/${id}`, body),
  remove: (id: number) => api.delete(`/master/warehouse-locations/${id}`),
};

// 啤机机型啤工表(工模表.啤机机型 引用)
export interface InjectionMachineRate { id: number; 啤机机型?: string; 啤工价?: number | null; 备注?: string }
export type InjectionMachineRateSave = Omit<InjectionMachineRate, "id">;

export const injectionMachineRateApi = {
  list: (page: number, size: number, keyword: string) =>
    api.get<Paged<InjectionMachineRate>>("/master/injection-machine-rates", { params: { page, size, keyword } }).then(r => r.data),
  create: (body: InjectionMachineRateSave) =>
    api.post<InjectionMachineRate>("/master/injection-machine-rates", body).then(r => r.data),
  update: (id: number, body: InjectionMachineRateSave) =>
    api.put(`/master/injection-machine-rates/${id}`, body),
  remove: (id: number) => api.delete(`/master/injection-machine-rates/${id}`),
};
