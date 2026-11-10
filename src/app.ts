import { Effect } from 'effect';
import { ArrowLeftRight, createElement, Moon, RotateCcw, Search, Sun, X } from 'lucide';
import { STATS, compareScores, defaultWeaponWeights, defaultWeights, emptyStats, itemReferenceFromInput, parseTooltipStats, parseTooltipWeapon, scoreItem } from './compare';
import type { ItemReference, StatKey, StatValues, WeaponHand, WeaponWeights } from './compare';
import { fetchItemIndex, fetchWowheadItem, qualityFromTooltip, searchItemIndex, shouldSearchAsYouType } from './wowhead';
import type { SearchItem } from './wowhead';
import { setupInventory } from './inventory';

type Item = { name: string; stats: StatValues; source: string; id?: string; bonus?: string; icon?: string | undefined; quality?: number | undefined; weaponDps?: number | null | undefined; weaponSpeed?: number | null };
type Profile = 'preset' | 'custom';
type State = { items: [Item, Item]; weights: StatValues; customWeights: StatValues; weaponHand: WeaponHand; weaponWeights: WeaponWeights; customWeaponWeights: WeaponWeights; profile: Profile };

declare global {
  interface Window { $WowheadPower?: { refreshLinks: () => void } }
}

function element<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing element: ${selector}`);
  return found;
}

function itemIndex(value: string | undefined): 0 | 1 {
  return value === '1' ? 1 : 0;
}

function statKey(value: string | undefined): StatKey | undefined {
  return STATS.find(stat => stat.key === value)?.key;
}

const storageKey = 'foreverutil-comparison-v1';
const sampleItems: [Item, Item] = [
  { name: 'Example equipped item', stats: { ...emptyStats(), agility: 18, crit: 8, attackPower: 24, stamina: 12 }, source: 'Example item' },
  { name: 'Example candidate item', stats: { ...emptyStats(), agility: 24, expertise: 6, attackPower: 18, stamina: 10 }, source: 'Example item' },
];

function loadState(): State {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as Partial<State> | null;
    if (saved && Array.isArray(saved.items) && saved.items.length === 2) {
      const profile = saved.profile === 'custom' ? 'custom' : 'preset';
      const customWeights = { ...defaultWeights(), ...(saved.customWeights || (profile === 'custom' ? saved.weights : {})) };
      const customWeaponWeights = { ...defaultWeaponWeights(), ...(saved.customWeaponWeights || (profile === 'custom' ? saved.weaponWeights : {})) };
      const items = saved.items.map(item => ({ ...item, stats: { ...emptyStats(), ...item.stats } })) as [Item, Item];
      return { items, weights: profile === 'custom' ? { ...customWeights } : defaultWeights(), customWeights, weaponHand: saved.weaponHand === 'offHand' ? 'offHand' : 'mainHand', weaponWeights: profile === 'custom' ? { ...customWeaponWeights } : defaultWeaponWeights(), customWeaponWeights, profile };
    }
  } catch { }
  return { items: structuredClone(sampleItems), weights: defaultWeights(), customWeights: defaultWeights(), weaponHand: 'mainHand', weaponWeights: defaultWeaponWeights(), customWeaponWeights: defaultWeaponWeights(), profile: 'preset' };
}

const state = loadState();
const itemsElement = element<HTMLElement>('#items');
const tableElement = element<HTMLElement>('#stat-table');
const weightsElement = element<HTMLElement>('#weights');
const weaponWeightsElement = element<HTMLElement>('#weapon-weights');
const weaponHandElement = element<HTMLSelectElement>('#weapon-hand');
const profileElement = element<HTMLSelectElement>('#profile');
const themeToggle = element<HTMLButtonElement>('#theme-toggle');
const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHTML = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => entities[character] ?? character);
const format = (value: number) => Number(value).toFixed(2);
const qualityNames = ['Poor', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Artifact', 'Heirloom'] as const;
const validQuality = (value: unknown): number | undefined => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < qualityNames.length ? value : undefined;
const lookupVersions: [number, number] = [0, 0];
const searchTimers: [number | undefined, number | undefined] = [undefined, undefined];
let indexPromise: Promise<readonly SearchItem[]> | undefined;

function scheduleNameSearch(form: HTMLFormElement, index: 0 | 1) {
  const queryInput = form.elements.namedItem('query');
  if (!(queryInput instanceof HTMLInputElement)) return;
  const query = queryInput.value.trim();
  if (!shouldSearchAsYouType(query)) return;
  const version = lookupVersions[index];
  searchTimers[index] = window.setTimeout(() => {
    searchTimers[index] = undefined;
    if (form.isConnected && lookupVersions[index] === version && queryInput.value.trim() === query) form.requestSubmit();
  }, 300);
}

function loadItemIndex(): Promise<readonly SearchItem[]> {
  if (!indexPromise) {
    indexPromise = Effect.runPromise(fetchItemIndex()).catch(error => { indexPromise = undefined; throw error; });
  }
  return indexPromise;
}

function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { }
}

function updateThemeControl() {
  const dark = document.documentElement.dataset.theme === 'dark';
  themeToggle.setAttribute('aria-pressed', String(dark));
  themeToggle.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
  themeToggle.replaceChildren(createElement(dark ? Sun : Moon, { width: 18, height: 18, 'aria-hidden': 'true' }));
}

themeToggle.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('foreverutil-theme', theme); } catch { }
  updateThemeControl();
});

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
  try { if (localStorage.getItem('foreverutil-theme')) return; } catch { }
  document.documentElement.dataset.theme = event.matches ? 'dark' : 'light';
  updateThemeControl();
});
updateThemeControl();

function renderItems() {
  const clearIcon = createElement(X, { width: 16, height: 16, 'aria-hidden': 'true' }).outerHTML;
  const searchIcon = createElement(Search, { width: 16, height: 16, 'aria-hidden': 'true' }).outerHTML;
  itemsElement.innerHTML = state.items.map((item, index) => {
    const icon = item.icon && /^[a-z0-9_]+$/i.test(item.icon) ? `https://wow.zamimg.com/images/wow/icons/large/${item.icon}.jpg` : '';
    const bonus = item.bonus && /^\d+(?::\d+)*$/.test(item.bonus) ? item.bonus : '';
    const quality = validQuality(item.quality);
    const itemUrl = item.id ? `https://www.wowhead.com/forever/item=${escapeHTML(item.id)}${bonus ? `?bonus=${encodeURIComponent(bonus)}` : ''}` : '';
    const iconContent = icon ? `<img src="${icon}" alt="">` : '<span>✦</span>';
    const itemIcon = itemUrl ? `<a class="item-icon ${icon ? 'has-image' : ''}" href="${itemUrl}" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true">${iconContent}</a>` : `<div class="item-icon ${icon ? 'has-image' : ''}">${iconContent}</div>`;
    const itemName = itemUrl ? `<a class="item-name item-name-link" data-index="${index}" href="${itemUrl}" target="_blank" rel="noopener noreferrer">${escapeHTML(item.name)}</a>` : `<input class="item-name" data-index="${index}" aria-label="${index === 0 ? 'Equipped' : 'Comparison'} item name" value="${escapeHTML(item.name)}" placeholder="Name this item">`;
    return `<article class="item-card item-${index}">
      <div class="item-topline"><span><span class="item-number">0${index + 1}</span> ${index === 0 ? 'EQUIPPED ITEM' : 'ITEM TO COMPARE'}</span><button class="clear-item icon-button" data-index="${index}" type="button" title="Clear item" aria-label="Clear ${index === 0 ? 'equipped' : 'comparison'} item">${clearIcon}</button></div>
      <div class="item-identity"${quality === undefined ? '' : ` data-quality="${quality}"`}>${itemIcon}<div class="identity-text">${itemName}<div class="item-source"><span class="item-quality"${quality === undefined ? ' hidden' : ''}>${quality === undefined ? '' : `${qualityNames[quality]} ·`}</span> ${escapeHTML(item.source || 'Manual item')}${bonus ? ` <span>·</span> Bonus ${escapeHTML(bonus)}` : ''}<span class="weapon-speed"${item.weaponSpeed ? '' : ' hidden'}>${item.weaponSpeed ? ` · Speed ${format(item.weaponSpeed)}s` : ''}</span></div></div></div>
      <form class="lookup-form" data-index="${index}"><div class="lookup"><label class="sr-only" for="lookup-${index}">Item name, Wowhead URL or ID</label><span class="search-icon" aria-hidden="true">${searchIcon}</span><input id="lookup-${index}" name="query" placeholder="Item name, Wowhead URL or ID" autocomplete="off"><button type="submit">Find item</button></div><label class="bonus-field" for="bonus-${index}"><span>Bonus ID <small>(optional)</small></span><input id="bonus-${index}" name="bonus" placeholder="e.g. 12721" autocomplete="off"></label></form>
      <p class="lookup-message" id="message-${index}" aria-live="polite"></p>
      <div class="search-results" id="results-${index}" aria-label="Item search results" hidden></div>
      <div class="score-line"><div><span class="score-label">WEIGHTED SCORE</span><div><strong id="score-${index}">0.00</strong><span class="score-unit"> EP</span></div></div><span class="score-tag" id="tag-${index}"></span></div>
    </article>`;
  }).join('');
  window.$WowheadPower?.refreshLinks();
}

