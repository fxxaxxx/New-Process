import type { MaterialRow } from "../api/materialMaster";

export const AUXILIARY_ISSUE_CATEGORY = "辅料资料";
export const AUXILIARY_ISSUE_WAREHOUSE = "辅料仓库";
export const AUXILIARY_ISSUE_DEFAULT_REMARK = "生产领料";

export interface AuxiliaryIssueLine {
  key: number;
  序号: number;
  装配生产单号?: string;
  开单日期?: string;
  辅料编号?: string;
  辅料名称?: string;
  规格?: string;
  颜色?: string;
  每单位数值?: string;
  单位?: string;
  数量?: number | null;
  单价?: number | null;
  备注?: string;
}

export interface AuxiliaryIssuePayloadInput {
  department?: string;
  issuePerson?: string;
  date?: string;
  note?: string;
  issueRemark?: string;
  lines: AuxiliaryIssueLine[];
}

export interface AuxiliaryIssuePayload {
  领料部门?: string;
  领料人?: string;
  日期?: string;
  仓库: string;
  备注?: string;
  明细: {
    物料编号: string;
    物料名称?: string;
    物料类别: string;
    规格?: string;
    颜色?: string;
    单位?: string;
    数量: number;
    单价?: number;
    金额?: number;
    备注?: string;
    生产单号?: string;
  }[];
}

export interface AuxiliaryReturnPayloadInput {
  department?: string;
  returnPerson?: string;
  date?: string;
  note?: string;
  lines: AuxiliaryIssueLine[];
}

export interface AuxiliaryReturnPayload {
  退料部门?: string;
  退料人?: string;
  日期?: string;
  仓库: string;
  备注?: string;
  明细: AuxiliaryIssuePayload["明细"];
}

export interface AuxiliaryStocktakeLine {
  key: number;
  序号: number;
  辅料编号?: string;
  辅料名称?: string;
  规格?: string;
  单位?: string;
  系统数量?: number | null;
  盘点数量?: number | null;
  盈亏数量?: number | null;
  备注?: string;
}

export interface AuxiliaryStocktakePayloadInput {
  date?: string;
  note?: string;
  lines: AuxiliaryStocktakeLine[];
}

export interface AuxiliaryStocktakePayload {
  日期?: string;
  仓库: string;
  备注?: string;
  明细: {
    物料编号: string;
    物料名称?: string;
    规格?: string;
    单位?: string;
    系统数量: number;
    盘点数量: number;
  }[];
}

const clean = (value?: string | null) => {
  const text = String(value ?? "").trim();
  return text || undefined;
};

const num = (value?: number | null) => Number(value ?? 0);

export function createAuxiliaryIssueLines(count = 20): AuxiliaryIssueLine[] {
  return Array.from({ length: count }, (_, i) => ({
    key: i + 1,
    序号: i + 1,
    数量: 0,
    备注: "",
  }));
}

export function createAuxiliaryStocktakeLines(count = 20): AuxiliaryStocktakeLine[] {
  return Array.from({ length: count }, (_, i) => ({
    key: i + 1,
    序号: i + 1,
    系统数量: 0,
    盘点数量: 0,
    盈亏数量: 0,
    备注: "",
  }));
}

export function applyAuxiliaryIssueMaterialToLine(
  line: AuxiliaryIssueLine,
  material: MaterialRow,
): AuxiliaryIssueLine {
  return {
    ...line,
    辅料编号: clean(material.物料编号),
    辅料名称: clean(material.物料名称),
    规格: clean(material.规格),
    颜色: clean(material.颜色),
    每单位数值: clean(material.码换算),
    单位: clean(material.单位),
    单价: material.单价 ?? line.单价 ?? undefined,
    数量: line.数量 ?? 0,
    备注: line.备注 ?? "",
  };
}

export function applyAuxiliaryStocktakeMaterialToLine(
  line: AuxiliaryStocktakeLine,
  material: MaterialRow,
): AuxiliaryStocktakeLine {
  const 系统数量 = num(line.系统数量);
  const 盘点数量 = num(line.盘点数量);
  return {
    ...line,
    辅料编号: clean(material.物料编号),
    辅料名称: clean(material.物料名称),
    规格: clean(material.规格),
    单位: clean(material.单位),
    系统数量,
    盘点数量,
    盈亏数量: 盘点数量 - 系统数量,
    备注: line.备注 ?? "",
  };
}

