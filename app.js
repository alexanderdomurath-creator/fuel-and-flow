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
        parsed.sportHabits = Array.isArray(parsed.sportHabits) ? parsed.sportHabits : [];
        parsed.workouts = Array.isArray(parsed.workouts) ? parsed.workouts : [];
        const rawW = Array.isArray(parsed.weightHistory) ? parsed.weightHistory : [];
        parsed.weightHistory = stripDemoWeightEntries(rawW);
        if (parsed.weightHistory.length < rawW.length) {
          removedDemoWeightsOnLoad = true;
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed)); } catch (e) {}
        }
        parsed.logs = parsed.logs && typeof parsed.logs === 'object' ? parsed.logs : {};
        return parsed;
      }
    }
  } catch (e) {}
  return buildInitialState();
})();

// ---------- SUPABASE CLOUD SYNC ----------
const SYNC_CFG_KEY = 'fuel_and_flow_sync_cfg';
let syncTimer = null;
let lastRemoteTimestamp = null;
let hasPendingLocalPush = false;
let isSyncInFlight = false;
let lastSyncStatusMsg = '';
let lastSyncStatusErr = false;

function normalizeLoadedState(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  obj.recipes = Array.isArray(obj.recipes) ? obj.recipes : [];
  obj.sportHabits = Array.isArray(obj.sportHabits) ? obj.sportHabits : [];
  obj.workouts = Array.isArray(obj.workouts) ? obj.workouts : [];
  obj.weightHistory = stripDemoWeightEntries(Array.isArray(obj.weightHistory) ? obj.weightHistory : []);
  obj.logs = obj.logs && typeof obj.logs === 'object' ? obj.logs : {};
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
  const localNewer = (loc._updatedAt || '') >= (rem._updatedAt || '');
  const primary = localNewer ? loc : rem;
  const secondary = localNewer ? rem : loc;

  const merged = { ...secondary, ...primary };
  merged.workouts = mergeByKey(primary.workouts, secondary.workouts, w => w.id)
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.id || '').localeCompare(String(b.id || '')));
  merged.weightHistory = mergeByKey(primary.weightHistory, secondary.weightHistory, w => w.date)
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
  merged.recipes = mergeByKey(primary.recipes, secondary.recipes, r => r.id);
  merged.sportHabits = mergeByKey(primary.sportHabits, secondary.sportHabits, h => h.id);

  // Tageslogs zusammenführen, ohne Einträge oder Habits von einem Gerät zu verlieren
  const mergedLogs = { ...(secondary.logs || {}) };
  Object.keys(primary.logs || {}).forEach(dateKey => {
    const pLog = primary.logs[dateKey] || {};
    const sLog = mergedLogs[dateKey] || {};
    const entries = mergeByKey(pLog.entries || [], sLog.entries || [], e => e.id || `${e.name}_${e.kcal}`);
    const sportDone = [...new Set([...(sLog.sportDone || []), ...(pLog.sportDone || [])])];
    const badHabits = { ...(sLog.badHabits || {}) };
    Object.keys(pLog.badHabits || {}).forEach(k => {
      if (pLog.badHabits[k] !== null && pLog.badHabits[k] !== undefined) badHabits[k] = pLog.badHabits[k];
    });
    const routines = { ...(sLog.routines || {}) };
    Object.keys(pLog.routines || {}).forEach(k => {
      if (pLog.routines[k] !== null && pLog.routines[k] !== undefined) routines[k] = pLog.routines[k];
    });
    mergedLogs[dateKey] = { ...sLog, ...pLog, entries, sportDone, badHabits, routines };
  });
  merged.logs = mergedLogs;
  merged._updatedAt = localNewer ? (loc._updatedAt || rem._updatedAt) : (rem._updatedAt || loc._updatedAt);
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
  if (mode === 'syncing') dot.className = 'inline-block w-2 h-2 rounded-full ml-1.5 align-middle bg-amber-400 animate-pulse';
  else if (mode === 'error') dot.className = 'inline-block w-2 h-2 rounded-full ml-1.5 align-middle bg-rose-500';
  else if (mode === 'ok') dot.className = 'inline-block w-2 h-2 rounded-full ml-1.5 align-middle bg-emerald-400';
  else dot.className = 'inline-block w-2 h-2 rounded-full ml-1.5 align-middle bg-zinc-600';
}