function renderTable() {
  const weaponRow = `<div class="stat-row"><span class="stat-name">Weapon DPS</span><span class="table-weight" id="table-weight-weapon">${format(state.weaponWeights[state.weaponHand])}</span>${([0, 1] as const).map(index => `<label class="stat-input-wrap"><span class="sr-only">Weapon DPS, ${index === 0 ? 'equipped' : 'comparison'} item</span><input class="stat-input" type="number" min="0" step="any" data-index="${index}" data-weapon-dps value="${escapeHTML(state.items[index].weaponDps ?? '')}" placeholder="—"></label>`).join('')}<span class="difference" id="difference-weapon">—</span></div>`;
  tableElement.innerHTML = `<div class="stat-row stat-header"><span>STAT</span><span>WEIGHT</span><span>EQUIPPED</span><span>COMPARE</span><span>DIFFERENCE</span></div>` + weaponRow + STATS.map(stat => `<div class="stat-row"><span class="stat-name">${stat.label}</span><span class="table-weight" id="table-weight-${stat.key}">${format(state.weights[stat.key])}</span>${([0, 1] as const).map(index => `<label class="stat-input-wrap"><span class="sr-only">${stat.label}, ${index === 0 ? 'equipped' : 'comparison'} item</span><input class="stat-input" type="number" step="any" data-index="${index}" data-stat="${stat.key}" value="${escapeHTML(state.items[index].stats[stat.key] || '')}" placeholder="0"></label>`).join('')}<span class="difference" id="difference-${stat.key}">0</span></div>`).join('');
}

