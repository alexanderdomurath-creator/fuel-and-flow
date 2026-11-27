// ============================================================
// SPORT-TAB: Workouts (Kraft / Ausdauer / Sonstiges)
// Nutzt globale Helfer aus app.js (state, saveState, render, openModal, ...)
// ============================================================

const DEFAULT_EXERCISES = [
  'Bankdrücken', 'Schrägbankdrücken', 'Kniebeuge', 'Kreuzheben', 'Rumänisches Kreuzheben',
  'Schulterdrücken', 'Seitheben', 'Klimmzüge', 'Latzug', 'Rudern (Langhantel)', 'Rudern (Kabel)',
  'Dips', 'Liegestütze', 'Bizeps-Curls', 'Trizeps-Drücken', 'Beinpresse', 'Ausfallschritte',
  'Hip Thrust', 'Wadenheben', 'Face Pulls', 'Plank'
];

let sportDraft = null;
let sportProgressEx = null;

const ICON_EDIT = '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>';
const ICON_TRASH = '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>';
const ICON_PLUS = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>';
const ICON_CHECK = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
const ICON_X = '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';

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

function sportKindFromName(name) {
  const n = String(name || '').toLowerCase();
  if (/jogg|lauf|run|rad|cycl|bike|schwimm|swim|wander|walk|rudern|ergo/.test(n)) return 'cardio';
  if (/gym|kraft|weight|fitness|strength/.test(n)) return 'strength';
  return 'other';
}

function getActivityName(id) {
  const a = state.sportHabits.find(h => h.id === id);
  return a ? a.name : 'Aktivität';
}

function epley1RM(kg, reps) {
  if (!(kg > 0) || !(reps > 0)) return 0;
  return reps === 1 ? kg : kg * (1 + reps / 30);
}

function workoutVolume(w) {
  let v = 0;
  (w.exercises || []).forEach(ex => (ex.sets || []).forEach(s => { v += (Number(s.kg) || 0) * (Number(s.reps) || 0); }));
  return v;
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

function allExerciseNames() {
  const set = new Set(DEFAULT_EXERCISES);
  getWorkouts().forEach(w => (w.exercises || []).forEach(ex => { if (ex.name) set.add(ex.name); }));
  return [...set].sort((a, b) => a.localeCompare(b, 'de'));
}

function trainedExerciseNames() {
  const set = new Set();
  getWorkouts().forEach(w => (w.exercises || []).forEach(ex => { if (ex.name && (ex.sets || []).length) set.add(ex.name); }));
  return [...set].sort((a, b) => a.localeCompare(b, 'de'));
}

function lastSetsFor(name, excludeId) {
  const key = String(name).trim().toLowerCase();
  const list = [...getWorkouts()].filter(w => w.id !== excludeId).sort((a, b) => b.date.localeCompare(a.date));
  for (const w of list) {
    const ex = (w.exercises || []).find(e => String(e.name).trim().toLowerCase() === key);
    if (ex && ex.sets && ex.sets.length) return ex.sets.map(s => ({ kg: s.kg, reps: s.reps }));
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

// ---------- TAB-RENDERING ----------
function renderSportTab() {
  const workouts = [...getWorkouts()].sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));
  const weekStart = getPastDateStr(6);
  const week = workouts.filter(w => w.date >= weekStart);
  const weekVol = week.reduce((a, w) => a + workoutVolume(w), 0);
  const weekKm = week.reduce((a, w) => a + (w.type === 'cardio' ? Number(w.distance) || 0 : 0), 0);
  const weekMin = week.reduce((a, w) => a + (Number(w.duration) || 0), 0);

  const stat = (label, value, color) => `
    <div class="bg-zinc-900/80 border border-border rounded-2xl p-2.5 text-center">
      <div class="text-[10px] text-zinc-400">${label}</div>
      <div class="text-sm font-bold ${color} mt-0.5">${value}</div>
    </div>`;

  return `
    <section class="bg-card border border-border rounded-3xl p-4 space-y-3">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-sm font-semibold text-white">Letzte 7 Tage</h2>
          <p class="text-[11px] text-zinc-400">Trainingsübersicht</p>
        </div>
        <button onclick="openWorkoutModal()" title="Neue Einheit" aria-label="Neue Einheit"
          class="w-9 h-9 flex items-center justify-center rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition">${ICON_PLUS}</button>
      </div>
      <div class="grid grid-cols-4 gap-2">
        ${stat('Einheiten', week.length, 'text-white')}
        ${stat('Volumen', weekVol >= 1000 ? fmtNum(weekVol / 1000, 1) + ' t' : Math.round(weekVol) + ' kg', 'text-sky-400')}
        ${stat('Distanz', fmtNum(weekKm, 1) + ' km', 'text-amber-400')}
        ${stat('Zeit', fmtDuration(weekMin), 'text-emerald-400')}
      </div>
    </section>

    ${renderSportProgress()}

    <section class="bg-card border border-border rounded-3xl p-4 space-y-3">
      <h2 class="text-sm font-semibold text-white">Verlauf</h2>
      ${workouts.length === 0
        ? '<p class="text-xs text-zinc-500">Noch keine Einheiten erfasst. Tippe oben auf + um zu starten.</p>'
        : workouts.slice(0, 40).map(renderWorkoutCard).join('')}
    </section>
  `;
}

function renderWorkoutCard(w) {
  const name = sportEsc(getActivityName(w.activityId));
  const icon = w.type === 'strength' ? '🏋️' : w.type === 'cardio' ? '🏃' : '⚡';
  let summary = '';
  let details = '';

  if (w.type === 'strength') {
    const exCount = (w.exercises || []).length;
    const setCount = (w.exercises || []).reduce((a, e) => a + (e.sets || []).length, 0);
    summary = `${exCount} Übungen · ${setCount} Sätze · ${Math.round(workoutVolume(w))} kg Vol.${w.duration ? ' · ' + fmtDuration(w.duration) : ''}`;
    details = (w.exercises || []).map(ex => `
      <div class="flex gap-2 text-[11px] py-0.5">
        <span class="text-zinc-200 font-medium shrink-0">${sportEsc(ex.name)}</span>
        <span class="text-zinc-400">${(ex.sets || []).map(s => `${fmtNum(Number(s.kg) || 0, 1)}×${s.reps}`).join(' · ')}</span>
      </div>`).join('');
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
          <div class="text-xs font-semibold text-white truncate">${icon} ${name}
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
  // series: [{ color, points: [{x: index, y}] }]
  const W = 320, H = 130, pl = 30, pr = 8, pt = 10, pb = 18;
  const ys = series.flatMap(s => s.points.map(p => p.y));
  if (ys.length === 0) return '';
  let min = Math.min(...ys), max = Math.max(...ys);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.1; min -= pad; max += pad;
  const n = Math.max(1, labels.length - 1);
  const X = i => pl + (labels.length === 1 ? (W - pl - pr) / 2 : (i / n) * (W - pl - pr));
  const Y = v => pt + (1 - (v - min) / (max - min)) * (H - pt - pb);
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="w-full h-32">`;
  [min + pad, (min + max) / 2, max - pad].forEach(v => {
    svg += `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="#24242b" stroke-width="1"/>`;
    svg += `<text x="${pl - 4}" y="${Y(v) + 3}" text-anchor="end" font-size="9" fill="#71717a">${Math.round(v)}</text>`;
  });
  series.forEach(s => {
    const pts = s.points.map(p => `${X(p.x)},${Y(p.y)}`).join(' ');
    svg += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    s.points.forEach(p => { svg += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="2.5" fill="${s.color}"/>`; });
  });
  svg += `<text x="${pl}" y="${H - 4}" font-size="9" fill="#71717a">${sportEsc(labels[0])}</text>`;
  if (labels.length > 1) svg += `<text x="${W - pr}" y="${H - 4}" text-anchor="end" font-size="9" fill="#71717a">${sportEsc(labels[labels.length - 1])}</text>`;
  return svg + '</svg>';
}

