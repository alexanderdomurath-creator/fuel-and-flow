// ============================================================
// SPORT-TAB: Flexible Workout-Erfassung, Vorlagen & RepCount-Import
// Nutzt globale Helfer aus app.js (state, saveState, render, openModal, ...)
// ============================================================

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

// Konsolidierter Standard-Übungskatalog (einheitliche Namen & Muskelgruppen)
const EXERCISE_CATALOG = [
  // Rücken
  { name: 'Klimmzüge', category: 'Back' },
  { name: 'Klimmzüge (Ringe)', category: 'Back' },
  { name: 'Klimmzüge (Neutralgriff)', category: 'Back' },
  { name: 'Klimmzüge (Untergriff)', category: 'Back' },
  { name: 'Klimmzüge (Kommando)', category: 'Back' },
  { name: 'Klimmzüge (False Grip)', category: 'Back' },
  { name: 'Klimmzüge (Explosiv)', category: 'Back' },
  { name: 'Muscle-ups', category: 'Back' },
  { name: 'Ring Muscle-ups', category: 'Back' },
  { name: 'Kurzhantel-Rudern', category: 'Back' },
  { name: 'Langhantel-Rudern', category: 'Back' },
  { name: 'Ring-Rudern', category: 'Back' },
  { name: 'Archer Rows', category: 'Back' },
  { name: 'Rudern', category: 'Back' },
  { name: 'Rudern (Maschine)', category: 'Back' },
  { name: 'Rudern (Kabel)', category: 'Back' },
  { name: 'Rudern (Bauchlage)', category: 'Back' },
  { name: 'Rudern (Unterstützt)', category: 'Back' },
  { name: 'Latzug', category: 'Back' },
  { name: 'Kreuzheben', category: 'Back' },
  { name: 'Kreuzheben (Trap Bar)', category: 'Back' },
  { name: 'Hyperextensions', category: 'Back' },
  { name: 'Back Leg Extensions', category: 'Back' },
  { name: 'Reverse Butterfly', category: 'Back' },
  { name: 'Überzüge (Pullover)', category: 'Back' },
  { name: 'Power Cleans', category: 'Back' },

  // Brust
  { name: 'Bankdrücken', category: 'Chest' },
  { name: 'Kurzhantel-Bankdrücken', category: 'Chest' },
  { name: 'Schrägbankdrücken', category: 'Chest' },
  { name: 'Schrägbankdrücken (Maschine)', category: 'Chest' },
  { name: 'Brustpresse', category: 'Chest' },
  { name: 'Liegestütze', category: 'Chest' },
  { name: 'Liegestütze (Eng)', category: 'Chest' },
  { name: 'Liegestütze (Einarmig)', category: 'Chest' },
  { name: 'Liegestütze (Explosiv)', category: 'Chest' },
  { name: 'Ring-Liegestütze', category: 'Chest' },
  { name: 'Ring-Liegestütze + Rollout', category: 'Chest' },
  { name: 'Star Push-ups', category: 'Chest' },
  { name: 'Cable Crossovers', category: 'Chest' },
  { name: 'Kurzhantel-Fliegende', category: 'Chest' },
  { name: 'Butterfly (Maschine)', category: 'Chest' },
  { name: 'Ring-Fliegende', category: 'Chest' },

  // Beine
  { name: 'Kniebeugen', category: 'Legs' },
  { name: 'Frontkniebeugen', category: 'Legs' },
  { name: 'Frontkniebeugen (Kettlebell)', category: 'Legs' },
  { name: 'Goblet Squats', category: 'Legs' },
  { name: 'Pistol Squats', category: 'Legs' },
  { name: 'Bulgarian Split Squats', category: 'Legs' },
  { name: 'Hackenschmidt-Kniebeuge', category: 'Legs' },
  { name: 'Beinpresse', category: 'Legs' },
  { name: 'Rumänisches Kreuzheben', category: 'Legs' },
  { name: 'Einbeiniges Kreuzheben', category: 'Legs' },
  { name: 'Einbeiniges Kreuzheben (Sprung)', category: 'Legs' },
  { name: 'Beinbeuger', category: 'Legs' },
  { name: 'Nordic Curls', category: 'Legs' },
  { name: 'Beinstrecker', category: 'Legs' },
  { name: 'Hip Thrusts', category: 'Legs' },
  { name: 'Hip Thrusts (Einbeinig)', category: 'Legs' },
  { name: 'Ausfallschritte', category: 'Legs' },
  { name: 'Wadenheben', category: 'Legs' },
  { name: 'Wandsitz Wadenheben', category: 'Legs' },
  { name: 'Box Jumps', category: 'Legs' },
  { name: 'Seilspringen (Single Under)', category: 'Legs' },

  // Schultern
  { name: 'Kurzhantel-Schulterdrücken', category: 'Shoulders' },
  { name: 'Langhantel-Schulterdrücken', category: 'Shoulders' },
  { name: 'Schulterdrücken (Sitzend)', category: 'Shoulders' },
  { name: 'Schulterdrücken (Maschine)', category: 'Shoulders' },
  { name: 'Pike Push-ups', category: 'Shoulders' },
  { name: 'Pike Push-ups (Ringe)', category: 'Shoulders' },
  { name: 'Seitheben', category: 'Shoulders' },
  { name: 'Vorgebeugtes Seitheben', category: 'Shoulders' },
  { name: 'Face Pulls', category: 'Shoulders' },
  { name: 'Außenrotation (Sitzend)', category: 'Shoulders' },
  { name: 'Planche (Tuck)', category: 'Shoulders' },
  { name: 'Seated Dips (Einarmig)', category: 'Shoulders' },
  { name: 'Shoulder Walk (Einarmig)', category: 'Shoulders' },

  // Trizeps
  { name: 'Dips', category: 'Triceps' },
  { name: 'Ring Dips', category: 'Triceps' },
  { name: 'Bank-Dips', category: 'Triceps' },
  { name: 'L-Sit Dips', category: 'Triceps' },
  { name: 'Pseudo Planche Push-ups (PPPU)', category: 'Triceps' },
  { name: 'Trizeps-Drücken (Kabel)', category: 'Triceps' },
  { name: 'Trizeps-Strecken', category: 'Triceps' },

  // Bizeps
  { name: 'Bizeps 21s', category: 'Biceps' },
  { name: 'Scott-Curls', category: 'Biceps' },
  { name: 'Kurzhantel-Curls', category: 'Biceps' },
  { name: 'Kabel-Curls', category: 'Biceps' },
  { name: 'Ring-Curls', category: 'Biceps' },

  // Bauch / Core
  { name: 'Ring Rollouts', category: 'Abs' },
  { name: 'Hollow Body Hold', category: 'Abs', timed: true },
  { name: 'Beinheben', category: 'Abs' },
  { name: 'Ring Pallof Press', category: 'Abs' },
  { name: 'Pallof Press', category: 'Abs' },
  { name: 'Back Lever (Tuck)', category: 'Abs', timed: true },
  { name: 'Front Lever (Adv. Tuck)', category: 'Abs', timed: true },
  { name: 'Windshield Wiper (Stange)', category: 'Abs' },
  { name: 'Windshield Wiper (Angewinkelt)', category: 'Abs' },
  { name: 'Dragon Flags', category: 'Abs' },
  { name: 'Plank', category: 'Abs', timed: true },
  { name: 'Side Plank', category: 'Abs', timed: true },
  { name: 'Plank Hip Taps', category: 'Abs' },
  { name: 'Plank Push-Outs', category: 'Abs' },
  { name: 'Toes to Bar', category: 'Abs' },
  { name: 'Reverse Crunches', category: 'Abs' },
  { name: 'Schräge Crunches', category: 'Abs' },
  { name: 'Ring L-Sit', category: 'Abs', timed: true },
  { name: 'Straight Arm Frog Stand', category: 'Abs', timed: true },
  { name: 'Radfahrer', category: 'Abs' },
  { name: 'Bergsteiger', category: 'Abs' },
  { name: 'Bauchbeugen', category: 'Abs' },
  { name: 'Leg Pulls', category: 'Abs' },
  { name: 'Scissors (Kurzhantel)', category: 'Abs' },
  { name: 'Hollow Ball Throws', category: 'Abs' }
];

