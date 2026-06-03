import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../api/client";
import type { PermMap } from "./permissions";

const Ctx = createContext<PermMap>({});
export const usePerms = () => useContext(Ctx);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [map, setMap] = useState<PermMap>({});
  useEffect(() => {
    api.get<PermMap>("/auth/me/permissions").then((r) => setMap(r.data)).catch(() => setMap({}));
  }, []);
  return <Ctx.Provider value={map}>{children}</Ctx.Provider>;
}
