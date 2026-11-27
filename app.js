// ---------- PWA ICON & MANIFEST SETUP ----------
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
});

function generateAppIconDataUrl(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const r = size * 0.22;

  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#09090b');
  grad.addColorStop(1, '#132a24');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = size * 0.045;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.34, -Math.PI * 0.4, Math.PI * 1.15);
  ctx.stroke();

  ctx.fillStyle = '#f4f4f5';
  ctx.font = `bold ${Math.round(size * 0.28)}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('F&F', size / 2, size / 2 + size * 0.02);

  return canvas.toDataURL('image/png');
}

(function initPwaMetadata() {
  try {
    const icon192 = generateAppIconDataUrl(192);
    const icon512 = generateAppIconDataUrl(512);
    document.getElementById('apple-icon').href = icon192;
    const manifest = {
      name: 'Fuel & Flow — Kalorien, Rezepte & Habits',
      short_name: 'Fuel & Flow',
      start_url: '.',
      display: 'standalone',
      background_color: '#09090b',
      theme_color: '#09090b',
      icons: [
        { src: icon192, sizes: '192x192', type: 'image/png' },
        { src: icon512, sizes: '512x512', type: 'image/png' }
      ]
    };
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
    document.getElementById('manifest-link').href = URL.createObjectURL(blob);
  } catch (e) {}
})();

// ---------- STATE & STORAGE ----------
const STORAGE_KEY = 'fuel_and_flow_v4';

function formatDateStr(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getTodayStr() {
  return formatDateStr(new Date());
}

function getPastDateStr(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return formatDateStr(d);
}

// Normalisiert alte boolean-Werte (true/false) auf 'consumed' | 'clean' | null
function normalizeHabitStatus(val) {
  if (val === 'consumed' || val === true) return 'consumed';
  if (val === 'clean' || val === false) return 'clean';
  return null; // nicht erfasst -> Gelb
}

// Aggregierter Nikotin-Status: Rot ('consumed') sobald Zigaretten ODER Vape konsumiert wurden
function getCombinedNicotineStatus(log) {
  if (!log || !log.badHabits) return null;
  const cig = normalizeHabitStatus(log.badHabits.cigarettes);
  const vape = normalizeHabitStatus(log.badHabits.vape);
  if (cig === 'consumed' || vape === 'consumed') return 'consumed';
  if (cig === 'clean' || vape === 'clean') return 'clean';
  return null;
}

function buildInitialState() {
  const today = getTodayStr();
  const logs = {};
  for (let i = 0; i < 7; i++) {
    const ds = getPastDateStr(i);
    logs[ds] = {
      entries: [],
      sportDone: [],
      badHabits: {
        cigarettes: i === 0 ? null : 'consumed',
        vape: i === 0 ? null : 'clean',
        alcohol: i === 0 ? 'consumed' : 'clean'
      }
    };
  }

  return {
    selectedDate: today,
    calorieGoal: 2400,
    proteinGoal: 160,
    carbsGoal: 260,
    fatGoal: 75,
    recipes: [
      {
        id: 'rec_porridge',
        name: 'Protein-Porridge Basis',
        items: [
          { id: 'i1', name: 'Haferflocken (zart)', grams: 80, kcal100: 372, p100: 13.5, c100: 58.7, f100: 7.0 },
          { id: 'i2', name: 'Sojamilch ungesüßt', grams: 250, kcal100: 33, p100: 3.3, c100: 0.2, f100: 1.8 },
          { id: 'i3', name: 'Apfel (frisch)', grams: 140, kcal100: 52, p100: 0.3, c100: 13.8, f100: 0.2 },
          { id: 'i4', name: 'Walnüsse', grams: 15, kcal100: 654, p100: 15.2, c100: 13.7, f100: 65.2 }
        ]
      },
      {
        id: 'rec_tofu_bowl',
        name: 'Räuchertofu-Reis-Bowl',
        items: [
          { id: 'i5', name: 'Räuchertofu', grams: 175, kcal100: 176, p100: 18.0, c100: 2.1, f100: 10.5 },
          { id: 'i6', name: 'Basmatireis (roh)', grams: 90, kcal100: 350, p100: 7.5, c100: 77.0, f100: 0.8 },
          { id: 'i7', name: 'Brokkoli', grams: 200, kcal100: 34, p100: 2.8, c100: 6.6, f100: 0.4 },
          { id: 'i8', name: 'Olivenöl', grams: 10, kcal100: 884, p100: 0, c100: 0, f100: 100 }
        ]
      }
    ],
    sportHabits: [
      { id: 'sp_gym', name: 'Gym / Krafttraining' },
      { id: 'sp_run', name: 'Laufen' },
      { id: 'sp_surf', name: 'Surfen / Mobility' }
    ],
    weightHistory: [
      { date: getPastDateStr(14), weight: 74.6, bodyFat: 16.4, muscle: 59.1 },
      { date: getPastDateStr(7), weight: 74.2, bodyFat: 16.1, muscle: 59.3 },
      { date: today, weight: 74.0, bodyFat: 15.9, muscle: 59.4 }
    ],
    logs
  };
}

let state = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        parsed.recipes = Array.isArray(parsed.recipes) ? parsed.recipes : [];
        parsed.sportHabits = Array.isArray(parsed.sportHabits) ? parsed.sportHabits : [];
        parsed.weightHistory = Array.isArray(parsed.weightHistory) ? parsed.weightHistory : [];
        parsed.logs = parsed.logs && typeof parsed.logs === 'object' ? parsed.logs : {};
        return parsed;
      }
    }
  } catch (e) {}
  return buildInitialState();
})();

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {}
}

function ensureDayLog(dateStr) {
  if (!state.logs[dateStr]) {
    state.logs[dateStr] = {
      entries: [],
      sportDone: [],
      badHabits: { cigarettes: null, vape: null, alcohol: null }
    };
  }
  if (!state.logs[dateStr].badHabits) {
    state.logs[dateStr].badHabits = { cigarettes: null, vape: null, alcohol: null };
  }
  ['cigarettes', 'vape', 'alcohol'].forEach(k => {
    state.logs[dateStr].badHabits[k] = normalizeHabitStatus(state.logs[dateStr].badHabits[k]);
  });
  return state.logs[dateStr];
}

// ---------- NAVIGATION & UI STATE ----------
let currentTab = 'dashboard';
let navHistory = ['dashboard'];
let editingRecipe = null;
let searchResultsCache = [];
let selectedHeatmapMetric = 'alcohol'; // 'alcohol' | 'nicotine' | 'sport'

let chartRangeDays = 14; // 7 | 14 | 30
let selectedChartDate = null;

function switchTab(tab, pushHistory = true) {
  if (pushHistory && currentTab !== tab) {
    navHistory.push(tab);
  }
  currentTab = tab;
  if (tab !== 'recipes') editingRecipe = null;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBack() {
  if (editingRecipe) {
    editingRecipe = null;
    render();
    return;
  }
  if (navHistory.length > 1) {
    navHistory.pop();
    currentTab = navHistory[navHistory.length - 1];
  } else {
    currentTab = 'dashboard';
  }
  render();
}

function openManageHabits(sectionId) {
  switchTab('habits');
  setTimeout(() => {
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 60);
}

function setHeatmapMetric(metric) {
  selectedHeatmapMetric = metric;
  render();
}

// ---------- FOOD API (OPEN FOOD FACTS + USDA) ----------
const DE_TO_EN = {
  'apfel': 'apple raw',
  'banane': 'banana raw',
  'haferflocken': 'oats rolled',
  'tofu': 'tofu firm',
  'räuchertofu': 'smoked tofu',
  'reis': 'rice white raw',
  'brokkoli': 'broccoli raw',
  'magerquark': 'quark low fat',
  'hähnchen': 'chicken breast',
  'lachs': 'salmon raw',
  'ei': 'egg whole raw',
  'eier': 'egg whole raw',
  'kartoffel': 'potato raw',
  'kartoffeln': 'potato raw',
  'süßkartoffel': 'sweet potato raw',
  'linsen': 'lentils dry',
  'mandeln': 'almonds',
  'walnüsse': 'walnuts',
  'avocado': 'avocado',
  'sojamilch': 'soy milk unsweetened',
  'hafermilch': 'oat milk',
  'käse': 'cheese',
  'brot': 'sourdough bread'
};

async function searchFoodsLive(query) {
  const q = (query || '').trim();
  if (q.length < 2) return [];
  const results = [];

  const offPromise = fetch(`https://de.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=12`)
    .then(r => r.json())
    .then(data => {
      (data.products || []).forEach(p => {
        const n = p.nutriments || {};
        const kcal = Number(n['energy-kcal_100g'] || n['energy-kcal'] || 0);
        if (!p.product_name || kcal <= 0) return;
        results.push({
          name: p.brands ? `${p.product_name} (${p.brands.split(',')[0]})` : p.product_name,
          source: 'Open Food Facts',
          kcal100: Math.round(kcal),
          p100: Math.round((Number(n.proteins_100g) || 0) * 10) / 10,
          c100: Math.round((Number(n.carbohydrates_100g) || 0) * 10) / 10,
          f100: Math.round((Number(n.fat_100g) || 0) * 10) / 10
        });
      });
    })
    .catch(() => {});

  const enQuery = DE_TO_EN[q.toLowerCase()] || q;
  const usdaPromise = fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=DEMO_KEY&query=${encodeURIComponent(enQuery)}&pageSize=8`)
    .then(r => r.json())
    .then(data => {
      (data.foods || []).forEach(f => {
        const getNut = (num) => {
          const found = (f.foodNutrients || []).find(x => String(x.nutrientNumber) === num || x.nutrientId === Number(num));
          return found ? Number(found.value) : 0;
        };
        const kcal = getNut('208') || getNut('1008');
        if (!f.description || kcal <= 0) return;
        results.push({
          name: f.description,
          source: 'USDA FoodData',
          kcal100: Math.round(kcal),
          p100: Math.round((getNut('203') || getNut('1003')) * 10) / 10,
          c100: Math.round((getNut('205') || getNut('1005')) * 10) / 10,
          f100: Math.round((getNut('204') || getNut('1004')) * 10) / 10
        });
      });
    })
    .catch(() => {});

  await Promise.all([offPromise, usdaPromise]);
  searchResultsCache = results.slice(0, 18);
  return searchResultsCache;
}

// ---------- HELPERS ----------
function calcRecipeTotals(recipe) {
  return (recipe.items || []).reduce((acc, it) => {
    const factor = (Number(it.grams) || 0) / 100;
    acc.grams += Number(it.grams) || 0;
    acc.kcal += (it.kcal100 || 0) * factor;
    acc.p += (it.p100 || 0) * factor;
    acc.c += (it.c100 || 0) * factor;
    acc.f += (it.f100 || 0) * factor;
    return acc;
  }, { grams: 0, kcal: 0, p: 0, c: 0, f: 0 });
}

function changeSelectedDate(offsetDays) {
  const parts = state.selectedDate.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + offsetDays);
  state.selectedDate = formatDateStr(d);
  saveState();
  render();
}

function formatDisplayDate(dateStr) {
  if (dateStr === getTodayStr()) return 'Heute';
  if (dateStr === getPastDateStr(1)) return 'Gestern';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

function getLastNDays(n) {
  const days = [];
  const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = formatDateStr(d);
    days.push({
      dateStr: ds,
      dayNum: String(d.getDate()).padStart(2, '0'),
      monthNum: String(d.getMonth() + 1).padStart(2, '0'),
      weekdayIdx: d.getDay(),
      weekdayShort: weekdays[d.getDay()],
      label: i === 0 ? 'Heute' : weekdays[d.getDay()]
    });
  }
  return days;
}

function getLast7Days() {
  return getLastNDays(7);
}

function calcCleanStreak(habitKey) {
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const ds = getPastDateStr(i);
    const log = state.logs[ds];
    const status = habitKey === 'nicotine'
      ? getCombinedNicotineStatus(log)
      : (log && log.badHabits ? normalizeHabitStatus(log.badHabits[habitKey]) : null);
    if (status === 'clean') {
      streak++;
    } else if (i === 0 && status === null) {
      continue;
    } else {
      break;
    }
  }
  return streak;
}

// Zyklisches Umschalten: null (Gelb) -> 'clean' (Grün) -> 'consumed' (Rot) -> null (Gelb)
function cycleBadHabitDay(habitKey, dateStr) {
  const log = ensureDayLog(dateStr);
  const cur = normalizeHabitStatus(log.badHabits[habitKey]);
  if (cur === null) log.badHabits[habitKey] = 'clean';
  else if (cur === 'clean') log.badHabits[habitKey] = 'consumed';
  else log.badHabits[habitKey] = null;
  saveState();
  render();
}

// Klick auf die übergeordnete Nikotin-Heatmap-Kachel schaltet beide Unterpunkte gemeinsam durch
function cycleCombinedNicotineDay(dateStr) {
  const log = ensureDayLog(dateStr);
  const cur = getCombinedNicotineStatus(log);
  const next = cur === null ? 'clean' : (cur === 'clean' ? 'consumed' : null);
  log.badHabits.cigarettes = next;
  log.badHabits.vape = next;
  saveState();
  render();
}

function toggleSportHabit(sportId, targetDate = state.selectedDate) {
  const log = ensureDayLog(targetDate);
  const idx = log.sportDone.indexOf(sportId);
  if (idx >= 0) log.sportDone.splice(idx, 1);
  else log.sportDone.push(sportId);
  saveState();
  render();
}

function toggleHeatmapSportDay(dateStr) {
  const log = ensureDayLog(dateStr);
  if (log.sportDone && log.sportDone.length > 0) {
    log.sportDone = [];
  } else if (state.sportHabits.length > 0) {
    log.sportDone = [state.sportHabits[0].id];
  }
  saveState();
  render();
}

// ---------- KORRELATIONS-INSIGHTS ENGINE ----------
function computeHabitInsights() {
  const days30 = getLastNDays(30);
  const insights = [];

  let sportTracked = 0, sportNicClean = 0;
  let restTracked = 0, restNicClean = 0;

  let alcKcalSum = 0, alcKcalDays = 0;
  let cleanAlcKcalSum = 0, cleanAlcKcalDays = 0;

  const weekdayConsumedCounts = [0, 0, 0, 0, 0, 0, 0];
  const weekdayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

  days30.forEach(d => {
    const log = state.logs[d.dateStr];
    if (!log) return;

    const hasSport = Array.isArray(log.sportDone) && log.sportDone.length > 0;
    const nicStatus = getCombinedNicotineStatus(log);
    const alc = log.badHabits ? normalizeHabitStatus(log.badHabits.alcohol) : null;

    if (nicStatus !== null) {
      if (hasSport) {
        sportTracked++;
        if (nicStatus === 'clean') sportNicClean++;
      } else {
        restTracked++;
        if (nicStatus === 'clean') restNicClean++;
      }
    }

    const dayKcal = (log.entries || []).reduce((s, e) => s + (Number(e.kcal) || 0), 0);
    if (dayKcal > 200) {
      if (alc === 'consumed') {
        alcKcalSum += dayKcal;
        alcKcalDays++;
      } else if (alc === 'clean') {
        cleanAlcKcalSum += dayKcal;
        cleanAlcKcalDays++;
      }
    }

    if (alc === 'consumed') weekdayConsumedCounts[d.weekdayIdx]++;
    if (nicStatus === 'consumed') weekdayConsumedCounts[d.weekdayIdx]++;
  });

  if (sportTracked >= 2 && restTracked >= 2) {
    const sportPct = Math.round((sportNicClean / sportTracked) * 100);
    const restPct = Math.round((restNicClean / restTracked) * 100);
    const diff = sportPct - restPct;
    insights.push({
      icon: '🏃‍♂️',
      title: 'Sport & Nikotin-Balance',
      text: diff >= 0
        ? `An Trainingstagen bist du zu <strong>${sportPct} %</strong> nikotinfrei (vs. ${restPct} % an Ruhetagen${diff > 0 ? `, +${diff} %-Punkte` : ''}).`
        : `An Trainingstagen liegt deine nikotinfreie Quote bei <strong>${sportPct} %</strong> (Ruhetage: ${restPct} %).`
    });
  } else {
    insights.push({
      icon: '🏃‍♂️',
      title: 'Sport & Verzicht-Korrelation',
      text: `Logge weitere Sport-Einheiten und Nikotin-Tage, um deine persönliche Trainings-Korrelation freizuschalten (${sportTracked + restTracked}/4 erfasste Vergleichstage).`
    });
  }

  if (alcKcalDays >= 1 && cleanAlcKcalDays >= 1) {
    const avgAlc = Math.round(alcKcalSum / alcKcalDays);
    const avgClean = Math.round(cleanAlcKcalSum / cleanAlcKcalDays);
    const delta = avgAlc - avgClean;
    insights.push({
      icon: '🍽️',
      title: 'Alkohol & Kalorienbilanz',
      text: delta > 0
        ? `An Alkohol-Tagen nimmst du im Schnitt <strong>${avgAlc} kcal</strong> auf — das sind <strong>+${delta} kcal</strong> mehr als an Clean-Tagen (${avgClean} kcal).`
        : `An Alkohol-Tagen liegst du im Schnitt bei <strong>${avgAlc} kcal</strong> gegenüber <strong>${avgClean} kcal</strong> an Clean-Tagen.`
    });
  } else {
    insights.push({
      icon: '🍽️',
      title: 'Kalorien-Vergleich (Alkohol vs. Clean)',
      text: `Sobald mindestens je 1 Alkohol-Tag und 1 Clean-Tag mit Mahlzeiten erfasst sind, erscheint hier dein Kalorien-Delta.`
    });
  }

  const maxConsumed = Math.max(...weekdayConsumedCounts);
  if (maxConsumed > 0) {
    const peakIdx = weekdayConsumedCounts.indexOf(maxConsumed);
    insights.push({
      icon: '📅',
      title: 'Wochentags-Fokus',
      text: `In den letzten 30 Tagen trat Konsum am häufigsten am <strong>${weekdayNames[peakIdx]}</strong> auf (${maxConsumed} Ereignisse).`
    });
  }

  return insights;
}

function logRecipeToDay(recipeId, multiplier = 1) {
  const rec = state.recipes.find(r => r.id === recipeId);
  if (!rec) return;
  const tot = calcRecipeTotals(rec);
  const log = ensureDayLog(state.selectedDate);
  log.entries.push({
    id: 'ent_' + Date.now(),
    name: multiplier === 1 ? rec.name : `${rec.name} (${multiplier}x)`,
    kcal: Math.round(tot.kcal * multiplier),
    p: Math.round(tot.p * multiplier * 10) / 10,
    c: Math.round(tot.c * multiplier * 10) / 10,
    f: Math.round(tot.f * multiplier * 10) / 10
  });
  saveState();
  closeModal();
  render();
}

function deleteDayEntry(entryId) {
  const log = ensureDayLog(state.selectedDate);
  log.entries = log.entries.filter(e => e.id !== entryId);
  saveState();
  render();
}

// ---------- FEATURE 1: GEWICHTS- & KALORIEN-VERLAUFSCHART ----------
function setChartRange(days) {
  chartRangeDays = days;
  selectedChartDate = null;
  render();
}

function selectChartDay(dateStr) {
  selectedChartDate = selectedChartDate === dateStr ? null : dateStr;
  render();
}

function renderWeightCalorieChart() {
  const days = getLastNDays(chartRangeDays);
  const weightMap = {};
  [...state.weightHistory]
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(w => { weightMap[w.date] = Number(w.weight); });

  // Letztes bekanntes Gewicht vor dem Zeitfenster als Ausgangswert ermitteln
  const priorWeights = [...state.weightHistory]
    .filter(w => w.date < days[0].dateStr)
    .sort((a, b) => a.date.localeCompare(b.date));
  let carryWeight = priorWeights.length
    ? Number(priorWeights[priorWeights.length - 1].weight)
    : (state.weightHistory.length ? Number(state.weightHistory[0].weight) : 74.0);

  const series = days.map(d => {
    const exactWeight = weightMap[d.dateStr] !== undefined ? weightMap[d.dateStr] : null;
    if (exactWeight !== null) carryWeight = exactWeight;
    const log = state.logs[d.dateStr];
    const kcal = log && Array.isArray(log.entries)
      ? log.entries.reduce((sum, e) => sum + (Number(e.kcal) || 0), 0)
      : 0;
    return {
      dateStr: d.dateStr,
      shortLabel: `${d.dayNum}.${d.monthNum}`,
      weight: carryWeight,
      exactWeight,
      kcal
    };
  });

  const weights = series.map(s => s.weight);
  const minW = Math.min(...weights) - 0.4;
  const maxW = Math.max(...weights) + 0.4;
  const spanW = Math.max(0.5, maxW - minW);
  const maxKcal = Math.max(state.calorieGoal * 1.15, ...series.map(s => s.kcal), 2500);

  const W = 560, H = 175;
  const padL = 34, padR = 12, padT = 16, padB = 24;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const stepX = series.length > 1 ? plotW / (series.length - 1) : plotW;
  const barW = Math.max(4, Math.min(16, (plotW / series.length) * 0.55));

  const getX = (idx) => padL + idx * stepX;
  const getWeightY = (w) => padT + plotH - ((w - minW) / spanW) * plotH;
  const getKcalH = (k) => (k / maxKcal) * (plotH * 0.75);

  const linePoints = series.map((s, idx) => `${getX(idx).toFixed(1)},${getWeightY(s.weight).toFixed(1)}`).join(' ');
  const goalY = padT + plotH - getKcalH(state.calorieGoal);

  const activePoint = series.find(s => s.dateStr === selectedChartDate) || series[series.length - 1];
  const labelInterval = chartRangeDays === 7 ? 1 : (chartRangeDays === 14 ? 2 : 5);

  return `
    <div class="bg-zinc-950/70 border border-border rounded-2xl p-3 space-y-2.5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="text-xs text-zinc-300">
          <span class="font-semibold text-white">${activePoint.shortLabel}:</span>
          <span class="text-emerald-400 font-semibold">${activePoint.weight.toFixed(1)} kg</span>
          ${activePoint.exactWeight === null ? '<span class="text-[10px] text-zinc-500">(fortgeschrieben)</span>' : ''}
          · <span class="text-sky-400 font-semibold">${Math.round(activePoint.kcal)} kcal</span>
        </div>
        <div class="flex gap-1">
          ${[7, 14, 30].map(r => `
            <button onclick="setChartRange(${r})"
              class="px-2 py-0.5 rounded-lg text-[11px] font-medium transition ${
                chartRangeDays === r
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-border'
              }">
              ${r}T
            </button>
          `).join('')}
        </div>
      </div>

      <svg viewBox="0 0 ${W} ${H}" class="w-full h-44 overflow-visible select-none">
        <!-- Y-Achsen-Hilfslinien Gewicht -->
        <line x1="${padL}" y1="${padT}" x2="${W - padR}" y2="${padT}" stroke="#27272a" stroke-dasharray="3 3" />
        <line x1="${padL}" y1="${padT + plotH}" x2="${W - padR}" y2="${padT + plotH}" stroke="#27272a" />
        <text x="${padL - 5}" y="${padT + 4}" text-anchor="end" fill="#71717a" font-size="9">${maxW.toFixed(1)}</text>
        <text x="${padL - 5}" y="${padT + plotH}" text-anchor="end" fill="#71717a" font-size="9">${minW.toFixed(1)}</text>

        <!-- Kalorienziel-Referenzlinie -->
        <line x1="${padL}" y1="${goalY.toFixed(1)}" x2="${W - padR}" y2="${goalY.toFixed(1)}" stroke="#0ea5e9" stroke-opacity="0.35" stroke-dasharray="4 4" />

        <!-- Kalorienbalken -->
        ${series.map((s, idx) => {
          const x = getX(idx);
          const bh = getKcalH(s.kcal);
          const by = padT + plotH - bh;
          const isSelected = s.dateStr === activePoint.dateStr;
          return `
            <g class="cursor-pointer" onclick="selectChartDay('${s.dateStr}')">
              <rect x="${(x - barW / 2).toFixed(1)}" y="${by.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(0, bh).toFixed(1)}"
                rx="2" fill="${isSelected ? '#38bdf8' : '#0284c7'}" fill-opacity="${isSelected ? '0.65' : '0.3'}" />
              ${idx % labelInterval === 0 ? `
                <text x="${x.toFixed(1)}" y="${H - 6}" text-anchor="middle" fill="#71717a" font-size="9">${s.shortLabel}</text>
              ` : ''}
            </g>
          `;
        }).join('')}

        <!-- Gewichtslinie -->
        <polyline fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${linePoints}" />

        <!-- Datenpunkte -->
        ${series.map((s, idx) => {
          const x = getX(idx);
          const y = getWeightY(s.weight);
          const isSelected = s.dateStr === activePoint.dateStr;
          const hasMeasurement = s.exactWeight !== null;
          return `
            <g class="cursor-pointer" onclick="selectChartDay('${s.dateStr}')">
              <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="10" fill="transparent" />
              ${(hasMeasurement || isSelected) ? `
                <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${isSelected ? 4.5 : 3}"
                  fill="${isSelected ? '#34d399' : '#10b981'}" stroke="#09090b" stroke-width="1.5" />
              ` : ''}
            </g>
          `;
        }).join('')}
      </svg>

      <div class="flex items-center justify-between text-[10px] text-zinc-400 pt-0.5">
        <div class="flex items-center gap-3">
          <span class="flex items-center gap-1 text-emerald-300"><span class="w-2.5 h-0.5 bg-emerald-400 inline-block"></span> Gewicht (kg)</span>
          <span class="flex items-center gap-1 text-sky-300"><span class="w-2 h-2 rounded-sm bg-sky-500/50 inline-block"></span> Kalorien (kcal)</span>
        </div>
        <span>Tag antippen für Details</span>
      </div>
    </div>
  `;
}

// ---------- RENDERING ----------
function render() {
  const backBtn = document.getElementById('back-btn');
  if (currentTab !== 'dashboard' || editingRecipe) {
    backBtn.classList.remove('hidden');
  } else {
    backBtn.classList.add('hidden');
  }

  document.querySelectorAll('.nav-btn').forEach(btn => {
    const active = btn.dataset.tab === currentTab;
    btn.className = `nav-btn flex flex-col items-center py-1.5 rounded-xl text-xs font-medium transition ${
      active ? 'bg-emerald-500/15 text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'
    }`;
  });

  const container = document.getElementById('app-content');
  if (currentTab === 'dashboard') container.innerHTML = renderDashboard();
  else if (currentTab === 'recipes') container.innerHTML = renderRecipesTab();
  else if (currentTab === 'search') container.innerHTML = renderSearchTab();
  else if (currentTab === 'habits') container.innerHTML = renderHabitsTab();
}

function renderDashboard() {
  const log = ensureDayLog(state.selectedDate);
  const totals = log.entries.reduce((a, e) => {
    a.kcal += e.kcal;
    a.p += e.p;
    a.c += e.c;
    a.f += e.f;
    return a;
  }, { kcal: 0, p: 0, c: 0, f: 0 });

  const kcalPct = Math.min(100, Math.round((totals.kcal / state.calorieGoal) * 100));
  const days7 = getLast7Days();

  const sortedW = [...state.weightHistory].sort((a, b) => a.date.localeCompare(b.date));
  const latestW = sortedW[sortedW.length - 1] || { weight: 74.0, bodyFat: 15.9, muscle: 59.4, date: getTodayStr() };
  const prevW = sortedW.length > 1 ? sortedW[sortedW.length - 2] : latestW;
  const deltaW = Math.round((latestW.weight - prevW.weight) * 10) / 10;

  const renderConsumptionRow = (key, title, subtitle) => {
    const streak = calcCleanStreak(key);
    const todayStatus = normalizeHabitStatus(ensureDayLog(getTodayStr()).badHabits[key]);

    let badgeClass = 'bg-amber-400/15 text-amber-300 border border-amber-400/35';
    let badgeText = 'Heute offen';
    if (todayStatus === 'consumed') {
      badgeClass = 'bg-rose-500/20 text-rose-300 border border-rose-500/40';
      badgeText = 'Heute konsumiert';
    } else if (todayStatus === 'clean') {
      badgeClass = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
      badgeText = `${streak}d clean`;
    } else if (streak > 0) {
      badgeText = `${streak}d clean · Heute offen`;
    }

    return `
      <div class="bg-zinc-900/80 border border-border rounded-2xl p-3.5 space-y-2.5">
        <div class="flex items-center justify-between gap-2">
          <div>
            <div class="text-sm font-medium text-white">${title}</div>
            <div class="text-[11px] text-zinc-400">${subtitle}</div>
          </div>
          <div class="text-right shrink-0">
            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-medium ${badgeClass}">
              ${badgeText}
            </span>
          </div>
        </div>
        <div class="grid grid-cols-7 gap-1.5">
          ${days7.map(d => {
            const status = normalizeHabitStatus(ensureDayLog(d.dateStr).badHabits[key]);
            let tileStyle = 'bg-amber-400/15 border-amber-400/45 text-amber-300 hover:bg-amber-400/25';
            let icon = '?';
            let stateLabel = 'Nicht erfasst';

            if (status === 'clean') {
              tileStyle = 'bg-emerald-500/20 border-emerald-500/55 text-emerald-300 hover:bg-emerald-500/30';
              icon = '✓';
              stateLabel = 'Clean';
            } else if (status === 'consumed') {
              tileStyle = 'bg-rose-500/25 border-rose-500/60 text-rose-300 hover:bg-rose-500/35';
              icon = '✕';
              stateLabel = 'Konsumiert';
            }

            return `
              <button onclick="cycleBadHabitDay('${key}', '${d.dateStr}')"
                title="${d.label}: ${stateLabel} (Tippen zum Wechseln)"
                class="py-1.5 rounded-xl text-center border transition ${tileStyle}">
                <div class="text-[10px] opacity-85 font-medium">${d.label}</div>
                <div class="text-xs font-bold mt-0.5">${icon}</div>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  };

  const nicTodayStatus = getCombinedNicotineStatus(ensureDayLog(getTodayStr()));
  const nicStreak = calcCleanStreak('nicotine');

  let nicBadgeClass = 'bg-amber-400/15 text-amber-300 border border-amber-400/35';
  let nicBadgeText = nicStreak > 0 ? `${nicStreak}d clean · Heute offen` : 'Heute offen';
  if (nicTodayStatus === 'consumed') {
    nicBadgeClass = 'bg-rose-500/20 text-rose-300 border border-rose-500/40';
    nicBadgeText = 'Heute Konsum erfasst';
  } else if (nicTodayStatus === 'clean') {
    nicBadgeClass = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
    nicBadgeText = `${nicStreak}d clean`;
  }

  return `
    <!-- Date Selector -->
    <div class="flex items-center justify-between bg-card border border-border rounded-2xl px-3.5 py-2.5">
      <button onclick="changeSelectedDate(-1)" class="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200">←</button>
      <div class="text-center">
        <div class="text-sm font-semibold text-white">${formatDisplayDate(state.selectedDate)}</div>
        <div class="text-[11px] text-zinc-400">${state.selectedDate}</div>
      </div>
      <button onclick="changeSelectedDate(1)" class="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200">→</button>
    </div>

    <!-- Calories & Macros Card -->
    <section class="bg-card border border-border rounded-3xl p-4 space-y-4">
      <div class="flex items-start justify-between">
        <div>
          <h2 class="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Tagesbilanz</h2>
          <div class="mt-1 flex items-baseline gap-2">
            <span class="text-2xl font-bold text-white">${Math.round(totals.kcal)}</span>
            <span class="text-xs text-zinc-400">/ ${state.calorieGoal} kcal</span>
          </div>
        </div>
        <div class="flex gap-1.5">
          <button onclick="openQuickLogModal()" class="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition">
            + Mahlzeit
          </button>
          <button onclick="openGoalModal()" class="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs">
            Ziele
          </button>
        </div>
      </div>

      <div class="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
        <div class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all" style="width:${kcalPct}%"></div>
      </div>

      <div class="grid grid-cols-3 gap-2.5 pt-1">
        <div class="bg-zinc-900/80 border border-border rounded-2xl p-2.5">
          <div class="text-[11px] text-zinc-400">Protein</div>
          <div class="text-sm font-semibold text-sky-400 mt-0.5">${Math.round(totals.p)}g <span class="text-[11px] text-zinc-500">/ ${state.proteinGoal}g</span></div>
        </div>
        <div class="bg-zinc-900/80 border border-border rounded-2xl p-2.5">
          <div class="text-[11px] text-zinc-400">Carbs</div>
          <div class="text-sm font-semibold text-amber-400 mt-0.5">${Math.round(totals.c)}g <span class="text-[11px] text-zinc-500">/ ${state.carbsGoal}g</span></div>
        </div>
        <div class="bg-zinc-900/80 border border-border rounded-2xl p-2.5">
          <div class="text-[11px] text-zinc-400">Fett</div>
          <div class="text-sm font-semibold text-rose-400 mt-0.5">${Math.round(totals.f)}g <span class="text-[11px] text-zinc-500">/ ${state.fatGoal}g</span></div>
        </div>
      </div>

      ${log.entries.length > 0 ? `
        <div class="space-y-1.5 pt-1 border-t border-border">
          ${log.entries.map(e => `
            <div class="flex items-center justify-between text-xs py-1.5 px-2 rounded-xl bg-zinc-900/50">
              <div>
                <span class="font-medium text-zinc-200">${e.name}</span>
                <span class="text-zinc-500 ml-2">${e.kcal} kcal · P ${e.p}g</span>
              </div>
              <button onclick="deleteDayEntry('${e.id}')" class="text-zinc-500 hover:text-rose-400 px-1.5">✕</button>
            </div>
          `).join('')}
        </div>
      ` : `<p class="text-xs text-zinc-500">Noch keine Mahlzeiten für ${formatDisplayDate(state.selectedDate)} eingetragen.</p>`}
    </section>

    <!-- Sport & Bewegung Cluster -->
    <section class="bg-card border border-border rounded-3xl p-4 space-y-3">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-sm font-semibold text-white">Sport & Bewegung</h2>
          <p class="text-[11px] text-zinc-400">Aktive Einheiten für ${formatDisplayDate(state.selectedDate)}</p>
        </div>
        <button onclick="openManageHabits('sec-sport')" class="text-xs text-emerald-400 hover:text-emerald-300 font-medium">
          Alle verwalten →
        </button>
      </div>
      <div class="flex flex-wrap gap-2">
        ${state.sportHabits.map(sp => {
          const done = log.sportDone.includes(sp.id);
          return `
            <button onclick="toggleSportHabit('${sp.id}')"
              class="px-3.5 py-2 rounded-2xl text-xs font-medium border transition flex items-center gap-2 ${
                done
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-zinc-900 border-border text-zinc-300 hover:bg-zinc-800'
              }">
              <span>${done ? '✓' : '○'}</span>
              <span>${sp.name}</span>
            </button>
          `;
        }).join('')}
      </div>
    </section>

    <!-- Konsum / Bad Habits -->
    <section class="bg-card border border-border rounded-3xl p-4 space-y-3.5">
      <div class="flex items-start justify-between gap-2">
        <div>
          <h2 class="text-sm font-semibold text-white">Konsum & Verzicht</h2>
          <p class="text-[11px] text-zinc-400">Tippen wechselt Status: Offen → Clean → Konsumiert</p>
        </div>
        <button onclick="openManageHabits('sec-heatmap')" class="text-xs text-emerald-400 hover:text-emerald-300 font-medium shrink-0">
          30d-Heatmap →
        </button>
      </div>

      <!-- Farblegende -->
      <div class="flex flex-wrap items-center gap-3 text-[11px] px-1">
        <span class="flex items-center gap-1.5 text-emerald-300">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Clean
        </span>
        <span class="flex items-center gap-1.5 text-rose-300">
          <span class="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Konsumiert
        </span>
        <span class="flex items-center gap-1.5 text-amber-300">
          <span class="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span> Nicht erfasst
        </span>
      </div>

      <!-- Alkohol -->
      ${renderConsumptionRow('alcohol', '🍷 Alkohol', '7-Tage-Übersicht')}

      <!-- Nikotin Überbereich mit Zigaretten & Vape -->
      <div class="border border-border rounded-2xl p-3.5 bg-zinc-950/50 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-zinc-300">💨 Nikotin</span>
          <span class="text-[11px] px-2.5 py-0.5 rounded-full font-medium ${nicBadgeClass}">
            ${nicBadgeText}
          </span>
        </div>
        <div class="space-y-2.5 pl-1 border-l-2 border-zinc-800">
          ${renderConsumptionRow('cigarettes', 'Zigaretten', 'Unterpunkt Nikotin')}
          ${renderConsumptionRow('vape', 'Vape', 'Unterpunkt Nikotin')}
        </div>
      </div>
    </section>

    <!-- Gewicht & Smartwaage (FitDays) -->
    <section class="bg-card border border-border rounded-3xl p-4 space-y-3">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-sm font-semibold text-white">Gewicht & Körperwerte (FitDays)</h2>
          <p class="text-[11px] text-zinc-400">Aktueller Stand & CSV-Sync</p>
        </div>
        <div class="flex gap-1.5">
          <label class="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 cursor-pointer">
            FitDays CSV
            <input type="file" accept=".csv" onchange="importFitDaysCsv(event)" class="hidden" />
          </label>
          <button onclick="openWeightModal()" class="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium">
            + Gewicht
          </button>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2.5">
        <div class="bg-zinc-900/80 border border-border rounded-2xl p-3">
          <div class="text-[11px] text-zinc-400">Aktuelles Gewicht</div>
          <div class="text-lg font-bold text-white mt-0.5">${latestW.weight.toFixed(1)} kg</div>
          <div class="text-[11px] ${deltaW <= 0 ? 'text-emerald-400' : 'text-amber-400'}">
            ${deltaW > 0 ? '+' : ''}${deltaW.toFixed(1)} kg Trend
          </div>
        </div>
        <div class="bg-zinc-900/80 border border-border rounded-2xl p-3">
          <div class="text-[11px] text-zinc-400">Körperfett</div>
          <div class="text-lg font-bold text-zinc-100 mt-0.5">${latestW.bodyFat ? latestW.bodyFat.toFixed(1) + '%' : '—'}</div>
          <div class="text-[11px] text-zinc-500">Smartwaage</div>
        </div>
        <div class="bg-zinc-900/80 border border-border rounded-2xl p-3">
          <div class="text-[11px] text-zinc-400">Muskelmasse</div>
          <div class="text-lg font-bold text-zinc-100 mt-0.5">${latestW.muscle ? latestW.muscle.toFixed(1) + ' kg' : '—'}</div>
          <div class="text-[11px] text-zinc-500">Stand ${latestW.date.slice(5)}</div>
        </div>
      </div>
    ${renderWeightCalorieChart()}
      </section>
  `;
}

function renderRecipesTab() {
  if (editingRecipe) {
    const tot = calcRecipeTotals(editingRecipe);
    return `
      <div class="bg-card border border-border rounded-3xl p-4 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-semibold text-white">Rezept-Baukasten</h2>
          <button onclick="editingRecipe=null; render();" class="text-xs text-zinc-400 hover:text-white">Abbrechen</button>
        </div>

        <div>
          <label class="text-xs text-zinc-400">Rezeptname</label>
          <input id="rec-name-input" type="text" value="${editingRecipe.name}"
            oninput="editingRecipe.name = this.value"
            class="w-full mt-1 px-3.5 py-2.5 rounded-2xl bg-zinc-900 border border-border text-sm text-white focus:outline-none focus:border-emerald-500" />
        </div>

        <div class="grid grid-cols-4 gap-2 bg-zinc-900/90 border border-border rounded-2xl p-3 text-center">
          <div>
            <div class="text-[10px] text-zinc-400">Kalorien</div>
            <div class="text-sm font-bold text-emerald-400">${Math.round(tot.kcal)}</div>
          </div>
          <div>
            <div class="text-[10px] text-zinc-400">Protein</div>
            <div class="text-sm font-bold text-sky-400">${Math.round(tot.p)}g</div>
          </div>
          <div>
            <div class="text-[10px] text-zinc-400">Carbs</div>
            <div class="text-sm font-bold text-amber-400">${Math.round(tot.c)}g</div>
          </div>
          <div>
            <div class="text-[10px] text-zinc-400">Fett</div>
            <div class="text-sm font-bold text-rose-400">${Math.round(tot.f)}g</div>
          </div>
        </div>

        <!-- Zutatenliste -->
        <div class="space-y-2">
          <div class="text-xs font-semibold text-zinc-300">Zutaten (${editingRecipe.items.length})</div>
          ${editingRecipe.items.map((it, idx) => `
            <div class="flex items-center justify-between gap-2 bg-zinc-900 border border-border rounded-2xl px-3 py-2">
              <div class="min-w-0 flex-1">
                <div class="text-xs font-medium text-white truncate">${it.name}</div>
                <div class="text-[10px] text-zinc-400">${Math.round(it.kcal100 * it.grams / 100)} kcal · P ${Math.round(it.p100 * it.grams / 100)}g</div>
              </div>
              <div class="flex items-center gap-1.5">
                <input type="number" value="${it.grams}" min="1"
                  onchange="updateRecipeItemGrams(${idx}, this.value)"
                  class="w-16 px-2 py-1 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-right text-white" />
                <span class="text-[11px] text-zinc-400">g</span>
                <button onclick="removeRecipeItem(${idx})" class="p-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-xs" title="Entfernen">
                  🗑
                </button>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Zutat per Live-Suche hinzufügen -->
        <div class="pt-2 border-t border-border space-y-2">
          <div class="text-xs font-semibold text-zinc-300">Zutat aus Live-Datenbank hinzufügen</div>
          <div class="flex gap-2">
            <input id="builder-search-input" type="text" placeholder="z. B. Apfel, Banane, Haferflocken, Tofu..."
              onkeydown="if(event.key==='Enter') runBuilderSearch()"
              class="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-border text-xs text-white" />
            <button onclick="runBuilderSearch()" class="px-3 py-2 rounded-xl bg-emerald-500 text-zinc-950 font-semibold text-xs">
              Suchen
            </button>
          </div>
          <div id="builder-search-results" class="space-y-1.5 max-h-48 overflow-y-auto"></div>
        </div>

        <div class="flex gap-2 pt-2">
          <button onclick="saveEditedRecipe(false)" class="flex-1 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs">
            Speichern
          </button>
          <button onclick="saveEditedRecipe(true)" class="px-3.5 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs">
            Als Kopie
          </button>
        </div>
      </div>
    `;
  }

  return `
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-base font-semibold text-white">Meine Rezepte</h2>
          <p class="text-xs text-zinc-400">Vorlagen auswählen, loggen oder flexibel anpassen</p>
        </div>
        <button onclick="startNewRecipe()" class="px-3.5 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs">
          + Neues Rezept
        </button>
      </div>

      ${state.recipes.map(rec => {
        const tot = calcRecipeTotals(rec);
        return `
          <div class="bg-card border border-border rounded-3xl p-4 space-y-3">
            <div class="flex items-start justify-between gap-2">
              <div>
                <h3 class="text-sm font-semibold text-white">${rec.name}</h3>
                <p class="text-xs text-zinc-400 mt-0.5">
                  ${Math.round(tot.kcal)} kcal · P ${Math.round(tot.p)}g · C ${Math.round(tot.c)}g · F ${Math.round(tot.f)}g
                </p>
              </div>
              <div class="flex gap-1.5">
                <button onclick="editRecipeById('${rec.id}')" class="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200">
                  Anpassen
                </button>
                <button onclick="logRecipeToDay('${rec.id}', 1)" class="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 font-medium text-xs">
                  + Heute loggen
                </button>
              </div>
            </div>
            <div class="flex flex-wrap gap-1.5">
              ${rec.items.map(it => `
                <span class="px-2 py-0.5 rounded-lg bg-zinc-900 border border-border text-[11px] text-zinc-300">
                  ${it.grams}g ${it.name}
                </span>
              `).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderSearchTab() {
  return `
    <div class="bg-card border border-border rounded-3xl p-4 space-y-4">
      <div>
        <h2 class="text-base font-semibold text-white">Live Food-Datenbank</h2>
        <p class="text-xs text-zinc-400">Parallele Suche in Open Food Facts & USDA FoodData Central</p>
      </div>
      <div class="flex gap-2">
        <input id="global-food-query" type="text" placeholder="Lebensmittel eingeben (z. B. Apfel, Haferflocken, Quark)..."
          onkeydown="if(event.key==='Enter') runGlobalFoodSearch()"
          class="flex-1 px-3.5 py-2.5 rounded-2xl bg-zinc-900 border border-border text-sm text-white focus:outline-none focus:border-emerald-500" />
        <button onclick="runGlobalFoodSearch()" class="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs">
          Suchen
        </button>
      </div>
      <div id="global-food-results" class="space-y-2">
        <p class="text-xs text-zinc-500">Gib einen Suchbegriff ein, um Live-Nährwerte pro 100g abzurufen.</p>
      </div>
    </div>
  `;
}

function renderHabitsTab() {
  const days30 = getLastNDays(30);
  const insights = computeHabitInsights();

  const metricTabs = [
    { id: 'alcohol', label: '🍷 Alkohol' },
    { id: 'nicotine', label: '💨 Nikotin' },
    { id: 'sport', label: '⚡ Sport' }
  ];

  const getCountsForMetric = (metricKey) => {
    let clean = 0, consumed = 0, open = 0;
    days30.forEach(d => {
      const log = state.logs[d.dateStr];
      if (metricKey === 'sport') {
        const done = log && Array.isArray(log.sportDone) && log.sportDone.length > 0;
        if (done) clean++;
        else open++;
      } else if (metricKey === 'nicotine') {
        const st = getCombinedNicotineStatus(log);
        if (st === 'clean') clean++;
        else if (st === 'consumed') consumed++;
        else open++;
      } else {
        const st = log && log.badHabits ? normalizeHabitStatus(log.badHabits[metricKey]) : null;
        if (st === 'clean') clean++;
        else if (st === 'consumed') consumed++;
        else open++;
      }
    });
    return { clean, consumed, open };
  };

  const mainCounts = getCountsForMetric(selectedHeatmapMetric);

  const renderHeatmapGrid = (metricKey, compact = false) => `
    <div class="grid grid-cols-6 sm:grid-cols-10 gap-1.5">
      ${days30.map(d => {
        const log = state.logs[d.dateStr];
        let tileStyle = 'bg-amber-400/15 border-amber-400/45 text-amber-300 hover:bg-amber-400/25';
        let statusIcon = '?';
        let clickHandler = '';

        if (metricKey === 'sport') {
          const done = log && Array.isArray(log.sportDone) && log.sportDone.length > 0;
          tileStyle = done
            ? 'bg-emerald-500/20 border-emerald-500/55 text-emerald-300 hover:bg-emerald-500/30'
            : 'bg-amber-400/15 border-amber-400/40 text-amber-300 hover:bg-amber-400/25';
          statusIcon = done ? '✓' : '○';
          clickHandler = `toggleHeatmapSportDay('${d.dateStr}')`;
        } else if (metricKey === 'nicotine') {
          const st = getCombinedNicotineStatus(log);
          if (st === 'clean') {
            tileStyle = 'bg-emerald-500/20 border-emerald-500/55 text-emerald-300 hover:bg-emerald-500/30';
            statusIcon = '✓';
          } else if (st === 'consumed') {
            tileStyle = 'bg-rose-500/25 border-rose-500/60 text-rose-300 hover:bg-rose-500/35';
            statusIcon = '✕';
          }
          clickHandler = `cycleCombinedNicotineDay('${d.dateStr}')`;
        } else {
          const st = log && log.badHabits ? normalizeHabitStatus(log.badHabits[metricKey]) : null;
          if (st === 'clean') {
            tileStyle = 'bg-emerald-500/20 border-emerald-500/55 text-emerald-300 hover:bg-emerald-500/30';
            statusIcon = '✓';
          } else if (st === 'consumed') {
            tileStyle = 'bg-rose-500/25 border-rose-500/60 text-rose-300 hover:bg-rose-500/35';
            statusIcon = '✕';
          }
          clickHandler = `cycleBadHabitDay('${metricKey}', '${d.dateStr}')`;
        }

        return `
          <button onclick="${clickHandler}"
            title="${d.dayNum}.${d.monthNum}. (${d.weekdayShort})"
            class="${compact ? 'p-1' : 'p-1.5'} rounded-xl border text-center transition ${tileStyle}">
            <div class="text-[9px] opacity-80 leading-none">${d.dayNum}.${d.monthNum}</div>
            <div class="text-xs font-bold mt-1 leading-none">${statusIcon}</div>
          </button>
        `;
      }).join('')}
    </div>
  `;

  const cigCounts = getCountsForMetric('cigarettes');
  const vapeCounts = getCountsForMetric('vape');

  return `
    <div class="space-y-4">
      <!-- 30-Tage-Heatmap -->
      <div id="sec-heatmap" class="bg-card border border-border rounded-3xl p-4 space-y-3.5">
        <div class="flex items-start justify-between gap-2">
          <div>
            <h2 class="text-sm font-semibold text-white">30-Tage-Heatmap</h2>
            <p class="text-[11px] text-zinc-400">Tippe auf einen Tag zum Umschalten (Grün / Rot / Gelb)</p>
          </div>
          <div class="text-right text-[11px] text-zinc-400">
            ${selectedHeatmapMetric === 'sport'
              ? `<span class="text-emerald-400 font-semibold">${mainCounts.clean}</span>/30 aktiv`
              : `<span class="text-emerald-400 font-semibold">${mainCounts.clean}</span> clean · <span class="text-rose-400 font-semibold">${mainCounts.consumed}</span> kons. · <span class="text-amber-300 font-semibold">${mainCounts.open}</span> offen`
            }
          </div>
        </div>

        <!-- Kategorie-Filter auf einer Ebene (Alkohol | Nikotin | Sport) -->
        <div class="grid grid-cols-3 gap-1.5">
          ${metricTabs.map(t => `
            <button onclick="setHeatmapMetric('${t.id}')"
              class="py-2 px-2.5 rounded-xl text-xs font-medium border transition truncate ${
                selectedHeatmapMetric === t.id
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-zinc-900 border-border text-zinc-400 hover:text-zinc-200'
              }">
              ${t.label}
            </button>
          `).join('')}
        </div>

        <!-- Übergeordnetes 30-Tage-Raster -->
        <div class="pt-1">
          ${renderHeatmapGrid(selectedHeatmapMetric, false)}
        </div>

        <!-- Zusätzliche 30-Tage-Unterpunkte für Zigaretten & Vape bei ausgewähltem Nikotin-Tab -->
        ${selectedHeatmapMetric === 'nicotine' ? `
          <div class="border border-border rounded-2xl p-3 bg-zinc-950/60 space-y-3.5">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">Aufschlüsselung Nikotin (30 Tage)</span>
              <span class="text-[10px] text-zinc-500">✕ oben = Zigaretten oder Vape</span>
            </div>

            <!-- Unterpunkt Zigaretten -->
            <div class="space-y-1.5 pl-2 border-l-2 border-zinc-800">
              <div class="flex items-center justify-between text-xs">
                <span class="font-medium text-zinc-200">🚬 Zigaretten</span>
                <span class="text-[11px] text-zinc-400">
                  <span class="text-emerald-400 font-semibold">${cigCounts.clean}</span> clean ·
                  <span class="text-rose-400 font-semibold">${cigCounts.consumed}</span> kons. ·
                  <span class="text-amber-300 font-semibold">${cigCounts.open}</span> offen
                </span>
              </div>
              ${renderHeatmapGrid('cigarettes', true)}
            </div>

            <!-- Unterpunkt Vape -->
            <div class="space-y-1.5 pl-2 border-l-2 border-zinc-800">
              <div class="flex items-center justify-between text-xs">
                <span class="font-medium text-zinc-200">💨 Vape</span>
                <span class="text-[11px] text-zinc-400">
                  <span class="text-emerald-400 font-semibold">${vapeCounts.clean}</span> clean ·
                  <span class="text-rose-400 font-semibold">${vapeCounts.consumed}</span> kons. ·
                  <span class="text-amber-300 font-semibold">${vapeCounts.open}</span> offen
                </span>
              </div>
              ${renderHeatmapGrid('vape', true)}
            </div>
          </div>
        ` : ''}

        <!-- Kompakte Legende -->
        <div class="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border text-[11px] text-zinc-400">
          <div class="flex items-center gap-3">
            <span class="flex items-center gap-1 text-emerald-300"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> ${selectedHeatmapMetric === 'sport' ? 'Absolviert' : 'Clean'}</span>
            ${selectedHeatmapMetric !== 'sport' ? `<span class="flex items-center gap-1 text-rose-300"><span class="w-2 h-2 rounded-full bg-rose-500"></span> Konsumiert</span>` : ''}
            <span class="flex items-center gap-1 text-amber-300"><span class="w-2 h-2 rounded-full bg-amber-400"></span> ${selectedHeatmapMetric === 'sport' ? 'Ruhetag / Offen' : 'Nicht erfasst'}</span>
          </div>
          <span>Letzte 30 Tage</span>
        </div>
      </div>

      <!-- Habit-Korrelations-Insights -->
      <div id="sec-insights" class="bg-card border border-border rounded-3xl p-4 space-y-3">
        <div>
          <h2 class="text-sm font-semibold text-white">Habit-Korrelations-Insights</h2>
          <p class="text-[11px] text-zinc-400">Automatische Mustererkennung aus den letzten 30 Tagen</p>
        </div>
        <div class="space-y-2.5">
          ${insights.map(ins => `
            <div class="bg-zinc-900/90 border border-border rounded-2xl p-3 flex items-start gap-3">
              <div class="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-base shrink-0">
                ${ins.icon}
              </div>
              <div class="space-y-0.5">
                <div class="text-xs font-semibold text-white">${ins.title}</div>
                <p class="text-xs text-zinc-300 leading-relaxed">${ins.text}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Sport & Bewegung verwalten -->
      <div id="sec-sport" class="bg-card border border-border rounded-3xl p-4 space-y-3">
        <h2 class="text-sm font-semibold text-white">Sport & Bewegung verwalten</h2>
        <div class="flex gap-2">
          <input id="new-sport-name" type="text" placeholder="Neue Aktivität (z. B. Radfahren)..."
            class="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-border text-xs text-white" />
          <button onclick="addSportHabit()" class="px-3.5 py-2 rounded-xl bg-emerald-500 text-zinc-950 font-semibold text-xs">
            Hinzufügen
          </button>
        </div>
        <div class="space-y-1.5">
          ${state.sportHabits.map(sp => `
            <div class="flex items-center justify-between bg-zinc-900 border border-border rounded-xl px-3 py-2 text-xs">
              <span class="text-zinc-200">${sp.name}</span>
              <button onclick="deleteSportHabit('${sp.id}')" class="text-rose-400 hover:text-rose-300">Löschen</button>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Konsum & Verzicht Streaks -->
      <div id="sec-konsum" class="bg-card border border-border rounded-3xl p-4 space-y-3">
        <h2 class="text-sm font-semibold text-white">Konsum & Verzicht Übersicht</h2>
        <p class="text-xs text-zinc-400">Aktive Bereiche: <strong>Alkohol</strong> sowie <strong>Nikotin</strong> (gebündelt aus <strong>Zigaretten</strong> und <strong>Vape</strong>).</p>
        <div class="grid grid-cols-2 gap-2.5 text-center pt-1">
          <div class="bg-zinc-900 border border-border rounded-2xl p-3">
            <div class="text-[11px] text-zinc-400">🍷 Alkohol</div>
            <div class="text-base font-bold text-emerald-400 mt-0.5">${calcCleanStreak('alcohol')}d clean</div>
          </div>
          <div class="bg-zinc-900 border border-border rounded-2xl p-3">
            <div class="text-[11px] text-zinc-400">💨 Nikotin (Gesamt)</div>
            <div class="text-base font-bold text-emerald-400 mt-0.5">${calcCleanStreak('nicotine')}d clean</div>
            <div class="text-[10px] text-zinc-500 mt-0.5">Zigaretten: ${calcCleanStreak('cigarettes')}d · Vape: ${calcCleanStreak('vape')}d</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ---------- RECIPE BUILDER ACTIONS ----------
function startNewRecipe() {
  editingRecipe = {
    id: 'rec_' + Date.now(),
    name: 'Neues Rezept',
    items: []
  };
  render();
}

function editRecipeById(id) {
  const found = state.recipes.find(r => r.id === id);
  if (!found) return;
  editingRecipe = JSON.parse(JSON.stringify(found));
  render();
}

function updateRecipeItemGrams(idx, val) {
  if (!editingRecipe) return;
  editingRecipe.items[idx].grams = Math.max(1, Number(val) || 100);
  render();
}

function removeRecipeItem(idx) {
  if (!editingRecipe) return;
  editingRecipe.items.splice(idx, 1);
  render();
}

async function runBuilderSearch() {
  const inp = document.getElementById('builder-search-input');
  const box = document.getElementById('builder-search-results');
  if (!inp || !box) return;
  box.innerHTML = `<div class="text-xs text-zinc-400 py-2">Suche läuft...</div>`;
  const items = await searchFoodsLive(inp.value);
  if (!items.length) {
    box.innerHTML = `<div class="text-xs text-zinc-500 py-2">Keine Treffer gefunden.</div>`;
    return;
  }
  box.innerHTML = items.map((it, idx) => `
    <div class="flex items-center justify-between bg-zinc-900/90 border border-border rounded-xl px-3 py-2 text-xs">
      <div class="min-w-0 pr-2">
        <div class="font-medium text-zinc-200 truncate">${it.name}</div>
        <div class="text-[10px] text-zinc-400">${it.kcal100} kcal · P ${it.p100}g · ${it.source}</div>
      </div>
      <button onclick="addCachedFoodToRecipe(${idx})" class="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
        + 100g
      </button>
    </div>
  `).join('');
}

function addCachedFoodToRecipe(idx) {
  const food = searchResultsCache[idx];
  if (!food || !editingRecipe) return;
  editingRecipe.items.push({
    id: 'it_' + Date.now(),
    name: food.name,
    grams: 100,
    kcal100: food.kcal100,
    p100: food.p100,
    c100: food.c100,
    f100: food.f100
  });
  render();
}

function saveEditedRecipe(asCopy) {
  if (!editingRecipe) return;
  if (asCopy) {
    editingRecipe.id = 'rec_' + Date.now();
    editingRecipe.name = editingRecipe.name + ' (Kopie)';
    state.recipes.push(editingRecipe);
  } else {
    const idx = state.recipes.findIndex(r => r.id === editingRecipe.id);
    if (idx >= 0) state.recipes[idx] = editingRecipe;
    else state.recipes.push(editingRecipe);
  }
  saveState();
  editingRecipe = null;
  render();
}

async function runGlobalFoodSearch() {
  const inp = document.getElementById('global-food-query');
  const box = document.getElementById('global-food-results');
  if (!inp || !box) return;
  box.innerHTML = `<div class="text-xs text-zinc-400 py-2">Suche in Open Food Facts & USDA...</div>`;
  const items = await searchFoodsLive(inp.value);
  if (!items.length) {
    box.innerHTML = `<div class="text-xs text-zinc-500 py-2">Keine Treffer gefunden.</div>`;
    return;
  }
  box.innerHTML = items.map((it, idx) => `
    <div class="flex items-center justify-between bg-zinc-900 border border-border rounded-2xl p-3 text-xs">
      <div class="min-w-0 pr-2">
        <div class="font-medium text-white truncate">${it.name}</div>
        <div class="text-[11px] text-zinc-400 mt-0.5">${it.kcal100} kcal · P ${it.p100}g · C ${it.c100}g · F ${it.f100}g · <span class="text-emerald-400">${it.source}</span></div>
      </div>
      <button onclick="logCachedFoodToday(${idx})" class="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0 font-medium">
        + 100g loggen
      </button>
    </div>
  `).join('');
}

function logCachedFoodToday(idx) {
  const food = searchResultsCache[idx];
  if (!food) return;
  const log = ensureDayLog(state.selectedDate);
  log.entries.push({
    id: 'ent_' + Date.now(),
    name: `${food.name} (100g)`,
    kcal: food.kcal100,
    p: food.p100,
    c: food.c100,
    f: food.f100
  });
  saveState();
  switchTab('dashboard');
}

// ---------- HABITS MANAGEMENT ----------
function addSportHabit() {
  const inp = document.getElementById('new-sport-name');
  if (!inp || !inp.value.trim()) return;
  state.sportHabits.push({ id: 'sp_' + Date.now(), name: inp.value.trim() });
  saveState();
  render();
}

function deleteSportHabit(id) {
  state.sportHabits = state.sportHabits.filter(s => s.id !== id);
  saveState();
  render();
}

// ---------- FITDAYS CSV IMPORT ----------
function importFitDaysCsv(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const lines = String(e.target.result || '').split(/\r?\n/).filter(Boolean);
    let imported = 0;
    lines.slice(1).forEach(line => {
      const cols = line.split(/[,;]/).map(c => c.replace(/"/g, '').trim());
      const weightVal = cols.map(Number).find(n => n > 35 && n < 250);
      const dateMatch = cols.find(c => /\d{4}-\d{2}-\d{2}/.test(c));
      if (weightVal) {
        state.weightHistory.push({
          date: dateMatch ? dateMatch.slice(0, 10) : getTodayStr(),
          weight: weightVal,
          bodyFat: null,
          muscle: null
        });
        imported++;
      }
    });
    saveState();
    render();
    alert(`${imported} FitDays-Messwerte importiert.`);
  };
  reader.readAsText(file);
}

// ---------- MODALS ----------
function openModal(html) {
  document.getElementById('modal-box').innerHTML = html;
  document.getElementById('modal-backdrop').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-backdrop').classList.add('hidden');
}

function openQuickLogModal() {
  openModal(`
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-white">Mahlzeit eintragen</h3>
        <button onclick="closeModal()" class="text-zinc-400 hover:text-white">✕</button>
      </div>
      <div class="space-y-2">
        <div class="text-xs font-semibold text-zinc-400">Aus deinen Rezepten</div>
        ${state.recipes.map(rec => {
          const tot = calcRecipeTotals(rec);
          return `
            <div class="flex items-center justify-between bg-zinc-900 border border-border rounded-2xl p-3 text-xs">
              <div>
                <div class="font-medium text-white">${rec.name}</div>
                <div class="text-zinc-400">${Math.round(tot.kcal)} kcal · P ${Math.round(tot.p)}g</div>
              </div>
              <button onclick="logRecipeToDay('${rec.id}', 1)" class="px-3 py-1.5 rounded-xl bg-emerald-500 text-zinc-950 font-semibold">
                Loggen
              </button>
            </div>
          `;
        }).join('')}
      </div>
      <div class="pt-2 border-t border-border space-y-2">
        <div class="text-xs font-semibold text-zinc-400">Schnelleingabe</div>
        <input id="ql-name" type="text" placeholder="Bezeichnung (z. B. Snack)" class="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-border text-xs text-white" />
        <div class="grid grid-cols-4 gap-2">
          <input id="ql-kcal" type="number" placeholder="kcal" class="px-2.5 py-2 rounded-xl bg-zinc-900 border border-border text-xs text-white" />
          <input id="ql-p" type="number" placeholder="P (g)" class="px-2.5 py-2 rounded-xl bg-zinc-900 border border-border text-xs text-white" />
          <input id="ql-c" type="number" placeholder="C (g)" class="px-2.5 py-2 rounded-xl bg-zinc-900 border border-border text-xs text-white" />
          <input id="ql-f" type="number" placeholder="F (g)" class="px-2.5 py-2 rounded-xl bg-zinc-900 border border-border text-xs text-white" />
        </div>
        <button onclick="submitQuickManualEntry()" class="w-full py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs">
          Eintrag speichern
        </button>
      </div>
    </div>
  `);
}

function submitQuickManualEntry() {
  const name = document.getElementById('ql-name').value.trim() || 'Mahlzeit';
  const kcal = Number(document.getElementById('ql-kcal').value) || 0;
  const p = Number(document.getElementById('ql-p').value) || 0;
  const c = Number(document.getElementById('ql-c').value) || 0;
  const f = Number(document.getElementById('ql-f').value) || 0;
  const log = ensureDayLog(state.selectedDate);
  log.entries.push({ id: 'ent_' + Date.now(), name, kcal, p, c, f });
  saveState();
  closeModal();
  render();
}

function openWeightModal() {
  openModal(`
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-white">Gewicht eintragen</h3>
        <button onclick="closeModal()" class="text-zinc-400 hover:text-white">✕</button>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <div>
          <label class="text-[11px] text-zinc-400">Gewicht (kg)</label>
          <input id="w-val" type="number" step="0.1" value="74.0" class="w-full mt-1 px-3 py-2 rounded-xl bg-zinc-900 border border-border text-sm text-white" />
        </div>
        <div>
          <label class="text-[11px] text-zinc-400">Körperfett (%)</label>
          <input id="w-bf" type="number" step="0.1" placeholder="15.9" class="w-full mt-1 px-3 py-2 rounded-xl bg-zinc-900 border border-border text-sm text-white" />
        </div>
        <div>
          <label class="text-[11px] text-zinc-400">Muskel (kg)</label>
          <input id="w-mu" type="number" step="0.1" placeholder="59.4" class="w-full mt-1 px-3 py-2 rounded-xl bg-zinc-900 border border-border text-sm text-white" />
        </div>
      </div>
      <button onclick="saveWeightEntry()" class="w-full py-2.5 rounded-2xl bg-emerald-500 text-zinc-950 font-semibold text-xs">
        Speichern
      </button>
    </div>
  `);
}

function saveWeightEntry() {
  const weight = Number(document.getElementById('w-val').value);
  const bodyFat = Number(document.getElementById('w-bf').value) || null;
  const muscle = Number(document.getElementById('w-mu').value) || null;
  if (!weight) return;
  state.weightHistory.push({ date: state.selectedDate, weight, bodyFat, muscle });
  saveState();
  closeModal();
  render();
}

function openGoalModal() {
  openModal(`
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-white">Tagesziele anpassen</h3>
        <button onclick="closeModal()" class="text-zinc-400 hover:text-white">✕</button>
      </div>
      <div class="grid grid-cols-2 gap-2.5">
        <div>
          <label class="text-[11px] text-zinc-400">Kalorien (kcal)</label>
          <input id="g-kcal" type="number" value="${state.calorieGoal}" class="w-full mt-1 px-3 py-2 rounded-xl bg-zinc-900 border border-border text-sm text-white" />
        </div>
        <div>
          <label class="text-[11px] text-zinc-400">Protein (g)</label>
          <input id="g-p" type="number" value="${state.proteinGoal}" class="w-full mt-1 px-3 py-2 rounded-xl bg-zinc-900 border border-border text-sm text-white" />
        </div>
        <div>
          <label class="text-[11px] text-zinc-400">Carbs (g)</label>
          <input id="g-c" type="number" value="${state.carbsGoal}" class="w-full mt-1 px-3 py-2 rounded-xl bg-zinc-900 border border-border text-sm text-white" />
        </div>
        <div>
          <label class="text-[11px] text-zinc-400">Fett (g)</label>
          <input id="g-f" type="number" value="${state.fatGoal}" class="w-full mt-1 px-3 py-2 rounded-xl bg-zinc-900 border border-border text-sm text-white" />
        </div>
      </div>
      <button onclick="saveGoals()" class="w-full py-2.5 rounded-2xl bg-emerald-500 text-zinc-950 font-semibold text-xs">
        Ziele speichern
      </button>
    </div>
  `);
}

function saveGoals() {
  state.calorieGoal = Number(document.getElementById('g-kcal').value) || 2400;
  state.proteinGoal = Number(document.getElementById('g-p').value) || 160;
  state.carbsGoal = Number(document.getElementById('g-c').value) || 260;
  state.fatGoal = Number(document.getElementById('g-f').value) || 75;
  saveState();
  closeModal();
  render();
}

function openPwaModal() {
  openModal(`
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-white">Auf Startbildschirm installieren</h3>
        <button onclick="closeModal()" class="text-zinc-400 hover:text-white">✕</button>
      </div>
      ${deferredInstallPrompt ? `
        <button onclick="triggerNativeInstall()" class="w-full py-2.5 rounded-2xl bg-emerald-500 text-zinc-950 font-semibold text-xs">
          Jetzt direkt als App installieren
        </button>
      ` : ''}
      <div class="space-y-2 text-xs text-zinc-300 bg-zinc-900/90 border border-border rounded-2xl p-3.5">
        <p><strong>Android (Chrome):</strong> Oben rechts auf <strong>⋮</strong> tippen → <strong>„App installieren“</strong> oder <strong>„Zum Startbildschirm hinzufügen“</strong>.</p>
        <p><strong>iPhone / iPad (Safari):</strong> Unten auf <strong>Teilen</strong> tippen → <strong>„Zum Home-Bildschirm“</strong>.</p>
        <p><strong>Desktop (Edge / Chrome):</strong> Rechts in der Adressleiste auf das <strong>Installieren-Symbol</strong> klicken.</p>
      </div>
    </div>
  `);
}

async function triggerNativeInstall() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  closeModal();
}

function openBackupModal() {
  openModal(`
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-white">Daten-Backup (JSON)</h3>
        <button onclick="closeModal()" class="text-zinc-400 hover:text-white">✕</button>
      </div>
      <button onclick="exportJsonBackup()" class="w-full py-2.5 rounded-2xl bg-emerald-500 text-zinc-950 font-semibold text-xs">
        Backup herunterladen
      </button>
      <label class="block w-full py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-center text-zinc-200 font-medium text-xs cursor-pointer">
        Backup-Datei wiederherstellen
        <input type="file" accept=".json" onchange="importJsonBackup(event)" class="hidden" />
      </label>
    </div>
  `);
}

function exportJsonBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `fuel_and_flow_backup_${getTodayStr()}.json`;
  a.click();
}

function importJsonBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      state = JSON.parse(e.target.result);
      saveState();
      closeModal();
      render();
    } catch (err) {
      alert('Ungültige Backup-Datei.');
    }
  };
  reader.readAsText(file);
}

render();