// Alias-Mapping zur Vereinheitlichung (RepCount DE/EN, Schreibweisen, Tippfehler)
const EXERCISE_ALIASES = {
  // Rücken
  'pull up':                        { name: 'Klimmzüge', category: 'Back' },
  'pull-up':                        { name: 'Klimmzüge', category: 'Back' },
  'pull ups':                       { name: 'Klimmzüge', category: 'Back' },
  'pull-ups':                       { name: 'Klimmzüge', category: 'Back' },
  'pullup':                         { name: 'Klimmzüge', category: 'Back' },
  'pullups':                        { name: 'Klimmzüge', category: 'Back' },
  'klimmzug':                       { name: 'Klimmzüge', category: 'Back' },
  'klimmzüge ringe':                { name: 'Klimmzüge (Ringe)', category: 'Back' },
  'klimmzug (neutralgriff)':        { name: 'Klimmzüge (Neutralgriff)', category: 'Back' },
  'chin up':                        { name: 'Klimmzüge (Untergriff)', category: 'Back' },
  'chin ups':                       { name: 'Klimmzüge (Untergriff)', category: 'Back' },
  'chin-up':                        { name: 'Klimmzüge (Untergriff)', category: 'Back' },
  'chin-ups':                       { name: 'Klimmzüge (Untergriff)', category: 'Back' },
  'klimmzug kommando':              { name: 'Klimmzüge (Kommando)', category: 'Back' },
  'klimmzug false grip':            { name: 'Klimmzüge (False Grip)', category: 'Back' },
  'klimmzug explosiv':              { name: 'Klimmzüge (Explosiv)', category: 'Back' },
  'muscle ups':                     { name: 'Muscle-ups', category: 'Back' },
  'ring muscle up':                 { name: 'Ring Muscle-ups', category: 'Back' },
  'muscle ups rings':               { name: 'Ring Muscle-ups', category: 'Back' },
  'rows dumbbell':                  { name: 'Kurzhantel-Rudern', category: 'Back' },
  'dumbbell row':                   { name: 'Kurzhantel-Rudern', category: 'Back' },
  'dumbbell rows':                  { name: 'Kurzhantel-Rudern', category: 'Back' },
  'rows barbell':                   { name: 'Langhantel-Rudern', category: 'Back' },
  'rudern (langhantel)':            { name: 'Langhantel-Rudern', category: 'Back' },
  'rudern ringe':                   { name: 'Ring-Rudern', category: 'Back' },
  'rudern frei':                    { name: 'Rudern', category: 'Back' },
  'rows machine':                   { name: 'Rudern (Maschine)', category: 'Back' },
  'iso lateral dy row':             { name: 'Rudern (Maschine)', category: 'Back' },
  'iso lateral high row':           { name: 'Rudern (Maschine)', category: 'Back' },
  'rows assisted':                  { name: 'Rudern (Unterstützt)', category: 'Back' },
  'rudern (auf dem bauch)':         { name: 'Rudern (Bauchlage)', category: 'Back' },
  'latzug maschine':                { name: 'Latzug', category: 'Back' },
  'pulldowns':                      { name: 'Latzug', category: 'Back' },
  'latzug divergierend':            { name: 'Latzug', category: 'Back' },
  'iso lateral front lat pull down':{ name: 'Latzug', category: 'Back' },
  'deadlift':                       { name: 'Kreuzheben', category: 'Back' },
  'deadlifts':                      { name: 'Kreuzheben', category: 'Back' },
  'deadlifts cage bar':             { name: 'Kreuzheben (Trap Bar)', category: 'Back' },
  'back leg extensions':            { name: 'Back Leg Extensions', category: 'Back' },
  'reverse butterfly':              { name: 'Reverse Butterfly', category: 'Back' },
  'pull over':                      { name: 'Überzüge (Pullover)', category: 'Back' },
  'power cleans':                   { name: 'Power Cleans', category: 'Back' },

  // Brust
  'bench press':                    { name: 'Bankdrücken', category: 'Chest' },
  'dumbbell press':                 { name: 'Kurzhantel-Bankdrücken', category: 'Chest' },
  'bench press schräg':             { name: 'Schrägbankdrücken', category: 'Chest' },
  'bankdrücken schräg maschine':    { name: 'Schrägbankdrücken (Maschine)', category: 'Chest' },
  'lateral incline press':          { name: 'Schrägbankdrücken (Maschine)', category: 'Chest' },
  'iso lateral horizontal bench press': { name: 'Brustpresse', category: 'Chest' },
  'ring push ups':                  { name: 'Ring-Liegestütze', category: 'Chest' },
  'ring pushups rollouts':          { name: 'Ring-Liegestütze + Rollout', category: 'Chest' },
  'pushups narrow':                 { name: 'Liegestütze (Eng)', category: 'Chest' },
  'push up one armed':              { name: 'Liegestütze (Einarmig)', category: 'Chest' },
  'one armed pushup':               { name: 'Liegestütze (Einarmig)', category: 'Chest' },
  'power push ups':                 { name: 'Liegestütze (Explosiv)', category: 'Chest' },
  'star push up':                   { name: 'Star Push-ups', category: 'Chest' },
  'dumbbell flies':                 { name: 'Kurzhantel-Fliegende', category: 'Chest' },
  'fliegende maschine':             { name: 'Butterfly (Maschine)', category: 'Chest' },
  'butterfly kombi machine':        { name: 'Butterfly (Maschine)', category: 'Chest' },
  'ring flies':                     { name: 'Ring-Fliegende', category: 'Chest' },

  // Beine
  'squat':                          { name: 'Kniebeugen', category: 'Legs' },
  'squats':                         { name: 'Kniebeugen', category: 'Legs' },
  'kniebeuge':                      { name: 'Kniebeugen', category: 'Legs' },
  'front squat':                    { name: 'Frontkniebeugen', category: 'Legs' },
  'front squat kettle bells':       { name: 'Frontkniebeugen (Kettlebell)', category: 'Legs' },
  'goblin squats':                  { name: 'Goblet Squats', category: 'Legs' },
  'single leg squat':               { name: 'Pistol Squats', category: 'Legs' },
  'pistol squats':                  { name: 'Pistol Squats', category: 'Legs' },
  'bulgarian split squats':         { name: 'Bulgarian Split Squats', category: 'Legs' },
  'hackenschmitt':                  { name: 'Hackenschmidt-Kniebeuge', category: 'Legs' },
  'leg press':                      { name: 'Beinpresse', category: 'Legs' },
  'beinpresse 45 grad':             { name: 'Beinpresse', category: 'Legs' },
  'rumänisches kreuzheben':         { name: 'Rumänisches Kreuzheben', category: 'Legs' },
  'deadlift single legged':         { name: 'Einbeiniges Kreuzheben', category: 'Legs' },
  'one legged dead lift with jump': { name: 'Einbeiniges Kreuzheben (Sprung)', category: 'Legs' },
  'leg curls':                      { name: 'Beinbeuger', category: 'Legs' },
  'beinbeuge sitzend':              { name: 'Beinbeuger', category: 'Legs' },
  'nordic curls':                   { name: 'Nordic Curls', category: 'Legs' },
  'leg extensions':                 { name: 'Beinstrecker', category: 'Legs' },
  'hip thrust':                     { name: 'Hip Thrusts', category: 'Legs' },
  'hip thrusts':                    { name: 'Hip Thrusts', category: 'Legs' },
  'single leg hip raise':           { name: 'Hip Thrusts (Einbeinig)', category: 'Legs' },
  'lunges':                         { name: 'Ausfallschritte', category: 'Legs' },
  'calf raises':                    { name: 'Wadenheben', category: 'Legs' },
  'wall seat heel lifts':           { name: 'Wandsitz Wadenheben', category: 'Legs' },
  'box jump over':                  { name: 'Box Jumps', category: 'Legs' },
  'single under':                   { name: 'Seilspringen (Single Under)', category: 'Legs' },

  // Schultern
  'shoulder dumbbell press':        { name: 'Kurzhantel-Schulterdrücken', category: 'Shoulders' },
  'cf dum bell press':              { name: 'Kurzhantel-Schulterdrücken', category: 'Shoulders' },
  'overhead press bar bell':        { name: 'Langhantel-Schulterdrücken', category: 'Shoulders' },
  'schulterdrücken':                { name: 'Langhantel-Schulterdrücken', category: 'Shoulders' },
  'overhead press seated':          { name: 'Schulterdrücken (Sitzend)', category: 'Shoulders' },
  'overhead press machine':         { name: 'Schulterdrücken (Maschine)', category: 'Shoulders' },
  'pike push ups rings':            { name: 'Pike Push-ups (Ringe)', category: 'Shoulders' },
  'pike push ups':                  { name: 'Pike Push-ups', category: 'Shoulders' },
  'pike push ups (zirkel)':         { name: 'Pike Push-ups', category: 'Shoulders' },
  'horizontal abduction dumbbell':  { name: 'Vorgebeugtes Seitheben', category: 'Shoulders' },
  'face pulls':                     { name: 'Face Pulls', category: 'Shoulders' },
  'seated external rotation':       { name: 'Außenrotation (Sitzend)', category: 'Shoulders' },
  'planche tuck':                   { name: 'Planche (Tuck)', category: 'Shoulders' },
  'seated dip one armed':           { name: 'Seated Dips (Einarmig)', category: 'Shoulders' },
  'shoulder walk one armed':        { name: 'Shoulder Walk (Einarmig)', category: 'Shoulders' },

  // Trizeps
  'dips benched':                   { name: 'Bank-Dips', category: 'Triceps' },
  'l-sit dips':                     { name: 'L-Sit Dips', category: 'Triceps' },
  'pppu':                           { name: 'Pseudo Planche Push-ups (PPPU)', category: 'Triceps' },
  'triceps pull downs':             { name: 'Trizeps-Drücken (Kabel)', category: 'Triceps' },
  'trizeps-drücken':                { name: 'Trizeps-Drücken (Kabel)', category: 'Triceps' },
  'triceps extensions':             { name: 'Trizeps-Strecken', category: 'Triceps' },

  // Bizeps
  '21s':                            { name: 'Bizeps 21s', category: 'Biceps' },
  'scott curls':                    { name: 'Scott-Curls', category: 'Biceps' },
  'dumbbell bicep curl':            { name: 'Kurzhantel-Curls', category: 'Biceps' },
  'bizeps-curls':                   { name: 'Kurzhantel-Curls', category: 'Biceps' },
  'cable curls':                    { name: 'Kabel-Curls', category: 'Biceps' },
  'ring curls':                     { name: 'Ring-Curls', category: 'Biceps' },

  // Bauch / Core
  'ring roll outs':                 { name: 'Ring Rollouts', category: 'Abs' },
  'hollow body hold':               { name: 'Hollow Body Hold', category: 'Abs' },
  'leg raises':                     { name: 'Beinheben', category: 'Abs' },
  'ring pallof press':              { name: 'Ring Pallof Press', category: 'Abs' },
  'pallof press':                   { name: 'Pallof Press', category: 'Abs' },
  'back lever tuck':                { name: 'Back Lever (Tuck)', category: 'Abs' },
  'front lever adv tuck':           { name: 'Front Lever (Adv. Tuck)', category: 'Abs' },
  'windshield wiper bar':           { name: 'Windshield Wiper (Stange)', category: 'Abs' },
  'hanging bent knee wiper':        { name: 'Windshield Wiper (Angewinkelt)', category: 'Abs' },
  'dragon flags':                   { name: 'Dragon Flags', category: 'Abs' },
  'plank elbow':                    { name: 'Plank', category: 'Abs' },
  'plank side':                     { name: 'Side Plank', category: 'Abs' },
  'plank hip taps':                 { name: 'Plank Hip Taps', category: 'Abs' },
  'plank push outs alternating':    { name: 'Plank Push-Outs', category: 'Abs' },
  'toes to bar':                    { name: 'Toes to Bar', category: 'Abs' },
  'reverse crunch':                 { name: 'Reverse Crunches', category: 'Abs' },
  'abdominal oblique crunch':       { name: 'Schräge Crunches', category: 'Abs' },
  'ring l sit':                     { name: 'Ring L-Sit', category: 'Abs' },
  'scissors dumbbell':              { name: 'Scissors (Kurzhantel)', category: 'Abs' },
  'hollow ball throws':             { name: 'Hollow Ball Throws', category: 'Abs' }
};