function renderWeights() {
  profileElement.value = state.profile;
  weaponHandElement.value = state.weaponHand;
  element('#profile-description').textContent = state.profile === 'preset' ? 'Subtlety / Questing' : 'Your custom weights';
  weightsElement.innerHTML = STATS.map(stat => `<label class="weight-row"><span>${stat.label}</span><span class="weight-control"><input type="number" step="0.01" min="0" data-stat="${stat.key}" value="${escapeHTML(state.weights[stat.key])}" aria-label="${stat.label} weight"><small>EP</small></span></label>`).join('');
  weaponWeightsElement.innerHTML = (['mainHand', 'offHand'] as const).map(hand => `<label class="weight-row"><span>${hand === 'mainHand' ? 'Main-hand DPS' : 'Off-hand DPS'}</span><span class="weight-control"><input type="number" step="0.01" min="0" data-hand="${hand}" value="${escapeHTML(state.weaponWeights[hand])}" aria-label="${hand === 'mainHand' ? 'Main-hand' : 'Off-hand'} weapon DPS weight"><small>EP</small></span></label>`).join('');
}

function updateResults() {
  const weaponWeight = state.weaponWeights[state.weaponHand];
  const scores = [scoreItem(state.items[0].stats, state.weights, state.items[0].weaponDps ?? 0, weaponWeight), scoreItem(state.items[1].stats, state.weights, state.items[1].weaponDps ?? 0, weaponWeight)] as const;
  const itemsReady = state.items.every(item => Boolean(item.name.trim() || item.id || item.weaponDps || Object.values(item.stats).some(value => Number(value) !== 0)));
  const missingWeaponData = state.items.some(item => Boolean(item.id) && item.weaponDps === undefined);
  const weaponFlags = state.items.map(item => typeof item.weaponDps === 'number' && item.weaponDps > 0);
  const unmatchedWeapons = weaponFlags[0] !== weaponFlags[1];
  const ready = itemsReady && !missingWeaponData && !unmatchedWeapons;
  const result = compareScores(scores[0], scores[1]);
  const verdict = element('#verdict');
  verdict.classList.toggle('has-winner', ready && result.winner !== null);
  element('#verdict-title').textContent = !itemsReady ? 'Add both items to compare' : missingWeaponData ? 'Check weapon DPS' : unmatchedWeapons ? 'Weapon DPS needed for both items' : result.winner === null ? 'Scores are tied' : result.winner === 0 ? 'Equipped item is better' : 'Item to compare is better';
  element('#verdict-detail').textContent = !itemsReady ? 'Enter a name or stats for each item' : missingWeaponData ? 'Melee DPS only; enter DPS if applicable' : unmatchedWeapons ? 'Compare matching weapon slots' : result.winner === null ? 'Same weighted score' : `${format(result.difference)} EP higher${weaponFlags[0] ? ' (estimated)' : ''}`;
  for (const index of [0, 1] as const) {
    element(`#score-${index}`).textContent = state.items[index].id && state.items[index].weaponDps === undefined ? '—' : format(scores[index]);
    element(`.item-${index} .score-label`).textContent = weaponFlags[index] ? 'WEIGHTED SCORE (EST.)' : 'WEIGHTED SCORE';
    const tag = element(`#tag-${index}`);
    const winner = ready && result.winner === index;
    tag.textContent = !ready ? 'NOT COMPARED' : result.winner === null ? 'TIED' : winner ? `BETTER  +${format(result.difference)} EP` : `LOWER  -${format(result.difference)} EP`;
    tag.classList.toggle('winner', winner);
    element(`.item-${index}`).classList.toggle('is-winner', winner);
  }
  element('#table-weight-weapon').textContent = format(weaponWeight);
  const weaponDifference = element('#difference-weapon');
  const difference = (state.items[1].weaponDps ?? 0) - (state.items[0].weaponDps ?? 0);
  weaponDifference.textContent = weaponFlags[0] && weaponFlags[1] ? `${difference > 0 ? '+' : ''}${Number(difference.toFixed(2))}` : '—';
  weaponDifference.classList.toggle('positive', Boolean(weaponFlags[0] && weaponFlags[1] && difference > 0));
  weaponDifference.classList.toggle('negative', Boolean(weaponFlags[0] && weaponFlags[1] && difference < 0));
  for (const stat of STATS) {
    const difference = (Number(state.items[1].stats[stat.key]) || 0) - (Number(state.items[0].stats[stat.key]) || 0);
    const cell = element(`#difference-${stat.key}`);
    cell.textContent = difference > 0 ? `+${difference}` : String(difference);
    cell.classList.toggle('positive', difference > 0);
    cell.classList.toggle('negative', difference < 0);
    element(`#table-weight-${stat.key}`).textContent = format(state.weights[stat.key]);
  }
  refreshInventory();
}

