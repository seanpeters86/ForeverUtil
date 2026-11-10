export const STATS = [
  { key: 'expertise', label: 'Expertise Rating', weight: 2.32, ids: [37] },
  { key: 'agility', label: 'Agility', weight: 1.70, ids: [3] },
  { key: 'crit', label: 'Crit Rating', weight: 1.26, ids: [19, 32] },
  { key: 'strength', label: 'Strength', weight: 1.00, ids: [4] },
  { key: 'attackPower', label: 'Attack Power', weight: 1.00, ids: [38] },
  { key: 'hit', label: 'Hit Rating', weight: 0.82, ids: [16, 31] },
  { key: 'haste', label: 'Haste Rating', weight: 0.78, ids: [28, 36] },
  { key: 'spellPenetration', label: 'Spell Piercing', weight: 0.19, ids: [47] },
  { key: 'armorPenetration', label: 'Armor Penetration', weight: 0.13, ids: [44] },
  { key: 'stamina', label: 'Stamina', weight: 0.01, ids: [7] },
] as const;

export type StatKey = typeof STATS[number]['key'];
export type StatValues = Record<StatKey, number>;
export type WeaponHand = 'mainHand' | 'offHand';
export type WeaponWeights = Record<WeaponHand, number>;
export type WeaponData = { dps: number; speed: number | null };
export type WeaponType = 'axe' | 'mace' | 'sword' | 'fist' | 'dagger';

export function parseTooltipWeaponType(tooltip: string): WeaponType | null {
  const subtype = tooltip.match(/<!--scstart2:(\d+)-->/)?.[1];
  const types: Record<string, WeaponType> = { '0': 'axe', '4': 'mace', '7': 'sword', '13': 'fist', '15': 'dagger' };
  return subtype === undefined ? null : types[subtype] ?? null;
}

export function parseTooltipWeaponDamage(tooltip: string): { min: number; max: number } | null {
  const match = tooltip.match(/<!--dmg-->\s*([\d,]+(?:\.\d+)?)\s*-\s*([\d,]+(?:\.\d+)?)\s+Damage\b/i);
  if (!match?.[1] || !match[2]) return null;
  const min = Number(match[1].replaceAll(',', ''));
  const max = Number(match[2].replaceAll(',', ''));
  return Number.isFinite(min) && Number.isFinite(max) && min > 0 && max >= min ? { min, max } : null;
}

export const defaultWeaponWeights = (): WeaponWeights => ({ mainHand: 9.81, offHand: 1.92 });

export const defaultWeights = (): StatValues => Object.fromEntries(STATS.map(stat => [stat.key, stat.weight])) as StatValues;
export const emptyStats = (): StatValues => Object.fromEntries(STATS.map(stat => [stat.key, 0])) as StatValues;

export function scoreItem(stats: StatValues, weights: StatValues, weaponDps = 0, weaponWeight = 0): number {
  return STATS.reduce((total, stat) => total + (Number(stats[stat.key]) || 0) * (Number(weights[stat.key]) || 0), 0) + weaponDps * weaponWeight;
}

export function parseTooltipWeapon(tooltip: string): WeaponData | null | undefined {
  const subclass = tooltip.match(/<!--scstart2:(\d+)-->/)?.[1];
  const dps = tooltip.match(/<!--dps-->\s*\(\s*([\d.,]+)\s+damage per second/i)?.[1];
  if (!subclass) return dps ? undefined : null;
  if (![0, 1, 4, 5, 6, 7, 8, 10, 13, 15].includes(Number(subclass))) return undefined;
  if (!dps) return undefined;
  const value = Number(dps.replaceAll(',', ''));
  if (!Number.isFinite(value) || value <= 0) return undefined;
  const speedText = tooltip.match(/<!--spd-->\s*([\d.]+)/)?.[1];
  const speed = speedText ? Number(speedText) : null;
  return { dps: value, speed: speed && Number.isFinite(speed) ? speed : null };
}

export function compareScores(equipped: number, candidate: number): { winner: 0 | 1 | null; difference: number } {
  const difference = Number((Number(candidate.toFixed(2)) - Number(equipped.toFixed(2))).toFixed(2));
  return { winner: difference === 0 ? null : difference > 0 ? 1 : 0, difference: Math.abs(difference) };
}

export type ItemReference = { id: string; bonus?: string };

export function itemReferenceFromInput(input: string): ItemReference | null {
  const value = input.trim();
  if (/^\d+$/.test(value) && Number(value) > 0) return { id: value };
  try {
    const url = new URL(value);
    if (!/(^|\.)wowhead\.com$/i.test(url.hostname)) return null;
    const id = url.pathname.match(/\/item[=/](?:[^/]*-)?(\d+)(?:\/|$)/i)?.[1];
    const bonus = url.searchParams.get('bonus');
    if (!id || Number(id) <= 0 || (bonus !== null && !/^\d+(?::\d+)*$/.test(bonus))) return null;
    return bonus ? { id, bonus } : { id };
  } catch {
    return null;
  }
}

export function itemIdFromInput(input: string): string | null {
  return itemReferenceFromInput(input)?.id ?? null;
}

export function parseTooltipStats(tooltip: string): StatValues {
  const stats = emptyStats();
  const markers = /<!--(?:stat|rtg)(\d+)-->\s*([+-]?[\d,]+(?:\.\d+)?)/g;
  for (const match of tooltip.matchAll(markers)) {
    const stat = STATS.find(entry => (entry.ids as readonly number[]).includes(Number(match[1])));
    if (stat && match[2]) stats[stat.key] += Number(match[2].replaceAll(',', ''));
  }
  return stats;
}