function setSyncStatusText(msg, isError = false) {
  lastSyncStatusMsg = msg;
  lastSyncStatusErr = isError;
  if (isError) updateHeaderSyncDot('error');
  else if (/sende|verbinde|lade/i.test(msg)) updateHeaderSyncDot('syncing');
  else updateHeaderSyncDot('ok');
  const el = document.getElementById('syncStatusLabel');
  if (!el) return;
  el.textContent = msg;
  el.className = isError ? 'text-[11px] text-rose-400' : 'text-[11px] text-emerald-400';
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

async function pushStateToCloud(useKeepalive = false, showAlert = false) {
  clearTimeout(syncTimer);
  const cfg = getSyncConfig();
  if (!cfg || !cfg.url || !cfg.anonKey || !cfg.syncKey) {
    if (showAlert) alert('Bitte zuerst Supabase URL, Key und Sync-Key eintragen.');
    return;
  }

  // Schutz gegen Datenverlust durch ein frisch installiertes Gerät:
  // Vor dem ersten erfolgreichen Cloud-Abgleich niemals blind überschreiben!
  if (!showAlert && !lastRemoteTimestamp) {
    hasPendingLocalPush = true;
    if (isSyncInFlight) {
      syncTimer = setTimeout(() => pushStateToCloud(false, false), 800);
    } else {
      await pullStateFromCloud(false);
    }
    return;
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
    const res = await fetch(`${cfg.url.replace(/\/$/, '')}/rest/v1/fuel_sync`, {
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
    hasPendingLocalPush = false;
    lastRemoteTimestamp = updatedAt;
    const kb = Math.round(bodyStr.length / 1024);
    const wCount = Array.isArray(state.workouts) ? state.workouts.length : 0;
    const timeStr = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    setSyncStatusText(`Gesendet (${wCount} Wo., ${kb} KB · ${timeStr})`);
    if (showAlert) alert(`✅ In Cloud gesichert: ${wCount} Workouts, ${(state.weightHistory || []).length} Gewichtstage, ${(state.recipes || []).length} Rezepte.`);
  } catch (err) {
    setSyncStatusText(`Push-Fehler: ${err.message}`, true);
    if (showAlert) alert(`❌ Cloud-Upload fehlgeschlagen: ${err.message}`);
  }
}

async function pullStateFromCloud(forceOverwrite = false) {
  const cfg = getSyncConfig();
  if (!cfg || !cfg.url || !cfg.anonKey || !cfg.syncKey) return;
  if (isSyncInFlight && !forceOverwrite) return;

  isSyncInFlight = true;
  try {
    const baseUrl = `${cfg.url.replace(/\/$/, '')}/rest/v1/fuel_sync?sync_key=eq.${encodeURIComponent(cfg.syncKey)}`;

    // Bei normalem Hintergrund-Check erst winzigen Zeitstempel prüfen (~40 Bytes)
    if (!forceOverwrite && !hasPendingLocalPush && lastRemoteTimestamp) {
      const headRes = await fetch(`${baseUrl}&select=updated_at`, {
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

    const res = await fetch(`${baseUrl}&select=payload,updated_at`, {
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
      lastRemoteTimestamp = new Date(0).toISOString();
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
      hasPendingLocalPush = true;
    }

    const isEditingNow = !forceOverwrite && (
      Boolean(editingRecipe) ||
      (typeof sportLiveOpen !== 'undefined' && sportLiveOpen)
    );

    if (forceOverwrite) {
      state = remotePayload;
      if (remoteTs) state._updatedAt = remoteTs;
      hasPendingLocalPush = false;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      lastRemoteTimestamp = remoteTs;
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
        lastRemoteTimestamp = remoteTs;
        render();
      } else if (hasPendingLocalPush || remoteLooksWiped || remoteWCount > localWCount || remoteWeightCount > localWeightCount || (localMs > remoteMs && remoteMs > 0)) {
        // Parallele / noch nicht gesendete Änderungen verlustfrei zusammenführen und hochschicken
        const merged = mergeCloudStates(state, remotePayload);
        state = merged;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        lastRemoteTimestamp = remoteTs;
        render();
        isSyncInFlight = false;
        await pushStateToCloud();
        return;
      } else if (remoteTs) {
        lastRemoteTimestamp = remoteTs;
      }
    }

    const wCount = (state.workouts || []).length;
    setSyncStatusText(`Synchron (${wCount} Wo. · ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })})`);
  } catch (err) {
    setSyncStatusText(`Pull-Fehler: ${err.message}`, true);
  } finally {
    isSyncInFlight = false;
  }
}

function saveState() {
  state._updatedAt = nextMonotonicIsoTs();
  hasPendingLocalPush = true;
  updateHeaderSyncDot('syncing');
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {}

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
      routines: { creatine: null, skincare: null, sertraline: null }
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
    const c = day.routines.creatine;
    const s = day.routines.skincare;
    const se = day.routines.sertraline;
    let nextVal = true;
    if (c === true && s === true && se === true) nextVal = false;
    else if (c === false && s === false && se === false) nextVal = null;
    day.routines.creatine = nextVal;
    day.routines.skincare = nextVal;
    day.routines.sertraline = nextVal;
  } else {
    day.routines[key] = nextRoutineState(day.routines[key]);
  }
  saveState();
  render();
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

function getFoodSuggestions(rawQuery) {
  const q = String(rawQuery || '').trim().toLowerCase();
  if (q.length < 2) return [];

  const titleCase = s => s.replace(/(^|\s)([a-zäöüß])/g, (_, sp, ch) => sp + ch.toUpperCase());
  const pool = new Map();
  // Eigene bereits genutzte Rezeptzutaten zuerst merken
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

function renderFoodSuggestions(mode, rawVal) {
  const boxId = mode === 'builder' ? 'builder-search-suggestions' : 'global-food-suggestions';
  const box = document.getElementById(boxId);
  if (!box) return;
  const list = getFoodSuggestions(rawVal);
  if (!list.length) {
    box.innerHTML = '';
    return;
  }
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

function applyFoodSuggestion(mode, term) {
  const inpId = mode === 'builder' ? 'builder-search-input' : 'global-food-query';
  const boxId = mode === 'builder' ? 'builder-search-suggestions' : 'global-food-suggestions';
  const inp = document.getElementById(inpId);
  const sugBox = document.getElementById(boxId);
  if (inp) inp.value = term;
  if (sugBox) sugBox.innerHTML = '';
  if (mode === 'builder') runBuilderSearch();
  else runGlobalFoodSearch();
}

function suggestDefaultGrams(foodName) {
  const n = String(foodName || '').toLowerCase();
  // Körniger Frischkäse / Hüttenkäse / Cottage Cheese (1 Becher = 200 g) vor normalem Frischkäse prüfen
  if (/(körnige[rn]?\s+frischkäse|hüttenkäse|cottage cheese)/.test(n)) {
    return 200;
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

async function searchFoodsLive(query) {
  const q = (query || '').trim();
  if (q.length < 2) return [];
  const offResults = [];
  const usdaResults = [];

  const offPromise = fetch(`https://de.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&lc=de&cc=de&page_size=12&fields=product_name,product_name_de,brands,nutriments`)
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
  // Bei übersetzten deutschen Grundzutaten USDA-Grundlebensmittel ganz oben mit einmischen
  const merged = wasTranslated
    ? [...usdaResults.slice(0, 4), ...offResults, ...usdaResults.slice(4)]
    : [...offResults, ...usdaResults];
  searchResultsCache = merged.slice(0, 18);
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

    const nicStatus = log ? getCombinedNicotineStatus(log) : null;
    const alc = log && log.badHabits ? normalizeHabitStatus(log.badHabits.alcohol) : null;

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

    // Routine & Supplements (Kreatin, Skincare, Sertralin)
    if (log && log.routines) {
      const r = log.routines;
      const doneCnt = (r.creatine ? 1 : 0) + (r.skincare ? 1 : 0) + (r.sertraline ? 1 : 0);
      if (r.creatine) routineCounts.creatine++;
      if (r.skincare) routineCounts.skincare++;
      if (r.sertraline) routineCounts.sertraline++;
      if (doneCnt > 0) routineAnyTracked++;
      if (doneCnt === 3) routineFullDays++;

      const hasKonsumData = alc !== null || nicStatus !== null;
      if (hasKonsumData) {
        const isFullyClean = (alc !== 'consumed') && (nicStatus !== 'consumed');
        if (doneCnt === 3) {
          fullRoutineKonsumTracked++;
          if (isFullyClean) fullRoutineCleanDays++;
        } else {
          partialRoutineKonsumTracked++;
          if (isFullyClean) partialRoutineCleanDays++;
        }
      }
    }

    if (alc === 'consumed') weekdayConsumedCounts[d.weekdayIdx]++;
    if (nicStatus === 'consumed') weekdayConsumedCounts[d.weekdayIdx]++;
  });

  // 1) Training (inkl. Sport-Tab Workouts) & Nikotin-Balance
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

  // 4) Alkohol-Effekt (Kalorien & Folgetag-Gewicht)
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

  // 5) Routine & Supplements (Kreatin, Skincare, Sertralin)
  if (routineAnyTracked >= 3) {
    const rList = [
      { name: 'Kreatin', c: routineCounts.creatine },
      { name: 'Skincare', c: routineCounts.skincare },
      { name: 'Sertralin', c: routineCounts.sertraline }
    ].sort((a, b) => b.c - a.c);
    const fullPct = Math.round((routineFullDays / 30) * 100);
    let corrNote = `Am konstantesten: <strong>${rList[0].name}</strong> (${rList[0].c}/30T), Ausbaupotenzial bei <strong>${rList[2].name}</strong> (${rList[2].c}/30T).`;
    if (fullRoutineKonsumTracked >= 2 && partialRoutineKonsumTracked >= 2) {
      const fCleanPct = Math.round((fullRoutineCleanDays / fullRoutineKonsumTracked) * 100);
      const pCleanPct = Math.round((partialRoutineCleanDays / partialRoutineKonsumTracked) * 100);
      corrNote = `An 3/3-Routine-Tagen bist du zu <strong>${fCleanPct} %</strong> komplett clean (vs. ${pCleanPct} % an unvollständigen Tagen). Stärkste Routine: <strong>${rList[0].name}</strong> (${rList[0].c}/30T).`;
    }
    insights.push({
      icon: '💊',
      title: 'Routine-Konstanz (Kreatin · Skincare · Sertralin)',
      badge: `${routineFullDays}/30T 3/3`,
      badgeTone: fullPct >= 60 ? 'emerald' : 'amber',
      text: `<strong>${routineFullDays} von 30 Tagen</strong> waren alle 3 Routinen komplett. ${corrNote}`
    });
  } else {
    insights.push({
      icon: '💊',
      title: 'Routine-Konstanz & Clean-Korrelation',
      badge: `${routineAnyTracked}/3 Tage`,
      badgeTone: 'zinc',
      text: `Hake Kreatin, Skincare und Sertralin regelmäßig ab – ab 3 erfassten Tagen zeigt dir diese Karte deine Routine-Stabilität und den Zusammenhang mit Clean-Tagen.`
    });
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
  showToast(`✓ „${rec.name}“ auf der Startseite hinzugefügt`);
}

function deleteDayEntry(entryId) {
  const log = ensureDayLog(state.selectedDate);
  log.entries = log.entries.filter(e => e.id !== entryId);
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

  const alcStatus = normalizeHabitStatus(log.badHabits?.alcohol);
  const alcCls = alcStatus === 'clean'
    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
    : (alcStatus === 'consumed'
      ? 'bg-rose-500/25 border-rose-500/55 text-rose-300'
      : 'bg-zinc-900 border-border text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800');
  const alcSym = alcStatus === 'clean' ? '✕' : (alcStatus === 'consumed' ? '✓' : '·');

  const nicStatus = getCombinedNicotineStatus(log);
  const nicCls = nicStatus === 'clean'
    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
    : (nicStatus === 'consumed'
      ? 'bg-rose-500/25 border-rose-500/55 text-rose-300'
      : 'bg-zinc-900 border-border text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800');
  const nicSym = nicStatus === 'clean' ? '✕' : (nicStatus === 'consumed' ? '✓' : '·');

  const quickHabitsHtml = `
    <section class="bg-card border border-border rounded-2xl px-3 py-2.5 space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">Schnell-Check</span>
        <button onclick="switchTab('habits')" class="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium">Details →</button>
      </div>
      <div class="flex flex-wrap gap-1.5">
        ${renderMiniRoutineBtn('sertraline', '💊', 'Sertralin')}
        ${renderMiniRoutineBtn('creatine', '💊', 'Kreatin')}
        ${renderMiniRoutineBtn('skincare', '🧴', 'Skincare')}
        <button onclick="cycleBadHabitDay('alcohol', '${state.selectedDate}')"
          class="px-2.5 py-1 rounded-xl text-[11px] font-medium border transition inline-flex items-center gap-1 ${alcCls}">
          <span>🍷</span><span>Alkohol</span><span class="font-bold ml-0.5">${alcSym}</span>
        </button>
        <button onclick="cycleCombinedNicotineDay('${state.selectedDate}')"
          class="px-2.5 py-1 rounded-xl text-[11px] font-medium border transition inline-flex items-center gap-1 ${nicCls}">
          <span>💨</span><span>Nikotin</span><span class="font-bold ml-0.5">${nicSym}</span>
        </button>
      </div>
    </section>
  `;

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

function renderRecipesTab() {
  if (editingRecipe) {
    const tot = calcRecipeTotals(editingRecipe);
    const nameSuggestions = suggestRecipeNames(editingRecipe.items);
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
          <div class="flex gap-2">
            <input id="builder-search-input" type="text" placeholder="Deutsch suchen (z. B. rote Zwiebeln, Olivenöl, Tofu…)"
              oninput="renderFoodSuggestions('builder', this.value)"
              onkeydown="if(event.key==='Enter') runBuilderSearch()"
              class="flex-1 px-3 py-2.5 rounded-xl bg-zinc-900 border border-border text-xs text-white" />
            <button onclick="runBuilderSearch()" class="px-3.5 py-2.5 rounded-xl bg-emerald-500 text-zinc-950 font-semibold text-xs">
              Suchen
            </button>
          </div>
          <div id="builder-search-suggestions" class="flex flex-wrap gap-1.5"></div>
          <div id="builder-search-results" class="space-y-1.5 max-h-60 overflow-y-auto"></div>
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

  return `
    <div class="space-y-3">
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 class="text-base font-semibold text-white">Meine Rezepte</h2>
          <p class="text-xs text-zinc-400">Vorlagen auswählen, loggen oder flexibel anpassen</p>
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

function setFoodSubTab(sub) {
  foodSubTab = sub;
  if (sub !== 'recipes') editingRecipe = null;
  render();
}

function renderFoodTab() {
  return `
    <div class="flex gap-2">
      <button onclick="openAiMealModal()" class="flex-1 px-3 py-2.5 rounded-2xl text-xs font-semibold transition flex items-center justify-center gap-1.5 border bg-violet-500/15 hover:bg-violet-500/25 border-violet-500/30 text-violet-300">
        <span>✨</span><span>KI-Analyse</span>
      </button>
    </div>
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
  const creatineStreak = getRoutineStreak('creatine');
  const skincareStreak = getRoutineStreak('skincare');
  const sertralineStreak = getRoutineStreak('sertraline');

  const metricTabs = [
    { id: 'alcohol', label: '🍷 Alkohol' },
    { id: 'nicotine', label: '💨 Nikotin' },
    { id: 'sport', label: '⚡ Sport' },
    { id: 'routine', label: '✨ Routine' }
  ];

  const getCombinedRoutineStatus = (log) => {
    const c = normalizeRoutineStatus(log?.routines?.creatine);
    const s = normalizeRoutineStatus(log?.routines?.skincare);
    const se = normalizeRoutineStatus(log?.routines?.sertraline);
    if (c === true && s === true && se === true) return 'yes';
    if (c === false || s === false || se === false) return 'no';
    if (c === true || s === true || se === true) return 'partial';
    return null;
  };

  const getCountsForMetric = (metricKey) => {
    let clean = 0, consumed = 0, open = 0;
    days30.forEach(d => {
      const log = state.logs[d.dateStr];
      if (metricKey === 'sport') {
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

  const mainCounts = getCountsForMetric(selectedHeatmapMetric);

  const weekHeaderLabels = appLang === 'es'
    ? ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    : ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const leadingEmptyDays = days30.length ? (days30[0].weekdayIdx + 6) % 7 : 0;
  const todayIso = getTodayStr();

  const renderHeatmapGrid = (metricKey, compact = false) => `
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

          if (metricKey === 'sport') {
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

  const cigCounts = getCountsForMetric('cigarettes');
  const vapeCounts = getCountsForMetric('vape');
  const creatineCounts = getCountsForMetric('creatine');
  const skincareCounts = getCountsForMetric('skincare');
  const sertralineCounts = getCountsForMetric('sertraline');

  const renderLegend = () => {
    if (selectedHeatmapMetric === 'routine') {
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

  const renderRoutineCardButton = (key, title, streak) => {
    const val = todayLog.routines[key];
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
      <button onclick="toggleRoutine('${key}')"
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

  return `
    <div class="space-y-4">
      <div id="sec-heatmap" class="bg-card border border-border rounded-3xl p-4 space-y-3.5">
        <div class="flex items-start justify-between gap-2">
          <div>
            <h2 class="text-sm font-semibold text-white">30-Tage-Heatmap</h2>
            <p class="text-[11px] text-zinc-400">Tippe auf einen Tag zum Umschalten (Grün / Rot / Gelb)</p>
          </div>
          <div class="text-right text-[11px] text-zinc-400">
            ${selectedHeatmapMetric === 'sport'
              ? `<span class="text-emerald-400 font-semibold">${mainCounts.clean}</span>/30 aktiv`
              : selectedHeatmapMetric === 'routine'
                ? `<span class="text-emerald-400 font-semibold">${mainCounts.clean}</span> ja · <span class="text-rose-400 font-semibold">${mainCounts.consumed}</span> nein · <span class="text-amber-300 font-semibold">${mainCounts.open}</span> offen`
                : `<span class="text-emerald-400 font-semibold">${mainCounts.clean}</span> clean · <span class="text-rose-400 font-semibold">${mainCounts.consumed}</span> kons. · <span class="text-amber-300 font-semibold">${mainCounts.open}</span> offen`
            }
          </div>
        </div>

        <div class="grid grid-cols-4 gap-1.5">
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

        ${selectedHeatmapMetric === 'routine' ? `
          <div class="border border-border rounded-2xl p-3 bg-zinc-950/60 space-y-3.5">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">✨ Routine & Supplements (30 Tage)</span>
              <span class="text-[11px] text-zinc-400">
                Komplett: <span class="text-emerald-400 font-semibold">${mainCounts.clean}</span>/30
              </span>
            </div>

            <div class="space-y-1.5">
              <div class="flex items-center justify-between text-xs">
                <span class="font-medium text-zinc-200">💊 Kreatin</span>
                <span class="text-[11px] text-zinc-400">
                  <span class="text-emerald-400 font-semibold">${creatineCounts.clean}</span> ja ·
                  <span class="text-rose-400 font-semibold">${creatineCounts.consumed}</span> nein ·
                  <span class="text-amber-300 font-semibold">${creatineCounts.open}</span> offen · ${creatineStreak}d Streak
                </span>
              </div>
              ${renderHeatmapGrid('creatine', true)}
            </div>

            <div class="space-y-1.5 pt-2 border-t border-zinc-900">
              <div class="flex items-center justify-between text-xs">
                <span class="font-medium text-zinc-200">🧴 Skincare</span>
                <span class="text-[11px] text-zinc-400">
                  <span class="text-emerald-400 font-semibold">${skincareCounts.clean}</span> ja ·
                  <span class="text-rose-400 font-semibold">${skincareCounts.consumed}</span> nein ·
                  <span class="text-amber-300 font-semibold">${skincareCounts.open}</span> offen · ${skincareStreak}d Streak
                </span>
              </div>
              ${renderHeatmapGrid('skincare', true)}
            </div>

            <div class="space-y-1.5 pt-2 border-t border-zinc-900">
              <div class="flex items-center justify-between text-xs">
                <span class="font-medium text-zinc-200">💊 Sertralin</span>
                <span class="text-[11px] text-zinc-400">
                  <span class="text-emerald-400 font-semibold">${sertralineCounts.clean}</span> ja ·
                  <span class="text-rose-400 font-semibold">${sertralineCounts.consumed}</span> nein ·
                  <span class="text-amber-300 font-semibold">${sertralineCounts.open}</span> offen · ${sertralineStreak}d Streak
                </span>
              </div>
              ${renderHeatmapGrid('sertraline', true)}
            </div>
          </div>
        ` : ''}

        <div class="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border text-[11px] text-zinc-400">
          <div class="flex items-center gap-3">
            ${renderLegend()}
          </div>
          <span>Letzte 30 Tage</span>
        </div>
      </div>

      <div id="sec-routines" class="bg-card border border-border rounded-3xl p-4 space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-sm font-semibold text-white">Routine & Supplements</h2>
            <p class="text-[11px] text-zinc-400">Tägliche Basics für ${state.selectedDate}</p>
          </div>
          <span class="text-[11px] text-zinc-400">
            ${(todayLog.routines.creatine === true ? 1 : 0) + (todayLog.routines.skincare === true ? 1 : 0) + (todayLog.routines.sertraline === true ? 1 : 0)}/3 erledigt
          </span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          ${renderRoutineCardButton('creatine', 'Kreatin', creatineStreak)}
          ${renderRoutineCardButton('skincare', 'Skincare', skincareStreak)}
          ${renderRoutineCardButton('sertraline', 'Sertralin', sertralineStreak)}
        </div>
      </div>

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
  box.innerHTML = items.map((it, idx) => {
    const defG = it.defaultGrams || suggestDefaultGrams(it.name);
    return `
    <div class="flex items-center justify-between bg-zinc-900/90 border border-border rounded-xl px-3 py-2.5 text-xs gap-2">
      <div class="min-w-0 flex-1">
        <div class="font-medium text-zinc-200 truncate">${it.name}</div>
        <div class="text-[10px] text-zinc-400">${it.kcal100} kcal/100g · P ${it.p100}g · ${it.source}</div>
      </div>
      <button onclick="addCachedFoodToRecipe(${idx})" class="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/35 shrink-0 font-semibold">
        + ${defG}g
      </button>
    </div>
  `;
  }).join('');
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
        <div class="text-[10px] text-zinc-400 bg-zinc-950/80 border border-zinc-800/80 rounded-xl px-2.5 py-1.5">
          Auf diesem Gerät: <strong class="text-white">${(state.workouts || []).length}</strong> Workouts ·
          <strong class="text-white">${(state.weightHistory || []).length}</strong> Gewichtstage ·
          <strong class="text-white">${(state.recipes || []).length}</strong> Rezepte
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

async function openBarcodeModal() {
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

  // Rezept-Button nur zeigen, wenn gerade ein Rezept bearbeitet wird
  const recipeBtn = document.getElementById('btnAddScannedToRecipe');
  if (typeof editingRecipe !== 'undefined' && editingRecipe) {
    recipeBtn.classList.remove('hidden');
  } else {
    recipeBtn.classList.add('hidden');
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
  if (typeof editingRecipe !== 'undefined' && editingRecipe) {
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
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    pullStateFromCloud();
  } else if (hasPendingLocalPush) {
    clearTimeout(syncTimer);
    pushStateToCloud(true);
  }
});
window.addEventListener('focus', () => pullStateFromCloud());
window.addEventListener('online', () => {
  if (hasPendingLocalPush) pushStateToCloud();
  else pullStateFromCloud();
});
window.addEventListener('pagehide', () => {
  if (hasPendingLocalPush) {
    clearTimeout(syncTimer);
    pushStateToCloud(true);
  }
});
setInterval(() => {
  if (document.visibilityState === 'visible') pullStateFromCloud();
}, 5000);
