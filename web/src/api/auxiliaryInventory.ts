import { api } from "./client";
import type { MaterialStockRow } from "./materialInventory";

export const auxiliaryInventoryApi = {
  list: (keyword?: string) =>
    api.get<MaterialStockRow[]>("/auxiliary-inventory", { params: { keyword } }).then(r => r.data),
};
