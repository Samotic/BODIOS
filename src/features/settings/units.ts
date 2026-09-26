/**
 * Weights are always stored in kilograms. These helpers convert only for
 * display and input, so switching units never changes saved values.
 */
export type WeightUnit = 'kg' | 'lb';

export const KG_PER_LB = 0.45359237;

export function kgToUnit(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? kg : kg / KG_PER_LB;
}

export function unitToKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value * KG_PER_LB;
}

/** Rounded for display: up to 2 decimals, no trailing zeros ("12.5", "27.56"). */
export function formatWeightNumber(kg: number, unit: WeightUnit): string {
  const value = kgToUnit(kg, unit);
  return String(Math.round(value * 100) / 100);
}

export function formatWeight(kg: number, unit: WeightUnit): string {
  return `${formatWeightNumber(kg, unit)} ${unit}`;
}