export function isAuxiliaryIssueLineBlank(line: AuxiliaryIssueLine) {
  return !clean(line.装配生产单号)
    && !clean(line.开单日期)
    && !clean(line.辅料编号)
    && !clean(line.辅料名称)
    && !clean(line.规格)
    && !clean(line.单位)
    && num(line.数量) === 0
    && !clean(line.备注);
}

export function isAuxiliaryStocktakeLineBlank(line: AuxiliaryStocktakeLine) {
  return !clean(line.辅料编号)
    && !clean(line.辅料名称)
    && !clean(line.规格)
    && !clean(line.单位)
    && num(line.系统数量) === 0
    && num(line.盘点数量) === 0
    && !clean(line.备注);
}

export function compactAuxiliaryIssueLines(lines: AuxiliaryIssueLine[]) {
  return lines
    .filter(line => !isAuxiliaryIssueLineBlank(line))
    .map((line, index) => ({ ...line, key: index + 1, 序号: index + 1 }));
}

export function compactAuxiliaryStocktakeLines(lines: AuxiliaryStocktakeLine[]) {
  return lines
    .filter(line => !isAuxiliaryStocktakeLineBlank(line))
    .map((line, index) => ({ ...line, key: index + 1, 序号: index + 1 }));
}

export function summarizeAuxiliaryIssueLines(lines: AuxiliaryIssueLine[]) {
  return lines.reduce(
    (acc, line) => {
      if (!clean(line.辅料编号)) return acc;
      const quantity = num(line.数量);
      acc.数量 += quantity;
      acc.金额 += quantity * num(line.单价);
      return acc;
    },
    { 数量: 0, 金额: 0 },
  );
}

export function summarizeAuxiliaryStocktakeLines(lines: AuxiliaryStocktakeLine[]) {
  return lines.reduce(
    (acc, line) => {
      if (!clean(line.辅料编号)) return acc;
      const 系统数量 = num(line.系统数量);
      const 盘点数量 = num(line.盘点数量);
      acc.系统数量 += 系统数量;
      acc.盘点数量 += 盘点数量;
      acc.盈亏数量 += 盘点数量 - 系统数量;
      return acc;
    },
    { 系统数量: 0, 盘点数量: 0, 盈亏数量: 0 },
  );
}

export function buildAuxiliaryIssuePayload(input: AuxiliaryIssuePayloadInput): AuxiliaryIssuePayload {
  const detail = input.lines
    .filter(line => clean(line.辅料编号) && num(line.数量) > 0)
    .map(line => {
      const quantity = num(line.数量);
      const price = line.单价 ?? undefined;
      return {
        物料编号: clean(line.辅料编号)!,
        物料名称: clean(line.辅料名称),
        物料类别: AUXILIARY_ISSUE_CATEGORY,
        规格: clean(line.规格),
        颜色: clean(line.颜色),
        单位: clean(line.单位),
        数量: quantity,
        单价: price,
        金额: price === undefined ? undefined : quantity * price,
        备注: clean(line.备注),
        生产单号: clean(line.装配生产单号),
      };
    });

  return {
    领料部门: clean(input.department),
    领料人: clean(input.issuePerson),
    日期: clean(input.date),
    仓库: AUXILIARY_ISSUE_WAREHOUSE,
    备注: clean(input.note) ?? clean(input.issueRemark) ?? AUXILIARY_ISSUE_DEFAULT_REMARK,
    明细: detail,
  };
}

export function buildAuxiliaryReturnPayload(input: AuxiliaryReturnPayloadInput): AuxiliaryReturnPayload {
  const issuePayload = buildAuxiliaryIssuePayload({
    department: input.department,
    issuePerson: input.returnPerson,
    date: input.date,
    note: input.note,
    lines: input.lines,
  });

  return {
    退料部门: issuePayload.领料部门,
    退料人: issuePayload.领料人,
    日期: issuePayload.日期,
    仓库: AUXILIARY_ISSUE_WAREHOUSE,
    备注: issuePayload.备注,
    明细: issuePayload.明细,
  };
}

export function buildAuxiliaryStocktakePayload(input: AuxiliaryStocktakePayloadInput): AuxiliaryStocktakePayload {
  const detail = input.lines
    .filter(line => clean(line.辅料编号))
    .map(line => ({
      物料编号: clean(line.辅料编号)!,
      物料名称: clean(line.辅料名称),
      规格: clean(line.规格),
      单位: clean(line.单位),
      系统数量: num(line.系统数量),
      盘点数量: num(line.盘点数量),
    }));

  return {
    日期: clean(input.date),
    仓库: AUXILIARY_ISSUE_WAREHOUSE,
    备注: clean(input.note),
    明细: detail,
  };
}
