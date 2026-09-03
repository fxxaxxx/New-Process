import { api } from "./client";
import type { Paged } from "./master";

// 后端字段首字母大写;已读/读取时间为 '0'/'1' 与日期字符串
export interface MessageRow {
  ID: number;
  接收人?: string;
  类型?: string;
  单号?: string;
  标题?: string;
  内容?: string;
  已读?: string;
  创建时间?: string;
  读取时间?: string | null;
}

// 顶栏铃铛未读数刷新事件:消息页标记已读/审批后 dispatch,MainLayout 监听重拉
export const MSG_REFRESH_EVENT = "erp-msg-refresh";

export const messagesApi = {
  list: (page = 1, size = 20, onlyUnread = false) =>
    api.get<Paged<MessageRow>>("/messages", { params: { onlyUnread, page, size } })
      // 后端按 camelCase 序列化 id，归一化为 ID（行查看/标记已读要用）
      .then(r => ({ ...r.data, items: r.data.items.map(x => ({ ...x, ID: (x as unknown as { id?: number }).id ?? x.ID })) })),
  unreadCount: () => api.get<{ count: number }>("/messages/unread-count").then(r => r.data.count),
  markRead: (id: number) => api.post(`/messages/${id}/read`),
};
