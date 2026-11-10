import { Effect } from 'effect';
import { createElement, Sword, X } from 'lucide';
import { itemReferenceFromInput, parseTooltipStats, parseTooltipWeapon, parseTooltipWeaponDamage, parseTooltipWeaponType, scoreItem } from './compare';
import type { ItemReference, StatValues, WeaponType, WeaponWeights } from './compare';
import { bestWeaponSetup, bonusChangesItem, parseSimcExport, slotGroup, tooltipSlot } from './simc';
import type { GearSlot, HandUse, ItemGroup, SimcItem, WeaponPlaystyle } from './simc';
import { fetchWowheadItem, qualityFromTooltip, searchItemIndex, shouldSearchAsYouType } from './wowhead';
import type { SearchItem } from './wowhead';

type Loaded = { name: string; stats: StatValues; dps: number | null | undefined; speed: number | null; damage: { min: number; max: number } | null; type: WeaponType | null; hand: HandUse; group: ItemGroup | null; quality: number | undefined; icon: string | undefined; issues: string[] };
type Entry = { item: SimcItem; data?: Loaded; error?: string; loading: boolean };
type Weights = { weights: StatValues; weaponWeights: WeaponWeights };

const storageKey = 'foreverutil-inventory-v1';
const setupStorageKey = 'foreverutil-weapon-setup-v1';
const playstyles: WeaponPlaystyle[] = ['subtlety-swap', 'dagger', 'combat', 'mutilate', 'custom'];
const groups: [ItemGroup, string][] = [['weapons', 'Weapons'], ['head', 'Head'], ['neck', 'Neck'], ['shoulder', 'Shoulder'], ['back', 'Back'], ['chest', 'Chest'], ['shirt', 'Shirt'], ['tabard', 'Tabard'], ['wrist', 'Wrist'], ['hands', 'Hands'], ['waist', 'Waist'], ['legs', 'Legs'], ['feet', 'Feet'], ['finger', 'Fingers'], ['trinket', 'Trinkets'], ['ranged', 'Ranged']];
const escapeHTML = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
const element = <T extends HTMLElement>(selector: string) => {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing element: ${selector}`);
  return found;
};

async function load(item: SimcItem): Promise<Loaded> {
  const result = await Effect.runPromise(fetchWowheadItem(item.id, item.bonus));
  const slot = tooltipSlot(result.tooltip);
  const weapon = parseTooltipWeapon(result.tooltip);
  const type = parseTooltipWeaponType(result.tooltip);
  const issues: string[] = [];
  if (!slot) issues.push('Slot unknown');
  else if (slot.group !== slotGroup(item.slot)) issues.push('Slot does not match export');
  if (slot?.group === 'weapons' && (weapon == null || slot.hand === 'unknown' || slot.hand === 'two')) issues.push('Weapon or hand data unsupported');
  if (slot?.group === 'weapons' && !type) issues.push('Rogue weapon type unknown or unsupported');
  if (slot?.group === 'ranged') issues.push('Ranged weapon DPS not modeled');
  if (item.modifiers.length) issues.push(`Modifiers not modeled: ${item.modifiers.join(', ')}`);
  if (/\bUnique(?:-Equipped)?\b/i.test(result.tooltip)) issues.push('Unique restriction needs verification');
  if (item.bonus) {
    if (item.bonus.includes(':')) issues.push('Multiple bonuses require verification');
    else {
      try {
        const base = await Effect.runPromise(fetchWowheadItem(item.id));
        if (!bonusChangesItem(result.tooltip, base.tooltip)) issues.push('Bonus could not be verified');
      } catch { issues.push('Bonus could not be verified'); }
    }
  }
  const name = new DOMParser().parseFromString(result.tooltip, 'text/html').querySelector('b')?.textContent?.trim() || result.name;
  return { name, stats: parseTooltipStats(result.tooltip), dps: weapon === undefined ? undefined : weapon?.dps ?? null, speed: weapon?.speed ?? null, damage: parseTooltipWeaponDamage(result.tooltip), type, hand: slot?.hand ?? 'unknown', group: slot?.group ?? null, quality: result.quality ?? qualityFromTooltip(result.tooltip), icon: result.icon, issues };
}

export function setupInventory(getWeights: () => Weights, loadIndex: () => Promise<readonly SearchItem[]>): () => void {
  const form = element<HTMLFormElement>('#simc-form');
  const input = element<HTMLTextAreaElement>('#simc-export');
  const message = element<HTMLElement>('#simc-message');
  const select = element<HTMLSelectElement>('#inventory-slot');
  const setupControls = element<HTMLElement>('#weapon-setup-controls');
  const playstyleSelect = element<HTMLSelectElement>('#weapon-playstyle');
  const daggerOffHand = element<HTMLInputElement>('#dagger-off-hand');
  const list = element<HTMLElement>('#inventory-list');
  const summary = element<HTMLElement>('#inventory-summary');
  const lookup = element<HTMLFormElement>('#inventory-lookup');
  const query = element<HTMLInputElement>('#inventory-query');
  const bonusInput = element<HTMLInputElement>('#inventory-bonus');
  const lookupMessage = element<HTMLElement>('#inventory-message');
  const results = element<HTMLElement>('#inventory-results');
  let entries: Entry[] = [];
  let generation = 0;
  let lookupVersion = 0;
  let searchTimer: number | undefined;
  let selected: ItemGroup = 'weapons';
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(setupStorageKey) ?? 'null');
    if (saved && typeof saved === 'object' && 'playstyle' in saved && typeof saved.playstyle === 'string' && playstyles.includes(saved.playstyle as WeaponPlaystyle)) playstyleSelect.value = saved.playstyle;
    if (saved && typeof saved === 'object' && 'daggerOffHand' in saved && typeof saved.daggerOffHand === 'boolean') daggerOffHand.checked = saved.daggerOffHand;
  } catch { }
  let preferDaggerOffHand = daggerOffHand.checked;
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    if (Array.isArray(saved)) entries = saved.filter((item): item is SimcItem => item && typeof item.id === 'string' && /^\d+$/.test(item.id) && typeof item.name === 'string' && typeof item.slot === 'string' && groups.some(([group]) => group === slotGroup(item.slot as GearSlot)) && Array.isArray(item.modifiers) && item.modifiers.every((modifier: unknown) => typeof modifier === 'string') && typeof item.equipped === 'boolean' && (item.bonus === undefined || /^\d+(?::\d+)*$/.test(item.bonus))).map(item => ({ item, loading: true }));
  } catch { }

  function save() { try { localStorage.setItem(storageKey, JSON.stringify(entries.map(entry => entry.item))); } catch { } }
  function itemUrl(entry: Entry): string {
    return `https://www.wowhead.com/forever/item=${encodeURIComponent(entry.item.id)}${entry.item.bonus ? `?bonus=${encodeURIComponent(entry.item.bonus)}` : ''}`;
  }
  function qualityAttribute(entry: Entry): string {
    const quality = entry.data?.quality;
    return quality !== undefined && Number.isInteger(quality) && quality >= 0 && quality <= 7 ? ` data-quality="${quality}"` : '';
  }
  function render() {
    const { weights, weaponWeights } = getWeights();
    const visible = entries.map((entry, index) => ({ entry, index })).filter(({ entry }) => slotGroup(entry.item.slot) === selected);
    const unresolved = visible.filter(({ entry }) => entry.loading || entry.error || !entry.data || entry.data.issues.length);
    const ready = visible.filter(({ entry }) => entry.data && !entry.data.issues.length);
    const provisional = unresolved.length > 0 || (selected === 'weapons' && ready.some(({ entry }) => entry.data?.speed === null));
    const recommended = new Map<number, string>();
    summary.classList.remove('has-recommendation');
    setupControls.hidden = selected !== 'weapons';
    daggerOffHand.disabled = playstyleSelect.value === 'mutilate';
    daggerOffHand.checked = daggerOffHand.disabled || preferDaggerOffHand;
    element('#inventory-count').textContent = `${entries.length} ${entries.length === 1 ? 'ITEM' : 'ITEMS'}`;
    select.innerHTML = groups.map(([group, label]) => `<option value="${group}"${group === selected ? ' selected' : ''}>${label} (${entries.filter(entry => slotGroup(entry.item.slot) === group).length})</option>`).join('');
    if (!visible.length) summary.textContent = 'No items in this slot yet.';
    else if (selected === 'weapons') {
      const candidates = ready.flatMap(({ entry, index }) => entry.data && typeof entry.data.dps === 'number' ? [{ key: index, hand: entry.data.hand, stats: entry.data.stats, dps: entry.data.dps, type: entry.data.type, speed: entry.data.speed }] : []);
      const playstyle = playstyleSelect.value as WeaponPlaystyle;
      const best = bestWeaponSetup(candidates, weights, weaponWeights, playstyle, daggerOffHand.checked);
      const missingSpeed = candidates.filter(item => item.speed === null).length;
      if (best) {
        summary.classList.add('has-recommendation');
        recommended.set(best.main, 'Main hand');
        recommended.set(best.off, 'Off hand');
        if (best.opener !== null) recommended.set(best.opener, 'Ambush swap');
        const icon = createElement(Sword, { width: 20, height: 20, 'aria-hidden': 'true' }).outerHTML;
        const hand = (index: number, label: string, weight: number, opener = false) => {
          const entry = entries[index]!;
          const data = entry.data!;
          const image = data.icon && /^[a-z0-9_]+$/i.test(data.icon) ? `<img src="https://wow.zamimg.com/images/wow/icons/medium/${data.icon}.jpg" alt="">` : icon;
          const score = scoreItem(data.stats, weights, data.dps ?? 0, weight);
          const equipped = entry.item.equipped && entry.item.slot === (label === 'Off hand' ? 'off_hand' : 'main_hand');
          const location = equipped ? 'Currently equipped' : entry.item.equipped ? `Equipped: ${entry.item.slot.replaceAll('_', ' ')}` : 'Candidate';
          const details = `${data.type ?? 'Unknown type'} · ${data.speed === null ? 'Speed unknown' : `${data.speed.toFixed(2)}s`} · ${data.dps?.toFixed(2)} DPS · ${data.damage ? `${data.damage.min}-${data.damage.max} damage` : 'Damage unknown'}`;
          return `<div class="recommendation-item"${qualityAttribute(entry)}><div class="recommendation-icon">${image}</div><div class="recommendation-identity"><span class="recommendation-label">${label}</span><a href="${itemUrl(entry)}" target="_blank" rel="noopener noreferrer">${escapeHTML(data.name)}</a><span class="recommendation-meta">${escapeHTML(details)}<br>${escapeHTML(location)}${opener ? ' · Highest dagger DPS' : ` · ${score.toFixed(2)} EP`}</span></div></div>`;
        };
        const loading = unresolved.filter(({ entry }) => entry.loading).length;
        const unchecked = unresolved.length - loading;
        const pending = [loading ? `${loading} loading` : '', unchecked ? `${unchecked} unchecked` : ''].filter(Boolean).join(' · ');
        const main = candidates.find(item => item.key === best.main)!;
        const off = candidates.find(item => item.key === best.off)!;
        const slowerMain = candidates.some(item => item.key !== best.off && ['main', 'both'].includes(item.hand) && item.speed !== null && main.speed !== null && item.speed > main.speed && (playstyle === 'dagger' || playstyle === 'mutilate' ? item.type === 'dagger' : playstyle === 'subtlety-swap' || playstyle === 'combat' ? item.type !== 'dagger' : true));
        const fasterOff = candidates.some(item => item.key !== best.main && ['off', 'both'].includes(item.hand) && item.speed !== null && off.speed !== null && item.speed < off.speed && (!(daggerOffHand.checked || playstyle === 'mutilate') || item.type === 'dagger'));
        const notes = [unresolved.length ? `${pending} · These items could change the result.` : '', missingSpeed ? `${missingSpeed} weapon(s) have unknown speed.` : '', slowerMain ? 'A slower compatible main hand is available; compare its damage and stats.' : '', fasterOff ? 'A faster compatible off hand is available; compare its damage and stats.' : '', 'Pair ranked by DPS and stat EP only; speed, abilities and procs are not scored.'].filter(Boolean).join(' ');
        const opener = playstyle === 'subtlety-swap' ? `<div class="recommendation-opener">${best.opener === null ? '<div class="recommendation-warning">No separate main-hand dagger available for Ambush. Add one or choose a dagger playstyle.</div>' : hand(best.opener, 'Ambush swap', weaponWeights.mainHand, true)}</div>` : '';
        summary.innerHTML = `<div class="recommendation-heading"><div><span class="recommendation-eyebrow">WEAPON SETUP</span><strong>${unresolved.length || missingSpeed ? 'Provisional EP pair' : 'Highest estimated EP pair'}</strong></div><div class="recommendation-total"><span>ROTATION PAIR</span><strong>${best.score.toFixed(2)} <small>EP</small></strong></div></div><div class="recommendation-items">${hand(best.main, 'Main hand', weaponWeights.mainHand)}${hand(best.off, 'Off hand', weaponWeights.offHand)}</div>${opener}<div class="recommendation-warning">${escapeHTML(notes)}</div>`;
      } else summary.textContent = `No compatible pair for this setup.${unresolved.length ? ` ${unresolved.length} item(s) need attention.` : ' Add compatible weapons or change the setup.'}`;
    } else if (ready.length) {
      const ranked = ready.map(({ entry, index }) => ({ index, name: entry.data!.name, score: scoreItem(entry.data!.stats, weights) })).sort((left, right) => right.score - left.score);
      const best = ranked[0];
      if (best) for (const item of ranked) if (item.score.toFixed(2) === best.score.toFixed(2)) recommended.set(item.index, 'Highest score');
      summary.innerHTML = `<strong>${unresolved.length ? 'Provisional highest score' : 'Highest estimated score'}</strong> · ${escapeHTML(best?.name)} · ${best?.score.toFixed(2)} EP${unresolved.length ? ` · ${unresolved.length} unchecked` : ''}${selected === 'finger' || selected === 'trinket' ? ' · Check both equipped slots and unique restrictions.' : ''}`;
    } else summary.textContent = `${unresolved.length} item(s) need attention before ranking.`;
    const removeIcon = createElement(X, { width: 16, height: 16, 'aria-hidden': 'true' }).outerHTML;
    list.innerHTML = visible.map(({ entry, index }) => {
      const data = entry.data;
      const details = entry.loading ? 'Loading item data...' : entry.error || (data?.issues.length ? data.issues.join(' · ') : `${entry.item.equipped ? `Equipped: ${entry.item.slot.replaceAll('_', ' ')}` : 'Candidate'}${selected === 'weapons' ? ` · ${data?.type ?? 'Unknown type'} · ${data?.speed ? `${data.speed.toFixed(2)}s` : 'Speed unknown'} · ${data?.dps?.toFixed(2)} DPS · ${data?.damage ? `${data.damage.min}-${data.damage.max} damage` : 'Damage unknown'}` : ''}${data?.hand && data.hand !== 'unknown' ? ` · ${data.hand === 'both' ? 'Either hand' : `${data.hand} hand`}` : ''}`);
      const score = data && !data.issues.length ? selected === 'weapons' && typeof data.dps === 'number' ? `<small>${[data.hand !== 'off' ? `MH ${scoreItem(data.stats, weights, data.dps, weaponWeights.mainHand).toFixed(2)}` : '', data.hand !== 'main' ? `OH ${scoreItem(data.stats, weights, data.dps, weaponWeights.offHand).toFixed(2)}` : ''].filter(Boolean).join(' · ')} EP</small>` : `${scoreItem(data.stats, weights).toFixed(2)} EP` : '—';
      const recommendation = recommended.get(index);
      return `<div class="inventory-row${recommendation ? ' is-recommended' : ''}"><div class="inventory-name"${qualityAttribute(entry)}><a href="${itemUrl(entry)}" target="_blank" rel="noopener noreferrer">${escapeHTML(data?.name || entry.item.name)}</a>${recommendation ? `<span class="inventory-recommendation">${provisional ? 'Provisional' : 'Top pick'} · ${recommendation}</span>` : ''}<small>${escapeHTML(details)}${entry.item.bonus ? ` · Bonus ${escapeHTML(entry.item.bonus)}` : ''}</small></div><div class="inventory-score">${score}</div><button type="button" class="icon-button inventory-remove" data-index="${index}" title="Remove item" aria-label="Remove ${escapeHTML(data?.name || entry.item.name)}">${removeIcon}</button></div>`;
    }).join('');
    window.$WowheadPower?.refreshLinks();
  }

  async function loadEntries(targets: Entry[], version: number) {
    let cursor = 0;
    const worker = async () => {
      while (cursor < targets.length && generation === version) {
        const entry = targets[cursor++];
        if (!entry) continue;
        try { const data = await load(entry.item); if (generation === version && entries.includes(entry)) entry.data = data; }
        catch { if (generation === version && entries.includes(entry)) entry.error = 'Could not load item. Refresh to retry.'; }
        if (generation === version && entries.includes(entry)) { entry.loading = false; render(); }
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, targets.length) }, worker));
  }
  function refresh() {
    const version = ++generation;
    entries.forEach(entry => { entry.loading = true; delete entry.error; delete entry.data; });
    render();
    void loadEntries([...entries], version);
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    const items = parseSimcExport(input.value);
    if (!items.length) { message.textContent = 'No equipped or bag gear found. Your current gear was not changed.'; return; }
    lookupVersion++;
    window.clearTimeout(searchTimer);
    results.hidden = true;
    lookupMessage.textContent = '';
    entries = items.map(item => ({ item, loading: true }));
    selected = items.some(item => slotGroup(item.slot) === 'weapons') ? 'weapons' : slotGroup(items[0]!.slot);
    input.value = '';
    message.textContent = `Imported ${items.length} items. Existing gear was replaced.`;
    save(); refresh();
  });
  select.addEventListener('change', () => { selected = select.value as ItemGroup; render(); });
  const updateSetup = () => {
    try { localStorage.setItem(setupStorageKey, JSON.stringify({ playstyle: playstyleSelect.value, daggerOffHand: preferDaggerOffHand })); } catch { }
    render();
  };
  playstyleSelect.addEventListener('change', updateSetup);
  daggerOffHand.addEventListener('change', () => { preferDaggerOffHand = daggerOffHand.checked; updateSetup(); });
  element('#refresh-gear').addEventListener('click', refresh);
  list.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('.inventory-remove');
    if (!button) return;
    const index = Number(button.dataset.index);
    if (!Number.isInteger(index) || index < 0 || index >= entries.length) return;
    entries.splice(index, 1); save(); render();
  });

  async function addItem(reference: ItemReference, version: number) {
    lookupMessage.textContent = 'Loading item...';
    try {
      const raw = await Effect.runPromise(fetchWowheadItem(reference.id, reference.bonus));
      if (version !== lookupVersion) return;
      const slot = tooltipSlot(raw.tooltip);
      if (!slot) { lookupMessage.textContent = 'Could not identify this item’s equipment slot.'; return; }
      const slotName: GearSlot = slot.group === 'weapons' ? 'main_hand' : slot.group === 'finger' ? 'finger1' : slot.group === 'trinket' ? 'trinket1' : slot.group;
      const item: SimcItem = { ...reference, slot: slotName, name: raw.name, equipped: false, modifiers: [] };
      const entry: Entry = { item, loading: true };
      entries.push(entry); selected = slot.group; save(); render();
      lookupMessage.textContent = 'Item added.'; results.hidden = true; query.value = ''; bonusInput.value = '';
      void loadEntries([entry], generation);
    } catch { if (version === lookupVersion) lookupMessage.textContent = 'Could not load this item. Check the ID or try again.'; }
  }
  lookup.addEventListener('input', event => {
    lookupVersion++;
    window.clearTimeout(searchTimer);
    results.hidden = true;
    lookupMessage.textContent = '';
    if (event.target === query && !(event instanceof InputEvent && event.isComposing) && shouldSearchAsYouType(query.value)) {
      const version = lookupVersion;
      searchTimer = window.setTimeout(() => { if (version === lookupVersion) lookup.requestSubmit(); }, 300);
    }
  });
  lookup.addEventListener('submit', async event => {
    event.preventDefault();
    window.clearTimeout(searchTimer);
    const text = query.value.trim();
    const bonus = bonusInput.value.trim();
    if (bonus && !/^\d+(?::\d+)*$/.test(bonus)) { lookupMessage.textContent = 'Enter numeric bonus IDs separated by colons.'; return; }
    const reference = itemReferenceFromInput(text);
    const version = ++lookupVersion;
    if (reference) { await addItem(reference.bonus || !bonus ? reference : { ...reference, bonus }, version); return; }
    if (text.length < 2 || /^\d+$/.test(text) || /^https?:/i.test(text)) { lookupMessage.textContent = 'Enter an item name, valid Wowhead URL, or positive item ID.'; return; }
    lookupMessage.textContent = 'Searching Forever items...';
    try {
      const index = await loadIndex();
      if (version !== lookupVersion) return;
      const matches = searchItemIndex(text, index);
      lookupMessage.textContent = matches.length ? `${matches.length} results from community index${matches.length > 30 ? ' (first 30 shown)' : ''}` : 'No matches. Try a Wowhead URL or item ID.';
      results.innerHTML = matches.slice(0, 30).map(item => `<button type="button" class="select-search-item inventory-result" data-id="${item.itemId}"><span>${escapeHTML(item.name)}</span><small>#${item.itemId}</small></button>`).join('');
      results.hidden = !matches.length;
    } catch { if (version === lookupVersion) lookupMessage.textContent = 'Search is unavailable. Try a Wowhead URL or item ID.'; }
  });
  results.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('.inventory-result');
    const bonus = bonusInput.value.trim();
    if (!button?.dataset.id) return;
    window.clearTimeout(searchTimer);
    if (bonus && !/^\d+(?::\d+)*$/.test(bonus)) { lookupMessage.textContent = 'Enter numeric bonus IDs separated by colons.'; return; }
    void addItem(bonus ? { id: button.dataset.id, bonus } : { id: button.dataset.id }, ++lookupVersion);
  });
  refresh();
  return render;
}