function renderAll() { renderItems(); renderTable(); renderWeights(); updateResults(); save(); }

async function importItem(index: 0 | 1, reference: ItemReference, form: HTMLFormElement, version: number) {
  const message = element(`#message-${index}`);
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (!button) return;
  button.disabled = true;
  element<HTMLElement>(`#results-${index}`).hidden = true;
  message.textContent = 'Looking up item...';
  try {
    const data = await Effect.runPromise(fetchWowheadItem(reference.id, reference.bonus));
    if (!form.isConnected || lookupVersions[index] !== version) return;
    const tooltip = new DOMParser().parseFromString(data.tooltip, 'text/html');
    const name = tooltip.querySelector('b')?.textContent?.trim() || data.name;
    const quality = validQuality(data.quality) ?? qualityFromTooltip(data.tooltip);
    const weapon = parseTooltipWeapon(data.tooltip);
    state.items[index] = { name, ...reference, icon: data.icon, quality, weaponDps: weapon === undefined ? undefined : weapon?.dps ?? null, weaponSpeed: weapon?.speed ?? null, source: 'Wowhead Forever', stats: parseTooltipStats(data.tooltip) };
    renderAll();
    element(`#message-${index}`).textContent = reference.bonus ? `Bonus ${reference.bonus} imported. Check the tooltip for other effects.` : 'Imported. Check the tooltip for effects and unlisted stats.';
    element<HTMLElement>(`.item-name[data-index="${index}"]`).focus({ preventScroll: true });
  } catch {
    if (!form.isConnected || lookupVersions[index] !== version) return;
    message.textContent = 'Could not load this item. Check the ID or try again later.';
    button.disabled = false;
  }
}

