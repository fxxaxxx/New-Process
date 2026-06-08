// Σ 付款金额
export const sumPay = (lines: { 付款金额: number }[]) =>
  lines.reduce((a, l) => a + Number(l.付款金额 ?? 0), 0);