const SPORT_DRAFT_KEY = 'fuel_and_flow_workout_draft';

let sportDraft = null;
let sportPickerState = null; // { targetIndex: number | 'add', query: '', group: 'ALL' }
let sportRestEndMs = 0;
let sportRestInterval = null;
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
const ICON_COPY = '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
const ICON_SWAP = '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>';

const SPORT_ICON_BTN = 'w-8 h-8 shrink-0 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-border text-zinc-400 hover:text-white transition';
const SPORT_DEL_BTN = 'w-8 h-8 shrink-0 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-rose-500/15 border border-border hover:border-rose-500/30 text-zinc-400 hover:text-rose-400 transition';
const SPORT_INPUT = 'w-full px-2.5 py-2 rounded-xl bg-zinc-950 border border-border text-xs text-white focus:outline-none focus:border-emerald-500';

// ---------- HELFER & KONSOLIDIERUNG ----------
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

function canonicalizeExercise(rawName, rawCategory) {
  const trimmed = String(rawName || '').trim().replace(/\s+/g, ' ');
  const normCat = normalizeMuscleGroup(rawCategory);
  if (!trimmed) return { name: '', category: normCat };

  const key = trimmed.toLowerCase();
  if (EXERCISE_ALIASES[key]) {
    const mapped = EXERCISE_ALIASES[key];
    return { name: mapped.name, category: mapped.category || normCat };
  }
  const catHit = EXERCISE_CATALOG.find(c => c.name.toLowerCase() === key);
  if (catHit) {
    return { name: catHit.name, category: catHit.category || normCat };
  }
  return { name: trimmed, category: normCat };
}

