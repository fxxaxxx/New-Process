import { api } from "./client";

// 图片备注元数据(对应后端 ImageNoteDto);文件经 /uploads/... 静态路径访问
export interface ImageNote {
  ID: number;
  模块: string;
  单号: string;
  文件名?: string | null;
  存储路径?: string | null;
  备注?: string | null;
  上传人?: string | null;
  上传时间?: string | null;
}

export const imageNoteApi = {
  async list(模块: string, 单号: string): Promise<ImageNote[]> {
    const { data } = await api.get("/image-notes", { params: { 模块, 单号 } });
    return data as ImageNote[];
  },
  async upload(模块: string, 单号: string, file: File, 备注?: string): Promise<ImageNote> {
    const fd = new FormData();
    fd.append("模块", 模块);
    fd.append("单号", 单号);
    if (备注) fd.append("备注", 备注);
    fd.append("file", file);
    const { data } = await api.post("/image-notes", fd);
    return data as ImageNote;
  },
  async remove(id: number): Promise<void> {
    await api.delete(`/image-notes/${id}`);
  },
};

// 静态文件在站点根 /uploads 下(api 在 /api 下),dev 由 vite proxy 转发
export const imageNoteUrl = (n: ImageNote) => `/${n.存储路径 ?? ""}`;
