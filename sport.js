// ============================================================
// SPORT-TAB: Workouts (Kraft / Ausdauer / Sonstiges) & RepCount-Import
// Nutzt globale Helfer aus app.js (state, saveState, render, openModal, ...)
// ============================================================

const DEFAULT_EXERCISES = [
  'Bankdrücken', 'Schrägbankdrücken', 'Kniebeuge', 'Kreuzheben', 'Rumänisches Kreuzheben',
  'Schulterdrücken', 'Seitheben', 'Klimmzüge', 'Latzug', 'Rudern (Langhantel)', 'Rudern (Kabel)',
  'Dips', 'Liegestütze', 'Bizeps-Curls', 'Trizeps-Drücken', 'Beinpresse', 'Ausfallschritte',
  'Hip Thrust', 'Wadenheben', 'Face Pulls', 'Plank'
];

const MUSCLE_GROUPS = [
  { id: 'Back',      label: 'Rücken',     color: '#10b981' },
  { id: 'Chest',     label: 'Brust',      color: '#38bdf8' },
  { id: 'Legs',      label: 'Beine',      color: '#f59e0b' },
  { id: 'Shoulders', label: 'Schultern',  color: '#a855f7' },
  { id: 'Triceps',   label: 'Trizeps',    color: '#fb7185' },
  { id: 'Biceps',    label: 'Bizeps',     color: '#6366f1' },
  { id: 'Abs',       label: 'Bauch/Core', color: '#14b8a6' },
  { id: 'Other',     label: 'Sonstige',   color: '#71717a' }
];

let sportDraft = null;
let sportProgressEx = null;
let sportProgressGroup = 'ALL';
let sportProgressRange = 'ALL'; // '90' | '365' | 'ALL'
let sportSummaryDays = 30; // 7 | 30 | 365 | 0 (Gesamt)
let sportHistoryQuery = '';
let sportHistoryLimit = 25;

const ICON_EDIT = '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>';
const ICON_TRASH = '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>';
const ICON_PLUS = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>';
const ICON_CHECK = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
const ICON_X = '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
const ICON_UPLOAD = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';

const SPORT_ICON_BTN = 'w-8 h-8 shrink-0 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-border text-zinc-400 hover:text-white transition';
const SPORT_DEL_BTN = 'w-8 h-8 shrink-0 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-rose-500/15 border border-border hover:border-rose-500/30 text-zinc-400 hover:text-rose-400 transition';
const SPORT_INPUT = 'w-full px-2.5 py-2 rounded-xl bg-zinc-950 border border-border text-xs text-white focus:outline-none focus:border-emerald-500';

// ---------- HELFER ----------
function sportEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function getWorkouts() {
  if (!Array.isArray(state.workouts)) state.workouts = [];
  return state.workouts;
}

function normalizeMuscleGroup(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return 'Other';
  if (/back|rücken|ruecken|lat/.test(s)) return 'Back';
  if (/chest|brust|pec/.test(s)) return 'Chest';
  if (/leg|bein|quad|ham|glute|calf|wade/.test(s)) return 'Legs';
  if (/shoulder|schulter|delt/.test(s)) return 'Shoulders';
  if (/tricep|trizeps/.test(s)) return 'Triceps';
  if (/bicep|bizeps/.test(s)) return 'Biceps';
  if (/abs|core|bauch/.test(s)) return 'Abs';
  return 'Other';
}

function muscleGroupInfo(id) {
  return MUSCLE_GROUPS.find(g => g.id === id) || MUSCLE_GROUPS[MUSCLE_GROUPS.length - 1];
}

function sportKindFromName(name) {
  const n = String(name || '').toLowerCase();
  if (/jogg|lauf|run|rad|cycl|bike|schwimm|swim|wander|walk|rudern|ergo/.test(n)) return 'cardio';
  if (/gym|kraft|weight|fitness|strength|calisthenics|hygia|fitklusiv/.test(n)) return 'strength';
  return 'other';
}

function getDefaultStrengthActivityId() {
  const habits = Array.isArray(state.sportHabits) ? state.sportHabits : [];
  const gym = habits.find(h => sportKindFromName(h.name) === 'strength');
  return gym ? gym.id : (habits[0] ? habits[0].id : null);
}

function getActivityName(id) {
  const a = (state.sportHabits || []).find(h => h.id === id);
  return a ? a.name : 'Training';
}

function epley1RM(kg, reps) {
  if (!(kg > 0) || !(reps > 0)) return 0;
  return reps === 1 ? kg : kg * (1 + reps / 30);
}

function workoutVolume(w) {
  let v = 0;
  (w.exercises || []).forEach(ex => (ex.sets || []).forEach(s => {
    v += (Number(s.kg) || 0) * (Number(s.reps) || 0);
  }));
  return v;
}

function workoutSetCount(w) {
  return (w.exercises || []).reduce((a, e) => a + (e.sets || []).length, 0);
}

function fmtNum(n, d = 1) {
  const r = Math.round(n * Math.pow(10, d)) / Math.pow(10, d);
  return String(r).replace('.', ',');
}

