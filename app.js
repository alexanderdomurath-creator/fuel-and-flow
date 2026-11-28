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
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
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

const BUILTIN_ROUTINE_DEFS = [
  { id: 'creatine', name: 'Kreatin', icon: '💊' },
  { id: 'skincare', name: 'Skincare', icon: '🧴' },
  { id: 'sertraline', name: 'Sertralin', icon: '💊' }
];

function createDefaultHabitConfig() {
  return {
    categories: {
      alcohol: true,
      nicotine: true,
      sport: true,
      routine: true
    },
    routineItems: {
      creatine: true,
      skincare: true,
      sertraline: true
    },
    customHabits: []
  };
}

function normalizeHabitConfig(raw) {
  const def = createDefaultHabitConfig();
  if (!raw || typeof raw !== 'object') return def;
  const rawCats = raw.categories && typeof raw.categories === 'object' ? raw.categories : {};
  const rawRoutines = raw.routineItems && typeof raw.routineItems === 'object' ? raw.routineItems : {};
  const rawCustom = Array.isArray(raw.customHabits) ? raw.customHabits : [];

  const seen = new Set();
  const customHabits = [];
  rawCustom.forEach((h, idx) => {
    if (!h || typeof h !== 'object') return;
    const id = String(h.id || `ch_${idx}`).trim();
    const name = String(h.name || '').trim();
    if (!id || !name || seen.has(id)) return;
    seen.add(id);
    customHabits.push({
      id,
      name,
      icon: String(h.icon || '⭐').trim().slice(0, 4) || '⭐',
      type: h.type === 'avoid' ? 'avoid' : 'positive',
      enabled: h.enabled !== false,
      showInQuickCheck: h.showInQuickCheck !== false
    });
  });

  return {
    categories: {
      alcohol: rawCats.alcohol !== false,
      nicotine: rawCats.nicotine !== false,
      sport: rawCats.sport !== false,
      routine: rawCats.routine !== false
    },
    routineItems: {
      creatine: rawRoutines.creatine !== false,
      skincare: rawRoutines.skincare !== false,
      sertraline: rawRoutines.sertraline !== false
    },
    customHabits
  };
}

function getHabitConfig() {
  state.habitConfig = normalizeHabitConfig(state.habitConfig);
  return state.habitConfig;
}

function isHabitCategoryEnabled(catId) {
  const cfg = getHabitConfig();
  return Boolean(cfg.categories[catId]);
}

function getEnabledBuiltinRoutines() {
  const cfg = getHabitConfig();
  if (!cfg.categories.routine) return [];
  return BUILTIN_ROUTINE_DEFS.filter(r => cfg.routineItems[r.id] !== false);
}

function getCustomHabits(onlyEnabled = false) {
  const list = getHabitConfig().customHabits;
  return onlyEnabled ? list.filter(h => h.enabled !== false) : list;
}

function getCustomHabitById(habitId) {
  return getHabitConfig().customHabits.find(h => h.id === habitId) || null;
}

function getCustomHabitValue(log, habit) {
  if (!log || !log.customHabits || !habit) return null;
  const raw = log.customHabits[habit.id];
  return habit.type === 'avoid' ? normalizeHabitStatus(raw) : normalizeRoutineStatus(raw);
}

function getAvailableHeatmapTabs() {
  const cfg = getHabitConfig();
  const tabs = [];
  if (cfg.categories.alcohol) tabs.push({ id: 'alcohol', label: '🍷 Alkohol', kind: 'builtin' });
  if (cfg.categories.nicotine) tabs.push({ id: 'nicotine', label: '💨 Nikotin', kind: 'builtin' });
  if (cfg.categories.sport) tabs.push({ id: 'sport', label: '⚡ Sport', kind: 'builtin' });
  if (cfg.categories.routine && getEnabledBuiltinRoutines().length > 0) {
    tabs.push({ id: 'routine', label: '✨ Routine', kind: 'builtin' });
  }
  getCustomHabits(true).forEach(h => {
    tabs.push({ id: `custom:${h.id}`, label: `${h.icon} ${h.name}`, kind: 'custom', customHabit: h });
  });
  return tabs;
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
    snacks: [],
    mealPlan: { days: {} },
    shoppingList: [],
    habitConfig: createDefaultHabitConfig(),
    weightHistory: [],
    logs: {}
  };
}

function isDemoWeightEntry(w) {
  if (!w || typeof w !== 'object') return false;
  if (w.timeStr || w.bmi != null || w.bodyWater != null || w.bmr != null || w.subcutaneousFat != null || w.visceralFat != null) {
    return false;
  }
  const wt = Number(w.weight), bf = Number(w.bodyFat), mu = Number(w.muscle), age = Number(w.bioAge);
  return (
    (wt === 74.0 && bf === 15.9 && mu === 59.4 && age === 34) ||
    (wt === 74.2 && bf === 16.1 && mu === 59.3 && age === 34) ||
    (wt === 74.6 && bf === 16.4 && mu === 59.1 && age === 35)
  );
}

function stripDemoWeightEntries(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.filter(w => !isDemoWeightEntry(w));
}

let removedDemoWeightsOnLoad = false;
let state = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        parsed.recipes = Array.isArray(parsed.recipes) ? parsed.recipes : [];
        parsed.snacks = Array.isArray(parsed.snacks) ? parsed.snacks : [];
        parsed.mealPlan = (parsed.mealPlan && typeof parsed.mealPlan === 'object' && parsed.mealPlan.days && typeof parsed.mealPlan.days === 'object')
          ? parsed.mealPlan
          : { days: {} };
        parsed.shoppingList = Array.isArray(parsed.shoppingList) ? parsed.shoppingList : [];
        parsed.sportHabits = Array.isArray(parsed.sportHabits) ? parsed.sportHabits : [];
        parsed.workouts = Array.isArray(parsed.workouts) ? parsed.workouts : [];
        const rawW = Array.isArray(parsed.weightHistory) ? parsed.weightHistory : [];
        parsed.weightHistory = stripDemoWeightEntries(rawW);
        if (parsed.weightHistory.length < rawW.length) {
          removedDemoWeightsOnLoad = true;
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed)); } catch (e) {}
        }
        parsed.logs = parsed.logs && typeof parsed.logs === 'object' ? parsed.logs : {};
        parsed.habitConfig = normalizeHabitConfig(parsed.habitConfig);
        return parsed;
      }
    }
  } catch (e) {}
  return buildInitialState();
})();

// ---------- SUPABASE CLOUD SYNC & OFFLINE-QUEUE ----------
const SYNC_CFG_KEY = 'fuel_and_flow_sync_cfg';
const SYNC_META_KEY = 'fuel_and_flow_sync_meta';
const SYNC_FETCH_TIMEOUT_MS = 10000;
const TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

let syncTimer = null;
let syncRetryTimer = null;
let syncRetryAttempt = 0;
let isSyncInFlight = false;
let lastSyncStatusMsg = '';
let lastSyncStatusErr = false;

function loadSyncMeta() {
  try {
    const raw = JSON.parse(localStorage.getItem(SYNC_META_KEY) || 'null');
    if (raw && typeof raw === 'object') {
      return {
        pendingPush: Boolean(raw.pendingPush),
        pendingCount: Math.max(0, Number(raw.pendingCount) || 0),
        pendingSince: raw.pendingSince || null,
        lastRemoteTimestamp: raw.lastRemoteTimestamp || null,
        lastSyncedAt: raw.lastSyncedAt || null
      };
    }
  } catch (e) {}
  return {
    pendingPush: false,
    pendingCount: 0,
    pendingSince: null,
    lastRemoteTimestamp: null,
    lastSyncedAt: null
  };
}

let syncMeta = loadSyncMeta();
let lastRemoteTimestamp = syncMeta.lastRemoteTimestamp;
let hasPendingLocalPush = syncMeta.pendingPush;

function persistSyncMeta() {
  syncMeta.lastRemoteTimestamp = lastRemoteTimestamp;
  syncMeta.pendingPush = hasPendingLocalPush;
  try {
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(syncMeta));
  } catch (e) {}
}

function setPendingLocalPush(isPending, increment = false) {
  hasPendingLocalPush = Boolean(isPending);
  if (hasPendingLocalPush) {
    if (!syncMeta.pendingSince) syncMeta.pendingSince = new Date().toISOString();
    if (increment) syncMeta.pendingCount = (syncMeta.pendingCount || 0) + 1;
    else if (!syncMeta.pendingCount) syncMeta.pendingCount = 1;
  } else {
    syncMeta.pendingCount = 0;
    syncMeta.pendingSince = null;
    syncMeta.lastSyncedAt = new Date().toISOString();
  }
  persistSyncMeta();
  updateOfflineBanner();
}

function setLastSyncedRemoteTs(ts) {
  if (!ts) return;
  lastRemoteTimestamp = ts;
  persistSyncMeta();
}

function isAppOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function pruneDeletedIds(rawMap) {
  const out = {};
  if (!rawMap || typeof rawMap !== 'object') return out;
  const cutoff = Date.now() - TOMBSTONE_TTL_MS;
  Object.keys(rawMap).forEach(id => {
    const ts = rawMap[id];
    const ms = parseSyncTs(ts);
    if (id && (ms === 0 || ms >= cutoff)) {
      out[id] = typeof ts === 'string' ? ts : new Date().toISOString();
    }
  });
  return out;
}

function markDeletedId(id) {
  if (!id) return;
  if (!state._deletedIds || typeof state._deletedIds !== 'object') {
    state._deletedIds = {};
  }
  state._deletedIds[String(id)] = nextMonotonicIsoTs();
}

function normalizeLoadedState(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  obj.recipes = Array.isArray(obj.recipes) ? obj.recipes : [];
  obj.snacks = Array.isArray(obj.snacks) ? obj.snacks : [];
  obj.mealPlan = (obj.mealPlan && typeof obj.mealPlan === 'object' && obj.mealPlan.days && typeof obj.mealPlan.days === 'object')
    ? obj.mealPlan
    : { days: {} };
  obj.shoppingList = Array.isArray(obj.shoppingList) ? obj.shoppingList : [];
  obj.sportHabits = Array.isArray(obj.sportHabits) ? obj.sportHabits : [];
  obj.workouts = Array.isArray(obj.workouts) ? obj.workouts : [];
  obj.weightHistory = stripDemoWeightEntries(Array.isArray(obj.weightHistory) ? obj.weightHistory : []);
  obj.logs = obj.logs && typeof obj.logs === 'object' ? obj.logs : {};
  obj.habitConfig = normalizeHabitConfig(obj.habitConfig);
  obj._deletedIds = pruneDeletedIds(obj._deletedIds);
  return obj;
}

function mergeByKey(primaryArr, secondaryArr, keyFn) {
  const map = new Map();
  (secondaryArr || []).forEach(item => { if (item) map.set(keyFn(item), item); });
  (primaryArr || []).forEach(item => { if (item) map.set(keyFn(item), item); });
  return [...map.values()];
}

function mergeCloudStates(localSt, remoteSt) {
  const loc = normalizeLoadedState(localSt || {});
  const rem = normalizeLoadedState(remoteSt || {});
  const localNewer = parseSyncTs(loc._updatedAt) >= parseSyncTs(rem._updatedAt);
  const primary = localNewer ? loc : rem;
  const secondary = localNewer ? rem : loc;

  // Lösch-Tombstones beider Geräte zusammenführen (damit Offline-Löschungen nicht zurückkehren)
  const mergedDeleted = { ...(secondary._deletedIds || {}) };
  Object.keys(primary._deletedIds || {}).forEach(id => {
    const pTs = parseSyncTs(primary._deletedIds[id]);
    const sTs = parseSyncTs(mergedDeleted[id]);
    if (!mergedDeleted[id] || pTs >= sTs) {
      mergedDeleted[id] = primary._deletedIds[id];
    }
  });
  const isDeleted = (id) => Boolean(id && Object.prototype.hasOwnProperty.call(mergedDeleted, String(id)));

  const merged = { ...secondary, ...primary };
  merged._deletedIds = pruneDeletedIds(mergedDeleted);
  merged.habitConfig = normalizeHabitConfig(primary.habitConfig || secondary.habitConfig);
  merged.workouts = mergeByKey(primary.workouts, secondary.workouts, w => w.id)
    .filter(w => !isDeleted(w.id))
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.id || '').localeCompare(String(b.id || '')));
  merged.weightHistory = mergeByKey(primary.weightHistory, secondary.weightHistory, w => w.date)
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
  merged.recipes = mergeByKey(primary.recipes, secondary.recipes, r => r.id).filter(r => !isDeleted(r.id));
  merged.snacks = mergeByKey(primary.snacks, secondary.snacks, s => s.id).filter(s => !isDeleted(s.id));
  merged.shoppingList = mergeByKey(primary.shoppingList, secondary.shoppingList, it => it.id).filter(it => !isDeleted(it.id));
  const allPlanDates = new Set([
    ...Object.keys((secondary.mealPlan && secondary.mealPlan.days) || {}),
    ...Object.keys((primary.mealPlan && primary.mealPlan.days) || {})
  ]);
  const mergedPlanDays = {};
  allPlanDates.forEach(dk => {
    const pArr = (primary.mealPlan && primary.mealPlan.days && primary.mealPlan.days[dk]) || [];
    const sArr = (secondary.mealPlan && secondary.mealPlan.days && secondary.mealPlan.days[dk]) || [];
    const dayMerged = mergeByKey(pArr, sArr, it => it.id).filter(it => !isDeleted(it.id));
    if (dayMerged.length) mergedPlanDays[dk] = dayMerged;
  });
  merged.mealPlan = { days: mergedPlanDays };
  merged.sportHabits = mergeByKey(primary.sportHabits, secondary.sportHabits, h => h.id).filter(h => !isDeleted(h.id));

  // Tageslogs über ALLE Datums-Keys beider Geräte verlustfrei zusammenführen
  const allDates = new Set([
    ...Object.keys(secondary.logs || {}),
    ...Object.keys(primary.logs || {})
  ]);
  const mergedLogs = {};
  allDates.forEach(dateKey => {
    const pLog = (primary.logs && primary.logs[dateKey]) || {};
    const sLog = (secondary.logs && secondary.logs[dateKey]) || {};
    const entries = mergeByKey(pLog.entries || [], sLog.entries || [], e => e.id || `${e.name}_${e.kcal}`)
      .filter(e => !isDeleted(e.id));
    const sportDone = [...new Set([...(sLog.sportDone || []), ...(pLog.sportDone || [])])];
    const badHabits = { ...(sLog.badHabits || {}) };
    Object.keys(pLog.badHabits || {}).forEach(k => {
      if (pLog.badHabits[k] !== null && pLog.badHabits[k] !== undefined) badHabits[k] = pLog.badHabits[k];
    });
    const routines = { ...(sLog.routines || {}) };
    Object.keys(pLog.routines || {}).forEach(k => {
      if (pLog.routines[k] !== null && pLog.routines[k] !== undefined) routines[k] = pLog.routines[k];
    });
    const customHabits = { ...(sLog.customHabits || {}) };
    Object.keys(pLog.customHabits || {}).forEach(k => {
      if (pLog.customHabits[k] !== null && pLog.customHabits[k] !== undefined) customHabits[k] = pLog.customHabits[k];
    });
    mergedLogs[dateKey] = { ...sLog, ...pLog, entries, sportDone, badHabits, routines, customHabits };
  });
  merged.logs = mergedLogs;
  merged._updatedAt = nextMonotonicIsoTs();
  return normalizeLoadedState(merged);
}

const DEFAULT_SUPABASE_URL = 'https://odaxtofsxgzptrmwmpge.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_g6QltrJ_o277vLibdAx8AQ_XY74jXcq';

function getSyncConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(SYNC_CFG_KEY) || 'null') || {};
    return {
      url: (saved.url && String(saved.url).trim()) || DEFAULT_SUPABASE_URL,
      anonKey: (saved.anonKey && String(saved.anonKey).trim()) || DEFAULT_SUPABASE_ANON_KEY,
      syncKey: (saved.syncKey && String(saved.syncKey).trim()) || ''
    };
  } catch (e) {
    return {
      url: DEFAULT_SUPABASE_URL,
      anonKey: DEFAULT_SUPABASE_ANON_KEY,
      syncKey: ''
    };
  }
}

function updateHeaderSyncDot(mode) {
  const btn = document.getElementById('headerBackupBtn');
  if (!btn) return;
  let dot = document.getElementById('headerSyncDot');
  if (!dot) {
    dot = document.createElement('span');
    dot.id = 'headerSyncDot';
    dot.className = 'inline-block w-2 h-2 rounded-full ml-1.5 align-middle';
    btn.appendChild(dot);
  }
  if (mode === 'syncing') {
    dot.className = 'inline-block w-2 h-2 rounded-full ml-1.5 align-middle bg-amber-400 animate-pulse';
    btn.title = 'Cloud-Sync läuft…';
  } else if (mode === 'offline') {
    dot.className = 'inline-block w-2 h-2 rounded-full ml-1.5 align-middle bg-amber-500';
    btn.title = syncMeta.pendingCount > 0
      ? `Offline – ${syncMeta.pendingCount} lokale Änderung(en) warten auf Sync`
      : 'Offline – Änderungen werden lokal gespeichert';
  } else if (mode === 'error') {
    dot.className = 'inline-block w-2 h-2 rounded-full ml-1.5 align-middle bg-rose-500';
    btn.title = lastSyncStatusMsg || 'Sync-Fehler';
  } else if (mode === 'ok') {
    dot.className = 'inline-block w-2 h-2 rounded-full ml-1.5 align-middle bg-emerald-400';
    btn.title = lastSyncStatusMsg || 'Mit Cloud synchronisiert';
  } else {
    dot.className = 'inline-block w-2 h-2 rounded-full ml-1.5 align-middle bg-zinc-600';
    btn.title = 'Daten sichern / wiederherstellen';
  }
}

function updateOfflineBanner() {
  if (typeof document === 'undefined') return;
  const offline = isAppOffline();
  const pending = hasPendingLocalPush && syncMeta.pendingCount > 0;
  const cfg = getSyncConfig();
  const hasCloudCfg = Boolean(cfg && cfg.syncKey);

  let banner = document.getElementById('offlineSyncBanner');
  if (!offline && !(pending && hasCloudCfg && lastSyncStatusErr)) {
    if (banner) banner.remove();
    return;
  }

  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'offlineSyncBanner';
    const mainEl = document.getElementById('app-content');
    if (mainEl && mainEl.parentNode) {
      mainEl.parentNode.insertBefore(banner, mainEl);
    } else if (document.body) {
      document.body.prepend(banner);
    }
  }

  banner.className = 'max-w-3xl mx-auto px-4 pt-2.5';
  const countTxt = syncMeta.pendingCount > 0
    ? `${syncMeta.pendingCount} Änderung${syncMeta.pendingCount === 1 ? '' : 'en'} lokal vorgemerkt`
    : 'Alle Eingaben werden lokal gespeichert';
  banner.innerHTML = offline
    ? `
      <div class="rounded-2xl bg-amber-500/15 border border-amber-500/35 px-3 py-2 flex items-center justify-between gap-2 text-[11px] text-amber-200">
        <span>📡 <strong>Offline-Modus</strong> · ${countTxt} – Auto-Merge sobald wieder online</span>
      </div>
    `
    : `
      <div class="rounded-2xl bg-amber-500/15 border border-amber-500/35 px-3 py-2 flex items-center justify-between gap-2 text-[11px] text-amber-200">
        <span>☁️ ${countTxt} (Wiederholung läuft…)</span>
        <button type="button" onclick="syncNowWithMerge()" class="px-2 py-0.5 rounded-lg bg-amber-500/25 hover:bg-amber-500/35 text-amber-100 font-semibold shrink-0">Jetzt</button>
      </div>
    `;
}

function setSyncStatusText(msg, isError = false, modeOverride = null) {
  lastSyncStatusMsg = msg;
  lastSyncStatusErr = isError;
  if (modeOverride) updateHeaderSyncDot(modeOverride);
  else if (isError) updateHeaderSyncDot('error');
  else if (/sende|verbinde|lade|merge|abgleich/i.test(msg)) updateHeaderSyncDot('syncing');
  else if (/offline/i.test(msg)) updateHeaderSyncDot('offline');
  else updateHeaderSyncDot('ok');
  const el = document.getElementById('syncStatusLabel');
  if (el) {
    el.textContent = msg;
    el.className = isError
      ? 'text-[11px] text-rose-400'
      : (modeOverride === 'offline' || /offline/i.test(msg) ? 'text-[11px] text-amber-300' : 'text-[11px] text-emerald-400');
  }
  updateOfflineBanner();
}

function buildSyncHeaders(cfg, extra = {}) {
  const headers = {
    'apikey': cfg.anonKey,
    'x-sync-key': cfg.syncKey,
    ...extra
  };
  if (cfg.anonKey.startsWith('eyJ')) {
    headers['Authorization'] = `Bearer ${cfg.anonKey}`;
  }
  return headers;
}

function parseSyncTs(ts) {
  const ms = Date.parse(ts || '');
  return Number.isFinite(ms) ? ms : 0;
}

function nextMonotonicIsoTs() {
  const prevMs = Math.max(parseSyncTs(lastRemoteTimestamp), parseSyncTs(state && state._updatedAt));
  return new Date(Math.max(Date.now(), prevMs + 1000)).toISOString();
}

async function fetchSyncWithTimeout(url, options = {}, timeoutMs = SYNC_FETCH_TIMEOUT_MS) {
  if (typeof AbortController === 'undefined' || options.keepalive) {
    return fetch(url, options);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => {
    try { controller.abort(); } catch (e) {}
  }, timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw new Error('Zeitüberschreitung bei Cloud-Sync');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function scheduleSyncRetry() {
  clearTimeout(syncRetryTimer);
  const cfg = getSyncConfig();
  if (!cfg || !cfg.syncKey || !hasPendingLocalPush) return;
  const delays = [3000, 8000, 20000, 60000];
  const delay = delays[Math.min(syncRetryAttempt, delays.length - 1)];
  syncRetryAttempt = Math.min(syncRetryAttempt + 1, delays.length);
  syncRetryTimer = setTimeout(() => {
    syncRetryTimer = null;
    if (hasPendingLocalPush && !isAppOffline()) {
      pullStateFromCloud(false);
    }
  }, delay);
}

async function syncNowWithMerge() {
  syncRetryAttempt = 0;
  clearTimeout(syncRetryTimer);
  await pullStateFromCloud(false);
  if (hasPendingLocalPush && !isAppOffline()) {
    await pushStateToCloud(false, false);
  }
}

async function pushStateToCloud(useKeepalive = false, showAlert = false) {
  clearTimeout(syncTimer);
  const cfg = getSyncConfig();
  if (!cfg || !cfg.url || !cfg.anonKey || !cfg.syncKey) {
    if (showAlert) alert('Bitte zuerst Supabase URL, Key und Sync-Key eintragen.');
    return;
  }

  if (isAppOffline()) {
    setPendingLocalPush(true);
    const cnt = syncMeta.pendingCount;
    setSyncStatusText(`Offline · lokal gespeichert (${cnt} offen)`, false, 'offline');
    if (showAlert) alert('📡 Du bist aktuell offline. Alle Änderungen sind sicher lokal gespeichert und werden automatisch abgeglichen, sobald wieder Verbindung besteht.');
    return;
  }

  // Schutz gegen Datenverlust durch ein frisch installiertes Gerät:
  // Vor dem ersten erfolgreichen Cloud-Abgleich niemals blind überschreiben!
  if (!showAlert && !lastRemoteTimestamp) {
    setPendingLocalPush(true);
    if (isSyncInFlight) {
      syncTimer = setTimeout(() => pushStateToCloud(false, false), 800);
    } else {
      await pullStateFromCloud(false);
    }
    return;
  }

  const baseUrl = `${cfg.url.replace(/\/$/, '')}/rest/v1/fuel_sync?sync_key=eq.${encodeURIComponent(cfg.syncKey)}`;
  const wasOfflineQueue = hasPendingLocalPush && (syncMeta.pendingCount > 0) && syncRetryAttempt > 0;

  // Konflikt-Schutz (Pull-before-Push): Prüfen ob ein anderes Gerät zwischenzeitlich geschrieben hat
  if (!useKeepalive && !showAlert && lastRemoteTimestamp) {
    try {
      const headRes = await fetchSyncWithTimeout(`${baseUrl}&select=updated_at`, {
        method: 'GET',
        cache: 'no-store',
        headers: buildSyncHeaders(cfg)
      });
      if (headRes.ok) {
        const headRows = await headRes.json();
        const remoteHeadTs = headRows?.[0]?.updated_at || '';
        if (remoteHeadTs && parseSyncTs(remoteHeadTs) > parseSyncTs(lastRemoteTimestamp)) {
          setSyncStatusText('Konflikt erkannt – führe Cloud-Daten zusammen…');
          const fullRes = await fetchSyncWithTimeout(`${baseUrl}&select=payload,updated_at`, {
            method: 'GET',
            cache: 'no-store',
            headers: buildSyncHeaders(cfg)
          });
          if (fullRes.ok) {
            const fullRows = await fullRes.json();
            const remotePayload = fullRows?.[0]?.payload;
            if (remotePayload && typeof remotePayload === 'object') {
              state = mergeCloudStates(state, remotePayload);
              try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
              setLastSyncedRemoteTs(fullRows[0].updated_at || remoteHeadTs);
              render();
            }
          }
        }
      }
    } catch (e) {
      // Bei Offline/Netzwerkfehler unten sauber als Pending-Queue abfangen
    }
  }

  const updatedAt = nextMonotonicIsoTs();
  state._updatedAt = updatedAt;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  const bodyStr = JSON.stringify({
    sync_key: cfg.syncKey,
    payload: state,
    updated_at: updatedAt
  });
  // Chrome bricht fetch mit keepalive:true bei >64KB Body hart ab!
  const safeKeepalive = Boolean(useKeepalive) && bodyStr.length < 50000;

  try {
    setSyncStatusText('Sende in Cloud...');
    const res = await fetchSyncWithTimeout(`${cfg.url.replace(/\/$/, '')}/rest/v1/fuel_sync`, {
      method: 'POST',
      keepalive: safeKeepalive,
      headers: buildSyncHeaders(cfg, {
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      }),
      body: bodyStr
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `HTTP ${res.status}`);
    }
    syncRetryAttempt = 0;
    clearTimeout(syncRetryTimer);
    setPendingLocalPush(false);
    setLastSyncedRemoteTs(updatedAt);
    const kb = Math.round(bodyStr.length / 1024);
    const wCount = Array.isArray(state.workouts) ? state.workouts.length : 0;
    const timeStr = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    setSyncStatusText(`Gesendet (${wCount} Wo., ${kb} KB · ${timeStr})`);
    if (wasOfflineQueue && typeof showToast === 'function') {
      showToast('☁️ Offline-Änderungen erfolgreich synchronisiert');
    }
    if (showAlert) alert(`✅ In Cloud gesichert: ${wCount} Workouts, ${(state.weightHistory || []).length} Gewichtstage, ${(state.recipes || []).length} Rezepte.`);
  } catch (err) {
    setPendingLocalPush(true);
    if (isAppOffline()) {
      setSyncStatusText(`Offline · lokal gespeichert (${syncMeta.pendingCount} offen)`, false, 'offline');
    } else {
      setSyncStatusText(`Push-Fehler: ${err.message}`, true);
      scheduleSyncRetry();
    }
    if (showAlert) alert(`❌ Cloud-Upload fehlgeschlagen: ${err.message}`);
  }
}

async function pullStateFromCloud(forceOverwrite = false) {
  const cfg = getSyncConfig();
  if (!cfg || !cfg.url || !cfg.anonKey || !cfg.syncKey) return;
  if (isAppOffline()) {
    const cnt = syncMeta.pendingCount;
    setSyncStatusText(cnt > 0 ? `Offline · lokal gespeichert (${cnt} offen)` : 'Offline · lokal gespeichert', false, 'offline');
    if (forceOverwrite) alert('📡 Du bist aktuell offline – Cloud-Download nicht möglich.');
    return;
  }
  if (isSyncInFlight && !forceOverwrite) return;

  isSyncInFlight = true;
  try {
    const baseUrl = `${cfg.url.replace(/\/$/, '')}/rest/v1/fuel_sync?sync_key=eq.${encodeURIComponent(cfg.syncKey)}`;

    // Bei normalem Hintergrund-Check erst winzigen Zeitstempel prüfen (~40 Bytes)
    if (!forceOverwrite && !hasPendingLocalPush && lastRemoteTimestamp) {
      const headRes = await fetchSyncWithTimeout(`${baseUrl}&select=updated_at`, {
        method: 'GET',
        cache: 'no-store',
        headers: buildSyncHeaders(cfg)
      });
      if (headRes.ok) {
        const headRows = await headRes.json();
        if (headRows.length && headRows[0].updated_at && parseSyncTs(headRows[0].updated_at) === parseSyncTs(lastRemoteTimestamp)) {
          updateHeaderSyncDot('ok');
          return;
        }
      }
    }

    const res = await fetchSyncWithTimeout(`${baseUrl}&select=payload,updated_at`, {
      method: 'GET',
      cache: 'no-store',
      headers: buildSyncHeaders(cfg)
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `HTTP ${res.status}`);
    }
    const rows = await res.json();

    if (!rows.length) {
      setLastSyncedRemoteTs(new Date(0).toISOString());
      isSyncInFlight = false;
      await pushStateToCloud();
      return;
    }

    const remote = rows[0];
    const remoteTs = remote.updated_at || remote.payload?._updatedAt || '';
    const remoteHadDemoWeights = Array.isArray(remote.payload?.weightHistory) && remote.payload.weightHistory.some(isDemoWeightEntry);
    const remotePayload = remote.payload && typeof remote.payload === 'object' ? normalizeLoadedState(remote.payload) : null;
    if (!remotePayload) return;

    if (remoteHadDemoWeights || removedDemoWeightsOnLoad) {
      removedDemoWeightsOnLoad = false;
      setPendingLocalPush(true);
    }

    const isEditingNow = !forceOverwrite && (
      Boolean(editingRecipe) ||
      (typeof sportLiveOpen !== 'undefined' && sportLiveOpen)
    );

    if (forceOverwrite) {
      state = remotePayload;
      if (remoteTs) state._updatedAt = remoteTs;
      setPendingLocalPush(false);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setLastSyncedRemoteTs(remoteTs);
      render();
      const wCount = (state.workouts || []).length;
      const gCount = (state.weightHistory || []).length;
      const rCount = (state.recipes || []).length;
      setSyncStatusText(`Geladen (${wCount} Wo. · ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })})`);
      alert(wCount > 0
        ? `✅ Aus Cloud geladen: ${wCount} Workouts, ${gCount} Gewichtstage, ${rCount} Rezepte.`
        : `ℹ️ Aus Cloud geladen (${gCount} Gewichtstage, ${rCount} Rezepte), aber aktuell 0 Workouts in der Cloud.\n\nBitte am Desktop unter „Backup“ einmal auf „↑ Senden“ tippen und dann hier erneut auf „↓ Laden“.`);
      return;
    }

    const localMs = parseSyncTs(state._updatedAt);
    const remoteMs = parseSyncTs(remoteTs);
    const localWCount = (state.workouts || []).length;
    const remoteWCount = (remotePayload.workouts || []).length;
    const localWeightCount = (state.weightHistory || []).length;
    const remoteWeightCount = (remotePayload.weightHistory || []).length;
    const remoteLooksWiped =
      (localWCount > 5 && remoteWCount < Math.floor(localWCount * 0.5)) ||
      (localWeightCount > 10 && remoteWeightCount < Math.floor(localWeightCount * 0.5));

    if (!isEditingNow) {
      if (!hasPendingLocalPush && remoteMs > 0 && remoteMs > localMs && !remoteLooksWiped) {
        // Saubere 1:1-Übernahme inkl. Löschungen & Änderungen vom anderen Gerät
        state = remotePayload;
        state._updatedAt = remoteTs;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        setLastSyncedRemoteTs(remoteTs);
        render();
      } else if (hasPendingLocalPush || remoteLooksWiped || remoteWCount > localWCount || remoteWeightCount > localWeightCount || (localMs > remoteMs && remoteMs > 0)) {
        // Parallele / offline gespeicherte Änderungen verlustfrei zusammenführen und hochschicken
        const hadPending = hasPendingLocalPush;
        const merged = mergeCloudStates(state, remotePayload);
        state = merged;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        setLastSyncedRemoteTs(remoteTs);
        render();
        isSyncInFlight = false;
        await pushStateToCloud();
        if (hadPending && !hasPendingLocalPush && typeof showToast === 'function') {
          showToast('☁️ Offline-Änderungen mit Cloud abgeglichen');
        }
        return;
      } else if (remoteTs) {
        setLastSyncedRemoteTs(remoteTs);
      }
    }

    const wCount = (state.workouts || []).length;
    setSyncStatusText(`Synchron (${wCount} Wo. · ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })})`);
  } catch (err) {
    if (isAppOffline()) {
      const cnt = syncMeta.pendingCount;
      setSyncStatusText(cnt > 0 ? `Offline · lokal gespeichert (${cnt} offen)` : 'Offline · lokal gespeichert', false, 'offline');
    } else {
      setSyncStatusText(`Pull-Fehler: ${err.message}`, true);
      if (hasPendingLocalPush) scheduleSyncRetry();
    }
  } finally {
    isSyncInFlight = false;
  }
}

function saveState() {
  state._updatedAt = nextMonotonicIsoTs();
  setPendingLocalPush(true, true);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {}

  if (isAppOffline()) {
    setSyncStatusText(`Offline · lokal gespeichert (${syncMeta.pendingCount} offen)`, false, 'offline');
    return;
  }

  updateHeaderSyncDot('syncing');
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    pushStateToCloud();
  }, 250);
}

function normalizeRoutineStatus(val) {
  if (val === true || val === 'yes') return true;
  if (val === false || val === 'no') return false;
  return null;
}

function ensureDayLog(dateStr) {
  if (!state.logs[dateStr]) {
    state.logs[dateStr] = {
      entries: [],
      sportDone: [],
      badHabits: { cigarettes: null, vape: null, alcohol: null },
      routines: { creatine: null, skincare: null, sertraline: null },
      customHabits: {}
    };
  }
  if (!state.logs[dateStr].badHabits) {
    state.logs[dateStr].badHabits = { cigarettes: null, vape: null, alcohol: null };
  }
  ['cigarettes', 'vape', 'alcohol'].forEach(k => {
    state.logs[dateStr].badHabits[k] = normalizeHabitStatus(state.logs[dateStr].badHabits[k]);
  });
  if (!state.logs[dateStr].routines) {
    state.logs[dateStr].routines = { creatine: null, skincare: null, sertraline: null };
  }
  state.logs[dateStr].routines.creatine = normalizeRoutineStatus(state.logs[dateStr].routines.creatine);
  state.logs[dateStr].routines.skincare = normalizeRoutineStatus(state.logs[dateStr].routines.skincare);
  state.logs[dateStr].routines.sertraline = normalizeRoutineStatus(state.logs[dateStr].routines.sertraline);
  if (!state.logs[dateStr].customHabits || typeof state.logs[dateStr].customHabits !== 'object') {
    state.logs[dateStr].customHabits = {};
  }
  return state.logs[dateStr];
}

function nextRoutineState(current) {
  if (current === null || current === undefined) return true;
  if (current === true) return false;
  return null;
}

function toggleRoutine(key) {
  const day = ensureDayLog(state.selectedDate);
  day.routines[key] = nextRoutineState(day.routines[key]);
  saveState();
  render();
}

function toggleHeatmapRoutineDay(key, dateStr) {
  const day = ensureDayLog(dateStr);
  if (key === 'routine') {
    const activeRoutines = getEnabledBuiltinRoutines();
    const keys = activeRoutines.length ? activeRoutines.map(r => r.id) : ['creatine', 'skincare', 'sertraline'];
    const vals = keys.map(k => day.routines[k]);
    let nextVal = true;
    if (vals.every(v => v === true)) nextVal = false;
    else if (vals.every(v => v === false)) nextVal = null;
    keys.forEach(k => { day.routines[k] = nextVal; });
  } else {
    day.routines[key] = nextRoutineState(day.routines[key]);
  }
  saveState();
  render();
}

function cycleCustomHabitDay(habitId, dateStr = state.selectedDate) {
  const habit = getCustomHabitById(habitId);
  if (!habit) return;
  const day = ensureDayLog(dateStr);
  if (habit.type === 'avoid') {
    const cur = normalizeHabitStatus(day.customHabits[habitId]);
    day.customHabits[habitId] = cur === null ? 'clean' : (cur === 'clean' ? 'consumed' : null);
  } else {
    const cur = normalizeRoutineStatus(day.customHabits[habitId]);
    day.customHabits[habitId] = nextRoutineState(cur);
  }
  saveState();
  render();
}

function getCustomHabitStreak(habitId) {
  const habit = getCustomHabitById(habitId);
  if (!habit) return 0;
  let streak = 0;
  if (habit.type === 'avoid') {
    for (let i = 0; i < 60; i++) {
      const ds = getPastDateStr(i);
      const val = getCustomHabitValue(state.logs[ds], habit);
      if (val === 'clean') {
        streak++;
      } else if (i === 0 && val === null) {
        continue;
      } else {
        break;
      }
    }
    return streak;
  }
  const cursor = new Date(state.selectedDate + 'T12:00:00');
  while (streak < 365) {
    const iso = formatDateStr(cursor);
    if (getCustomHabitValue(state.logs[iso], habit) === true) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function getRoutineStreak(key) {
  let streak = 0;
  const cursor = new Date(state.selectedDate + 'T12:00:00');
  while (true) {
    const iso = cursor.toISOString().slice(0, 10);
    if (state.logs[iso]?.routines?.[key]) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// ---------- NAVIGATION & UI STATE ----------
let currentTab = 'dashboard';
let navHistory = ['dashboard'];
let editingRecipe = null;
let searchResultsCache = [];
let selectedHeatmapMetric = 'alcohol'; // 'alcohol' | 'nicotine' | 'sport'
let chartRangeDays = 14; // 7 | 14 | 30
let selectedChartDate = null;

let editingSportId = null;
let foodSubTab = 'recipes';
let dashboardSection = 'bilanz'; // 'bilanz' | 'koerper' | 'konsum' | 'sport'
let calorieHistoryDays = 14; // 7 | 14 | 30
let selectedCalorieChartDate = null;

function setDashboardSection(sec) {
  dashboardSection = sec;
  render();
}

function setCalorieHistoryDays(days) {
  calorieHistoryDays = days;
  selectedCalorieChartDate = null;
  render();
}

function selectDateFromCalorieChart(dateStr) {
  if (!dateStr) return;
  state.selectedDate = dateStr;
  ensureDayLog(dateStr);
  saveState();
  render();
}

function switchTab(tab, pushHistory = true) {
  if (tab === 'recipes' || tab === 'search') {
    tab = 'food';
  }
  if (pushHistory && currentTab !== tab) {
    navHistory.push(tab);
  }
  currentTab = tab;
  if (tab !== 'food') editingRecipe = null;
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

function escapeHtmlAttr(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function ensureValidSelectedHeatmapMetric() {
  const tabs = getAvailableHeatmapTabs();
  if (!tabs.length) {
    selectedHeatmapMetric = '';
    return tabs;
  }
  if (!tabs.some(t => t.id === selectedHeatmapMetric)) {
    selectedHeatmapMetric = tabs[0].id;
  }
  return tabs;
}

function toggleHabitCategory(catId) {
  const cfg = getHabitConfig();
  if (!Object.prototype.hasOwnProperty.call(cfg.categories, catId)) return;
  cfg.categories[catId] = !cfg.categories[catId];
  ensureValidSelectedHeatmapMetric();
  saveState();
  render();
  openHabitCustomizerModal();
}

function toggleBuiltinRoutineItem(key) {
  const cfg = getHabitConfig();
  if (!Object.prototype.hasOwnProperty.call(cfg.routineItems, key)) return;
  cfg.routineItems[key] = !cfg.routineItems[key];
  ensureValidSelectedHeatmapMetric();
  saveState();
  render();
  openHabitCustomizerModal();
}

function toggleCustomHabitEnabled(habitId) {
  const habit = getCustomHabitById(habitId);
  if (!habit) return;
  habit.enabled = !habit.enabled;
  ensureValidSelectedHeatmapMetric();
  saveState();
  render();
  openHabitCustomizerModal();
}

function toggleCustomHabitQuickCheck(habitId) {
  const habit = getCustomHabitById(habitId);
  if (!habit) return;
  habit.showInQuickCheck = habit.showInQuickCheck === false;
  saveState();
  render();
  openHabitCustomizerModal();
}

function pickCustomHabitIcon(emoji) {
  const inp = document.getElementById('custom-habit-icon');
  if (inp) inp.value = emoji;
  document.querySelectorAll('.custom-habit-emoji-btn').forEach(btn => {
    const active = btn.dataset.emoji === emoji;
    btn.className = `custom-habit-emoji-btn w-7 h-7 rounded-lg border text-sm flex items-center justify-center transition ${
      active
        ? 'bg-emerald-500/20 border-emerald-500/60 ring-1 ring-emerald-500/40'
        : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800'
    }`;
  });
}

function selectCustomHabitType(type) {
  const safeType = type === 'avoid' ? 'avoid' : 'positive';
  const hidden = document.getElementById('custom-habit-type');
  if (hidden) hidden.value = safeType;

  const posBtn = document.getElementById('custom-habit-type-positive');
  const avoidBtn = document.getElementById('custom-habit-type-avoid');
  if (posBtn) {
    posBtn.className = `p-2.5 rounded-xl border text-left transition ${
      safeType === 'positive'
        ? 'bg-emerald-500/15 border-emerald-500/60 text-white ring-1 ring-emerald-500/30'
        : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
    }`;
  }
  if (avoidBtn) {
    avoidBtn.className = `p-2.5 rounded-xl border text-left transition ${
      safeType === 'avoid'
        ? 'bg-rose-500/15 border-rose-500/60 text-white ring-1 ring-rose-500/30'
        : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
    }`;
  }
}

function addCustomHabitFromModal(event) {
  if (event) event.preventDefault();
  const nameInput = document.getElementById('custom-habit-name');
  const iconInput = document.getElementById('custom-habit-icon');
  const typeInput = document.getElementById('custom-habit-type');
  const name = (nameInput?.value || '').trim();
  if (!name) {
    if (nameInput) nameInput.focus();
    return;
  }
  const icon = (iconInput?.value || '⭐').trim().slice(0, 4) || '⭐';
  const type = typeInput?.value === 'avoid' ? 'avoid' : 'positive';
  const cfg = getHabitConfig();
  const newHabit = {
    id: 'ch_' + Date.now(),
    name,
    icon,
    type,
    enabled: true,
    showInQuickCheck: true
  };
  cfg.customHabits.push(newHabit);
  selectedHeatmapMetric = `custom:${newHabit.id}`;
  saveState();
  render();
  openHabitCustomizerModal();
  if (typeof showToast === 'function') {
    showToast(`✓ Habit „${icon} ${name}“ hinzugefügt`);
  }
}

function deleteCustomHabit(habitId) {
  const cfg = getHabitConfig();
  const habit = cfg.customHabits.find(h => h.id === habitId);
  if (!habit) return;
  if (!confirm(`Eigenes Habit „${habit.icon} ${habit.name}“ dauerhaft löschen?`)) return;
  cfg.customHabits = cfg.customHabits.filter(h => h.id !== habitId);
  ensureValidSelectedHeatmapMetric();
  saveState();
  render();
  openHabitCustomizerModal();
}

function openHabitCustomizerModal() {
  const cfg = getHabitConfig();
  const builtInCards = [
    { id: 'alcohol', icon: '🍷', label: 'Alkohol', desc: 'Verzicht / Konsum (Clean vs. Konsumiert)' },
    { id: 'nicotine', icon: '💨', label: 'Nikotin', desc: 'Zigaretten & Vape gebündelt' },
    { id: 'sport', icon: '⚡', label: 'Sport', desc: 'Trainingstage in der 30-Tage-Heatmap' },
    { id: 'routine', icon: '✨', label: 'Routine & Supplements', desc: 'Tägliche Basics (Kreatin, Skincare, Sertralin)' }
  ];
  const emojiPresets = ['💧', '📚', '🧘', '😴', '🍬', '☕', '📱', '💊', '🚶', '🥗', '🧠', '✨'];

  const renderTogglePill = (active, onClickJs) => `
    <button type="button" onclick="${onClickJs}"
      class="px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition shrink-0 ${
        active
          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
          : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:text-zinc-300'
      }">
      ${active ? 'Aktiv' : 'Aus'}
    </button>
  `;

  openModal(`
    <div class="space-y-4">
      <div class="flex items-start justify-between gap-2">
        <div>
          <h3 class="text-base font-semibold text-white">⚙️ Habits anpassen</h3>
          <p class="text-[11px] text-zinc-400 mt-0.5">Karten flexibel an-/abwählen oder eigene Habits erstellen. Vorhandene Logs bleiben beim Ausblenden erhalten.</p>
        </div>
        <button type="button" onclick="closeModal()" class="text-zinc-400 hover:text-white px-2 py-1">✕</button>
      </div>

      <!-- Standard-Karten -->
      <div class="space-y-2">
        <div class="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Standard-Karten</div>
        ${builtInCards.map(card => {
          const active = cfg.categories[card.id] !== false;
          return `
            <div class="bg-zinc-900/90 border border-border rounded-2xl p-3 space-y-2">
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <div class="text-xs font-semibold text-white">${card.icon} ${card.label}</div>
                  <div class="text-[11px] text-zinc-400">${card.desc}</div>
                </div>
                ${renderTogglePill(active, `toggleHabitCategory('${card.id}')`)}
              </div>
              ${card.id === 'routine' && active ? `
                <div class="flex flex-wrap gap-1.5 pt-2 border-t border-zinc-800">
                  ${BUILTIN_ROUTINE_DEFS.map(r => {
                    const rActive = cfg.routineItems[r.id] !== false;
                    return `
                      <button type="button" onclick="toggleBuiltinRoutineItem('${r.id}')"
                        class="px-2.5 py-1 rounded-xl text-[11px] font-medium border transition inline-flex items-center gap-1 ${
                          rActive
                            ? 'bg-emerald-500/15 border-emerald-500/45 text-emerald-300'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-500 line-through hover:text-zinc-300'
                        }">
                        <span>${r.icon}</span><span>${r.name}</span><span>${rActive ? '✓' : '✕'}</span>
                      </button>
                    `;
                  }).join('')}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>

      <!-- Eigene Habits -->
      <div class="space-y-2">
        <div class="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Eigene Habits (${cfg.customHabits.length})</div>
        ${cfg.customHabits.length > 0 ? `
          <div class="space-y-1.5">
            ${cfg.customHabits.map(h => `
              <div class="bg-zinc-900/90 border border-border rounded-2xl p-2.5 flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <div class="text-xs font-semibold text-white truncate">${escapeHtmlAttr(h.icon)} ${escapeHtmlAttr(h.name)}</div>
                  <div class="text-[10px] text-zinc-400">
                    ${h.type === 'avoid' ? '🚫 Verzicht (Clean / Konsumiert)' : '✓ Routine (Ja / Nein)'}
                  </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <button type="button" onclick="toggleCustomHabitQuickCheck('${h.id}')" title="Im Dashboard Schnell-Check anzeigen"
                    class="px-2 py-1.5 rounded-xl text-[11px] border transition ${
                      h.showInQuickCheck !== false
                        ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                    }">⚡</button>
                  ${renderTogglePill(h.enabled !== false, `toggleCustomHabitEnabled('${h.id}')`)}
                  <button type="button" onclick="deleteCustomHabit('${h.id}')" title="Löschen"
                    class="px-2 py-1.5 rounded-xl text-[11px] bg-zinc-950 hover:bg-rose-500/20 border border-zinc-800 hover:border-rose-500/40 text-zinc-400 hover:text-rose-300 transition">✕</button>
                </div>
              </div>
            `).join('')}
          </div>
        ` : `<p class="text-xs text-zinc-500">Noch keine eigenen Habits angelegt – erstelle unten dein erstes.</p>`}
      </div>

      <!-- Neues Habit erstellen -->
      <form onsubmit="addCustomHabitFromModal(event)" class="bg-zinc-950/80 border border-border rounded-2xl p-3.5 space-y-3 overflow-hidden">
        <div class="text-xs font-semibold text-white">+ Eigenes Habit erstellen</div>
        <div class="flex flex-wrap gap-1.5">
          ${emojiPresets.map((em, idx) => `
            <button type="button" data-emoji="${em}" onclick="pickCustomHabitIcon('${em}')"
              class="custom-habit-emoji-btn w-7 h-7 rounded-lg border text-sm flex items-center justify-center transition ${
                idx === 0
                  ? 'bg-emerald-500/20 border-emerald-500/60 ring-1 ring-emerald-500/40'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800'
              }">${em}</button>
          `).join('')}
        </div>
        <div class="flex gap-2 min-w-0">
          <input id="custom-habit-icon" type="text" value="💧" maxlength="4"
            class="w-12 shrink-0 text-center bg-zinc-900 border border-border rounded-xl px-2 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
          <input id="custom-habit-name" type="text" placeholder="Name (z. B. 2L Wasser, Zuckerfrei, Lesen)"
            class="flex-1 min-w-0 bg-zinc-900 border border-border rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500" />
        </div>
        <div class="space-y-1.5">
          <div class="text-[11px] font-medium text-zinc-400">Tracking-Art</div>
          <input id="custom-habit-type" type="hidden" value="positive" />
          <div class="grid grid-cols-2 gap-2">
            <button type="button" id="custom-habit-type-positive" onclick="selectCustomHabitType('positive')"
              class="p-2.5 rounded-xl border text-left transition bg-emerald-500/15 border-emerald-500/60 text-white ring-1 ring-emerald-500/30">
              <div class="flex items-center gap-1.5 text-xs font-semibold">
                <span class="text-emerald-400">✓</span>
                <span class="truncate">Aufbauen</span>
              </div>
              <div class="text-[10px] text-zinc-400 mt-0.5 leading-snug">Positive Routine · Ja / Nein / Offen</div>
            </button>
            <button type="button" id="custom-habit-type-avoid" onclick="selectCustomHabitType('avoid')"
              class="p-2.5 rounded-xl border text-left transition bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200">
              <div class="flex items-center gap-1.5 text-xs font-semibold">
                <span class="text-rose-400">🚫</span>
                <span class="truncate">Verzichten</span>
              </div>
              <div class="text-[10px] text-zinc-400 mt-0.5 leading-snug">Konsum meiden · Clean / Konsum</div>
            </button>
          </div>
        </div>
        <button type="submit" class="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition">
          + Habit hinzufügen
        </button>
      </form>

      <button type="button" onclick="closeModal()" class="w-full py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-xs transition">
        Fertig
      </button>
    </div>
  `);
}

const LANG_STORAGE_KEY = 'fuel_and_flow_lang';
let appLang = (() => {
  try {
    return localStorage.getItem(LANG_STORAGE_KEY) === 'es' ? 'es' : 'de';
  } catch (e) {
    return 'de';
  }
})();

function getAppLocale() {
  return appLang === 'es' ? 'es-ES' : 'de-DE';
}

// ---------- FOOD API (OPEN FOOD FACTS + USDA) ----------
const DE_TO_EN = {
  // Español (Búsqueda rápida de ingredientes)
  'pollo': 'chicken breast raw',
  'pechuga de pollo': 'chicken breast raw',
  'pavo': 'turkey breast raw',
  'ternera': 'beef lean raw',
  'carne picada': 'ground beef lean',
  'atún': 'tuna canned in water',
  'atun': 'tuna canned in water',
  'salmón': 'salmon raw',
  'salmon': 'salmon raw',
  'huevo': 'egg whole raw',
  'huevos': 'egg whole raw',
  'arroz': 'rice raw',
  'avena': 'oats rolled',
  'copos de avena': 'oats rolled',
  'pasta': 'pasta dry',
  'pan': 'bread whole wheat',
  'patata': 'potatoes raw',
  'patatas': 'potatoes raw',
  'papa': 'potatoes raw',
  'boniato': 'sweet potato raw',
  'leche': 'milk whole',
  'yogur': 'yogurt plain',
  'queso fresco': 'cottage cheese',
  'requesón': 'cottage cheese',
  'requeson': 'cottage cheese',
  'queso': 'gouda cheese',
  'tofu': 'tofu firm',
  'aceite de oliva': 'olive oil',
  'mantequilla': 'butter',
  'aguacate': 'avocado raw',
  'plátano': 'banana raw',
  'platano': 'banana raw',
  'manzana': 'apple raw',
  'fresas': 'strawberries raw',
  'arándanos': 'blueberries raw',
  'cebolla': 'onion raw',
  'cebolla roja': 'red onion raw',
  'ajo': 'garlic raw',
  'tomate': 'tomatoes raw',
  'pepino': 'cucumber raw',
  'pimiento': 'bell pepper raw',
  'brócoli': 'broccoli raw',
  'brocoli': 'broccoli raw',
  'espinacas': 'spinach raw',
  'lentejas': 'lentils cooked',
  'garbanzos': 'chickpeas cooked',
  'frijoles': 'kidney beans cooked',
  'nueces': 'walnuts',
  'almendras': 'almonds',
  // Gemüse & Kräuter
  'rote zwiebel': 'red onion raw',
  'rote zwiebeln': 'red onion raw',
  'zwiebel': 'onion raw',
  'zwiebeln': 'onion raw',
  'frühlingszwiebel': 'scallion green onion raw',
  'frühlingszwiebeln': 'scallion green onion raw',
  'lauchzwiebel': 'scallion green onion raw',
  'schalotte': 'shallot raw',
  'schalotten': 'shallot raw',
  'knoblauch': 'garlic raw',
  'knoblauchzehe': 'garlic raw',
  'ingwer': 'ginger root raw',
  'tomate': 'tomato raw',
  'tomaten': 'tomato raw',
  'kirschtomaten': 'cherry tomatoes raw',
  'cherrytomaten': 'cherry tomatoes raw',
  'passierte tomaten': 'tomato puree',
  'gehackte tomaten': 'canned crushed tomatoes',
  'tomatenmark': 'tomato paste',
  'paprika': 'bell pepper raw',
  'rote paprika': 'red bell pepper raw',
  'gelbe paprika': 'yellow bell pepper raw',
  'grüne paprika': 'green bell pepper raw',
  'gurke': 'cucumber raw',
  'salatgurke': 'cucumber raw',
  'zucchini': 'zucchini raw',
  'aubergine': 'eggplant raw',
  'brokkoli': 'broccoli raw',
  'blumenkohl': 'cauliflower raw',
  'spinat': 'spinach raw',
  'babyspinat': 'spinach raw',
  'karotte': 'carrot raw',
  'karotten': 'carrot raw',
  'möhre': 'carrot raw',
  'möhren': 'carrot raw',
  'kartoffel': 'potato raw',
  'kartoffeln': 'potato raw',
  'süßkartoffel': 'sweet potato raw',
  'süßkartoffeln': 'sweet potato raw',
  'champignons': 'mushrooms raw',
  'pilze': 'mushrooms raw',
  'lauch': 'leek raw',
  'porree': 'leek raw',
  'sellerie': 'celery raw',
  'spargel': 'asparagus raw',
  'rotkohl': 'red cabbage raw',
  'weißkohl': 'cabbage raw',
  'rucola': 'arugula raw',
  'feldsalat': 'lambs lettuce raw',
  'eisbergsalat': 'iceberg lettuce raw',
  'salat': 'lettuce raw',
  'mais': 'sweet corn',
  'erbsen': 'green peas',
  'grüne bohnen': 'green beans',
  'kidneybohnen': 'kidney beans cooked',
  'schwarze bohnen': 'black beans cooked',
  'kichererbsen': 'chickpeas cooked',
  'linsen': 'lentils dry',
  'rote linsen': 'red lentils dry',
  'edamame': 'edamame',
  'avocado': 'avocado raw',
  'oliven': 'olives',
  'chili': 'chili pepper raw',
  'petersilie': 'parsley fresh',
  'basilikum': 'basil fresh',
  'koriander': 'coriander fresh',

  // Obst
  'apfel': 'apple raw',
  'äpfel': 'apple raw',
  'banane': 'banana raw',
  'bananen': 'banana raw',
  'beeren': 'mixed berries',
  'blaubeeren': 'blueberries raw',
  'heidelbeeren': 'blueberries raw',
  'himbeeren': 'raspberries raw',
  'erdbeeren': 'strawberries raw',
  'mango': 'mango raw',
  'orange': 'orange raw',
  'zitrone': 'lemon raw',
  'zitronensaft': 'lemon juice',
  'limette': 'lime raw',
  'trauben': 'grapes raw',
  'birne': 'pear raw',
  'kiwi': 'kiwi raw',
  'ananas': 'pineapple raw',
  'wassermelone': 'watermelon raw',
  'datteln': 'dates medjool',

  // Öle, Fette, Soßen & Gewürze
  'olivenöl': 'olive oil',
  'rapsöl': 'canola oil',
  'sonnenblumenöl': 'sunflower oil',
  'kokosöl': 'coconut oil',
  'leinöl': 'flaxseed oil',
  'sesamöl': 'sesame oil',
  'butter': 'butter',
  'ghee': 'ghee clarified butter',
  'sojasoße': 'soy sauce',
  'sojasauce': 'soy sauce',
  'balsamico': 'balsamic vinegar',
  'essig': 'vinegar',
  'senf': 'mustard',
  'pesto': 'basil pesto',
  'honig': 'honey',
  'ahornsirup': 'maple syrup',
  'ketchup': 'tomato ketchup',
  'mayonnaise': 'mayonnaise',
  'hummus': 'hummus',
  'tahini': 'tahini sesame paste',
  'erdnussbutter': 'peanut butter',
  'erdnussmus': 'peanut butter',
  'mandelmus': 'almond butter',
  'kokosmilch': 'coconut milk canned',

  // Protein, Fleisch, Fisch, Eier, Milchprodukte
  'hähnchen': 'chicken breast raw',
  'hähnchenbrust': 'chicken breast raw',
  'hühnchen': 'chicken breast raw',
  'pute': 'turkey breast raw',
  'putenbrust': 'turkey breast raw',
  'rindfleisch': 'beef lean raw',
  'rinderhack': 'ground beef lean',
  'hackfleisch': 'ground beef lean',
  'schweinefleisch': 'pork loin raw',
  'lachs': 'salmon raw',
  'räucherlachs': 'smoked salmon',
  'thunfisch': 'tuna canned in water',
  'garnelen': 'shrimp raw',
  'kabeljau': 'cod raw',
  'forelle': 'trout raw',
  'ei': 'egg whole raw',
  'eier': 'egg whole raw',
  'tofu': 'tofu firm',
  'räuchertofu': 'smoked tofu',
  'tempeh': 'tempeh',
  'seitan': 'seitan',
  'magerquark': 'quark low fat',
  'quark': 'quark cheese',
  'skyr': 'skyr icelandic yogurt',
  'joghurt': 'greek yogurt plain',
  'naturjoghurt': 'plain yogurt',
  'griechischer joghurt': 'greek yogurt',
  'körniger frischkäse': 'cottage cheese',
  'körnigen frischkäse': 'cottage cheese',
  'körniger frischkäse light': 'cottage cheese low fat',
  'hüttenkäse': 'cottage cheese',
  'cottage cheese': 'cottage cheese',
  'frischkäse': 'cream cheese',
  'mozzarella': 'mozzarella cheese',
  'feta': 'feta cheese',
  'parmesan': 'parmesan cheese',
  'gouda': 'gouda cheese',
  'käse': 'cheese cheddar',
  'milch': 'milk 1.5%',
  'vollmilch': 'whole milk',
  'sahne': 'heavy cream',
  'schlagsahne': 'heavy cream',
  'schmand': 'sour cream',
  'sojamilch': 'soy milk unsweetened',
  'hafermilch': 'oat milk',
  'mandelmilch': 'almond milk unsweetened',
  'whey': 'whey protein powder',
  'proteinpulver': 'whey protein powder',

  // Getreide, Backwaren, Nüsse & Samen
  'haferflocken': 'oats rolled',
  'reis': 'rice white raw',
  'basmatireis': 'basmati rice raw',
  'vollkornreis': 'brown rice raw',
  'nudeln': 'pasta dry',
  'vollkornnudeln': 'whole wheat pasta dry',
  'spaghetti': 'spaghetti dry',
  'quinoa': 'quinoa dry',
  'couscous': 'couscous dry',
  'bulgur': 'bulgur dry',
  'brot': 'sourdough bread',
  'vollkornbrot': 'whole wheat bread',
  'brötchen': 'bread roll',
  'toast': 'toast bread',
  'wrap': 'tortilla wrap',
  'mehl': 'wheat flour',
  'mandeln': 'almonds',
  'walnüsse': 'walnuts',
  'cashews': 'cashew nuts',
  'erdnüsse': 'peanuts',
  'haselnüsse': 'hazelnuts',
  'pistazien': 'pistachios',
  'kürbiskerne': 'pumpkin seeds',
  'sonnenblumenkerne': 'sunflower seeds',
  'chiasamen': 'chia seeds',
  'leinsamen': 'flaxseed',
  'sesam': 'sesame seeds',
  'dunkle schokolade': 'dark chocolate 70%',
  'schokolade': 'chocolate'
};

const DE_WORD_MAP = {
  'rot': 'red', 'rote': 'red', 'roter': 'red', 'rotes': 'red',
  'grün': 'green', 'grüne': 'green', 'gelb': 'yellow', 'gelbe': 'yellow',
  'weiß': 'white', 'weiße': 'white', 'schwarz': 'black', 'schwarze': 'black',
  'frisch': 'fresh', 'frische': 'fresh', 'roh': 'raw', 'rohe': 'raw',
  'gekocht': 'cooked', 'gekochte': 'cooked', 'gebraten': 'fried',
  'getrocknet': 'dried', 'getrocknete': 'dried', 'geräuchert': 'smoked',
  'vollkorn': 'whole wheat', 'fettarm': 'low fat', 'mager': 'lean',
  'ungesüßt': 'unsweetened', 'bio': ''
};

function translateFoodQueryDeToEn(rawQuery) {
  const clean = String(rawQuery || '').trim().toLowerCase();
  if (!clean) return '';
  if (DE_TO_EN[clean]) return DE_TO_EN[clean];

  // Teilphrasen & Wort-für-Wort übersetzen (z. B. "rote zwiebeln", "getrocknete tomaten")
  const tokens = clean.split(/\s+/).filter(Boolean);
  let translatedAny = false;
  const out = tokens.map(tok => {
    if (DE_TO_EN[tok]) { translatedAny = true; return DE_TO_EN[tok]; }
    if (DE_WORD_MAP[tok] !== undefined) { translatedAny = true; return DE_WORD_MAP[tok]; }
    for (const suf of ['en', 'n', 'e', 's']) {
      if (tok.length > 4 && tok.endsWith(suf)) {
        const stem = tok.slice(0, -suf.length);
        if (DE_TO_EN[stem]) { translatedAny = true; return DE_TO_EN[stem]; }
      }
    }
    if (tok.length >= 3) {
      const prefKey = Object.keys(DE_TO_EN).find(k => k.startsWith(tok));
      if (prefKey) { translatedAny = true; return DE_TO_EN[prefKey]; }
    }
    return tok;
  }).filter(Boolean);

  if (translatedAny) return out.join(' ');

  if (clean.length >= 3) {
    const subKey = Object.keys(DE_TO_EN).find(k => k.includes(clean));
    if (subKey) return DE_TO_EN[subKey];
  }
  return clean;
}

const liveSearchTimers = {};
const liveSearchSeq = {};
const liveSearchControllers = {};
const liveSearchCache = new Map();

function getLocalFoodMatches(rawQuery) {
  const q = String(rawQuery || '').trim().toLowerCase();
  if (q.length < 2) return [];
  const seen = new Set();
  const starts = [];
  const contains = [];

  const consider = (item, sourceLabel) => {
    if (!item || !item.name) return;
    const name = String(item.name).trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) return;
    const kcal100 = Math.round(Number(item.kcal100) || 0);
    if (kcal100 <= 0) return;
    if (!key.includes(q)) return;
    seen.add(key);
    const entry = {
      name,
      source: sourceLabel,
      defaultGrams: Math.max(1, Math.round(Number(item.grams) || suggestDefaultGrams(name))),
      kcal100,
      p100: Math.round((Number(item.p100) || 0) * 10) / 10,
      c100: Math.round((Number(item.c100) || 0) * 10) / 10,
      f100: Math.round((Number(item.f100) || 0) * 10) / 10
    };
    if (key.startsWith(q)) starts.push(entry);
    else contains.push(entry);
  };

  (state.snacks || []).forEach(s => consider(s, 'Gespeichert'));
  (state.recipes || []).forEach(r => {
    (r.items || []).forEach(it => consider(it, 'Deine Zutaten'));
  });

  return [...starts, ...contains].slice(0, 5);
}

function getFoodSuggestions(rawQuery) {
  const q = String(rawQuery || '').trim().toLowerCase();
  if (q.length < 2) return [];

  const titleCase = s => s.replace(/(^|\s)([a-zäöüß])/g, (_, sp, ch) => sp + ch.toUpperCase());
  const pool = new Map();
  // Eigene bereits genutzte Snacks & Rezeptzutaten zuerst merken
  (state.snacks || []).forEach(s => {
    const base = String(s.name || '').split('(')[0].trim();
    if (base.length >= 2) pool.set(base.toLowerCase(), base);
  });
  (state.recipes || []).forEach(r => {
    (r.items || []).forEach(it => {
      const base = String(it.name || '').split('(')[0].trim();
      if (base.length >= 2) pool.set(base.toLowerCase(), base);
    });
  });
  Object.keys(DE_TO_EN).forEach(k => {
    if (!pool.has(k)) pool.set(k, titleCase(k));
  });

  const starts = [];
  const contains = [];
  pool.forEach((label, key) => {
    if (key === q) return;
    if (key.startsWith(q)) starts.push(label);
    else if (key.includes(q)) contains.push(label);
  });

  return [...starts, ...contains].slice(0, 6);
}

function scheduleLiveFoodSearch(mode, rawVal) {
  if (mode !== 'builder' && mode !== 'snack') return;
  if (liveSearchTimers[mode]) {
    clearTimeout(liveSearchTimers[mode]);
    liveSearchTimers[mode] = null;
  }
  const q = String(rawVal || '').trim();
  const boxId = mode === 'builder' ? 'builder-search-results' : 'snack-search-results';
  const box = document.getElementById(boxId);

  if (q.length < 2) {
    liveSearchSeq[mode] = (liveSearchSeq[mode] || 0) + 1;
    if (liveSearchControllers[mode]) {
      try { liveSearchControllers[mode].abort(); } catch (e) {}
      liveSearchControllers[mode] = null;
    }
    if (box) box.innerHTML = '';
    return;
  }

  // Sofort (0ms): lokale Treffer oder Cache anzeigen
  const cacheKey = q.toLowerCase();
  if (liveSearchCache.has(cacheKey)) {
    const cached = liveSearchCache.get(cacheKey);
    searchResultsCache = cached;
    if (mode === 'snack') renderSnackSearchResults(cached, false);
    else renderBuilderSearchResults(cached, false);
    return;
  }

  const localHits = getLocalFoodMatches(q);
  if (localHits.length) {
    searchResultsCache = localHits;
    if (mode === 'snack') renderSnackSearchResults(localHits, true);
    else renderBuilderSearchResults(localHits, true);
  } else if (box) {
    box.innerHTML = `<div class="text-[11px] text-zinc-400 py-1.5">⏳ Suche passende Einträge…</div>`;
  }

  liveSearchTimers[mode] = setTimeout(() => {
    liveSearchTimers[mode] = null;
    if (mode === 'snack') runSnackSearch(true);
    else runBuilderSearch(true);
  }, 300);
}

function renderFoodSuggestions(mode, rawVal) {
  const boxId = mode === 'builder'
    ? 'builder-search-suggestions'
    : (mode === 'snack' ? 'snack-search-suggestions' : 'global-food-suggestions');
  const box = document.getElementById(boxId);
  if (box) {
    const list = getFoodSuggestions(rawVal);
    if (!list.length) {
      box.innerHTML = '';
    } else {
      box.innerHTML = list.map(label => {
        const safe = label.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        return `
          <button type="button" onclick="applyFoodSuggestion('${mode}', '${safe}')"
            class="px-2.5 py-1 rounded-full bg-zinc-900 hover:bg-emerald-500/20 border border-border hover:border-emerald-500/40 text-[11px] text-zinc-200 hover:text-emerald-300 transition">
            ${label}
          </button>
        `;
      }).join('');
    }
  }
  if (mode === 'builder' || mode === 'snack') {
    scheduleLiveFoodSearch(mode, rawVal);
  }
}

function applyFoodSuggestion(mode, term) {
  const inpId = mode === 'builder'
    ? 'builder-search-input'
    : (mode === 'snack' ? 'snack-search-input' : 'global-food-query');
  const boxId = mode === 'builder'
    ? 'builder-search-suggestions'
    : (mode === 'snack' ? 'snack-search-suggestions' : 'global-food-suggestions');
  const inp = document.getElementById(inpId);
  const sugBox = document.getElementById(boxId);
  if (inp) inp.value = term;
  if (sugBox) sugBox.innerHTML = '';
  if (liveSearchTimers[mode]) {
    clearTimeout(liveSearchTimers[mode]);
    liveSearchTimers[mode] = null;
  }
  if (mode === 'builder') runBuilderSearch(false);
  else if (mode === 'snack') runSnackSearch(false);
  else runGlobalFoodSearch();
}

function suggestDefaultGrams(foodName) {
  const n = String(foodName || '').toLowerCase();
  // Körniger Frischkäse / Hüttenkäse / Cottage Cheese (1 Becher = 200 g) vor normalem Frischkäse prüfen
  if (/(körnige[rn]?\s+frischkäse|hüttenkäse|cottage cheese)/.test(n)) {
    return 200;
  }
  // Riegel & typische Snacks: 50 g
  if (/(riegel|proteinriegel|schokoriegel|snickers|\bmars\b|twix|bounty|hanuta|duplo|knoppers|corny|kinder bueno|kitkat|protein bar|\bbar\b)/.test(n)) {
    return 50;
  }
  // Öle, Knoblauch, Gewürze, Kräuter: 5 g
  if (/(öl\b|\boil\b|olive oil|canola|sunflower oil|coconut oil|flaxseed oil|sesame oil|knoblauch|garlic|ingwer|ginger|gewürz|spice|pfeffer|pepper\b|salz|salt\b|chili|petersilie|basilikum|koriander|parsley|basil|zimt|cinnamon|curry|kurkuma)/.test(n)) {
    return 5;
  }
  // Essig, Sojasoße, Senf, Zitronensaft, Samen: 10 g
  if (/(essig|vinegar|balsamico|sojasoße|sojasauce|soy sauce|senf|mustard|zitronensaft|lemon juice|chia|leinsamen|flaxseed|sesam\b|tomatenmark|tomato paste|hefe)/.test(n)) {
    return 10;
  }
  // Aufstriche, Butter, Honig, Sirup, Pesto, Parmesan, Soßen: 15 g
  if (/(butter|ghee|honig|honey|sirup|syrup|pesto|parmesan|marmelade|jam\b|mayo|ketchup|tahini|erdnussbutter|erdnussmus|peanut butter|mandelmus|almond butter|frischkäse|cream cheese|hummus)/.test(n)) {
    return 15;
  }
  // Nüsse, Kerne, Schokolade, Käse, Proteinpulver: 30 g
  if (/(mandel|almond|walnuss|walnüsse|walnut|cashew|erdnuss|erdnüsse|peanut|haselnuss|pistazi|kern|seed|schokolade|chocolate|käse|cheese|feta|gouda|whey|proteinpulver|protein powder|dattel|date)/.test(n)) {
    return 30;
  }
  // Zwiebeln, Schalotten, Frühlingszwiebeln, Oliven: 50 g
  if (/(zwiebel|onion|schalott|shallot|scallion|olive)/.test(n)) {
    return 50;
  }
  // Eier, Brot, Haferflocken, trockenes Getreide/Nudeln/Reis: 60–75 g
  if (/(\bei\b|eier|\begg|eggs|brot|bread|brötchen|toast|wrap|tortilla)/.test(n)) {
    return 60;
  }
  if (/(haferflocken|oats|reis|rice|nudel|pasta|spaghetti|quinoa|couscous|bulgur|linsen|lentil|mehl|flour)/.test(n)) {
    return 75;
  }
  // Fleisch, Fisch, Tofu, Quark, Skyr, Joghurt, Kartoffeln, Gemüse, Obst: 150 g
  if (/(hähnchen|chicken|pute|turkey|rind|beef|lachs|salmon|thunfisch|tuna|tofu|tempeh|quark|skyr|joghurt|yogurt|kartoffel|potato|brokkoli|broccoli|tomate|tomato|paprika|bell pepper|gurke|cucumber|zucchini|apfel|apple|banane|banana|beeren|berries)/.test(n)) {
    return 150;
  }
  // Milch & Pflanzendrinks: 200 g
  if (/(milch|milk)/.test(n)) {
    return 200;
  }
  return 100;
}

async function searchFoodsLive(query, signal = null) {
  const q = (query || '').trim();
  if (q.length < 2) return [];
  const offResults = [];
  const usdaResults = [];
  const fetchOpts = signal ? { signal } : {};

  const offPromise = fetch(`https://de.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&lc=de&cc=de&page_size=12&fields=product_name,product_name_de,brands,nutriments`, fetchOpts)
    .then(r => r.json())
    .then(data => {
      (data.products || []).forEach(p => {
        const n = p.nutriments || {};
        const kcal = Number(n['energy-kcal_100g'] || n['energy-kcal'] || 0);
        const rawName = (p.product_name_de || p.product_name || '').trim();
        if (!rawName || kcal <= 0) return;
        const fullName = p.brands ? `${rawName} (${p.brands.split(',')[0].trim()})` : rawName;
        offResults.push({
          name: fullName,
          source: 'Open Food Facts',
          defaultGrams: suggestDefaultGrams(`${q} ${fullName}`),
          kcal100: Math.round(kcal),
          p100: Math.round((Number(n.proteins_100g) || 0) * 10) / 10,
          c100: Math.round((Number(n.carbohydrates_100g) || 0) * 10) / 10,
          f100: Math.round((Number(n.fat_100g) || 0) * 10) / 10
        });
      });
    })
    .catch(() => {});

  const enQuery = translateFoodQueryDeToEn(q);
  const wasTranslated = enQuery.toLowerCase() !== q.toLowerCase();
  const usdaPromise = fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=DEMO_KEY&query=${encodeURIComponent(enQuery)}&pageSize=8`, fetchOpts)
    .then(r => r.json())
    .then(data => {
      (data.foods || []).forEach(f => {
        const getNut = (num) => {
          const found = (f.foodNutrients || []).find(x => String(x.nutrientNumber) === num || x.nutrientId === Number(num));
          return found ? Number(found.value) : 0;
        };
        const kcal = getNut('208') || getNut('1008');
        if (!f.description || kcal <= 0) return;
        const displayName = wasTranslated ? `${q} (${f.description})` : f.description;
        usdaResults.push({
          name: displayName,
          source: 'USDA FoodData',
          defaultGrams: suggestDefaultGrams(`${q} ${f.description}`),
          kcal100: Math.round(kcal),
          p100: Math.round((getNut('203') || getNut('1003')) * 10) / 10,
          c100: Math.round((getNut('205') || getNut('1005')) * 10) / 10,
          f100: Math.round((getNut('204') || getNut('1004')) * 10) / 10
        });
      });
    })
    .catch(() => {});

  await Promise.all([offPromise, usdaPromise]);
  if (signal && signal.aborted) return null;

  const localHits = getLocalFoodMatches(q);
  const remoteMerged = wasTranslated
    ? [...usdaResults.slice(0, 4), ...offResults, ...usdaResults.slice(4)]
    : [...offResults, ...usdaResults];

  const seenNames = new Set();
  const deduped = [];
  [...localHits, ...remoteMerged].forEach(it => {
    const key = String(it.name || '').trim().toLowerCase();
    if (!key || seenNames.has(key)) return;
    seenNames.add(key);
    deduped.push(it);
  });

  const finalList = deduped.slice(0, 18);
  liveSearchCache.set(q.toLowerCase(), finalList);
  if (liveSearchCache.size > 40) {
    const firstKey = liveSearchCache.keys().next().value;
    liveSearchCache.delete(firstKey);
  }
  searchResultsCache = finalList;
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
  if (dateStr === getTodayStr()) return appLang === 'es' ? 'Hoy' : 'Heute';
  if (dateStr === getPastDateStr(1)) return appLang === 'es' ? 'Ayer' : 'Gestern';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

function getLastNDays(n) {
  const days = [];
  const weekdays = appLang === 'es'
    ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    : ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const todayWord = appLang === 'es' ? 'Hoy' : 'Heute';
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
      label: i === 0 ? todayWord : weekdays[d.getDay()]
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

// ---------- KORRELATIONS-INSIGHTS ENGINE (v2: Workouts, Makros, Körperwerte & Routinen) ----------
function computeHabitInsights() {
  const days30 = getLastNDays(30);
  const insights = [];
  const weekdayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const habitCfg = getHabitConfig();
  const enabledRoutines = getEnabledBuiltinRoutines();
  const enabledCustomHabits = getCustomHabits(true);
  const alcoholEnabled = habitCfg.categories.alcohol !== false;
  const nicotineEnabled = habitCfg.categories.nicotine !== false;

  // Workouts & Gewichtsmessungen nach Datum indizieren
  const workoutDates = new Set();
  const workoutCountByDate = {};
  (state.workouts || []).forEach(w => {
    if (!w || !w.date) return;
    workoutDates.add(w.date);
    workoutCountByDate[w.date] = (workoutCountByDate[w.date] || 0) + 1;
  });

  const weightByDate = {};
  (state.weightHistory || []).forEach(w => {
    if (w && w.date && Number(w.weight) > 0) weightByDate[w.date] = w;
  });

  const addDaysIso = (isoStr, delta) => {
    const dt = new Date(isoStr + 'T12:00:00');
    dt.setDate(dt.getDate() + delta);
    return formatDateStr(dt);
  };

  let sportTracked = 0, sportNicClean = 0;
  let restTracked = 0, restNicClean = 0;
  let totalSportDays30 = 0;

  let sportProteinSum = 0, sportProteinDays = 0;
  let restProteinSum = 0, restProteinDays = 0;

  let kcalDiffSum = 0, kcalLoggedDays = 0;

  let alcKcalSum = 0, alcKcalDays = 0;
  let cleanAlcKcalSum = 0, cleanAlcKcalDays = 0;
  let alcNextWeightDiffSum = 0, alcNextWeightDays = 0;
  let cleanNextWeightDiffSum = 0, cleanNextWeightDays = 0;

  let routineAnyTracked = 0;
  let routineFullDays = 0;
  const routineCounts = { creatine: 0, skincare: 0, sertraline: 0 };
  let fullRoutineCleanDays = 0, fullRoutineKonsumTracked = 0;
  let partialRoutineCleanDays = 0, partialRoutineKonsumTracked = 0;

  const customStats = {};
  enabledCustomHabits.forEach(h => {
    customStats[h.id] = { habit: h, good: 0, bad: 0, tracked: 0 };
  });

  const weekdayConsumedCounts = [0, 0, 0, 0, 0, 0, 0];
  const weekdaySportCounts = [0, 0, 0, 0, 0, 0, 0];

  const weightsIn30 = [];

  days30.forEach(d => {
    const log = state.logs[d.dateStr] || null;
    const hasSportChip = Boolean(log && Array.isArray(log.sportDone) && log.sportDone.length > 0);
    const hasWorkout = workoutDates.has(d.dateStr);
    const hasSport = hasSportChip || hasWorkout;

    if (hasSport) {
      totalSportDays30++;
      weekdaySportCounts[d.weekdayIdx]++;
    }

    const wEntry = weightByDate[d.dateStr];
    if (wEntry) weightsIn30.push(wEntry);

    const nicStatus = nicotineEnabled && log ? getCombinedNicotineStatus(log) : null;
    const alc = alcoholEnabled && log && log.badHabits ? normalizeHabitStatus(log.badHabits.alcohol) : null;

    if (nicStatus !== null) {
      if (hasSport) {
        sportTracked++;
        if (nicStatus === 'clean') sportNicClean++;
      } else {
        restTracked++;
        if (nicStatus === 'clean') restNicClean++;
      }
    }

    const entries = log && Array.isArray(log.entries) ? log.entries : [];
    const dayKcal = entries.reduce((s, e) => s + (Number(e.kcal) || 0), 0);
    const dayProtein = entries.reduce((s, e) => s + (Number(e.p) || 0), 0);

    if (dayKcal > 200) {
      const target = getDynamicCalorieTarget(d.dateStr);
      const tdee = target.baseTdee + target.sportBonus;
      kcalDiffSum += (dayKcal - tdee);
      kcalLoggedDays++;

      if (hasSport) {
        sportProteinSum += dayProtein;
        sportProteinDays++;
      } else {
        restProteinSum += dayProtein;
        restProteinDays++;
      }

      if (alc === 'consumed') {
        alcKcalSum += dayKcal;
        alcKcalDays++;
      } else if (alc === 'clean') {
        cleanAlcKcalSum += dayKcal;
        cleanAlcKcalDays++;
      }
    }

    // Alkohol-Effekt auf Folgetag-Gewicht
    if (alc !== null && wEntry) {
      const nextW = weightByDate[addDaysIso(d.dateStr, 1)];
      if (nextW) {
        const wDelta = Number(nextW.weight) - Number(wEntry.weight);
        if (alc === 'consumed') {
          alcNextWeightDiffSum += wDelta;
          alcNextWeightDays++;
        } else if (alc === 'clean') {
          cleanNextWeightDiffSum += wDelta;
          cleanNextWeightDays++;
        }
      }
    }

    // Routine & Supplements (nur aktivierte Routine-Items)
    if (enabledRoutines.length > 0 && log && log.routines) {
      const r = log.routines;
      let doneCnt = 0;
      enabledRoutines.forEach(item => {
        if (r[item.id] === true) {
          doneCnt++;
          routineCounts[item.id] = (routineCounts[item.id] || 0) + 1;
        }
      });
      if (doneCnt > 0) routineAnyTracked++;
      if (doneCnt === enabledRoutines.length) routineFullDays++;

      const hasKonsumData = alc !== null || nicStatus !== null;
      if (hasKonsumData) {
        const isFullyClean = (alc !== 'consumed') && (nicStatus !== 'consumed');
        if (doneCnt === enabledRoutines.length) {
          fullRoutineKonsumTracked++;
          if (isFullyClean) fullRoutineCleanDays++;
        } else {
          partialRoutineKonsumTracked++;
          if (isFullyClean) partialRoutineCleanDays++;
        }
      }
    }

    // Eigene Habits
    enabledCustomHabits.forEach(h => {
      const val = getCustomHabitValue(log, h);
      if (val === null) return;
      const st = customStats[h.id];
      st.tracked++;
      if (h.type === 'avoid') {
        if (val === 'clean') st.good++;
        else if (val === 'consumed') {
          st.bad++;
          weekdayConsumedCounts[d.weekdayIdx]++;
        }
      } else {
        if (val === true) st.good++;
        else if (val === false) st.bad++;
      }
    });

    if (alc === 'consumed') weekdayConsumedCounts[d.weekdayIdx]++;
    if (nicStatus === 'consumed') weekdayConsumedCounts[d.weekdayIdx]++;
  });

  // 1) Training (inkl. Sport-Tab Workouts) & Nikotin-Balance (nur wenn Nikotin aktiv)
  if (nicotineEnabled) {
    if (sportTracked >= 2 && restTracked >= 2) {
      const sportPct = Math.round((sportNicClean / sportTracked) * 100);
      const restPct = Math.round((restNicClean / restTracked) * 100);
      const diff = sportPct - restPct;
      insights.push({
        icon: '🏋️',
        title: 'Training & Nikotin-Balance',
        badge: diff > 0 ? `+${diff} %` : `${sportPct} % clean`,
        badgeTone: diff >= 0 ? 'emerald' : 'amber',
        text: diff >= 0
          ? `An Trainingstagen (${totalSportDays30} aktiv in 30T) bist du zu <strong>${sportPct} %</strong> nikotinfrei – gegenüber <strong>${restPct} %</strong> an Ruhetagen${diff > 0 ? ` (+${diff} %-Punkte)` : ''}.`
          : `An Trainingstagen liegt deine nikotinfreie Quote bei <strong>${sportPct} %</strong> (Ruhetage: ${restPct} %).`
      });
    } else {
      insights.push({
        icon: '🏋️',
        title: 'Training & Verzicht-Korrelation',
        badge: `${totalSportDays30} Sporttage`,
        badgeTone: 'zinc',
        text: `Inkl. Sport-Tab wurden <strong>${totalSportDays30} Trainingstage</strong> erkannt. Sobald je mind. 2 Trainings- und Ruhetage mit Nikotin-Status erfasst sind, erscheint dein Vergleich (${sportTracked + restTracked}/4).`
      });
    }
  }

  // 2) Training & Protein-Versorgung
  const totalProtDays = sportProteinDays + restProteinDays;
  if (sportProteinDays >= 1 && restProteinDays >= 1) {
    const avgSportP = Math.round(sportProteinSum / sportProteinDays);
    const avgRestP = Math.round(restProteinSum / restProteinDays);
    const goalP = Number(state.proteinGoal) || 160;
    const hitPct = Math.round((avgSportP / goalP) * 100);
    insights.push({
      icon: '🥩',
      title: 'Protein an Trainingstagen',
      badge: `${hitPct} % Ziel`,
      badgeTone: hitPct >= 90 ? 'emerald' : 'amber',
      text: `An Trainingstagen erreichst du im Schnitt <strong>${avgSportP} g Protein</strong> (Ziel: ${goalP} g) vs. <strong>${avgRestP} g</strong> an Ruhetagen.`
    });
  } else if (totalProtDays >= 1) {
    const avgP = Math.round((sportProteinSum + restProteinSum) / totalProtDays);
    const goalP = Number(state.proteinGoal) || 160;
    const hitPct = Math.round((avgP / goalP) * 100);
    insights.push({
      icon: '🥩',
      title: 'Protein-Versorgung',
      badge: `Ø ${avgP} g`,
      badgeTone: hitPct >= 90 ? 'emerald' : 'amber',
      text: `Über ${totalProtDays} erfasste Tage liegst du bei <strong>Ø ${avgP} g Protein</strong> (${hitPct} % deines ${goalP} g Ziels). Sobald Trainings- und Ruhetage mit Mahlzeiten vorliegen, wird getrennt verglichen.`
    });
  } else {
    insights.push({
      icon: '🥩',
      title: 'Protein & Trainings-Korrelation',
      badge: 'Wartet auf Logs',
      badgeTone: 'zinc',
      text: `Sobald du Mahlzeiten einträgst, vergleicht diese Karte deine Protein-Zufuhr zwischen Trainings- und Ruhetagen direkt gegen dein Ziel (${Number(state.proteinGoal) || 160} g).`
    });
  }

  // 3) Kalorienbilanz & 30T-Körpertrend
  const firstW30 = weightsIn30.length >= 2 ? weightsIn30[0] : null;
  const lastW30 = weightsIn30.length >= 2 ? weightsIn30[weightsIn30.length - 1] : null;
  const wDelta30 = firstW30 && lastW30 ? Math.round((Number(lastW30.weight) - Number(firstW30.weight)) * 10) / 10 : null;
  const bfDelta30 = firstW30 && lastW30 && firstW30.bodyFat && lastW30.bodyFat
    ? Math.round((Number(lastW30.bodyFat) - Number(firstW30.bodyFat)) * 10) / 10
    : null;

  if (wDelta30 !== null || kcalLoggedDays >= 2) {
    const parts = [];
    if (wDelta30 !== null) {
      const sign = wDelta30 > 0 ? '+' : '';
      parts.push(`Gewicht in 30T: <strong>${sign}${wDelta30.toFixed(1)} kg</strong> (${Number(firstW30.weight).toFixed(1)} → ${Number(lastW30.weight).toFixed(1)} kg)${bfDelta30 !== null ? `, Körperfett <strong>${bfDelta30 > 0 ? '+' : ''}${bfDelta30.toFixed(1)} %</strong>` : ''}.`);
    }
    if (kcalLoggedDays >= 2) {
      const avgDiff = Math.round(kcalDiffSum / kcalLoggedDays);
      const label = avgDiff <= 0 ? `<strong>${avgDiff} kcal Defizit</strong>` : `<strong>+${avgDiff} kcal Überschuss</strong>`;
      parts.push(`Ø Kalorienbilanz über ${kcalLoggedDays} erfasste Tage: ${label}/Tag zum dynamischen Verbrauch.`);
    } else {
      parts.push(`Trage Mahlzeiten ein, um den 30T-Gewichtstrend direkt mit deinem täglichen Kaloriendefizit abzugleichen.`);
    }
    insights.push({
      icon: '⚖️',
      title: 'Kalorienbilanz & Körpertrend',
      badge: wDelta30 !== null ? `${wDelta30 > 0 ? '+' : ''}${wDelta30.toFixed(1)} kg` : `${kcalLoggedDays}T Bilanz`,
      badgeTone: wDelta30 !== null && wDelta30 <= 0 ? 'emerald' : 'amber',
      text: parts.join(' ')
    });
  }

  // 4) Alkohol-Effekt (nur wenn Alkohol aktiv)
  if (alcoholEnabled) {
    if ((alcKcalDays >= 1 && cleanAlcKcalDays >= 1) || (alcNextWeightDays >= 1 && cleanNextWeightDays >= 1)) {
      const parts = [];
      let badge = 'Aktiv';
      let tone = 'amber';
      if (alcKcalDays >= 1 && cleanAlcKcalDays >= 1) {
        const avgAlc = Math.round(alcKcalSum / alcKcalDays);
        const avgClean = Math.round(cleanAlcKcalSum / cleanAlcKcalDays);
        const delta = avgAlc - avgClean;
        badge = delta > 0 ? `+${delta} kcal` : `${delta} kcal`;
        tone = delta > 150 ? 'rose' : 'emerald';
        parts.push(`An Alkohol-Tagen nimmst du im Schnitt <strong>${avgAlc} kcal</strong> auf (${delta >= 0 ? '+' : ''}${delta} kcal gegenüber Clean-Tagen mit ${avgClean} kcal).`);
      }
      if (alcNextWeightDays >= 1 && cleanNextWeightDays >= 1) {
        const avgAlcW = Math.round((alcNextWeightDiffSum / alcNextWeightDays) * 10) / 10;
        const avgCleanW = Math.round((cleanNextWeightDiffSum / cleanNextWeightDays) * 10) / 10;
        if (parts.length === 0) badge = `${avgAlcW > 0 ? '+' : ''}${avgAlcW.toFixed(1)} kg`;
        parts.push(`Waage am Folgetag: <strong>${avgAlcW > 0 ? '+' : ''}${avgAlcW.toFixed(1)} kg</strong> nach Alkohol vs. <strong>${avgCleanW > 0 ? '+' : ''}${avgCleanW.toFixed(1)} kg</strong> nach Clean-Tagen.`);
      }
      insights.push({
        icon: '🍷',
        title: 'Alkohol-Effekt (Kalorien & Waage)',
        badge,
        badgeTone: tone,
        text: parts.join(' ')
      });
    } else {
      insights.push({
        icon: '🍷',
        title: 'Alkohol-Effekt (Kalorien & Waage)',
        badge: 'Sammelt Daten',
        badgeTone: 'zinc',
        text: `Sobald mindestens je 1 Alkohol- und 1 Clean-Tag mit Mahlzeiten oder Folgetags-Gewicht erfasst sind, siehst du hier Kalorien- und Waagen-Delta.`
      });
    }
  }

  // 5) Routine & Supplements (nur aktivierte Routine-Items)
  if (enabledRoutines.length > 0) {
    const rCount = enabledRoutines.length;
    const rNamesJoined = enabledRoutines.map(r => r.name).join(' · ');
    if (routineAnyTracked >= 3) {
      const rList = enabledRoutines.map(r => ({ name: r.name, c: routineCounts[r.id] || 0 })).sort((a, b) => b.c - a.c);
      const fullPct = Math.round((routineFullDays / 30) * 100);
      let corrNote = rList.length > 1
        ? `Am konstantesten: <strong>${rList[0].name}</strong> (${rList[0].c}/30T), Ausbaupotenzial bei <strong>${rList[rList.length - 1].name}</strong> (${rList[rList.length - 1].c}/30T).`
        : `<strong>${rList[0].name}</strong> wurde an ${rList[0].c} von 30 Tagen erledigt.`;
      if (fullRoutineKonsumTracked >= 2 && partialRoutineKonsumTracked >= 2) {
        const fCleanPct = Math.round((fullRoutineCleanDays / fullRoutineKonsumTracked) * 100);
        const pCleanPct = Math.round((partialRoutineCleanDays / partialRoutineKonsumTracked) * 100);
        corrNote = `An ${rCount}/${rCount}-Routine-Tagen bist du zu <strong>${fCleanPct} %</strong> komplett clean (vs. ${pCleanPct} % an unvollständigen Tagen). Stärkste Routine: <strong>${rList[0].name}</strong> (${rList[0].c}/30T).`;
      }
      insights.push({
        icon: '💊',
        title: `Routine-Konstanz (${rNamesJoined})`,
        badge: `${routineFullDays}/30T ${rCount}/${rCount}`,
        badgeTone: fullPct >= 60 ? 'emerald' : 'amber',
        text: `<strong>${routineFullDays} von 30 Tagen</strong> waren alle ${rCount} aktiven Routinen komplett. ${corrNote}`
      });
    } else {
      insights.push({
        icon: '💊',
        title: 'Routine-Konstanz',
        badge: `${routineAnyTracked}/3 Tage`,
        badgeTone: 'zinc',
        text: `Hake ${rNamesJoined} regelmäßig ab – ab 3 erfassten Tagen zeigt dir diese Karte deine Routine-Stabilität.`
      });
    }
  }

  // 5b) Eigene Habits Konstanz (wenn angelegt & aktiv)
  if (enabledCustomHabits.length > 0) {
    const trackedCustom = Object.values(customStats).filter(s => s.tracked > 0);
    if (trackedCustom.length > 0) {
      const sortedCustom = [...trackedCustom].sort((a, b) => (b.good / b.tracked) - (a.good / a.tracked));
      const best = sortedCustom[0];
      const bestPct = Math.round((best.good / best.tracked) * 100);
      const summary = sortedCustom.slice(0, 3)
        .map(s => `<strong>${escapeHtmlAttr(s.habit.icon)} ${escapeHtmlAttr(s.habit.name)}</strong> (${s.good}/${s.tracked}T)`)
        .join(', ');
      insights.push({
        icon: '⭐',
        title: 'Eigene Habits (30T)',
        badge: `${bestPct} % Top`,
        badgeTone: bestPct >= 70 ? 'emerald' : 'amber',
        text: `Aktive Eigen-Habits: ${summary}. Stärkste Konstanz aktuell bei <strong>${escapeHtmlAttr(best.habit.name)}</strong> (${bestPct} %).`
      });
    }
  }

  // 6) Wochentags-Muster (Training & Konsum kombiniert)
  const maxSportWd = Math.max(...weekdaySportCounts);
  const maxConsumed = Math.max(...weekdayConsumedCounts);
  if (maxSportWd > 0 || maxConsumed > 0) {
    const wdParts = [];
    if (maxSportWd > 0) {
      const bestSportIdx = weekdaySportCounts.indexOf(maxSportWd);
      wdParts.push(`Stärkster Trainingstag: <strong>${weekdayNames[bestSportIdx]}</strong> (${maxSportWd}× in 30T).`);
    }
    if (maxConsumed > 0) {
      const peakIdx = weekdayConsumedCounts.indexOf(maxConsumed);
      wdParts.push(`Konsum trat am häufigsten am <strong>${weekdayNames[peakIdx]}</strong> auf (${maxConsumed} Ereignisse).`);
    }
    insights.push({
      icon: '📅',
      title: 'Wochentags-Muster',
      badge: '30T-Rhythmus',
      badgeTone: 'zinc',
      text: wdParts.join(' ')
    });
  }

  return insights;
}

let appToastTimer = null;
function showToast(message) {
  let el = document.getElementById('app-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'app-toast';
    el.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-emerald-500 text-zinc-950 font-semibold text-xs shadow-2xl shadow-emerald-500/30 transition-opacity duration-200 max-w-[90vw] text-center pointer-events-none';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.style.opacity = '1';
  clearTimeout(appToastTimer);
  appToastTimer = setTimeout(() => {
    el.style.opacity = '0';
  }, 2400);
}

function logRecipeToDay(recipeId, multiplier = 1) {
  const rec = state.recipes.find(r => r.id === recipeId);
  if (!rec) return;
  const tot = calcRecipeTotals(rec);
  const log = ensureDayLog(state.selectedDate);
  const prevCount = typeof getRecipeEatenCount === 'function' ? getRecipeEatenCount(rec) : (Number(rec.eatenCount) || 0);
  log.entries.push({
    id: 'ent_' + Date.now(),
    recipeId: rec.id,
    name: multiplier === 1 ? rec.name : `${rec.name} (${multiplier}x)`,
    kcal: Math.round(tot.kcal * multiplier),
    p: Math.round(tot.p * multiplier * 10) / 10,
    c: Math.round(tot.c * multiplier * 10) / 10,
    f: Math.round(tot.f * multiplier * 10) / 10
  });
  rec.eatenCount = prevCount + 1;
  saveState();
  closeModal();
  render();
  showToast(`✓ „${rec.name}“ auf der Startseite hinzugefügt (${rec.eatenCount}× gegessen)`);
}

function deleteDayEntry(entryId) {
  const log = ensureDayLog(state.selectedDate);
  log.entries = log.entries.filter(e => e.id !== entryId);
  markDeletedId(entryId);
  saveState();
  render();
}

function saveDayEntryAsRecipe(entryId) {
  const log = ensureDayLog(state.selectedDate);
  const entry = log.entries.find(e => e.id === entryId);
  if (!entry) return;

  const cleanName = String(entry.name || 'Mahlzeit').replace(/^✨\s*/, '').trim();
  const now = Date.now();

  state.recipes.unshift({
    id: 'rec_' + now,
    name: cleanName,
    items: [
      {
        id: 'it_' + now,
        name: cleanName,
        grams: 100,
        kcal100: Math.round(Number(entry.kcal) || 0),
        p100: Math.round((Number(entry.p) || 0) * 10) / 10,
        c100: Math.round((Number(entry.c) || 0) * 10) / 10,
        f100: Math.round((Number(entry.f) || 0) * 10) / 10
      }
    ]
  });

  saveState();
  switchTab('recipes');
}

// ---------- GEWICHTS- & KALORIEN-VERLAUFSCHART ----------
function setChartRange(days) {
  chartRangeDays = days;
  selectedChartDate = null;
  render();
}

function selectChartDay(dateStr) {
  selectedChartDate = selectedChartDate === dateStr ? null : dateStr;
  render();
}

const FITDAYS_METRICS = [
  { key: 'weight',          label: 'Gewicht',          unit: 'kg',       decimals: 1, color: '#10b981', cols: ['Weight', 'Gewicht'] },
  { key: 'bioAge',          label: 'Biol. Alter',      unit: 'J.',       decimals: 0, color: '#a855f7', cols: ['Body age', 'Körperalter'] },
  { key: 'bmi',             label: 'BMI',              unit: '',         decimals: 1, color: '#3b82f6', cols: ['BMI'] },
  { key: 'bodyFat',         label: 'Körperfett',       unit: '%',        decimals: 1, color: '#f59e0b', cols: ['Body Fat', 'Körperfett'] },
  { key: 'subcutaneousFat', label: 'Subkutanfett',     unit: '%',        decimals: 1, color: '#fb923c', cols: ['Subcutaneous fat', 'Subkutanes Fett'] },
  { key: 'visceralFat',     label: 'Viszeralfett',     unit: '',         decimals: 1, color: '#ef4444', cols: ['Visceral Fat', 'Viszerales Fett'] },
  { key: 'bodyWater',       label: 'Körperwasser',     unit: '%',        decimals: 1, color: '#06b6d4', cols: ['Body Water', 'Körperwasser'] },
  { key: 'skeletalMuscle',  label: 'Skelettmuskel',    unit: '%',        decimals: 1, color: '#14b8a6', cols: ['Skeletal Muscle', 'Skelettmuskulatur'] },
  { key: 'muscle',          label: 'Muskelmasse',      unit: 'kg',       decimals: 1, color: '#22c55e', cols: ['Muscle Mass', 'Muskelmasse'] },
  { key: 'boneMass',        label: 'Knochenmasse',     unit: 'kg',       decimals: 1, color: '#94a3b8', cols: ['Bone Mass', 'Knochenmasse'] },
  { key: 'protein',         label: 'Protein',          unit: '%',        decimals: 1, color: '#6366f1', cols: ['Protein', 'Eiweiß'] },
  { key: 'bmr',             label: 'Grundumsatz (BMR)',unit: 'kcal',     decimals: 0, color: '#eab308', cols: ['BMR', 'Grundumsatz'] },
  { key: 'heartRate',       label: 'Herzfrequenz',     unit: 'bpm',      decimals: 0, color: '#f43f5e', cols: ['Heart Rate', 'Herzfrequenz'] },
  { key: 'cardiacIndex',    label: 'Herzindex',        unit: 'L/min/m²', decimals: 1, color: '#ec4899', cols: ['Cardiac Index', 'Herzindex'] }
];

const FITDAYS_METRIC_GROUPS = [
  { id: 'basis',  label: 'Basis',               keys: ['weight', 'bioAge', 'bmi'] },
  { id: 'fett',   label: 'Körperfett',          keys: ['bodyFat', 'subcutaneousFat', 'visceralFat'] },
  { id: 'muskel', label: 'Muskel & Wasser',     keys: ['muscle', 'skeletalMuscle', 'bodyWater', 'boneMass', 'protein'] },
  { id: 'herz',   label: 'Herz & Stoffwechsel', keys: ['bmr', 'heartRate', 'cardiacIndex'] }
];

function getVisibleMetrics() {
  if (!Array.isArray(state.visibleMetrics)) {
    state.visibleMetrics = ['weight', 'bioAge'];
  }
  return state.visibleMetrics;
}

function toggleChartMetric(key) {
  const current = new Set(getVisibleMetrics());
  if (current.has(key)) {
    if (current.size === 1) return; // Mindestens 1 Kennzahl bleibt sichtbar
    current.delete(key);
  } else {
    current.add(key);
  }
  state.visibleMetrics = [...current];
  saveState();
  render();
}

function toggleChartMetricInModal(key) {
  toggleChartMetric(key);
  openChartMetricsModal();
}

function applyChartPreset(groupId) {
  const grp = FITDAYS_METRIC_GROUPS.find(g => g.id === groupId);
  if (!grp) return;
  const hist = state.weightHistory || [];
  const withData = grp.keys.filter(k => hist.some(h => h[k] !== null && h[k] !== undefined));
  state.visibleMetrics = withData.length > 0 ? withData : grp.keys.slice(0, 2);
  saveState();
  render();
}

function openChartMetricsModal() {
  const visibleKeys = getVisibleMetrics();
  const hist = state.weightHistory || [];
  const bodyHtml = FITDAYS_METRIC_GROUPS.map(grp => {
    const chips = grp.keys.map(k => {
      const m = FITDAYS_METRICS.find(x => x.key === k);
      if (!m) return '';
      const isOn = visibleKeys.includes(m.key);
      const hasData = hist.some(h => h[m.key] !== null && h[m.key] !== undefined);
      return `
        <button onclick="toggleChartMetricInModal('${m.key}')"
          class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition border ${
            isOn
              ? 'bg-zinc-800 text-white border-emerald-500/50'
              : 'bg-zinc-950 text-zinc-400 border-border hover:text-zinc-200'
          } ${!hasData ? 'opacity-50' : ''}">
          <span class="w-2 h-2 rounded-full shrink-0" style="background:${isOn ? m.color : '#52525b'}"></span>
          <span>${m.label}</span>
          ${!hasData ? '<span class="text-[10px] text-zinc-500">(leer)</span>' : ''}
        </button>
      `;
    }).join('');
    return `
      <div class="space-y-1.5">
        <div class="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">${grp.label}</div>
        <div class="flex flex-wrap gap-1.5">${chips}</div>
      </div>
    `;
  }).join('');

  openModal(`
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-base font-semibold text-white">Kennzahlen im Chart</h3>
          <p class="text-[11px] text-zinc-400">${visibleKeys.length} von ${FITDAYS_METRICS.length} aktiv (mind. 1 bleibt sichtbar)</p>
        </div>
        <button onclick="closeModal()" class="text-zinc-400 hover:text-white px-2 py-1">✕</button>
      </div>
      <div class="space-y-3.5">${bodyHtml}</div>
      <button onclick="closeModal()" class="w-full py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition">
        Fertig
      </button>
    </div>
  `);
}

function renderWeightCalorieChart() {
  const rawDays = getLastNDays(chartRangeDays);
  const visibleKeys = getVisibleMetrics();
  const activeMetrics = FITDAYS_METRICS.filter(m => visibleKeys.includes(m.key));

  const sortedHistory = [...(state.weightHistory || [])].sort((a, b) => a.date.localeCompare(b.date));
  const historyMap = {};
  sortedHistory.forEach(w => { historyMap[w.date] = w; });

  // Fortschreibung für Tage ohne eigene Waagenmessung
  const carryValues = {};
  FITDAYS_METRICS.forEach(m => {
    const prior = sortedHistory.filter(w => w.date < rawDays[0].dateStr && w[m.key] !== null && w[m.key] !== undefined);
    if (prior.length) {
      carryValues[m.key] = Number(prior[prior.length - 1][m.key]);
    } else {
      const firstAny = sortedHistory.find(w => w[m.key] !== null && w[m.key] !== undefined);
      carryValues[m.key] = firstAny ? Number(firstAny[m.key]) : (m.key === 'weight' ? 74.0 : null);
    }
  });

  const dailySeries = rawDays.map(d => {
    const exactEntry = historyMap[d.dateStr] || null;
    const values = {};
    const exactFlags = {};

    FITDAYS_METRICS.forEach(m => {
      const rawVal = exactEntry && exactEntry[m.key] !== null && exactEntry[m.key] !== undefined
        ? Number(exactEntry[m.key])
        : null;
      if (rawVal !== null && !Number.isNaN(rawVal)) {
        carryValues[m.key] = rawVal;
        exactFlags[m.key] = true;
      } else {
        exactFlags[m.key] = false;
      }
      values[m.key] = carryValues[m.key];
    });

    const log = state.logs[d.dateStr];
    const kcal = log && Array.isArray(log.entries)
      ? log.entries.reduce((sum, e) => sum + (Number(e.kcal) || 0), 0)
      : 0;
    const yearShort = String(d.dateStr).slice(2, 4);

    return {
      dateStr: d.dateStr,
      shortLabel: chartRangeDays > 90
        ? `${String(d.monthNum).padStart(2, '0')}/${yearShort}`
        : `${d.dayNum}.${d.monthNum}`,
      fullLabel: `${d.dayNum}.${d.monthNum}.${d.dateStr.slice(0, 4)}`,
      values,
      exactFlags,
      hasAnyMeasurement: Boolean(exactEntry),
      kcal
    };
  });

  // Bei großen Zeiträumen (90T / 1J / 5J) sinnvoll verdichten
  const bucketSize = chartRangeDays <= 30 ? 1 : (chartRangeDays <= 365 ? 7 : 14);
  const series = [];
  for (let i = 0; i < dailySeries.length; i += bucketSize) {
    const chunk = dailySeries.slice(i, i + bucketSize);
    const measured = chunk.filter(c => c.hasAnyMeasurement);
    const rep = measured.length > 0 ? measured[measured.length - 1] : chunk[chunk.length - 1];
    const avgKcal = chunk.reduce((s, c) => s + c.kcal, 0) / chunk.length;
    series.push({
      dateStr: rep.dateStr,
      shortLabel: rep.shortLabel,
      fullLabel: rep.fullLabel,
      values: { ...rep.values },
      exactFlags: { ...rep.exactFlags },
      hasAnyMeasurement: measured.length > 0,
      kcal: avgKcal
    });
  }

  // Min/Max pro aktiver Metrik bestimmen (für Multi-Metrik-Normalisierung mit getrennten Bändern)
  const metricScales = {};
  const metricsWithData = [];
  activeMetrics.forEach(m => {
    const vals = series.map(s => s.values[m.key]).filter(v => v !== null && v !== undefined && !Number.isNaN(v));
    if (!vals.length) {
      metricScales[m.key] = { min: 0, max: 1, span: 1, hasData: false, bandLow: 0, bandHigh: 1 };
      return;
    }
    const rawMin = Math.min(...vals);
    const rawMax = Math.max(...vals);
    const pad = m.key === 'weight' ? 0.4 : Math.max((rawMax - rawMin) * 0.12, m.decimals === 0 ? 1 : 0.3);
    const min = rawMin - pad;
    const max = rawMax + pad;
    metricScales[m.key] = {
      min,
      max,
      span: Math.max(0.1, max - min),
      hasData: true,
      bandLow: 0,
      bandHigh: 1
    };
    metricsWithData.push(m.key);
  });

  // Bei mehreren aktiven Kennzahlen jede Linie in einem eigenen, leicht versetzten Vertikalband führen,
  // damit korrelierte (z. B. Körperfett & Subkutanfett) oder konstante Linien niemals exakt übereinander liegen.
  const nActive = metricsWithData.length;
  if (nActive > 1) {
    const bandSpan = nActive === 2 ? 0.66 : (nActive === 3 ? 0.52 : (nActive === 4 ? 0.42 : 0.34));
    const step = (1 - bandSpan) / (nActive - 1);
    metricsWithData.forEach((key, bIdx) => {
      const bandLow = (nActive - 1 - bIdx) * step;
      metricScales[key].bandLow = bandLow;
      metricScales[key].bandHigh = bandLow + bandSpan;
    });
  }

  const primaryMetric = activeMetrics[0] || FITDAYS_METRICS[0];
  const primaryScale = metricScales[primaryMetric.key];

  const chartBaseGoal = getDynamicCalorieTarget(state.selectedDate).total;
  const maxKcal = Math.max(chartBaseGoal * 1.15, ...series.map(s => s.kcal), 2500);
  const showKcalBars = chartRangeDays <= 30;

  const W = 560, H = nActive > 1 ? 200 : 180;
  const padL = nActive > 1 ? 14 : 36;
  const padR = nActive > 1 ? 52 : 12;
  const padT = 16, padB = 24;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const stepX = series.length > 1 ? plotW / (series.length - 1) : plotW;
  const barW = Math.max(4, Math.min(16, (plotW / series.length) * 0.55));

  const getX = (idx) => padL + idx * stepX;
  const getMetricY = (key, val) => {
    const sc = metricScales[key];
    if (!sc || !sc.hasData || val === null || val === undefined) return null;
    const norm = (val - sc.min) / sc.span;
    const mapped = sc.bandLow + norm * (sc.bandHigh - sc.bandLow);
    return padT + plotH - mapped * plotH;
  };
  const getKcalH = (k) => (k / maxKcal) * (plotH * 0.75);
  const goalY = padT + plotH - getKcalH(chartBaseGoal);

  const activeIdx = Math.max(0, series.findIndex(s => s.dateStr === selectedChartDate));
  const initialIdx = selectedChartDate && series.some(s => s.dateStr === selectedChartDate) ? activeIdx : (series.length - 1);
  const activePoint = series[initialIdx] || series[series.length - 1];
  const labelInterval = Math.max(1, Math.ceil(series.length / 7));

  const rangeOptions = [
    { days: 7, label: '7T' },
    { days: 14, label: '14T' },
    { days: 30, label: '30T' },
    { days: 90, label: '90T' },
    { days: 365, label: '1J' },
    { days: 1825, label: '5J' }
  ];

  const formatMetricVal = (m, val) => {
    if (val === null || val === undefined || Number.isNaN(val)) return '–';
    return `${Number(val).toFixed(m.decimals)}${m.unit ? ' ' + m.unit : ''}`;
  };

  const buildPointReadoutHtml = (pt) => `
    <span class="font-semibold text-white">${pt.fullLabel}:</span>
    ${activeMetrics.map(m => {
      const val = pt.values[m.key];
      const isExact = pt.exactFlags[m.key];
      return `
        <span class="inline-flex items-center gap-1">
          <span class="w-2 h-2 rounded-full inline-block" style="background:${m.color}"></span>
          <span class="text-zinc-400">${m.label}:</span>
          <span class="font-semibold" style="color:${m.color}">${formatMetricVal(m, val)}</span>
          ${!isExact && val !== null ? '<span class="text-[10px] text-zinc-500">(fortg.)</span>' : ''}
        </span>
      `;
    }).join('')}
    ${showKcalBars ? `
      <span class="inline-flex items-center gap-1">
        <span class="text-zinc-600">·</span>
        <span class="text-sky-400 font-semibold">${Math.round(pt.kcal)} kcal</span>
      </span>
    ` : ''}
  `;

  window._dashChartMeta = {
    W, padL, padR,
    points: series.map((pt, idx) => ({
      dateStr: pt.dateStr,
      x: getX(idx),
      html: buildPointReadoutHtml(pt),
      dots: activeMetrics.map(m => ({ y: getMetricY(m.key, pt.values[m.key]), color: m.color }))
    }))
  };

  const initMeta = window._dashChartMeta.points[initialIdx] || window._dashChartMeta.points[0];

  // Rechte Linien-Endlabels (damit bei mehreren Linien jede Kurve direkt erkennbar ist)
  const rightEndLabels = [];
  if (nActive > 1 && series.length > 0) {
    const lastPt = series[series.length - 1];
    activeMetrics.forEach(m => {
      const sc = metricScales[m.key];
      if (!sc || !sc.hasData) return;
      const val = lastPt.values[m.key];
      const y = getMetricY(m.key, val);
      if (y === null) return;
      rightEndLabels.push({
        y,
        color: m.color,
        text: `${Number(val).toFixed(m.decimals)}${m.unit && m.unit.length <= 4 ? m.unit : ''}`
      });
    });
    rightEndLabels.sort((a, b) => a.y - b.y);
    for (let i = 1; i < rightEndLabels.length; i++) {
      if (rightEndLabels[i].y - rightEndLabels[i - 1].y < 12) {
        rightEndLabels[i].y = rightEndLabels[i - 1].y + 12;
      }
    }
  }

  const legendHtml = `
    <div class="flex items-center gap-1.5 pt-1.5 border-t border-zinc-900">
      <div class="flex-1 flex items-center gap-1 overflow-x-auto pb-0.5">
        ${FITDAYS_METRIC_GROUPS.map(grp => {
          const isActivePreset = visibleKeys.length > 0 && visibleKeys.every(k => grp.keys.includes(k));
          return `
            <button onclick="applyChartPreset('${grp.id}')"
              class="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition border ${
                isActivePreset
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-zinc-900 text-zinc-400 border-border hover:text-zinc-200'
              }">
              ${grp.label}
            </button>
          `;
        }).join('')}
      </div>
      <button onclick="openChartMetricsModal()" title="Einzelne Kennzahlen wählen"
        class="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-border transition">
        ⚙ ${visibleKeys.length}
      </button>
    </div>
  `;

  return `
    <div class="bg-zinc-950/70 border border-border rounded-2xl p-3 space-y-2.5">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div id="dash-chart-readout" class="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-zinc-300">
          ${initMeta ? initMeta.html : ''}
        </div>

        <div class="flex flex-wrap gap-1 shrink-0">
          ${rangeOptions.map(r => `
            <button onclick="setChartRange(${r.days})"
              class="px-2 py-0.5 rounded-lg text-[11px] font-medium transition ${
                chartRangeDays === r.days
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-border'
              }">
              ${r.label}
            </button>
          `).join('')}
        </div>
      </div>

      <svg viewBox="0 0 ${W} ${H}" class="w-full ${nActive > 1 ? 'h-48' : 'h-44'} overflow-visible select-none" style="touch-action:pan-y"
        onpointerdown="scrubDashChart(event, this)"
        onpointermove="if(event.buttons===1||event.pointerType==='mouse') scrubDashChart(event, this)"
        ontouchstart="scrubDashChart(event, this)"
        ontouchmove="scrubDashChart(event, this)">
        <line x1="${padL}" y1="${padT}" x2="${W - padR}" y2="${padT}" stroke="#27272a" stroke-dasharray="3 3" />
        <line x1="${padL}" y1="${padT + plotH}" x2="${W - padR}" y2="${padT + plotH}" stroke="#27272a" />
        ${nActive === 1 && primaryScale && primaryScale.hasData ? `
          <text x="${padL - 5}" y="${padT + 4}" text-anchor="end" fill="${primaryMetric.color}" font-size="9">${primaryScale.max.toFixed(primaryMetric.decimals)}</text>
          <text x="${padL - 5}" y="${padT + plotH}" text-anchor="end" fill="${primaryMetric.color}" font-size="9">${primaryScale.min.toFixed(primaryMetric.decimals)}</text>
        ` : ''}
        ${showKcalBars ? `<line x1="${padL}" y1="${goalY.toFixed(1)}" x2="${W - padR}" y2="${goalY.toFixed(1)}" stroke="#0ea5e9" stroke-opacity="0.35" stroke-dasharray="4 4" />` : ''}

        ${initMeta ? `<line id="dash-chart-cursor" x1="${initMeta.x.toFixed(1)}" x2="${initMeta.x.toFixed(1)}" y1="${padT}" y2="${padT + plotH}" stroke="#71717a" stroke-dasharray="3 3" stroke-width="1" opacity="0.85" />` : ''}

        ${series.map((s, idx) => {
          const x = getX(idx);
          const bh = showKcalBars ? getKcalH(s.kcal) : 0;
          const by = padT + plotH - bh;
          return `
            <g>
              ${showKcalBars ? `
                <rect x="${(x - barW / 2).toFixed(1)}" y="${by.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(0, bh).toFixed(1)}"
                  rx="2" fill="#0284c7" fill-opacity="0.32" />
              ` : ''}
              ${idx % labelInterval === 0 ? `
                <text x="${x.toFixed(1)}" y="${H - 6}" text-anchor="middle" fill="#71717a" font-size="9">${s.shortLabel}</text>
              ` : ''}
            </g>
          `;
        }).join('')}

        ${activeMetrics.map((m, mIdx) => {
          const sc = metricScales[m.key];
          if (!sc || !sc.hasData) return '';
          const pts = series
            .map((s, idx) => {
              const y = getMetricY(m.key, s.values[m.key]);
              return y !== null ? `${getX(idx).toFixed(1)},${y.toFixed(1)}` : null;
            })
            .filter(Boolean)
            .join(' ');
          if (!pts) return '';
          const initDotY = initMeta && initMeta.dots[mIdx] ? initMeta.dots[mIdx].y : null;

          return `
            <g>
              <polyline fill="none" stroke="${m.color}" stroke-width="${m.key === 'weight' ? '2.4' : '1.8'}"
                stroke-opacity="${m.key === 'weight' ? '1' : '0.88'}" stroke-linecap="round" stroke-linejoin="round" points="${pts}" />
              ${series.map((s, idx) => {
                const y = getMetricY(m.key, s.values[m.key]);
                if (y === null || !s.exactFlags[m.key]) return '';
                const x = getX(idx);
                return `
                  <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}"
                    r="${chartRangeDays > 90 ? 1.8 : 2.4}"
                    fill="${m.color}" stroke="#09090b" stroke-width="1" />
                `;
              }).join('')}
              ${initDotY !== null ? `
                <circle id="dash-chart-dot-${mIdx}" cx="${initMeta.x.toFixed(1)}" cy="${initDotY.toFixed(1)}"
                  r="4.5" fill="${m.color}" stroke="#09090b" stroke-width="1.5" />
              ` : ''}
            </g>
          `;
        }).join('')}

        ${rightEndLabels.map(lbl => `
          <text x="${W - padR + 6}" y="${(lbl.y + 3).toFixed(1)}" text-anchor="start" fill="${lbl.color}" font-size="9.5" font-weight="600">${lbl.text}</text>
        `).join('')}
      </svg>

      ${legendHtml}
    </div>
  `;
}

function showDashChartPoint(idx) {
  const meta = window._dashChartMeta;
  if (!meta || !meta.points || !meta.points[idx]) return;
  const pt = meta.points[idx];
  selectedChartDate = pt.dateStr;
  const readout = document.getElementById('dash-chart-readout');
  if (readout) readout.innerHTML = pt.html;
  const cursor = document.getElementById('dash-chart-cursor');
  if (cursor) {
    cursor.setAttribute('x1', pt.x.toFixed(1));
    cursor.setAttribute('x2', pt.x.toFixed(1));
  }
  (pt.dots || []).forEach((d, mIdx) => {
    const dot = document.getElementById(`dash-chart-dot-${mIdx}`);
    if (!dot) return;
    if (d.y === null || d.y === undefined) {
      dot.setAttribute('opacity', '0');
    } else {
      dot.setAttribute('cx', pt.x.toFixed(1));
      dot.setAttribute('cy', d.y.toFixed(1));
      dot.setAttribute('opacity', '1');
    }
  });
}

function scrubDashChart(ev, svg) {
  const meta = window._dashChartMeta;
  if (!meta || !meta.points || !meta.points.length || !svg) return;
  const touch = ev.touches && ev.touches[0];
  const clientX = touch ? touch.clientX : ev.clientX;
  if (typeof clientX !== 'number') return;
  const rect = svg.getBoundingClientRect();
  if (!rect.width) return;
  const svgX = ((clientX - rect.left) / rect.width) * meta.W;
  const plotW = meta.W - meta.padL - meta.padR;
  const ratio = Math.max(0, Math.min(1, (svgX - meta.padL) / Math.max(1, plotW)));
  const idx = Math.round(ratio * (meta.points.length - 1));
  showDashChartPoint(idx);
}

function showCalorieChartPoint(idx) {
  const meta = window._calChartMeta;
  if (!meta || !meta.points || !meta.points[idx]) return;
  const pt = meta.points[idx];
  selectedCalorieChartDate = pt.dateStr;
  const readout = document.getElementById('cal-chart-readout');
  if (readout) readout.innerHTML = pt.html;
  const hl = document.getElementById('cal-chart-highlight');
  if (hl) {
    hl.setAttribute('x', (pt.cx - meta.slotW / 2).toFixed(1));
    hl.setAttribute('width', meta.slotW.toFixed(1));
  }
  const dot = document.getElementById('cal-chart-tdee-dot');
  if (dot) {
    dot.setAttribute('cx', pt.cx.toFixed(1));
    dot.setAttribute('cy', pt.tdeeY.toFixed(1));
  }
}

function scrubCalorieChart(ev, svg) {
  const meta = window._calChartMeta;
  if (!meta || !meta.points || !meta.points.length || !svg) return;
  const touch = ev.touches && ev.touches[0];
  const clientX = touch ? touch.clientX : ev.clientX;
  if (typeof clientX !== 'number') return;
  const rect = svg.getBoundingClientRect();
  if (!rect.width) return;
  const svgX = ((clientX - rect.left) / rect.width) * meta.W;
  const plotW = meta.W - meta.padL - meta.padR;
  const rel = Math.max(0, Math.min(plotW - 0.01, svgX - meta.padL));
  const idx = Math.max(0, Math.min(meta.points.length - 1, Math.floor(rel / meta.slotW)));
  showCalorieChartPoint(idx);
}

function renderCalorieMacroHistoryCard() {
  const range = calorieHistoryDays || 14;
  const days = [];
  for (let i = range - 1; i >= 0; i--) {
    const dateStr = getPastDateStr(i);
    const dayLog = state.logs[dateStr];
    const entries = Array.isArray(dayLog?.entries) ? dayLog.entries : [];
    const kcal = Math.round(entries.reduce((s, e) => s + (Number(e.kcal) || 0), 0));
    const p = Math.round(entries.reduce((s, e) => s + (Number(e.p) || 0), 0));
    const c = Math.round(entries.reduce((s, e) => s + (Number(e.c) || 0), 0));
    const f = Math.round(entries.reduce((s, e) => s + (Number(e.f) || 0), 0));
    const t = getDynamicCalorieTarget(dateStr);
    const tdee = t.baseTdee + t.sportBonus;
    const pKcal = p * 4;
    const cKcal = c * 4;
    const fKcal = f * 9;
    const mSum = pKcal + cKcal + fKcal;
    const pPct = mSum > 0 ? Math.round((pKcal / mSum) * 100) : 0;
    const cPct = mSum > 0 ? Math.round((cKcal / mSum) * 100) : 0;
    const fPct = mSum > 0 ? Math.max(0, 100 - pPct - cPct) : 0;
    const dt = new Date(dateStr + 'T12:00:00');
    const loc = getAppLocale();
    const shortLabel = dt.toLocaleDateString(loc, { day: '2-digit', month: '2-digit' });
    const wdLabel = dt.toLocaleDateString(loc, { weekday: 'short', day: '2-digit', month: '2-digit' });
    days.push({
      dateStr, shortLabel, wdLabel, kcal, p, c, f, tdee,
      sportBonus: t.sportBonus, pPct, cPct, fPct, mSum,
      pKcal, cKcal, fKcal, diff: kcal - tdee
    });
  }

  const W = 360, H = 166;
  const padL = 36, padR = 10, padT = 16, padB = 24;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const rawMax = Math.max(2400, ...days.map(d => Math.max(d.kcal, d.tdee)));
  const maxY = Math.ceil(rawMax / 250) * 250;
  const yOf = val => padT + plotH - (Math.max(0, val) / maxY) * plotH;
  const slotW = plotW / Math.max(1, days.length);
  const barW = Math.max(4, Math.min(20, slotW * 0.64));

  const buildReadoutHtml = d => {
    const hasLog = d.kcal > 0;
    const diffSign = d.diff > 0 ? '+' : '−';
    const diffAbs = Math.abs(d.diff);
    const diffBadge = hasLog
      ? (d.diff <= 0
          ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">${diffSign}${diffAbs} kcal Defizit</span>`
          : `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">${diffSign}${diffAbs} kcal Überschuss</span>`)
      : `<span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">Keine Mahlzeiten</span>`;

    return `
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-white">${d.wdLabel}</span>
          ${d.sportBonus > 0 ? `<span class="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 font-medium">⚡ +${d.sportBonus} Sport</span>` : ''}
        </div>
        <div class="flex items-center gap-1.5">
          ${diffBadge}
          ${d.dateStr !== state.selectedDate ? `<button onclick="selectDateFromCalorieChart('${d.dateStr}')" class="text-[10px] px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition">Öffnen</button>` : ''}
        </div>
      </div>
      <div class="flex items-baseline justify-between gap-2 mt-1.5 text-xs">
        <div>
          <span class="text-zinc-400">Aufnahme:</span>
          <span class="font-bold text-white ml-1">${hasLog ? d.kcal.toLocaleString('de-DE') + ' kcal' : '—'}</span>
        </div>
        <div>
          <span class="text-zinc-400">Verbrauch:</span>
          <span class="font-semibold text-emerald-400 ml-1">${d.tdee.toLocaleString('de-DE')} kcal</span>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-1.5 mt-2 text-[11px]">
        <div class="bg-zinc-950/60 border border-zinc-800/80 rounded-xl px-2 py-1">
          <span class="text-sky-400 font-semibold">P ${d.p}g</span>
          <span class="text-zinc-500 ml-1">${hasLog && d.mSum > 0 ? d.pPct + '%' : '—'}</span>
        </div>
        <div class="bg-zinc-950/60 border border-zinc-800/80 rounded-xl px-2 py-1">
          <span class="text-amber-400 font-semibold">C ${d.c}g</span>
          <span class="text-zinc-500 ml-1">${hasLog && d.mSum > 0 ? d.cPct + '%' : '—'}</span>
        </div>
        <div class="bg-zinc-950/60 border border-zinc-800/80 rounded-xl px-2 py-1">
          <span class="text-rose-400 font-semibold">F ${d.f}g</span>
          <span class="text-zinc-500 ml-1">${hasLog && d.mSum > 0 ? d.fPct + '%' : '—'}</span>
        </div>
      </div>
      ${hasLog && d.mSum > 0 ? `
        <div class="w-full h-1.5 rounded-full overflow-hidden flex bg-zinc-800 mt-1.5">
          <div style="width:${d.pPct}%" class="bg-sky-400"></div>
          <div style="width:${d.cPct}%" class="bg-amber-400"></div>
          <div style="width:${d.fPct}%" class="bg-rose-400"></div>
        </div>
      ` : ''}
    `;
  };

  let defaultIdx = days.findIndex(d => d.dateStr === selectedCalorieChartDate);
  if (defaultIdx < 0) {
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].kcal > 0) { defaultIdx = i; break; }
    }
  }
  if (defaultIdx < 0) defaultIdx = days.length - 1;

  const metaPoints = [];
  const barSvgParts = [];
  const tdeeLinePts = [];
  const sportDots = [];
  const xLabels = [];
  const labelStep = range <= 7 ? 1 : (range <= 14 ? 2 : 5);

  days.forEach((d, idx) => {
    const cx = padL + idx * slotW + slotW / 2;
    const bx = cx - barW / 2;
    const baseY = padT + plotH;
    const tdeeY = yOf(d.tdee);
    tdeeLinePts.push(`${cx.toFixed(1)},${tdeeY.toFixed(1)}`);

    if (d.sportBonus > 0) {
      sportDots.push(`<circle cx="${cx.toFixed(1)}" cy="${tdeeY.toFixed(1)}" r="2.3" fill="#34d399" />`);
    }

    if (d.kcal > 0) {
      const totalH = Math.max(3, (d.kcal / maxY) * plotH);
      if (d.mSum > 0) {
        const pH = (d.pKcal / d.mSum) * totalH;
        const cH = (d.cKcal / d.mSum) * totalH;
        const fH = Math.max(0, totalH - pH - cH);
        const yP = baseY - pH;
        const yC = yP - cH;
        const yF = yC - fH;
        if (pH > 0.3) barSvgParts.push(`<rect x="${bx.toFixed(1)}" y="${yP.toFixed(1)}" width="${barW.toFixed(1)}" height="${pH.toFixed(1)}" fill="#38bdf8" rx="1.2" />`);
        if (cH > 0.3) barSvgParts.push(`<rect x="${bx.toFixed(1)}" y="${yC.toFixed(1)}" width="${barW.toFixed(1)}" height="${cH.toFixed(1)}" fill="#fbbf24" />`);
        if (fH > 0.3) barSvgParts.push(`<rect x="${bx.toFixed(1)}" y="${yF.toFixed(1)}" width="${barW.toFixed(1)}" height="${fH.toFixed(1)}" fill="#fb7185" rx="1.5" />`);
      } else {
        barSvgParts.push(`<rect x="${bx.toFixed(1)}" y="${(baseY - totalH).toFixed(1)}" width="${barW.toFixed(1)}" height="${totalH.toFixed(1)}" fill="#10b981" rx="2" />`);
      }
    } else {
      barSvgParts.push(`<rect x="${bx.toFixed(1)}" y="${(baseY - 3).toFixed(1)}" width="${barW.toFixed(1)}" height="3" fill="#27272a" rx="1.5" />`);
    }

    if (idx % labelStep === 0 || idx === days.length - 1) {
      xLabels.push(`<text x="${cx.toFixed(1)}" y="${H - 6}" text-anchor="middle" fill="#71717a" font-size="9">${d.shortLabel}</text>`);
    }

    metaPoints.push({ dateStr: d.dateStr, cx, tdeeY, html: buildReadoutHtml(d) });
  });

  window._calChartMeta = { W, padL, padR, slotW, points: metaPoints };
  const activePt = metaPoints[defaultIdx];

  const gridTicks = [0, Math.round(maxY / 2), maxY];
  const gridSvg = gridTicks.map(v => {
    const y = yOf(v);
    const lbl = v === 0 ? '0' : (v >= 1000 ? (v / 1000).toFixed(1).replace('.0', '') + 'k' : String(v));
    return `
      <line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" stroke="#27272a" stroke-width="1" />
      <text x="${padL - 5}" y="${(y + 3).toFixed(1)}" text-anchor="end" fill="#71717a" font-size="9">${lbl}</text>
    `;
  }).join('');

  const loggedDays = days.filter(d => d.kcal > 0);
  const avgTdee = Math.round(days.reduce((s, d) => s + d.tdee, 0) / Math.max(1, days.length));
  const avgKcal = loggedDays.length ? Math.round(loggedDays.reduce((s, d) => s + d.kcal, 0) / loggedDays.length) : 0;
  const avgP = loggedDays.length ? Math.round(loggedDays.reduce((s, d) => s + d.p, 0) / loggedDays.length) : 0;
  const avgC = loggedDays.length ? Math.round(loggedDays.reduce((s, d) => s + d.c, 0) / loggedDays.length) : 0;
  const avgF = loggedDays.length ? Math.round(loggedDays.reduce((s, d) => s + d.f, 0) / loggedDays.length) : 0;
  const avgMSum = avgP * 4 + avgC * 4 + avgF * 9;
  const avgPPct = avgMSum > 0 ? Math.round((avgP * 4 / avgMSum) * 100) : 0;
  const avgCPct = avgMSum > 0 ? Math.round((avgC * 4 / avgMSum) * 100) : 0;
  const avgFPct = avgMSum > 0 ? Math.max(0, 100 - avgPPct - avgCPct) : 0;

  return `
    <section class="bg-card border border-border rounded-3xl p-4 space-y-3">
      <div class="flex items-center justify-between gap-2">
        <div>
          <h2 class="text-sm font-semibold text-white">Kalorien- & Makro-Verlauf</h2>
          <p class="text-[11px] text-zinc-400">Aufnahme (P/C/F) vs. Tagesverbrauch</p>
        </div>
        <div class="flex items-center gap-1 bg-zinc-900 border border-border rounded-xl p-0.5">
          ${[7, 14, 30].map(r => `
            <button onclick="setCalorieHistoryDays(${r})"
              class="px-2 py-1 rounded-lg text-[11px] font-semibold transition ${
                range === r ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
              }">${r}T</button>
          `).join('')}
        </div>
      </div>

      <div id="cal-chart-readout" class="bg-zinc-900/80 border border-border rounded-2xl p-3">
        ${activePt ? activePt.html : ''}
      </div>

      <div class="bg-zinc-950/60 border border-border rounded-2xl p-2">
        <svg viewBox="0 0 ${W} ${H}" class="w-full h-auto block"
          style="touch-action: pan-y; user-select: none; -webkit-user-select: none;"
          onpointerdown="scrubCalorieChart(event, this)"
          onpointermove="if(event.buttons===1||event.pointerType==='mouse'||event.pointerType==='touch')scrubCalorieChart(event, this)"
          onmousemove="scrubCalorieChart(event, this)"
          ontouchstart="scrubCalorieChart(event, this)"
          ontouchmove="scrubCalorieChart(event, this)">
          ${gridSvg}
          <rect id="cal-chart-highlight"
            x="${(activePt.cx - slotW / 2).toFixed(1)}" y="${padT}"
            width="${slotW.toFixed(1)}" height="${plotH}"
            fill="rgba(255,255,255,0.06)" rx="4" />
          ${barSvgParts.join('')}
          <polyline fill="none" stroke="#10b981" stroke-width="1.8" stroke-dasharray="4 3"
            points="${tdeeLinePts.join(' ')}" />
          ${sportDots.join('')}
          <circle id="cal-chart-tdee-dot" cx="${activePt.cx.toFixed(1)}" cy="${activePt.tdeeY.toFixed(1)}"
            r="3.5" fill="#10b981" stroke="#09090b" stroke-width="1.5" />
          ${xLabels.join('')}
        </svg>
        <div class="flex flex-wrap items-center justify-between gap-2 px-2 pt-1.5 text-[10px] text-zinc-400">
          <div class="flex items-center gap-2.5">
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-sky-400 inline-block"></span>Protein</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-amber-400 inline-block"></span>Carbs</span>
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-sm bg-rose-400 inline-block"></span>Fett</span>
          </div>
          <span class="flex items-center gap-1 text-emerald-400">
            <span class="w-3 border-t-2 border-dashed border-emerald-400 inline-block"></span>Verbrauch
          </span>
        </div>
      </div>

      ${loggedDays.length > 0 ? `
        <div class="grid grid-cols-4 gap-1.5 text-center">
          <div class="bg-zinc-900/80 border border-border rounded-xl p-2">
            <div class="text-[10px] text-zinc-400">Ø kcal (${loggedDays.length}T)</div>
            <div class="text-xs font-bold text-white mt-0.5">${avgKcal.toLocaleString('de-DE')}</div>
            <div class="text-[9px] text-emerald-400">Bed. ${avgTdee.toLocaleString('de-DE')}</div>
          </div>
          <div class="bg-zinc-900/80 border border-border rounded-xl p-2">
            <div class="text-[10px] text-zinc-400">Ø Protein</div>
            <div class="text-xs font-bold text-sky-400 mt-0.5">${avgP}g</div>
            <div class="text-[9px] text-zinc-500">${avgPPct}%</div>
          </div>
          <div class="bg-zinc-900/80 border border-border rounded-xl p-2">
            <div class="text-[10px] text-zinc-400">Ø Carbs</div>
            <div class="text-xs font-bold text-amber-400 mt-0.5">${avgC}g</div>
            <div class="text-[9px] text-zinc-500">${avgCPct}%</div>
          </div>
          <div class="bg-zinc-900/80 border border-border rounded-xl p-2">
            <div class="text-[10px] text-zinc-400">Ø Fett</div>
            <div class="text-xs font-bold text-rose-400 mt-0.5">${avgF}g</div>
            <div class="text-[9px] text-zinc-500">${avgFPct}%</div>
          </div>
        </div>
      ` : `
        <p class="text-[11px] text-zinc-500 px-1">
          Sobald du Mahlzeiten einträgst, erscheinen hier deine täglichen Kalorien- und Makro-Balken im Vergleich zum Tagesverbrauch (${avgTdee.toLocaleString('de-DE')} kcal Ø).
        </p>
      `}
    </section>
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
  else if (currentTab === 'food') container.innerHTML = renderFoodTab();
  else if (currentTab === 'sport') container.innerHTML = renderSportTab();
  else if (currentTab === 'habits') container.innerHTML = renderHabitsTab();
  if (appLang === 'es' && typeof applyI18nToSubtree === 'function') {
    applyI18nToSubtree(container, false);
  }
}

// ---------- DYNAMISCHES KALORIENZIEL ----------
function getLatestWeightKg() {
  if (!Array.isArray(state.weightHistory) || state.weightHistory.length === 0) return 74.0;
  const sorted = [...state.weightHistory].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1];
  return Number(last.weight) > 0 ? Number(last.weight) : 74.0;
}

function getSportActivityKcal(sportName, weightKg) {
  const name = String(sportName || '').toLowerCase();
  // Durchschnittswerte für ca. 60 Min. Training (Mann, 1,75 m, gewichtsabhängig nach MET)
  if (name.includes('jogg') || name.includes('lauf') || name.includes('run')) {
    return Math.round(8.5 * weightKg); // ~630 kcal bei 74 kg
  }
  if (name.includes('gym') || name.includes('kraft') || name.includes('weight') || name.includes('fitness')) {
    return Math.round(5.0 * weightKg); // ~370 kcal bei 74 kg
  }
  return Math.round(6.0 * weightKg);   // ~445 kcal bei 74 kg für sonstige Aktivitäten
}

function getDynamicCalorieTarget(dateStr = state.selectedDate) {
  const weightKg = getLatestWeightKg();
  const heightCm = 175;
  const age = 36;

  // Mifflin-St Jeor Grundumsatz (Mann) + Alltagsfaktor 1,35 (Remote/Büro ohne Sport)
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  const baseTdee = Math.round(bmr * 1.35);

  const log = state.logs[dateStr];
  const doneIds = Array.isArray(log?.sportDone) ? log.sportDone : [];
  let sportBonus = 0;

  doneIds.forEach(id => {
    const habit = state.sportHabits.find(h => h.id === id);
    sportBonus += getSportActivityKcal(habit ? habit.name : '', weightKg);
  });

  const offset = Number(state.calorieOffset) || 0;
  const total = Math.max(1200, baseTdee + sportBonus + offset);

  return {
    total,
    bmr: Math.round(bmr),
    heightCm,
    age,
    activityFactor: 1.35,
    baseTdee,
    sportBonus,
    sportDetails: doneIds.map(id => {
      const habit = state.sportHabits.find(h => h.id === id);
      const name = habit ? habit.name : 'Sport';
      return { name, kcal: getSportActivityKcal(name, weightKg) };
    }),
    offset,
    weightKg
  };
}

function openCalorieInfoModal() {
  const t = getDynamicCalorieTarget(state.selectedDate);
  const sportRows = t.sportDetails.length
    ? t.sportDetails.map(s => `
        <div class="flex items-center justify-between text-xs py-1">
          <span class="text-zinc-300">Sport-Bonus: ${s.name}</span>
          <span class="font-semibold text-emerald-400">+${s.kcal} kcal</span>
        </div>`).join('')
    : `<div class="flex items-center justify-between text-xs py-1">
         <span class="text-zinc-500">Sport-Bonus (${formatDisplayDate(state.selectedDate)})</span>
         <span class="text-zinc-500">+0 kcal</span>
       </div>`;

  openModal(`
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-base font-semibold text-white">Berechnung Tagesbedarf</h3>
          <p class="text-[11px] text-zinc-400">Dynamische Formel für ${formatDisplayDate(state.selectedDate)}</p>
        </div>
        <button onclick="closeModal()" class="text-zinc-400 hover:text-white px-2 py-1">✕</button>
      </div>

      <div class="bg-zinc-900/80 border border-border rounded-2xl p-3.5 space-y-1.5">
        <div class="flex items-center justify-between text-xs py-1">
          <div>
            <div class="text-zinc-200 font-medium">Grundumsatz (BMR)</div>
            <div class="text-[10px] text-zinc-500">Mifflin-St Jeor: 10×${t.weightKg.toFixed(1)}kg + 6,25×${t.heightCm}cm − 5×${t.age} + 5</div>
          </div>
          <span class="font-semibold text-white shrink-0">${t.bmr} kcal</span>
        </div>

        <div class="flex items-center justify-between text-xs py-1 border-t border-zinc-800/80">
          <div>
            <div class="text-zinc-200 font-medium">Alltagsbedarf (Basis)</div>
            <div class="text-[10px] text-zinc-500">Grundumsatz × ${String(t.activityFactor).replace('.', ',')} (Büro / Alltag ohne Sport)</div>
          </div>
          <span class="font-semibold text-sky-300 shrink-0">${t.baseTdee} kcal</span>
        </div>

        <div class="border-t border-zinc-800/80 pt-1">
          ${sportRows}
        </div>

        ${t.offset !== 0 ? `
          <div class="flex items-center justify-between text-xs py-1 border-t border-zinc-800/80">
            <span class="text-zinc-300">Ziel-Offset (Defizit / Überschuss)</span>
            <span class="font-semibold ${t.offset < 0 ? 'text-amber-300' : 'text-emerald-300'}">${t.offset > 0 ? '+' : ''}${t.offset} kcal</span>
          </div>
        ` : ''}

        <div class="flex items-center justify-between text-sm font-bold pt-2 mt-1 border-t border-zinc-700">
          <span class="text-white">Tagesbedarf gesamt</span>
          <span class="text-emerald-400">${t.total} kcal</span>
        </div>
      </div>

      <p class="text-[11px] text-zinc-400 leading-relaxed">
        Dein Gewicht (${t.weightKg.toFixed(1)} kg) wird automatisch aus dem letzten Messwert übernommen. Abgehakte Sport-Einheiten addieren ihren geschätzten Kalorienverbrauch automatisch oben drauf.
      </p>

      <button onclick="closeModal()" class="w-full py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition">
        Verstanden
      </button>
    </div>
  `);
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

  const dynTarget = getDynamicCalorieTarget(state.selectedDate);
  const effectiveCalorieGoal = dynTarget.total;
  const kcalPct = Math.min(100, Math.round((totals.kcal / effectiveCalorieGoal) * 100));

  const sortedW = [...state.weightHistory].sort((a, b) => a.date.localeCompare(b.date));
  const latestW = sortedW[sortedW.length - 1] || { weight: 74.0, bodyFat: null, muscle: null, bioAge: null, date: getTodayStr() };
  const prevW = sortedW.length > 1 ? sortedW[sortedW.length - 2] : latestW;
  const deltaW = Math.round((latestW.weight - prevW.weight) * 10) / 10;

  if (dashboardSection !== 'bilanz' && dashboardSection !== 'koerper') {
    dashboardSection = 'bilanz';
  }

  const dashTabs = [
    { id: 'bilanz', icon: '🔥', label: 'Tagesbilanz' },
    { id: 'koerper', icon: '⚖️', label: 'Gewicht & Körperwerte' }
  ];

  const dashSwitcherHtml = `
    <div class="grid grid-cols-2 gap-1.5 bg-card border border-border rounded-2xl p-1">
      ${dashTabs.map(t => `
        <button onclick="setDashboardSection('${t.id}')"
          class="py-2 px-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
            dashboardSection === t.id
              ? 'bg-emerald-500 text-zinc-950 shadow-sm'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/70'
          }">
          <span>${t.icon}</span>
          <span class="truncate">${t.label}</span>
        </button>
      `).join('')}
    </div>
  `;

  const dateSelectorHtml = `
    <div class="flex items-center justify-between bg-card border border-border rounded-2xl px-3.5 py-2.5">
      <button onclick="changeSelectedDate(-1)" class="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200">←</button>
      <div class="text-center">
        <div class="text-sm font-semibold text-white">${formatDisplayDate(state.selectedDate)}</div>
        <div class="text-[11px] text-zinc-400">${state.selectedDate}</div>
      </div>
      <button onclick="changeSelectedDate(1)" class="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200">→</button>
    </div>
  `;

  const renderMiniRoutineBtn = (key, icon, label) => {
    const val = normalizeRoutineStatus(log.routines?.[key]);
    const cls = val === true
      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
      : (val === false
        ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
        : 'bg-zinc-900 border-border text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800');
    const sym = val === true ? '✓' : (val === false ? '✕' : '·');
    return `
      <button onclick="toggleRoutine('${key}')"
        class="px-2.5 py-1 rounded-xl text-[11px] font-medium border transition inline-flex items-center gap-1 ${cls}">
        <span>${icon}</span><span>${label}</span><span class="font-bold ml-0.5">${sym}</span>
      </button>
    `;
  };

  const habitCfg = getHabitConfig();
  const quickBtns = [];
  if (habitCfg.categories.routine !== false) {
    const routineOrder = [
      { id: 'sertraline', icon: '💊', label: 'Sertralin' },
      { id: 'creatine', icon: '💊', label: 'Kreatin' },
      { id: 'skincare', icon: '🧴', label: 'Skincare' }
    ];
    routineOrder.forEach(r => {
      if (habitCfg.routineItems[r.id] !== false) {
        quickBtns.push(renderMiniRoutineBtn(r.id, r.icon, r.label));
      }
    });
  }

  if (habitCfg.categories.alcohol !== false) {
    const alcStatus = normalizeHabitStatus(log.badHabits?.alcohol);
    const alcCls = alcStatus === 'clean'
      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
      : (alcStatus === 'consumed'
        ? 'bg-rose-500/25 border-rose-500/55 text-rose-300'
        : 'bg-zinc-900 border-border text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800');
    const alcSym = alcStatus === 'clean' ? '✕' : (alcStatus === 'consumed' ? '✓' : '·');
    quickBtns.push(`
      <button onclick="cycleBadHabitDay('alcohol', '${state.selectedDate}')"
        class="px-2.5 py-1 rounded-xl text-[11px] font-medium border transition inline-flex items-center gap-1 ${alcCls}">
        <span>🍷</span><span>Alkohol</span><span class="font-bold ml-0.5">${alcSym}</span>
      </button>
    `);
  }

  if (habitCfg.categories.nicotine !== false) {
    const nicStatus = getCombinedNicotineStatus(log);
    const nicCls = nicStatus === 'clean'
      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
      : (nicStatus === 'consumed'
        ? 'bg-rose-500/25 border-rose-500/55 text-rose-300'
        : 'bg-zinc-900 border-border text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800');
    const nicSym = nicStatus === 'clean' ? '✕' : (nicStatus === 'consumed' ? '✓' : '·');
    quickBtns.push(`
      <button onclick="cycleCombinedNicotineDay('${state.selectedDate}')"
        class="px-2.5 py-1 rounded-xl text-[11px] font-medium border transition inline-flex items-center gap-1 ${nicCls}">
        <span>💨</span><span>Nikotin</span><span class="font-bold ml-0.5">${nicSym}</span>
      </button>
    `);
  }

  getCustomHabits(true).forEach(h => {
    if (h.showInQuickCheck === false) return;
    const val = getCustomHabitValue(log, h);
    let cls = 'bg-zinc-900 border-border text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800';
    let sym = '·';
    if (h.type === 'avoid') {
      if (val === 'clean') { cls = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'; sym = '✕'; }
      else if (val === 'consumed') { cls = 'bg-rose-500/25 border-rose-500/55 text-rose-300'; sym = '✓'; }
    } else {
      if (val === true) { cls = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'; sym = '✓'; }
      else if (val === false) { cls = 'bg-rose-500/20 border-rose-500/50 text-rose-300'; sym = '✕'; }
    }
    quickBtns.push(`
      <button onclick="cycleCustomHabitDay('${h.id}', '${state.selectedDate}')"
        class="px-2.5 py-1 rounded-xl text-[11px] font-medium border transition inline-flex items-center gap-1 ${cls}">
        <span>${escapeHtmlAttr(h.icon)}</span><span>${escapeHtmlAttr(h.name)}</span><span class="font-bold ml-0.5">${sym}</span>
      </button>
    `);
  });

  const quickHabitsHtml = quickBtns.length > 0 ? `
    <section class="bg-card border border-border rounded-2xl px-3 py-2.5 space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Schnell-Check</span>
        <div class="flex items-center gap-2.5">
          <button onclick="openHabitCustomizerModal()" class="text-[10px] text-zinc-400 hover:text-zinc-200 font-medium">⚙️ Anpassen</button>
          <button onclick="switchTab('habits')" class="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium">Details →</button>
        </div>
      </div>
      <div class="flex flex-wrap gap-1.5">
        ${quickBtns.join('')}
      </div>
    </section>
  ` : '';

  const bilanzSectionHtml = `
    <!-- Calories & Macros Card -->
    <section class="bg-card border border-border rounded-3xl p-4 space-y-4">
      <div class="flex items-start justify-between">
        <div>
          <div class="flex items-center gap-1.5">
            <h2 class="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Tagesbilanz</h2>
            <button onclick="openCalorieInfoModal()" title="Berechnung des Tagesbedarfs anzeigen" aria-label="Info zur Berechnung des Tagesbedarfs"
              class="w-4 h-4 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white text-[10px] font-bold inline-flex items-center justify-center transition">i</button>
          </div>
          <div class="mt-1 flex items-baseline gap-2">
            <span class="text-2xl font-bold text-white">${Math.round(totals.kcal)}</span>
            <span class="text-xs text-zinc-400">/ ${effectiveCalorieGoal} kcal</span>
          </div>
          <div class="text-[11px] text-zinc-500 mt-0.5">
            ${dynTarget.weightKg.toFixed(1)} kg · Basis ${dynTarget.baseTdee}${dynTarget.sportBonus > 0 ? ` + ${dynTarget.sportBonus} Sport` : ''}${dynTarget.offset !== 0 ? ` (${dynTarget.offset > 0 ? '+' : ''}${dynTarget.offset} Ziel)` : ''}
          </div>
        </div>
        <div class="flex gap-1.5">
          <button onclick="openQuickLogModal()" class="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition">
            + Mahlzeit
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
              <div class="min-w-0 pr-2">
                <span class="font-medium text-zinc-200">${e.name}</span>
                <span class="text-zinc-500 ml-2">${e.kcal} kcal · P ${e.p}g</span>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button onclick="deleteDayEntry('${e.id}')" title="Eintrag löschen" class="text-zinc-500 hover:text-rose-400 px-1.5">✕</button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : `<p class="text-xs text-zinc-500">Noch keine Mahlzeiten für ${formatDisplayDate(state.selectedDate)} eingetragen.</p>`}
    </section>

    ${renderCalorieMacroHistoryCard()}

    ${quickHabitsHtml}
  `;

  const koerperSectionHtml = `
    <!-- Gewicht & Körperwerte -->
    <section class="bg-card border border-border rounded-3xl p-4 space-y-3">
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 class="text-sm font-semibold text-white">Gewicht & Körperwerte</h2>
          <p class="text-[11px] text-zinc-400">${sortedW.length} Messungen gespeichert${sortedW.length > 1 ? ` · ab ${sortedW[0].date}` : ''}</p>
        </div>
        <div class="flex gap-1.5">
          <label class="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 cursor-pointer">
            FitDays CSV
            <input type="file" accept=".csv,.xls,.xlsx" onchange="importFitdaysCsv(event)" class="hidden" />
          </label>
          <button onclick="openBulkWeightModal()" class="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 border border-border">
            30T-Pflege
          </button>
          <button onclick="openWeightModal()" class="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium">
            + Gewicht
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
        <div class="bg-zinc-900/80 border border-border rounded-2xl p-3">
          <div class="text-[11px] text-zinc-400">Bio-Alter</div>
          <div class="text-lg font-bold text-emerald-400 mt-0.5">${latestW.bioAge ? latestW.bioAge + ' J.' : '—'}</div>
          <div class="text-[11px] text-zinc-500">Stoffwechsel</div>
        </div>
      </div>

      ${renderWeightCalorieChart()}
    </section>
  `;

  if (dashboardSection === 'koerper') {
    return `${dashSwitcherHtml}${koerperSectionHtml}`;
  }
  return `${dashSwitcherHtml}${dateSelectorHtml}${bilanzSectionHtml}`;
}

const RECIPE_TAG_PRESETS = ['Vegetarisch', 'Vegan', 'Proteinreich', 'Schnell', 'Low Carb', 'Meal Prep', 'Süß', 'Herzhaft'];
let selectedRecipeTagFilter = 'all';
let selectedRecipeSort = 'default'; // 'default' | 'rating' | 'eaten'

function getRecipeTags(rec) {
  if (!rec || !Array.isArray(rec.tags)) return [];
  return [...new Set(rec.tags.map(t => String(t || '').trim()).filter(Boolean))];
}

function getRecipeRating(rec) {
  const r = Math.round(Number(rec?.rating) || 0);
  return Math.max(0, Math.min(5, r));
}

function getRecipeEatenCount(rec) {
  if (!rec) return 0;
  const stored = Math.max(0, Math.round(Number(rec.eatenCount) || 0));
  const recNameLower = String(rec.name || '').trim().toLowerCase();
  let fromLogs = 0;
  Object.values(state.logs || {}).forEach(dayLog => {
    (dayLog?.entries || []).forEach(e => {
      if (!e) return;
      if (e.recipeId && e.recipeId === rec.id) {
        fromLogs++;
      } else if (recNameLower) {
        const en = String(e.name || '').trim().toLowerCase();
        if (en === recNameLower || en.startsWith(recNameLower + ' (')) {
          fromLogs++;
        }
      }
    });
  });
  return Math.max(stored, fromLogs);
}

function rateRecipeById(recipeId, stars) {
  const rec = (state.recipes || []).find(r => r.id === recipeId);
  if (!rec) return;
  const cur = getRecipeRating(rec);
  rec.rating = cur === stars ? 0 : stars;
  saveState();
  render();
}

function setEditingRecipeRating(stars) {
  if (!editingRecipe) return;
  const cur = getRecipeRating(editingRecipe);
  editingRecipe.rating = cur === stars ? 0 : stars;
  render();
}

function toggleEditingRecipeTag(tag) {
  if (!editingRecipe) return;
  const clean = String(tag || '').trim();
  if (!clean) return;
  const tags = getRecipeTags(editingRecipe);
  const idx = tags.findIndex(t => t.toLowerCase() === clean.toLowerCase());
  if (idx >= 0) tags.splice(idx, 1);
  else tags.push(clean);
  editingRecipe.tags = tags;
  render();
}

function addCustomEditingRecipeTag() {
  const inp = document.getElementById('rec-custom-tag-input');
  if (!inp || !editingRecipe) return;
  const val = inp.value.trim();
  if (!val) return;
  const tags = getRecipeTags(editingRecipe);
  if (!tags.some(t => t.toLowerCase() === val.toLowerCase())) {
    tags.push(val);
    editingRecipe.tags = tags;
  }
  render();
}

function toggleRecipeTagQuick(recipeId, tag) {
  const rec = (state.recipes || []).find(r => r.id === recipeId);
  if (!rec) return;
  const clean = String(tag || '').trim();
  if (!clean) return;
  const tags = getRecipeTags(rec);
  const idx = tags.findIndex(t => t.toLowerCase() === clean.toLowerCase());
  if (idx >= 0) tags.splice(idx, 1);
  else tags.push(clean);
  rec.tags = tags;
  saveState();
  render();
  openQuickRecipeTagModal(recipeId);
}

function addCustomRecipeTagQuick(event, recipeId) {
  if (event) event.preventDefault();
  const inp = document.getElementById('quick-recipe-tag-input');
  const val = (inp?.value || '').trim();
  if (!val) return;
  const rec = (state.recipes || []).find(r => r.id === recipeId);
  if (!rec) return;
  const tags = getRecipeTags(rec);
  if (!tags.some(t => t.toLowerCase() === val.toLowerCase())) {
    tags.push(val);
    rec.tags = tags;
    saveState();
    render();
  }
  openQuickRecipeTagModal(recipeId);
}

function openQuickRecipeTagModal(recipeId) {
  const rec = (state.recipes || []).find(r => r.id === recipeId);
  if (!rec) return;
  const activeTags = getRecipeTags(rec);
  const allSuggestions = [...new Set([...RECIPE_TAG_PRESETS, ...activeTags])];

  openModal(`
    <div class="space-y-4">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h3 class="text-base font-semibold text-white truncate">🏷️ Tags für ${escapeHtmlAttr(rec.name)}</h3>
          <p class="text-[11px] text-zinc-400">Tippe Tags an oder ergänze eigene Kategorien</p>
        </div>
        <button type="button" onclick="closeModal()" class="text-zinc-400 hover:text-white px-2 py-1">✕</button>
      </div>
      <div class="flex flex-wrap gap-1.5">
        ${allSuggestions.map(tag => {
          const isOn = activeTags.some(t => t.toLowerCase() === tag.toLowerCase());
          const safe = tag.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          return `
            <button type="button" onclick="toggleRecipeTagQuick('${rec.id}', '${safe}')"
              class="px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                isOn
                  ? 'bg-emerald-500/20 border-emerald-500/55 text-emerald-300'
                  : 'bg-zinc-900 border-border text-zinc-400 hover:text-zinc-200'
              }">
              ${isOn ? '✓ ' : '+ '}${escapeHtmlAttr(tag)}
            </button>
          `;
        }).join('')}
      </div>
      <form onsubmit="addCustomRecipeTagQuick(event, '${rec.id}')" class="flex gap-2 min-w-0">
        <input id="quick-recipe-tag-input" type="text" placeholder="Eigenes Tag (z. B. Frühstück, Grillen…)"
          class="flex-1 min-w-0 px-3 py-2 rounded-xl bg-zinc-900 border border-border text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500" />
        <button type="submit" class="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs shrink-0 transition">
          + Tag
        </button>
      </form>
      <button type="button" onclick="closeModal()" class="w-full py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-xs transition">
        Fertig
      </button>
    </div>
  `);
}

function setRecipeTagFilter(tag) {
  selectedRecipeTagFilter = tag || 'all';
  render();
}

function setRecipeSort(sortMode) {
  selectedRecipeSort = sortMode || 'default';
  render();
}

function renderRecipeStarsHtml(rating, clickFnExpr) {
  return `<div class="inline-flex items-center gap-0.5" aria-label="Bewertung ${rating} von 5 Sternen">${[1, 2, 3, 4, 5].map(n => `
    <button type="button" onclick="${clickFnExpr.replace('__N__', n)}" title="${n} von 5 Sternen"
      class="text-sm leading-none transition ${n <= rating ? 'text-amber-400' : 'text-zinc-600 hover:text-amber-300/70'}">★</button>
  `).join('')}</div>`;
}

function renderRecipesTab() {
  if (editingRecipe) {
    const tot = calcRecipeTotals(editingRecipe);
    const nameSuggestions = suggestRecipeNames(editingRecipe.items);
    const editRating = getRecipeRating(editingRecipe);
    const editTags = getRecipeTags(editingRecipe);
    const tagChoices = [...new Set([...RECIPE_TAG_PRESETS, ...editTags])];
    return `
      <div class="bg-card border border-border rounded-3xl p-4 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-semibold text-white">Rezept-Baukasten</h2>
          <button onclick="editingRecipe=null; render();" class="text-xs text-zinc-400 hover:text-white">Abbrechen</button>
        </div>

        <div class="space-y-1.5">
          <label class="text-xs text-zinc-400">Rezeptname</label>
          <input id="rec-name-input" type="text" value="${String(editingRecipe.name || '').replace(/"/g, '&quot;')}"
            oninput="editingRecipe.name = this.value; editingRecipe._autoNamed = false;"
            class="w-full mt-1 px-3.5 py-2.5 rounded-2xl bg-zinc-900 border border-border text-sm text-white focus:outline-none focus:border-emerald-500" />
          ${nameSuggestions.length > 0 ? `
            <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span class="text-[10px] text-zinc-500">💡 Vorschlag:</span>
              ${nameSuggestions.map(sug => `
                <button type="button" onclick="applySuggestedRecipeName('${sug.replace(/'/g, "\\'").replace(/"/g, '&quot;')}')"
                  class="px-2 py-0.5 rounded-lg text-[11px] border transition ${
                    editingRecipe.name === sug
                      ? 'bg-emerald-500/20 border-emerald-500/45 text-emerald-300 font-medium'
                      : 'bg-zinc-900 hover:bg-zinc-800 border-border text-zinc-300'
                  }">${sug}</button>
              `).join('')}
            </div>
          ` : ''}
        </div>

        <!-- Bewertung & Tags im Rezept-Editor -->
        <div class="rounded-2xl bg-zinc-950/70 border border-border p-3 space-y-2.5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-medium text-zinc-300">Bewertung</span>
            ${renderRecipeStarsHtml(editRating, 'setEditingRecipeRating(__N__)')}
          </div>
          <div class="space-y-1.5">
            <div class="text-xs font-medium text-zinc-300">Tags</div>
            <div class="flex flex-wrap gap-1.5">
              ${tagChoices.map(tag => {
                const isOn = editTags.some(t => t.toLowerCase() === tag.toLowerCase());
                const safe = tag.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                return `
                  <button type="button" onclick="toggleEditingRecipeTag('${safe}')"
                    class="px-2.5 py-1 rounded-xl text-[11px] font-medium border transition ${
                      isOn
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-zinc-900 border-border text-zinc-400 hover:text-zinc-200'
                    }">
                    ${isOn ? '✓ ' : '+ '}${escapeHtmlAttr(tag)}
                  </button>
                `;
              }).join('')}
            </div>
            <div class="flex gap-1.5 pt-0.5">
              <input id="rec-custom-tag-input" type="text" placeholder="Eigenes Tag hinzufügen…"
                onkeydown="if(event.key==='Enter'){event.preventDefault(); addCustomEditingRecipeTag();}"
                class="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-border text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500" />
              <button type="button" onclick="addCustomEditingRecipeTag()" class="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 font-medium shrink-0">
                + Tag
              </button>
            </div>
          </div>
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

        ${editingRecipe.summary || (Array.isArray(editingRecipe.steps) && editingRecipe.steps.length) ? `
          <div class="rounded-2xl bg-zinc-950/70 border border-border p-3 space-y-2">
            ${editingRecipe.summary || editingRecipe.prepMinutes ? `
              <div class="text-xs text-zinc-200 leading-snug">
                ${editingRecipe.prepMinutes ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded-md bg-zinc-800 text-zinc-200 text-[10px] font-semibold">⏱️ ${editingRecipe.prepMinutes} Min.</span>` : ''}${escapeHtmlAttr(editingRecipe.summary || '')}
              </div>
            ` : ''}
            ${Array.isArray(editingRecipe.steps) && editingRecipe.steps.length ? `
              <ol class="list-decimal list-inside space-y-1 text-[11px] text-zinc-300">
                ${editingRecipe.steps.map(st => `<li>${escapeHtmlAttr(st)}</li>`).join('')}
              </ol>
            ` : ''}
            ${renderRecipeReferenceLinksHtml(editingRecipe.name, editingRecipe.searchQuery)}
          </div>
        ` : ''}

        <div class="space-y-2.5">
          <div class="text-xs font-semibold text-zinc-300">Zutaten (${editingRecipe.items.length})</div>
          ${editingRecipe.items.map((it, idx) => {
            const step = Number(it.grams) <= 25 ? 5 : 10;
            return `
            <div class="bg-zinc-900 border border-border rounded-2xl p-3 space-y-2">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <div class="text-xs font-semibold text-white leading-snug">${it.name}</div>
                  <div class="text-[11px] text-zinc-400 mt-0.5">${Math.round(it.kcal100 * it.grams / 100)} kcal · P ${Math.round(it.p100 * it.grams / 100)}g · C ${Math.round(it.c100 * it.grams / 100)}g · F ${Math.round(it.f100 * it.grams / 100)}g</div>
                </div>
                <button onclick="removeRecipeItem(${idx})" class="w-8 h-8 shrink-0 flex items-center justify-center rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-xs" title="Entfernen">
                  🗑
                </button>
              </div>
              <div class="flex items-center gap-1.5">
                <button type="button" onclick="updateRecipeItemGrams(${idx}, Math.max(1, ${(Number(it.grams) || 0) - step}))"
                  class="px-2.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-border text-xs font-semibold text-zinc-300">−${step}</button>
                <div class="flex-1 flex items-center gap-1.5 bg-zinc-950 border border-zinc-700 focus-within:border-emerald-500 rounded-xl px-3 py-1.5">
                  <input id="rec-ing-grams-${idx}" type="number" inputmode="decimal" value="${it.grams}" min="1"
                    onkeydown="if(event.key==='Enter'){event.preventDefault(); confirmRecipeItemGrams(${idx});}"
                    class="w-full bg-transparent text-sm font-semibold text-white text-center focus:outline-none" />
                  <span class="text-xs font-medium text-zinc-400 shrink-0">g</span>
                </div>
                <button type="button" onclick="updateRecipeItemGrams(${idx}, ${(Number(it.grams) || 0) + step})"
                  class="px-2.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-border text-xs font-semibold text-zinc-300">+${step}</button>
                <button type="button" onclick="confirmRecipeItemGrams(${idx})" title="Gramm-Angabe übernehmen" aria-label="Übernehmen"
                  class="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold shrink-0 transition">✓</button>
              </div>
            </div>
          `;
          }).join('')}
        </div>

        <div class="pt-2 border-t border-border space-y-2.5">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div class="text-xs font-semibold text-zinc-300">Zutat hinzufügen</div>
            <div class="flex items-center gap-1.5">
              <button type="button" onclick="openVoiceRecipeModal(true)"
                class="px-3 py-1.5 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/35 text-violet-300 text-xs font-semibold flex items-center gap-1.5 transition">
                <span>🎙️</span><span>Einsprechen</span>
              </button>
              <button type="button" onclick="openBarcodeModal()"
                class="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/35 text-sky-300 text-xs font-semibold flex items-center gap-1.5 transition">
                <span>📷</span><span>Barcode scannen</span>
              </button>
            </div>
          </div>
          <div class="relative flex items-center min-w-0">
            <span class="pointer-events-none absolute left-3.5 text-zinc-400 text-sm">🔍</span>
            <input id="builder-search-input" type="text" placeholder="Zutat eintippen (z. B. rote Zwiebeln, Olivenöl, Tofu…)"
              oninput="renderFoodSuggestions('builder', this.value)"
              onkeydown="if(event.key==='Enter'){event.preventDefault(); runBuilderSearch();}"
              class="w-full min-w-0 pl-10 pr-12 py-3.5 rounded-2xl bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition" />
            <button type="button" onclick="runBuilderSearch()" title="Jetzt suchen" aria-label="Jetzt suchen"
              class="absolute right-2 px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition">
              ↵
            </button>
          </div>
          <div id="builder-search-suggestions" class="flex flex-wrap gap-1.5"></div>
          <div id="builder-search-results" class="space-y-2 max-h-64 overflow-y-auto"></div>
        </div>

        <div id="rec-validation-error" class="hidden rounded-xl bg-rose-500/15 border border-rose-500/40 px-3 py-2 text-xs text-rose-300 font-medium"></div>

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

  const allUsedTags = [...new Set((state.recipes || []).flatMap(r => getRecipeTags(r)))];
  if (selectedRecipeTagFilter !== 'all' && !allUsedTags.some(t => t.toLowerCase() === selectedRecipeTagFilter.toLowerCase())) {
    selectedRecipeTagFilter = 'all';
  }
  const filteredRecipes = (state.recipes || []).filter(rec => {
    if (selectedRecipeTagFilter === 'all') return true;
    return getRecipeTags(rec).some(t => t.toLowerCase() === selectedRecipeTagFilter.toLowerCase());
  });
  const displayRecipes = [...filteredRecipes];
  if (selectedRecipeSort === 'rating') {
    displayRecipes.sort((a, b) => getRecipeRating(b) - getRecipeRating(a) || getRecipeEatenCount(b) - getRecipeEatenCount(a));
  } else if (selectedRecipeSort === 'eaten') {
    displayRecipes.sort((a, b) => getRecipeEatenCount(b) - getRecipeEatenCount(a) || getRecipeRating(b) - getRecipeRating(a));
  }

  return `
    <div class="space-y-3">
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 class="text-base font-semibold text-white">Meine Rezepte</h2>
          <p class="text-xs text-zinc-400">Bewerten, taggen, loggen oder flexibel anpassen</p>
        </div>
        <div class="flex items-center gap-1.5">
          <button onclick="openVoiceRecipeModal(false)" class="px-3 py-2 rounded-2xl bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/35 text-violet-300 font-semibold text-xs flex items-center gap-1.5 transition">
            <span>🎙️</span><span>Diktieren</span>
          </button>
          <button onclick="startNewRecipe()" class="px-3.5 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs">
            + Neues Rezept
          </button>
        </div>
      </div>

      ${(state.recipes || []).length > 0 ? `
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <div class="flex flex-wrap gap-1.5">
            <button type="button" onclick="setRecipeTagFilter('all')"
              class="px-2.5 py-1 rounded-xl text-[11px] font-medium border transition ${
                selectedRecipeTagFilter === 'all'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-zinc-900 border-border text-zinc-400 hover:text-zinc-200'
              }">Alle (${state.recipes.length})</button>
            ${allUsedTags.map(tag => {
              const safe = tag.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
              const active = selectedRecipeTagFilter.toLowerCase() === tag.toLowerCase();
              return `
                <button type="button" onclick="setRecipeTagFilter('${safe}')"
                  class="px-2.5 py-1 rounded-xl text-[11px] font-medium border transition ${
                    active
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-zinc-900 border-border text-zinc-400 hover:text-zinc-200'
                  }">🏷️ ${escapeHtmlAttr(tag)}</button>
              `;
            }).join('')}
          </div>
          <div class="flex items-center gap-1 shrink-0">
            ${[
              { id: 'default', label: 'Standard' },
              { id: 'rating', label: '★ Top' },
              { id: 'eaten', label: '🔥 Häufig' }
            ].map(s => `
              <button type="button" onclick="setRecipeSort('${s.id}')"
                class="px-2 py-1 rounded-lg text-[10px] font-semibold border transition ${
                  selectedRecipeSort === s.id
                    ? 'bg-zinc-800 border-zinc-600 text-white'
                    : 'bg-zinc-950 border-border text-zinc-500 hover:text-zinc-300'
                }">${s.label}</button>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${displayRecipes.map(rec => {
        const tot = calcRecipeTotals(rec);
        const rating = getRecipeRating(rec);
        const tags = getRecipeTags(rec);
        const eatenCount = getRecipeEatenCount(rec);
        return `
          <div class="bg-card border border-border rounded-3xl p-4 space-y-2.5">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <h3 class="text-sm font-semibold text-white truncate">${escapeHtmlAttr(rec.name)}</h3>
                <p class="text-xs text-zinc-400 mt-0.5">
                  ${Math.round(tot.kcal)} kcal · P ${Math.round(tot.p)}g · C ${Math.round(tot.c)}g · F ${Math.round(tot.f)}g
                </p>
                <div class="flex items-center flex-wrap gap-2 mt-1.5">
                  ${renderRecipeStarsHtml(rating, `rateRecipeById('${rec.id}', __N__)`)}
                  <span class="px-2 py-0.5 rounded-lg bg-zinc-900 border border-border text-[10px] font-medium ${eatenCount > 0 ? 'text-emerald-300 border-emerald-500/30' : 'text-zinc-500'}">
                    🍽️ ${eatenCount}× gegessen
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <button onclick="logRecipeToDay('${rec.id}', 1)" title="Heute loggen" aria-label="Heute loggen"
                  class="w-8 h-8 flex items-center justify-center rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 transition">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                </button>
                <button onclick="editRecipeById('${rec.id}')" title="Rezept anpassen" aria-label="Rezept anpassen"
                  class="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-border text-zinc-400 hover:text-white transition">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                    <path d="m15 5 4 4"/>
                  </svg>
                </button>
                <button onclick="deleteRecipeById('${rec.id}')" title="Rezept löschen" aria-label="Rezept löschen"
                  class="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-rose-500/15 border border-border hover:border-rose-500/30 text-zinc-400 hover:text-rose-400 transition">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"/>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-1.5">
              ${tags.map(tag => `
                <button type="button" onclick="setRecipeTagFilter('${tag.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')"
                  class="px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-medium text-emerald-300 transition">
                  #${escapeHtmlAttr(tag)}
                </button>
              `).join('')}
              <button type="button" onclick="openQuickRecipeTagModal('${rec.id}')"
                class="px-2 py-0.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-dashed border-zinc-700 text-[10px] text-zinc-400 hover:text-zinc-200 transition">
                + Tag
              </button>
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

let editingSnackId = null;

function ensureSnacksArray() {
  if (!Array.isArray(state.snacks)) state.snacks = [];
  return state.snacks;
}

function addSnackItem(snackObj) {
  const snacks = ensureSnacksArray();
  const cleanName = String(snackObj?.name || '').trim();
  if (!cleanName) return null;
  const grams = Math.max(1, Math.round(Number(snackObj.grams) || suggestDefaultGrams(cleanName) || 50));
  const item = {
    id: 'snk_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    name: cleanName,
    grams,
    kcal100: Math.max(0, Math.round(Number(snackObj.kcal100) || 0)),
    p100: Math.max(0, Math.round((Number(snackObj.p100) || 0) * 10) / 10),
    c100: Math.max(0, Math.round((Number(snackObj.c100) || 0) * 10) / 10),
    f100: Math.max(0, Math.round((Number(snackObj.f100) || 0) * 10) / 10)
  };
  snacks.unshift(item);
  saveState();
  return item;
}

function renderSnackSearchResults(items, isLoadingMore = false) {
  const box = document.getElementById('snack-search-results');
  if (!box) return;
  if (!items || !items.length) {
    box.innerHTML = isLoadingMore
      ? `<div class="text-[11px] text-zinc-400 py-1.5">⏳ Suche passende Einträge…</div>`
      : `<div class="text-xs text-zinc-500 py-2">Keine Treffer gefunden.</div>`;
    return;
  }
  box.innerHTML = items.map((it, idx) => {
    const defG = it.defaultGrams || suggestDefaultGrams(it.name);
    const estKcal = Math.round((it.kcal100 * defG) / 100);
    return `
      <button type="button" onclick="addCachedFoodToSnacks(${idx})"
        class="w-full text-left flex items-center justify-between bg-zinc-900/90 hover:bg-zinc-800/90 border border-border hover:border-amber-500/40 rounded-xl px-3 py-2 text-xs gap-2 transition">
        <div class="min-w-0 flex-1">
          <div class="font-medium text-zinc-200 truncate">${escapeHtmlAttr(it.name)}</div>
          <div class="text-[10px] text-zinc-400">${estKcal} kcal / ${defG}g (${it.kcal100} kcal/100g · P ${it.p100}g · ${escapeHtmlAttr(it.source || '')})</div>
        </div>
        <span class="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/35 shrink-0 font-semibold text-[11px]">
          + ${defG}g
        </span>
      </button>
    `;
  }).join('') + (isLoadingMore ? `<div class="text-[10px] text-zinc-500 text-center py-1">⏳ Lade weitere Online-Treffer…</div>` : '');
}

async function runSnackSearch(isAuto = false) {
  const inp = document.getElementById('snack-search-input');
  const box = document.getElementById('snack-search-results');
  if (!inp || !box) return;
  if (liveSearchTimers.snack) {
    clearTimeout(liveSearchTimers.snack);
    liveSearchTimers.snack = null;
  }
  const q = inp.value.trim();
  if (q.length < 2) {
    box.innerHTML = isAuto ? '' : `<div class="text-xs text-zinc-500 py-1.5">Bitte mindestens 2 Zeichen eingeben.</div>`;
    return;
  }

  const seq = (liveSearchSeq.snack || 0) + 1;
  liveSearchSeq.snack = seq;
  if (liveSearchControllers.snack) {
    try { liveSearchControllers.snack.abort(); } catch (e) {}
  }
  const controller = new AbortController();
  liveSearchControllers.snack = controller;

  const localHits = getLocalFoodMatches(q);
  if (localHits.length) {
    searchResultsCache = localHits;
    renderSnackSearchResults(localHits, true);
  } else {
    box.innerHTML = `<div class="text-[11px] text-zinc-400 py-1.5">⏳ Suche läuft…</div>`;
  }

  const items = await searchFoodsLive(q, controller.signal);
  if (seq !== liveSearchSeq.snack || items === null) return;
  if (liveSearchControllers.snack === controller) liveSearchControllers.snack = null;
  renderSnackSearchResults(items, false);
}

function addCachedFoodToSnacks(idx) {
  const food = searchResultsCache[idx];
  if (!food) return;
  const grams = food.defaultGrams || suggestDefaultGrams(food.name);
  const saved = addSnackItem({
    name: food.name,
    grams,
    kcal100: food.kcal100,
    p100: food.p100,
    c100: food.c100,
    f100: food.f100
  });
  render();
  if (saved && typeof showToast === 'function') {
    showToast(`🍫 „${saved.name}“ gespeichert — per + in die Bilanz loggen`);
  }
}

function logSnackToDay(snackId) {
  const snack = ensureSnacksArray().find(s => s.id === snackId);
  if (!snack) return;
  const g = Math.max(1, Number(snack.grams) || 50);
  const factor = g / 100;
  const log = ensureDayLog(state.selectedDate);
  log.entries.push({
    id: 'ent_' + Date.now(),
    name: `${snack.name} (${g}g)`,
    kcal: Math.round(snack.kcal100 * factor),
    p: Math.round(snack.p100 * factor * 10) / 10,
    c: Math.round(snack.c100 * factor * 10) / 10,
    f: Math.round(snack.f100 * factor * 10) / 10
  });
  saveState();
  render();
  if (typeof showToast === 'function') {
    showToast(`✓ „${snack.name} (${g}g)“ in die Tagesbilanz übernommen`);
  }
}

function toggleEditSnackGrams(snackId) {
  editingSnackId = editingSnackId === snackId ? null : snackId;
  render();
}

function updateSnackGrams(snackId, newGrams) {
  const snack = ensureSnacksArray().find(s => s.id === snackId);
  if (!snack) return;
  snack.grams = Math.max(1, Math.round(Number(newGrams) || 50));
  saveState();
  render();
}

function confirmSnackGrams(snackId) {
  const inp = document.getElementById(`snack-grams-${snackId}`);
  if (inp) {
    updateSnackGrams(snackId, inp.value);
  }
  editingSnackId = null;
  render();
  if (typeof showToast === 'function') showToast('✓ Snack-Menge aktualisiert');
}

function deleteSnackById(snackId) {
  const snacks = ensureSnacksArray();
  const snack = snacks.find(s => s.id === snackId);
  if (!snack) return;
  if (!confirm(`Snack „${snack.name}“ aus der Liste entfernen?`)) return;
  state.snacks = snacks.filter(s => s.id !== snackId);
  markDeletedId(snackId);
  if (editingSnackId === snackId) editingSnackId = null;
  saveState();
  render();
}

function renderSnacksSection() {
  const snacks = ensureSnacksArray();
  return `
    <section class="bg-card border border-amber-500/25 rounded-3xl p-4 space-y-3">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-white flex items-center gap-1.5">
            <span>🍫</span><span>Schnelle Snacks</span>
          </h2>
          <p class="text-[11px] text-zinc-400">Snacks speichern & erst per <span class="text-emerald-400 font-semibold">+</span> in die Tagesbilanz loggen</p>
        </div>
        <button type="button" onclick="openBarcodeModal('snack')"
          class="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/35 text-sky-300 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition">
          <span>📷</span><span>Barcode</span>
        </button>
      </div>

      <div class="space-y-2.5">
        <div class="relative flex items-center min-w-0">
          <span class="pointer-events-none absolute left-3.5 text-zinc-400 text-sm">🔍</span>
          <input id="snack-search-input" type="text" placeholder="Snack eintippen (z. B. Snickers, Proteinriegel, Apfel…)"
            oninput="renderFoodSuggestions('snack', this.value)"
            onkeydown="if(event.key==='Enter'){event.preventDefault(); runSnackSearch();}"
            class="w-full min-w-0 pl-10 pr-12 py-3.5 rounded-2xl bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition" />
          <button type="button" onclick="runSnackSearch()" title="Jetzt suchen" aria-label="Jetzt suchen"
            class="absolute right-2 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs transition">
            ↵
          </button>
        </div>
        <div id="snack-search-suggestions" class="flex flex-wrap gap-1.5"></div>
        <div id="snack-search-results" class="space-y-2 max-h-64 overflow-y-auto"></div>
      </div>

      ${snacks.length > 0 ? `
        <div class="space-y-2 pt-2 border-t border-border">
          ${snacks.map(s => {
            const g = Math.max(1, Number(s.grams) || 50);
            const factor = g / 100;
            const kcal = Math.round(s.kcal100 * factor);
            const p = Math.round(s.p100 * factor * 10) / 10;
            const c = Math.round(s.c100 * factor * 10) / 10;
            const f = Math.round(s.f100 * factor * 10) / 10;
            const step = g <= 25 ? 5 : 10;
            const isEditing = editingSnackId === s.id;
            return `
              <div class="bg-zinc-900/90 border border-border rounded-2xl p-3 space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <div class="text-xs font-semibold text-white truncate">${escapeHtmlAttr(s.name)}</div>
                    <div class="text-[11px] text-zinc-400 mt-0.5">
                      <span class="text-amber-300 font-medium">${g}g</span> · ${kcal} kcal · P ${p}g · C ${c}g · F ${f}g
                    </div>
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <button type="button" onclick="logSnackToDay('${s.id}')" title="Konsumiert → in Tagesbilanz loggen" aria-label="Snack in Tagesbilanz loggen"
                      class="w-8 h-8 flex items-center justify-center rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-400 transition">
                      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                    </button>
                    <button type="button" onclick="toggleEditSnackGrams('${s.id}')" title="Portionsgröße ändern" aria-label="Portionsgröße ändern"
                      class="w-8 h-8 flex items-center justify-center rounded-xl border transition ${
                        isEditing
                          ? 'bg-amber-500/20 border-amber-500/45 text-amber-300'
                          : 'bg-zinc-950 hover:bg-zinc-800 border-border text-zinc-400 hover:text-white'
                      }">
                      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                        <path d="m15 5 4 4"/>
                      </svg>
                    </button>
                    <button type="button" onclick="deleteSnackById('${s.id}')" title="Snack löschen" aria-label="Snack löschen"
                      class="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-950 hover:bg-rose-500/15 border border-border hover:border-rose-500/30 text-zinc-400 hover:text-rose-400 transition">
                      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18"/>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
                ${isEditing ? `
                  <div class="flex items-center gap-1.5 pt-1 border-t border-zinc-800">
                    <button type="button" onclick="updateSnackGrams('${s.id}', Math.max(1, ${g - step}))"
                      class="px-2.5 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-border text-xs font-semibold text-zinc-300">−${step}</button>
                    <div class="flex-1 flex items-center gap-1 bg-zinc-950 border border-zinc-700 focus-within:border-amber-400 rounded-xl px-2.5 py-1">
                      <input id="snack-grams-${s.id}" type="number" inputmode="decimal" value="${g}" min="1"
                        onkeydown="if(event.key==='Enter'){event.preventDefault(); confirmSnackGrams('${s.id}');}"
                        class="w-full bg-transparent text-xs font-semibold text-white text-center focus:outline-none" />
                      <span class="text-[11px] text-zinc-400 shrink-0">g</span>
                    </div>
                    <button type="button" onclick="updateSnackGrams('${s.id}', ${g + step})"
                      class="px-2.5 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-border text-xs font-semibold text-zinc-300">+${step}</button>
                    <button type="button" onclick="confirmSnackGrams('${s.id}')" title="Übernehmen"
                      class="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold shrink-0 transition">✓</button>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <p class="text-[11px] text-zinc-500 pt-1">Noch keine Snacks gespeichert – suche oben nach einem Snack oder scanne einen Barcode.</p>
      `}
    </section>
  `;
}

// ---------- PERSONALISIERTER ERNÄHRUNGSPLAN & AUTOMATISCHE EINKAUFSLISTE ----------
let selectedMealPlanDate = null;
let shoppingRecipeCounts = {};

function ensureMealPlan() {
  if (!state.mealPlan || typeof state.mealPlan !== 'object' || !state.mealPlan.days || typeof state.mealPlan.days !== 'object') {
    state.mealPlan = { days: {} };
  }
  return state.mealPlan;
}

function ensureShoppingList() {
  if (!Array.isArray(state.shoppingList)) state.shoppingList = [];
  return state.shoppingList;
}

function getMealPlanDates(count = 7) {
  const out = [];
  const start = new Date(getTodayStr() + 'T12:00:00');
  const wdDe = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const wdEs = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = formatDateStr(d);
    out.push({
      dateStr,
      label: i === 0 ? (appLang === 'es' ? 'Hoy' : 'Heute') : (appLang === 'es' ? wdEs[d.getDay()] : wdDe[d.getDay()]),
      shortDate: `${d.getDate()}.${d.getMonth() + 1}.`
    });
  }
  return out;
}

function getPlannedMealsForDate(dateStr) {
  const mp = ensureMealPlan();
  if (!Array.isArray(mp.days[dateStr])) return [];
  return mp.days[dateStr];
}

function calcPlannedDayTotals(dateStr) {
  return getPlannedMealsForDate(dateStr).reduce((acc, m) => ({
    kcal: acc.kcal + (Number(m.kcal) || 0),
    p: acc.p + (Number(m.p) || 0),
    c: acc.c + (Number(m.c) || 0),
    f: acc.f + (Number(m.f) || 0)
  }), { kcal: 0, p: 0, c: 0, f: 0 });
}

function addRecipeToMealPlan(dateStr, recipeId, keepModalOpen = true) {
  const rec = (state.recipes || []).find(r => r.id === recipeId);
  if (!rec) return;
  const tot = calcRecipeTotals(rec);
  const mp = ensureMealPlan();
  if (!Array.isArray(mp.days[dateStr])) mp.days[dateStr] = [];
  mp.days[dateStr].push({
    id: 'mp_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    kind: 'recipe',
    refId: rec.id,
    name: rec.name,
    kcal: Math.round(tot.kcal),
    p: Math.round(tot.p * 10) / 10,
    c: Math.round(tot.c * 10) / 10,
    f: Math.round(tot.f * 10) / 10,
    items: (rec.items || []).map(it => ({ name: it.name, grams: Math.max(1, Math.round(Number(it.grams) || 100)) }))
  });
  saveState();
  render();
  if (keepModalOpen) openMealPlanModal(dateStr);
}

function addSnackToMealPlan(dateStr, snackId, keepModalOpen = true) {
  const sn = ensureSnacksArray().find(s => s.id === snackId);
  if (!sn) return;
  const g = Math.max(1, Math.round(Number(sn.grams) || 50));
  const factor = g / 100;
  const mp = ensureMealPlan();
  if (!Array.isArray(mp.days[dateStr])) mp.days[dateStr] = [];
  mp.days[dateStr].push({
    id: 'mp_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    kind: 'snack',
    refId: sn.id,
    name: `${sn.name} (${g}g)`,
    kcal: Math.round(sn.kcal100 * factor),
    p: Math.round(sn.p100 * factor * 10) / 10,
    c: Math.round(sn.c100 * factor * 10) / 10,
    f: Math.round(sn.f100 * factor * 10) / 10,
    items: [{ name: sn.name, grams: g }]
  });
  saveState();
  render();
  if (keepModalOpen) openMealPlanModal(dateStr);
}

function removeMealPlanItem(dateStr, itemId) {
  const mp = ensureMealPlan();
  if (!Array.isArray(mp.days[dateStr])) return;
  mp.days[dateStr] = mp.days[dateStr].filter(it => it.id !== itemId);
  if (!mp.days[dateStr].length) delete mp.days[dateStr];
  markDeletedId(itemId);
  saveState();
  render();
  openMealPlanModal(dateStr);
}

function logMealPlanItemToDay(dateStr, itemId) {
  const item = getPlannedMealsForDate(dateStr).find(it => it.id === itemId);
  if (!item) return;
  const log = ensureDayLog(dateStr);
  const matchedRec = (item.kind === 'recipe' && item.refId)
    ? (state.recipes || []).find(r => r.id === item.refId)
    : null;
  const prevCount = matchedRec ? getRecipeEatenCount(matchedRec) : 0;
  log.entries.push({
    id: 'ent_' + Date.now(),
    ...(matchedRec ? { recipeId: matchedRec.id } : {}),
    name: item.name,
    kcal: Math.round(Number(item.kcal) || 0),
    p: Math.round((Number(item.p) || 0) * 10) / 10,
    c: Math.round((Number(item.c) || 0) * 10) / 10,
    f: Math.round((Number(item.f) || 0) * 10) / 10
  });
  if (matchedRec) matchedRec.eatenCount = prevCount + 1;
  item.logged = true;
  saveState();
  render();
  openMealPlanModal(dateStr);
  showToast(`✓ „${item.name}“ für ${formatDisplayDate(dateStr)} geloggt`);
}

function generateSmartDayPlan(dateStr) {
  const dyn = getDynamicCalorieTarget(dateStr);
  const targetKcal = Math.max(1200, dyn.target || state.calorieGoal || 2200);
  const targetProtein = Math.max(60, Number(state.proteinGoal) || 150);
  const recipes = (state.recipes || []).map(r => ({ rec: r, tot: calcRecipeTotals(r) })).filter(x => x.tot.kcal > 0);
  const snacks = ensureSnacksArray().map(s => {
    const g = Math.max(1, Number(s.grams) || 50);
    return {
      sn: s,
      g,
      kcal: Math.round(s.kcal100 * g / 100),
      p: Math.round(s.p100 * g / 100 * 10) / 10,
      c: Math.round(s.c100 * g / 100 * 10) / 10,
      f: Math.round(s.f100 * g / 100 * 10) / 10
    };
  }).filter(x => x.kcal > 0);

  if (!recipes.length && !snacks.length) {
    showToast('Bitte lege zuerst mindestens ein Rezept oder einen Snack an – oder nutze den KI-Plan.');
    return;
  }

  const mp = ensureMealPlan();
  const prev = Array.isArray(mp.days[dateStr]) ? mp.days[dateStr] : [];
  prev.forEach(it => markDeletedId(it.id));
  mp.days[dateStr] = [];

  // Rezepte nach Protein-Dichte sortieren und geschickt bis nahe ans Tagesziel kombinieren
  const rankedRecipes = [...recipes].sort((a, b) => (b.tot.p / Math.max(1, b.tot.kcal)) - (a.tot.p / Math.max(1, a.tot.kcal)));
  let curKcal = 0;
  let curP = 0;
  let added = 0;
  const maxRecipes = Math.min(4, Math.max(2, rankedRecipes.length));

  for (let pass = 0; pass < 2 && added < maxRecipes; pass++) {
    for (const entry of rankedRecipes) {
      if (added >= maxRecipes) break;
      if (pass === 0 && curKcal + entry.tot.kcal > targetKcal * 1.06 && added > 0) continue;
      if (pass === 1 && curKcal >= targetKcal * 0.82) break;
      if (curKcal + entry.tot.kcal > targetKcal * 1.12 && added > 0) continue;
      mp.days[dateStr].push({
        id: 'mp_' + (Date.now() + added),
        kind: 'recipe',
        refId: entry.rec.id,
        name: entry.rec.name,
        kcal: Math.round(entry.tot.kcal),
        p: Math.round(entry.tot.p * 10) / 10,
        c: Math.round(entry.tot.c * 10) / 10,
        f: Math.round(entry.tot.f * 10) / 10,
        items: (entry.rec.items || []).map(it => ({ name: it.name, grams: Math.max(1, Math.round(Number(it.grams) || 100)) }))
      });
      curKcal += entry.tot.kcal;
      curP += entry.tot.p;
      added++;
    }
  }

  // Mit passenden Snacks bis zum Ziel auffüllen (Protein-Lücke bevorzugt schließen)
  if (snacks.length && curKcal < targetKcal * 0.92) {
    const needProtein = curP < targetProtein * 0.85;
    const rankedSnacks = [...snacks].sort((a, b) => needProtein
      ? (b.p / Math.max(1, b.kcal)) - (a.p / Math.max(1, a.kcal))
      : Math.abs((targetKcal - curKcal) - a.kcal) - Math.abs((targetKcal - curKcal) - b.kcal)
    );
    for (const s of rankedSnacks) {
      if (curKcal + s.kcal <= targetKcal * 1.06) {
        mp.days[dateStr].push({
          id: 'mp_' + (Date.now() + 100 + added),
          kind: 'snack',
          refId: s.sn.id,
          name: `${s.sn.name} (${s.g}g)`,
          kcal: s.kcal,
          p: s.p,
          c: s.c,
          f: s.f,
          items: [{ name: s.sn.name, grams: s.g }]
        });
        curKcal += s.kcal;
        curP += s.p;
        added++;
        if (curKcal >= targetKcal * 0.92) break;
      }
    }
  }

  saveState();
  render();
  openMealPlanModal(dateStr);
  showToast(`⚡ Tagesplan erstellt (${Math.round(curKcal)} / ${targetKcal} kcal)`);
}

let mpSpeechRecognition = null;
let mpSpeechActive = false;
let mpSpeechFinal = '';
let mpSpeechInterim = '';
let mpMediaRecorder = null;
let mpAudioStream = null;
let mpAudioChunks = [];
let mpRecordedAudioBase64 = null;
let mpRecordedAudioMime = null;
let mpRecTimer = null;
let mpRecSeconds = 0;
let mpPrefDraft = '';
let mpAiAbortController = null;

function stopMealPlanVoiceStreamOnly() {
  clearInterval(mpRecTimer);
  mpRecTimer = null;
  mpSpeechActive = false;
  if (mpSpeechRecognition) {
    try {
      mpSpeechRecognition.onresult = null;
      mpSpeechRecognition.onend = null;
      mpSpeechRecognition.onerror = null;
      mpSpeechRecognition.abort();
    } catch (e) {}
    mpSpeechRecognition = null;
  }
  if (mpMediaRecorder && mpMediaRecorder.state !== 'inactive') {
    try { mpMediaRecorder.onstop = null; mpMediaRecorder.stop(); } catch (e) {}
  }
  mpMediaRecorder = null;
  if (mpAudioStream) {
    mpAudioStream.getTracks().forEach(t => t.stop());
    mpAudioStream = null;
  }
  if (mpAiAbortController) {
    try { mpAiAbortController.abort(); } catch (e) {}
    mpAiAbortController = null;
  }
}

function resetMealPlanMicButtonUi() {
  const btn = document.getElementById('mealPlanMicBtn');
  if (!btn) return;
  btn.className = 'px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/45 text-emerald-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition shrink-0';
  btn.innerHTML = `${VQL_MIC_SVG}<span>Wünsche einsprechen</span>`;
}

function startMealPlanRecUi(statusMsg) {
  mpRecSeconds = 0;
  const btn = document.getElementById('mealPlanMicBtn');
  const statusEl = document.getElementById('mealPlanAiStatus');
  if (btn) {
    btn.className = 'px-3 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 border border-rose-400 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition shrink-0 animate-pulse';
    btn.innerHTML = '<span>⏹</span><span id="mealPlanMicLabel">Stopp (00:00)</span>';
  }
  if (statusEl) {
    statusEl.textContent = statusMsg;
    statusEl.className = 'text-[11px] text-amber-300';
  }
  clearInterval(mpRecTimer);
  mpRecTimer = setInterval(() => {
    mpRecSeconds++;
    const mm = String(Math.floor(mpRecSeconds / 60)).padStart(2, '0');
    const ss = String(mpRecSeconds % 60).padStart(2, '0');
    const lbl = document.getElementById('mealPlanMicLabel');
    if (lbl) lbl.textContent = `Stopp (${mm}:${ss})`;
  }, 1000);
}

async function startMealPlanAudioFallback() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Mikrofon wird in diesem Browser nicht unterstützt.');
  }
  mpAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = pickSupportedAudioMime();
  mpAudioChunks = [];
  const recOpts = mime ? { mimeType: mime, audioBitsPerSecond: 24000 } : { audioBitsPerSecond: 24000 };
  try {
    mpMediaRecorder = new MediaRecorder(mpAudioStream, recOpts);
  } catch (e) {
    mpMediaRecorder = mime ? new MediaRecorder(mpAudioStream, { mimeType: mime }) : new MediaRecorder(mpAudioStream);
  }
  mpMediaRecorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) mpAudioChunks.push(ev.data);
  };
  mpMediaRecorder.onstop = async () => {
    const actualMime = (mpMediaRecorder && mpMediaRecorder.mimeType) || mime || 'audio/webm';
    if (mpAudioStream) {
      mpAudioStream.getTracks().forEach(t => t.stop());
      mpAudioStream = null;
    }
    mpMediaRecorder = null;
    clearInterval(mpRecTimer);
    mpRecTimer = null;
    resetMealPlanMicButtonUi();
    const blob = new Blob(mpAudioChunks, { type: actualMime });
    if (!blob.size) return;
    mpRecordedAudioBase64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || '').split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    mpRecordedAudioMime = actualMime.split(';')[0];
    const statusEl = document.getElementById('mealPlanAiStatus');
    if (statusEl) {
      statusEl.textContent = '✓ Sprachaufnahme gespeichert – tippe jetzt auf „KI-Tag“ oder „KI-Woche (7T)“.';
      statusEl.className = 'text-[11px] text-emerald-400';
    }
  };
  mpMediaRecorder.start();
  startMealPlanRecUi('🔴 Aufnahme läuft… Sprich deine Wünsche für den Tag oder die Woche ein.');
}

async function toggleMealPlanVoiceRecording() {
  const statusEl = document.getElementById('mealPlanAiStatus');

  if (mpSpeechActive && mpSpeechRecognition) {
    mpSpeechActive = false;
    clearInterval(mpRecTimer);
    mpRecTimer = null;
    try { mpSpeechRecognition.stop(); } catch (e) {}
    mpSpeechRecognition = null;
    resetMealPlanMicButtonUi();
    const captured = `${mpSpeechFinal} ${mpSpeechInterim}`.trim();
    if (captured) {
      mpPrefDraft = captured;
      const inp = document.getElementById('mealPlanPrefInput');
      if (inp) inp.value = captured;
      if (statusEl) {
        statusEl.textContent = '✓ Wunsch übernommen – tippe jetzt auf „KI-Tag“ oder „KI-Woche (7T)“.';
        statusEl.className = 'text-[11px] text-emerald-400';
      }
    }
    return;
  }

  if (mpMediaRecorder && mpMediaRecorder.state === 'recording') {
    mpMediaRecorder.stop();
    return;
  }

  mpRecordedAudioBase64 = null;
  mpRecordedAudioMime = null;

  const SpeechRec = getSpeechRecognitionCtor();
  if (SpeechRec) {
    try {
      const existingText = (document.getElementById('mealPlanPrefInput')?.value || '').trim();
      mpSpeechFinal = existingText ? existingText + ' ' : '';
      mpSpeechInterim = '';
      const rec = new SpeechRec();
      rec.lang = appLang === 'es' ? 'es-ES' : 'de-DE';
      rec.continuous = true;
      rec.interimResults = true;
      mpSpeechRecognition = rec;
      mpSpeechActive = true;

      rec.onresult = (ev) => {
        let fin = existingText ? existingText + ' ' : '';
        let interim = '';
        for (let i = 0; i < ev.results.length; i++) {
          const t = ev.results[i][0]?.transcript || '';
          if (ev.results[i].isFinal) fin += t + ' ';
          else interim += t;
        }
        mpSpeechFinal = fin.trim();
        mpSpeechInterim = interim.trim();
        const combined = `${mpSpeechFinal} ${mpSpeechInterim}`.trim();
        mpPrefDraft = combined;
        const inp = document.getElementById('mealPlanPrefInput');
        if (inp) inp.value = combined;
      };

      rec.onerror = async (ev) => {
        const code = ev?.error || '';
        if (code === 'aborted' || code === 'no-speech') return;
        stopMealPlanVoiceStreamOnly();
        try {
          await startMealPlanAudioFallback();
        } catch (fallbackErr) {
          resetMealPlanMicButtonUi();
          if (statusEl) {
            statusEl.textContent = `Mikrofon-Fehler: ${fallbackErr.message || fallbackErr}`;
            statusEl.className = 'text-[11px] text-rose-400';
          }
        }
      };

      rec.onend = () => {
        if (!mpSpeechActive) return;
        mpSpeechActive = false;
        clearInterval(mpRecTimer);
        mpRecTimer = null;
        mpSpeechRecognition = null;
        resetMealPlanMicButtonUi();
        if (statusEl && mpPrefDraft) {
          statusEl.textContent = '✓ Wunsch übernommen – tippe jetzt auf „KI-Tag“ oder „KI-Woche (7T)“.';
          statusEl.className = 'text-[11px] text-emerald-400';
        }
      };

      rec.start();
      startMealPlanRecUi('🔴 Hört live zu… Sprich deine Wünsche für den Tag oder die Woche ein.');
      return;
    } catch (e) {
      stopMealPlanVoiceStreamOnly();
    }
  }

  try {
    await startMealPlanAudioFallback();
  } catch (err) {
    stopMealPlanVoiceStreamOnly();
    resetMealPlanMicButtonUi();
    if (statusEl) {
      statusEl.textContent = `Mikrofon-Fehler: ${err.message || err}`;
      statusEl.className = 'text-[11px] text-rose-400';
    }
  }
}

let mpLastSavedRecipe = null;

function jumpToRecipeFromMealPlan(recipeId) {
  const found = (state.recipes || []).find(r => r.id === recipeId);
  if (!found) {
    showToast('Rezept wurde nicht gefunden.');
    return;
  }
  mpLastSavedRecipe = null;
  closeModal();
  currentTab = 'food';
  editingRecipe = JSON.parse(JSON.stringify(found));
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function savePlannedMealAsRecipe(dateStr, itemId) {
  const meal = getPlannedMealsForDate(dateStr).find(it => it.id === itemId);
  if (!meal) return;
  if (meal.savedRecipeId && (state.recipes || []).some(r => r.id === meal.savedRecipeId)) {
    jumpToRecipeFromMealPlan(meal.savedRecipeId);
    return;
  }
  const rawItems = Array.isArray(meal.items) && meal.items.length
    ? meal.items
    : [{ name: meal.name, grams: 250 }];
  const totalGrams = rawItems.reduce((s, it) => s + Math.max(1, Number(it.grams) || 100), 0) || 100;
  const now = Date.now();
  const newRecId = 'rec_' + now;
  const recipeItems = rawItems.map((it, idx) => {
    const g = Math.max(1, Math.round(Number(it.grams) || 100));
    const share = g / totalGrams;
    const hasPer100 = Number(it.kcal100) > 0;
    return {
      id: 'it_' + (now + idx),
      name: String(it.name || 'Zutat').trim(),
      grams: g,
      kcal100: hasPer100 ? Math.round(Number(it.kcal100)) : Math.round(((Number(meal.kcal) || 0) * share * 100) / g),
      p100: hasPer100 ? Math.round((Number(it.p100) || 0) * 10) / 10 : Math.round((((Number(meal.p) || 0) * share * 100) / g) * 10) / 10,
      c100: hasPer100 ? Math.round((Number(it.c100) || 0) * 10) / 10 : Math.round((((Number(meal.c) || 0) * share * 100) / g) * 10) / 10,
      f100: hasPer100 ? Math.round((Number(it.f100) || 0) * 10) / 10 : Math.round((((Number(meal.f) || 0) * share * 100) / g) * 10) / 10
    };
  });
  state.recipes.unshift({
    id: newRecId,
    name: meal.name,
    items: recipeItems,
    tags: [],
    rating: 0,
    eatenCount: 0,
    ...(meal.prepMinutes ? { prepMinutes: meal.prepMinutes } : {}),
    ...(meal.summary ? { summary: meal.summary } : {}),
    ...(Array.isArray(meal.steps) && meal.steps.length ? { steps: meal.steps } : {}),
    ...(meal.searchQuery ? { searchQuery: meal.searchQuery } : {})
  });
  meal.savedAsRecipe = true;
  meal.savedRecipeId = newRecId;
  mpLastSavedRecipe = { id: newRecId, name: meal.name };
  saveState();
  render();
  openMealPlanModal(dateStr);
}

function normalizeAiPlannedMeal(m, baseTs, idx) {
  const cleanName = String(m.name || `Mahlzeit ${idx + 1}`).trim();
  return {
    id: 'mp_' + (baseTs + idx) + '_' + Math.floor(Math.random() * 1000),
    kind: 'ai',
    name: cleanName,
    kcal: Math.max(0, Math.round(Number(m.kcal) || 0)),
    p: Math.max(0, Math.round((Number(m.p) || 0) * 10) / 10),
    c: Math.max(0, Math.round((Number(m.c) || 0) * 10) / 10),
    f: Math.max(0, Math.round((Number(m.f) || 0) * 10) / 10),
    prepMinutes: Math.max(0, Math.round(Number(m.prepMinutes) || 0)),
    summary: String(m.summary || '').trim(),
    steps: (Array.isArray(m.steps) ? m.steps : []).map(s => String(s || '').trim()).filter(Boolean).slice(0, 5),
    searchQuery: String(m.searchQuery || cleanName).trim(),
    items: (Array.isArray(m.items) ? m.items : [])
      .map(it => ({
        name: String(it.name || '').trim(),
        grams: Math.max(1, Math.round(Number(it.grams) || 100)),
        ...(Number(it.kcal100) > 0 ? {
          kcal100: Math.round(Number(it.kcal100)),
          p100: Math.round((Number(it.p100) || 0) * 10) / 10,
          c100: Math.round((Number(it.c100) || 0) * 10) / 10,
          f100: Math.round((Number(it.f100) || 0) * 10) / 10
        } : {})
      }))
      .filter(it => it.name)
  };
}

function renderRecipeReferenceLinksHtml(name, searchQuery = '') {
  const q = String(searchQuery || name || '').trim();
  if (!q) return '';
  const imgUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q + ' Rezept')}`;
  const chefkochUrl = `https://www.chefkoch.de/rs/s0/${encodeURIComponent(q)}/Rezepte.html`;
  const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q + ' Rezept')}`;
  return `
    <div class="flex flex-wrap items-center gap-1.5 pt-1">
      <a href="${imgUrl}" target="_blank" rel="noopener noreferrer"
        class="px-2 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-medium text-sky-300 transition inline-flex items-center gap-1">
        🖼️ Fotos ansehen
      </a>
      <a href="${chefkochUrl}" target="_blank" rel="noopener noreferrer"
        class="px-2 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-medium text-emerald-300 transition inline-flex items-center gap-1">
        🍳 Chefkoch
      </a>
      <a href="${ytUrl}" target="_blank" rel="noopener noreferrer"
        class="px-2 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-medium text-rose-300 transition inline-flex items-center gap-1">
        ▶ Video
      </a>
    </div>
  `;
}

async function generateAiMealPlan(mode, dateStr) {
  const isWeek = mode === 'week';
  const apiKey = (localStorage.getItem(GEMINI_KEY_STORAGE) || '').trim();
  const statusEl = document.getElementById('mealPlanAiStatus');
  const dayBtn = document.getElementById('mealPlanAiBtn');
  const weekBtn = document.getElementById('mealPlanAiWeekBtn');

  if (mpSpeechActive || (mpMediaRecorder && mpMediaRecorder.state === 'recording')) {
    await toggleMealPlanVoiceRecording();
  }

  const pref = (document.getElementById('mealPlanPrefInput')?.value || mpPrefDraft || '').trim();
  mpPrefDraft = pref;

  if (!apiKey) {
    if (statusEl) {
      statusEl.textContent = 'Bitte zuerst deinen Gemini API Key (z. B. über KI-Analyse oder Sprach-Log) speichern.';
      statusEl.className = 'text-[11px] text-rose-400';
    }
    return;
  }

  const dyn = getDynamicCalorieTarget(dateStr);
  const targetKcal = Math.max(1200, dyn.target || state.calorieGoal || 2200);
  const targetP = Number(state.proteinGoal) || 150;
  const targetC = Number(state.carbsGoal) || 250;
  const targetF = Number(state.fatGoal) || 70;
  const dayLogEntries = (state.logs && state.logs[dateStr] && Array.isArray(state.logs[dateStr].entries))
    ? state.logs[dateStr].entries
    : [];
  const loggedTot = dayLogEntries.reduce((acc, e) => ({
    kcal: acc.kcal + (Number(e.kcal) || 0),
    p: acc.p + (Number(e.p) || 0),
    c: acc.c + (Number(e.c) || 0),
    f: acc.f + (Number(e.f) || 0)
  }), { kcal: 0, p: 0, c: 0, f: 0 });
  const remKcal = Math.max(250, Math.round(targetKcal - loggedTot.kcal));
  const remP = Math.max(20, Math.round(targetP - loggedTot.p));
  const remC = Math.max(0, Math.round(targetC - loggedTot.c));
  const remF = Math.max(0, Math.round(targetF - loggedTot.f));
  const existingRecipeNames = (state.recipes || []).map(r => r.name).slice(0, 12).join(', ');
  const langLabel = appLang === 'es' ? 'Spanisch (Español)' : 'Deutsch';
  const weekDays = getMealPlanDates(7);

  if (dayBtn) dayBtn.disabled = true;
  if (weekBtn) weekBtn.disabled = true;
  if (isWeek && weekBtn) weekBtn.textContent = '⏳ Plant 7 Tage…';
  if (!isWeek && dayBtn) dayBtn.textContent = '⏳ KI plant…';
  if (statusEl) {
    statusEl.textContent = isWeek
      ? '⚡ KI erstellt abwechslungsreichen 7-Tage-Wochenplan mit Rezepten & Zutaten…'
      : '⚡ KI erstellt passenden Vorschlag für deine Anfrage…';
    statusEl.className = 'text-[11px] text-zinc-400';
  }

  const mealSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      kcal: { type: 'number' },
      p: { type: 'number' },
      c: { type: 'number' },
      f: { type: 'number' },
      prepMinutes: { type: 'number' },
      summary: { type: 'string' },
      searchQuery: { type: 'string' },
      steps: {
        type: 'array',
        items: { type: 'string' }
      },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            grams: { type: 'number' }
          },
          required: ['name', 'grams']
        }
      }
    },
    required: ['name', 'kcal', 'p', 'c', 'f', 'prepMinutes', 'summary', 'searchQuery', 'steps', 'items']
  };

  const promptText = isWeek
    ? `Erstelle einen praxisnahen, abwechslungsreichen 7-Tage-Ernährungsplan (dayOffset 0 bis 6, je 3 Mahlzeiten pro Tag) auf ${langLabel} für diese Tagesziele pro Tag:
- Kalorien: ca. ${targetKcal} kcal (±120 kcal)
- Protein: ca. ${targetP}g · Kohlenhydrate: ca. ${targetC}g · Fett: ca. ${targetF}g
${pref ? `- Vorgaben/Wünsche des Nutzers: "${pref}"` : ''}
${mpRecordedAudioBase64 ? '- Berücksichtige unbedingt alle gesprochenen Wünsche aus der angehängten Sprachaufnahme!' : ''}
${existingRecipeNames ? `- Typische Rezepte des Nutzers als Stil-Inspiration: ${existingRecipeNames}` : ''}
Achte auf clevere Zutaten-Wiederverwendung über die Woche für eine effiziente Einkaufsliste. Gib für jede Mahlzeit konkrete Lebensmittel mit Gramm-Mengen ("items") und realistischen Portions-Nährwerten (kcal, p, c, f) an.`
    : `Du bist ein präziser Ernährungsplaner (${langLabel}).
Tagesziele für ${dateStr}: ${targetKcal} kcal · P ${targetP}g · C ${targetC}g · F ${targetF}g.
${loggedTot.kcal > 0 ? `Heute bereits gegessen: ${Math.round(loggedTot.kcal)} kcal (P ${Math.round(loggedTot.p)}g · C ${Math.round(loggedTot.c)}g · F ${Math.round(loggedTot.f)}g). Noch offen: ca. ${remKcal} kcal, ${remP}g Protein, ${remC}g Carbs, ${remF}g Fett.` : 'Heute noch keine Mahlzeiten geloggt.'}
${pref ? `Konkreter Wunsch des Nutzers: "${pref}"` : 'Kein eingeschränkter Wunsch (kompletter Tagesplan gewünscht).'}
${mpRecordedAudioBase64 ? 'Berücksichtige exakt die gesprochenen Wünsche aus der angehängten Sprachaufnahme!' : ''}
${existingRecipeNames ? `Stil-Inspiration aus vorhandenen Rezepten: ${existingRecipeNames}` : ''}

WICHTIGE REGEL ZUM UMFANG:
- Wenn der Nutzer NUR eine bestimmte Mahlzeit, Tageszeit oder Ergänzung wünscht (z. B. "heute Abend noch etwas Proteinreiches", "ein schnelles Mittagessen", "nur Frühstück", "noch ein Snack"), gib NUR GENAU diese 1 passende Mahlzeit zurück (orientiert am noch offenen Tagesbudget) und setze "replaceDay": false! Plane in diesem Fall KEINESFALLS ungefragt Frühstück, Mittagessen, Nachmittag und Abendessen für den ganzen Tag!
- Nur wenn der Nutzer einen kompletten Tag möchte oder keine einzelne Mahlzeit/Tageszeit einschränkt, plane 3–4 Mahlzeiten für den ganzen Tag und setze "replaceDay": true.
Gib für jede Mahlzeit die konkreten Lebensmittel mit Gramm-Mengen ("items"), realistische Portions-Nährwerte (kcal, p, c, f), Zubereitungszeit in Minuten ("prepMinutes"), eine kurze appetitliche Beschreibung ("summary"), 2–4 knappe Zubereitungsschritte ("steps") und einen präzisen Suchbegriff für Fotos/Rezepte ("searchQuery") an.`;

  const parts = [{ text: promptText }];
  if (mpRecordedAudioBase64) {
    parts.push({
      inlineData: {
        mimeType: mpRecordedAudioMime || 'audio/webm',
        data: mpRecordedAudioBase64
      }
    });
  }

  const responseJsonSchema = isWeek
    ? {
        type: 'object',
        properties: {
          days: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                dayOffset: { type: 'number' },
                meals: { type: 'array', items: mealSchema }
              },
              required: ['dayOffset', 'meals']
            }
          }
        },
        required: ['days']
      }
    : {
        type: 'object',
        properties: {
          replaceDay: { type: 'boolean' },
          meals: { type: 'array', items: mealSchema }
        },
        required: ['replaceDay', 'meals']
      };

  const requestBody = JSON.stringify({
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: isWeek ? 6000 : 1400,
      responseMimeType: 'application/json',
      responseJsonSchema
    }
  });

  try {
    let res = null;
    let lastError = 'Unbekannter Fehler';
    const timeoutMs = isWeek ? 35000 : 20000;
    for (const model of GEMINI_FAST_MODELS_TO_TRY) {
      const controller = new AbortController();
      mpAiAbortController = controller;
      let timedOut = false;
      const tid = setTimeout(() => { timedOut = true; try { controller.abort(); } catch (e) {} }, timeoutMs);
      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
          signal: controller.signal
        });
      } catch (err) {
        clearTimeout(tid);
        if (timedOut) { lastError = `Timeout bei ${model}`; res = null; continue; }
        throw err;
      } finally {
        clearTimeout(tid);
        if (mpAiAbortController === controller) mpAiAbortController = null;
      }
      if (res.ok) break;
      const errData = await res.json().catch(() => ({}));
      lastError = errData.error?.message || `HTTP ${res.status}`;
      if (![404, 429, 500, 502, 503, 504].includes(res.status)) throw new Error(lastError);
      res = null;
    }
    if (!res) throw new Error(lastError);

    const result = await res.json();
    const rawJson = extractGeminiJsonText(result);
    const data = JSON.parse(rawJson);
    const mp = ensureMealPlan();
    const now = Date.now();
    mpRecordedAudioBase64 = null;
    mpRecordedAudioMime = null;

    if (isWeek) {
      const aiDays = Array.isArray(data?.days) ? data.days : [];
      if (!aiDays.length) throw new Error('KI hat keinen Wochenplan geliefert.');
      let filledDays = 0;
      aiDays.forEach((dObj, arrIdx) => {
        const offset = Number.isInteger(dObj?.dayOffset) ? dObj.dayOffset : arrIdx;
        if (offset < 0 || offset >= weekDays.length) return;
        const targetIso = weekDays[offset].dateStr;
        const meals = Array.isArray(dObj?.meals) ? dObj.meals : [];
        if (!meals.length) return;
        const prev = Array.isArray(mp.days[targetIso]) ? mp.days[targetIso] : [];
        prev.forEach(it => markDeletedId(it.id));
        mp.days[targetIso] = meals.map((m, idx) => normalizeAiPlannedMeal(m, now + offset * 20, idx));
        filledDays++;
      });
      if (!filledDays) throw new Error('KI-Wochenplan enthielt keine gültigen Tage.');
      saveState();
      render();
      openMealPlanModal(weekDays[0].dateStr);
      showToast(`🗓️ KI-Wochenplan für ${filledDays} Tage erstellt`);
    } else {
      const meals = Array.isArray(data?.meals) ? data.meals : [];
      if (!meals.length) throw new Error('KI hat keine Mahlzeiten geliefert.');
      const normalized = meals.map((m, idx) => normalizeAiPlannedMeal(m, now, idx));
      const shouldReplace = data?.replaceDay !== false;
      if (shouldReplace) {
        const prev = Array.isArray(mp.days[dateStr]) ? mp.days[dateStr] : [];
        prev.forEach(it => markDeletedId(it.id));
        mp.days[dateStr] = normalized;
      } else {
        if (!Array.isArray(mp.days[dateStr])) mp.days[dateStr] = [];
        mp.days[dateStr].push(...normalized);
      }
      saveState();
      render();
      openMealPlanModal(dateStr);
      showToast(normalized.length === 1
        ? `✨ Vorschlag „${normalized[0].name}“ hinzugefügt`
        : `✨ KI-Plan mit ${normalized.length} Mahlzeiten erstellt`);
    }
  } catch (err) {
    if (statusEl) {
      statusEl.textContent = `Fehler: ${err.message || err}`;
      statusEl.className = 'text-[11px] text-rose-400';
    }
    if (dayBtn) { dayBtn.disabled = false; dayBtn.textContent = '✨ KI-Vorschlag'; }
    if (weekBtn) { weekBtn.disabled = false; weekBtn.textContent = '🗓️ KI-Woche (7T)'; }
  }
}

function generateAiDayPlan(dateStr) {
  return generateAiMealPlan('day', dateStr);
}

function generateAiWeekPlan(dateStr) {
  return generateAiMealPlan('week', dateStr);
}

function openMealPlanModal(dateOverride = null) {
  stopMealPlanVoiceStreamOnly();
  const days = getMealPlanDates(7);
  if (dateOverride) selectedMealPlanDate = dateOverride;
  if (!selectedMealPlanDate || !days.some(d => d.dateStr === selectedMealPlanDate)) {
    selectedMealPlanDate = days[0].dateStr;
  }
  const activeDate = selectedMealPlanDate;
  const planned = getPlannedMealsForDate(activeDate);
  const tot = calcPlannedDayTotals(activeDate);
  const dyn = getDynamicCalorieTarget(activeDate);
  const targetKcal = Math.max(1200, dyn.target || state.calorieGoal || 2200);
  const kcalPct = Math.min(100, Math.round((tot.kcal / targetKcal) * 100));
  const diffKcal = Math.round(targetKcal - tot.kcal);

  openModal(`
    <div class="space-y-4">
      <div class="flex items-start justify-between gap-2">
        <div>
          <h3 class="text-base font-semibold text-white">📅 Personalisierter Ernährungsplan</h3>
          <p class="text-[11px] text-zinc-400">Auf deine Ziele abgestimmt · direkt loggbar & Basis für deine Einkaufsliste</p>
        </div>
        <button type="button" onclick="closeModal()" class="text-zinc-400 hover:text-white px-2 py-1">✕</button>
      </div>

      <!-- 7-Tage-Leiste -->
      <div class="grid grid-cols-7 gap-1">
        ${days.map(d => {
          const dTot = calcPlannedDayTotals(d.dateStr);
          const isAct = d.dateStr === activeDate;
          return `
            <button type="button" onclick="openMealPlanModal('${d.dateStr}')"
              class="py-1.5 px-1 rounded-xl border text-center transition ${
                isAct
                  ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                  : 'bg-zinc-900 border-border text-zinc-400 hover:text-zinc-200'
              }">
              <div class="text-[10px] font-semibold">${d.label}</div>
              <div class="text-[9px] opacity-75">${d.shortDate}</div>
              <div class="text-[9px] mt-0.5 font-bold ${dTot.kcal > 0 ? 'text-emerald-400' : 'text-zinc-600'}">${dTot.kcal > 0 ? Math.round(dTot.kcal) : '·'}</div>
            </button>
          `;
        }).join('')}
      </div>

      <!-- Ziel-Abgleich -->
      <div class="rounded-2xl bg-zinc-900/90 border border-border p-3 space-y-2">
        <div class="flex items-baseline justify-between gap-2">
          <div class="text-xs font-semibold text-white">
            ${Math.round(tot.kcal)} <span class="text-zinc-400 font-normal">/ ${targetKcal} kcal</span>
          </div>
          <div class="text-[11px] ${diffKcal >= 0 ? 'text-emerald-400' : 'text-amber-300'} font-medium">
            ${diffKcal >= 0 ? `Noch ${diffKcal} kcal frei` : `${Math.abs(diffKcal)} kcal über Ziel`}
          </div>
        </div>
        <div class="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all" style="width:${kcalPct}%"></div>
        </div>
        <div class="grid grid-cols-3 gap-1.5 text-center text-[11px]">
          <div class="bg-zinc-950/80 rounded-xl py-1.5"><span class="text-sky-400 font-semibold">${Math.round(tot.p)}g</span> <span class="text-zinc-500">/ ${state.proteinGoal}g P</span></div>
          <div class="bg-zinc-950/80 rounded-xl py-1.5"><span class="text-amber-400 font-semibold">${Math.round(tot.c)}g</span> <span class="text-zinc-500">/ ${state.carbsGoal}g C</span></div>
          <div class="bg-zinc-950/80 rounded-xl py-1.5"><span class="text-rose-400 font-semibold">${Math.round(tot.f)}g</span> <span class="text-zinc-500">/ ${state.fatGoal}g F</span></div>
        </div>
      </div>

      <!-- KI- & Rezept-Planer mit Sprachaufnahme -->
      <div class="rounded-2xl bg-zinc-950/80 border border-border p-3 space-y-2.5">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-white">KI-Wochen- & Tagesplaner</span>
          <button id="mealPlanMicBtn" type="button" onclick="toggleMealPlanVoiceRecording()"
            class="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/45 text-emerald-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition shrink-0">
            ${VQL_MIC_SVG}<span>Wünsche einsprechen</span>
          </button>
        </div>
        <textarea id="mealPlanPrefInput" rows="2" oninput="mpPrefDraft = this.value"
          placeholder="Sprich oder tippe deine Wünsche für die Woche (z. B. Mo–Fr high protein, 2× Pasta, 1× Lachs, abends leicht…)"
          class="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-border text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500">${escapeHtmlAttr(mpPrefDraft)}</textarea>
        <div class="grid grid-cols-2 gap-2">
          <button id="mealPlanAiWeekBtn" type="button" onclick="generateAiWeekPlan('${activeDate}')"
            class="py-2.5 px-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-400 hover:to-indigo-400 text-white font-semibold text-xs transition">
            🗓️ KI-Woche (7T)
          </button>
          <button id="mealPlanAiBtn" type="button" onclick="generateAiDayPlan('${activeDate}')"
            class="py-2.5 px-2.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 text-violet-300 font-semibold text-xs transition">
            ✨ KI-Vorschlag
          </button>
        </div>
        <button type="button" onclick="generateSmartDayPlan('${activeDate}')"
          class="w-full py-2 px-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-border text-emerald-300 font-semibold text-xs transition">
          ⚡ Tag aus meinen bestehenden Rezepten füllen
        </button>
        <div id="mealPlanAiStatus" class="text-[11px] text-zinc-500"></div>
      </div>

      ${mpLastSavedRecipe ? `
        <div class="rounded-2xl bg-emerald-500/15 border border-emerald-500/40 px-3 py-2.5 flex items-center justify-between gap-2">
          <span class="text-xs text-emerald-200 truncate">✓ <strong>${escapeHtmlAttr(mpLastSavedRecipe.name)}</strong> gespeichert</span>
          <button type="button" onclick="jumpToRecipeFromMealPlan('${mpLastSavedRecipe.id}')"
            class="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-[11px] shrink-0 transition">
            📖 Zum Rezept →
          </button>
        </div>
      ` : ''}

      <!-- Geplante Mahlzeiten -->
      <div class="space-y-2">
        <div class="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Geplant (${planned.length})</div>
        ${planned.length > 0 ? planned.map(m => `
          <div class="bg-zinc-900/90 border border-border rounded-2xl p-3 space-y-1.5">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <div class="text-xs font-semibold text-white truncate">${escapeHtmlAttr(m.name)}</div>
                <div class="text-[11px] text-zinc-400">${Math.round(m.kcal)} kcal · P ${Math.round(m.p)}g · C ${Math.round(m.c)}g · F ${Math.round(m.f)}g</div>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                ${m.kind === 'ai' ? `
                  <button type="button" onclick="savePlannedMealAsRecipe('${activeDate}', '${m.id}')" title="${m.savedRecipeId ? 'Direkt zum gespeicherten Rezept springen' : 'Als eigenes Rezept speichern'}"
                    class="px-2 py-1.5 rounded-xl text-[11px] font-semibold border transition ${
                      m.savedAsRecipe
                        ? 'bg-sky-500/20 hover:bg-sky-500/30 border-sky-500/50 text-sky-300'
                        : 'bg-zinc-950 hover:bg-sky-500/15 border-zinc-800 hover:border-sky-500/35 text-zinc-300 hover:text-sky-300'
                    }">
                    ${m.savedAsRecipe ? '📖 Öffnen →' : '📖'}
                  </button>
                ` : ''}
                <button type="button" onclick="logMealPlanItemToDay('${activeDate}', '${m.id}')" title="In Tagesbilanz loggen"
                  class="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition ${
                    m.logged
                      ? 'bg-emerald-500/25 border-emerald-500/50 text-emerald-300'
                      : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/35 text-emerald-400'
                  }">
                  ${m.logged ? '✓ Geloggt' : '+ Loggen'}
                </button>
                <button type="button" onclick="removeMealPlanItem('${activeDate}', '${m.id}')" title="Entfernen"
                  class="w-7 h-7 flex items-center justify-center rounded-xl bg-zinc-950 hover:bg-rose-500/20 border border-zinc-800 text-zinc-400 hover:text-rose-300 text-xs">✕</button>
              </div>
            </div>
            ${m.summary || m.prepMinutes ? `
              <div class="text-[11px] text-zinc-300 leading-snug">
                ${m.prepMinutes ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded-md bg-zinc-800 text-zinc-200 text-[10px] font-semibold">⏱️ ${m.prepMinutes} Min.</span>` : ''}${escapeHtmlAttr(m.summary || '')}
              </div>
            ` : ''}
            ${Array.isArray(m.items) && m.items.length ? `
              <div class="flex flex-wrap gap-1 pt-0.5">
                ${m.items.map(it => `<span class="px-1.5 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-400">${it.grams}g ${escapeHtmlAttr(it.name)}</span>`).join('')}
              </div>
            ` : ''}
            ${Array.isArray(m.steps) && m.steps.length ? `
              <details class="pt-0.5">
                <summary class="cursor-pointer text-[11px] text-zinc-400 hover:text-zinc-200 select-none">📝 Zubereitung (${m.steps.length} Schritte)</summary>
                <ol class="list-decimal list-inside space-y-0.5 mt-1 text-[11px] text-zinc-300 pl-1">
                  ${m.steps.map(st => `<li>${escapeHtmlAttr(st)}</li>`).join('')}
                </ol>
              </details>
            ` : ''}
            ${m.kind === 'ai' ? renderRecipeReferenceLinksHtml(m.name, m.searchQuery) : ''}
          </div>
        `).join('') : `<p class="text-xs text-zinc-500">Noch nichts geplant – sprich oben deine Wünsche ein oder tippe unten auf ein Rezept.</p>`}
      </div>

      <!-- Schnell hinzufügen aus Rezepten & Snacks -->
      ${(state.recipes || []).length > 0 || ensureSnacksArray().length > 0 ? `
        <div class="space-y-1.5 pt-1 border-t border-border">
          <div class="text-[11px] font-semibold text-zinc-400">Manuell hinzufügen:</div>
          <div class="flex flex-wrap gap-1.5">
            ${(state.recipes || []).map(r => `
              <button type="button" onclick="addRecipeToMealPlan('${activeDate}', '${r.id}')"
                class="px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-emerald-500/15 border border-border hover:border-emerald-500/40 text-[11px] text-zinc-200 transition">
                + ${escapeHtmlAttr(r.name)}
              </button>
            `).join('')}
            ${ensureSnacksArray().map(s => `
              <button type="button" onclick="addSnackToMealPlan('${activeDate}', '${s.id}')"
                class="px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-amber-500/15 border border-border hover:border-amber-500/40 text-[11px] text-amber-200 transition">
                + 🍫 ${escapeHtmlAttr(s.name)}
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <button type="button" onclick="buildShoppingListFromPlan(7)"
        class="w-full py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition">
        🛒 Einkaufsliste aus Wochenplan (7T) erstellen
      </button>
    </div>
  `);
}

let editingShoppingItemId = null;

function suggestShoppingQuantity(rawName) {
  const n = String(rawName || '').trim().toLowerCase();
  if (!n) return { amount: 1, unit: 'Stk.' };

  // Typische Stück- / Packungsartikel
  if (/(^|\b)(eier|ei)(\b|$)/.test(n)) return { amount: 6, unit: 'Stk.' };
  if (/(banane|apfel|äpfel|birne|orange|mandarine|kiwi)/.test(n)) return { amount: 4, unit: 'Stk.' };
  if (/(avocado|paprika|zucchini|zitrone|limette|zwiebel|rote zwiebel|proteinriegel|schokoriegel|riegel|snickers|twix|mars|knoppers|hanuta|duplo)/.test(n)) {
    return { amount: 2, unit: 'Stk.' };
  }
  if (/(milch|hafermilch|sojamilch|mandelmilch|pflanzendrink|gurke|salat|eisberg|knoblauch|ingwer|mango|ananas|brot|vollkornbrot|toast|wrap|tortilla|feta|mozzarella|räuchertofu|tofu|thunfisch|mineralwasser|kaffee|tee|spülmittel|toilettenpapier|küchenrolle)/.test(n)) {
    return { amount: 1, unit: 'Stk.' };
  }

  // Typische lose / abgewogene Lebensmittel in Gramm
  if (/(skyr|magerquark|quark|joghurt|haferflocken|reis|basmatireis|nudel|pasta|spaghetti|kartoffel|süßkartoffel|brokkoli|möhre|karotte)/.test(n)) {
    return { amount: 500, unit: 'g' };
  }
  if (/(hähnchen|pute|rind|hackfleisch|fleisch)/.test(n)) {
    return { amount: 400, unit: 'g' };
  }
  if (/(lachs|fisch|garnelen|tomate|spinat|beeren|heidelbeeren|himbeeren|erdbeeren|trauben|olivenöl|öl)/.test(n)) {
    return { amount: 250, unit: 'g' };
  }
  if (/(frischkäse|hüttenkäse|käse|gouda|parmesan|walnuss|walnüsse|mandel|cashew|nüsse|erdnussmus|mandelmus|schokolade)/.test(n)) {
    return { amount: 200, unit: 'g' };
  }
  return { amount: 250, unit: 'g' };
}

function getShoppingItemUnit(item) {
  return item && item.unit === 'Stk.' ? 'Stk.' : 'g';
}

function formatShoppingQty(item) {
  const amt = Math.max(0, Math.round(Number(item?.grams) || 0));
  if (amt <= 0) return '';
  return getShoppingItemUnit(item) === 'Stk.' ? `${amt} Stk.` : `${amt}g`;
}

function mergeIngredientsIntoShoppingList(rawItems, sourceLabel = 'Rezept') {
  const list = ensureShoppingList();
  let addedOrUpdated = 0;
  const now = Date.now();

  (rawItems || []).forEach((raw, idx) => {
    const name = String(raw?.name || '').trim();
    if (!name) return;
    const unit = raw?.unit === 'Stk.' ? 'Stk.' : 'g';
    const grams = Math.max(0, Math.round(Number(raw?.grams) || 0));
    const norm = name.toLowerCase();
    const existing = list.find(it => !it.checked && String(it.name || '').trim().toLowerCase() === norm && getShoppingItemUnit(it) === unit);
    if (existing) {
      if (grams > 0) existing.grams = (Number(existing.grams) || 0) + grams;
    } else {
      list.unshift({
        id: 'shop_' + (now + idx) + '_' + Math.floor(Math.random() * 1000),
        name,
        grams,
        unit,
        checked: false,
        source: sourceLabel
      });
    }
    addedOrUpdated++;
  });

  if (addedOrUpdated > 0) {
    saveState();
    render();
  }
  return addedOrUpdated;
}

function buildShoppingListFromPlan(daysCount = 7) {
  const dates = getMealPlanDates(daysCount);
  const aggregated = [];
  dates.forEach(d => {
    getPlannedMealsForDate(d.dateStr).forEach(m => {
      if (Array.isArray(m.items) && m.items.length) {
        m.items.forEach(it => aggregated.push({ name: it.name, grams: it.grams }));
      } else if (m.kind === 'recipe' && m.refId) {
        const rec = (state.recipes || []).find(r => r.id === m.refId);
        if (rec) (rec.items || []).forEach(it => aggregated.push({ name: it.name, grams: it.grams }));
      } else if (m.name) {
        aggregated.push({ name: m.name, grams: 0 });
      }
    });
  });

  if (!aggregated.length) {
    showToast('Noch keine Mahlzeiten im 7-Tage-Plan – wähle unten einfach Rezepte aus.');
    openShoppingListModal();
    return;
  }

  const cnt = mergeIngredientsIntoShoppingList(aggregated, 'Wochenplan');
  openShoppingListModal();
  showToast(`🛒 ${cnt} Zutat-Position(en) aus dem Wochenplan übernommen`);
}

function stepShoppingRecipeCount(recipeId, delta) {
  const cur = Number(shoppingRecipeCounts[recipeId]) || 0;
  shoppingRecipeCounts[recipeId] = Math.max(0, Math.min(14, cur + delta));
  openShoppingListModal();
}

function addSelectedRecipesToShoppingList() {
  const aggregated = [];
  (state.recipes || []).forEach(rec => {
    const mult = Number(shoppingRecipeCounts[rec.id]) || 0;
    if (mult <= 0) return;
    (rec.items || []).forEach(it => {
      aggregated.push({
        name: it.name,
        grams: Math.max(1, Math.round((Number(it.grams) || 100) * mult))
      });
    });
  });

  if (!aggregated.length) {
    showToast('Bitte zuerst mindestens ein Rezept oben auswählen.');
    return;
  }

  const cnt = mergeIngredientsIntoShoppingList(aggregated, 'Rezepte');
  shoppingRecipeCounts = {};
  shoppingImportDrawerOpen = false;
  openShoppingListModal();
  showToast(`🛒 ${cnt} Zutat(en) aus Rezepten zur Einkaufsliste hinzugefügt`);
}

const SHOPPING_STAPLE_SUGGESTIONS = [
  'Skyr', 'Magerquark', 'Körniger Frischkäse', 'Eier', 'Haferflocken', 'Sojamilch', 'Hafermilch',
  'Hähnchenbrust', 'Lachs', 'Räuchertofu', 'Tofu', 'Thunfisch', 'Basmatireis', 'Vollkornnudeln',
  'Vollkornbrot', 'Wraps', 'Kartoffeln', 'Süßkartoffeln', 'Brokkoli', 'Spinat', 'Tomaten',
  'Paprika', 'Gurke', 'Zucchini', 'Zwiebeln', 'Rote Zwiebeln', 'Knoblauch', 'Ingwer', 'Avocado',
  'Äpfel', 'Bananen', 'Heidelbeeren', 'Himbeeren', 'Zitronen', 'Olivenöl', 'Walnüsse', 'Mandeln',
  'Cashews', 'Erdnussmus', 'Proteinriegel', 'Kaffee', 'Mineralwasser', 'Kräuterquark', 'Feta', 'Mozzarella'
];

function parseShoppingInputWithQty(rawVal) {
  const trimmed = String(rawVal || '').trim();
  const gramMatch = trimmed.match(/^(\d+)\s*(?:g|gr|gramm|ml)\s+(.*)$/i);
  if (gramMatch) {
    return { explicitAmount: Number(gramMatch[1]), explicitUnit: 'g', query: gramMatch[2].trim() };
  }
  const stkMatch = trimmed.match(/^(\d+)\s*(?:stk\.?|stück|x|×)\s*(.*)$/i);
  if (stkMatch) {
    return { explicitAmount: Number(stkMatch[1]), explicitUnit: 'Stk.', query: stkMatch[2].trim() };
  }
  const plainNumMatch = trimmed.match(/^(\d+)\s+(.+)$/);
  if (plainNumMatch) {
    const num = Number(plainNumMatch[1]);
    const rest = plainNumMatch[2].trim();
    const sug = suggestShoppingQuantity(rest);
    return { explicitAmount: num, explicitUnit: num >= 30 ? 'g' : sug.unit, query: rest };
  }
  return { explicitAmount: 0, explicitUnit: null, query: trimmed };
}

function renderShoppingSuggestions(rawVal) {
  const box = document.getElementById('shopping-suggestions');
  if (!box) return;
  const parsed = parseShoppingInputWithQty(rawVal);
  const qRaw = parsed.query;
  const q = qRaw.toLowerCase();
  if (q.length < 2) {
    box.innerHTML = '';
    return;
  }

  const pool = new Map();
  const addToPool = (label) => {
    const clean = String(label || '').trim();
    if (clean.length < 2) return;
    const key = clean.toLowerCase();
    if (!pool.has(key)) pool.set(key, clean);
  };
  ensureShoppingList().forEach(it => addToPool(it.name));
  SHOPPING_STAPLE_SUGGESTIONS.forEach(addToPool);
  getFoodSuggestions(qRaw).forEach(addToPool);

  const starts = [];
  const contains = [];
  pool.forEach((label, key) => {
    if (key.startsWith(q)) starts.push(label);
    else if (key.includes(q)) contains.push(label);
  });
  const matches = [...starts, ...contains].slice(0, 7);
  if (!matches.length) {
    box.innerHTML = '';
    return;
  }

  box.innerHTML = matches.map(label => {
    const safe = label.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const sug = suggestShoppingQuantity(label);
    const amount = parsed.explicitAmount > 0 ? parsed.explicitAmount : sug.amount;
    const unit = parsed.explicitUnit || sug.unit;
    const qtyLabel = unit === 'Stk.' ? `${amount} Stk.` : `${amount}g`;
    return `
      <button type="button" onclick="pickShoppingSuggestion('${safe}', ${amount}, '${unit}')"
        class="px-2.5 py-1 rounded-full bg-zinc-900 hover:bg-emerald-500/20 border border-border hover:border-emerald-500/45 text-xs text-zinc-200 hover:text-emerald-300 transition">
        + <strong class="text-emerald-400">${qtyLabel}</strong> ${escapeHtmlAttr(label)}
      </button>
    `;
  }).join('');
}

function pickShoppingSuggestion(name, amount = 0, unit = null) {
  if (!name) return;
  const sug = suggestShoppingQuantity(name);
  const finalAmount = Number(amount) > 0 ? Math.round(Number(amount)) : sug.amount;
  const finalUnit = unit === 'Stk.' || unit === 'g' ? unit : sug.unit;
  mergeIngredientsIntoShoppingList([{ name, grams: finalAmount, unit: finalUnit }], 'Vorschlag');
  openShoppingListModal();
  const inp = document.getElementById('shopping-manual-input');
  if (inp) inp.focus();
}

function addManualShoppingItem(event) {
  if (event) event.preventDefault();
  const inp = document.getElementById('shopping-manual-input');
  const raw = (inp?.value || '').trim();
  if (!raw) return;
  const parsed = parseShoppingInputWithQty(raw);
  const name = parsed.query || raw;
  const sug = suggestShoppingQuantity(name);
  const amount = parsed.explicitAmount > 0 ? parsed.explicitAmount : sug.amount;
  const unit = parsed.explicitUnit || sug.unit;
  mergeIngredientsIntoShoppingList([{ name, grams: amount, unit }], 'Manuell');
  openShoppingListModal();
}

function toggleEditShoppingItemQty(id) {
  editingShoppingItemId = editingShoppingItemId === id ? null : id;
  openShoppingListModal();
}

function updateShoppingItemQty(id, newAmount) {
  const item = ensureShoppingList().find(it => it.id === id);
  if (!item) return;
  item.grams = Math.max(1, Math.round(Number(newAmount) || 1));
  saveState();
  render();
  openShoppingListModal();
}

function toggleShoppingItemUnit(id) {
  const item = ensureShoppingList().find(it => it.id === id);
  if (!item) return;
  const wasStk = getShoppingItemUnit(item) === 'Stk.';
  if (wasStk) {
    item.unit = 'g';
    if ((Number(item.grams) || 0) <= 20) item.grams = 250;
  } else {
    item.unit = 'Stk.';
    if ((Number(item.grams) || 0) >= 30) item.grams = 1;
  }
  saveState();
  render();
  openShoppingListModal();
}

function confirmShoppingItemQty(id) {
  const inp = document.getElementById(`shop-qty-${id}`);
  if (inp) {
    const item = ensureShoppingList().find(it => it.id === id);
    if (item) {
      item.grams = Math.max(1, Math.round(Number(inp.value) || 1));
      saveState();
      render();
    }
  }
  editingShoppingItemId = null;
  openShoppingListModal();
}

function toggleShoppingItem(id) {
  const item = ensureShoppingList().find(it => it.id === id);
  if (!item) return;
  item.checked = !item.checked;
  saveState();
  render();
  openShoppingListModal();
}

function deleteShoppingItem(id) {
  state.shoppingList = ensureShoppingList().filter(it => it.id !== id);
  markDeletedId(id);
  saveState();
  render();
  openShoppingListModal();
}

function clearCheckedShoppingItems() {
  const list = ensureShoppingList();
  list.filter(it => it.checked).forEach(it => markDeletedId(it.id));
  state.shoppingList = list.filter(it => !it.checked);
  saveState();
  render();
  openShoppingListModal();
}

function clearAllShoppingItems() {
  const list = ensureShoppingList();
  if (!list.length) return;
  if (!confirm(`Alle ${list.length} Einträge von der Einkaufsliste löschen?`)) return;
  list.forEach(it => markDeletedId(it.id));
  state.shoppingList = [];
  editingShoppingItemId = null;
  saveState();
  render();
  openShoppingListModal();
  showToast('🗑️ Einkaufsliste geleert');
}

function copyShoppingListToClipboard() {
  const openItems = ensureShoppingList().filter(it => !it.checked);
  if (!openItems.length) {
    showToast('Keine offenen Artikel auf der Einkaufsliste.');
    return;
  }
  const text = '🛒 Einkaufsliste (Fuel & Flow)\n' + openItems.map(it => {
    const q = formatShoppingQty(it);
    return `- [ ] ${q ? `${q} ` : ''}${it.name}`;
  }).join('\n');
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    navigator.clipboard.writeText(text)
      .then(() => showToast('📋 Einkaufsliste in Zwischenablage kopiert'))
      .catch(() => showToast('Kopieren fehlgeschlagen'));
  } else {
    showToast('Zwischenablage in diesem Browser nicht verfügbar');
  }
}

let shoppingImportDrawerOpen = false;

function toggleShoppingImportDrawer() {
  shoppingImportDrawerOpen = !shoppingImportDrawerOpen;
  openShoppingListModal();
}

function closeShoppingListModal() {
  const overlay = document.getElementById('shoppingFullscreenOverlay');
  if (overlay) overlay.remove();
}

function openShoppingListModal() {
  // Evtl. offenes Plan-Modal sauber schließen, damit die Einkaufsliste allein den ganzen Bildschirm einnimmt
  const backdrop = document.getElementById('modal-backdrop');
  if (backdrop) backdrop.classList.add('hidden');

  const list = ensureShoppingList();
  const openItems = list.filter(it => !it.checked);
  const doneItems = list.filter(it => it.checked);
  const selectedRecipeTotal = Object.values(shoppingRecipeCounts).reduce((s, n) => s + (Number(n) || 0), 0);

  let overlay = document.getElementById('shoppingFullscreenOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'shoppingFullscreenOverlay';
    overlay.className = 'fixed inset-0 z-50 bg-bg flex flex-col';
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <!-- Vollbild-Header -->
    <header class="shrink-0 bg-bg/95 backdrop-blur-md border-b border-border px-4 py-3">
      <div class="max-w-3xl mx-auto flex items-center justify-between gap-2">
        <div class="min-w-0">
          <h3 class="text-base font-semibold text-white">🛒 Einkaufsliste</h3>
          <p class="text-[11px] text-zinc-400">${openItems.length} offen · ${doneItems.length} erledigt</p>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button type="button" onclick="toggleShoppingImportDrawer()"
            class="px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              shoppingImportDrawerOpen
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-card hover:bg-cardHover border-border text-zinc-200'
            }">
            ${shoppingImportDrawerOpen ? '▲ Füllen' : '+ Aus Plan / Rezepten'}
          </button>
          <button type="button" onclick="closeShoppingListModal()" title="Schließen" aria-label="Einkaufsliste schließen"
            class="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-border text-zinc-300 hover:text-white text-xs font-semibold">
            ✕
          </button>
        </div>
      </div>
    </header>

    <!-- Hauptbereich: Einkaufsliste über den gesamten Bildschirm -->
    <div class="flex-1 overflow-y-auto px-4 py-3">
      <div class="max-w-3xl mx-auto space-y-2">
        ${shoppingImportDrawerOpen ? `
          <div class="rounded-2xl bg-card border border-emerald-500/30 p-3.5 space-y-2.5 mb-3">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-semibold text-white">Automatisch füllen</span>
              <button type="button" onclick="buildShoppingListFromPlan(7)"
                class="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition">
                📅 Aus Wochenplan (7T)
              </button>
            </div>
            ${(state.recipes || []).length > 0 ? `
              <div class="space-y-2 pt-1 border-t border-border">
                <div class="text-[11px] text-zinc-400">Rezepte antippen (Portionen summieren):</div>
                <div class="flex flex-wrap gap-1.5">
                  ${(state.recipes || []).map(r => {
                    const cnt = Number(shoppingRecipeCounts[r.id]) || 0;
                    return `
                      <div class="inline-flex items-center rounded-xl border text-xs overflow-hidden ${
                        cnt > 0 ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200' : 'bg-zinc-900 border-border text-zinc-300'
                      }">
                        <button type="button" onclick="stepShoppingRecipeCount('${r.id}', 1)" class="px-2.5 py-1.5 hover:bg-white/5 transition">
                          ${cnt > 0 ? `<strong>${cnt}×</strong> ` : '+ '}${escapeHtmlAttr(r.name)}
                        </button>
                        ${cnt > 0 ? `<button type="button" onclick="stepShoppingRecipeCount('${r.id}', -1)" class="px-2 py-1.5 border-l border-emerald-500/30 hover:bg-white/10 text-emerald-300">−</button>` : ''}
                      </div>
                    `;
                  }).join('')}
                </div>
                ${selectedRecipeTotal > 0 ? `
                  <button type="button" onclick="addSelectedRecipesToShoppingList()"
                    class="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition">
                    ✓ Zutaten aus ${selectedRecipeTotal} Rezept-Portion(en) übernehmen
                  </button>
                ` : ''}
              </div>
            ` : ''}
          </div>
        ` : ''}

        ${list.length > 0 ? `
          ${[...openItems, ...doneItems].map(it => {
            const unit = getShoppingItemUnit(it);
            const curAmt = Math.max(1, Math.round(Number(it.grams) || 1));
            const qtyStr = formatShoppingQty(it);
            const step = unit === 'Stk.' ? 1 : (curAmt <= 100 ? 25 : 50);
            const isEditingQty = editingShoppingItemId === it.id;
            return `
              <div class="rounded-2xl border transition ${
                it.checked
                  ? 'bg-zinc-950/60 border-zinc-900 text-zinc-500'
                  : 'bg-card border-border text-zinc-100'
              }">
                <div class="flex items-center justify-between gap-2 px-3.5 py-3">
                  <button type="button" onclick="toggleShoppingItem('${it.id}')" class="flex-1 min-w-0 flex items-center gap-3 text-left text-sm">
                    <span class="w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 text-xs font-bold ${
                      it.checked ? 'bg-emerald-500/25 border-emerald-500/50 text-emerald-300' : 'border-zinc-600'
                    }">${it.checked ? '✓' : ''}</span>
                    <span class="truncate ${it.checked ? 'line-through' : 'font-medium'}">${escapeHtmlAttr(it.name)}</span>
                  </button>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <button type="button" onclick="toggleEditShoppingItemQty('${it.id}')" title="Menge / Einheit anpassen"
                      class="px-2.5 py-1 rounded-xl text-xs font-semibold border transition ${
                        isEditingQty
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                          : (it.checked
                            ? 'bg-zinc-900/60 border-zinc-800 text-zinc-500'
                            : 'bg-zinc-900 hover:bg-zinc-800 border-border text-emerald-400')
                      }">
                      ${qtyStr || 'Menge'}
                    </button>
                    <button type="button" onclick="deleteShoppingItem('${it.id}')" title="Entfernen"
                      class="w-8 h-8 flex items-center justify-center rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 text-xs shrink-0 transition">✕</button>
                  </div>
                </div>
                ${isEditingQty ? `
                  <div class="flex items-center gap-1.5 px-3.5 pb-3 pt-1 border-t border-zinc-800/80">
                    <button type="button" onclick="updateShoppingItemQty('${it.id}', Math.max(1, ${curAmt - step}))"
                      class="px-2.5 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-border text-xs font-semibold text-zinc-300">−${step}</button>
                    <div class="flex-1 flex items-center gap-1 bg-zinc-950 border border-zinc-700 focus-within:border-emerald-500 rounded-xl px-2.5 py-1">
                      <input id="shop-qty-${it.id}" type="number" inputmode="decimal" value="${curAmt}" min="1"
                        onkeydown="if(event.key==='Enter'){event.preventDefault(); confirmShoppingItemQty('${it.id}');}"
                        class="w-full bg-transparent text-xs font-semibold text-white text-center focus:outline-none" />
                    </div>
                    <button type="button" onclick="updateShoppingItemQty('${it.id}', ${curAmt + step})"
                      class="px-2.5 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-border text-xs font-semibold text-zinc-300">+${step}</button>
                    <button type="button" onclick="toggleShoppingItemUnit('${it.id}')" title="Zwischen g und Stk. wechseln"
                      class="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-sky-300 shrink-0 transition">
                      ${unit}
                    </button>
                    <button type="button" onclick="confirmShoppingItemQty('${it.id}')" title="Übernehmen"
                      class="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold shrink-0 transition">✓</button>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        ` : `
          <div class="rounded-3xl bg-card border border-dashed border-zinc-700 p-8 text-center space-y-3 mt-6">
            <div class="text-3xl">🛒</div>
            <p class="text-sm font-medium text-zinc-200">Deine Einkaufsliste ist noch leer</p>
            <p class="text-xs text-zinc-400">Füge unten einen Artikel hinzu oder fülle sie direkt aus deinem Wochenplan bzw. deinen Rezepten.</p>
            <div class="flex justify-center gap-2 pt-1">
              <button type="button" onclick="buildShoppingListFromPlan(7)"
                class="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition">
                📅 Aus Wochenplan
              </button>
              <button type="button" onclick="toggleShoppingImportDrawer()"
                class="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition">
                📖 Rezepte wählen
              </button>
            </div>
          </div>
        `}
      </div>
    </div>

    <!-- Unten angedockte Eingabe- & Aktionsleiste -->
    <footer class="shrink-0 bg-bg/95 backdrop-blur-md border-t border-border px-4 py-3">
      <div class="max-w-3xl mx-auto space-y-2">
        <div id="shopping-suggestions" class="flex flex-wrap gap-1.5"></div>
        <form onsubmit="addManualShoppingItem(event)" class="flex gap-2 min-w-0">
          <input id="shopping-manual-input" type="text" placeholder="Artikel eingeben (z. B. Avocado, Milch, Skyr, 500g Reis…)"
            oninput="renderShoppingSuggestions(this.value)"
            class="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500" />
          <button type="submit" class="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm shrink-0 transition">
            +
          </button>
        </form>
        <div class="flex gap-2 flex-wrap">
          <button type="button" onclick="copyShoppingListToClipboard()"
            class="flex-1 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-border text-zinc-200 font-semibold text-xs transition">
            📋 Kopieren
          </button>
          ${doneItems.length > 0 ? `
            <button type="button" onclick="clearCheckedShoppingItems()"
              class="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 font-semibold text-xs transition">
              Erledigte (${doneItems.length})
            </button>
          ` : ''}
          ${list.length > 0 ? `
            <button type="button" onclick="clearAllShoppingItems()"
              class="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 font-semibold text-xs transition">
              🗑️ Alle löschen
            </button>
          ` : ''}
        </div>
      </div>
    </footer>
  `;

  if (appLang === 'es' && typeof applyI18nToSubtree === 'function') {
    applyI18nToSubtree(overlay, false);
  }
}

function setFoodSubTab(sub) {
  foodSubTab = sub;
  if (sub !== 'recipes') editingRecipe = null;
  render();
}

function renderFoodTab() {
  if (editingRecipe) {
    return renderRecipesTab();
  }
  const openShopCount = ensureShoppingList().filter(it => !it.checked).length;
  return `
    <div class="grid grid-cols-3 gap-2">
      <button onclick="openAiMealModal()" class="px-2.5 py-2.5 rounded-2xl text-xs font-semibold transition flex items-center justify-center gap-1.5 border bg-violet-500/15 hover:bg-violet-500/25 border-violet-500/30 text-violet-300">
        <span>✨</span><span class="truncate">KI-Analyse</span>
      </button>
      <button onclick="openMealPlanModal()" class="px-2.5 py-2.5 rounded-2xl text-xs font-semibold transition flex items-center justify-center gap-1.5 border bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-300">
        <span>📅</span><span class="truncate">Plan</span>
      </button>
      <button onclick="openShoppingListModal()" class="px-2.5 py-2.5 rounded-2xl text-xs font-semibold transition flex items-center justify-center gap-1.5 border bg-sky-500/15 hover:bg-sky-500/25 border-sky-500/30 text-sky-300">
        <span>🛒</span><span class="truncate">Einkauf${openShopCount > 0 ? ` (${openShopCount})` : ''}</span>
      </button>
    </div>
    ${renderSnacksSection()}
    ${renderRecipesTab()}
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
        <input id="global-food-query" type="text" placeholder="Lebensmittel eingeben (z. B. Zwiebeln, Haferflocken, Quark)..."
          oninput="renderFoodSuggestions('global', this.value)"
          onkeydown="if(event.key==='Enter') runGlobalFoodSearch()"
          class="flex-1 px-3.5 py-2.5 rounded-2xl bg-zinc-900 border border-border text-sm text-white focus:outline-none focus:border-emerald-500" />
        <button onclick="runGlobalFoodSearch()" class="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs">
          Suchen
        </button>
      </div>
      <div id="global-food-suggestions" class="flex flex-wrap gap-1.5"></div>
      <div id="global-food-results" class="space-y-2">
        <p class="text-xs text-zinc-500">Gib einen Suchbegriff ein, um Live-Nährwerte pro 100g abzurufen.</p>
      </div>
    </div>
  `;
}

function renderHabitsTab() {
  const days30 = getLastNDays(30);
  const insights = computeHabitInsights();
  const todayLog = ensureDayLog(state.selectedDate);
  const habitCfg = getHabitConfig();
  const enabledRoutines = getEnabledBuiltinRoutines();
  const enabledCustomHabits = getCustomHabits(true);
  const enabledPositiveCustom = enabledCustomHabits.filter(h => h.type !== 'avoid');
  const enabledAvoidCustom = enabledCustomHabits.filter(h => h.type === 'avoid');
  const metricTabs = ensureValidSelectedHeatmapMetric();
  const activeTabObj = metricTabs.find(t => t.id === selectedHeatmapMetric) || null;
  const activeCustomHabit = activeTabObj?.customHabit || null;

  const getCombinedRoutineStatus = (log) => {
    if (!enabledRoutines.length) return null;
    const vals = enabledRoutines.map(r => normalizeRoutineStatus(log?.routines?.[r.id]));
    if (vals.every(v => v === true)) return 'yes';
    if (vals.some(v => v === false)) return 'no';
    if (vals.some(v => v === true)) return 'partial';
    return null;
  };

  const getCountsForMetric = (metricKey) => {
    let clean = 0, consumed = 0, open = 0;
    const isCustom = typeof metricKey === 'string' && metricKey.startsWith('custom:');
    const customHabit = isCustom ? getCustomHabitById(metricKey.slice(7)) : null;

    days30.forEach(d => {
      const log = state.logs[d.dateStr];
      if (customHabit) {
        const val = getCustomHabitValue(log, customHabit);
        if (customHabit.type === 'avoid') {
          if (val === 'clean') clean++;
          else if (val === 'consumed') consumed++;
          else open++;
        } else {
          if (val === true) clean++;
          else if (val === false) consumed++;
          else open++;
        }
      } else if (metricKey === 'sport') {
        const done = log && Array.isArray(log.sportDone) && log.sportDone.length > 0;
        if (done) clean++;
        else open++;
      } else if (metricKey === 'routine') {
        const st = getCombinedRoutineStatus(log);
        if (st === 'yes') clean++;
        else if (st === 'no') consumed++;
        else open++;
      } else if (metricKey === 'creatine' || metricKey === 'skincare' || metricKey === 'sertraline') {
        const val = normalizeRoutineStatus(log?.routines?.[metricKey]);
        if (val === true) clean++;
        else if (val === false) consumed++;
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

  const mainCounts = selectedHeatmapMetric ? getCountsForMetric(selectedHeatmapMetric) : { clean: 0, consumed: 0, open: 0 };

  const weekHeaderLabels = appLang === 'es'
    ? ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    : ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const leadingEmptyDays = days30.length ? (days30[0].weekdayIdx + 6) % 7 : 0;
  const todayIso = getTodayStr();

  const renderHeatmapGrid = (metricKey, compact = false) => {
    const isCustom = typeof metricKey === 'string' && metricKey.startsWith('custom:');
    const customHabit = isCustom ? getCustomHabitById(metricKey.slice(7)) : null;

    return `
    <div class="space-y-1">
      <div class="grid grid-cols-7 gap-1 text-center">
        ${weekHeaderLabels.map((wd, idx) => `
          <div class="text-[10px] font-semibold ${idx >= 5 ? 'text-zinc-400' : 'text-zinc-500'} pb-0.5">${wd}</div>
        `).join('')}
      </div>
      <div class="grid grid-cols-7 gap-1">
        ${Array.from({ length: leadingEmptyDays }).map(() => `<div class="rounded-xl"></div>`).join('')}
        ${days30.map(d => {
          const log = state.logs[d.dateStr];
          let tileStyle = 'bg-amber-400/15 border-amber-400/45 text-amber-300 hover:bg-amber-400/25';
          let statusIcon = '?';
          let clickHandler = '';

          if (customHabit) {
            const val = getCustomHabitValue(log, customHabit);
            if (customHabit.type === 'avoid') {
              if (val === 'clean') {
                tileStyle = 'bg-emerald-500/20 border-emerald-500/55 text-emerald-300 hover:bg-emerald-500/30';
                statusIcon = '✕';
              } else if (val === 'consumed') {
                tileStyle = 'bg-rose-500/25 border-rose-500/60 text-rose-300 hover:bg-rose-500/35';
                statusIcon = '✓';
              }
            } else {
              if (val === true) {
                tileStyle = 'bg-emerald-500/20 border-emerald-500/55 text-emerald-300 hover:bg-emerald-500/30';
                statusIcon = '✓';
              } else if (val === false) {
                tileStyle = 'bg-rose-500/25 border-rose-500/60 text-rose-300 hover:bg-rose-500/35';
                statusIcon = '✕';
              }
            }
            clickHandler = `cycleCustomHabitDay('${customHabit.id}', '${d.dateStr}')`;
          } else if (metricKey === 'sport') {
            const done = log && Array.isArray(log.sportDone) && log.sportDone.length > 0;
            tileStyle = done
              ? 'bg-emerald-500/20 border-emerald-500/55 text-emerald-300 hover:bg-emerald-500/30'
              : 'bg-amber-400/15 border-amber-400/40 text-amber-300 hover:bg-amber-400/25';
            statusIcon = done ? '✓' : '?';
            clickHandler = `toggleHeatmapSportDay('${d.dateStr}')`;
          } else if (metricKey === 'routine') {
            const st = getCombinedRoutineStatus(log);
            if (st === 'yes') {
              tileStyle = 'bg-emerald-500/20 border-emerald-500/55 text-emerald-300 hover:bg-emerald-500/30';
              statusIcon = '✓';
            } else if (st === 'no') {
              tileStyle = 'bg-rose-500/25 border-rose-500/60 text-rose-300 hover:bg-rose-500/35';
              statusIcon = '✕';
            } else if (st === 'partial') {
              tileStyle = 'bg-amber-400/20 border-amber-400/50 text-amber-300 hover:bg-amber-400/30';
              statusIcon = '½';
            }
            clickHandler = `toggleHeatmapRoutineDay('routine', '${d.dateStr}')`;
          } else if (metricKey === 'creatine' || metricKey === 'skincare' || metricKey === 'sertraline') {
            const val = normalizeRoutineStatus(log?.routines?.[metricKey]);
            if (val === true) {
              tileStyle = 'bg-emerald-500/20 border-emerald-500/55 text-emerald-300 hover:bg-emerald-500/30';
              statusIcon = '✓';
            } else if (val === false) {
              tileStyle = 'bg-rose-500/25 border-rose-500/60 text-rose-300 hover:bg-rose-500/35';
              statusIcon = '✕';
            }
            clickHandler = `toggleHeatmapRoutineDay('${metricKey}', '${d.dateStr}')`;
          } else if (metricKey === 'nicotine') {
            const st = getCombinedNicotineStatus(log);
            if (st === 'clean') {
              tileStyle = 'bg-emerald-500/20 border-emerald-500/55 text-emerald-300 hover:bg-emerald-500/30';
              statusIcon = '✕';
            } else if (st === 'consumed') {
              tileStyle = 'bg-rose-500/25 border-rose-500/60 text-rose-300 hover:bg-rose-500/35';
              statusIcon = '✓';
            }
            clickHandler = `cycleCombinedNicotineDay('${d.dateStr}')`;
          } else {
            const st = log && log.badHabits ? normalizeHabitStatus(log.badHabits[metricKey]) : null;
            if (st === 'clean') {
              tileStyle = 'bg-emerald-500/20 border-emerald-500/55 text-emerald-300 hover:bg-emerald-500/30';
              statusIcon = '✕';
            } else if (st === 'consumed') {
              tileStyle = 'bg-rose-500/25 border-rose-500/60 text-rose-300 hover:bg-rose-500/35';
              statusIcon = '✓';
            }
            clickHandler = `cycleBadHabitDay('${metricKey}', '${d.dateStr}')`;
          }

          const isToday = d.dateStr === todayIso;
          return `
            <button onclick="${clickHandler}"
              title="${isToday ? 'Heute · ' : ''}${d.weekdayShort}, ${d.dayNum}.${d.monthNum}."
              class="relative ${compact ? 'py-1 px-0.5' : 'py-1.5 px-0.5'} rounded-xl border text-center transition ${tileStyle} ${isToday ? 'ring-2 ring-sky-400 ring-offset-1 ring-offset-zinc-950 shadow-[0_0_12px_rgba(56,189,248,0.45)] z-10' : ''}">
              ${isToday ? '<span class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-sky-400 ring-2 ring-zinc-950"></span>' : ''}
              <div class="text-[9px] leading-none ${isToday ? 'font-bold text-white' : 'opacity-80'}">${isToday ? 'Heute' : `${d.dayNum}.${d.monthNum}`}</div>
              <div class="text-xs font-bold mt-1 leading-none">${statusIcon}</div>
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `;
  };

  const cigCounts = getCountsForMetric('cigarettes');
  const vapeCounts = getCountsForMetric('vape');

  const renderLegend = () => {
    if (selectedHeatmapMetric === 'routine' || (activeCustomHabit && activeCustomHabit.type !== 'avoid')) {
      return `
        <span class="flex items-center gap-1 text-emerald-300"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Ja</span>
        <span class="flex items-center gap-1 text-rose-300"><span class="w-2 h-2 rounded-full bg-rose-500"></span> Nein</span>
        <span class="flex items-center gap-1 text-amber-300"><span class="w-2 h-2 rounded-full bg-amber-400"></span> Nicht erfasst</span>
      `;
    }
    if (selectedHeatmapMetric === 'sport') {
      return `
        <span class="flex items-center gap-1 text-emerald-300"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Absolviert</span>
        <span class="flex items-center gap-1 text-amber-300"><span class="w-2 h-2 rounded-full bg-amber-400"></span> Nicht erfasst</span>
      `;
    }
    return `
      <span class="flex items-center gap-1 text-emerald-300"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Clean</span>
      <span class="flex items-center gap-1 text-rose-300"><span class="w-2 h-2 rounded-full bg-rose-500"></span> Konsumiert</span>
      <span class="flex items-center gap-1 text-amber-300"><span class="w-2 h-2 rounded-full bg-amber-400"></span> Nicht erfasst</span>
    `;
  };

  const renderPositiveCardButton = (onClickJs, title, val, streak) => {
    let cardStyle = 'bg-zinc-900 border-border text-zinc-300 hover:bg-zinc-800/80';
    let subText = 'Nicht erfasst';
    let subStyle = 'text-amber-300/80';
    let badgeStyle = 'bg-amber-400/15 border-amber-400/40 text-amber-300';
    let badgeIcon = '?';

    if (val === true) {
      cardStyle = 'bg-emerald-500/15 border-emerald-500/45 text-white';
      subText = streak > 0 ? `Ja · ${streak}d Streak` : 'Ja';
      subStyle = 'text-emerald-400';
      badgeStyle = 'bg-emerald-500 text-zinc-950 border-emerald-400';
      badgeIcon = '✓';
    } else if (val === false) {
      cardStyle = 'bg-rose-500/15 border-rose-500/45 text-white';
      subText = 'Nein';
      subStyle = 'text-rose-400';
      badgeStyle = 'bg-rose-500 text-white border-rose-400';
      badgeIcon = '✕';
    }

    return `
      <button onclick="${onClickJs}"
        class="p-3 rounded-2xl border text-left transition flex items-center justify-between gap-2 ${cardStyle}">
        <div class="min-w-0">
          <div class="text-xs font-semibold truncate">${title}</div>
          <div class="text-[11px] mt-0.5 ${subStyle}">${subText}</div>
        </div>
        <div class="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border text-xs font-bold ${badgeStyle}">
          ${badgeIcon}
        </div>
      </button>
    `;
  };

  const totalDailyBasicsCount = enabledRoutines.length + enabledPositiveCustom.length;
  const doneDailyBasicsCount =
    enabledRoutines.filter(r => todayLog.routines[r.id] === true).length +
    enabledPositiveCustom.filter(h => getCustomHabitValue(todayLog, h) === true).length;

  const avoidSummaryCards = [];
  if (habitCfg.categories.alcohol !== false) {
    avoidSummaryCards.push(`
      <div class="bg-zinc-900 border border-border rounded-2xl p-3">
        <div class="text-[11px] text-zinc-400">🍷 Alkohol</div>
        <div class="text-base font-bold text-emerald-400 mt-0.5">${calcCleanStreak('alcohol')}d clean</div>
      </div>
    `);
  }
  if (habitCfg.categories.nicotine !== false) {
    avoidSummaryCards.push(`
      <div class="bg-zinc-900 border border-border rounded-2xl p-3">
        <div class="text-[11px] text-zinc-400">💨 Nikotin (Gesamt)</div>
        <div class="text-base font-bold text-emerald-400 mt-0.5">${calcCleanStreak('nicotine')}d clean</div>
        <div class="text-[10px] text-zinc-500 mt-0.5">Zigaretten: ${calcCleanStreak('cigarettes')}d · Vape: ${calcCleanStreak('vape')}d</div>
      </div>
    `);
  }
  enabledAvoidCustom.forEach(h => {
    avoidSummaryCards.push(`
      <div class="bg-zinc-900 border border-border rounded-2xl p-3">
        <div class="text-[11px] text-zinc-400 truncate">${escapeHtmlAttr(h.icon)} ${escapeHtmlAttr(h.name)}</div>
        <div class="text-base font-bold text-emerald-400 mt-0.5">${getCustomHabitStreak(h.id)}d clean</div>
      </div>
    `);
  });

  const isPositiveMetric = selectedHeatmapMetric === 'routine' || (activeCustomHabit && activeCustomHabit.type !== 'avoid');

  return `
    <div class="space-y-4">
      <div id="sec-heatmap" class="bg-card border border-border rounded-3xl p-4 space-y-3.5">
        <div class="flex items-start justify-between gap-2">
          <div>
            <h2 class="text-sm font-semibold text-white">30-Tage-Heatmap</h2>
            <p class="text-[11px] text-zinc-400">Tippe auf einen Tag zum Umschalten (Grün / Rot / Gelb)</p>
          </div>
          <div class="flex flex-col items-end gap-1 shrink-0">
            <button onclick="openHabitCustomizerModal()"
              class="px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-border text-[11px] font-medium text-zinc-200 transition">
              ⚙️ Anpassen
            </button>
            ${selectedHeatmapMetric ? `
              <div class="text-right text-[11px] text-zinc-400">
                ${selectedHeatmapMetric === 'sport'
                  ? `<span class="text-emerald-400 font-semibold">${mainCounts.clean}</span>/30 aktiv`
                  : isPositiveMetric
                    ? `<span class="text-emerald-400 font-semibold">${mainCounts.clean}</span> ja · <span class="text-rose-400 font-semibold">${mainCounts.consumed}</span> nein · <span class="text-amber-300 font-semibold">${mainCounts.open}</span> offen`
                    : `<span class="text-emerald-400 font-semibold">${mainCounts.clean}</span> clean · <span class="text-rose-400 font-semibold">${mainCounts.consumed}</span> kons. · <span class="text-amber-300 font-semibold">${mainCounts.open}</span> offen`
                }
              </div>
            ` : ''}
          </div>
        </div>

        ${metricTabs.length > 0 ? `
          <div class="${metricTabs.length <= 4 ? `grid grid-cols-${Math.max(1, metricTabs.length)} gap-1.5` : 'flex flex-wrap gap-1.5'}">
            ${metricTabs.map(t => `
              <button onclick="setHeatmapMetric('${t.id}')"
                class="py-2 px-2.5 rounded-xl text-xs font-medium border transition truncate ${
                  selectedHeatmapMetric === t.id
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-zinc-900 border-border text-zinc-400 hover:text-zinc-200'
                }">
                ${escapeHtmlAttr(t.label)}
              </button>
            `).join('')}
          </div>
        ` : `
          <div class="border border-dashed border-zinc-700 rounded-2xl p-5 text-center space-y-2.5">
            <p class="text-xs text-zinc-400">Aktuell sind keine Habit-Karten aktiviert.</p>
            <button onclick="openHabitCustomizerModal()"
              class="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition">
              ⚙️ Habits auswählen oder erstellen
            </button>
          </div>
        `}

        ${selectedHeatmapMetric === 'alcohol' ? `
          <div class="border border-border rounded-2xl p-3 bg-zinc-950/60 space-y-2.5">
            <div class="flex items-center justify-between text-xs">
              <span class="font-semibold text-zinc-200">🍷 Alkohol</span>
              <span class="text-[11px] text-zinc-400">
                <span class="text-emerald-400 font-semibold">${mainCounts.clean}</span> clean ·
                <span class="text-rose-400 font-semibold">${mainCounts.consumed}</span> kons. ·
                <span class="text-amber-300 font-semibold">${mainCounts.open}</span> offen
              </span>
            </div>
            ${renderHeatmapGrid('alcohol', false)}
          </div>
        ` : ''}

        ${selectedHeatmapMetric === 'nicotine' ? `
          <div class="border border-border rounded-2xl p-3 bg-zinc-950/60 space-y-3.5">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">💨 Nikotin (30 Tage)</span>
              <span class="text-[11px] text-zinc-400">
                Gesamt: <span class="text-emerald-400 font-semibold">${mainCounts.clean}</span> clean ·
                <span class="text-rose-400 font-semibold">${mainCounts.consumed}</span> kons.
              </span>
            </div>

            <div class="space-y-1.5">
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

            <div class="space-y-1.5 pt-2 border-t border-zinc-900">
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

        ${selectedHeatmapMetric === 'sport' ? `
          <div class="border border-border rounded-2xl p-3 bg-zinc-950/60 space-y-2.5">
            <div class="flex items-center justify-between text-xs">
              <span class="font-semibold text-zinc-200">⚡ Sport</span>
              <span class="text-[11px] text-zinc-400">
                <span class="text-emerald-400 font-semibold">${mainCounts.clean}</span>/30 aktiv
              </span>
            </div>
            ${renderHeatmapGrid('sport', false)}
          </div>
        ` : ''}

        ${selectedHeatmapMetric === 'routine' && enabledRoutines.length > 0 ? `
          <div class="border border-border rounded-2xl p-3 bg-zinc-950/60 space-y-3.5">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">✨ Routine & Supplements (30 Tage)</span>
              <span class="text-[11px] text-zinc-400">
                Komplett: <span class="text-emerald-400 font-semibold">${mainCounts.clean}</span>/30
              </span>
            </div>

            ${enabledRoutines.map((r, idx) => {
              const rCounts = getCountsForMetric(r.id);
              const rStreak = getRoutineStreak(r.id);
              return `
                <div class="space-y-1.5 ${idx > 0 ? 'pt-2 border-t border-zinc-900' : ''}">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-medium text-zinc-200">${r.icon} ${r.name}</span>
                    <span class="text-[11px] text-zinc-400">
                      <span class="text-emerald-400 font-semibold">${rCounts.clean}</span> ja ·
                      <span class="text-rose-400 font-semibold">${rCounts.consumed}</span> nein ·
                      <span class="text-amber-300 font-semibold">${rCounts.open}</span> offen · ${rStreak}d Streak
                    </span>
                  </div>
                  ${renderHeatmapGrid(r.id, true)}
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}

        ${activeCustomHabit ? `
          <div class="border border-border rounded-2xl p-3 bg-zinc-950/60 space-y-2.5">
            <div class="flex items-center justify-between text-xs gap-2">
              <span class="font-semibold text-zinc-200 truncate">${escapeHtmlAttr(activeCustomHabit.icon)} ${escapeHtmlAttr(activeCustomHabit.name)}</span>
              <span class="text-[11px] text-zinc-400 shrink-0">
                ${activeCustomHabit.type === 'avoid'
                  ? `<span class="text-emerald-400 font-semibold">${mainCounts.clean}</span> clean · <span class="text-rose-400 font-semibold">${mainCounts.consumed}</span> kons. · ${getCustomHabitStreak(activeCustomHabit.id)}d clean`
                  : `<span class="text-emerald-400 font-semibold">${mainCounts.clean}</span> ja · <span class="text-rose-400 font-semibold">${mainCounts.consumed}</span> nein · ${getCustomHabitStreak(activeCustomHabit.id)}d Streak`
                }
              </span>
            </div>
            ${renderHeatmapGrid(`custom:${activeCustomHabit.id}`, false)}
          </div>
        ` : ''}

        ${selectedHeatmapMetric ? `
          <div class="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border text-[11px] text-zinc-400">
            <div class="flex items-center gap-3">
              ${renderLegend()}
            </div>
            <span>Letzte 30 Tage</span>
          </div>
        ` : ''}
      </div>

      ${totalDailyBasicsCount > 0 ? `
        <div id="sec-routines" class="bg-card border border-border rounded-3xl p-4 space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-sm font-semibold text-white">Routine & Tägliche Habits</h2>
              <p class="text-[11px] text-zinc-400">Tägliche Basics für ${state.selectedDate}</p>
            </div>
            <span class="text-[11px] text-zinc-400">
              ${doneDailyBasicsCount}/${totalDailyBasicsCount} erledigt
            </span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            ${enabledRoutines.map(r => renderPositiveCardButton(`toggleRoutine('${r.id}')`, `${r.icon} ${r.name}`, todayLog.routines[r.id], getRoutineStreak(r.id))).join('')}
            ${enabledPositiveCustom.map(h => renderPositiveCardButton(`cycleCustomHabitDay('${h.id}', '${state.selectedDate}')`, `${escapeHtmlAttr(h.icon)} ${escapeHtmlAttr(h.name)}`, getCustomHabitValue(todayLog, h), getCustomHabitStreak(h.id))).join('')}
          </div>
        </div>
      ` : ''}

      <div id="sec-insights" class="bg-card border border-border rounded-3xl p-4 space-y-3">
        <div>
          <h2 class="text-sm font-semibold text-white">Habit-Korrelations-Insights</h2>
          <p class="text-[11px] text-zinc-400">Live-Muster aus Workouts, Makros, Körperwerten & Routinen (30T)</p>
        </div>
        <div class="space-y-2.5">
          ${insights.map(ins => {
            const toneClass = ins.badgeTone === 'emerald'
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : (ins.badgeTone === 'amber'
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : (ins.badgeTone === 'rose'
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'));
            return `
              <div class="bg-zinc-900/90 border border-border rounded-2xl p-3 flex items-start gap-3">
                <div class="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-base shrink-0">
                  ${ins.icon}
                </div>
                <div class="flex-1 min-w-0 space-y-0.5">
                  <div class="flex items-center justify-between gap-2">
                    <div class="text-xs font-semibold text-white truncate">${ins.title}</div>
                    ${ins.badge ? `<span class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${toneClass}">${ins.badge}</span>` : ''}
                  </div>
                  <p class="text-xs text-zinc-300 leading-relaxed">${ins.text}</p>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      ${avoidSummaryCards.length > 0 ? `
        <div id="sec-konsum" class="bg-card border border-border rounded-3xl p-4 space-y-3">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-sm font-semibold text-white">Konsum & Verzicht Übersicht</h2>
            <button onclick="openHabitCustomizerModal()" class="text-[11px] text-zinc-400 hover:text-zinc-200 transition">⚙️ Anpassen</button>
          </div>
          <div class="grid grid-cols-2 gap-2.5 text-center pt-1">
            ${avoidSummaryCards.join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// ---------- RECIPE BUILDER ACTIONS ----------
function cleanIngredientTitleWord(raw) {
  let s = String(raw || '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\b(roh|gekocht|gebraten|frisch|zart|kernig|ungesüßt|natur|mager|raw|cooked|plain|fresh)\b/gi, '')
    .replace(/\d+\s*(%|g|ml|kcal)\b/gi, '')
    .split(',')[0]
    .split(' - ')[0]
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function suggestRecipeNames(items) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const minorRx = /\b(öl|olivenöl|rapsöl|kokosöl|oil|aceite|salz|pfeffer|gewürz|zimt|knoblauch|ajo|wasser|zucker|honig|süßstoff|essig|sojasauce|senf|backpulver)\b/i;
  const cleaned = items
    .map(it => ({
      label: cleanIngredientTitleWord(it.name),
      grams: Number(it.grams) || 0,
      p100: Number(it.p100) || 0,
      minor: minorRx.test(String(it.name || '')) || (Number(it.grams) || 0) <= 15
    }))
    .filter(x => x.label.length >= 2);

  if (!cleaned.length) return [];
  const pool = cleaned.some(x => !x.minor) ? cleaned.filter(x => !x.minor) : cleaned;
  pool.sort((a, b) => (b.grams * (1 + b.p100 / 30)) - (a.grams * (1 + a.p100 / 30)));

  const uniq = [];
  pool.forEach(x => {
    if (!uniq.some(u => u.toLowerCase() === x.label.toLowerCase())) uniq.push(x.label);
  });
  if (!uniq.length) return [];

  const isEs = appLang === 'es';
  const a = uniq[0];
  const b = uniq[1] || '';
  const c = uniq[2] || '';
  const joinedAll = uniq.join(' ').toLowerCase();
  const out = [];

  if (uniq.length === 1) {
    out.push(a);
  } else {
    if (/hafer|flocken|müsli|porridge|avena/.test(joinedAll)) {
      const oat = uniq.find(x => /hafer|flocken|müsli|porridge|avena/i.test(x)) || a;
      const other = uniq.find(x => x !== oat) || b;
      out.push(isEs ? `Porridge con ${other}` : `Porridge mit ${other}`);
      out.push(`${oat}-${other}-Bowl`);
    } else if (/reis|quinoa|couscous|bulgur|arroz/.test(joinedAll)) {
      const base = uniq.find(x => /reis|quinoa|couscous|bulgur|arroz/i.test(x)) || b;
      const main = uniq.find(x => x !== base) || a;
      out.push(isEs ? `Bowl de ${main} y ${base}` : `${main}-${base}-Bowl`);
      out.push(isEs ? `${main} con ${base}` : `${main} mit ${base}`);
    } else if (/quark|skyr|joghurt|yogur|hüttenkäse|frischkäse|queso fresco/.test(joinedAll)) {
      const dairy = uniq.find(x => /quark|skyr|joghurt|yogur|hüttenkäse|frischkäse|queso fresco/i.test(x)) || a;
      const other = uniq.find(x => x !== dairy) || b;
      out.push(isEs ? `Bowl de ${dairy} con ${other}` : `${dairy}-Bowl mit ${other}`);
      out.push(`${dairy} & ${other}`);
    } else if (/nudel|pasta|spaghetti|penne/.test(joinedAll)) {
      const pasta = uniq.find(x => /nudel|pasta|spaghetti|penne/i.test(x)) || a;
      const other = uniq.find(x => x !== pasta) || b;
      out.push(isEs ? `${pasta} con ${other}` : `${pasta} mit ${other}`);
    }

    out.push(isEs ? `${a} con ${b}` : `${a} mit ${b}`);
    out.push(`${a} & ${b}`);
    if (c) out.push(`${a}, ${b} & ${c}`);
  }

  return [...new Set(out)].slice(0, 3);
}

function maybeAutoUpdateRecipeName() {
  if (!editingRecipe) return;
  const cur = String(editingRecipe.name || '').trim();
  const isDefault = !cur || cur === 'Neues Rezept' || cur === 'Nueva receta';
  if (!isDefault && !editingRecipe._autoNamed) return;
  const sugs = suggestRecipeNames(editingRecipe.items);
  if (sugs.length > 0) {
    editingRecipe.name = sugs[0];
    editingRecipe._autoNamed = true;
  } else if (editingRecipe._autoNamed) {
    editingRecipe.name = appLang === 'es' ? 'Nueva receta' : 'Neues Rezept';
  }
}

function applySuggestedRecipeName(name) {
  if (!editingRecipe || !name) return;
  editingRecipe.name = name;
  editingRecipe._autoNamed = false;
  render();
}

function startNewRecipe() {
  editingRecipe = { id: 'rec_' + Date.now(), name: appLang === 'es' ? 'Nueva receta' : 'Neues Rezept', items: [], _autoNamed: true };
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

function confirmRecipeItemGrams(idx) {
  const inp = document.getElementById(`rec-ing-grams-${idx}`);
  if (!inp) return;
  updateRecipeItemGrams(idx, inp.value);
  showToast('✓ Menge übernommen');
}

function removeRecipeItem(idx) {
  if (!editingRecipe) return;
  editingRecipe.items.splice(idx, 1);
  maybeAutoUpdateRecipeName();
  render();
}

function renderBuilderSearchResults(items, isLoadingMore = false) {
  const box = document.getElementById('builder-search-results');
  if (!box) return;
  if (!items || !items.length) {
    box.innerHTML = isLoadingMore
      ? `<div class="text-[11px] text-zinc-400 py-1.5">⏳ Suche passende Zutaten…</div>`
      : `<div class="text-xs text-zinc-500 py-2">Keine Treffer gefunden.</div>`;
    return;
  }
  box.innerHTML = items.map((it, idx) => {
    const defG = it.defaultGrams || suggestDefaultGrams(it.name);
    return `
      <button type="button" onclick="addCachedFoodToRecipe(${idx})"
        class="w-full text-left flex items-center justify-between bg-zinc-900/90 hover:bg-zinc-800/90 border border-border hover:border-emerald-500/40 rounded-xl px-3 py-2.5 text-xs gap-2 transition">
        <div class="min-w-0 flex-1">
          <div class="font-medium text-zinc-200 truncate">${escapeHtmlAttr(it.name)}</div>
          <div class="text-[10px] text-zinc-400">${it.kcal100} kcal/100g · P ${it.p100}g · ${escapeHtmlAttr(it.source || '')}</div>
        </div>
        <span class="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 shrink-0 font-semibold">
          + ${defG}g
        </span>
      </button>
    `;
  }).join('') + (isLoadingMore ? `<div class="text-[10px] text-zinc-500 text-center py-1">⏳ Lade weitere Online-Treffer…</div>` : '');
}

async function runBuilderSearch(isAuto = false) {
  const inp = document.getElementById('builder-search-input');
  const box = document.getElementById('builder-search-results');
  if (!inp || !box) return;
  if (liveSearchTimers.builder) {
    clearTimeout(liveSearchTimers.builder);
    liveSearchTimers.builder = null;
  }
  const q = inp.value.trim();
  if (q.length < 2) {
    box.innerHTML = isAuto ? '' : `<div class="text-xs text-zinc-500 py-1.5">Bitte mindestens 2 Zeichen eingeben.</div>`;
    return;
  }

  const seq = (liveSearchSeq.builder || 0) + 1;
  liveSearchSeq.builder = seq;
  if (liveSearchControllers.builder) {
    try { liveSearchControllers.builder.abort(); } catch (e) {}
  }
  const controller = new AbortController();
  liveSearchControllers.builder = controller;

  const localHits = getLocalFoodMatches(q);
  if (localHits.length) {
    searchResultsCache = localHits;
    renderBuilderSearchResults(localHits, true);
  } else {
    box.innerHTML = `<div class="text-[11px] text-zinc-400 py-1.5">⏳ Suche läuft…</div>`;
  }

  const items = await searchFoodsLive(q, controller.signal);
  if (seq !== liveSearchSeq.builder || items === null) return;
  if (liveSearchControllers.builder === controller) liveSearchControllers.builder = null;
  renderBuilderSearchResults(items, false);
}

function addCachedFoodToRecipe(idx) {
  const food = searchResultsCache[idx];
  if (!food || !editingRecipe) return;
  const grams = food.defaultGrams || suggestDefaultGrams(food.name);
  editingRecipe.items.push({
    id: 'it_' + Date.now(),
    name: food.name,
    grams,
    kcal100: food.kcal100,
    p100: food.p100,
    c100: food.c100,
    f100: food.f100
  });
  maybeAutoUpdateRecipeName();
  render();
}

function saveEditedRecipe(asCopy) {
  if (!editingRecipe) return;
  if (!Array.isArray(editingRecipe.items) || editingRecipe.items.length === 0) {
    const errBox = document.getElementById('rec-validation-error');
    if (errBox) {
      errBox.textContent = appLang === 'es'
        ? '⚠️ No has introducido ningún ingrediente. Añade al menos un ingrediente antes de guardar.'
        : '⚠️ Du hast noch keine Zutaten eingegeben. Bitte füge mindestens eine Zutat hinzu.';
      errBox.classList.remove('hidden');
    }
    showToast(appLang === 'es' ? '⚠️ No has introducido ingredientes' : '⚠️ Keine Zutaten eingegeben');
    document.getElementById('builder-search-input')?.focus();
    return;
  }
  const cleanRec = { ...editingRecipe };
  delete cleanRec._autoNamed;
  cleanRec.name = String(cleanRec.name || '').trim() || suggestRecipeNames(cleanRec.items)[0] || 'Rezept';
  if (asCopy) {
    cleanRec.id = 'rec_' + Date.now();
    cleanRec.name = cleanRec.name + (appLang === 'es' ? ' (Copia)' : ' (Kopie)');
    state.recipes.push(cleanRec);
  } else {
    const idx = state.recipes.findIndex(r => r.id === cleanRec.id);
    if (idx >= 0) state.recipes[idx] = cleanRec;
    else state.recipes.push(cleanRec);
  }
  saveState();
  editingRecipe = null;
  render();
}

function deleteRecipeById(id) {
  const rec = state.recipes.find(r => r.id === id);
  if (!rec) return;
  if (!confirm(`Rezept "${rec.name}" wirklich löschen?`)) return;
  state.recipes = state.recipes.filter(r => r.id !== id);
  markDeletedId(id);
  saveState();
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
  box.innerHTML = items.map((it, idx) => {
    const defG = it.defaultGrams || suggestDefaultGrams(it.name);
    return `
    <div class="flex items-center justify-between bg-zinc-900 border border-border rounded-2xl p-3 text-xs gap-2">
      <div class="min-w-0 flex-1">
        <div class="font-medium text-white truncate">${it.name}</div>
        <div class="text-[11px] text-zinc-400 mt-0.5">${it.kcal100} kcal/100g · P ${it.p100}g · C ${it.c100}g · F ${it.f100}g · <span class="text-emerald-400">${it.source}</span></div>
      </div>
      <button onclick="logCachedFoodToday(${idx})" class="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/35 shrink-0 font-semibold">
        + ${defG}g
      </button>
    </div>
  `;
  }).join('');
}

function logCachedFoodToday(idx) {
  const food = searchResultsCache[idx];
  if (!food) return;
  const g = food.defaultGrams || suggestDefaultGrams(food.name);
  const f = g / 100;
  const log = ensureDayLog(state.selectedDate);
  log.entries.push({
    id: 'ent_' + Date.now(),
    name: `${food.name} (${g}g)`,
    kcal: Math.round(food.kcal100 * f),
    p: Math.round(food.p100 * f * 10) / 10,
    c: Math.round(food.c100 * f * 10) / 10,
    f: Math.round(food.f100 * f * 10) / 10
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

function startSportHabitEdit(id) {
  editingSportId = id;
  render();
  const el = document.getElementById('edit-sport-name');
  if (el) { el.focus(); el.select(); }
}

function cancelSportHabitEdit() {
  editingSportId = null;
  render();
}

function saveSportHabitEdit(id) {
  const el = document.getElementById('edit-sport-name');
  const name = el ? el.value.trim() : '';
  const sp = state.sportHabits.find(s => s.id === id);
  if (sp && name) sp.name = name;
  editingSportId = null;
  saveState();
  render();
}

function deleteSportHabit(id) {
  state.sportHabits = state.sportHabits.filter(s => s.id !== id);
  markDeletedId(id);
  saveState();
  render();
}

// ---------- FITDAYS CSV IMPORT ----------
function parseFitdaysDateTime(raw) {
  if (!raw) return null;
  if (raw instanceof Date && !isNaN(raw)) {
    const d = formatDateStr(raw);
    const t = `${String(raw.getHours()).padStart(2, '0')}:${String(raw.getMinutes()).padStart(2, '0')}`;
    return { dateStr: d, timeStr: t };
  }
  const str = String(raw).trim();
  const months = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };
  // z. B. "07:30 Jan.28,2022" oder "18:23 Nov.27,2026"
  const m = str.match(/(?:(\d{1,2}:\d{2})\s+)?([A-Za-z]{3})\.(\d{1,2}),\s*(\d{4})/);
  if (m) {
    const mon = months[m[2].toLowerCase()];
    if (mon) {
      const timeStr = m[1] ? m[1].padStart(5, '0') : '12:00';
      return {
        dateStr: `${m[4]}-${mon}-${String(m[3]).padStart(2, '0')}`,
        timeStr
      };
    }
  }
  // ISO-Fallback YYYY-MM-DD (optional mit Uhrzeit)
  const iso = str.match(/(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}:\d{2}))?/);
  if (iso) {
    return {
      dateStr: `${iso[1]}-${iso[2]}-${iso[3]}`,
      timeStr: iso[4] || '12:00'
    };
  }
  return null;
}

function parseFitdaysNum(val) {
  if (val === null || val === undefined) return null;
  const cleaned = String(val).replace(',', '.').replace(/[^0-9.\-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

async function importFitdaysCsv(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;

  try {
    if (typeof XLSX === 'undefined') {
      alert('Excel-Parser wird noch geladen – bitte Seite kurz neu laden.');
      return;
    }

    const buf = await file.arrayBuffer();
    const workbook = XLSX.read(buf, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows.length) {
      alert('Keine Daten in der FitDays-Datei gefunden.');
      return;
    }

    const readMetricVal = (row, cols, decimals) => {
      for (const col of cols) {
        if (row[col] !== undefined && row[col] !== '') {
          const parsed = parseFitdaysNum(row[col]);
          if (parsed !== null && !Number.isNaN(parsed)) {
            const factor = Math.pow(10, decimals);
            return Math.round(parsed * factor) / factor;
          }
        }
      }
      return null;
    };

    // Pro Datum nach Uhrzeit sortieren: früheste Messung des Tages (nüchtern) gewinnt
    const byDate = {};
    rows.forEach(r => {
      const dt = parseFitdaysDateTime(r['Date'] || r['Datum']);
      const weight = parseFitdaysNum(r['Weight'] || r['Gewicht']);
      if (!dt || !weight || weight <= 0) return;

      const existing = byDate[dt.dateStr];
      if (!existing || dt.timeStr < existing.timeStr) {
        const entry = {
          date: dt.dateStr,
          timeStr: dt.timeStr
        };
        FITDAYS_METRICS.forEach(m => {
          entry[m.key] = readMetricVal(r, m.cols, m.decimals);
        });
        byDate[dt.dateStr] = entry;
      }
    });

    const importedDates = Object.keys(byDate);
    if (!importedDates.length) {
      alert('Keine gültigen Gewichtseinträge erkannt.');
      return;
    }

    const mergedMap = {};
    (state.weightHistory || []).forEach(entry => {
      mergedMap[entry.date] = entry;
    });

    let addedCount = 0;
    let updatedCount = 0;

    importedDates.forEach(d => {
      const next = byDate[d];
      if (mergedMap[d]) updatedCount++;
      else addedCount++;

      // FitDays-CSV überschreibt bestehende (z. B. manuelle) Einträge dieses Datums vollständig
      const authoritativeEntry = {
        date: d,
        timeStr: next.timeStr || '08:00',
        source: 'fitdays'
      };
      FITDAYS_METRICS.forEach(m => {
        authoritativeEntry[m.key] = (next[m.key] !== null && next[m.key] !== undefined) ? next[m.key] : null;
      });
      mergedMap[d] = authoritativeEntry;
    });

    state.weightHistory = Object.values(mergedMap).sort((a, b) => a.date.localeCompare(b.date));
    saveState();
    closeModal();
    render();
    alert(`✅ FitDays-Import abgeschlossen: ${addedCount} neu, ${updatedCount} aktualisiert (gesamt: ${state.weightHistory.length} Tage).`);
  } catch (err) {
    console.error('FitDays Import Fehler:', err);
    alert('Fehler beim Lesen der FitDays-Datei: ' + (err.message || err));
  } finally {
    if (event?.target) event.target.value = '';
  }
}
const importFitDaysCsv = importFitdaysCsv;

// ---------- MODALS ----------
function openModal(html) {
  const box = document.getElementById('modal-box');
  box.innerHTML = html;
  if (appLang === 'es' && typeof applyI18nToSubtree === 'function') {
    applyI18nToSubtree(box, false);
  }
  document.getElementById('modal-backdrop').classList.remove('hidden');
}

function closeModal() {
  if (typeof stopVoiceRecipeStreamOnly === 'function') stopVoiceRecipeStreamOnly();
  if (typeof stopVoiceQuickLogStreamOnly === 'function') stopVoiceQuickLogStreamOnly();
  if (typeof stopMealPlanVoiceStreamOnly === 'function') stopMealPlanVoiceStreamOnly();
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
  const sortedW = [...state.weightHistory].sort((a, b) => a.date.localeCompare(b.date));
  const last = sortedW[sortedW.length - 1] || { weight: 74.0, bodyFat: '', muscle: '', bioAge: '' };
  const existingToday = state.weightHistory.find(w => w.date === state.selectedDate);
  const prefill = existingToday || last;

  openModal(`
    <form onsubmit="event.preventDefault(); saveWeightEntry();" class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-white">Körperwerte eintragen</h3>
        <button type="button" onclick="closeModal()" class="text-zinc-400 hover:text-white">✕</button>
      </div>
      <div>
        <label class="text-[11px] text-zinc-400">Datum der Messung</label>
        <input id="w-date" type="date" value="${state.selectedDate}" required
          class="w-full mt-1 px-3 py-2 rounded-xl bg-zinc-900 border border-border text-sm text-white focus:outline-none focus:border-emerald-500" />
      </div>
      <div class="grid grid-cols-2 gap-2.5">
        <div>
          <label class="text-[11px] text-zinc-400">Gewicht (kg)</label>
          <input id="w-val" type="number" step="0.1" value="${prefill.weight || 74.0}" required
            class="w-full mt-1 px-3 py-2 rounded-xl bg-zinc-900 border border-border text-sm text-white focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label class="text-[11px] text-zinc-400">Körperfett (%)</label>
          <input id="w-bf" type="number" step="0.1" value="${existingToday?.bodyFat || ''}" placeholder="${last.bodyFat || '15.9'}"
            class="w-full mt-1 px-3 py-2 rounded-xl bg-zinc-900 border border-border text-sm text-white focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label class="text-[11px] text-zinc-400">Muskelmasse (kg)</label>
          <input id="w-mu" type="number" step="0.1" value="${existingToday?.muscle || ''}" placeholder="${last.muscle || '59.4'}"
            class="w-full mt-1 px-3 py-2 rounded-xl bg-zinc-900 border border-border text-sm text-white focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label class="text-[11px] text-zinc-400">Biologisches Alter (Jahre)</label>
          <input id="w-age" type="number" step="1" min="10" max="110" value="${existingToday?.bioAge || ''}" placeholder="${last.bioAge || '34'}"
            class="w-full mt-1 px-3 py-2 rounded-xl bg-zinc-900 border border-border text-sm text-white focus:outline-none focus:border-emerald-500" />
        </div>
      </div>
      <button type="submit" class="w-full py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition">
        Speichern (Enter)
      </button>
    </form>
  `);

  setTimeout(() => {
    const inp = document.getElementById('w-val');
    if (inp) { inp.focus(); inp.select(); }
  }, 40);
}

function saveWeightEntry() {
  const dateVal = document.getElementById('w-date')?.value || state.selectedDate;
  const weight = Number(String(document.getElementById('w-val').value).replace(',', '.'));
  const bfRaw = String(document.getElementById('w-bf').value).replace(',', '.');
  const muRaw = String(document.getElementById('w-mu').value).replace(',', '.');
  const ageRaw = String(document.getElementById('w-age').value).trim();

  const bodyFat = bfRaw !== '' ? Number(bfRaw) : null;
  const muscle = muRaw !== '' ? Number(muRaw) : null;
  const bioAge = ageRaw !== '' ? Number(ageRaw) : null;
  if (!weight || isNaN(weight)) return;

  // Bestehende FitDays-Zusatzwerte dieses Datums erhalten, falls vorhanden
  const prev = state.weightHistory.find(w => w.date === dateVal) || {};
  state.weightHistory = state.weightHistory.filter(w => w.date !== dateVal);
  state.weightHistory.push({
    ...prev,
    date: dateVal,
    weight,
    bodyFat: bodyFat !== null ? bodyFat : (prev.bodyFat ?? null),
    muscle: muscle !== null ? muscle : (prev.muscle ?? null),
    bioAge: bioAge !== null ? bioAge : (prev.bioAge ?? null)
  });
  state.weightHistory.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));

  state.selectedDate = dateVal;
  selectedChartDate = dateVal;
  saveState();
  closeModal();
  render();
}

function handleBulkWeightPaste(event) {
  const target = event.target;
  if (!target || target.tagName !== 'INPUT') return;

  const rawText = (event.clipboardData || window.clipboardData)?.getData('text') || '';
  // Nur eingreifen, wenn Tabulatoren (mehrere Spalten) oder Zeilenumbrüche (mehrere Zeilen) enthalten sind
  if (!rawText.includes('\t') && !rawText.includes('\n')) return;

  event.preventDefault();

  const fieldOrder = ['weight', 'bodyFat', 'muscle', 'bioAge'];
  const startField = target.dataset.field;
  const startColIdx = fieldOrder.indexOf(startField);
  const startRow = target.closest('.bulk-weight-row');
  const allRows = Array.from(document.querySelectorAll('.bulk-weight-row'));
  const startRowIdx = allRows.indexOf(startRow);

  if (startColIdx === -1 || startRowIdx === -1) return;

  // Excel-Zeilen aufteilen (letzte leere Zeile am Ende entfernen)
  const pastedRows = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (pastedRows.length > 1 && pastedRows[pastedRows.length - 1].trim() === '') {
    pastedRows.pop();
  }

  pastedRows.forEach((rowStr, rOffset) => {
    const targetRow = allRows[startRowIdx + rOffset];
    if (!targetRow) return;

    const cols = rowStr.split('\t');
    cols.forEach((cellVal, cOffset) => {
      const targetField = fieldOrder[startColIdx + cOffset];
      if (!targetField) return;

      const input = targetRow.querySelector(`input[data-field="${targetField}"]`);
      if (!input) return;

      // Einheiten wie "kg" oder "%" entfernen und Komma in Punkt umwandeln
      const cleaned = cellVal.replace(/[^\d,.-]/g, '').replace(',', '.').trim();
      if (cleaned !== '' && !isNaN(Number(cleaned))) {
        input.value = cleaned;
        targetRow.classList.remove('bg-zinc-900/70', 'border-border');
        targetRow.classList.add('bg-emerald-500/10', 'border-emerald-500/30');
      }
    });
  });
}

function openBulkWeightModal() {
  const days30 = [...getLastNDays(30)].reverse(); // Heute oben, dann rückwärts
  const weightMap = {};
  state.weightHistory.forEach(w => { weightMap[w.date] = w; });

  openModal(`
    <form onpaste="handleBulkWeightPaste(event)" onsubmit="event.preventDefault(); saveBulkWeights();" class="space-y-3.5">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-base font-semibold text-white">30-Tage-Schnellpflege (FitDays)</h3>
          <p class="text-[11px] text-zinc-400">Excel-Bereich kopieren & in beliebige Startzelle einfügen (Strg+V)</p>
          <label class="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-medium cursor-pointer transition">
        <span>📂 FitDays-Exportdatei direkt importieren (.csv / .xls)</span>
        <input type="file" accept=".csv,.xls,.xlsx" onchange="importFitdaysCsv(event)" class="hidden" />
      </label>
        </div>
        <button type="button" onclick="closeModal()" class="text-zinc-400 hover:text-white px-1">✕</button>
      </div>

      <div class="grid grid-cols-12 gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 px-1.5">
        <div class="col-span-3">Datum</div>
        <div class="col-span-3 text-right">Gewicht</div>
        <div class="col-span-2 text-right">Fett %</div>
        <div class="col-span-2 text-right">Muskel</div>
        <div class="col-span-2 text-right">Alter</div>
      </div>

      <div class="max-h-[54vh] overflow-y-auto space-y-1.5 pr-1">
        ${days30.map((d, idx) => {
          const ex = weightMap[d.dateStr] || {};
          const hasVal = ex.weight !== undefined && ex.weight !== null;
          return `
            <div data-bulk-date="${d.dateStr}" class="bulk-weight-row grid grid-cols-12 gap-1.5 items-center rounded-xl px-2 py-1.5 border ${
              hasVal ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-zinc-900/70 border-border'
            }">
              <div class="col-span-3 text-xs">
                <div class="font-medium text-zinc-200">${d.dayNum}.${d.monthNum}.</div>
                <div class="text-[10px] text-zinc-500">${idx === 0 ? 'Heute' : d.weekdayShort}</div>
              </div>
              <div class="col-span-3">
                <input type="number" step="0.1" data-field="weight" value="${hasVal ? ex.weight : ''}" placeholder="74.0"
                  class="w-full px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-right text-white focus:outline-none focus:border-emerald-500" />
              </div>
              <div class="col-span-2">
                <input type="number" step="0.1" data-field="bodyFat" value="${ex.bodyFat ?? ''}" placeholder="—"
                  class="w-full px-1.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-right text-zinc-200 focus:outline-none focus:border-emerald-500" />
              </div>
              <div class="col-span-2">
                <input type="number" step="0.1" data-field="muscle" value="${ex.muscle ?? ''}" placeholder="—"
                  class="w-full px-1.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-right text-zinc-200 focus:outline-none focus:border-emerald-500" />
              </div>
              <div class="col-span-2">
                <input type="number" step="1" min="10" max="110" data-field="bioAge" value="${ex.bioAge ?? ''}" placeholder="—"
                  class="w-full px-1.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-right text-zinc-200 focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="flex gap-2 pt-1">
        <button type="submit" class="flex-1 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition">
          Alle 30 Tage speichern (Enter)
        </button>
        <button type="button" onclick="closeModal()" class="px-3.5 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs">
          Abbrechen
        </button>
      </div>
    </form>
  `);

  setTimeout(() => {
    const firstInput = document.querySelector('.bulk-weight-row input[data-field="weight"]');
    if (firstInput) firstInput.focus();
  }, 40);
}

function saveBulkWeights() {
  const rows = document.querySelectorAll('.bulk-weight-row');
  const editedDates = new Set();
  const newEntries = [];

  rows.forEach(row => {
    const dateStr = row.dataset.bulkDate;
    editedDates.add(dateStr);

    const parseNum = (field) => {
      const raw = String(row.querySelector(`input[data-field="${field}"]`).value || '').replace(',', '.').trim();
      if (raw === '') return null;
      const num = Number(raw);
      return isNaN(num) ? null : num;
    };

    const weight = parseNum('weight');
    if (weight && weight > 20 && weight < 300) {
      newEntries.push({
        date: dateStr,
        weight,
        bodyFat: parseNum('bodyFat'),
        muscle: parseNum('muscle'),
        bioAge: parseNum('bioAge')
      });
    }
  });

  const olderEntries = state.weightHistory.filter(w => !editedDates.has(w.date));
  state.weightHistory = [...olderEntries, ...newEntries].sort((a, b) => a.date.localeCompare(b.date));

  chartRangeDays = 30;
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
          <label class="text-[11px] text-zinc-400">Ziel-Offset (kcal zur dynamischen Basis ${getDynamicCalorieTarget(getTodayStr()).baseTdee} kcal)</label>
          <input id="g-offset" type="number" step="50" value="${Number(state.calorieOffset) || 0}" placeholder="0 = Erhalt, -300 = Defizit" class="w-full mt-1 px-3 py-2 rounded-xl bg-zinc-900 border border-border text-sm text-white" />
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
  state.calorieOffset = Number(document.getElementById('g-offset').value) || 0;
  state.calorieGoal = getDynamicCalorieTarget(state.selectedDate).total;
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
  const status = getBackupReminderStatus();
  const cfg = getSyncConfig() || { url: '', anonKey: '', syncKey: '' };
  const badgeHtml = status.isDue
    ? `<div class="rounded-xl bg-amber-500/15 border border-amber-500/30 px-3 py-2 text-[11px] text-amber-300">${status.message}</div>`
    : `<div class="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-[11px] text-zinc-400">${status.message}</div>`;

  openModal(`
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-white">Cloud-Sync & Backup</h3>
        <button onclick="closeModal()" class="text-zinc-400 hover:text-white">✕</button>
      </div>

      <div class="rounded-2xl bg-zinc-900/90 border border-border p-3 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-white">☁️ Supabase Auto-Sync</span>
          <span id="syncStatusLabel" class="text-[11px] ${lastSyncStatusErr ? 'text-rose-400' : (lastSyncStatusMsg ? 'text-emerald-400' : 'text-zinc-400')}">
            ${lastSyncStatusMsg || (cfg.syncKey ? 'Aktiv' : 'Nicht eingerichtet')}
          </span>
        </div>
        <div class="text-[10px] text-zinc-400 bg-zinc-950/80 border border-zinc-800/80 rounded-xl px-2.5 py-1.5 space-y-0.5">
          <div>
            Auf diesem Gerät: <strong class="text-white">${(state.workouts || []).length}</strong> Workouts ·
            <strong class="text-white">${(state.weightHistory || []).length}</strong> Gewichtstage ·
            <strong class="text-white">${(state.recipes || []).length}</strong> Rezepte ·
            <strong class="text-white">${(state.snacks || []).length}</strong> Snacks
          </div>
          <div class="${hasPendingLocalPush ? 'text-amber-300' : 'text-zinc-500'}">
            ${isAppOffline()
              ? `📡 Offline · ${syncMeta.pendingCount > 0 ? `${syncMeta.pendingCount} Änderung(en) warten auf Sync` : 'lokale Speicherung aktiv'}`
              : hasPendingLocalPush
                ? `⏳ ${Math.max(1, syncMeta.pendingCount)} lokale Änderung(en) noch nicht abgeglichen`
                : `✓ Alle Daten synchron${syncMeta.lastSyncedAt ? ` (Stand ${new Date(syncMeta.lastSyncedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })})` : ''}`
            }
          </div>
        </div>
        <input id="sync-secret" type="password" value="${cfg.syncKey}" placeholder="Dein persönlicher Sync-Key (z. B. alex-ff-2026)"
          onkeydown="if(event.key==='Enter') saveSyncSettings()"
          class="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-emerald-500 focus:outline-none text-xs text-white" />
        <details class="pt-0.5">
          <summary class="cursor-pointer text-[10px] text-zinc-500 hover:text-zinc-300 select-none">⚙ Server-Verbindung (fest hinterlegt)</summary>
          <div class="space-y-1.5 mt-1.5">
            <input id="sync-url" type="url" value="${cfg.url}" placeholder="Project URL (https://....supabase.co)"
              class="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300" />
            <input id="sync-anon" type="password" value="${cfg.anonKey}" placeholder="Anon / Public Key"
              class="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300" />
          </div>
        </details>
        <div class="flex gap-1.5 pt-1">
          <button onclick="saveSyncSettings()" class="flex-1 py-2 rounded-xl bg-emerald-500 text-zinc-950 font-semibold text-xs">
            Sync starten
          </button>
          <button onclick="pushStateToCloud(false, true)" title="Daten dieses Geräts in die Cloud senden"
            class="px-2.5 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/35 text-sky-300 text-xs font-medium">
            ↑ Senden
          </button>
          <button onclick="pullStateFromCloud(true)" title="Cloud-Stand direkt auf dieses Gerät laden"
            class="px-2.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium">
            ↓ Laden
          </button>
        </div>
      </div>

      ${badgeHtml}
      <button onclick="exportCsvExcel()" class="w-full py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-semibold text-xs transition">
        Als Excel-Tabelle exportieren (.csv)
      </button>
      <button onclick="exportJsonBackup()" class="w-full py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition">
        Komplett-Backup herunterladen (.json)
      </button>
      <label class="block w-full py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-center text-zinc-200 font-medium text-xs cursor-pointer transition">
        JSON-Backup wiederherstellen
        <input type="file" accept=".json" onchange="importJsonBackup(event)" class="hidden" />
      </label>
    </div>
  `);
}

async function saveSyncSettings() {
  const url = (document.getElementById('sync-url')?.value || '').trim() || DEFAULT_SUPABASE_URL;
  const anonKey = (document.getElementById('sync-anon')?.value || '').trim() || DEFAULT_SUPABASE_ANON_KEY;
  const syncKey = (document.getElementById('sync-secret')?.value || '').trim();
  if (!syncKey) {
    setSyncStatusText('Bitte deinen persönlichen Sync-Key eingeben.', true);
    return;
  }
  localStorage.setItem(SYNC_CFG_KEY, JSON.stringify({ url, anonKey, syncKey }));
  setSyncStatusText('Verbinde...');
  await pullStateFromCloud(false);
}

function exportJsonBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `fuel_and_flow_backup_${getTodayStr()}.json`;
  a.click();
  localStorage.setItem('fuel_and_flow_last_backup', String(Date.now()));
  updateBackupReminderBadge();
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

// === BARCODE-SCANNER & SCHNELL-PORTIONIERUNG ===
let scannerStream = null;
let scannerRafId = null;
let currentScannedFood = null;
let barcodeScanContext = 'default'; // 'default' | 'recipe' | 'snack'

async function openBarcodeModal(mode = 'auto') {
  if (mode === 'snack') {
    barcodeScanContext = 'snack';
  } else if (mode === 'recipe' || (mode === 'auto' && typeof editingRecipe !== 'undefined' && editingRecipe)) {
    barcodeScanContext = 'recipe';
  } else {
    barcodeScanContext = 'default';
  }
  const modal = document.getElementById('barcodeModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  document.getElementById('scannedFoodPanel').classList.add('hidden');
  document.getElementById('manualBarcodeInput').value = '';
  startBarcodeCamera();
}

function closeBarcodeModal() {
  stopBarcodeCamera();
  const modal = document.getElementById('barcodeModal');
  if (modal) modal.classList.add('hidden');
}

function stopBarcodeCamera() {
  if (scannerRafId) {
    cancelAnimationFrame(scannerRafId);
    scannerRafId = null;
  }
  if (scannerStream) {
    scannerStream.getTracks().forEach(t => t.stop());
    scannerStream = null;
  }
}

async function startBarcodeCamera() {
  const statusEl = document.getElementById('scannerStatus');
  const videoEl = document.getElementById('barcodeVideo');

  if (!('BarcodeDetector' in window)) {
    statusEl.textContent = 'Kamera-Scanner auf diesem Browser nicht verfügbar – bitte EAN unten eingeben.';
    return;
  }

  try {
    scannerStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    });
    videoEl.srcObject = scannerStream;
    await videoEl.play();
    statusEl.textContent = 'Barcode mittig in den Rahmen halten…';

    const detector = new BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e']
    });

    let isLookingUp = false;
    const scanLoop = async () => {
      if (!scannerStream) return;
      if (!isLookingUp && videoEl.readyState === videoEl.HAVE_ENOUGH_DATA) {
        try {
          const codes = await detector.detect(videoEl);
          if (codes.length > 0 && codes[0].rawValue) {
            isLookingUp = true;
            const ean = codes[0].rawValue;
            statusEl.textContent = `Erkannt: ${ean} – lade Produktdaten…`;
            await lookupBarcodeProduct(ean);
            stopBarcodeCamera();
            return;
          }
        } catch (_) {}
      }
      scannerRafId = requestAnimationFrame(scanLoop);
    };
    scannerRafId = requestAnimationFrame(scanLoop);
  } catch (err) {
    statusEl.textContent = 'Kamera blockiert (HTTPS/localhost nötig) – EAN manuell eingeben.';
  }
}

function handleManualBarcodeSubmit(e) {
  e.preventDefault();
  const ean = (document.getElementById('manualBarcodeInput').value || '').trim();
  if (!ean) return;
  stopBarcodeCamera();
  document.getElementById('scannerStatus').textContent = `Suche EAN ${ean}…`;
  lookupBarcodeProduct(ean);
}

async function lookupBarcodeProduct(ean) {
  const statusEl = document.getElementById('scannerStatus');
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(ean)}.json`);
    const data = await res.json();
    if (data.status !== 1 || !data.product) {
      statusEl.textContent = `Kein Produkt für EAN ${ean} gefunden.`;
      return;
    }

    const p = data.product;
    const n = p.nutriments || {};
    const kcal = Number(n['energy-kcal_100g'] || n['energy-kcal'] || 0);
    const brand = p.brands ? ` (${p.brands.split(',')[0].trim()})` : '';
    const servingGrams = Math.round(Number(p.serving_quantity) || 0);

    currentScannedFood = {
      name: (p.product_name || `Produkt ${ean}`) + brand,
      kcal100: Math.round(kcal),
      p100: Math.round((Number(n.proteins_100g) || 0) * 10) / 10,
      c100: Math.round((Number(n.carbohydrates_100g) || 0) * 10) / 10,
      f100: Math.round((Number(n.fat_100g) || 0) * 10) / 10,
      servingGrams: servingGrams > 0 ? servingGrams : null
    };

    statusEl.textContent = `Gefunden: ${currentScannedFood.name}`;
    renderScannedFoodPanel();
  } catch (err) {
    statusEl.textContent = 'Netzwerkfehler bei der Open Food Facts Abfrage.';
  }
}

function renderScannedFoodPanel() {
  if (!currentScannedFood) return;
  const panel = document.getElementById('scannedFoodPanel');
  panel.classList.remove('hidden');

  document.getElementById('scannedFoodName').textContent = currentScannedFood.name;
  document.getElementById('scannedFoodBaseMacros').textContent =
    `Pro 100g: ${currentScannedFood.kcal100} kcal · ${currentScannedFood.p100}g P · ${currentScannedFood.c100}g KH · ${currentScannedFood.f100}g F`;

  // Quick-Portions-Buttons aufbauen
  const presets = [50, 100, 150, 250, 500];
  let btnsHtml = presets.map(g =>
    `<button type="button" onclick="setScannedGrams(${g})" class="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[11px] text-zinc-200 transition">${g}g</button>`
  ).join('');

  if (currentScannedFood.servingGrams) {
    const sg = currentScannedFood.servingGrams;
    btnsHtml = `<button type="button" onclick="setScannedGrams(${sg})" class="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-[11px] text-sky-300 font-medium transition">1 Portion (${sg}g)</button>` + btnsHtml;
  }

  document.getElementById('portionQuickButtons').innerHTML = btnsHtml;
  document.getElementById('scannedGramsInput').value = currentScannedFood.servingGrams || 100;

  // Ziel-Buttons je nach Kontext anzeigen (Rezept vs. Schnelle Snacks vs. Tages-Log)
  const recipeBtn = document.getElementById('btnAddScannedToRecipe');
  const snackBtn = document.getElementById('btnAddScannedToSnack');
  const logBtn = document.getElementById('btnAddScannedToLog');
  const isRecipeCtx = barcodeScanContext === 'recipe' && typeof editingRecipe !== 'undefined' && editingRecipe;
  const isSnackCtx = barcodeScanContext === 'snack';

  if (recipeBtn) {
    if (isRecipeCtx) recipeBtn.classList.remove('hidden');
    else recipeBtn.classList.add('hidden');
  }
  if (snackBtn) {
    if (isSnackCtx) snackBtn.classList.remove('hidden');
    else snackBtn.classList.add('hidden');
  }
  if (logBtn) {
    if (isSnackCtx) logBtn.classList.add('hidden');
    else logBtn.classList.remove('hidden');
  }

  updateScannedPreview();
}

function setScannedGrams(grams) {
  document.getElementById('scannedGramsInput').value = grams;
  updateScannedPreview();
}

function stepScannedGrams(dir) {
  const inp = document.getElementById('scannedGramsInput');
  if (!inp) return;
  const cur = Math.max(1, Number(inp.value) || 100);
  const step = cur <= 25 ? 5 : 10;
  inp.value = Math.max(1, cur + dir * step);
  updateScannedPreview();
}

function confirmScannedPrimary() {
  if (barcodeScanContext === 'snack') {
    confirmScannedFood('snack');
  } else if (typeof editingRecipe !== 'undefined' && editingRecipe) {
    confirmScannedFood('recipe');
  } else {
    confirmScannedFood('log');
  }
}

function updateScannedPreview() {
  if (!currentScannedFood) return;
  const g = Math.max(1, Number(document.getElementById('scannedGramsInput').value) || 0);
  const step = g <= 25 ? 5 : 10;
  const downBtn = document.getElementById('scanStepDownBtn');
  const upBtn = document.getElementById('scanStepUpBtn');
  if (downBtn) downBtn.textContent = `−${step}`;
  if (upBtn) upBtn.textContent = `+${step}`;
  const factor = g / 100;
  const kcal = Math.round(currentScannedFood.kcal100 * factor);
  const p = Math.round(currentScannedFood.p100 * factor * 10) / 10;
  const c = Math.round(currentScannedFood.c100 * factor * 10) / 10;
  const f = Math.round(currentScannedFood.f100 * factor * 10) / 10;
  document.getElementById('scannedLiveMacros').textContent = `${kcal} kcal · P ${p}g · C ${c}g · F ${f}g`;
}

function confirmScannedFood(target) {
  if (!currentScannedFood) return;
  const g = Math.max(1, Number(document.getElementById('scannedGramsInput').value) || 100);
  const factor = g / 100;

  if (target === 'snack') {
    const saved = addSnackItem({
      name: currentScannedFood.name,
      grams: g,
      kcal100: currentScannedFood.kcal100,
      p100: currentScannedFood.p100,
      c100: currentScannedFood.c100,
      f100: currentScannedFood.f100
    });
    closeBarcodeModal();
    render();
    if (saved && typeof showToast === 'function') {
      showToast(`🍫 „${saved.name}“ gespeichert — per + in die Bilanz loggen`);
    }
    return;
  }

  if (target === 'recipe' && typeof editingRecipe !== 'undefined' && editingRecipe) {
    editingRecipe.items.push({
      id: 'it_' + Date.now(),
      name: currentScannedFood.name,
      grams: g,
      kcal100: currentScannedFood.kcal100,
      p100: currentScannedFood.p100,
      c100: currentScannedFood.c100,
      f100: currentScannedFood.f100
    });
    maybeAutoUpdateRecipeName();
    closeBarcodeModal();
    render();
    return;
  }

  const log = ensureDayLog(state.selectedDate);
  log.entries.push({
    id: 'ent_' + Date.now(),
    name: `${currentScannedFood.name} (${g}g)`,
    kcal: Math.round(currentScannedFood.kcal100 * factor),
    p: Math.round(currentScannedFood.p100 * factor * 10) / 10,
    c: Math.round(currentScannedFood.c100 * factor * 10) / 10,
    f: Math.round(currentScannedFood.f100 * factor * 10) / 10
  });
  saveState();
  closeBarcodeModal();
  switchTab('dashboard');
}

// === PERSISTENT STORAGE & BACKUP-ERINNERUNG ===
const BACKUP_REMINDER_DAYS = 14;
const LAST_BACKUP_KEY = 'fuel_and_flow_last_backup';

function getBackupReminderStatus() {
  const raw = localStorage.getItem(LAST_BACKUP_KEY);
  if (!raw) {
    return {
      isDue: true,
      message: 'Noch kein JSON-Backup erstellt – sichere deine Daten regelmäßig.'
    };
  }
  const daysAgo = Math.floor((Date.now() - Number(raw)) / (1000 * 60 * 60 * 24));
  if (daysAgo >= BACKUP_REMINDER_DAYS) {
    return {
      isDue: true,
      message: `Letztes Backup vor ${daysAgo} Tagen – Zeit für eine neue Sicherung.`
    };
  }
  const label = daysAgo === 0 ? 'heute' : daysAgo === 1 ? 'gestern' : `vor ${daysAgo} Tagen`;
  return {
    isDue: false,
    message: `Letztes Backup: ${label} (alle ${BACKUP_REMINDER_DAYS} Tage empfohlen).`
  };
}

function updateBackupReminderBadge() {
  const btn = document.getElementById('headerBackupBtn');
  if (!btn) return;
  const { isDue, message } = getBackupReminderStatus();
  btn.title = message;

  let dot = document.getElementById('backupReminderDot');
  if (isDue) {
    if (!dot) {
      dot = document.createElement('span');
      dot.id = 'backupReminderDot';
      dot.className = 'absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-zinc-950';
      btn.appendChild(dot);
    }
  } else if (dot) {
    dot.remove();
  }
}

async function initStorageProtection() {
  if (navigator.storage && navigator.storage.persist) {
    try {
      await navigator.storage.persist();
    } catch (_) {}
  }
  updateBackupReminderBadge();
}

document.addEventListener('DOMContentLoaded', initStorageProtection);

// === EXCEL-KOMPATIBLER CSV-EXPORT ===
function exportCsvExcel() {
  const daysMap = state.days || state.logs || {};
  const fitDaysMap = state.fitDays || state.weights || {};
  const allDates = Array.from(new Set([
    ...Object.keys(daysMap),
    ...Object.keys(fitDaysMap)
  ])).sort();

  const fmtNum = (val) => {
    if (val === null || val === undefined || val === '' || Number.isNaN(Number(val))) return '';
    return String(Number(val)).replace('.', ',');
  };

  const escCsv = (val) => {
    const str = val === null || val === undefined ? '' : String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const mapTrafficLight = (v) => {
    if (!v) return '';
    const s = String(v).toLowerCase();
    if (s === 'green' || s === 'gruen' || s === 'grün' || s === 'none' || s === '0') return 'Grün';
    if (s === 'yellow' || s === 'gelb' || s === '1') return 'Gelb';
    if (s === 'red' || s === 'rot' || s === '2') return 'Rot';
    return String(v);
  };

  const headers = [
    'Datum',
    'Kalorien (kcal)',
    'Protein (g)',
    'Kohlenhydrate (g)',
    'Fett (g)',
    'Gewicht (kg)',
    'Bio-Alter',
    'Alkohol',
    'Zigaretten',
    'Vape',
    'Habits / Check-ins',
    'Mahlzeiten (Anzahl)',
    'Mahlzeiten (Details)'
  ];

  const rows = [headers.map(escCsv).join(';')];

  allDates.forEach((dateKey) => {
    const day = daysMap[dateKey] || {};
    const fit = fitDaysMap[dateKey] || {};
    const entries = Array.isArray(day.entries) ? day.entries : [];

    const totals = entries.reduce((acc, item) => {
      acc.kcal += Number(item.kcal) || 0;
      acc.p += Number(item.p) || 0;
      acc.c += Number(item.c) || 0;
      acc.f += Number(item.f) || 0;
      return acc;
    }, { kcal: 0, p: 0, c: 0, f: 0 });

    const weight = day.weight ?? fit.weight ?? '';
    const bioAge = day.bioAge ?? fit.bioAge ?? '';

    const bh = day.badHabits || day.vices || {};
    const alcohol = mapTrafficLight(bh.alcohol ?? day.alcohol);
    const cigarettes = mapTrafficLight(bh.cigarettes ?? bh.cigs ?? day.cigarettes);
    const vape = mapTrafficLight(bh.vape ?? day.vape);

    let habitsText = '';
    if (Array.isArray(day.habits)) {
      habitsText = day.habits.join(', ');
    } else if (day.habits && typeof day.habits === 'object') {
      habitsText = Object.entries(day.habits)
        .filter(([, done]) => Boolean(done))
        .map(([k]) => k)
        .join(', ');
    }

    const mealDetails = entries
      .map(e => `${e.name || 'Eintrag'} (${Math.round(Number(e.kcal) || 0)} kcal)`)
      .join(' | ');

    const row = [
      escCsv(dateKey),
      fmtNum(entries.length ? Math.round(totals.kcal) : ''),
      fmtNum(entries.length ? Math.round(totals.p * 10) / 10 : ''),
      fmtNum(entries.length ? Math.round(totals.c * 10) / 10 : ''),
      fmtNum(entries.length ? Math.round(totals.f * 10) / 10 : ''),
      fmtNum(weight),
      fmtNum(bioAge),
      escCsv(alcohol),
      escCsv(cigarettes),
      escCsv(vape),
      escCsv(habitsText),
      entries.length ? String(entries.length) : '0',
      escCsv(mealDetails)
    ];

    rows.push(row.join(';'));
  });

  const csvContent = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const todayStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `fuel-and-flow-export-${todayStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const GEMINI_KEY_STORAGE = 'fuel_and_flow_gemini_key';
const GEMINI_MODELS_TO_TRY = ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest', 'gemini-2.5-flash'];
const GEMINI_FETCH_TIMEOUT_MS = 25000;
let aiParsedMeal = null;
let aiSelectedImageBase64 = null;
let aiSelectedImageMime = 'image/jpeg';
let aiImagePrepPromise = null;
let aiImagePrepSeq = 0;
let aiAnalyzeAbortController = null;
let aiAnalyzeTimerInterval = null;
let aiAnalyzeRunId = 0;
let aiAnalyzeUserCancelled = false;

function extractGeminiJsonText(result) {
  const parts = result?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts) && parts.length) {
    const nonThoughtText = parts
      .filter(p => !p.thought && typeof p.text === 'string' && p.text.trim())
      .map(p => p.text)
      .join('\n')
      .trim();
    const fallbackText = parts
      .filter(p => typeof p.text === 'string' && p.text.trim())
      .map(p => p.text)
      .join('\n')
      .trim();
    const raw = nonThoughtText || fallbackText;
    if (raw) {
      return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    }
  }
  const blockReason = result?.promptFeedback?.blockReason;
  if (blockReason) {
    throw new Error(`Anfrage von Gemini blockiert (${blockReason}).`);
  }
  const finishReason = result?.candidates?.[0]?.finishReason;
  if (finishReason && finishReason !== 'STOP') {
    throw new Error(`Unvollständige Antwort von Gemini (${finishReason}).`);
  }
  throw new Error('Gemini hat eine leere Antwort zurückgegeben.');
}

function cancelAiMealAnalysis(silent = false) {
  aiAnalyzeUserCancelled = true;
  if (aiAnalyzeTimerInterval) {
    clearInterval(aiAnalyzeTimerInterval);
    aiAnalyzeTimerInterval = null;
  }
  if (aiAnalyzeAbortController) {
    try { aiAnalyzeAbortController.abort(); } catch (e) {}
    aiAnalyzeAbortController = null;
  }
  const btn = document.getElementById('aiAnalyzeBtn');
  if (btn) {
    btn.disabled = false;
    btn.textContent = '✨ Jetzt analysieren';
  }
  if (!silent) {
    const preview = document.getElementById('aiMealPreview');
    if (preview) {
      preview.innerHTML = '<div style="color:#a1a1aa;font-size:0.83rem;">Analyse abgebrochen.</div>';
    }
  }
}

function openAiMealModal() {
  let modal = document.getElementById('aiMealModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'aiMealModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.78);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML = `
      <div style="background:#18181b;color:#f4f4f5;border:1px solid #27272a;border-radius:16px;max-width:480px;width:100%;max-height:92vh;overflow-y:auto;padding:20px;box-shadow:0 20px 40px rgba(0,0,0,0.6);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="margin:0;font-size:1.1rem;">✨ KI-Mahlzeit scannen</h3>
          <button type="button" onclick="closeAiMealModal()" style="background:none;border:none;color:#a1a1aa;font-size:1.3rem;cursor:pointer;">✕</button>
        </div>

        <details id="aiKeyDetails" style="margin-bottom:12px;background:#09090b;border:1px solid #27272a;border-radius:10px;padding:8px 12px;">
          <summary style="cursor:pointer;font-size:0.8rem;color:#a1a1aa;">🔑 Gemini API Key konfigurieren</summary>
          <div style="display:flex;gap:6px;margin-top:8px;">
            <input type="password" id="aiApiKeyInput" placeholder="AIzaSy..."
              style="flex:1;background:#18181b;color:#fff;border:1px solid #3f3f46;border-radius:6px;padding:6px 8px;font-size:0.8rem;">
            <button type="button" onclick="saveGeminiApiKey()" style="background:#27272a;color:#fff;border:1px solid #3f3f46;border-radius:6px;padding:6px 10px;font-size:0.8rem;cursor:pointer;">
              Speichern
            </button>
          </div>
        </details>

        <div style="display:flex;gap:8px;margin-bottom:10px;">
          <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;background:#27272a;color:#fff;border:1px dashed #52525b;border-radius:12px;padding:12px 8px;cursor:pointer;font-weight:600;font-size:0.86rem;">
            <span>📸 Kamera</span>
            <input type="file" id="aiCameraInput" accept="image/*" capture="environment" onchange="handleAiPhotoSelect(event)" style="display:none;">
          </label>
          <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;background:#27272a;color:#fff;border:1px dashed #52525b;border-radius:12px;padding:12px 8px;cursor:pointer;font-weight:600;font-size:0.86rem;">
            <span>🖼️ Galerie</span>
            <input type="file" id="aiPhotoInput" accept="image/*" onchange="handleAiPhotoSelect(event)" style="display:none;">
          </label>
        </div>

        <div id="aiPhotoPreviewWrap" style="display:none;margin-bottom:10px;text-align:center;">
          <img id="aiPhotoPreviewImg" style="max-height:180px;border-radius:10px;border:1px solid #3f3f46;object-fit:cover;margin:0 auto;" />
        </div>
        <div id="aiPhotoStatus" style="display:none;margin-bottom:10px;font-size:0.78rem;color:#a1a1aa;text-align:center;"></div>

        <input type="text" id="aiMealHintInput" placeholder="Optionaler Hinweis (z. B. 'in 1 EL Olivenöl gebraten' oder nur Text)"
          style="width:100%;box-sizing:border-box;background:#09090b;color:#e4e4e7;border:1px solid #3f3f46;border-radius:10px;padding:10px;font-size:0.85rem;margin-bottom:10px;">

        <button type="button" id="aiAnalyzeBtn" onclick="analyzeMealWithGemini()"
          style="width:100%;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:10px;padding:11px;font-weight:600;font-size:0.92rem;cursor:pointer;">
          ✨ Jetzt analysieren
        </button>

        <div id="aiMealPreview" style="margin-top:14px;"></div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  cancelAiMealAnalysis(true);

  const savedKey = localStorage.getItem(GEMINI_KEY_STORAGE) || '';
  document.getElementById('aiApiKeyInput').value = savedKey;
  document.getElementById('aiKeyDetails').open = !savedKey;

  aiParsedMeal = null;
  aiSelectedImageBase64 = null;
  aiSelectedImageMime = 'image/jpeg';
  aiImagePrepPromise = null;
  aiImagePrepSeq++;
  document.getElementById('aiPhotoInput').value = '';
  const camInput = document.getElementById('aiCameraInput');
  if (camInput) camInput.value = '';
  document.getElementById('aiPhotoPreviewWrap').style.display = 'none';
  const photoStatus = document.getElementById('aiPhotoStatus');
  if (photoStatus) {
    photoStatus.style.display = 'none';
    photoStatus.textContent = '';
  }
  document.getElementById('aiMealHintInput').value = '';
  document.getElementById('aiMealPreview').innerHTML = '';
  modal.style.display = 'flex';
}

function closeAiMealModal() {
  cancelAiMealAnalysis(true);
  const modal = document.getElementById('aiMealModal');
  if (modal) modal.style.display = 'none';
}

function saveGeminiApiKey() {
  const val = document.getElementById('aiApiKeyInput').value.trim();
  if (!val) return;
  localStorage.setItem(GEMINI_KEY_STORAGE, val);
  document.getElementById('aiKeyDetails').open = false;
  document.getElementById('aiMealPreview').innerHTML = '<div style="color:#4ade80;font-size:0.82rem;">✓ API Key lokal gespeichert.</div>';
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Foto konnte nicht gelesen werden.'));
    reader.readAsDataURL(file);
  });
}

function compressDrawableToJpeg(source, srcW, srcH, maxDim = 1024, quality = 0.8) {
  let w = srcW;
  let h = srcH;
  if (!w || !h) throw new Error('Ungültige Bildgröße.');
  if (w > maxDim || h > maxDim) {
    if (w > h) { h = Math.max(1, Math.round((h * maxDim) / w)); w = maxDim; }
    else { w = Math.max(1, Math.round((w * maxDim) / h)); h = maxDim; }
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas-Kontext nicht verfügbar.');
  ctx.drawImage(source, 0, 0, w, h);
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const parts = dataUrl.split(',');
  if (!parts[1] || parts[1].length < 32) {
    throw new Error('Bildkomprimierung ergab leere Daten.');
  }
  return { base64: parts[1], mimeType: 'image/jpeg', previewUrl: dataUrl };
}

async function prepareAiPhotoFile(file) {
  // 1. Schneller, speicherschonender Weg über createImageBitmap (ideal für große Smartphone-Kamerafotos)
  if (typeof createImageBitmap === 'function') {
    let bitmap = null;
    try {
      bitmap = await createImageBitmap(file);
      return compressDrawableToJpeg(bitmap, bitmap.width, bitmap.height);
    } catch (e) {
      // Fallback unten nutzen
    } finally {
      if (bitmap && typeof bitmap.close === 'function') {
        try { bitmap.close(); } catch (e) {}
      }
    }
  }

  // 2. Fallback über Object-URL + Image + Canvas
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    const objUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        const timer = setTimeout(() => reject(new Error('Zeitüberschreitung beim Laden des Fotos.')), 12000);
        el.onload = () => { clearTimeout(timer); resolve(el); };
        el.onerror = () => { clearTimeout(timer); reject(new Error('Bildformat konnte nicht dekodiert werden.')); };
        el.src = objUrl;
      });
      return compressDrawableToJpeg(img, img.naturalWidth || img.width, img.naturalHeight || img.height);
    } catch (e) {
      // Fallback 3 unten nutzen (z. B. HEIC/HEIF auf manchen Browsern)
    } finally {
      try { URL.revokeObjectURL(objUrl); } catch (e) {}
    }
  }

  // 3. Direkter Fallback für Formate wie HEIC/HEIF, die Canvas nicht rendern kann, Gemini aber versteht
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Das Foto ist zu groß (über 8 MB) und konnte nicht verkleinert werden.');
  }
  const dataUrl = await readFileAsDataUrl(file);
  const commaIdx = dataUrl.indexOf(',');
  const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : '';
  if (!base64) throw new Error('Foto enthält keine lesbaren Bilddaten.');
  const detectedMime = (file.type && file.type.startsWith('image/')) ? file.type : 'image/jpeg';
  return { base64, mimeType: detectedMime, previewUrl: dataUrl };
}

function handleAiPhotoSelect(event) {
  const input = event.target;
  const file = input && input.files && input.files[0];
  if (!file) return;

  const seq = ++aiImagePrepSeq;
  aiSelectedImageBase64 = null;
  aiSelectedImageMime = 'image/jpeg';

  const previewWrap = document.getElementById('aiPhotoPreviewWrap');
  const previewImg = document.getElementById('aiPhotoPreviewImg');
  const photoStatus = document.getElementById('aiPhotoStatus');
  if (previewWrap) previewWrap.style.display = 'none';
  if (photoStatus) {
    photoStatus.style.display = 'block';
    photoStatus.style.color = '#a1a1aa';
    photoStatus.textContent = '⏳ Foto wird vorbereitet...';
  }

  const prepTask = (async () => {
    try {
      const prepared = await prepareAiPhotoFile(file);
      if (seq !== aiImagePrepSeq) return;

      aiSelectedImageBase64 = prepared.base64;
      aiSelectedImageMime = prepared.mimeType || 'image/jpeg';

      const approxKb = Math.max(1, Math.round((prepared.base64.length * 3) / 4 / 1024));
      if (previewImg && previewWrap) {
        previewImg.onerror = () => {
          previewWrap.style.display = 'none';
        };
        previewImg.onload = () => {
          previewWrap.style.display = 'block';
        };
        previewImg.src = prepared.previewUrl;
      }
      if (photoStatus) {
        photoStatus.style.display = 'block';
        photoStatus.style.color = '#4ade80';
        photoStatus.textContent = `✓ Foto bereit (${approxKb} KB)`;
      }
    } catch (err) {
      if (seq !== aiImagePrepSeq) return;
      aiSelectedImageBase64 = null;
      if (photoStatus) {
        photoStatus.style.display = 'block';
        photoStatus.style.color = '#f87171';
        photoStatus.textContent = `Foto-Fehler: ${err.message || 'Unbekannter Fehler'}`;
      }
    } finally {
      if (input) {
        try { input.value = ''; } catch (e) {}
      }
      if (aiImagePrepPromise === prepTask) {
        aiImagePrepPromise = null;
      }
    }
  })();

  aiImagePrepPromise = prepTask;
}

async function analyzeMealWithGemini() {
  const preview = document.getElementById('aiMealPreview');
  const btn = document.getElementById('aiAnalyzeBtn');
  const hint = (document.getElementById('aiMealHintInput')?.value || '').trim();

  let apiKey = (localStorage.getItem(GEMINI_KEY_STORAGE) || '').trim();
  if (!apiKey) {
    const typedKey = (document.getElementById('aiApiKeyInput')?.value || '').trim();
    if (typedKey) {
      apiKey = typedKey;
      try { localStorage.setItem(GEMINI_KEY_STORAGE, apiKey); } catch (e) {}
      const det = document.getElementById('aiKeyDetails');
      if (det) det.open = false;
    }
  }

  if (!apiKey) {
    const det = document.getElementById('aiKeyDetails');
    if (det) det.open = true;
    preview.innerHTML = '<div style="color:#f87171;font-size:0.84rem;">Bitte zuerst deinen Gemini API Key oben speichern.</div>';
    preview.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
    return;
  }

  if (aiImagePrepPromise) {
    btn.disabled = true;
    btn.textContent = '⏳ Foto wird vorbereitet...';
    preview.innerHTML = '<div style="color:#a1a1aa;font-size:0.83rem;">⏳ Foto wird noch komprimiert...</div>';
    await aiImagePrepPromise;
    btn.disabled = false;
    btn.textContent = '✨ Jetzt analysieren';
  }

  if (!aiSelectedImageBase64 && !hint) {
    preview.innerHTML = '<div style="color:#f87171;font-size:0.84rem;">Bitte ein Foto aufnehmen oder zumindest kurz beschreiben, was du gegessen hast.</div>';
    preview.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
    return;
  }

  cancelAiMealAnalysis(true);
  aiAnalyzeUserCancelled = false;
  const runId = ++aiAnalyzeRunId;
  const startedAt = Date.now();
  let activeModel = GEMINI_MODELS_TO_TRY[0];

  const renderProgress = () => {
    if (runId !== aiAnalyzeRunId) return;
    const secs = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    btn.textContent = `⏳ Analysiere (${secs}s)...`;
    preview.innerHTML = `
      <div style="background:#09090b;border:1px solid #27272a;border-radius:10px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
        <div style="font-size:0.82rem;color:#d4d4d8;">
          ⏳ Analysiere Gericht mit <strong>${activeModel}</strong> (${secs}s)...
        </div>
        <button type="button" onclick="cancelAiMealAnalysis()" style="background:#27272a;color:#e4e4e7;border:1px solid #3f3f46;border-radius:6px;padding:4px 9px;font-size:0.75rem;cursor:pointer;flex-shrink:0;">
          Abbrechen
        </button>
      </div>
    `;
  };

  btn.disabled = true;
  renderProgress();
  preview.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  aiAnalyzeTimerInterval = setInterval(renderProgress, 1000);

  const promptText = `Du bist ein präziser Ernährungs-Tracker. Analysiere diese Mahlzeit${hint ? ` (Hinweis des Nutzers: "${hint}")` : ''}.
Schätze realistisch alle sichtbaren und typischen versteckten Zutaten (z. B. Bratöl, Sauce, Dressing) mit ungefährem Gewicht in Gramm sowie Kalorien (kcal), Protein (p), Kohlenhydraten (c) und Fett (f) für diese Portionsgröße. ${appLang === 'es' ? 'Responde en español.' : 'Antworte auf Deutsch.'}`;

  const parts = [{ text: promptText }];
  if (aiSelectedImageBase64) {
    parts.push({
      inlineData: {
        mimeType: aiSelectedImageMime || 'image/jpeg',
        data: aiSelectedImageBase64
      }
    });
  }

  const requestBody = JSON.stringify({
    contents: [{ parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseJsonSchema: {
        type: 'object',
        properties: {
          mealName: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                grams: { type: 'number' },
                kcal: { type: 'number' },
                p: { type: 'number' },
                c: { type: 'number' },
                f: { type: 'number' }
              },
              required: ['name', 'grams', 'kcal', 'p', 'c', 'f']
            }
          }
        },
        required: ['mealName', 'items']
      }
    }
  });

  try {
    let res = null;
    let lastError = 'Unbekannter Fehler';

    for (const model of GEMINI_MODELS_TO_TRY) {
      if (aiAnalyzeUserCancelled || runId !== aiAnalyzeRunId) return;
      activeModel = model;
      renderProgress();

      const controller = new AbortController();
      aiAnalyzeAbortController = controller;
      let timedOut = false;
      const timeoutId = setTimeout(() => {
        timedOut = true;
        try { controller.abort(); } catch (e) {}
      }, GEMINI_FETCH_TIMEOUT_MS);

      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
          signal: controller.signal
        });
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (aiAnalyzeUserCancelled || runId !== aiAnalyzeRunId) return;
        if (timedOut) {
          lastError = `Zeitüberschreitung bei ${model} (> ${Math.round(GEMINI_FETCH_TIMEOUT_MS / 1000)}s).`;
          res = null;
          continue;
        }
        throw new Error(navigator.onLine === false
          ? 'Keine Internetverbindung. Bitte Verbindung prüfen und erneut versuchen.'
          : `Netzwerkfehler (${fetchErr.message || 'Verbindung unterbrochen'}).`);
      } finally {
        clearTimeout(timeoutId);
        if (aiAnalyzeAbortController === controller) {
          aiAnalyzeAbortController = null;
        }
      }

      if (res.ok) break;

      const errData = await res.json().catch(() => ({}));
      lastError = errData.error?.message || `HTTP ${res.status}`;
      // Bei Überlastung (503/500/502/504), Rate-Limit (429) oder nicht verfügbarem Modell (404) nächstes Modell probieren
      if (![404, 429, 500, 502, 503, 504].includes(res.status)) {
        throw new Error(lastError);
      }
      res = null;
    }

    if (aiAnalyzeUserCancelled || runId !== aiAnalyzeRunId) return;
    if (!res) throw new Error(lastError);

    const result = await res.json();
    const rawJson = extractGeminiJsonText(result);
    const data = JSON.parse(rawJson);

    if (aiAnalyzeUserCancelled || runId !== aiAnalyzeRunId) return;

    aiParsedMeal = {
      mealName: data.mealName || 'KI-Mahlzeit',
      items: (data.items || []).map(it => ({
        name: it.name || 'Zutat',
        grams: Math.round(Number(it.grams) || 100),
        baseGrams: Math.round(Number(it.grams) || 100),
        kcal: Math.round(Number(it.kcal) || 0),
        p: Math.round((Number(it.p) || 0) * 10) / 10,
        c: Math.round((Number(it.c) || 0) * 10) / 10,
        f: Math.round((Number(it.f) || 0) * 10) / 10
      }))
    };

    renderAiMealPreview();
    preview.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    if (aiAnalyzeUserCancelled || runId !== aiAnalyzeRunId) return;
    preview.innerHTML = `<div style="color:#f87171;font-size:0.83rem;">Fehler bei der Analyse: ${err.message}</div>`;
    preview.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  } finally {
    if (runId === aiAnalyzeRunId) {
      if (aiAnalyzeTimerInterval) {
        clearInterval(aiAnalyzeTimerInterval);
        aiAnalyzeTimerInterval = null;
      }
      aiAnalyzeAbortController = null;
      btn.disabled = false;
      btn.textContent = '✨ Jetzt analysieren';
    }
  }
}

function updateAiItemGrams(idx, newGrams) {
  if (!aiParsedMeal || !aiParsedMeal.items[idx]) return;
  const item = aiParsedMeal.items[idx];
  const g = Math.max(0, Number(newGrams) || 0);
  const ratio = item.baseGrams > 0 ? g / item.baseGrams : 0;
  item.grams = g;
  item.kcal = Math.round(item.kcal * ratio);
  item.p = Math.round(item.p * ratio * 10) / 10;
  item.c = Math.round(item.c * ratio * 10) / 10;
  item.f = Math.round(item.f * ratio * 10) / 10;
  item.baseGrams = g > 0 ? g : item.baseGrams;
  renderAiMealPreview();
}

function removeAiMealItem(idx) {
  if (!aiParsedMeal || !aiParsedMeal.items[idx]) return;
  aiParsedMeal.items.splice(idx, 1);
  renderAiMealPreview();
}

function renderAiMealPreview() {
  const preview = document.getElementById('aiMealPreview');
  if (!aiParsedMeal) return;

  const totals = aiParsedMeal.items.reduce((acc, it) => ({
    kcal: acc.kcal + it.kcal,
    p: acc.p + it.p,
    c: acc.c + it.c,
    f: acc.f + it.f
  }), { kcal: 0, p: 0, c: 0, f: 0 });

  const rowsHtml = aiParsedMeal.items.map((it, idx) => `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #27272a;font-size:0.84rem;">
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${it.name}</div>
        <div style="color:#a1a1aa;font-size:0.76rem;">${it.kcal} kcal · P ${it.p}g · C ${it.c}g · F ${it.f}g</div>
      </div>
      <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
        <input type="number" value="${it.grams}" onchange="updateAiItemGrams(${idx}, this.value)"
          style="width:58px;background:#09090b;color:#fff;border:1px solid #3f3f46;border-radius:6px;padding:4px 6px;text-align:right;font-size:0.82rem;">
        <span style="color:#a1a1aa;font-size:0.78rem;">g</span>
        <button type="button" onclick="removeAiMealItem(${idx})" title="Zutat entfernen"
          style="background:none;border:none;color:#f87171;cursor:pointer;padding:2px 4px;font-size:0.85rem;">✕</button>
      </div>
    </div>
  `).join('');

  preview.innerHTML = `
    <div style="background:#09090b;border:1px solid #27272a;border-radius:10px;padding:12px;">
      <input type="text" value="${aiParsedMeal.mealName.replace(/"/g, '&quot;')}"
        oninput="aiParsedMeal.mealName = this.value"
        style="width:100%;box-sizing:border-box;background:#18181b;color:#fff;border:1px solid #3f3f46;border-radius:8px;padding:6px 8px;font-weight:700;font-size:0.9rem;margin-bottom:8px;" />
      ${rowsHtml || '<div style="color:#71717a;font-size:0.8rem;padding:6px 0;">Keine Zutaten mehr in der Liste.</div>'}
      <div style="margin-top:10px;font-size:0.85rem;font-weight:600;color:#a5b4fc;">
        Gesamt: ${Math.round(totals.kcal)} kcal · P ${totals.p.toFixed(1)}g · C ${totals.c.toFixed(1)}g · F ${totals.f.toFixed(1)}g
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button type="button" onclick="saveAiMealToLog(false)" style="flex:1;background:#6366f1;color:#fff;border:none;border-radius:8px;padding:9px;font-weight:600;font-size:0.82rem;cursor:pointer;">
          Als Einzelzutaten
        </button>
        <button type="button" onclick="saveAiMealToLog(true)" style="flex:1;background:#27272a;color:#f4f4f5;border:1px solid #3f3f46;border-radius:8px;padding:9px;font-weight:600;font-size:0.82rem;cursor:pointer;">
          Als 1 Gericht
        </button>
      </div>
      <button type="button" onclick="saveAiMealAsRecipe()"
        style="width:100%;margin-top:8px;background:rgba(16,185,129,0.16);color:#34d399;border:1px solid rgba(16,185,129,0.4);border-radius:8px;padding:9px;font-weight:600;font-size:0.83rem;cursor:pointer;">
        📖 Als Rezept speichern
      </button>
    </div>
  `;
}

function saveAiMealAsRecipe() {
  if (!aiParsedMeal || !aiParsedMeal.items.length) return;
  const now = Date.now();
  const recipeName = (aiParsedMeal.mealName || '').trim() || 'KI-Rezept';

  const items = aiParsedMeal.items
    .filter(it => (Number(it.grams) || 0) > 0)
    .map((it, idx) => {
      const g = Number(it.grams) || 100;
      const factor = 100 / g;
      return {
        id: 'it_' + (now + idx),
        name: it.name || 'Zutat',
        grams: Math.round(g),
        kcal100: Math.round((Number(it.kcal) || 0) * factor),
        p100: Math.round((Number(it.p) || 0) * factor * 10) / 10,
        c100: Math.round((Number(it.c) || 0) * factor * 10) / 10,
        f100: Math.round((Number(it.f) || 0) * factor * 10) / 10
      };
    });

  if (!items.length) return;

  state.recipes.unshift({
    id: 'rec_' + now,
    name: recipeName,
    items
  });

  saveState();
  closeAiMealModal();
  switchTab('recipes');
}

function saveAiMealToLog(asSingleEntry) {
  if (!aiParsedMeal || !aiParsedMeal.items.length) return;
  const log = ensureDayLog(state.selectedDate);
  const now = Date.now();

  if (asSingleEntry) {
    const totals = aiParsedMeal.items.reduce((acc, it) => ({
      kcal: acc.kcal + it.kcal,
      p: acc.p + it.p,
      c: acc.c + it.c,
      f: acc.f + it.f
    }), { kcal: 0, p: 0, c: 0, f: 0 });

    log.entries.push({
      id: 'ent_' + now,
      name: `✨ ${aiParsedMeal.mealName}`,
      kcal: Math.round(totals.kcal),
      p: Math.round(totals.p * 10) / 10,
      c: Math.round(totals.c * 10) / 10,
      f: Math.round(totals.f * 10) / 10
    });
  } else {
    aiParsedMeal.items.forEach((it, idx) => {
      log.entries.push({
        id: 'ent_' + (now + idx),
        name: `${it.name} (${it.grams}g)`,
        kcal: Math.round(it.kcal),
        p: Math.round(it.p * 10) / 10,
        c: Math.round(it.c * 10) / 10,
        f: Math.round(it.f * 10) / 10
      });
    });
  }

  saveState();
  closeAiMealModal();
  dashboardSection = 'bilanz';
  switchTab('dashboard');
}

// ---------- SPRACH-QUICK-LOG (MAHLZEITEN & HABITS VIA GEMINI) ----------
const GEMINI_FAST_MODELS_TO_TRY = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];
const VQL_MIC_SVG = '<svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>';
let vqlMediaRecorder = null;
let vqlAudioStream = null;
let vqlAudioChunks = [];
let vqlSpeechRecognition = null;
let vqlSpeechActive = false;
let vqlSpeechFinalText = '';
let vqlSpeechInterimText = '';
let vqlRecTimer = null;
let vqlRecSeconds = 0;
let vqlAbortController = null;
let vqlDraft = null;

function stopVoiceQuickLogStreamOnly() {
  clearInterval(vqlRecTimer);
  vqlRecTimer = null;
  vqlSpeechActive = false;
  if (vqlSpeechRecognition) {
    try {
      vqlSpeechRecognition.onresult = null;
      vqlSpeechRecognition.onend = null;
      vqlSpeechRecognition.onerror = null;
      vqlSpeechRecognition.abort();
    } catch (e) {}
    vqlSpeechRecognition = null;
  }
  if (vqlMediaRecorder && vqlMediaRecorder.state !== 'inactive') {
    try { vqlMediaRecorder.onstop = null; vqlMediaRecorder.stop(); } catch (e) {}
  }
  vqlMediaRecorder = null;
  if (vqlAudioStream) {
    vqlAudioStream.getTracks().forEach(t => t.stop());
    vqlAudioStream = null;
  }
  if (vqlAbortController) {
    try { vqlAbortController.abort(); } catch (e) {}
    vqlAbortController = null;
  }
}

function saveVqlGeminiKey() {
  const inp = document.getElementById('vqlGeminiKeyInput');
  if (!inp || !inp.value.trim()) return;
  localStorage.setItem(GEMINI_KEY_STORAGE, inp.value.trim());
  const det = document.getElementById('vqlKeyDetails');
  if (det) det.open = false;
  showToast(appLang === 'es' ? '✓ Clave API guardada' : '✓ Gemini API Key gespeichert');
}

function openVoiceQuickLogModal() {
  stopVoiceQuickLogStreamOnly();
  vqlDraft = null;
  vqlSpeechFinalText = '';
  vqlSpeechInterimText = '';
  const savedKey = (localStorage.getItem(GEMINI_KEY_STORAGE) || '').trim();

  openModal(`
    <div class="space-y-4">
      <div class="flex items-start justify-between gap-2">
        <div>
          <h3 class="text-base font-semibold text-white flex items-center gap-2">
            <span class="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 inline-flex items-center justify-center">${VQL_MIC_SVG}</span>
            <span>Sprach-Quick-Log</span>
          </h3>
          <p class="text-[11px] text-zinc-400 mt-0.5">Mahlzeiten & Habits für <strong class="text-zinc-200">${formatDisplayDate(state.selectedDate)}</strong> einsprechen</p>
        </div>
        <button type="button" onclick="closeModal()" class="text-zinc-400 hover:text-white px-2 py-1">✕</button>
      </div>

      <details id="vqlKeyDetails" ${savedKey ? '' : 'open'} class="bg-zinc-950 border border-border rounded-2xl px-3 py-2">
        <summary class="cursor-pointer text-xs text-zinc-400 select-none">🔑 Gemini API Key konfigurieren</summary>
        <div class="flex gap-2 mt-2">
          <input id="vqlGeminiKeyInput" type="password" value="${savedKey}" placeholder="AIzaSy..."
            class="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-border text-xs text-white" />
          <button type="button" onclick="saveVqlGeminiKey()" class="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-white font-medium shrink-0">
            Speichern
          </button>
        </div>
      </details>

      <div class="rounded-2xl bg-zinc-900/90 border border-border p-4 text-center space-y-3">
        <div id="vqlStatus" class="text-xs text-zinc-300 leading-relaxed">
          Beispiel: „250g Skyr mit 30g Haferflocken und einer Banane gegessen, Kreatin erledigt, heute kein Alkohol“
        </div>
        <div id="vqlTimerBadge" class="hidden text-lg font-mono font-bold text-rose-400 animate-pulse">00:00</div>
        <button id="vqlMainBtn" type="button" onclick="toggleVoiceQuickLogRecording()"
          class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-zinc-950 font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
          ${VQL_MIC_SVG}<span>Aufnahme starten</span>
        </button>
      </div>

      <div class="space-y-2 pt-1 border-t border-border">
        <label class="text-[11px] text-zinc-400 block">Oder kurz als Text eingeben:</label>
        <textarea id="vqlTextInput" rows="2" placeholder="z. B. 1 Snickers gegessen, Skincare erledigt, kein Nikotin"
          class="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-border text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"></textarea>
        <button id="vqlTextSubmitBtn" type="button" onclick="submitVoiceQuickLogToGemini(null, null)"
          class="w-full py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-border text-zinc-200 font-semibold text-xs transition">
          ✨ Aus Text erkennen
        </button>
      </div>

      <div id="vqlError" class="hidden text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2"></div>
      <div id="vqlPreview" class="space-y-3"></div>
    </div>
  `);
}

function getSpeechRecognitionCtor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function startVqlRecordingUi(hintText) {
  vqlRecSeconds = 0;
  const timerBadge = document.getElementById('vqlTimerBadge');
  const statusEl = document.getElementById('vqlStatus');
  const mainBtn = document.getElementById('vqlMainBtn');
  if (timerBadge) {
    timerBadge.textContent = '00:00';
    timerBadge.classList.remove('hidden');
  }
  if (statusEl) {
    statusEl.textContent = hintText;
  }
  if (mainBtn) {
    mainBtn.className = 'w-full py-3.5 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-rose-500/25';
    mainBtn.innerHTML = '<span>⏹</span><span>Stopp & sofort auswerten</span>';
  }
  clearInterval(vqlRecTimer);
  vqlRecTimer = setInterval(() => {
    vqlRecSeconds++;
    const mm = String(Math.floor(vqlRecSeconds / 60)).padStart(2, '0');
    const ss = String(vqlRecSeconds % 60).padStart(2, '0');
    const tb = document.getElementById('vqlTimerBadge');
    if (tb) tb.textContent = `${mm}:${ss}`;
  }, 1000);
}

async function startVqlAudioRecorderFallback() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Mikrofon wird in diesem Browser nicht unterstützt.');
  }
  vqlAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = pickSupportedAudioMime();
  vqlAudioChunks = [];
  // Niedrige Sprach-Bitrate (24 kbps) für extrem schnellen Upload
  const recOpts = mime ? { mimeType: mime, audioBitsPerSecond: 24000 } : { audioBitsPerSecond: 24000 };
  try {
    vqlMediaRecorder = new MediaRecorder(vqlAudioStream, recOpts);
  } catch (e) {
    vqlMediaRecorder = mime ? new MediaRecorder(vqlAudioStream, { mimeType: mime }) : new MediaRecorder(vqlAudioStream);
  }

  vqlMediaRecorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) vqlAudioChunks.push(ev.data);
  };

  vqlMediaRecorder.onstop = async () => {
    const actualMime = (vqlMediaRecorder && vqlMediaRecorder.mimeType) || mime || 'audio/webm';
    if (vqlAudioStream) {
      vqlAudioStream.getTracks().forEach(t => t.stop());
      vqlAudioStream = null;
    }
    vqlMediaRecorder = null;
    const blob = new Blob(vqlAudioChunks, { type: actualMime });
    if (!blob.size) return;
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || '').split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    await submitVoiceQuickLogToGemini(base64, actualMime.split(';')[0]);
  };

  vqlMediaRecorder.start();
  startVqlRecordingUi('🔴 Aufnahme läuft… Sprich Mahlzeiten, Snacks und/oder Habits ein.');
}

async function toggleVoiceQuickLogRecording() {
  const errEl = document.getElementById('vqlError');
  if (errEl) errEl.classList.add('hidden');

  let apiKey = (localStorage.getItem(GEMINI_KEY_STORAGE) || '').trim();
  if (!apiKey) {
    const typed = (document.getElementById('vqlGeminiKeyInput')?.value || '').trim();
    if (typed) {
      apiKey = typed;
      try { localStorage.setItem(GEMINI_KEY_STORAGE, apiKey); } catch (e) {}
      const det = document.getElementById('vqlKeyDetails');
      if (det) det.open = false;
    }
  }
  if (!apiKey) {
    const det = document.getElementById('vqlKeyDetails');
    if (det) det.open = true;
    if (errEl) {
      errEl.textContent = 'Bitte zuerst oben deinen Gemini API Key speichern.';
      errEl.classList.remove('hidden');
    }
    return;
  }

  // Falls Live-Spracherkennung läuft -> stoppen & sofort als kompakten Text an Gemini-Lite senden (ultra-schnell!)
  if (vqlSpeechActive && vqlSpeechRecognition) {
    clearInterval(vqlRecTimer);
    vqlSpeechActive = false;
    const btn = document.getElementById('vqlMainBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⚡</span><span>Werte blitzschnell aus…</span>';
    }
    const capturedNow = `${vqlSpeechFinalText} ${vqlSpeechInterimText}`.trim();
    try { vqlSpeechRecognition.stop(); } catch (e) {}
    if (capturedNow) {
      const textInp = document.getElementById('vqlTextInput');
      if (textInp) textInp.value = capturedNow;
      vqlSpeechRecognition = null;
      await submitVoiceQuickLogToGemini(null, null, capturedNow);
    }
    return;
  }

  // Falls Audio-Aufnahme läuft -> stoppen & auswerten
  if (vqlMediaRecorder && vqlMediaRecorder.state === 'recording') {
    clearInterval(vqlRecTimer);
    const btn = document.getElementById('vqlMainBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span><span>Werte Sprach-Log aus…</span>';
    }
    vqlMediaRecorder.stop();
    return;
  }

  // Schnellpfad: Native Live-Spracherkennung (transkribiert schon beim Sprechen -> ~1s statt Audio-Upload!)
  const SpeechRec = getSpeechRecognitionCtor();
  if (SpeechRec) {
    try {
      vqlSpeechFinalText = '';
      vqlSpeechInterimText = '';
      const rec = new SpeechRec();
      rec.lang = appLang === 'es' ? 'es-ES' : 'de-DE';
      rec.continuous = true;
      rec.interimResults = true;
      vqlSpeechRecognition = rec;
      vqlSpeechActive = true;

      rec.onresult = (ev) => {
        let fin = '';
        let interim = '';
        for (let i = 0; i < ev.results.length; i++) {
          const t = ev.results[i][0]?.transcript || '';
          if (ev.results[i].isFinal) fin += t + ' ';
          else interim += t;
        }
        vqlSpeechFinalText = fin.trim();
        vqlSpeechInterimText = interim.trim();
        const combined = `${vqlSpeechFinalText} ${vqlSpeechInterimText}`.trim();
        const statusEl = document.getElementById('vqlStatus');
        if (statusEl && combined) {
          statusEl.textContent = `🔴 „${combined}“`;
        }
      };

      rec.onerror = async (ev) => {
        const code = ev?.error || '';
        if (code === 'aborted' || code === 'no-speech') return;
        // Automatischer Fallback auf kompakte Audio-Aufnahme
        stopVoiceQuickLogStreamOnly();
        try {
          await startVqlAudioRecorderFallback();
        } catch (fallbackErr) {
          if (errEl) {
            errEl.textContent = `Mikrofon-Fehler: ${fallbackErr.message || fallbackErr}`;
            errEl.classList.remove('hidden');
          }
        }
      };

      rec.onend = async () => {
        if (!vqlSpeechActive) return;
        vqlSpeechActive = false;
        clearInterval(vqlRecTimer);
        vqlSpeechRecognition = null;
        const captured = `${vqlSpeechFinalText} ${vqlSpeechInterimText}`.trim();
        if (captured) {
          const textInp = document.getElementById('vqlTextInput');
          if (textInp) textInp.value = captured;
          await submitVoiceQuickLogToGemini(null, null, captured);
        } else {
          const tb = document.getElementById('vqlTimerBadge');
          if (tb) tb.classList.add('hidden');
          const mainBtn = document.getElementById('vqlMainBtn');
          if (mainBtn) {
            mainBtn.disabled = false;
            mainBtn.className = 'w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-zinc-950 font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20';
            mainBtn.innerHTML = `${VQL_MIC_SVG}<span>Aufnahme starten</span>`;
          }
        }
      };

      rec.start();
      startVqlRecordingUi('🔴 Hört live zu… Sprich Mahlzeiten, Snacks und/oder Habits ein.');
      return;
    } catch (e) {
      stopVoiceQuickLogStreamOnly();
    }
  }

  try {
    await startVqlAudioRecorderFallback();
  } catch (err) {
    stopVoiceQuickLogStreamOnly();
    if (errEl) {
      errEl.textContent = `Mikrofon-Fehler: ${err.message || err}`;
      errEl.classList.remove('hidden');
    }
  }
}

function buildVoiceQuickLogHabitCatalog() {
  const cfg = getHabitConfig();
  const lines = [];
  if (cfg.categories.alcohol !== false) {
    lines.push('- target "badHabit:alcohol" | Name: Alkohol | erlaubte Werte: "clean" (kein Alkohol) oder "consumed" (Alkohol getrunken)');
  }
  if (cfg.categories.nicotine !== false) {
    lines.push('- target "badHabit:nicotine" | Name: Nikotin gesamt | erlaubte Werte: "clean" oder "consumed"');
    lines.push('- target "badHabit:cigarettes" | Name: Zigaretten | erlaubte Werte: "clean" oder "consumed"');
    lines.push('- target "badHabit:vape" | Name: Vape | erlaubte Werte: "clean" oder "consumed"');
  }
  getEnabledBuiltinRoutines().forEach(r => {
    lines.push(`- target "routine:${r.id}" | Name: ${r.name} | erlaubte Werte: "yes" (erledigt) oder "no" (nicht erledigt)`);
  });
  getCustomHabits(true).forEach(h => {
    const valDesc = h.type === 'avoid' ? '"clean" (vermieden) oder "consumed" (konsumiert)' : '"yes" (erledigt) oder "no" (nicht erledigt)';
    lines.push(`- target "custom:${h.id}" | Name: ${h.name} | erlaubte Werte: ${valDesc}`);
  });
  return lines;
}

function parseVoiceQuickLogResult(data) {
  const meals = (Array.isArray(data?.meals) ? data.meals : [])
    .map((m, idx) => ({
      id: `vql_m_${idx}`,
      checked: true,
      name: String(m?.name || '').trim(),
      grams: Math.max(1, Math.round(Number(m?.grams) || 100)),
      kcal: Math.max(0, Math.round(Number(m?.kcal) || 0)),
      p: Math.max(0, Math.round((Number(m?.p) || 0) * 10) / 10),
      c: Math.max(0, Math.round((Number(m?.c) || 0) * 10) / 10),
      f: Math.max(0, Math.round((Number(m?.f) || 0) * 10) / 10)
    }))
    .filter(m => m.name);

  const validHabitTargets = new Set([
    'badHabit:alcohol', 'badHabit:nicotine', 'badHabit:cigarettes', 'badHabit:vape',
    'routine:creatine', 'routine:skincare', 'routine:sertraline'
  ]);
  getCustomHabits(false).forEach(h => validHabitTargets.add(`custom:${h.id}`));

  const habitUpdates = [];
  const seenTargets = new Set();
  (Array.isArray(data?.habitUpdates) ? data.habitUpdates : []).forEach((h, idx) => {
    const target = String(h?.target || '').trim();
    const rawVal = String(h?.value || '').trim().toLowerCase();
    if (!validHabitTargets.has(target) || seenTargets.has(target)) return;
    let normalizedVal = null;
    if (target.startsWith('badHabit:')) {
      if (rawVal === 'clean' || rawVal === 'no' || rawVal === 'false') normalizedVal = 'clean';
      else if (rawVal === 'consumed' || rawVal === 'yes' || rawVal === 'true') normalizedVal = 'consumed';
    } else if (target.startsWith('routine:')) {
      if (rawVal === 'yes' || rawVal === 'true' || rawVal === 'clean') normalizedVal = 'yes';
      else if (rawVal === 'no' || rawVal === 'false' || rawVal === 'consumed') normalizedVal = 'no';
    } else if (target.startsWith('custom:')) {
      const ch = getCustomHabitById(target.slice(7));
      if (!ch) return;
      if (ch.type === 'avoid') {
        if (rawVal === 'clean' || rawVal === 'no') normalizedVal = 'clean';
        else if (rawVal === 'consumed' || rawVal === 'yes') normalizedVal = 'consumed';
      } else {
        if (rawVal === 'yes' || rawVal === 'true') normalizedVal = 'yes';
        else if (rawVal === 'no' || rawVal === 'false') normalizedVal = 'no';
      }
    }
    if (!normalizedVal) return;
    seenTargets.add(target);
    habitUpdates.push({
      id: `vql_h_${idx}`,
      checked: true,
      target,
      label: String(h?.label || target).trim(),
      value: normalizedVal
    });
  });

  return {
    transcript: String(data?.transcript || '').trim(),
    meals,
    habitUpdates
  };
}

async function submitVoiceQuickLogToGemini(audioBase64, audioMimeType, overrideText = null) {
  const errEl = document.getElementById('vqlError');
  const previewEl = document.getElementById('vqlPreview');
  const textNote = overrideText !== null ? String(overrideText).trim() : (document.getElementById('vqlTextInput')?.value || '').trim();
  const mainBtn = document.getElementById('vqlMainBtn');
  const txtBtn = document.getElementById('vqlTextSubmitBtn');

  if (errEl) errEl.classList.add('hidden');
  let apiKey = (localStorage.getItem(GEMINI_KEY_STORAGE) || '').trim();
  if (!apiKey) {
    const typed = (document.getElementById('vqlGeminiKeyInput')?.value || '').trim();
    if (typed) {
      apiKey = typed;
      try { localStorage.setItem(GEMINI_KEY_STORAGE, apiKey); } catch (e) {}
      const det = document.getElementById('vqlKeyDetails');
      if (det) det.open = false;
    }
  }
  if (!apiKey) {
    const det = document.getElementById('vqlKeyDetails');
    if (det) det.open = true;
    if (errEl) {
      errEl.textContent = 'Bitte zuerst oben deinen Gemini API Key speichern.';
      errEl.classList.remove('hidden');
    }
    return;
  }
  if (!audioBase64 && !textNote) {
    if (errEl) {
      errEl.textContent = 'Bitte zuerst eine Sprachaufnahme starten oder unten Text eingeben.';
      errEl.classList.remove('hidden');
    }
    return;
  }

  if (mainBtn) mainBtn.disabled = true;
  if (txtBtn) {
    txtBtn.disabled = true;
    txtBtn.textContent = '⚡ Analysiere…';
  }
  if (previewEl) {
    previewEl.innerHTML = '<div class="text-xs text-zinc-400 text-center py-2">⚡ Schnelle Auswertung läuft…</div>';
  }

  const habitCatalog = buildVoiceQuickLogHabitCatalog();
  const targetLang = appLang === 'es' ? 'Spanisch (Español)' : 'Deutsch';
  const promptText = `Extrahiere aus ${audioBase64 ? 'der Audio-Aufnahme' : `dem Text ("${textNote}")`} knapp als JSON (${targetLang}):
- meals: konsumierte Speisen/Snacks mit Portionsgewicht (grams) und Nährwerten für DIESE Portion (kcal, p, c, f). Leer [] falls keine.
- habitUpdates: nur explizit genannte Habits mit exakt passender target-ID:
${habitCatalog.length ? habitCatalog.join('\n') : '(keine)'}
- transcript: kurzer verstandener Satz.`;

  const parts = [{ text: promptText }];
  if (audioBase64) {
    parts.push({
      inlineData: {
        mimeType: audioMimeType || 'audio/webm',
        data: audioBase64
      }
    });
  }

  const requestBody = JSON.stringify({
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 512,
      responseMimeType: 'application/json',
      responseJsonSchema: {
        type: 'object',
        properties: {
          transcript: { type: 'string' },
          meals: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                grams: { type: 'number' },
                kcal: { type: 'number' },
                p: { type: 'number' },
                c: { type: 'number' },
                f: { type: 'number' }
              },
              required: ['name', 'grams', 'kcal', 'p', 'c', 'f']
            }
          },
          habitUpdates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                target: { type: 'string' },
                label: { type: 'string' },
                value: { type: 'string' }
              },
              required: ['target', 'label', 'value']
            }
          }
        },
        required: ['meals', 'habitUpdates']
      }
    }
  });

  try {
    let res = null;
    let lastError = 'Unbekannter Fehler';
    for (const model of GEMINI_FAST_MODELS_TO_TRY) {
      const controller = new AbortController();
      vqlAbortController = controller;
      let timedOut = false;
      const timeoutId = setTimeout(() => {
        timedOut = true;
        try { controller.abort(); } catch (e) {}
      }, 15000);
      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
          signal: controller.signal
        });
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (timedOut) {
          lastError = `Zeitüberschreitung bei ${model}`;
          res = null;
          continue;
        }
        throw fetchErr;
      } finally {
        clearTimeout(timeoutId);
        if (vqlAbortController === controller) vqlAbortController = null;
      }
      if (res.ok) break;
      const errData = await res.json().catch(() => ({}));
      lastError = errData.error?.message || `HTTP ${res.status}`;
      if (![404, 429, 500, 502, 503, 504].includes(res.status)) throw new Error(lastError);
      res = null;
    }
    if (!res) throw new Error(lastError);

    const result = await res.json();
    const rawJson = extractGeminiJsonText(result);
    const parsed = parseVoiceQuickLogResult(JSON.parse(rawJson));
    if (!parsed.transcript && textNote) parsed.transcript = textNote;
    if (!parsed.meals.length && !parsed.habitUpdates.length) {
      throw new Error('Es wurden weder Mahlzeiten noch aktive Habits erkannt. Versuch es etwas konkreter.');
    }
    vqlDraft = parsed;
    renderVoiceQuickLogPreview();
  } catch (err) {
    if (previewEl) previewEl.innerHTML = '';
    if (errEl) {
      errEl.textContent = `Fehler: ${err.message || err}`;
      errEl.classList.remove('hidden');
    }
  } finally {
    const tb = document.getElementById('vqlTimerBadge');
    if (tb) tb.classList.add('hidden');
    if (mainBtn) {
      mainBtn.disabled = false;
      mainBtn.className = 'w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-zinc-950 font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20';
      mainBtn.innerHTML = `${VQL_MIC_SVG}<span>Neu aufnehmen</span>`;
    }
    if (txtBtn) {
      txtBtn.disabled = false;
      txtBtn.textContent = '✨ Aus Text erkennen';
    }
  }
}

function toggleVqlDraftItem(kind, idx) {
  if (!vqlDraft) return;
  const arr = kind === 'meal' ? vqlDraft.meals : vqlDraft.habitUpdates;
  if (!arr || !arr[idx]) return;
  arr[idx].checked = !arr[idx].checked;
  renderVoiceQuickLogPreview();
}

function renderVoiceQuickLogPreview() {
  const previewEl = document.getElementById('vqlPreview');
  if (!previewEl || !vqlDraft) return;

  const selectedMeals = vqlDraft.meals.filter(m => m.checked);
  const selectedHabits = vqlDraft.habitUpdates.filter(h => h.checked);
  const totalSelected = selectedMeals.length + selectedHabits.length;
  const totalKcal = selectedMeals.reduce((s, m) => s + m.kcal, 0);

  const habitBadge = (val) => {
    if (val === 'yes') return '<span class="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold">✓ Ja</span>';
    if (val === 'clean') return '<span class="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold">✓ Clean</span>';
    if (val === 'no') return '<span class="px-2 py-0.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-semibold">✕ Nein</span>';
    return '<span class="px-2 py-0.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-semibold">✕ Konsumiert</span>';
  };

  previewEl.innerHTML = `
    <div class="rounded-2xl bg-zinc-950 border border-violet-500/35 p-3.5 space-y-3">
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs font-semibold text-white">Vorschau vor dem Speichern</span>
        <span class="text-[11px] text-zinc-400">${formatDisplayDate(state.selectedDate)}</span>
      </div>

      ${vqlDraft.transcript ? `
        <div class="text-[11px] italic text-zinc-400 bg-zinc-900/70 rounded-xl px-2.5 py-1.5">„${escapeHtmlAttr(vqlDraft.transcript)}“</div>
      ` : ''}

      ${vqlDraft.meals.length > 0 ? `
        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-[11px] font-semibold text-zinc-300">
            <span>🍽️ Mahlzeiten (${selectedMeals.length}/${vqlDraft.meals.length})</span>
            <span class="text-emerald-400">${totalKcal} kcal</span>
          </div>
          ${vqlDraft.meals.map((m, idx) => `
            <button type="button" onclick="toggleVqlDraftItem('meal', ${idx})"
              class="w-full text-left flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl border text-xs transition ${
                m.checked
                  ? 'bg-zinc-900 border-emerald-500/40 text-white'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-500 opacity-60'
              }">
              <div class="min-w-0 flex-1">
                <div class="font-medium truncate">${m.checked ? '☑' : '☐'} ${escapeHtmlAttr(m.name)} (${m.grams}g)</div>
                <div class="text-[10px] text-zinc-400">${m.kcal} kcal · P ${m.p}g · C ${m.c}g · F ${m.f}g</div>
              </div>
            </button>
          `).join('')}
        </div>
      ` : ''}

      ${vqlDraft.habitUpdates.length > 0 ? `
        <div class="space-y-1.5">
          <div class="text-[11px] font-semibold text-zinc-300">⚡ Habits (${selectedHabits.length}/${vqlDraft.habitUpdates.length})</div>
          ${vqlDraft.habitUpdates.map((h, idx) => `
            <button type="button" onclick="toggleVqlDraftItem('habit', ${idx})"
              class="w-full text-left flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl border text-xs transition ${
                h.checked
                  ? 'bg-zinc-900 border-emerald-500/40 text-white'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-500 opacity-60'
              }">
              <span class="truncate">${h.checked ? '☑' : '☐'} ${escapeHtmlAttr(h.label)}</span>
              ${habitBadge(h.value)}
            </button>
          `).join('')}
        </div>
      ` : ''}

      <button type="button" onclick="applyVoiceQuickLogDraft()" ${totalSelected === 0 ? 'disabled' : ''}
        class="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 font-semibold text-xs transition">
        ✓ Ausgewählte übernehmen (${totalSelected})
      </button>
    </div>
  `;
  previewEl.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
}

function applyVoiceQuickLogDraft() {
  if (!vqlDraft) return;
  const log = ensureDayLog(state.selectedDate);
  const now = Date.now();
  let mealCount = 0;
  let habitCount = 0;

  vqlDraft.meals.filter(m => m.checked).forEach((m, idx) => {
    log.entries.push({
      id: 'ent_' + (now + idx),
      name: `${m.name} (${m.grams}g)`,
      kcal: m.kcal,
      p: m.p,
      c: m.c,
      f: m.f
    });
    mealCount++;
  });

  vqlDraft.habitUpdates.filter(h => h.checked).forEach(h => {
    if (h.target === 'badHabit:alcohol') {
      log.badHabits.alcohol = h.value;
      habitCount++;
    } else if (h.target === 'badHabit:nicotine') {
      log.badHabits.cigarettes = h.value;
      log.badHabits.vape = h.value;
      habitCount++;
    } else if (h.target === 'badHabit:cigarettes') {
      log.badHabits.cigarettes = h.value;
      habitCount++;
    } else if (h.target === 'badHabit:vape') {
      log.badHabits.vape = h.value;
      habitCount++;
    } else if (h.target.startsWith('routine:')) {
      const rKey = h.target.slice(8);
      if (Object.prototype.hasOwnProperty.call(log.routines, rKey)) {
        log.routines[rKey] = h.value === 'yes';
        habitCount++;
      }
    } else if (h.target.startsWith('custom:')) {
      const cId = h.target.slice(7);
      const ch = getCustomHabitById(cId);
      if (ch) {
        log.customHabits[cId] = ch.type === 'avoid' ? h.value : (h.value === 'yes');
        habitCount++;
      }
    }
  });

  if (mealCount === 0 && habitCount === 0) return;
  vqlDraft = null;
  saveState();
  closeModal();
  render();
  const parts = [];
  if (mealCount > 0) parts.push(`${mealCount} Mahlzeit${mealCount === 1 ? '' : 'en'}`);
  if (habitCount > 0) parts.push(`${habitCount} Habit${habitCount === 1 ? '' : 's'}`);
  showToast(`✓ ${parts.join(' & ')} übernommen`);
}

// ---------- KI-SPRACHDIKTAT FÜR REZEPTE (GEMINI AUDIO & TEXT) ----------
let voiceRecipeAppendMode = false;
let voiceMediaRecorder = null;
let voiceAudioStream = null;
let voiceAudioChunks = [];
let voiceRecTimer = null;
let voiceRecSeconds = 0;

function stopVoiceRecipeStreamOnly() {
  clearInterval(voiceRecTimer);
  voiceRecTimer = null;
  if (voiceMediaRecorder && voiceMediaRecorder.state !== 'inactive') {
    try { voiceMediaRecorder.onstop = null; voiceMediaRecorder.stop(); } catch (e) {}
  }
  voiceMediaRecorder = null;
  if (voiceAudioStream) {
    voiceAudioStream.getTracks().forEach(t => t.stop());
    voiceAudioStream = null;
  }
}

function saveVoiceGeminiKey() {
  const inp = document.getElementById('voiceGeminiKeyInput');
  if (!inp || !inp.value.trim()) return;
  localStorage.setItem(GEMINI_KEY_STORAGE, inp.value.trim());
  const det = document.getElementById('voiceKeyDetails');
  if (det) det.open = false;
  showToast(appLang === 'es' ? '✓ Clave API guardada' : '✓ Gemini API Key gespeichert');
}

function openVoiceRecipeModal(appendToCurrent = false) {
  stopVoiceRecipeStreamOnly();
  voiceRecipeAppendMode = Boolean(appendToCurrent && editingRecipe);
  const savedKey = (localStorage.getItem(GEMINI_KEY_STORAGE) || '').trim();

  openModal(`
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-base font-semibold text-white">🎙️ Rezept per Sprache erfassen</h3>
          <p class="text-[11px] text-zinc-400">Zutaten & Mengen einfach vorlesen – Gemini baut das Rezept</p>
        </div>
        <button onclick="closeModal()" class="text-zinc-400 hover:text-white px-2 py-1">✕</button>
      </div>

      <details id="voiceKeyDetails" ${savedKey ? '' : 'open'} class="bg-zinc-950 border border-border rounded-2xl px-3 py-2">
        <summary class="cursor-pointer text-xs text-zinc-400 select-none">🔑 Gemini API Key konfigurieren</summary>
        <div class="flex gap-2 mt-2">
          <input id="voiceGeminiKeyInput" type="password" value="${savedKey}" placeholder="AIzaSy..."
            class="flex-1 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-border text-xs text-white" />
          <button type="button" onclick="saveVoiceGeminiKey()" class="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-white font-medium">
            Speichern
          </button>
        </div>
      </details>

      <div class="rounded-2xl bg-zinc-900/90 border border-border p-4 text-center space-y-3">
        <div id="voiceRecStatus" class="text-xs text-zinc-300">
          Beispiel: „Protein-Bowl mit 150 Gramm Hähnchen, 80 Gramm Reis, 150 Gramm Brokkoli und 10 Gramm Olivenöl“
        </div>
        <div id="voiceRecTimerBadge" class="hidden text-lg font-mono font-bold text-rose-400 animate-pulse">00:00</div>
        <button id="voiceRecMainBtn" type="button" onclick="toggleVoiceRecipeRecording()"
          class="w-full py-3.5 rounded-2xl bg-violet-500 hover:bg-violet-400 text-zinc-950 font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20">
          <span>🎙️</span><span>Aufnahme starten</span>
        </button>
      </div>

      <div class="space-y-2 pt-1 border-t border-border">
        <label class="text-[11px] text-zinc-400 block">Oder als Text eingeben / ergänzen:</label>
        <textarea id="voiceRecipeTextInput" rows="2" placeholder="z. B. Protein-Pfannkuchen: 80g Haferflocken, 2 Eier, 150g Magerquark, 1 Banane"
          class="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-border text-xs text-white focus:outline-none focus:border-violet-500"></textarea>
        <button id="voiceTextSubmitBtn" type="button" onclick="submitVoiceRecipeToGemini(null, null)"
          class="w-full py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-border text-zinc-200 font-semibold text-xs transition">
          ✨ Aus Text erstellen
        </button>
      </div>

      <div id="voiceRecipeError" class="hidden text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2"></div>
    </div>
  `);
}

function pickSupportedAudioMime() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return '';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return '';
}

async function toggleVoiceRecipeRecording() {
  const errEl = document.getElementById('voiceRecipeError');
  if (errEl) errEl.classList.add('hidden');

  const apiKey = (localStorage.getItem(GEMINI_KEY_STORAGE) || '').trim();
  if (!apiKey) {
    const det = document.getElementById('voiceKeyDetails');
    if (det) det.open = true;
    if (errEl) {
      errEl.textContent = appLang === 'es'
        ? 'Guarda primero tu clave API de Gemini arriba.'
        : 'Bitte zuerst oben deinen Gemini API Key speichern.';
      errEl.classList.remove('hidden');
    }
    return;
  }

  // Falls Aufnahme bereits läuft -> stoppen & direkt auswerten!
  if (voiceMediaRecorder && voiceMediaRecorder.state === 'recording') {
    clearInterval(voiceRecTimer);
    const btn = document.getElementById('voiceRecMainBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span>⏳</span><span>${appLang === 'es' ? 'Gemini está creando la receta...' : 'Gemini erstellt Rezept...'}</span>`;
    }
    voiceMediaRecorder.stop();
    return;
  }

  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error(appLang === 'es' ? 'Micrófono no disponible en este navegador.' : 'Mikrofon wird in diesem Browser nicht unterstützt.');
    }
    voiceAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = pickSupportedAudioMime();
    voiceAudioChunks = [];
    voiceMediaRecorder = mime ? new MediaRecorder(voiceAudioStream, { mimeType: mime }) : new MediaRecorder(voiceAudioStream);

    voiceMediaRecorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) voiceAudioChunks.push(ev.data);
    };

    voiceMediaRecorder.onstop = async () => {
      const actualMime = (voiceMediaRecorder && voiceMediaRecorder.mimeType) || mime || 'audio/webm';
      if (voiceAudioStream) {
        voiceAudioStream.getTracks().forEach(t => t.stop());
        voiceAudioStream = null;
      }
      voiceMediaRecorder = null;
      const blob = new Blob(voiceAudioChunks, { type: actualMime });
      if (!blob.size) return;
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result || '').split(',')[1] || '');
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      await submitVoiceRecipeToGemini(base64, actualMime.split(';')[0]);
    };

    voiceMediaRecorder.start();
    voiceRecSeconds = 0;
    const timerBadge = document.getElementById('voiceRecTimerBadge');
    const statusEl = document.getElementById('voiceRecStatus');
    const mainBtn = document.getElementById('voiceRecMainBtn');
    if (timerBadge) {
      timerBadge.textContent = '00:00';
      timerBadge.classList.remove('hidden');
    }
    if (statusEl) {
      statusEl.textContent = appLang === 'es'
        ? '🔴 Grabando… Di el nombre de la receta y los ingredientes con sus gramos.'
        : '🔴 Aufnahme läuft… Sprich Rezeptname und Zutaten mit Mengenangaben ein.';
    }
    if (mainBtn) {
      mainBtn.className = 'w-full py-3.5 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-rose-500/25';
      mainBtn.innerHTML = `<span>⏹</span><span>${appLang === 'es' ? 'Detener y crear receta' : 'Stopp & Rezept erstellen'}</span>`;
    }

    voiceRecTimer = setInterval(() => {
      voiceRecSeconds++;
      const mm = String(Math.floor(voiceRecSeconds / 60)).padStart(2, '0');
      const ss = String(voiceRecSeconds % 60).padStart(2, '0');
      const tb = document.getElementById('voiceRecTimerBadge');
      if (tb) tb.textContent = `${mm}:${ss}`;
    }, 1000);
  } catch (err) {
    stopVoiceRecipeStreamOnly();
    if (errEl) {
      errEl.textContent = (appLang === 'es' ? 'Error de micrófono: ' : 'Mikrofon-Fehler: ') + (err.message || err);
      errEl.classList.remove('hidden');
    }
  }
}

async function submitVoiceRecipeToGemini(audioBase64, audioMimeType) {
  const apiKey = (localStorage.getItem(GEMINI_KEY_STORAGE) || '').trim();
  const errEl = document.getElementById('voiceRecipeError');
  const textNote = (document.getElementById('voiceRecipeTextInput')?.value || '').trim();
  const mainBtn = document.getElementById('voiceRecMainBtn');
  const txtBtn = document.getElementById('voiceTextSubmitBtn');

  if (errEl) errEl.classList.add('hidden');
  if (!apiKey) {
    const det = document.getElementById('voiceKeyDetails');
    if (det) det.open = true;
    if (errEl) {
      errEl.textContent = appLang === 'es'
        ? 'Guarda primero tu clave API de Gemini arriba.'
        : 'Bitte zuerst oben deinen Gemini API Key speichern.';
      errEl.classList.remove('hidden');
    }
    return;
  }
  if (!audioBase64 && !textNote) {
    if (errEl) {
      errEl.textContent = appLang === 'es'
        ? 'Graba un audio o escribe los ingredientes abajo.'
        : 'Bitte zuerst eine Sprachaufnahme starten oder unten Text eingeben.';
      errEl.classList.remove('hidden');
    }
    return;
  }

  if (mainBtn) mainBtn.disabled = true;
  if (txtBtn) {
    txtBtn.disabled = true;
    txtBtn.textContent = appLang === 'es' ? '⏳ Creando receta...' : '⏳ Erstelle Rezept...';
  }

  const targetLang = appLang === 'es' ? 'Spanisch (Español)' : 'Deutsch';
  const promptText = `Du bist ein präziser Rezept-Assistent für eine Ernährungs-App. Extrahiere aus der gesprochenen Aufnahme${textNote ? ` bzw. dem Text ("${textNote}")` : ''} ein vollständiges Rezept mit allen genannten Zutaten.
WICHTIGE REGELN:
1. Benenne "recipeName" passend und prägnant auf ${targetLang} (falls kein Rezeptname genannt wurde, leite einen passenden Namen aus den Zutaten ab).
2. Benenne jede Zutat ("name") klar auf ${targetLang} (bei Stückzahlen z. B. "Eier (2 Stk.)" oder "Banane (1 Stk.)").
3. "grams" ist das tatsächliche Portionsgewicht dieser Zutat im Rezept in Gramm (wandle Stück, EL, TL, Becher, ml realistisch in Gramm um, z. B. 1 Ei = 55g, 1 EL Öl = 10g, 1 Banane = 120g).
4. ACHTUNG: "kcal100", "p100", "c100" und "f100" müssen zwingend die realistischen Nährwerte PRO 100 GRAMM des jeweiligen Lebensmittels sein (NICHT auf "grams" hochgerechnet!), da die App selbst mit (grams / 100) multipliziert.`;

  const parts = [{ text: promptText }];
  if (audioBase64) {
    parts.push({
      inlineData: {
        mimeType: audioMimeType || 'audio/webm',
        data: audioBase64
      }
    });
  }

  const modelsToTry = GEMINI_MODELS_TO_TRY;
  const requestBody = JSON.stringify({
    contents: [{ parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseJsonSchema: {
        type: 'object',
        properties: {
          recipeName: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                grams: { type: 'number' },
                kcal100: { type: 'number' },
                p100: { type: 'number' },
                c100: { type: 'number' },
                f100: { type: 'number' }
              },
              required: ['name', 'grams', 'kcal100', 'p100', 'c100', 'f100']
            }
          }
        },
        required: ['recipeName', 'items']
      }
    }
  });

  try {
    let res = null;
    let lastError = 'Unbekannter Fehler';
    for (const model of modelsToTry) {
      const controller = new AbortController();
      let timedOut = false;
      const timeoutId = setTimeout(() => {
        timedOut = true;
        try { controller.abort(); } catch (e) {}
      }, GEMINI_FETCH_TIMEOUT_MS);
      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
          signal: controller.signal
        });
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (timedOut) {
          lastError = `Zeitüberschreitung bei ${model}`;
          res = null;
          continue;
        }
        throw fetchErr;
      } finally {
        clearTimeout(timeoutId);
      }
      if (res.ok) break;
      const errData = await res.json().catch(() => ({}));
      lastError = errData.error?.message || `HTTP ${res.status}`;
      if (![404, 429, 500, 502, 503, 504].includes(res.status)) throw new Error(lastError);
      res = null;
    }
    if (!res) throw new Error(lastError);

    const result = await res.json();
    const rawJson = extractGeminiJsonText(result);
    const data = JSON.parse(rawJson);
    const now = Date.now();
    const newItems = (data.items || []).map((it, idx) => ({
      id: 'it_' + (now + idx),
      name: String(it.name || 'Zutat').trim(),
      grams: Math.max(1, Math.round(Number(it.grams) || 100)),
      kcal100: Math.max(0, Math.round(Number(it.kcal100) || 0)),
      p100: Math.max(0, Math.round((Number(it.p100) || 0) * 10) / 10),
      c100: Math.max(0, Math.round((Number(it.c100) || 0) * 10) / 10),
      f100: Math.max(0, Math.round((Number(it.f100) || 0) * 10) / 10)
    }));

    if (!newItems.length) {
      throw new Error(appLang === 'es' ? 'No se detectaron ingredientes.' : 'Es wurden keine Zutaten erkannt.');
    }

    if (voiceRecipeAppendMode && editingRecipe) {
      editingRecipe.items.push(...newItems);
      if ((!editingRecipe.name || editingRecipe.name === 'Neues Rezept' || editingRecipe.name === 'Nueva receta') && data.recipeName) {
        editingRecipe.name = data.recipeName.trim();
      }
    } else {
      editingRecipe = {
        id: 'rec_' + now,
        name: (data.recipeName || (appLang === 'es' ? 'Nueva receta' : 'Neues Rezept')).trim(),
        items: newItems
      };
    }

    currentTab = 'food';
    closeModal();
    render();
    showToast(appLang === 'es'
      ? `✓ ${newItems.length} ingredientes añadidos por voz`
      : `✓ ${newItems.length} Zutaten per Sprache übernommen`);
  } catch (err) {
    if (errEl) {
      errEl.textContent = (appLang === 'es' ? 'Error en el análisis: ' : 'Fehler bei der Auswertung: ') + (err.message || err);
      errEl.classList.remove('hidden');
    }
    if (mainBtn) {
      mainBtn.disabled = false;
      mainBtn.className = 'w-full py-3.5 rounded-2xl bg-violet-500 hover:bg-violet-400 text-zinc-950 font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20';
      mainBtn.innerHTML = `<span>🎙️</span><span>${appLang === 'es' ? 'Iniciar grabación' : 'Aufnahme starten'}</span>`;
    }
    if (txtBtn) {
      txtBtn.disabled = false;
      txtBtn.textContent = appLang === 'es' ? '✨ Crear desde texto' : '✨ Aus Text erstellen';
    }
  }
}

// ---------- SPRACHWECHSEL (DE ⇄ ES) ----------
const ES_EXACT = {
  // Header & Navigation
  '← Zurück': '← Volver',
  'Kalorien · Rezepte · Habits': 'Calorías · Recetas · Hábitos',
  'Daten sichern / wiederherstellen': 'Guardar / restaurar datos',
  'Backup': 'Copia',
  'Heute': 'Hoy',
  'Gestern': 'Ayer',
  'Food': 'Comida',
  'Sport': 'Deporte',
  'Habits': 'Hábitos',

  // Dashboard & Tagesbilanz
  'Schnell-Check': 'Chequeo rápido',
  'Details →': 'Detalles →',
  'Gym / Krafttraining': 'Gym / Fuerza',
  'Laufen': 'Correr',
  'Surfen / Mobility': 'Surf / Movilidad',
  "Optionaler Hinweis (z. B. 'in 1 EL Olivenöl gebraten' oder nur Text)": "Nota opcional (ej. 'frito con 1 cda de aceite' o solo texto)",
  'Tagesbilanz': 'Balance diario',
  'Gewicht & Körperwerte': 'Peso y cuerpo',
  '+ Mahlzeit': '+ Comida',
  'Protein': 'Proteína',
  'Carbs': 'Carbohidratos',
  'Fett': 'Grasa',
  'Kalorien': 'Calorías',
  'Berechnung des Tagesbedarfs anzeigen': 'Mostrar cálculo del gasto diario',
  'Info zur Berechnung des Tagesbedarfs': 'Info sobre el cálculo del gasto diario',
  'Berechnung Tagesbedarf': 'Cálculo del gasto diario',
  'Grundumsatz (BMR)': 'Metabolismo basal (BMR)',
  'Alltagsbedarf (Basis)': 'Gasto cotidiano (base)',
  'Ziel-Offset (Defizit / Überschuss)': 'Ajuste de objetivo (déficit / superávit)',
  'Tagesbedarf gesamt': 'Gasto diario total',
  'Verstanden': 'Entendido',
  'Eintrag löschen': 'Eliminar entrada',

  // Kalorien- & Makro-Verlauf
  'Kalorien- & Makro-Verlauf': 'Historial de calorías y macros',
  'Aufnahme (P/C/F) vs. Tagesverbrauch': 'Ingesta (P/C/G) vs. gasto diario',
  'Aufnahme:': 'Ingesta:',
  'Verbrauch:': 'Gasto:',
  'Verbrauch': 'Gasto',
  'Keine Mahlzeiten': 'Sin comidas',
  'Öffnen': 'Abrir',
  'Ø Protein': 'Ø Proteína',
  'Ø Carbs': 'Ø Carbos',
  'Ø Fett': 'Ø Grasa',
  '7T': '7D',
  '14T': '14D',
  '30T': '30D',
  '90T': '90D',
  '1J': '1A',
  '5J': '5A',

  // Körperwerte & FitDays
  'FitDays CSV': 'CSV FitDays',
  '30T-Pflege': 'Edición 30D',
  '+ Gewicht': '+ Peso',
  'Aktuelles Gewicht': 'Peso actual',
  'Körperfett': 'Grasa corporal',
  'Smartwaage': 'Báscula inteligente',
  'Muskelmasse': 'Masa muscular',
  'Bio-Alter': 'Edad bio.',
  'Stoffwechsel': 'Metabolismo',
  'Gewicht': 'Peso',
  'Biol. Alter': 'Edad biol.',
  'BMI': 'IMC',
  'Subkutanfett': 'Grasa subcutánea',
  'Viszeralfett': 'Grasa visceral',
  'Körperwasser': 'Agua corporal',
  'Skelettmuskel': 'Músculo esquelético',
  'Knochenmasse': 'Masa ósea',
  'Herzfrequenz': 'Frecuencia cardíaca',
  'Herzindex': 'Índice cardíaco',
  'Basis': 'Base',
  'Muskel & Wasser': 'Músculo y agua',
  'Herz & Stoffwechsel': 'Corazón y metabolismo',
  'Einzelne Kennzahlen wählen': 'Elegir métricas individuales',
  'Kennzahlen im Chart': 'Métricas en el gráfico',
  'Fertig': 'Listo',
  '(fortg.)': '(est.)',
  'Körperwerte eintragen': 'Registrar valores corporales',
  'Datum der Messung': 'Fecha de medición',
  'Datum': 'Fecha',
  'Fett %': '% Grasa',
  'Muskel': 'Músculo',
  'Alter': 'Edad',
  'Tagesziele anpassen': 'Ajustar objetivos diarios',
  'Ziele speichern': 'Guardar objetivos',
  'Alle 30 Tage speichern (Enter)': 'Guardar los 30 días (Enter)',
  '0 = Erhalt, -300 = Defizit': '0 = mantenimiento, -300 = déficit',

  // Food, KI, Rezepte & Barcode
  'KI-Analyse': 'Análisis IA',
  'Meine Rezepte': 'Mis recetas',
  'Vorlagen auswählen, loggen oder flexibel anpassen': 'Elige plantillas, regístralas o ajústalas',
  '+ Neues Rezept': '+ Nueva receta',
  'Neues Rezept': 'Nueva receta',
  'Rezept-Baukasten': 'Editor de recetas',
  'Abbrechen': 'Cancelar',
  'Rezeptname': 'Nombre de la receta',
  '💡 Vorschlag:': '💡 Sugerencia:',
  'Entfernen': 'Quitar',
  'Zutat entfernen': 'Quitar ingrediente',
  'Gramm-Angabe übernehmen': 'Confirmar gramos',
  'Übernehmen': 'Confirmar',
  'Zutat hinzufügen': 'Añadir ingrediente',
  'Barcode scannen': 'Escanear código',
  'Diktieren': 'Dictar',
  'Einsprechen': 'Dictar',
  '🎙️ Rezept per Sprache erfassen': '🎙️ Dictar receta por voz',
  'Zutaten & Mengen einfach vorlesen – Gemini baut das Rezept': 'Lee los ingredientes y gramos: Gemini crea la receta',
  'Aufnahme starten': 'Iniciar grabación',
  'Oder als Text eingeben / ergänzen:': 'O escríbelo / complétalo como texto:',
  'z. B. Protein-Pfannkuchen: 80g Haferflocken, 2 Eier, 150g Magerquark, 1 Banane': 'ej. Tortitas proteicas: 80g avena, 2 huevos, 150g queso fresco, 1 plátano',
  '✨ Aus Text erstellen': '✨ Crear desde texto',
  'Menge in Gramm': 'Cantidad en gramos',
  'Gramm-Angabe bestätigen': 'Confirmar gramos',
  'Bestätigen': 'Confirmar',
  '✓ Ins Rezept übernehmen': '✓ Añadir a la receta',
  'Deutsch suchen (z. B. rote Zwiebeln, Olivenöl, Tofu…)': 'Buscar alimento (ej. pollo, arroz, cebolla, avena…)',
  'Lebensmittel eingeben (z. B. Zwiebeln, Haferflocken, Quark)...': 'Escribe un alimento (ej. cebolla, avena, pollo)...',
  'Suchen': 'Buscar',
  'Speichern': 'Guardar',
  'Als Kopie': 'Como copia',
  'Heute loggen': 'Registrar hoy',
  'Rezept anpassen': 'Editar receta',
  'Rezept löschen': 'Eliminar receta',
  'Mahlzeit eintragen': 'Registrar comida',
  'Aus deinen Rezepten': 'De tus recetas',
  'Loggen': 'Registrar',
  'Schnelleingabe': 'Entrada rápida',
  'Bezeichnung (z. B. Snack)': 'Nombre (ej. snack)',
  'Eintrag speichern': 'Guardar entrada',
  'Suche läuft...': 'Buscando...',
  'Keine Treffer gefunden.': 'No se encontraron resultados.',
  'Suche in Open Food Facts & USDA...': 'Buscando en Open Food Facts y USDA...',
  'Barcode-Scanner & Portion': 'Escáner de código y porción',
  'Kamera wird gestartet…': 'Iniciando cámara…',
  'EAN-Code manuell eingeben (z. B. 4000417025005)': 'Introducir código EAN manualmente',
  'Menge (g):': 'Cantidad (g):',
  '+ Ins Tages-Log': '+ Al registro diario',
  '+ Ins Rezept': '+ A la receta',
  '✨ KI-Mahlzeit scannen': '✨ Escanear comida con IA',
  '🔑 Gemini API Key konfigurieren': '🔑 Configurar clave API de Gemini',
  '📸 Kamera': '📸 Cámara',
  '🖼️ Galerie': '🖼️ Galería',
  '✨ Jetzt analysieren': '✨ Analizar ahora',
  '✓ API Key lokal gespeichert.': '✓ Clave API guardada localmente.',
  'Bitte zuerst deinen Gemini API Key oben speichern.': 'Guarda primero tu clave API de Gemini arriba.',
  'Bitte ein Foto aufnehmen oder zumindest kurz beschreiben, was du gegessen hast.': 'Toma una foto o describe brevemente lo que comiste.',
  'Keine Zutaten mehr in der Liste.': 'No quedan ingredientes en la lista.',
  'Als Einzelzutaten': 'Por ingredientes',
  'Als 1 Gericht': 'Como 1 plato',
  '📖 Als Rezept speichern': '📖 Guardar como receta',

  // Sport, Anatomie & Live-Workout
  'Training starten': 'Iniciar entrenamiento',
  'Aus bisherigem Workout starten oder frei anlegen': 'Desde entrenamiento previo o sesión libre',
  'Freie Einheit starten': 'Iniciar sesión libre',
  'Neue Einheit': 'Nueva sesión',
  'Neu': 'Nuevo',
  '+ Neu': '+ Nuevo',
  'RepCount CSV importieren': 'Importar CSV de RepCount',
  'RepCount CSV-Import': 'Importación CSV de RepCount',
  'Importiert Workouts und vereinheitlicht Übungsnamen automatisch': 'Importa entrenamientos y unifica nombres automáticamente',
  'CSV importieren': 'Importar CSV',
  '☁️ Aus Cloud laden': '☁️ Cargar de la nube',
  'Auf diesem Gerät sind aktuell 0 Workouts gespeichert.': 'Actualmente hay 0 entrenamientos guardados en este dispositivo.',
  'Aktuelle Leistungen': 'Rendimiento actual',
  '⚙ Auswahl': '⚙ Selección',
  'KPI-Übungen anpassen': 'Personalizar ejercicios clave',
  'KPI-Übungen wählen': 'Elegir ejercicios clave',
  'Welche Übungen sollen in deiner Leistungsübersicht stehen?': '¿Qué ejercicios quieres ver en tu resumen de rendimiento?',
  'Muskel-Fokus': 'Enfoque muscular',
  'Muskel-Fokus dieser Einheit anzeigen': 'Mostrar enfoque muscular de esta sesión',
  'VORDERSEITE': 'FRONTAL',
  'RÜCKSEITE': 'ESPALDA',
  'Einheit': 'Sesión',
  'Leicht': 'Ligero',
  'Mittel': 'Medio',
  'Top-Fokus': 'Máximo foco',
  'Keine Kraftsätze in diesem Zeitraum.': 'Sin series de fuerza en este período.',
  'Sätze nach Muskelgruppe': 'Series por grupo muscular',
  'Rücken': 'Espalda',
  'Brust': 'Pecho',
  'Beine': 'Piernas',
  'Schultern': 'Hombros',
  'Trizeps': 'Tríceps',
  'Bizeps': 'Bíceps',
  'Bauch/Core': 'Abdomen/Core',
  'Sonstige': 'Otros',
  'Fortschritt & Bestleistungen': 'Progreso y récords',
  'Volumen': 'Volumen',
  'Max. Wdh.': 'Reps máx.',
  'Alle': 'Todos',
  'Verlauf': 'Historial',
  'Suche (Übung, Gym…)': 'Buscar (ejercicio, gym…)',
  'Suche nach Training oder Übung (z. B. Hygia, Dips…)': 'Buscar sesión o ejercicio (ej. press, dominadas…)',
  'Übung suchen oder neuen Namen tippen…': 'Buscar ejercicio o escribir nombre nuevo…',
  'Keine Einträge in diesem Zeitraum.': 'Sin entradas en este período.',
  'Keine passenden Workouts im Verlauf gefunden.': 'No se encontraron entrenamientos coincidentes.',
  'Als Vorlage für neues Training nutzen': 'Usar como plantilla para nuevo entreno',
  'Als Vorlage nutzen': 'Usar plantilla',
  '📋 Vorlage': '📋 Plantilla',
  '📋 Bisheriges Training als Vorlage laden': '📋 Cargar entrenamiento previo como plantilla',
  'Vorlage aus Verlauf wählen': 'Elegir plantilla del historial',
  'Bearbeiten': 'Editar',
  'Löschen': 'Eliminar',
  'Verwerfen': 'Descartar',
  'Einheit bearbeiten': 'Editar sesión',
  'Trainingsname': 'Nombre del entrenamiento',
  'Pausen-Timer': 'Temporizador de descanso',
  'Übung hinzufügen': 'Añadir ejercicio',
  'Tauschen': 'Cambiar',
  'Übung austauschen': 'Cambiar ejercicio',
  'Übung entfernen': 'Quitar ejercicio',
  'Nach oben verschieben': 'Mover arriba',
  'Nach unten verschieben': 'Mover abajo',
  'Satz': 'Serie',
  'Satz abhaken': 'Marcar serie',
  'Satz entfernen': 'Quitar serie',
  'Satz-Typ wechseln (Normal / Warm-up / Dropset)': 'Cambiar tipo de serie (Normal / Calentamiento / Dropset)',
  'Wdh.': 'Reps',
  'Sek.': 'Seg.',
  'Auto aus Timer': 'Auto del cronómetro',
  'Gefühl, Energie, Hinweise…': 'Sensaciones, energía, notas…',
  '🏁 Training beendet & speichern': '🏁 Finalizar y guardar entreno',
  'Änderungen speichern': 'Guardar cambios',
  'Übungsnamen konsolidieren': 'Unificar nombres de ejercicios',
  'Bereinigen': 'Unificar',

  // Habits, Heatmaps & Insights
  '30-Tage-Heatmap': 'Mapa de calor de 30 días',
  'Tippe auf einen Tag zum Umschalten (Grün / Rot / Gelb)': 'Toca un día para cambiar (Verde / Rojo / Amarillo)',
  '🍷 Alkohol': '🍷 Alcohol',
  '💨 Nikotin': '💨 Nicotina',
  '⚡ Sport': '⚡ Deporte',
  '✨ Routine': '✨ Rutina',
  '💨 Nikotin (30 Tage)': '💨 Nicotina (30 días)',
  '✨ Routine & Supplements (30 Tage)': '✨ Rutina y suplementos (30 días)',
  '🚬 Zigaretten': '🚬 Cigarrillos',
  '💨 Vape': '💨 Vapeo',
  '💊 Kreatin': '💊 Creatina',
  '🧴 Skincare': '🧴 Skincare',
  '💊 Sertralin': '💊 Sertralina',
  'Kreatin': 'Creatina',
  'Sertralin': 'Sertralina',
  'Alkohol': 'Alcohol',
  'Nikotin': 'Nicotina',
  'Zigaretten': 'Cigarrillos',
  'Ja': 'Sí',
  'Nein': 'No',
  'Nicht erfasst': 'Sin registrar',
  'Absolviert': 'Completado',
  'Clean': 'Limpio',
  'Konsumiert': 'Consumido',
  'Letzte 30 Tage': 'Últimos 30 días',
  'Routine & Supplements': 'Rutina y suplementos',
  'Habit-Korrelations-Insights': 'Correlaciones de hábitos',
  'Live-Muster aus Workouts, Makros, Körperwerten & Routinen (30T)': 'Patrones en vivo de entrenos, macros, cuerpo y rutinas (30D)',
  'Konsum & Verzicht Übersicht': 'Resumen de consumo y abstinencia',
  'Training & Nikotin-Balance': 'Entrenamiento y nicotina',
  'Training & Verzicht-Korrelation': 'Correlación entreno y abstinencia',
  'Protein an Trainingstagen': 'Proteína en días de entreno',
  'Protein-Versorgung': 'Ingesta de proteína',
  'Protein & Trainings-Korrelation': 'Correlación proteína y entreno',
  'Kalorienbilanz & Körpertrend': 'Balance calórico y tendencia corporal',
  'Alkohol-Effekt (Kalorien & Waage)': 'Efecto del alcohol (calorías y báscula)',
  'Routine-Konstanz (Kreatin · Skincare · Sertralin)': 'Constancia de rutina (Creatina · Skincare · Sertralina)',
  'Routine-Konstanz & Clean-Korrelation': 'Constancia de rutina y días limpios',
  'Wochentags-Muster': 'Patrón por día de la semana',
  '30T-Rhythmus': 'Ritmo 30D',
  'Wartet auf Logs': 'Esperando registros',
  'Sammelt Daten': 'Recopilando datos',

  // Cloud-Sync & Backup
  'Cloud-Sync & Backup': 'Sincronización y copia',
  '☁️ Supabase Auto-Sync': '☁️ Auto-Sync con Supabase',
  'Aktiv': 'Activo',
  'Nicht eingerichtet': 'No configurado',
  'Verbinde...': 'Conectando...',
  'Sende in Cloud...': 'Enviando a la nube...',
  'Sync starten': 'Iniciar Sync',
  '↑ Senden': '↑ Enviar',
  '↓ Laden': '↓ Cargar',
  'Daten dieses Geräts in die Cloud senden': 'Enviar datos de este dispositivo a la nube',
  'Cloud-Stand direkt auf dieses Gerät laden': 'Cargar estado de la nube en este dispositivo',
  'Als Excel-Tabelle exportieren (.csv)': 'Exportar como tabla Excel (.csv)',
  'Komplett-Backup herunterladen (.json)': 'Descargar copia completa (.json)',
  'JSON-Backup wiederherstellen': 'Restaurar copia JSON',
  '⚙ Server-Verbindung (fest hinterlegt)': '⚙ Conexión al servidor (preconfigurada)',
  'Bitte deinen persönlichen Sync-Key eingeben.': 'Introduce tu clave personal de Sync.',
  'Dein persönlicher Sync-Key (z. B. alex-ff-2026)': 'Tu clave personal de Sync (ej. alex-ff-2026)'
};

const ES_WEEKDAY_MAP = {
  'Montag': 'lunes', 'Dienstag': 'martes', 'Mittwoch': 'miércoles',
  'Donnerstag': 'jueves', 'Freitag': 'viernes', 'Samstag': 'sábado', 'Sonntag': 'domingo'
};

const ES_PATTERNS = [
  [/^(\d+) Messungen gespeichert · ab (.+)$/, '$1 mediciones guardadas · desde $2'],
  [/^(\d+) Messungen gespeichert$/, '$1 mediciones guardadas'],
  [/^Stand (.+)$/, 'Fecha $1'],
  [/^([+\-]?[\d.,]+) kg Trend$/, 'Tendencia $1 kg'],
  [/^([\d.,]+) J\.$/, '$1 a.'],
  [/^Noch keine Mahlzeiten für (.+) eingetragen\.$/, 'Aún no hay comidas registradas para $1.'],
  [/^([\d.,]+) kg · Basis (\d+)(.*)$/, (_, w, b, rest) => `${w} kg · Base ${b}${rest.replace(' Sport', ' Deporte').replace(' Ziel', ' Obj.')}`],
  [/^⚡ \+(\d+) Sport$/, '⚡ +$1 Deporte'],
  [/^([+\-−]\d+) kcal Defizit$/, '$1 kcal déficit'],
  [/^([+\-−]\d+) kcal Überschuss$/, '$1 kcal superávit'],
  [/^Ø kcal \((\d+)T\)$/, 'Ø kcal ($1D)'],
  [/^Bed\. ([\d.,]+)$/, 'Gasto $1'],
  [/^Sobald du Mahlzeiten einträgst, erscheinen hier deine täglichen Kalorien- und Makro-Balken im Vergleich zum Tagesverbrauch \(([\d.,]+) kcal Ø\)\.$/, 'Cuando registres comidas, verás aquí tus barras diarias de calorías y macros frente al gasto diario ($1 kcal Ø).'],
  [/^Dynamische Formel für (.+)$/, 'Fórmula dinámica para $1'],
  [/^Sport-Bonus: (.+)$/, 'Bono deporte: $1'],
  [/^Sport-Bonus \((.+)\)$/, 'Bono deporte ($1)'],
  [/^Grundumsatz × ([\d,]+) \(Büro \/ Alltag ohne Sport\)$/, 'Metabolismo basal × $1 (oficina / día sin deporte)'],
  [/^(\d+) von (\d+) aktiv \(mind\. 1 bleibt sichtbar\)$/, '$1 de $2 activas (mín. 1 visible)'],
  [/^Zutaten \((\d+)\)$/, 'Ingredientes ($1)'],
  [/^✓ „(.+)“ auf der Startseite hinzugefügt$/, '✓ «$1» añadido al balance diario'],
  [/^Synchron \((\d+) Wo\. · (.+)\)$/, 'Sincronizado ($1 entr. · $2)'],
  [/^Gesendet \((\d+) Wo\., (\d+) KB · (.+)\)$/, 'Enviado ($1 entr., $2 KB · $3)'],
  [/^Geladen \((\d+) Wo\. · (.+)\)$/, 'Cargado ($1 entr. · $2)'],
  [/^Tägliche Basics für (.+)$/, 'Básicos diarios para $1'],
  [/^(\d+)\/3 erledigt$/, '$1/3 completados'],
  [/^(\d+)d clean$/, '$1d limpio'],
  [/^(\d+)d Streak$/, 'Racha $1d'],
  [/^Ja · (\d+)d Streak$/, 'Sí · Racha $1d'],
  [/^(\d+)\/30 aktiv$/, '$1/30 activos'],
  [/^(\d+) Sporttage$/, '$1 días deporte'],
  [/^(\d+) % Ziel$/, '$1 % obj.'],
  [/^(\d+)\/30T 3\/3$/, '$1/30D 3/3'],
  [/^(\d+)\/3 Tage$/, '$1/3 días'],
  [/^(\d+)T Bilanz$/, 'Balance $1D'],
  [/^Zigaretten: (\d+)d · Vape: (\d+)d$/, 'Cigarrillos: $1d · Vapeo: $2d'],
  [/^Auf diesem Gerät:$/, 'En este dispositivo:'],
  [/^Workouts ·$/, 'Entrenos ·'],
  [/^Gewichtstage ·$/, 'Días de peso ·'],
  [/^Rezepte$/, 'Recetas']
];

function translateTextDeToEs(raw) {
  if (!raw || appLang !== 'es') return raw;
  const lead = raw.match(/^\s*/)[0];
  const trail = raw.match(/\s*$/)[0];
  const trimmed = raw.trim();
  if (!trimmed) return raw;

  if (Object.prototype.hasOwnProperty.call(ES_EXACT, trimmed)) {
    return lead + ES_EXACT[trimmed] + trail;
  }

  for (let i = 0; i < ES_PATTERNS.length; i++) {
    const [rx, rep] = ES_PATTERNS[i];
    if (rx.test(trimmed)) {
      return lead + trimmed.replace(rx, rep) + trail;
    }
  }

  let out = trimmed;
  let changed = false;
  const subPairs = [
    ['An Trainingstagen (', 'En días de entreno ('],
    [' aktiv in 30T) bist du zu ', ' activos en 30D) estás un '],
    [' nikotinfrei – gegenüber ', ' libre de nicotina, frente a '],
    [' an Ruhetagen', ' en días de descanso'],
    ['%-Punkte', ' pts. %'],
    ['An Trainingstagen liegt deine nikotinfreie Quote bei ', 'En días de entreno tu tasa sin nicotina es de '],
    ['Ruhetage:', 'Descanso:'],
    ['Inkl. Sport-Tab wurden ', 'Incluyendo Deporte se detectaron '],
    [' Trainingstage', ' días de entreno'],
    [' erkannt. Sobald je mind. 2 Trainings- und Ruhetage mit Nikotin-Status erfasst sind, erscheint dein Vergleich', '. Con al menos 2 días de entreno y 2 de descanso registrados verás la comparación'],
    ['An Trainingstagen erreichst du im Schnitt ', 'En días de entreno alcanzas de media '],
    [' g Protein', ' g de proteína'],
    ['(Ziel: ', '(obj.: '],
    ['Sobald du Mahlzeiten einträgst, vergleicht diese Karte deine Protein-Zufuhr zwischen Trainings- und Ruhetagen direkt gegen dein Ziel', 'Cuando registres comidas, esta tarjeta comparará tu proteína en días de entreno vs. descanso frente a tu objetivo'],
    ['Gewicht in 30T:', 'Peso en 30D:'],
    [', Körperfett ', ', grasa corporal '],
    ['Ø Kalorienbilanz über ', 'Ø Balance calórico en '],
    [' erfasste Tage: ', ' días registrados: '],
    [' kcal Defizit', ' kcal de déficit'],
    [' kcal Überschuss', ' kcal de superávit'],
    ['/Tag zum dynamischen Verbrauch.', '/día respecto al gasto dinámico.'],
    ['Trage Mahlzeiten ein, um den 30T-Gewichtstrend direkt mit deinem täglichen Kaloriendefizit abzugleichen.', 'Registra comidas para cruzar tu tendencia de peso de 30D con tu déficit calórico diario.'],
    ['An Alkohol-Tagen nimmst du im Schnitt ', 'En días con alcohol ingieres de media '],
    [' kcal gegenüber Clean-Tagen mit ', ' kcal frente a días limpios con '],
    ['Waage am Folgetag:', 'Báscula al día siguiente:'],
    [' nach Alkohol vs. ', ' tras alcohol vs. '],
    [' nach Clean-Tagen.', ' tras días limpios.'],
    ['Sobald mindestens je 1 Alkohol- und 1 Clean-Tag mit Mahlzeiten oder Folgetags-Gewicht erfasst sind, siehst du hier Kalorien- und Waagen-Delta.', 'Con al menos 1 día con alcohol y 1 día limpio registrados verás aquí la diferencia en calorías y báscula.'],
    [' von 30 Tagen', ' de 30 días'],
    [' waren alle 3 Routinen komplett.', ' completaste las 3 rutinas.'],
    ['Am konstantesten:', 'Más constante:'],
    [', Ausbaupotenzial bei ', ', margen de mejora en '],
    ['An 3/3-Routine-Tagen bist du zu ', 'En días de rutina 3/3 estás un '],
    [' komplett clean (vs. ', ' totalmente limpio (vs. '],
    [' an unvollständigen Tagen). Stärkste Routine:', ' en días incompletos). Mejor rutina:'],
    ['Hake Kreatin, Skincare und Sertralin regelmäßig ab – ab 3 erfassten Tagen zeigt dir diese Karte deine Routine-Stabilität und den Zusammenhang mit Clean-Tagen.', 'Marca Creatina, Skincare y Sertralina regularmente: a partir de 3 días verás tu constancia y su relación con días limpios.'],
    ['Stärkster Trainingstag:', 'Día más fuerte de entreno:'],
    [' in 30T).', ' en 30D).'],
    ['Konsum trat am häufigsten am ', 'El consumo fue más frecuente el '],
    [' Ereignisse).', ' veces).'],
    [' auf (', ' ('],
    ['clean ·', 'limpios ·'],
    ['kons. ·', 'cons. ·'],
    ['ja ·', 'sí ·'],
    ['nein ·', 'no ·'],
    ['offen', 'abiertos'],
    ['Gesamt:', 'Total:'],
    ['Komplett:', 'Completos:'],
    ['Aktive Bereiche:', 'Áreas activas:'],
    ['sowie', 'y'],
    ['(gebündelt aus', '(agrupa'],
    ['und', 'y']
  ];
  for (let i = 0; i < subPairs.length; i++) {
    if (out.includes(subPairs[i][0])) {
      out = out.split(subPairs[i][0]).join(subPairs[i][1]);
      changed = true;
    }
  }
  if (changed) {
    Object.keys(ES_WEEKDAY_MAP).forEach(deWd => {
      if (out.includes(deWd)) out = out.split(deWd).join(ES_WEEKDAY_MAP[deWd]);
    });
    return lead + out + trail;
  }
  return raw;
}

let isApplyingI18n = false;
let i18nObserver = null;

function applyI18nToSubtree(root, storeOriginals = false) {
  if (!root || typeof document === 'undefined' || typeof document.createTreeWalker !== 'function') return;
  isApplyingI18n = true;
  try {
    const attrs = ['placeholder', 'title', 'aria-label'];
    const els = root.querySelectorAll ? [root, ...root.querySelectorAll('*')] : [];
    els.forEach(el => {
      if (!el || !el.getAttribute) return;
      if (el.id === 'langToggleBtn' || el.closest?.('#langToggleBtn')) return;
      attrs.forEach(attr => {
        const origKey = `data-orig-${attr}`;
        const cur = el.getAttribute(attr);
        if (cur === null) return;
        if (storeOriginals && !el.hasAttribute(origKey)) {
          el.setAttribute(origKey, cur);
        }
        const baseVal = el.hasAttribute(origKey) ? el.getAttribute(origKey) : cur;
        const targetVal = appLang === 'es' ? translateTextDeToEs(baseVal) : baseVal;
        if (cur !== targetVal) el.setAttribute(attr, targetVal);
      });
    });

    const walker = document.createTreeWalker(root, 4);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent) continue;
      const tag = parent.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE') continue;
      if (parent.id === 'langToggleBtn' || parent.closest?.('#langToggleBtn')) continue;

      if (storeOriginals && node._origDe === undefined) {
        node._origDe = node.nodeValue;
      }
      const baseText = node._origDe !== undefined ? node._origDe : node.nodeValue;
      const nextText = appLang === 'es' ? translateTextDeToEs(baseText) : baseText;
      if (node.nodeValue !== nextText) {
        node.nodeValue = nextText;
      }
    }
  } finally {
    if (i18nObserver) i18nObserver.takeRecords();
    isApplyingI18n = false;
  }
}

function syncStaticShellLanguage() {
  if (typeof document === 'undefined') return;
  if (document.documentElement) document.documentElement.lang = appLang;
  if (document.title) {
    document.title = appLang === 'es'
      ? 'Fuel & Flow — Calorías, Recetas y Hábitos'
      : 'Fuel & Flow — Kalorien, Rezepte & Habits';
  }
  const deSpan = document.getElementById('langBadgeDe');
  const esSpan = document.getElementById('langBadgeEs');
  if (deSpan && esSpan) {
    deSpan.className = appLang === 'de' ? 'text-emerald-400 font-bold' : 'text-zinc-500';
    esSpan.className = appLang === 'es' ? 'text-emerald-400 font-bold' : 'text-zinc-500';
  }
  ['header', 'nav', '#barcodeModal'].forEach(sel => {
    const el = document.querySelector?.(sel);
    if (el) applyI18nToSubtree(el, true);
  });
}

function toggleAppLanguage() {
  appLang = appLang === 'es' ? 'de' : 'es';
  try { localStorage.setItem(LANG_STORAGE_KEY, appLang); } catch (e) {}
  syncStaticShellLanguage();
  render();
  const appRoot = document.getElementById('app-content');
  if (appRoot && appLang === 'es') applyI18nToSubtree(appRoot, false);
  showToast(appLang === 'es' ? '🇪🇸 Idioma cambiado a Español' : '🇩🇪 Sprache auf Deutsch gewechselt');
}

syncStaticShellLanguage();
render();
if (appLang === 'es' && typeof document !== 'undefined') {
  applyI18nToSubtree(document.getElementById('app-content'), false);
}
if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined' && document.body) {
  i18nObserver = new MutationObserver((mutations) => {
    if (isApplyingI18n || appLang !== 'es') return;
    mutations.forEach(m => {
      if (m.target && m.target.nodeType === 1) {
        applyI18nToSubtree(m.target, false);
      }
    });
  });
  i18nObserver.observe(document.body, { childList: true, subtree: true });
}

pullStateFromCloud();
updateOfflineBanner();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    pullStateFromCloud();
  } else if (hasPendingLocalPush && !isAppOffline()) {
    clearTimeout(syncTimer);
    pushStateToCloud(true);
  }
});
window.addEventListener('focus', () => pullStateFromCloud());
window.addEventListener('online', () => {
  syncRetryAttempt = 0;
  clearTimeout(syncRetryTimer);
  updateOfflineBanner();
  // Immer zuerst Pull -> Merge -> Push, damit parallele Offline-Änderungen beider Geräte verschmolzen werden
  syncNowWithMerge();
});
window.addEventListener('offline', () => {
  const cnt = syncMeta.pendingCount;
  setSyncStatusText(cnt > 0 ? `Offline · lokal gespeichert (${cnt} offen)` : 'Offline · lokal gespeichert', false, 'offline');
});
window.addEventListener('pagehide', () => {
  if (hasPendingLocalPush && !isAppOffline()) {
    clearTimeout(syncTimer);
    pushStateToCloud(true);
  }
});
setInterval(() => {
  if (document.visibilityState === 'visible' && !isAppOffline()) {
    pullStateFromCloud();
  }
}, 5000);