itemsElement.addEventListener('input', event => {
  if (!(event.target instanceof HTMLInputElement)) return;
  const form = event.target.closest<HTMLFormElement>('.lookup-form');
  if (form) {
    const index = itemIndex(form.dataset.index);
    window.clearTimeout(searchTimers[index]);
    searchTimers[index] = undefined;
    lookupVersions[index]++;
    const results = element<HTMLElement>(`#results-${index}`);
    if (event.target.name === 'query') {
      results.hidden = true;
    }
    element(`#message-${index}`).textContent = '';
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (button) button.disabled = false;
    if ((event.target.name === 'query' || results.hidden) && !(event instanceof InputEvent && event.isComposing)) scheduleNameSearch(form, index);
  } else if (event.target.matches('.item-name')) {
    state.items[itemIndex(event.target.dataset.index)].name = event.target.value;
    updateResults();
    save();
  }
});

itemsElement.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return;
  const result = event.target.closest<HTMLButtonElement>('.select-search-item');
  if (result) {
    const index = itemIndex(result.dataset.index);
    window.clearTimeout(searchTimers[index]);
    searchTimers[index] = undefined;
    const form = element<HTMLFormElement>(`.lookup-form[data-index="${index}"]`);
    const bonusInput = form.elements.namedItem('bonus');
    const bonus = bonusInput instanceof HTMLInputElement ? bonusInput.value.trim() : '';
    if (bonus && !/^\d+(?::\d+)*$/.test(bonus)) { element(`#message-${index}`).textContent = 'Enter numeric bonus IDs separated by colons.'; return; }
    const id = result.dataset.id;
    if (id && /^\d+$/.test(id)) void importItem(index, bonus ? { id, bonus } : { id }, form, ++lookupVersions[index]);
    return;
  }
  const button = event.target.closest<HTMLButtonElement>('.clear-item');
  if (!button) return;
  const index = itemIndex(button.dataset.index);
  state.items[index] = { name: '', stats: emptyStats(), source: 'Manual item' };
  renderAll();
});