function fmtDuration(min) {
  min = Number(min) || 0;
  if (min <= 0) return '—';
  const h = Math.floor(min / 60);
  const m = Math.round(min - h * 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m} min`;
}

function fmtPace(minPerKm) {
  if (!(minPerKm > 0) || !isFinite(minPerKm)) return '—';
  let m = Math.floor(minPerKm);
  let s = Math.round((minPerKm - m) * 60);
  if (s === 60) { m++; s = 0; }
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

function fmtSetCompact(s) {
  const badge = s.t === 'd' ? '<span class="text-amber-400">D </span>' : (s.t === 'w' ? '<span class="text-sky-400">W </span>' : '');
  if (Number(s.sec) > 0 && !(Number(s.reps) > 0)) {
    const kgPrefix = Number(s.kg) > 0 ? `${fmtNum(Number(s.kg), 1)}kg·` : '';
    return `${badge}${kgPrefix}${Math.round(Number(s.sec))}s`;
  }
  const kg = Number(s.kg) || 0;
  const reps = Number(s.reps) || 0;
  return kg > 0 ? `${badge}${fmtNum(kg, 1)}×${reps}` : `${badge}BW×${reps}`;
}

function allExerciseNames() {
  const set = new Set(DEFAULT_EXERCISES);
  getWorkouts().forEach(w => (w.exercises || []).forEach(ex => { if (ex.name) set.add(ex.name); }));
  return [...set].sort((a, b) => a.localeCompare(b, 'de'));
}

function getExerciseMetaMap() {
  const map = new Map();
  getWorkouts().forEach(w => {
    (w.exercises || []).forEach(ex => {
      if (!ex.name || !(ex.sets || []).length) return;
      const cur = map.get(ex.name) || { name: ex.name, category: 'Other', count: 0 };
      cur.count += ex.sets.length;
      if (ex.category && ex.category !== 'Other') cur.category = normalizeMuscleGroup(ex.category);
      map.set(ex.name, cur);
    });
  });
  return map;
}

function lastSetsFor(name, excludeId) {
  const key = String(name).trim().toLowerCase();
  const list = [...getWorkouts()].filter(w => w.id !== excludeId).sort((a, b) => b.date.localeCompare(a.date));
  for (const w of list) {
    const ex = (w.exercises || []).find(e => String(e.name).trim().toLowerCase() === key);
    if (ex && ex.sets && ex.sets.length) {
      return {
        category: ex.category ? normalizeMuscleGroup(ex.category) : 'Other',
        sets: ex.sets.map(s => ({ kg: s.kg ?? '', reps: s.reps ?? '', sec: s.sec ?? '', t: s.t || '' }))
      };
    }
  }
  return null;
}

function syncSportDoneAfterRemoval(date, activityId, exceptId) {
  if (!activityId) return;
  const still = getWorkouts().some(w => w.id !== exceptId && w.date === date && w.activityId === activityId);
  if (still) return;
  const log = state.logs[date];
  if (log && Array.isArray(log.sportDone)) log.sportDone = log.sportDone.filter(id => id !== activityId);
}

// ---------- REPCOUNT CSV PARSER & IMPORT ----------
function parseCsvRfc4180(text) {
  const clean = String(text || '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    const next = clean[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\r' && next === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        i++;
      } else if (c === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function parseRepCountCsvText(csvText, activityId) {
  const rows = parseCsvRfc4180(csvText);
  if (rows.length < 2) throw new Error('Die Datei enthält keine Zeilen.');

  const header = rows[0].map(h => String(h || '').trim().toLowerCase());
  const idx = name => header.indexOf(name.toLowerCase());
  const iStart = idx('workout start');
  const iEnd = idx('workout end');
  const iEx = idx('exercise');
  const iWeight = idx('weight');
  const iReps = idx('reps');
  const iNotes = idx('notes');
  const iDist = idx('distance');
  const iDur = idx('duration');
  const iCat = idx('category');
  const iName = idx('name');
  const iSetType = idx('set type');

  if (iStart < 0 || iEx < 0) {
    throw new Error('Spalten "Workout Start" und "Exercise" nicht gefunden – ist das ein RepCount-CSV-Export?');
  }

  const byWorkout = new Map();
  let totalSets = 0;

  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    if (!cols || cols.length < 3) continue;

    const wsRaw = String(cols[iStart] || '').trim();
    const exName = String(cols[iEx] || '').trim();
    if (!wsRaw || !exName) continue;

    const dateMatch = wsRaw.match(/^(\d{4}-\d{2}-\d{2})(?:[\sT](\d{2}:\d{2}))?/);
    if (!dateMatch) continue;
    const dateStr = dateMatch[1];
    const startTime = dateMatch[2] || '';

    const weightRaw = iWeight >= 0 ? String(cols[iWeight] || '').trim().replace(',', '.') : '';
    const repsRaw = iReps >= 0 ? String(cols[iReps] || '').trim().replace(',', '.') : '';
    const durRaw = iDur >= 0 ? String(cols[iDur] || '').trim().replace(',', '.') : '';
    const kg = weightRaw !== '' && !isNaN(Number(weightRaw)) ? Math.round(Number(weightRaw) * 100) / 100 : 0;
    const reps = repsRaw !== '' && !isNaN(Number(repsRaw)) ? Math.round(Number(repsRaw)) : 0;
    const sec = durRaw !== '' && !isNaN(Number(durRaw)) ? Math.round(Number(durRaw)) : 0;

    // Leere Platzhalter-Sätze überspringen (z. B. ohne Wdh. und ohne Dauer)
    if (reps <= 0 && sec <= 0) continue;

    const workoutTitle = iName >= 0 ? String(cols[iName] || '').trim() : '';
    const weRaw = iEnd >= 0 ? String(cols[iEnd] || '').trim() : '';
    const category = iCat >= 0 ? normalizeMuscleGroup(cols[iCat]) : 'Other';
    const noteText = iNotes >= 0 ? String(cols[iNotes] || '').trim() : '';
    const setTypeRaw = iSetType >= 0 ? String(cols[iSetType] || '').trim().toLowerCase() : '';
    const setTypeShort = setTypeRaw === 'dropset' ? 'd' : (setTypeRaw === 'warmup' ? 'w' : '');

    const key = `${wsRaw}||${workoutTitle.toLowerCase()}`;
    let wo = byWorkout.get(key);
    if (!wo) {
      let durationMin = 0;
      if (weRaw) {
        const t1 = Date.parse(wsRaw.replace(' ', 'T'));
        const t2 = Date.parse(weRaw.replace(' ', 'T'));
        if (!isNaN(t1) && !isNaN(t2) && t2 > t1) {
          const diff = Math.round((t2 - t1) / 60000);
          if (diff > 0 && diff <= 360) durationMin = diff;
        }
      }
      const slug = (workoutTitle || 'workout').toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 20);
      wo = {
        id: `rc_${dateStr}_${startTime.replace(':', '') || '0000'}_${slug}`,
        source: 'repcount',
        date: dateStr,
        title: workoutTitle || 'Krafttraining',
        activityId: activityId,
        type: 'strength',
        duration: durationMin,
        notes: '',
        _notesSet: new Set(),
        _exMap: new Map(),
        exercises: []
      };
      byWorkout.set(key, wo);
    }

    if (noteText && !wo._notesSet.has(noteText)) {
      wo._notesSet.add(noteText);
    }

    const exKey = exName.toLowerCase();
    let exObj = wo._exMap.get(exKey);
    if (!exObj) {
      exObj = { name: exName, category, sets: [] };
      wo._exMap.set(exKey, exObj);
      wo.exercises.push(exObj);
    } else if (exObj.category === 'Other' && category !== 'Other') {
      exObj.category = category;
    }

    const setObj = { kg, reps };
    if (sec > 0) setObj.sec = sec;
    if (setTypeShort) setObj.t = setTypeShort;
    exObj.sets.push(setObj);
    totalSets++;
  }

  const parsedWorkouts = [];
  byWorkout.forEach(wo => {
    if (!wo.exercises.length) return;
    wo.notes = [...wo._notesSet].join(' · ');
    delete wo._notesSet;
    delete wo._exMap;
    parsedWorkouts.push(wo);
  });

  parsedWorkouts.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  return { workouts: parsedWorkouts, totalSets };
}

function openRepCountImportModal() {
  const habits = Array.isArray(state.sportHabits) ? state.sportHabits : [];
  const defaultAct = getDefaultStrengthActivityId();
  const importedCount = getWorkouts().filter(w => w.source === 'repcount' || String(w.id).startsWith('rc_')).length;

  openModal(`
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-base font-semibold text-white">RepCount CSV-Import</h3>
          <p class="text-[11px] text-zinc-400">Importiert Workouts, Muskelgruppen, Sätze, Haltezeiten &amp; Dropsets</p>
        </div>
        <button onclick="closeModal()" class="text-zinc-400 hover:text-white px-2 py-1">✕</button>
      </div>

      <div>
        <label class="text-[11px] text-zinc-400">Aktivität für Kalorienbonus zuordnen</label>
        <select id="repcount-activity-select" class="${SPORT_INPUT} mt-1">
          ${habits.length
            ? habits.map(h => `<option value="${h.id}" ${h.id === defaultAct ? 'selected' : ''}>${sportEsc(h.name)}</option>`).join('')
            : '<option value="">Keine Sport-Aktivität angelegt</option>'}
        </select>
      </div>

      <label class="flex flex-col items-center justify-center gap-2 w-full py-6 px-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-dashed border-emerald-500/40 text-emerald-300 cursor-pointer transition text-center">
        <div class="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center">${ICON_UPLOAD}</div>
        <span class="text-xs font-semibold">RepCount-Exportdatei auswählen (.csv)</span>
        <span class="text-[11px] text-zinc-400">Bereits importierte Einheiten werden aktualisiert, nicht dupliziert.</span>
        <input type="file" accept=".csv,text/csv" onchange="handleRepCountCsvImport(event)" class="hidden" />
      </label>

      ${importedCount > 0 ? `
        <div class="text-[11px] text-zinc-400 bg-zinc-900/70 border border-border rounded-xl px-3 py-2">
          Aktuell gespeichert: <span class="text-white font-semibold">${importedCount}</span> RepCount-Einheiten.
        </div>
      ` : ''}
    </div>
  `);
}

async function handleRepCountCsvImport(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;
  try {
    const sel = document.getElementById('repcount-activity-select');
    const activityId = (sel && sel.value) || getDefaultStrengthActivityId();
    const text = await file.text();
    const { workouts: incoming, totalSets } = parseRepCountCsvText(text, activityId);

    if (!incoming.length) {
      alert('Keine gültigen Sätze in der RepCount-CSV gefunden.');
      return;
    }

    const existing = getWorkouts();
    const map = new Map();
    existing.forEach(w => map.set(w.id, w));

    let added = 0;
    let updated = 0;
    incoming.forEach(w => {
      if (map.has(w.id)) updated++;
      else added++;
      map.set(w.id, w);

      if (w.activityId) {
        const log = ensureDayLog(w.date);
        if (!Array.isArray(log.sportDone)) log.sportDone = [];
        if (!log.sportDone.includes(w.activityId)) log.sportDone.push(w.activityId);
      }
    });

    state.workouts = [...map.values()].sort((a, b) => a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id)));
    sportSummaryDays = 0; // Gesamt-Übersicht zeigen, damit historische Daten sofort sichtbar sind
    saveState();
    closeModal();
    render();
    alert(`✅ RepCount-Import erfolgreich: ${added} neu, ${updated} aktualisiert (${totalSets} Sätze, gesamt ${state.workouts.length} Einheiten).`);
  } catch (err) {
    console.error('RepCount Import Fehler:', err);
    alert('Fehler beim RepCount-Import: ' + (err.message || err));
  } finally {
    if (event?.target) event.target.value = '';
  }
}

// ---------- TAB-RENDERING ----------
function setSportSummaryDays(days) {
  sportSummaryDays = days;
  render();
}

function setSportHistoryQuery(val) {
  sportHistoryQuery = val;
  sportHistoryLimit = 25;
  render();
}

function loadMoreSportHistory() {
  sportHistoryLimit += 30;
  render();
}

function renderSportTab() {
  const workouts = [...getWorkouts()].sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));
  const cutoff = sportSummaryDays > 0 ? getPastDateStr(sportSummaryDays - 1) : '';
  const period = cutoff ? workouts.filter(w => w.date >= cutoff) : workouts;
  const periodVol = period.reduce((a, w) => a + workoutVolume(w), 0);
  const periodSets = period.reduce((a, w) => a + workoutSetCount(w), 0);
  const periodKm = period.reduce((a, w) => a + (w.type === 'cardio' ? Number(w.distance) || 0 : 0), 0);
  const periodMin = period.reduce((a, w) => a + (Number(w.duration) || 0), 0);

  const rangeBtns = [
    { d: 7, label: '7T' },
    { d: 30, label: '30T' },
    { d: 365, label: '1J' },
    { d: 0, label: 'Alle' }
  ];

  const stat = (label, value, color) => `
    <div class="bg-zinc-900/80 border border-border rounded-2xl p-2.5 text-center">
      <div class="text-[10px] text-zinc-400">${label}</div>
      <div class="text-sm font-bold ${color} mt-0.5 truncate">${value}</div>
    </div>`;

  // Verlauf filtern
  const q = sportHistoryQuery.trim().toLowerCase();
  const filtered = q
    ? workouts.filter(w => {
        const title = (w.title || getActivityName(w.activityId) || '').toLowerCase();
        const notes = (w.notes || '').toLowerCase();
        const hasEx = (w.exercises || []).some(ex => String(ex.name || '').toLowerCase().includes(q));
        return title.includes(q) || notes.includes(q) || hasEx || w.date.includes(q);
      })
    : workouts;

  const shown = filtered.slice(0, sportHistoryLimit);

  return `
    <section class="bg-card border border-border rounded-3xl p-4 space-y-3">
      <div class="flex items-center justify-between gap-2">
        <div>
          <h2 class="text-sm font-semibold text-white">Trainingsübersicht</h2>
          <p class="text-[11px] text-zinc-400">${sportSummaryDays > 0 ? `Letzte ${sportSummaryDays} Tage` : 'Gesamter Verlauf'}</p>
        </div>
        <div class="flex items-center gap-1.5">
          <button onclick="openRepCountImportModal()" title="RepCount CSV importieren" aria-label="RepCount CSV importieren"
            class="h-9 px-2.5 flex items-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-border text-zinc-200 text-xs font-medium transition">
            ${ICON_UPLOAD}<span>CSV</span>
          </button>
          <button onclick="openWorkoutModal()" title="Neue Einheit" aria-label="Neue Einheit"
            class="w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition">${ICON_PLUS}</button>
        </div>
      </div>

      <div class="flex gap-1">
        ${rangeBtns.map(r => `
          <button onclick="setSportSummaryDays(${r.d})"
            class="flex-1 py-1 rounded-xl text-[11px] font-medium transition border ${
              sportSummaryDays === r.d
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                : 'bg-zinc-900 text-zinc-400 border-border hover:text-zinc-200'
            }">${r.label}</button>
        `).join('')}
      </div>

      <div class="grid grid-cols-4 gap-2">
        ${stat('Einheiten', period.length, 'text-white')}
        ${stat('Sätze', periodSets, 'text-purple-400')}
        ${stat('Volumen', periodVol >= 1000 ? fmtNum(periodVol / 1000, 1) + ' t' : Math.round(periodVol) + ' kg', 'text-sky-400')}
        ${periodKm > 0
          ? stat('Distanz', fmtNum(periodKm, 1) + ' km', 'text-amber-400')
          : stat('Zeit', fmtDuration(periodMin), 'text-emerald-400')}
      </div>

      ${renderMuscleGroupBreakdown(period)}
    </section>

    ${renderSportProgress()}

    <section class="bg-card border border-border rounded-3xl p-4 space-y-3">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-sm font-semibold text-white">Verlauf <span class="text-xs font-normal text-zinc-500">(${filtered.length})</span></h2>
        ${workouts.length > 5 ? `
          <input type="search" value="${sportEsc(sportHistoryQuery)}" placeholder="Suche (Übung, Gym…)"
            onchange="setSportHistoryQuery(this.value)"
            class="w-44 px-2.5 py-1 rounded-xl bg-zinc-950 border border-border text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500" />
        ` : ''}
      </div>
      ${shown.length === 0
        ? '<p class="text-xs text-zinc-500">Noch keine Einheiten erfasst. Tippe oben auf <b>CSV</b> für deinen RepCount-Import oder auf <b>+</b> für eine neue Einheit.</p>'
        : shown.map(renderWorkoutCard).join('')}
      ${filtered.length > shown.length ? `
        <button onclick="loadMoreSportHistory()"
          class="w-full py-2 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-border text-xs font-medium text-zinc-300 transition">
          Mehr laden (${filtered.length - shown.length} weitere)
        </button>
      ` : ''}
    </section>
  `;
}

function renderMuscleGroupBreakdown(periodWorkouts) {
  const counts = {};
  let total = 0;
  periodWorkouts.forEach(w => {
    (w.exercises || []).forEach(ex => {
      const g = normalizeMuscleGroup(ex.category);
      const n = (ex.sets || []).length;
      if (n > 0) {
        counts[g] = (counts[g] || 0) + n;
        total += n;
      }
    });
  });
  const entries = Object.entries(counts)
    .filter(([k]) => k !== 'Other' || Object.keys(counts).length === 1)
    .sort((a, b) => b[1] - a[1]);
  if (!entries.length) return '';

  const maxVal = Math.max(1, entries[0][1]);
  return `
    <div class="pt-2 border-t border-zinc-900 space-y-1.5">
      <div class="flex items-center justify-between text-[11px] text-zinc-400">
        <span>Sätze nach Muskelgruppe</span>
        <span class="text-zinc-500">${total} Sätze</span>
      </div>
      <div class="space-y-1">
        ${entries.slice(0, 7).map(([id, cnt]) => {
          const info = muscleGroupInfo(id);
          const pct = Math.max(4, Math.round((cnt / maxVal) * 100));
          return `
            <div class="flex items-center gap-2 text-[11px]">
              <span class="w-20 text-zinc-300 truncate">${info.label}</span>
              <div class="flex-1 h-2 rounded-full bg-zinc-900 overflow-hidden">
                <div class="h-full rounded-full" style="width:${pct}%; background:${info.color}"></div>
              </div>
              <span class="w-8 text-right text-zinc-400 tabular-nums">${cnt}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderWorkoutCard(w) {
  const displayName = sportEsc(w.title || getActivityName(w.activityId));
  const icon = w.type === 'strength' ? '🏋️' : w.type === 'cardio' ? '🏃' : '⚡';
  let summary = '';
  let details = '';

  if (w.type === 'strength') {
    const exCount = (w.exercises || []).length;
    const setCount = workoutSetCount(w);
    const vol = Math.round(workoutVolume(w));
    summary = `${exCount} Übungen · ${setCount} Sätze${vol > 0 ? ' · ' + vol + ' kg Vol.' : ''}${w.duration ? ' · ' + fmtDuration(w.duration) : ''}`;
    details = (w.exercises || []).map(ex => {
      const catInfo = ex.category && ex.category !== 'Other' ? muscleGroupInfo(normalizeMuscleGroup(ex.category)) : null;
      return `
        <div class="flex items-baseline gap-2 text-[11px] py-0.5">
          <span class="text-zinc-200 font-medium shrink-0 flex items-center gap-1">
            ${catInfo ? `<span class="w-1.5 h-1.5 rounded-full inline-block" style="background:${catInfo.color}"></span>` : ''}
            ${sportEsc(ex.name)}
          </span>
          <span class="text-zinc-400 truncate">${(ex.sets || []).map(fmtSetCompact).join(' · ')}</span>
        </div>`;
    }).join('');
  } else if (w.type === 'cardio') {
    const pace = (w.distance > 0 && w.duration > 0) ? w.duration / w.distance : 0;
    const speed = (w.distance > 0 && w.duration > 0) ? w.distance / (w.duration / 60) : 0;
    summary = `${fmtNum(Number(w.distance) || 0, 2)} km · ${fmtDuration(w.duration)}${pace ? ' · ' + fmtPace(pace) : ''}`;
    details = `
      <div class="text-[11px] text-zinc-400">
        ${speed ? `Ø ${fmtNum(speed, 1)} km/h` : ''}${w.hr ? ` · Puls Ø ${w.hr}` : ''}${w.elev ? ` · ${w.elev} Hm` : ''}
      </div>`;
  } else {
    summary = w.duration ? fmtDuration(w.duration) : 'Einheit';
  }
  if (w.notes) details += `<div class="text-[11px] text-zinc-500 italic pt-1">${sportEsc(w.notes)}</div>`;

  return `
    <div class="bg-zinc-900/80 border border-border rounded-2xl p-3">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <div class="text-xs font-semibold text-white truncate">${icon} ${displayName}
            <span class="text-zinc-500 font-normal ml-1">${formatDisplayDate(w.date)}</span></div>
          <div class="text-[11px] text-zinc-400 mt-0.5">${summary}</div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button onclick="openWorkoutModal('${w.id}')" title="Bearbeiten" aria-label="Bearbeiten" class="${SPORT_ICON_BTN}">${ICON_EDIT}</button>
          <button onclick="deleteWorkout('${w.id}')" title="Löschen" aria-label="Löschen" class="${SPORT_DEL_BTN}">${ICON_TRASH}</button>
        </div>
      </div>
      ${details ? `<div class="mt-2 pt-2 border-t border-border space-y-0.5">${details}</div>` : ''}
    </div>`;
}

// ---------- FORTSCHRITT ----------
function sportLineChart(series, labels) {
  const W = 320, H = 135, pl = 32, pr = 8, pt = 10, pb = 18;
  const ys = series.flatMap(s => s.points.map(p => p.y));
  if (ys.length === 0) return '';
  let min = Math.min(...ys), max = Math.max(...ys);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.1; min -= pad; max += pad;
  const n = Math.max(1, labels.length - 1);
  const X = i => pl + (labels.length === 1 ? (W - pl - pr) / 2 : (i / n) * (W - pl - pr));
  const Y = v => pt + (1 - (v - min) / (max - min)) * (H - pt - pb);
  const showDots = labels.length <= 45;

  let svg = `<svg viewBox="0 0 ${W} ${H}" class="w-full h-36">`;
  [min + pad, (min + max) / 2, max - pad].forEach(v => {
    svg += `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="#24242b" stroke-width="1"/>`;
    svg += `<text x="${pl - 4}" y="${Y(v) + 3}" text-anchor="end" font-size="9" fill="#71717a">${Math.round(v)}</text>`;
  });
  series.forEach(s => {
    const pts = s.points.map(p => `${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
    svg += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    if (showDots) {
      s.points.forEach(p => { svg += `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="2.2" fill="${s.color}"/>`; });
    }
  });
  svg += `<text x="${pl}" y="${H - 4}" font-size="9" fill="#71717a">${sportEsc(labels[0])}</text>`;
  if (labels.length > 1) svg += `<text x="${W - pr}" y="${H - 4}" text-anchor="end" font-size="9" fill="#71717a">${sportEsc(labels[labels.length - 1])}</text>`;
  return svg + '</svg>';
}

function setSportProgressGroup(grp) {
  sportProgressGroup = grp;
  sportProgressEx = null;
  render();
}

function renderSportProgress() {
  const metaMap = getExerciseMetaMap();
  const allTrained = [...metaMap.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'de'));
  const hasCardio = getWorkouts().some(w => w.type === 'cardio' && w.distance > 0);
  if (allTrained.length === 0 && !hasCardio) return '';

  let strengthHtml = '';
  if (allTrained.length > 0) {
    const usedGroups = new Set(allTrained.map(x => x.category));
    const filteredList = sportProgressGroup === 'ALL'
      ? allTrained
      : allTrained.filter(x => x.category === sportProgressGroup);
    const names = (filteredList.length ? filteredList : allTrained).map(x => x.name);
    if (!sportProgressEx || !names.includes(sportProgressEx)) sportProgressEx = names[0];

    const key = sportProgressEx.toLowerCase();
    const cutoff = sportProgressRange === '90' ? getPastDateStr(89) : (sportProgressRange === '365' ? getPastDateStr(364) : '');
    const perDay = {};
    let prKg = 0, pr1rm = 0, prReps = 0, prSec = 0, prSetVol = 0;

    getWorkouts().forEach(w => {
      (w.exercises || []).forEach(ex => {
        if (String(ex.name).trim().toLowerCase() !== key) return;
        (ex.sets || []).forEach(s => {
          const kg = Number(s.kg) || 0;
          const reps = Number(s.reps) || 0;
          const sec = Number(s.sec) || 0;
          prKg = Math.max(prKg, kg);
          pr1rm = Math.max(pr1rm, epley1RM(kg, reps));
          prReps = Math.max(prReps, reps);
          prSec = Math.max(prSec, sec);
          prSetVol = Math.max(prSetVol, kg * reps);
        });
        if (cutoff && w.date < cutoff) return;
        const d = perDay[w.date] || (perDay[w.date] = { maxKg: 0, rm: 0, maxReps: 0, maxSec: 0 });
        (ex.sets || []).forEach(s => {
          const kg = Number(s.kg) || 0;
          const reps = Number(s.reps) || 0;
          const sec = Number(s.sec) || 0;
          d.maxKg = Math.max(d.maxKg, kg);
          d.rm = Math.max(d.rm, epley1RM(kg, reps));
          d.maxReps = Math.max(d.maxReps, reps);
          d.maxSec = Math.max(d.maxSec, sec);
        });
      });
    });

    const dates = Object.keys(perDay).sort();
    const isTimed = prSec > 0 && prReps === 0;
    const isBodyweightOnly = !isTimed && prKg === 0;

    let series = [];
    let legendLine = '';
    if (isTimed) {
      series = [{ color: '#14b8a6', points: dates.map((d, i) => ({ x: i, y: perDay[d].maxSec })) }];
      legendLine = `
        <span class="flex items-center gap-1.5 text-teal-300"><span class="w-2 h-2 rounded-full bg-teal-400"></span>Max. Dauer (s)</span>
        <span class="ml-auto text-amber-300">🏆 PR ${prSec} s</span>`;
    } else if (isBodyweightOnly) {
      series = [{ color: '#34d399', points: dates.map((d, i) => ({ x: i, y: perDay[d].maxReps })) }];
      legendLine = `
        <span class="flex items-center gap-1.5 text-emerald-300"><span class="w-2 h-2 rounded-full bg-emerald-400"></span>Max. Wdh.</span>
        <span class="ml-auto text-amber-300">🏆 PR ${prReps} Wdh.</span>`;
    } else {
      series = [
        { color: '#34d399', points: dates.map((d, i) => ({ x: i, y: perDay[d].rm })) },
        { color: '#38bdf8', points: dates.map((d, i) => ({ x: i, y: perDay[d].maxKg })) }
      ];
      legendLine = `
        <span class="flex items-center gap-1.5 text-emerald-300"><span class="w-2 h-2 rounded-full bg-emerald-400"></span>1RM</span>
        <span class="flex items-center gap-1.5 text-sky-300"><span class="w-2 h-2 rounded-full bg-sky-400"></span>Max kg</span>
        <span class="ml-auto text-amber-300">🏆 ${fmtNum(prKg, 1)} kg · 1RM ${fmtNum(pr1rm, 1)}</span>`;
    }

    const fmtDateLbl = d => dates.length > 20 ? `${d.slice(5, 7)}/${d.slice(2, 4)}` : d.slice(5).split('-').reverse().join('.');

    strengthHtml = `
      <div class="space-y-2.5">
        ${usedGroups.size > 1 ? `
          <div class="flex gap-1 overflow-x-auto pb-0.5">
            <button onclick="setSportProgressGroup('ALL')"
              class="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
                sportProgressGroup === 'ALL' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-zinc-900 text-zinc-400 border-border'
              }">Alle</button>
            ${MUSCLE_GROUPS.filter(g => usedGroups.has(g.id)).map(g => `
              <button onclick="setSportProgressGroup('${g.id}')"
                class="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
                  sportProgressGroup === g.id ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-zinc-900 text-zinc-400 border-border'
                }">${g.label}</button>
            `).join('')}
          </div>
        ` : ''}

        <div class="flex items-center gap-1.5">
          <select onchange="sportProgressEx=this.value; render();" class="${SPORT_INPUT} flex-1">
            ${names.map(n => `<option value="${sportEsc(n)}" ${n === sportProgressEx ? 'selected' : ''}>${sportEsc(n)} (${metaMap.get(n)?.count || 0})</option>`).join('')}
          </select>
          <div class="flex gap-1 shrink-0">
            ${[['90', '90T'], ['365', '1J'], ['ALL', 'Alle']].map(([val, lbl]) => `
              <button onclick="sportProgressRange='${val}'; render();"
                class="px-2 py-2 rounded-xl text-[11px] font-medium border transition ${
                  sportProgressRange === val ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-zinc-900 text-zinc-400 border-border'
                }">${lbl}</button>
            `).join('')}
          </div>
        </div>

        <div class="flex items-center gap-3 text-[11px]">${legendLine}</div>
        ${dates.length > 0
          ? sportLineChart(series, dates.map(fmtDateLbl))
          : '<p class="text-[11px] text-zinc-500 py-3 text-center">Keine Einträge in diesem Zeitraum.</p>'}
      </div>`;
  }

  let cardioHtml = '';
  if (hasCardio) {
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const from = getPastDateStr(i * 7 + 6), to = getPastDateStr(i * 7);
      const km = getWorkouts().filter(w => w.type === 'cardio' && w.date >= from && w.date <= to)
        .reduce((a, w) => a + (Number(w.distance) || 0), 0);
      weeks.push({ km, label: to.slice(5).split('-').reverse().join('.') });
    }
    const maxKm = Math.max(1, ...weeks.map(w => w.km));
    cardioHtml = `
      <div class="space-y-2 ${allTrained.length ? 'pt-3 border-t border-border' : ''}">
        <div class="text-xs font-semibold text-zinc-300">Distanz pro Woche (km)</div>
        <div class="flex items-end gap-1.5 h-24">
          ${weeks.map(w => `
            <div class="flex-1 flex flex-col items-center justify-end h-full gap-1">
              <div class="text-[9px] text-zinc-400">${w.km > 0 ? fmtNum(w.km, 1) : ''}</div>
              <div class="w-full rounded-t-md bg-amber-400/70" style="height:${Math.max(2, (w.km / maxKm) * 100)}%"></div>
              <div class="text-[9px] text-zinc-500">${w.label}</div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  return `
    <section class="bg-card border border-border rounded-3xl p-4 space-y-3">
      <h2 class="text-sm font-semibold text-white">Fortschritt &amp; Bestleistungen</h2>
      ${strengthHtml}${cardioHtml}
    </section>`;
}