function countUnconsolidatedExercises() {
  let n = 0;
  getWorkouts().forEach(w => {
    (w.exercises || []).forEach(ex => {
      const c = canonicalizeExercise(ex.name, ex.category);
      if (c.name !== ex.name || (c.category !== 'Other' && c.category !== normalizeMuscleGroup(ex.category))) {
        n++;
      }
    });
  });
  return n;
}

function consolidateAllWorkouts(silent = false) {
  let changed = 0;
  getWorkouts().forEach(w => {
    if (!Array.isArray(w.exercises)) return;
    const merged = [];
    const byKey = new Map();
    w.exercises.forEach(ex => {
      const c = canonicalizeExercise(ex.name, ex.category);
      if (c.name !== ex.name || c.category !== normalizeMuscleGroup(ex.category)) changed++;
      const k = c.name.toLowerCase();
      if (byKey.has(k)) {
        const target = byKey.get(k);
        target.sets = target.sets.concat(ex.sets || []);
        changed++;
      } else {
        const copy = { ...ex, name: c.name, category: c.category, sets: [...(ex.sets || [])] };
        byKey.set(k, copy);
        merged.push(copy);
      }
    });
    w.exercises = merged;
  });
  if (changed > 0) {
    saveState();
    render();
  }
  if (!silent) {
    alert(changed > 0
      ? `✅ ${changed} Übungseinträge erfolgreich vereinheitlicht & konsolidiert.`
      : 'Alle Übungsnamen sind bereits einheitlich.');
  }
  return changed;
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

function isExerciseTimed(ex) {
  if (ex.timed !== undefined) return Boolean(ex.timed);
  const sets = ex.sets || [];
  if (sets.length && sets.some(s => Number(s.sec) > 0) && sets.every(s => !(Number(s.reps) > 0))) return true;
  const catHit = EXERCISE_CATALOG.find(c => c.name.toLowerCase() === String(ex.name || '').toLowerCase());
  return Boolean(catHit && catHit.timed);
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

function getAllCatalogExercises() {
  const metaMap = getExerciseMetaMap();
  const byKey = new Map();
  EXERCISE_CATALOG.forEach(c => {
    const used = metaMap.get(c.name);
    byKey.set(c.name.toLowerCase(), {
      name: c.name,
      category: c.category,
      timed: Boolean(c.timed),
      count: used ? used.count : 0
    });
  });
  metaMap.forEach(m => {
    const k = m.name.toLowerCase();
    if (!byKey.has(k)) {
      byKey.set(k, { name: m.name, category: m.category, timed: false, count: m.count });
    }
  });
  return [...byKey.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'de'));
}

function lastSetsFor(name, excludeId) {
  const canon = canonicalizeExercise(name, 'Other').name.toLowerCase();
  if (!canon) return null;
  const list = [...getWorkouts()].filter(w => w.id !== excludeId).sort((a, b) => b.date.localeCompare(a.date));
  for (const w of list) {
    const ex = (w.exercises || []).find(e => canonicalizeExercise(e.name, e.category).name.toLowerCase() === canon);
    if (ex && ex.sets && ex.sets.length) {
      return {
        category: ex.category ? normalizeMuscleGroup(ex.category) : canonicalizeExercise(name, 'Other').category,
        timed: isExerciseTimed(ex),
        sets: ex.sets.map(s => ({ kg: s.kg ?? '', reps: s.reps ?? '', sec: s.sec ?? '', t: s.t || '', done: false }))
      };
    }
  }
  return null;
}

function getRecentWorkoutTemplates(limit = 5) {
  const sorted = [...getWorkouts()]
    .filter(w => w.type === 'strength' && (w.exercises || []).length > 0)
    .sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));
  const seen = new Set();
  const out = [];
  for (const w of sorted) {
    const label = (w.title || getActivityName(w.activityId) || 'Training').trim();
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ workout: w, label });
    if (out.length >= limit) break;
  }
  return out;
}

function syncSportDoneAfterRemoval(date, activityId, exceptId) {
  if (!activityId) return;
  const still = getWorkouts().some(w => w.id !== exceptId && w.date === date && w.activityId === activityId);
  if (still) return;
  const log = state.logs[date];
  if (log && Array.isArray(log.sportDone)) log.sportDone = log.sportDone.filter(id => id !== activityId);
}

// ---------- ENTWURF-PERSISTENZ (LIVE-WORKOUT IM GYM) ----------
function saveSportDraftLocal() {
  try {
    if (sportDraft && !sportDraft.id) {
      localStorage.setItem(SPORT_DRAFT_KEY, JSON.stringify(sportDraft));
    }
  } catch (e) {}
}

