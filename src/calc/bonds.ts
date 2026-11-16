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
  // Fail closed: invalid observations must not silently become a published NaN/Infinity.
  for (const point of curve) {
    if (!Number.isFinite(point.timeYears) || point.timeYears < 0 ||
        !Number.isFinite(point.zeroRate) || point.zeroRate <= -1) {
      throw new Error('Point de courbe invalide');
    }
  }
  // Conflicting observations for one maturity are ambiguous financial inputs.
  // Preserve identical duplicates and the caller-owned curve ordering.
  const ratesByTenor = new Map<number, number>();
  for (const point of curve) {
    const previous = ratesByTenor.get(point.timeYears);
    if (previous !== undefined && previous !== point.zeroRate) {
      throw new Error('Taux contradictoires pour une même échéance');
    }
    ratesByTenor.set(point.timeYears, point.zeroRate);
  }
  return cashflows.reduce((price, cashflow) => {
    if (!Number.isFinite(cashflow.timeYears) || cashflow.timeYears < 0) {
      throw new Error('Flux antérieur ou échéance invalide');
    }
    if (!Number.isFinite(cashflow.amount)) throw new Error('Montant de flux invalide');
    const rate = interpolateRate(curve, cashflow.timeYears);
    if (!Number.isFinite(rate) || rate <= -1) throw new Error('Taux interpolé invalide');
    const discounted = cashflow.amount / ((1 + rate) ** cashflow.timeYears);
    const total = price + discounted;
    if (!Number.isFinite(total)) throw new Error('Valorisation obligataire non finie');
    return total;
  }, 0);
}

export function bondTotalReturn(input: {
  previousDirtyPrice: number;
  currentDirtyPrice: number;
  cashflowsReceived?: number;
}): number {
  if (!Number.isFinite(input.previousDirtyPrice) || input.previousDirtyPrice <= 0) {
    throw new Error('Prix sale précédent invalide');
  }
  if (!Number.isFinite(input.currentDirtyPrice) || input.currentDirtyPrice < 0) {
    throw new Error('Prix sale courant invalide');
  }
  const cashflows = input.cashflowsReceived ?? 0;
  if (!Number.isFinite(cashflows)) throw new Error('Flux reçu invalide');
  const numerator = input.currentDirtyPrice + cashflows;
  // Preserve the original formula for ordinary inputs. If finite components
  // overflow only during addition, divide first to recover a finite return.
  const totalReturn = Number.isFinite(numerator)
    ? numerator / input.previousDirtyPrice - 1
    : input.currentDirtyPrice / input.previousDirtyPrice + cashflows / input.previousDirtyPrice - 1;
  if (!Number.isFinite(totalReturn)) throw new Error('Rendement obligataire non fini');
  return totalReturn;
}
