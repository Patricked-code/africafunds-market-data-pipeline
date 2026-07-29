export function toIsoDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Date invalide: ${value}`);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(from: Date | string, to: Date | string): number {
  const a = new Date(`${toIsoDate(from)}T00:00:00Z`).getTime();
  const b = new Date(`${toIsoDate(to)}T00:00:00Z`).getTime();
  return Math.floor((b - a) / 86_400_000);
}

export type MaturityBucket = 'MONEY_MARKET' | 'BOND_CT' | 'BOND_MT' | 'BOND_LT';

export function maturityBucket(remainingDays: number): MaturityBucket {
  if (!Number.isFinite(remainingDays) || remainingDays < 0) throw new Error('remainingDays doit être positif');
  if (remainingDays <= 365) return 'MONEY_MARKET';
  if (remainingDays <= 1_095) return 'BOND_CT';
  if (remainingDays <= 2_555) return 'BOND_MT';
  return 'BOND_LT';
}