function loadSportDraftLocal() {
  try {
    const raw = localStorage.getItem(SPORT_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function clearSportDraftLocal() {
  try { localStorage.removeItem(SPORT_DRAFT_KEY); } catch (e) {}
}

// ---------- PAUSEN-TIMER ----------
function startSportRestTimer(seconds) {
  sportRestEndMs = Date.now() + seconds * 1000;
  if (sportRestInterval) clearInterval(sportRestInterval);
  updateSportRestTimerDom();
  sportRestInterval = setInterval(updateSportRestTimerDom, 500);
}

function stopSportRestTimer() {
  sportRestEndMs = 0;
  if (sportRestInterval) {
    clearInterval(sportRestInterval);
    sportRestInterval = null;
  }
  updateSportRestTimerDom();
}

function updateSportRestTimerDom() {
  const el = document.getElementById('sport-rest-display');
  if (!el) return;
  if (!sportRestEndMs) {
    el.textContent = 'Pause';
    el.className = 'text-[11px] font-medium text-zinc-400 tabular-nums';
    return;
  }
  const rem = Math.ceil((sportRestEndMs - Date.now()) / 1000);
  if (rem <= 0) {
    sportRestEndMs = 0;
    if (sportRestInterval) { clearInterval(sportRestInterval); sportRestInterval = null; }
    el.textContent = 'Los!';
    el.className = 'text-[11px] font-bold text-emerald-400 animate-pulse';
    try { if (navigator.vibrate) navigator.vibrate([120, 60, 120]); } catch (e) {}
    return;
  }
  const m = Math.floor(rem / 60);
  const s = rem % 60;
  el.textContent = `${m}:${String(s).padStart(2, '0')}`;
  el.className = 'text-[11px] font-bold text-amber-300 tabular-nums';
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
    const rawExName = String(cols[iEx] || '').trim();
    if (!wsRaw || !rawExName) continue;

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

    if (reps <= 0 && sec <= 0) continue;

    const workoutTitle = iName >= 0 ? String(cols[iName] || '').trim() : '';
    const weRaw = iEnd >= 0 ? String(cols[iEnd] || '').trim() : '';
    const canon = canonicalizeExercise(rawExName, iCat >= 0 ? cols[iCat] : 'Other');
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

    const exKey = canon.name.toLowerCase();
    let exObj = wo._exMap.get(exKey);
    if (!exObj) {
      exObj = { name: canon.name, category: canon.category, sets: [] };
      wo._exMap.set(exKey, exObj);
      wo.exercises.push(exObj);
    } else if (exObj.category === 'Other' && canon.category !== 'Other') {
      exObj.category = canon.category;
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
  const unconsolidated = countUnconsolidatedExercises();

  openModal(`
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-base font-semibold text-white">RepCount CSV-Import</h3>
          <p class="text-[11px] text-zinc-400">Importiert Workouts und vereinheitlicht Übungsnamen automatisch</p>
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
        <span class="text-[11px] text-zinc-400">Doppelte DE/EN-Übungsnamen (z. B. Pull Up → Klimmzüge) werden konsolidiert.</span>
        <input type="file" accept=".csv,text/csv" onchange="handleRepCountCsvImport(event)" class="hidden" />
      </label>

      ${unconsolidated > 0 ? `
        <button onclick="consolidateAllWorkouts(false); closeModal();"
          class="w-full py-2.5 rounded-2xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/35 text-sky-300 text-xs font-semibold transition">
          ✨ ${unconsolidated} bestehende Übungseinträge jetzt vereinheitlichen
        </button>
      ` : ''}

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
    sportSummaryDays = 0;
    saveState();
    closeModal();
    render();
    alert(`✅ RepCount-Import erfolgreich: ${added} neu, ${updated} aktualisiert (${totalSets} Sätze, Übungsnamen konsolidiert).`);
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

function resumeSavedWorkoutDraft() {
  const saved = loadSportDraftLocal();
  if (!saved) return;
  sportDraft = saved;
  sportPickerState = null;
  renderWorkoutModal();
}

function discardSavedWorkoutDraft() {
  if (!confirm('Ungespeichertes Training verwerfen?')) return;
  clearSportDraftLocal();
  sportDraft = null;
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
  const templates = getRecentWorkoutTemplates(6);
  const savedDraft = loadSportDraftLocal();
  const unconsolidated = countUnconsolidatedExercises();

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
    ${savedDraft ? `
      <section class="bg-emerald-500/15 border border-emerald-500/40 rounded-3xl p-3.5 flex items-center justify-between gap-2">
        <div class="min-w-0">
          <div class="text-xs font-semibold text-emerald-300 truncate">🏋️ Laufendes Training: ${sportEsc(savedDraft.title || 'Krafttraining')}</div>
          <div class="text-[11px] text-zinc-300">${(savedDraft.exercises || []).length} Übungen · zwischengespeichert</div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button onclick="discardSavedWorkoutDraft()" title="Verwerfen" class="px-2.5 py-1.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-rose-400 text-xs border border-border transition">✕</button>
          <button onclick="resumeSavedWorkoutDraft()" class="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold transition">Fortsetzen</button>
        </div>
      </section>
    ` : ''}

    ${unconsolidated > 0 ? `
      <section class="bg-sky-500/10 border border-sky-500/35 rounded-3xl p-3.5 flex items-center justify-between gap-2">
        <div class="min-w-0">
          <div class="text-xs font-semibold text-sky-300">Übungsnamen konsolidieren</div>
          <div class="text-[11px] text-zinc-400">${unconsolidated} Einträge mit DE/EN-Varianten gefunden (z. B. Pull Up → Klimmzüge)</div>
        </div>
        <button onclick="consolidateAllWorkouts(false)" class="shrink-0 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 text-xs font-semibold transition">Bereinigen</button>
      </section>
    ` : ''}

    <!-- Schnellstart & Vorlagen -->
    <section class="bg-card border border-border rounded-3xl p-4 space-y-3">
      <div class="flex items-center justify-between gap-2">
        <div>
          <h2 class="text-sm font-semibold text-white">Training starten</h2>
          <p class="text-[11px] text-zinc-400">Frei starten oder letztes Workout als Vorlage nehmen</p>
        </div>
        <div class="flex items-center gap-1.5">
          <button onclick="openRepCountImportModal()" title="RepCount CSV importieren" aria-label="RepCount CSV importieren"
            class="h-9 px-2.5 flex items-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-border text-zinc-200 text-xs font-medium transition">
            ${ICON_UPLOAD}<span>CSV</span>
          </button>
          <button onclick="openWorkoutModal()" title="Freie Einheit starten" aria-label="Neue Einheit"
            class="h-9 px-3 flex items-center gap-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold transition">
            ${ICON_PLUS}<span>Neu</span>
          </button>
        </div>
      </div>

      ${templates.length > 0 ? `
        <div class="space-y-1.5">
          <div class="text-[11px] text-zinc-400">Schnellstart aus letzten Workouts (Vorlagen)</div>
          <div class="flex gap-1.5 overflow-x-auto pb-1">
            ${templates.map(t => `
              <button onclick="startWorkoutFromTemplate('${t.workout.id}')"
                class="shrink-0 text-left px-3 py-2 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-border hover:border-emerald-500/40 transition min-w-[125px]">
                <div class="text-xs font-semibold text-white truncate">🏋️ ${sportEsc(t.label)}</div>
                <div class="text-[10px] text-zinc-400 mt-0.5">${t.workout.exercises.length} Übungen · ${workoutSetCount(t.workout)} Sätze</div>
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </section>

    <!-- Übersicht -->
    <section class="bg-card border border-border rounded-3xl p-4 space-y-3">
      <div class="flex items-center justify-between gap-2">
        <div>
          <h2 class="text-sm font-semibold text-white">Trainingsübersicht</h2>
          <p class="text-[11px] text-zinc-400">${sportSummaryDays > 0 ? `Letzte ${sportSummaryDays} Tage` : 'Gesamter Verlauf'}</p>
        </div>
        <div class="flex gap-1">
          ${rangeBtns.map(r => `
            <button onclick="setSportSummaryDays(${r.d})"
              class="px-2 py-1 rounded-lg text-[11px] font-medium transition border ${
                sportSummaryDays === r.d
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                  : 'bg-zinc-900 text-zinc-400 border-border hover:text-zinc-200'
              }">${r.label}</button>
          `).join('')}
        </div>
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

    <!-- Verlauf -->
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
        ? '<p class="text-xs text-zinc-500">Noch keine Einheiten erfasst. Tippe oben auf <b>CSV</b> für deinen RepCount-Import oder auf <b>+ Neu</b>.</p>'
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
        <div class="flex items-center gap-1 shrink-0">
          <button onclick="startWorkoutFromTemplate('${w.id}')" title="Als Vorlage für neues Training nutzen" aria-label="Als Vorlage nutzen"
            class="w-8 h-8 shrink-0 flex items-center justify-center rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-400 transition">${ICON_COPY}</button>
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
    let prKg = 0, pr1rm = 0, prReps = 0, prSec = 0;

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

// ---------- FLEXIBLE EINHEIT ERFASSEN / VORLAGE / BEARBEITEN ----------
function startWorkoutFromTemplate(sourceId) {
  const src = getWorkouts().find(w => w.id === sourceId);
  if (!src) return;
  sportDraft = {
    id: null,
    date: state.selectedDate,
    startedAt: Date.now(),
    title: src.title || getActivityName(src.activityId) || '',
    activityId: src.activityId || getDefaultStrengthActivityId(),
    type: src.type || 'strength',
    duration: '',
    notes: '',
    distance: src.distance || '',
    hr: '',
    elev: src.elev || '',
    exercises: (src.exercises || []).map(ex => {
      const c = canonicalizeExercise(ex.name, ex.category);
      const timed = isExerciseTimed(ex);
      return {
        name: c.name,
        category: c.category,
        timed,
        sets: (ex.sets || []).map(s => ({
          kg: s.kg ?? '',
          reps: s.reps ?? '',
          sec: s.sec ?? '',
          t: s.t || '',
          done: false
        }))
      };
    })
  };
  sportPickerState = null;
  saveSportDraftLocal();
  renderWorkoutModal();
}

function openWorkoutModal(id) {
  sportPickerState = null;
  if (id) {
    const found = getWorkouts().find(w => w.id === id);
    if (!found) return;
    sportDraft = JSON.parse(JSON.stringify(found));
    sportDraft.exercises = (sportDraft.exercises || []).map(ex => {
      const c = canonicalizeExercise(ex.name, ex.category);
      return {
        name: c.name,
        category: c.category,
        timed: isExerciseTimed(ex),
        sets: (ex.sets || []).map(s => ({
          kg: s.kg ?? '',
          reps: s.reps ?? '',
          sec: s.sec ?? '',
          t: s.t || '',
          done: true
        }))
      };
    });
    sportDraft.title = sportDraft.title || '';
  } else {
    const defAct = getDefaultStrengthActivityId();
    sportDraft = {
      id: null,
      date: state.selectedDate,
      startedAt: Date.now(),
      title: '',
      activityId: defAct,
      type: defAct ? sportKindFromName(getActivityName(defAct)) : 'strength',
      duration: '',
      notes: '',
      exercises: [],
      distance: '',
      hr: '',
      elev: ''
    };
    saveSportDraftLocal();
  }
  renderWorkoutModal();
}

function closeWorkoutModalKeepDraft() {
  saveSportDraftLocal();
  sportPickerState = null;
  closeModal();
  render();
}

function sportDraftSet(field, val) {
  sportDraft[field] = val;
  saveSportDraftLocal();
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
  saveSportDraftLocal();
  renderWorkoutModal(true);
}

function sportSetType(type) {
  sportDraft.type = type;
  saveSportDraftLocal();
  renderWorkoutModal(true);
}

function sportMoveExercise(i, delta) {
  const j = i + delta;
  if (j < 0 || j >= sportDraft.exercises.length) return;
  const arr = sportDraft.exercises;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  saveSportDraftLocal();
  renderWorkoutModal(true);
}

function sportRemoveExercise(i) {
  sportDraft.exercises.splice(i, 1);
  saveSportDraftLocal();
  renderWorkoutModal(true);
}

function sportToggleExTimed(i) {
  const ex = sportDraft.exercises[i];
  ex.timed = !ex.timed;
  saveSportDraftLocal();
  renderWorkoutModal(true);
}

function sportSetExCategory(i, val) {
  sportDraft.exercises[i].category = normalizeMuscleGroup(val);
  saveSportDraftLocal();
}

function sportCycleSetType(i, j) {
  const s = sportDraft.exercises[i].sets[j];
  s.t = s.t === '' ? 'w' : (s.t === 'w' ? 'd' : '');
  saveSportDraftLocal();
  renderWorkoutModal(true);
}

function sportToggleSetDone(i, j) {
  const s = sportDraft.exercises[i].sets[j];
  s.done = !s.done;
  saveSportDraftLocal();
  renderWorkoutModal(true);
}

function sportAddSet(i) {
  const sets = sportDraft.exercises[i].sets;
  const last = sets[sets.length - 1];
  sets.push(last
    ? { kg: last.kg, reps: last.reps, sec: last.sec || '', t: '', done: false }
    : { kg: '', reps: '', sec: '', t: '', done: false });
  saveSportDraftLocal();
  renderWorkoutModal(true);
}

function sportRemoveSet(i, j) {
  sportDraft.exercises[i].sets.splice(j, 1);
  saveSportDraftLocal();
  renderWorkoutModal(true);
}

function sportSetField(i, j, field, val) {
  sportDraft.exercises[i].sets[j][field] = val === '' ? '' : Number(val);
  saveSportDraftLocal();
}

// ---------- ÜBUNGS-PICKER (HINZUFÜGEN & AUSTAUSCHEN) ----------
function openSportExercisePicker(targetIndex) {
  const existingGroup = typeof targetIndex === 'number' && sportDraft.exercises[targetIndex]
    ? sportDraft.exercises[targetIndex].category
    : 'ALL';
  sportPickerState = {
    targetIndex,
    query: '',
    group: existingGroup && existingGroup !== 'Other' ? existingGroup : 'ALL'
  };
  renderWorkoutModal(false);
  setTimeout(() => {
    const inp = document.getElementById('sport-picker-search');
    if (inp) inp.focus();
  }, 40);
}

function closeSportExercisePicker() {
  sportPickerState = null;
  renderWorkoutModal(true);
}

function setSportPickerGroup(grp) {
  if (!sportPickerState) return;
  sportPickerState.group = grp;
  renderWorkoutModal(false);
}

function updateSportPickerQuery(val) {
  if (!sportPickerState) return;
  sportPickerState.query = val;
  const listEl = document.getElementById('sport-picker-list');
  if (listEl) listEl.innerHTML = renderSportPickerListHtml();
}

function pickSportExercise(name, category, timedHint) {
  if (!sportDraft || !sportPickerState) return;
  const c = canonicalizeExercise(name, category);
  if (!c.name) return;
  const prev = lastSetsFor(c.name, sportDraft.id);
  const resolvedCat = c.category !== 'Other' ? c.category : (prev ? prev.category : 'Other');
  const resolvedTimed = prev ? prev.timed : Boolean(timedHint);
  const nextSets = prev
    ? prev.sets
    : [{ kg: '', reps: resolvedTimed ? '' : 10, sec: resolvedTimed ? 30 : '', t: '', done: false }];

  if (sportPickerState.targetIndex === 'add') {
    sportDraft.exercises.push({
      name: c.name,
      category: resolvedCat,
      timed: resolvedTimed,
      sets: nextSets
    });
  } else if (typeof sportPickerState.targetIndex === 'number') {
    const idx = sportPickerState.targetIndex;
    sportDraft.exercises[idx] = {
      name: c.name,
      category: resolvedCat,
      timed: resolvedTimed,
      sets: nextSets
    };
  }
  sportPickerState = null;
  saveSportDraftLocal();
  renderWorkoutModal(true);
}

function pickCustomSportExercise() {
  if (!sportPickerState) return;
  const raw = String(sportPickerState.query || '').trim();
  if (!raw) return;
  const grp = sportPickerState.group !== 'ALL' ? sportPickerState.group : 'Other';
  pickSportExercise(raw, grp, false);
}

function renderSportPickerListHtml() {
  const st = sportPickerState;
  const q = String(st.query || '').trim().toLowerCase();
  const all = getAllCatalogExercises();
  const filtered = all.filter(item => {
    if (st.group !== 'ALL' && item.category !== st.group) return false;
    if (q && !item.name.toLowerCase().includes(q)) return false;
    return true;
  });

  const exactMatch = q && all.some(item => item.name.toLowerCase() === q);
  const customBtn = (q && !exactMatch) ? `
    <button onclick="pickCustomSportExercise()"
      class="w-full text-left px-3 py-2.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between transition">
      <span>+ Neue Übung „${sportEsc(st.query.trim())}“ anlegen</span>
      <span class="text-[10px] opacity-80">${st.group !== 'ALL' ? muscleGroupInfo(st.group).label : 'Sonstige'}</span>
    </button>
  ` : '';

  const rows = filtered.slice(0, 60).map(item => {
    const info = muscleGroupInfo(item.category);
    const safeName = item.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return `
      <button onclick="pickSportExercise('${safeName}', '${item.category}', ${item.timed ? 'true' : 'false'})"
        class="w-full text-left px-3 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-border flex items-center justify-between gap-2 transition">
        <div class="min-w-0 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full shrink-0" style="background:${info.color}"></span>
          <span class="text-xs font-medium text-white truncate">${sportEsc(item.name)}</span>
        </div>
        <div class="flex items-center gap-1.5 shrink-0 text-[10px] text-zinc-400">
          ${item.count > 0 ? `<span class="px-1.5 py-0.5 rounded-md bg-zinc-950 text-zinc-300">${item.count} S.</span>` : ''}
          <span>${info.label}</span>
        </div>
      </button>
    `;
  }).join('');

  return `${customBtn}${rows || '<p class="text-xs text-zinc-500 text-center py-4">Keine Übung gefunden – gib einfach einen eigenen Namen ein.</p>'}`;
}

function renderWorkoutModal(preserveScroll = false) {
  const modalBox = document.getElementById('modal-box');
  const prevScroll = preserveScroll && modalBox ? modalBox.scrollTop : 0;

  if (sportPickerState) {
    const isSwap = typeof sportPickerState.targetIndex === 'number';
    openModal(`
      <div class="space-y-3.5">
        <div class="flex items-center justify-between gap-2">
          <div>
            <h3 class="text-base font-semibold text-white">${isSwap ? 'Übung austauschen' : 'Übung hinzufügen'}</h3>
            <p class="text-[11px] text-zinc-400">Aus deinem konsolidierten Katalog wählen oder neu tippen</p>
          </div>
          <button onclick="closeSportExercisePicker()" class="px-2.5 py-1 rounded-xl bg-zinc-900 border border-border text-xs text-zinc-300 hover:text-white">← Zurück</button>
        </div>

        <input id="sport-picker-search" type="search" value="${sportEsc(sportPickerState.query)}"
          placeholder="Übung suchen oder neu eingeben…"
          oninput="updateSportPickerQuery(this.value)"
          class="${SPORT_INPUT}" />

        <div class="flex gap-1 overflow-x-auto pb-0.5">
          <button onclick="setSportPickerGroup('ALL')"
            class="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
              sportPickerState.group === 'ALL' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-zinc-900 text-zinc-400 border-border'
            }">Alle</button>
          ${MUSCLE_GROUPS.map(g => `
            <button onclick="setSportPickerGroup('${g.id}')"
              class="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
                sportPickerState.group === g.id ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-zinc-900 text-zinc-400 border-border'
              }">${g.label}</button>
          `).join('')}
        </div>

        <div id="sport-picker-list" class="space-y-1.5 max-h-[52vh] overflow-y-auto pr-0.5">
          ${renderSportPickerListHtml()}
        </div>
      </div>
    `);
    return;
  }

  const d = sportDraft;
  const typeBtn = (t, icon, label) => `
    <button onclick="sportSetType('${t}')" title="${label}" aria-label="${label}"
      class="flex-1 py-2 rounded-xl text-base transition ${d.type === t ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40' : 'bg-zinc-900 border border-border text-zinc-400 hover:text-zinc-200'}">${icon}</button>`;

  const totalSets = (d.exercises || []).reduce((a, e) => a + (e.sets || []).length, 0);
  const doneSets = (d.exercises || []).reduce((a, e) => a + (e.sets || []).filter(s => s.done).length, 0);

  let body = '';
  if (d.type === 'strength') {
    body = `
      <div class="flex items-center justify-between gap-2 bg-zinc-900/70 border border-border rounded-2xl px-3 py-2">
        <div class="flex items-center gap-2">
          <span id="sport-rest-display" class="text-[11px] font-medium text-zinc-400 tabular-nums">Pause</span>
          ${totalSets > 0 ? `<span class="text-[11px] text-zinc-500">· ${doneSets}/${totalSets} Sätze ✓</span>` : ''}
        </div>
        <div class="flex items-center gap-1">
          <button type="button" onclick="startSportRestTimer(60)" class="px-2 py-0.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-border text-[10px] text-zinc-300">60s</button>
          <button type="button" onclick="startSportRestTimer(90)" class="px-2 py-0.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-border text-[10px] text-zinc-300">90s</button>
          <button type="button" onclick="startSportRestTimer(120)" class="px-2 py-0.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-border text-[10px] text-zinc-300">2m</button>
          ${sportRestEndMs ? '<button type="button" onclick="stopSportRestTimer()" class="px-1.5 py-0.5 rounded-lg bg-rose-500/15 text-rose-300 text-[10px]">✕</button>' : ''}
        </div>
      </div>

      <div>
        <label class="text-[11px] text-zinc-400">Trainingsname / Vorlage (optional)</label>
        <input type="text" value="${sportEsc(d.title)}" placeholder="z. B. Hygia, Calisthenics, Push…" oninput="sportDraftSet('title', this.value)" class="${SPORT_INPUT} mt-1" />
      </div>

      <div class="space-y-3">
        ${d.exercises.map((ex, i) => {
          const prev = ex.name ? lastSetsFor(ex.name, d.id) : null;
          const catInfo = muscleGroupInfo(ex.category);
          const timed = Boolean(ex.timed);
          return `
          <div class="bg-zinc-900/80 border border-border rounded-2xl p-2.5 space-y-2">
            <div class="flex items-center justify-between gap-1.5">
              <div class="min-w-0 flex items-center gap-1.5 flex-1">
                <span class="w-2 h-2 rounded-full shrink-0" style="background:${catInfo.color}"></span>
                <span class="text-xs font-semibold text-white truncate">${sportEsc(ex.name || 'Übung wählen')}</span>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button type="button" onclick="sportMoveExercise(${i}, -1)" ${i === 0 ? 'disabled' : ''} title="Nach oben"
                  class="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-950 border border-border text-[11px] ${i === 0 ? 'text-zinc-700' : 'text-zinc-300 hover:text-white'}">↑</button>
                <button type="button" onclick="sportMoveExercise(${i}, 1)" ${i === d.exercises.length - 1 ? 'disabled' : ''} title="Nach unten"
                  class="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-950 border border-border text-[11px] ${i === d.exercises.length - 1 ? 'text-zinc-700' : 'text-zinc-300 hover:text-white'}">↓</button>
                <button type="button" onclick="openSportExercisePicker(${i})" title="Übung austauschen" aria-label="Übung austauschen"
                  class="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-border text-sky-400 transition">${ICON_SWAP}</button>
                <button type="button" onclick="sportRemoveExercise(${i})" title="Übung entfernen" aria-label="Übung entfernen"
                  class="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-950 hover:bg-rose-500/15 border border-border text-zinc-400 hover:text-rose-400 transition">${ICON_TRASH}</button>
              </div>
            </div>

            <div class="flex items-center justify-between gap-2">
              <select onchange="sportSetExCategory(${i}, this.value)" class="px-2 py-1 rounded-lg bg-zinc-950 border border-border text-[10px] text-zinc-300 focus:outline-none">
                ${MUSCLE_GROUPS.map(g => `<option value="${g.id}" ${g.id === ex.category ? 'selected' : ''}>${g.label}</option>`).join('')}
              </select>
              <button type="button" onclick="sportToggleExTimed(${i})"
                class="px-2 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-border text-[10px] text-zinc-300 transition">
                Modus: ${timed ? '⏱ Sek.' : '🔢 Wdh.'}
              </button>
            </div>

            ${prev ? `<div class="text-[10px] text-zinc-500 px-0.5 truncate">Vorher: ${prev.sets.map(fmtSetCompact).join(' · ')}</div>` : ''}

            <div class="grid grid-cols-[1.85rem_1fr_1fr_2rem_1.75rem] gap-1 text-[10px] text-zinc-500 px-0.5">
              <span class="text-center">Satz</span>
              <span>Gewicht (kg)</span>
              <span>${timed ? 'Zeit (s)' : 'Wdh.'}</span>
              <span class="text-center">✓</span>
              <span></span>
            </div>

            ${ex.sets.map((s, j) => {
              const badgeLbl = s.t === 'w' ? 'W' : (s.t === 'd' ? 'D' : String(j + 1));
              const badgeCls = s.t === 'w'
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                : (s.t === 'd' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-zinc-950 text-zinc-400 border-border');
              return `
              <div class="grid grid-cols-[1.85rem_1fr_1fr_2rem_1.75rem] gap-1 items-center ${s.done ? 'opacity-90' : ''}">
                <button type="button" onclick="sportCycleSetType(${i}, ${j})" title="Satz-Typ wechseln (Normal / Warm-up / Dropset)"
                  class="h-8 rounded-lg border text-[11px] font-semibold transition ${badgeCls}">${badgeLbl}</button>
                <input type="number" inputmode="decimal" step="0.5" min="0" value="${s.kg}" placeholder="0 = BW"
                  oninput="sportSetField(${i}, ${j}, 'kg', this.value)" class="${SPORT_INPUT}" />
                ${timed
                  ? `<input type="number" inputmode="numeric" step="1" min="0" value="${s.sec}" placeholder="Sek."
                      oninput="sportSetField(${i}, ${j}, 'sec', this.value)" class="${SPORT_INPUT}" />`
                  : `<input type="number" inputmode="numeric" step="1" min="0" value="${s.reps}" placeholder="Wdh."
                      oninput="sportSetField(${i}, ${j}, 'reps', this.value)" class="${SPORT_INPUT}" />`}
                <button type="button" onclick="sportToggleSetDone(${i}, ${j})" title="Satz abhaken"
                  class="h-8 rounded-lg border flex items-center justify-center transition ${
                    s.done
                      ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                      : 'bg-zinc-950 text-zinc-500 border-border hover:text-zinc-200'
                  }">${ICON_CHECK}</button>
                <button type="button" onclick="sportRemoveSet(${i}, ${j})" title="Satz entfernen" aria-label="Satz entfernen"
                  class="h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-rose-400 transition">${ICON_X}</button>
              </div>`;
            }).join('')}

            <button type="button" onclick="sportAddSet(${i})" title="Satz hinzufügen (kopiert letzten Satz)" aria-label="Satz hinzufügen"
              class="w-full py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-dashed border-border text-zinc-400 hover:text-emerald-400 flex items-center justify-center gap-1 text-[11px] transition">${ICON_PLUS} Satz</button>
          </div>`;
        }).join('')}

        <button type="button" onclick="openSportExercisePicker('add')"
          class="w-full py-2.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 flex items-center justify-center gap-1.5 text-xs font-semibold transition">
          ${ICON_PLUS} Übung hinzufügen
        </button>
      </div>

      <div>
        <label class="text-[11px] text-zinc-400">Dauer (min, leer = automatisch aus Startzeit)</label>
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
        <h3 class="text-base font-semibold text-white">${d.id ? 'Einheit bearbeiten' : 'Training erfassen'}</h3>
        <button onclick="${d.id ? 'closeModal()' : 'closeWorkoutModalKeepDraft()'}" title="${d.id ? 'Schließen' : 'Zwischenspeichern & schließen'}" class="text-zinc-400 hover:text-white px-2 py-1">✕</button>
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
        <button onclick="${d.id ? 'closeModal()' : 'closeWorkoutModalKeepDraft()'}" title="${d.id ? 'Abbrechen' : 'Später fortsetzen'}"
          class="px-3.5 h-11 flex items-center justify-center rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-border text-zinc-300 text-xs font-medium transition">${d.id ? 'Abbrechen' : 'Parken'}</button>
        <button onclick="saveWorkout()" title="Training abschließen & speichern" aria-label="Speichern"
          class="flex-1 h-11 flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition">${ICON_CHECK} Speichern</button>
      </div>
    </div>
  `);
  if (d.type === 'cardio') updateSportLivePace();
  if (d.type === 'strength') updateSportRestTimerDom();
  if (preserveScroll && modalBox) modalBox.scrollTop = prevScroll;
}

function saveWorkout() {
  const d = sportDraft;
  if (!d.date) return alert('Bitte ein Datum wählen.');
  if (!d.activityId) return alert('Bitte zuerst unter Habits eine Aktivität anlegen.');

  let dur = Number(d.duration) || 0;
  if (!dur && d.startedAt) {
    const mins = Math.round((Date.now() - d.startedAt) / 60000);
    if (mins >= 2 && mins <= 300) dur = mins;
  }

  const w = {
    id: d.id || 'wo_' + Date.now(),
    date: d.date,
    activityId: d.activityId,
    type: d.type,
    duration: dur,
    notes: (d.notes || '').trim()
  };
  if (d.source) w.source = d.source;
  if (d.title && d.title.trim()) w.title = d.title.trim();

  if (d.type === 'strength') {
    w.exercises = d.exercises
      .map(ex => {
        const c = canonicalizeExercise(ex.name, ex.category);
        return {
          name: c.name,
          category: c.category,
          sets: (ex.sets || [])
            .filter(s => Number(s.reps) > 0 || Number(s.sec) > 0)
            .map(s => {
              const out = { kg: Number(s.kg) || 0, reps: ex.timed ? 0 : (Number(s.reps) || 0) };
              if (ex.timed && Number(s.sec) > 0) out.sec = Number(s.sec);
              else if (!ex.timed && Number(s.sec) > 0) out.sec = Number(s.sec);
              if (s.t) out.t = s.t;
              return out;
            })
        };
      })
      .filter(ex => ex.name && ex.sets.length > 0);
    if (w.exercises.length === 0) return alert('Bitte mindestens eine Übung mit einem gültigen Satz (Wdh. oder Sek. > 0) erfassen.');
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

  stopSportRestTimer();
  clearSportDraftLocal();
  saveState();
  closeModal();
  sportDraft = null;
  sportPickerState = null;
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
