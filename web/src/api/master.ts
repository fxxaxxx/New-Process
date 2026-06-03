import { api } from "./client";

export interface Paged<T> { items: T[]; total: number }

export function masterApi(resource: string) {
  const base = `/master/${resource}`;
  return {
    list: (page = 1, size = 20, keyword = "") =>
      api.get<Paged<Record<string, unknown>>>(base, { params: { page, size, keyword } }).then(r => r.data),
    get: (id: number) => api.get<Record<string, unknown>>(`${base}/${id}`).then(r => r.data),
    create: (body: Record<string, unknown>) => api.post(base, body).then(r => r.data),
    update: (id: number, body: Record<string, unknown>) => api.put(`${base}/${id}`, body).then(r => r.data),
    remove: (id: number) => api.delete(`${base}/${id}`).then(r => r.data),
  };
}
