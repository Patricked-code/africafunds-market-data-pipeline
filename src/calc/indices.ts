function requireFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new Error(`${label} invalide (non fini)`);
}

export function nextIndexLevel(previousLevel: number, dailyReturn: number): number {
  if (!Number.isFinite(previousLevel) || previousLevel <= 0) throw new Error('Niveau précédent invalide');
  if (!Number.isFinite(dailyReturn) || dailyReturn <= -1) throw new Error('Rendement journalier invalide');
  const result = previousLevel * (1 + dailyReturn);
  requireFinite(result, 'Niveau calculé');
  if (result <= 0) throw new Error('Niveau calculé invalide (non positif)');
  return result;
}

export function meanReturn(returns: number[]): number {
  const valid = returns.filter(Number.isFinite);
  if (!valid.length) throw new Error('Aucun rendement valide');
  const total = valid.reduce((sum, value) => sum + value, 0);
  requireFinite(total, 'Somme des rendements');
  const result = total / valid.length;
  requireFinite(result, 'Rendement moyen');
  return result;
}

export function weightedReturn(components: Array<{ value: number; weight: number }>): number {
  const valid = components.filter((item) => Number.isFinite(item.value) && Number.isFinite(item.weight) && item.weight > 0);
  const totalWeight = valid.reduce((sum, item) => sum + item.weight, 0);
  if (!totalWeight) throw new Error('Aucun poids valide');
  requireFinite(totalWeight, 'Somme des poids');
  const numerator = valid.reduce((sum, item) => sum + item.value * item.weight, 0);
  requireFinite(numerator, 'Somme pondérée');
  const result = numerator / totalWeight;
  requireFinite(result, 'Rendement pondéré');
  return result;
}

export function capitaliseAnnualRate(input: {
  previousLevel: number;
  annualRate: number;
  elapsedDays: number;
  dayCountBasis?: 360 | 365;
}): number {
  const basis = input.dayCountBasis ?? 360;
  requireFinite(input.previousLevel, 'Niveau précédent');
  requireFinite(input.annualRate, 'Taux annuel');
  requireFinite(input.elapsedDays, 'Nombre de jours');
  if (input.previousLevel <= 0) throw new Error('Niveau précédent invalide');
  if (input.elapsedDays < 0) throw new Error('Nombre de jours invalide');
  const result = input.previousLevel * (1 + input.annualRate * input.elapsedDays / basis);
  requireFinite(result, 'Niveau capitalisé');
  if (result <= 0) throw new Error('Niveau capitalisé invalide (non positif)');
  return result;
}

export function realReturn(nominalReturn: number, inflationReturn: number): number {
  requireFinite(nominalReturn, 'Rendement nominal');
  requireFinite(inflationReturn, 'Inflation');
  if (inflationReturn <= -1) throw new Error('Inflation invalide');
  const result = (1 + nominalReturn) / (1 + inflationReturn) - 1;
  requireFinite(result, 'Rendement réel');
  return result;
}

export function convertReturn(input: {
  localReturn: number;
  fxToday: number;
  fxPrevious: number;
}): number {
  requireFinite(input.localReturn, 'Rendement local');
  if (input.localReturn < -1) throw new Error('Rendement local invalide (inférieur à -100 %)');
  requireFinite(input.fxToday, 'Taux de change courant');
  requireFinite(input.fxPrevious, 'Taux de change précédent');
  if (input.fxToday <= 0 || input.fxPrevious <= 0) throw new Error('Taux de change invalide');
  const fxRatio = input.fxToday / input.fxPrevious;
  requireFinite(fxRatio, 'Rapport de change');
  if (fxRatio <= 0) throw new Error('Rapport de change invalide (non positif)');
  const grossReturn = (1 + input.localReturn) * fxRatio;
  requireFinite(grossReturn, 'Facteur de rendement converti');
  if (input.localReturn > -1 && grossReturn <= 0) {
    throw new Error('Facteur de rendement converti invalide (non positif)');
  }
  const result = grossReturn - 1;
  requireFinite(result, 'Rendement converti');
  return result;
}
