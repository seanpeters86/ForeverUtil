import { parseTooltipStats, parseTooltipWeapon, parseTooltipWeaponDamage, parseTooltipWeaponType, scoreItem } from './compare.ts';
import type { ItemReference, StatValues, WeaponType, WeaponWeights } from './compare.ts';

export const GEAR_SLOTS = ['head', 'neck', 'shoulder', 'back', 'chest', 'shirt', 'tabard', 'wrist', 'hands', 'waist', 'legs', 'feet', 'finger1', 'finger2', 'trinket1', 'trinket2', 'main_hand', 'off_hand', 'ranged'] as const;
export type GearSlot = typeof GEAR_SLOTS[number];
export type SimcItem = ItemReference & { slot: GearSlot; name: string; equipped: boolean; modifiers: string[] };
export type ItemGroup = 'weapons' | 'finger' | 'trinket' | Exclude<GearSlot, 'main_hand' | 'off_hand' | 'finger1' | 'finger2' | 'trinket1' | 'trinket2'>;
export type HandUse = 'both' | 'main' | 'off' | 'two' | 'unknown';

export function slotGroup(slot: GearSlot): ItemGroup {
  if (slot === 'main_hand' || slot === 'off_hand') return 'weapons';
  if (slot === 'finger1' || slot === 'finger2') return 'finger';
  if (slot === 'trinket1' || slot === 'trinket2') return 'trinket';
  return slot;
}

export function tooltipSlot(tooltip: string): { group: ItemGroup; hand: HandUse } | null {
  const label = tooltip.match(/<td[^>]*>\s*(Head|Neck|Shoulder|Back|Chest|Shirt|Tabard|Wrist|Hands|Waist|Legs|Feet|Finger|Trinket|Main Hand|Off Hand|One-Hand|Two-Hand|Ranged|Ranged Right|Thrown|Held In Off-hand)\s*<\/td>/i)?.[1]?.toLowerCase();
  if (!label) return null;
  if (label === 'main hand') return { group: 'weapons', hand: 'main' };
  if (label === 'off hand') return { group: 'weapons', hand: 'off' };
  if (label === 'one-hand') return { group: 'weapons', hand: 'both' };
  if (label === 'two-hand') return { group: 'weapons', hand: 'two' };
  if (label === 'held in off-hand') return { group: 'weapons', hand: 'unknown' };
  if (label === 'ranged right' || label === 'thrown') return { group: 'ranged', hand: 'unknown' };
  return { group: label as ItemGroup, hand: 'unknown' };
}

export function bonusChangesItem(tooltip: string, baseTooltip: string): boolean {
  const name = (value: string) => value.match(/<!--nstart-->\s*<b[^>]*>(.*?)<\/b>/i)?.[1];
  return name(tooltip) !== name(baseTooltip) || JSON.stringify(parseTooltipStats(tooltip)) !== JSON.stringify(parseTooltipStats(baseTooltip)) || JSON.stringify(parseTooltipWeapon(tooltip)) !== JSON.stringify(parseTooltipWeapon(baseTooltip)) || parseTooltipWeaponType(tooltip) !== parseTooltipWeaponType(baseTooltip) || JSON.stringify(parseTooltipWeaponDamage(tooltip)) !== JSON.stringify(parseTooltipWeaponDamage(baseTooltip));
}

export type RankedWeapon = { hand: HandUse; stats: StatValues; dps: number; key: number };
export function bestWeaponPair(items: RankedWeapon[], weights: StatValues, weaponWeights: WeaponWeights): { main: number; off: number; score: number } | null {
  let best: { main: number; off: number; score: number } | null = null;
  for (const main of items) for (const off of items) {
    if (main.key === off.key || !['main', 'both'].includes(main.hand) || !['off', 'both'].includes(off.hand)) continue;
    const score = scoreItem(main.stats, weights, main.dps, weaponWeights.mainHand) + scoreItem(off.stats, weights, off.dps, weaponWeights.offHand);
    if (!best || score > best.score) best = { main: main.key, off: off.key, score };
  }
  return best;
}

export type WeaponPlaystyle = 'subtlety-swap' | 'dagger' | 'combat' | 'mutilate' | 'custom';
export type SetupWeapon = RankedWeapon & { type: WeaponType | null; speed: number | null };

export function bestWeaponSetup(items: SetupWeapon[], weights: StatValues, weaponWeights: WeaponWeights, playstyle: WeaponPlaystyle, daggerOffHand: boolean): { main: number; off: number; score: number; opener: number | null } | null {
  const mainItems = items.filter(item => item.type !== null && (playstyle === 'dagger' || playstyle === 'mutilate' ? item.type === 'dagger' : playstyle === 'subtlety-swap' || playstyle === 'combat' ? item.type !== 'dagger' : true));
  const offItems = items.filter(item => item.type !== null && (!(daggerOffHand || playstyle === 'mutilate') || item.type === 'dagger'));
  let best: { main: number; off: number; score: number; opener: number | null } | null = null;
  for (const main of mainItems) for (const off of offItems) {
    if (main.key === off.key || !['main', 'both'].includes(main.hand) || !['off', 'both'].includes(off.hand)) continue;
    const score = scoreItem(main.stats, weights, main.dps, weaponWeights.mainHand) + scoreItem(off.stats, weights, off.dps, weaponWeights.offHand);
    if (!best || score > best.score) best = { main: main.key, off: off.key, score, opener: null };
  }
  if (best && playstyle === 'subtlety-swap') {
    const opener = items.filter(item => item.type === 'dagger' && item.key !== best!.off && ['main', 'both'].includes(item.hand)).sort((left, right) => right.dps - left.dps)[0];
    best.opener = opener?.key ?? null;
  }
  return best;
}

export function parseSimcExport(input: string): SimcItem[] {
  const items: SimcItem[] = [];
  let section: 'equipment' | 'bags' | 'other' = 'equipment';
  let name = '';
  for (const raw of input.split(/\r?\n/)) {
    const line = raw.trim();
    if (/^###\s*Gear from Bags\b/i.test(line)) { section = 'bags'; name = ''; continue; }
    if (/^###/.test(line)) { section = 'other'; name = ''; continue; }
    if (section === 'other') continue;
    const commented = line.startsWith('#');
    const text = commented ? line.slice(1).trim() : line;
    const match = text.match(/^([a-z_0-9]+)=([^\s]*)$/i);
    if (match && (GEAR_SLOTS as readonly string[]).includes(match[1] ?? '') && (section === 'bags' ? commented : !commented)) {
      const fields = (match[2] ?? '').split(',').filter(Boolean);
      const id = fields.find(field => /^id=\d+$/.test(field))?.slice(3);
      const bonusField = fields.find(field => field.startsWith('bonus_id='));
      const bonus = bonusField?.slice(9).replaceAll('/', ':');
      if (id && Number(id) > 0) {
        const modifiers = fields.filter(field => !/^id=\d+$/.test(field) && field !== bonusField);
        if (bonusField && (!bonus || !/^\d+(?::\d+)*$/.test(bonus))) modifiers.push(bonusField);
        items.push({ id, ...(bonus && /^\d+(?::\d+)*$/.test(bonus) ? { bonus } : {}), slot: match[1] as GearSlot, name: name.replace(/\s*\(\d+\)$/, '') || `Item ${id}`, equipped: section === 'equipment', modifiers });
      }
      name = '';
    } else if (commented && text && !text.includes('=')) {
      name = text;
    }
  }
  return items;
}