itemsElement.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.matches('.lookup-form')) return;
  const index = itemIndex(form.dataset.index);
  window.clearTimeout(searchTimers[index]);
  searchTimers[index] = undefined;
  const queryInput = form.elements.namedItem('query');
  if (!(queryInput instanceof HTMLInputElement)) return;
  const query = queryInput.value.trim();
  const message = element(`#message-${index}`);
  const results = element<HTMLElement>(`#results-${index}`);
  const bonusInput = form.elements.namedItem('bonus');
  const bonus = bonusInput instanceof HTMLInputElement ? bonusInput.value.trim() : '';
  if (!query) { message.textContent = 'Enter an item name, Wowhead URL, or ID.'; return; }
  const reference = itemReferenceFromInput(query);
  const version = ++lookupVersions[index];
  if (reference) {
    if (bonus && !/^\d+(?::\d+)*$/.test(bonus)) { message.textContent = 'Enter numeric bonus IDs separated by colons.'; return; }
    await importItem(index, reference.bonus || !bonus ? reference : { ...reference, bonus }, form, version); return;
  }
  if (/^\d+$/.test(query) || /^https?:\/\//i.test(query)) { message.textContent = 'Enter a valid Wowhead item URL or positive item ID.'; return; }
  if (query.length < 2) { message.textContent = 'Enter at least two characters to search.'; return; }
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (!button) return;
  button.disabled = true;
  results.hidden = true;
  message.textContent = 'Searching Forever items...';
  try {
    const items = await loadItemIndex();
    if (!form.isConnected || lookupVersions[index] !== version) return;
    const matches = searchItemIndex(query, items);
    message.textContent = matches.length ? `${matches.length} ${matches.length === 1 ? 'result' : 'results'} from community index${matches.length > 30 ? ' (first 30 shown)' : ''}` : 'No matches in the community index. Try a Wowhead URL or item ID.';
    results.innerHTML = matches.slice(0, 30).map(item => {
      const icon = item.iconName && /^[a-z0-9_]+$/i.test(item.iconName) ? `https://wow.zamimg.com/images/wow/icons/small/${item.iconName}.jpg` : '';
      const quality = validQuality(item.quality);
      return `<button type="button" class="select-search-item" data-index="${index}" data-id="${item.itemId}"${quality === undefined ? '' : ` data-quality="${quality}"`}>${icon ? `<img src="${icon}" alt="" loading="lazy">` : '<span class="result-icon">◆</span>'}<span class="result-name">${escapeHTML(item.name)}${quality === undefined ? '' : `<small class="result-quality">${qualityNames[quality]}</small>`}</span><small>#${item.itemId}</small></button>`;
    }).join('');
    results.hidden = !matches.length;
  } catch {
    if (!form.isConnected || lookupVersions[index] !== version) return;
    message.textContent = 'Search is unavailable. Try a Wowhead URL or item ID.';
  }
  button.disabled = false;
});

tableElement.addEventListener('input', event => {
  if (!(event.target instanceof HTMLInputElement) || !event.target.matches('.stat-input')) return;
  if (event.target.hasAttribute('data-weapon-dps')) {
    const item = state.items[itemIndex(event.target.dataset.index)];
    item.weaponDps = event.target.value === '' ? (item.id ? undefined : null) : Math.max(0, Number(event.target.value) || 0);
    updateResults(); save(); return;
  }
  const stat = statKey(event.target.dataset.stat);
  if (!stat) return;
  state.items[itemIndex(event.target.dataset.index)].stats[stat] = Number(event.target.value) || 0;
  updateResults(); save();
});

function useCustomProfile() {
  if (state.profile === 'preset') {
    state.customWeights = { ...state.weights };
    state.customWeaponWeights = { ...state.weaponWeights };
  }
  state.profile = 'custom';
  profileElement.value = 'custom';
  element('#profile-description').textContent = 'Your custom weights';
}

weightsElement.addEventListener('input', event => {
  if (!(event.target instanceof HTMLInputElement)) return;
  const stat = statKey(event.target.dataset.stat);
  if (!stat) return;
  useCustomProfile();
  state.weights[stat] = Math.max(0, Number(event.target.value) || 0);
  state.customWeights = { ...state.weights };
  updateResults(); save();
});

weaponWeightsElement.addEventListener('input', event => {
  if (!(event.target instanceof HTMLInputElement)) return;
  const hand = event.target.dataset.hand;
  if (hand !== 'mainHand' && hand !== 'offHand') return;
  useCustomProfile();
  state.weaponWeights[hand] = Math.max(0, Number(event.target.value) || 0);
  state.customWeaponWeights = { ...state.weaponWeights };
  updateResults(); save();
});