// ---------- EINHEIT ERFASSEN / BEARBEITEN ----------
function openWorkoutModal(id) {
  if (id) {
    const found = getWorkouts().find(w => w.id === id);
    if (!found) return;
    sportDraft = JSON.parse(JSON.stringify(found));
    sportDraft.exercises = (sportDraft.exercises || []).map(ex => ({
      name: ex.name || '',
      category: normalizeMuscleGroup(ex.category),
      sets: (ex.sets || []).map(s => ({ kg: s.kg ?? '', reps: s.reps ?? '', sec: s.sec ?? '', t: s.t || '' }))
    }));
    sportDraft.title = sportDraft.title || '';
  } else {
    const first = (state.sportHabits || [])[0];
    sportDraft = {
      id: null,
      date: state.selectedDate,
      title: '',
      activityId: first ? first.id : null,
      type: first ? sportKindFromName(first.name) : 'strength',
      duration: '',
      notes: '',
      exercises: [],
      distance: '',
      hr: '',
      elev: ''
    };
  }
  renderWorkoutModal();
}

function sportDraftSet(field, val) {
  sportDraft[field] = val;
  if (field === 'distance' || field === 'duration') updateSportLivePace();
}

function updateSportLivePace() {
  const el = document.getElementById('sport-live-pace');
  if (!el) return;
  const d = Number(sportDraft.distance), t = Number(sportDraft.duration);
  el.textContent = (d > 0 && t > 0) ? `${fmtPace(t / d)} · Ø ${fmtNum(d / (t / 60), 1)} km/h` : '—';
}