function renderSportProgress() {
  const names = trainedExerciseNames();
  const hasCardio = getWorkouts().some(w => w.type === 'cardio' && w.distance > 0);
  if (names.length === 0 && !hasCardio) return '';

  let strengthHtml = '';
  if (names.length > 0) {
    if (!sportProgressEx || !names.includes(sportProgressEx)) sportProgressEx = names[0];
    const key = sportProgressEx.toLowerCase();
    const perDay = {};
    getWorkouts().forEach(w => {
      (w.exercises || []).forEach(ex => {
        if (String(ex.name).trim().toLowerCase() !== key) return;
        const d = perDay[w.date] || (perDay[w.date] = { maxKg: 0, rm: 0 });
        (ex.sets || []).forEach(s => {
          d.maxKg = Math.max(d.maxKg, Number(s.kg) || 0);
          d.rm = Math.max(d.rm, epley1RM(Number(s.kg) || 0, Number(s.reps) || 0));
        });
      });
    });
    const dates = Object.keys(perDay).sort();
    const rmPts = dates.map((d, i) => ({ x: i, y: perDay[d].rm }));
    const kgPts = dates.map((d, i) => ({ x: i, y: perDay[d].maxKg }));
    const prKg = Math.max(...kgPts.map(p => p.y));
    const pr1rm = Math.max(...rmPts.map(p => p.y));
    strengthHtml = `
      <div class="space-y-2">
        <select onchange="sportProgressEx=this.value; render();" class="${SPORT_INPUT}">
          ${names.map(n => `<option value="${sportEsc(n)}" ${n === sportProgressEx ? 'selected' : ''}>${sportEsc(n)}</option>`).join('')}
        </select>
        <div class="flex items-center gap-3 text-[11px]">
          <span class="flex items-center gap-1.5 text-emerald-300"><span class="w-2 h-2 rounded-full bg-emerald-400"></span>Gesch. 1RM</span>
          <span class="flex items-center gap-1.5 text-sky-300"><span class="w-2 h-2 rounded-full bg-sky-400"></span>Max. Gewicht</span>
          <span class="ml-auto text-amber-300">🏆 PR ${fmtNum(prKg, 1)} kg · 1RM ${fmtNum(pr1rm, 1)}</span>
        </div>
        ${sportLineChart([
          { color: '#34d399', points: rmPts },
          { color: '#38bdf8', points: kgPts }
        ], dates.map(d => d.slice(5).split('-').reverse().join('.')))}
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
      <div class="space-y-2 ${names.length ? 'pt-3 border-t border-border' : ''}">
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
      <h2 class="text-sm font-semibold text-white">Fortschritt</h2>
      ${strengthHtml}${cardioHtml}
    </section>`;
}

// ---------- EINHEIT ERFASSEN / BEARBEITEN ----------
function openWorkoutModal(id) {
  if (id) {
    const found = getWorkouts().find(w => w.id === id);
    if (!found) return;
    sportDraft = JSON.parse(JSON.stringify(found));
    sportDraft.exercises = sportDraft.exercises || [];
  } else {
    const first = state.sportHabits[0];
    sportDraft = {
      id: null,
      date: state.selectedDate,
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
  sportDraft.exercises.push({ name: '', sets: [{ kg: '', reps: '' }] });
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
  const empty = ex.sets.every(s => s.kg === '' && s.reps === '');
  if (empty && ex.name) {
    const last = lastSetsFor(ex.name, sportDraft.id);
    if (last) ex.sets = last;
  }
  renderWorkoutModal();
}

function sportAddSet(i) {
  const sets = sportDraft.exercises[i].sets;
  const last = sets[sets.length - 1];
  sets.push(last ? { kg: last.kg, reps: last.reps } : { kg: '', reps: '' });
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
      <div class="space-y-3">
        ${d.exercises.map((ex, i) => `
          <div class="bg-zinc-900/80 border border-border rounded-2xl p-2.5 space-y-2">
            <div class="flex items-center gap-1.5">
              <input type="text" list="sport-ex-list" value="${sportEsc(ex.name)}" placeholder="Übung wählen oder tippen…"
                onchange="sportSetExName(${i}, this.value)" class="sport-ex-name ${SPORT_INPUT} font-medium" />
              <button onclick="sportRemoveExercise(${i})" title="Übung entfernen" aria-label="Übung entfernen" class="${SPORT_DEL_BTN}">${ICON_TRASH}</button>
            </div>
            <div class="grid grid-cols-[1.5rem_1fr_1fr_2rem] gap-1.5 text-[10px] text-zinc-500 px-0.5">
              <span>#</span><span>Gewicht (kg)</span><span>Wdh.</span><span></span>
            </div>
            ${ex.sets.map((s, j) => `
              <div class="grid grid-cols-[1.5rem_1fr_1fr_2rem] gap-1.5 items-center">
                <span class="text-[11px] text-zinc-500 text-center">${j + 1}</span>
                <input type="number" inputmode="decimal" step="0.5" min="0" value="${s.kg}" oninput="sportSetField(${i}, ${j}, 'kg', this.value)" class="${SPORT_INPUT}" />
                <input type="number" inputmode="numeric" step="1" min="0" value="${s.reps}" oninput="sportSetField(${i}, ${j}, 'reps', this.value)" class="${SPORT_INPUT}" />
                <button onclick="sportRemoveSet(${i}, ${j})" title="Satz entfernen" aria-label="Satz entfernen"
                  class="w-8 h-8 flex items-center justify-center rounded-xl text-zinc-500 hover:text-rose-400 transition">${ICON_X}</button>
              </div>`).join('')}
            <button onclick="sportAddSet(${i})" title="Satz hinzufügen (kopiert letzten Satz)" aria-label="Satz hinzufügen"
              class="w-full py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-dashed border-border text-zinc-400 hover:text-emerald-400 flex items-center justify-center transition">${ICON_PLUS}</button>
          </div>`).join('')}
        <button onclick="sportAddExercise()" title="Übung hinzufügen" aria-label="Übung hinzufügen"
          class="w-full py-2.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 flex items-center justify-center gap-1.5 text-xs font-medium transition">${ICON_PLUS} 🏋️</button>
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
            ${state.sportHabits.map(sp => `<option value="${sp.id}" ${sp.id === d.activityId ? 'selected' : ''}>${sportEsc(sp.name)}</option>`).join('')}
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

  if (d.type === 'strength') {
    w.exercises = d.exercises
      .map(ex => ({
        name: String(ex.name || '').trim(),
        sets: ex.sets
          .filter(s => Number(s.reps) > 0)
          .map(s => ({ kg: Number(s.kg) || 0, reps: Number(s.reps) }))
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