weaponHandElement.addEventListener('change', () => {
  state.weaponHand = weaponHandElement.value === 'offHand' ? 'offHand' : 'mainHand';
  updateResults(); save();
});

profileElement.addEventListener('change', () => {
  state.profile = profileElement.value === 'custom' ? 'custom' : 'preset';
  state.weights = state.profile === 'preset' ? defaultWeights() : { ...state.customWeights };
  state.weaponWeights = state.profile === 'preset' ? defaultWeaponWeights() : { ...state.customWeaponWeights };
  renderWeights(); updateResults(); save();
});
const resetButton = element<HTMLButtonElement>('#reset-weights');
resetButton.replaceChildren(createElement(RotateCcw, { width: 14, height: 14, 'aria-hidden': 'true' }), ' Reset to preset');
resetButton.addEventListener('click', () => { state.weights = defaultWeights(); state.weaponWeights = defaultWeaponWeights(); state.profile = 'preset'; renderWeights(); updateResults(); save(); });
const swapButton = element<HTMLButtonElement>('#swap');
swapButton.replaceChildren(createElement(ArrowLeftRight, { width: 16, height: 16, 'aria-hidden': 'true' }), ' Swap items');
swapButton.addEventListener('click', () => { state.items.reverse(); renderAll(); });
const refreshInventory = setupInventory(() => ({ weights: state.weights, weaponWeights: state.weaponWeights }), loadItemIndex);
function showView() {
  const inventory = location.hash === '#inventory';
  element<HTMLElement>('.comparison').hidden = inventory;
  element<HTMLElement>('#gear-workspace').hidden = !inventory;
  document.querySelectorAll<HTMLAnchorElement>('[data-view]').forEach(link => {
    const active = link.dataset.view === (inventory ? 'inventory' : 'compare');
    link.classList.toggle('nav-active', active);
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  element('h1').innerHTML = inventory ? 'My gear<span>.</span>' : 'Item comparison<span>.</span>';
  element('.page-heading p').textContent = inventory ? 'Compare the gear you already have.' : 'Know what your next upgrade is worth.';
  element('.breadcrumb strong').textContent = inventory ? 'MY GEAR' : 'ITEM COMPARE';
  element('.heading-meta strong').textContent = inventory ? 'MY GEAR' : 'ITEM COMPARISON';
}
window.addEventListener('hashchange', showView);
showView();
renderAll();

for (const item of state.items) {
  if (!item.id || (validQuality(item.quality) !== undefined && item.weaponDps !== undefined)) continue;
  void Effect.runPromise(fetchWowheadItem(item.id, item.bonus)).then(data => {
    const index = state.items.indexOf(item);
    if (index < 0) return;
    if (validQuality(item.quality) === undefined) {
      const quality = validQuality(data.quality) ?? qualityFromTooltip(data.tooltip);
      if (quality !== undefined) {
        item.quality = quality;
        element<HTMLElement>(`.item-${index} .item-identity`).dataset.quality = String(quality);
        const label = element<HTMLElement>(`.item-${index} .item-quality`);
        label.textContent = `${qualityNames[quality]} ·`;
        label.hidden = false;
      }
    }
    if (item.weaponDps === undefined) {
      const weapon = parseTooltipWeapon(data.tooltip);
      item.weaponDps = weapon === undefined ? undefined : weapon?.dps ?? null;
      item.weaponSpeed = weapon?.speed ?? null;
      element<HTMLInputElement>(`.stat-input[data-weapon-dps][data-index="${index}"]`).value = item.weaponDps == null ? '' : String(item.weaponDps);
      const speed = element<HTMLElement>(`.item-${index} .weapon-speed`);
      speed.textContent = item.weaponSpeed ? ` · Speed ${format(item.weaponSpeed)}s` : '';
      speed.hidden = !item.weaponSpeed;
      updateResults();
    }
    save();
  }).catch(() => {});
}