function sportSetActivity(id) {
  sportDraft.activityId = id;
  sportDraft.type = sportKindFromName(getActivityName(id));
  renderWorkoutModal();
}

function sportSetType(type) {
  sportDraft.type = type;
  renderWorkoutModal();
}

function sportAddExercise() {
  sportDraft.exercises.push({ name: '', category: 'Other', sets: [{ kg: '', reps: '', sec: '', t: '' }] });
  renderWorkoutModal();
  setTimeout(() => {
    const els = document.querySelectorAll('.sport-ex-name');
    if (els.length) els[els.length - 1].focus();
  }, 30);
}

function sportRemoveExercise(i) {
  sportDraft.exercises.splice(i, 1);
  renderWorkoutModal();
}

function sportSetExName(i, val) {
  const ex = sportDraft.exercises[i];
  ex.name = val.trim();
  const empty = ex.sets.every(s => s.kg === '' && s.reps === '' && !s.sec);
  if (ex.name) {
    const prev = lastSetsFor(ex.name, sportDraft.id);
    if (prev) {
      if (ex.category === 'Other' && prev.category) ex.category = prev.category;
      if (empty) ex.sets = prev.sets;
    }
  }
  renderWorkoutModal();
}

function sportSetExCategory(i, val) {
  sportDraft.exercises[i].category = normalizeMuscleGroup(val);
}

