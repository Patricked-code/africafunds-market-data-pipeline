export function nextIndexLevel(previousLevel: number, dailyReturn: number): number {
  if (!Number.isFinite(previousLevel) || previousLevel <= 0) throw new Error('Niveau précédent invalide');
  if (!Number.isFinite(dailyReturn) || dailyReturn <= -1) throw new Error('Rendement journalier invalide');
  return previousLevel * (1 + dailyReturn);
}

export function meanReturn(returns: number[]): number {
  const valid = returns.filter(Number.isFinite);
  if (!valid.length) throw new Error('Aucun rendement valide');
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

export function weightedReturn(components: Array<{ value: number; weight: number }>): number {
  const valid = components.filter((item) => Number.isFinite(item.value) && Number.isFinite(item.weight) && item.weight > 0);
  const totalWeight = valid.reduce((sum, item) => sum + item.weight, 0);
  if (!totalWeight) throw new Error('Aucun poids valide');
  return valid.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight;
}

export function capitaliseAnnualRate(input: {
  previousLevel: number;
  annualRate: number;
  elapsedDays: number;
  dayCountBasis?: 360 | 365;
}): number {
  const basis = input.dayCountBasis ?? 360;
  if (input.elapsedDays < 0) throw new Error('Nombre de jours invalide');
  return input.previousLevel * (1 + input.annualRate * input.elapsedDays / basis);
}

export function realReturn(nominalReturn: number, inflationReturn: number): number {
  if (inflationReturn <= -1) throw new Error('Inflation invalide');
  return (1 + nominalReturn) / (1 + inflationReturn) - 1;
}

export function convertReturn(input: {
  localReturn: number;
  fxToday: number;
  fxPrevious: number;
}): number {
  if (input.fxToday <= 0 || input.fxPrevious <= 0) throw new Error('Taux de change invalide');
  return (1 + input.localReturn) * (input.fxToday / input.fxPrevious) - 1;
}
