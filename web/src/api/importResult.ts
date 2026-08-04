// Excel 导入统一返回类型(与后端 MasterData.ImportResult 对应)
export interface ImportFailure {
  行号: number;
  物料编号?: string;
  原因: string;
}

export interface ImportResult {
  新增: number;
  跳过: number;
  失败: number;
  失败明细: ImportFailure[];
}