function sportCycleSetType(i, j) {
  const s = sportDraft.exercises[i].sets[j];
  s.t = s.t === '' ? 'w' : (s.t === 'w' ? 'd' : '');
  renderWorkoutModal();
}

function sportAddSet(i) {
  const sets = sportDraft.exercises[i].sets;
  const last = sets[sets.length - 1];
  sets.push(last ? { kg: last.kg, reps: last.reps, sec: last.sec || '', t: '' } : { kg: '', reps: '', sec: '', t: '' });
  renderWorkoutModal();
}

function sportRemoveSet(i, j) {
  sportDraft.exercises[i].sets.splice(j, 1);
  renderWorkoutModal();
}

function sportSetField(i, j, field, val) {
  sportDraft.exercises[i].sets[j][field] = val === '' ? '' : Number(val);
}

function renderWorkoutModal() {
  const d = sportDraft;
  const typeBtn = (t, icon, label) => `
    <button onclick="sportSetType('${t}')" title="${label}" aria-label="${label}"
      class="flex-1 py-2 rounded-xl text-base transition ${d.type === t ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40' : 'bg-zinc-900 border border-border text-zinc-400 hover:text-zinc-200'}">${icon}</button>`;

  let body = '';
  if (d.type === 'strength') {
    body = `
      <datalist id="sport-ex-list">${allExerciseNames().map(n => `<option value="${sportEsc(n)}"></option>`).join('')}</datalist>
      <div>
        <label class="text-[11px] text-zinc-400">Trainingsname / Studio (optional)</label>
        <input type="text" value="${sportEsc(d.title)}" placeholder="z. B. Hygia, Calisthenics, Push…" oninput="sportDraftSet('title', this.value)" class="${SPORT_INPUT} mt-1" />
      </div>
      <div class="space-y-3">
        ${d.exercises.map((ex, i) => {
          const prev = ex.name ? lastSetsFor(ex.name, d.id) : null;
          return `
          <div class="bg-zinc-900/80 border border-border rounded-2xl p-2.5 space-y-2">
            <div class="flex items-center gap-1.5">
              <input type="text" list="sport-ex-list" value="${sportEsc(ex.name)}" placeholder="Übung wählen oder tippen…"
                onchange="sportSetExName(${i}, this.value)" class="sport-ex-name ${SPORT_INPUT} font-medium flex-1" />
              <select onchange="sportSetExCategory(${i}, this.value)" class="px-2 py-2 rounded-xl bg-zinc-950 border border-border text-[11px] text-zinc-300 focus:outline-none">
                ${MUSCLE_GROUPS.map(g => `<option value="${g.id}" ${g.id === ex.category ? 'selected' : ''}>${g.label}</option>`).join('')}
              </select>
              <button onclick="sportRemoveExercise(${i})" title="Übung entfernen" aria-label="Übung entfernen" class="${SPORT_DEL_BTN}">${ICON_TRASH}</button>
            </div>
            ${prev ? `<div class="text-[10px] text-zinc-500 px-0.5">Vorher: ${prev.sets.map(fmtSetCompact).join(' · ')}</div>` : ''}
            <div class="grid grid-cols-[2rem_1fr_1fr_2rem] gap-1.5 text-[10px] text-zinc-500 px-0.5">
              <span class="text-center">Satz</span><span>Gewicht (kg)</span><span>Wdh.</span><span></span>
            </div>
            ${ex.sets.map((s, j) => {
              const badgeLbl = s.t === 'w' ? 'W' : (s.t === 'd' ? 'D' : String(j + 1));
              const badgeCls = s.t === 'w'
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                : (s.t === 'd' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-zinc-950 text-zinc-400 border-border');
              return `
              <div class="grid grid-cols-[2rem_1fr_1fr_2rem] gap-1.5 items-center">
                <button type="button" onclick="sportCycleSetType(${i}, ${j})" title="Satz-Typ wechseln (Normal / Warm-up / Dropset)"
                  class="h-8 rounded-xl border text-[11px] font-semibold transition ${badgeCls}">${badgeLbl}</button>
                <input type="number" inputmode="decimal" step="0.5" min="0" value="${s.kg}" placeholder="0 = BW" oninput="sportSetField(${i}, ${j}, 'kg', this.value)" class="${SPORT_INPUT}" />
                <input type="number" inputmode="numeric" step="1" min="0" value="${s.reps}" oninput="sportSetField(${i}, ${j}, 'reps', this.value)" class="${SPORT_INPUT}" />
                <button onclick="sportRemoveSet(${i}, ${j})" title="Satz entfernen" aria-label="Satz entfernen"
                  class="w-8 h-8 flex items-center justify-center rounded-xl text-zinc-500 hover:text-rose-400 transition">${ICON_X}</button>
              </div>`;
            }).join('')}
            <button onclick="sportAddSet(${i})" title="Satz hinzufügen (kopiert letzten Satz)" aria-label="Satz hinzufügen"
              class="w-full py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-dashed border-border text-zinc-400 hover:text-emerald-400 flex items-center justify-center transition">${ICON_PLUS}</button>
          </div>`;
        }).join('')}
        <button onclick="sportAddExercise()" title="Übung hinzufügen" aria-label="Übung hinzufügen"
          class="w-full py-2.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 flex items-center justify-center gap-1.5 text-xs font-medium transition">${ICON_PLUS} Übung hinzufügen</button>
      </div>
      <div>
        <label class="text-[11px] text-zinc-400">Dauer (min)</label>
        <input type="number" inputmode="numeric" min="0" value="${d.duration}" oninput="sportDraftSet('duration', this.value === '' ? '' : Number(this.value))" class="${SPORT_INPUT} mt-1" />
      </div>`;
  } else if (d.type === 'cardio') {
    body = `
      <div class="grid grid-cols-2 gap-2.5">
        <div>
          <label class="text-[11px] text-zinc-400">Distanz (km)</label>
          <input type="number" inputmode="decimal" step="0.01" min="0" value="${d.distance}" oninput="sportDraftSet('distance', this.value === '' ? '' : Number(this.value))" class="${SPORT_INPUT} mt-1" />
        </div>
        <div>
          <label class="text-[11px] text-zinc-400">Zeit (min)</label>
          <input type="number" inputmode="decimal" step="0.1" min="0" value="${d.duration}" oninput="sportDraftSet('duration', this.value === '' ? '' : Number(this.value))" class="${SPORT_INPUT} mt-1" />
        </div>
        <div>
          <label class="text-[11px] text-zinc-400">Ø Puls (optional)</label>
          <input type="number" inputmode="numeric" min="0" value="${d.hr}" oninput="sportDraftSet('hr', this.value === '' ? '' : Number(this.value))" class="${SPORT_INPUT} mt-1" />
        </div>
        <div>
          <label class="text-[11px] text-zinc-400">Höhenmeter (optional)</label>
          <input type="number" inputmode="numeric" min="0" value="${d.elev}" oninput="sportDraftSet('elev', this.value === '' ? '' : Number(this.value))" class="${SPORT_INPUT} mt-1" />
        </div>
      </div>
      <div class="bg-zinc-900/80 border border-border rounded-2xl px-3 py-2 flex items-center justify-between">
        <span class="text-[11px] text-zinc-400">Pace · Tempo</span>
        <span id="sport-live-pace" class="text-xs font-semibold text-emerald-400">—</span>
      </div>`;
  } else {
    body = `
      <div>
        <label class="text-[11px] text-zinc-400">Dauer (min)</label>
        <input type="number" inputmode="numeric" min="0" value="${d.duration}" oninput="sportDraftSet('duration', this.value === '' ? '' : Number(this.value))" class="${SPORT_INPUT} mt-1" />
      </div>`;
  }

  openModal(`
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-white">${d.id ? 'Einheit bearbeiten' : 'Neue Einheit'}</h3>
        <button onclick="closeModal()" class="text-zinc-400 hover:text-white">✕</button>
      </div>
      <div class="grid grid-cols-2 gap-2.5">
        <div>
          <label class="text-[11px] text-zinc-400">Datum</label>
          <input type="date" value="${d.date}" onchange="sportDraftSet('date', this.value)" class="${SPORT_INPUT} mt-1" />
        </div>
        <div>
          <label class="text-[11px] text-zinc-400">Aktivität</label>
          <select onchange="sportSetActivity(this.value)" class="${SPORT_INPUT} mt-1">
            ${(state.sportHabits || []).map(sp => `<option value="${sp.id}" ${sp.id === d.activityId ? 'selected' : ''}>${sportEsc(sp.name)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="flex gap-2">
        ${typeBtn('strength', '🏋️', 'Kraft')}${typeBtn('cardio', '🏃', 'Ausdauer')}${typeBtn('other', '⚡', 'Sonstiges')}
      </div>
      ${body}
      <div>
        <label class="text-[11px] text-zinc-400">Notiz (optional)</label>
        <input type="text" value="${sportEsc(d.notes)}" oninput="sportDraftSet('notes', this.value)" class="${SPORT_INPUT} mt-1" />
      </div>
      <div class="flex gap-2">
        <button onclick="closeModal()" title="Abbrechen" aria-label="Abbrechen"
          class="w-11 h-11 flex items-center justify-center rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-border text-zinc-400 hover:text-white transition">${ICON_X}</button>
        <button onclick="saveWorkout()" title="Speichern" aria-label="Speichern"
          class="flex-1 h-11 flex items-center justify-center rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition">${ICON_CHECK}</button>
      </div>
    </div>
  `);
  if (d.type === 'cardio') updateSportLivePace();
}

function saveWorkout() {
  const d = sportDraft;
  if (!d.date) return alert('Bitte ein Datum wählen.');
  if (!d.activityId) return alert('Bitte zuerst unter Habits eine Aktivität anlegen.');

  const w = {
    id: d.id || 'wo_' + Date.now(),
    date: d.date,
    activityId: d.activityId,
    type: d.type,
    duration: Number(d.duration) || 0,
    notes: (d.notes || '').trim()
  };
  if (d.source) w.source = d.source;
  if (d.title && d.title.trim()) w.title = d.title.trim();

  if (d.type === 'strength') {
    w.exercises = d.exercises
      .map(ex => ({
        name: String(ex.name || '').trim(),
        category: normalizeMuscleGroup(ex.category),
        sets: ex.sets
          .filter(s => Number(s.reps) > 0 || Number(s.sec) > 0)
          .map(s => {
            const out = { kg: Number(s.kg) || 0, reps: Number(s.reps) || 0 };
            if (Number(s.sec) > 0) out.sec = Number(s.sec);
            if (s.t) out.t = s.t;
            return out;
          })
      }))
      .filter(ex => ex.name && ex.sets.length > 0);
    if (w.exercises.length === 0) return alert('Bitte mindestens eine Übung mit Name und einem Satz (Wdh. > 0) erfassen.');
  } else if (d.type === 'cardio') {
    w.distance = Number(d.distance) || 0;
    w.hr = Number(d.hr) || 0;
    w.elev = Number(d.elev) || 0;
    if (!(w.distance > 0) && !(w.duration > 0)) return alert('Bitte Distanz oder Zeit angeben.');
  } else if (!(w.duration > 0) && !w.notes) {
    return alert('Bitte Dauer oder Notiz angeben.');
  }

  const list = getWorkouts();
  const idx = list.findIndex(x => x.id === w.id);
  if (idx >= 0) {
    const old = list[idx];
    list[idx] = w;
    if (old.date !== w.date || old.activityId !== w.activityId) {
      syncSportDoneAfterRemoval(old.date, old.activityId, w.id);
    }
  } else {
    list.push(w);
  }

  const log = ensureDayLog(w.date);
  if (!Array.isArray(log.sportDone)) log.sportDone = [];
  if (!log.sportDone.includes(w.activityId)) log.sportDone.push(w.activityId);

  saveState();
  closeModal();
  sportDraft = null;
  render();
}

function deleteWorkout(id) {
  const w = getWorkouts().find(x => x.id === id);
  if (!w) return;
  if (!confirm('Diese Einheit wirklich löschen?')) return;
  state.workouts = getWorkouts().filter(x => x.id !== id);
  syncSportDoneAfterRemoval(w.date, w.activityId, id);
  saveState();
  render();
}
