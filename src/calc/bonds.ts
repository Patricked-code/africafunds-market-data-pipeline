export interface Cashflow {
  timeYears: number;
  amount: number;
}

export interface CurvePoint {
  timeYears: number;
  zeroRate: number;
}

function interpolateRate(curve: CurvePoint[], timeYears: number): number {
  const sorted = [...curve].sort((a, b) => a.timeYears - b.timeYears);
  if (!sorted.length) throw new Error('Courbe vide');
  if (timeYears <= sorted[0]!.timeYears) return sorted[0]!.zeroRate;
  if (timeYears >= sorted.at(-1)!.timeYears) return sorted.at(-1)!.zeroRate;
  for (let i = 1; i < sorted.length; i += 1) {
    const left = sorted[i - 1]!;
    const right = sorted[i]!;
    if (timeYears <= right.timeYears) {
      const ratio = (timeYears - left.timeYears) / (right.timeYears - left.timeYears);
      return left.zeroRate + ratio * (right.zeroRate - left.zeroRate);
    }
  }
  return sorted.at(-1)!.zeroRate;
}

export function priceCashflows(cashflows: Cashflow[], curve: CurvePoint[]): number {
  return cashflows.reduce((price, cashflow) => {
    if (cashflow.timeYears < 0) throw new Error('Flux antérieur à la date de valorisation');
    const rate = interpolateRate(curve, cashflow.timeYears);
    return price + cashflow.amount / ((1 + rate) ** cashflow.timeYears);
  }, 0);
}

export function bondTotalReturn(input: {
  previousDirtyPrice: number;
  currentDirtyPrice: number;
  cashflowsReceived?: number;
}): number {
  if (input.previousDirtyPrice <= 0) throw new Error('Prix sale précédent invalide');
  return (input.currentDirtyPrice + (input.cashflowsReceived ?? 0)) / input.previousDirtyPrice - 1;
}
