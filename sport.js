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
const DEFAULT_PINNED_EXERCISES = [
  'Dips',
  'Klimmzüge',
  'Kurzhantel-Bankdrücken',
  'Bankdrücken',
  'Kurzhantel-Schulterdrücken',
  'Kniebeugen'
];

let sportDraft = null;
let sportLiveOpen = false;
let sportPickerState = null; // { targetIndex: number | 'add' | 'pin', query: '', group: 'ALL' }
let sportTemplatePickerQuery = '';
let sportRestEndMs = 0;
let sportRestInterval = null;
let sportClockInterval = null;
let sportProgressEx = null;
let sportProgressGroup = 'ALL';
let sportProgressRange = 'ALL'; // '90' | '365' | 'ALL'
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

// ---------- LIVE-STOPPUHR & PAUSEN-TIMER ----------
function getDraftElapsedMs(d) {
  if (!d) return 0;
  let ms = Number(d.elapsedMs) || 0;
  if (d.timerRunning && d.timerStartedAt) {
    ms += Math.max(0, Date.now() - Number(d.timerStartedAt));
  }
  return ms;
}

function fmtClockMs(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function ensureSportClockTicker() {
  if (sportClockInterval) return;
  sportClockInterval = setInterval(() => {
    const active = sportDraft || loadSportDraftLocal();
    const clockEl = document.getElementById('sport-live-clock');
    const bannerEl = document.getElementById('sport-banner-clock');
    if (!active || (!clockEl && !bannerEl)) {
      if (!active) {
        clearInterval(sportClockInterval);
        sportClockInterval = null;
      }
      return;
    }
    const txt = fmtClockMs(getDraftElapsedMs(active));
    if (clockEl) clockEl.textContent = txt;
    if (bannerEl) bannerEl.textContent = txt;
  }, 1000);
}

function toggleSportWorkoutTimer() {
  if (!sportDraft) return;
  const now = Date.now();
  if (sportDraft.timerRunning) {
    sportDraft.elapsedMs = getDraftElapsedMs(sportDraft);
    sportDraft.timerRunning = false;
    sportDraft.timerStartedAt = null;
  } else {
    if (!sportDraft.firstStartedAt) sportDraft.firstStartedAt = now;
    sportDraft.timerRunning = true;
    sportDraft.timerStartedAt = now;
    ensureSportClockTicker();
  }
  saveSportDraftLocal();
  render();
}

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
    el.textContent = 'Pausen-Timer';
    el.className = 'text-xs font-medium text-zinc-400 tabular-nums';
    return;
  }
  const rem = Math.ceil((sportRestEndMs - Date.now()) / 1000);
  if (rem <= 0) {
    sportRestEndMs = 0;
    if (sportRestInterval) { clearInterval(sportRestInterval); sportRestInterval = null; }
    el.textContent = 'Pause vorbei!';
    el.className = 'text-xs font-bold text-emerald-400 animate-pulse';
    try { if (navigator.vibrate) navigator.vibrate([120, 60, 120]); } catch (e) {}
    return;
  }
  const m = Math.floor(rem / 60);
  const s = rem % 60;
  el.textContent = `Pause ${m}:${String(s).padStart(2, '0')}`;
  el.className = 'text-xs font-bold text-amber-300 tabular-nums';
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

// ---------- PINNED KPI-ÜBUNGEN & TAB-RENDERING ----------
function getPinnedExercises() {
  if (!Array.isArray(state.pinnedExercises) || state.pinnedExercises.length === 0) {
    const trained = getExerciseMetaMap();
    const defaults = DEFAULT_PINNED_EXERCISES.filter(n => trained.has(n));
    if (defaults.length >= 3) return defaults.slice(0, 6);
    const top = [...trained.values()].sort((a, b) => b.count - a.count).map(x => x.name);
    const merged = [...new Set([...defaults, ...top, ...DEFAULT_PINNED_EXERCISES])];
    return merged.slice(0, 6);
  }
  return state.pinnedExercises;
}

function togglePinnedExercise(name) {
  const cur = [...getPinnedExercises()];
  const idx = cur.indexOf(name);
  if (idx >= 0) {
    if (cur.length <= 1) return;
    cur.splice(idx, 1);
  } else {
    cur.push(name);
  }
  state.pinnedExercises = cur;
  saveState();
  openPinnedExercisesModal();
  render();
}

function openPinnedExercisesModal() {
  const pinned = getPinnedExercises();
  const all = getAllCatalogExercises().filter(x => x.count > 0 || pinned.includes(x.name));
  const list = all.length ? all : getAllCatalogExercises().slice(0, 30);
  openModal(`
    <div class="space-y-3.5">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-base font-semibold text-white">KPI-Übungen wählen</h3>
          <p class="text-[11px] text-zinc-400">Welche Übungen sollen in deiner Leistungsübersicht stehen?</p>
        </div>
        <button onclick="closeModal()" class="text-zinc-400 hover:text-white px-2 py-1">✕</button>
      </div>
      <div class="flex flex-wrap gap-1.5 max-h-[55vh] overflow-y-auto pr-0.5">
        ${list.map(item => {
          const isOn = pinned.includes(item.name);
          const info = muscleGroupInfo(item.category);
          const safe = item.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          return `
            <button onclick="togglePinnedExercise('${safe}')"
              class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition ${
                isOn ? 'bg-emerald-500/20 text-white border-emerald-500/50' : 'bg-zinc-950 text-zinc-400 border-border hover:text-zinc-200'
              }">
              <span class="w-2 h-2 rounded-full" style="background:${info.color}"></span>
              <span>${sportEsc(item.name)}</span>
              ${item.count > 0 ? `<span class="text-[10px] text-zinc-500">${item.count}</span>` : ''}
            </button>`;
        }).join('')}
      </div>
      <button onclick="closeModal()" class="w-full py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition">Fertig</button>
    </div>
  `);
}

function getExerciseKpiStats(exName) {
  const key = canonicalizeExercise(exName, 'Other').name.toLowerCase();
  const sorted = [...getWorkouts()].sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));
  let latest = null;
  let prKg = 0;
  let prKgReps = 0;
  let prReps = 0;
  let prSec = 0;
  let category = canonicalizeExercise(exName, 'Other').category;

  for (const w of sorted) {
    const ex = (w.exercises || []).find(e => canonicalizeExercise(e.name, e.category).name.toLowerCase() === key);
    if (!ex || !(ex.sets || []).length) continue;
    if (category === 'Other' && ex.category) category = normalizeMuscleGroup(ex.category);
    if (!latest) {
      latest = { date: w.date, sets: ex.sets };
    }
    ex.sets.forEach(s => {
      const kg = Number(s.kg) || 0;
      const reps = Number(s.reps) || 0;
      const sec = Number(s.sec) || 0;
      if (kg > prKg || (kg === prKg && reps > prKgReps)) {
        prKg = kg;
        prKgReps = reps;
      }
      if (reps > prReps) prReps = reps;
      if (sec > prSec) prSec = sec;
    });
  }
  return { name: exName, category, latest, prKg, prKgReps, prReps, prSec };
}

function selectProgressExerciseFromKpi(exName) {
  sportProgressGroup = 'ALL';
  sportProgressEx = exName;
  render();
  setTimeout(() => {
    const el = document.getElementById('sec-sport-progress');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 40);
}

function renderPerformanceKpis() {
  const pinned = getPinnedExercises();
  const cards = pinned.map(getExerciseKpiStats);
  const hasAny = cards.some(c => c.latest);

  return `
    <section class="bg-card border border-border rounded-3xl p-4 space-y-3">
      <div class="flex items-center justify-between gap-2">
        <div>
          <h2 class="text-sm font-semibold text-white">Aktuelle Leistungen</h2>
          <p class="text-[11px] text-zinc-400">Letzte Sätze &amp; Bestleistung deiner Kernübungen</p>
        </div>
        <button onclick="openPinnedExercisesModal()" title="KPI-Übungen anpassen"
          class="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-border text-zinc-300 text-xs font-medium transition">
          ⚙ Auswahl
        </button>
      </div>

      ${!hasAny
        ? `<div class="space-y-2">
             <p class="text-xs text-zinc-500">Auf diesem Gerät sind aktuell 0 Workouts gespeichert.</p>
             <div class="flex flex-wrap gap-2">
               <button onclick="pullStateFromCloud(true)" class="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/35 text-sky-300 text-xs font-semibold transition">
                 ☁️ Aus Cloud laden
               </button>
               <button onclick="openRepCountImportModal()" class="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-border text-zinc-200 text-xs font-medium transition">
                 CSV importieren
               </button>
             </div>
           </div>`
        : `
          <div class="grid grid-cols-2 gap-2">
            ${cards.map(c => {
              const info = muscleGroupInfo(c.category);
              const safe = c.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
              let headline = '—';
              let subline = 'Noch nicht trainiert';
              let prLine = '';

              if (c.latest) {
                const sets = c.latest.sets;
                const timed = sets.some(s => Number(s.sec) > 0) && sets.every(s => !(Number(s.reps) > 0));
                if (timed) {
                  const maxS = Math.max(...sets.map(s => Number(s.sec) || 0));
                  headline = `${maxS} s`;
                  subline = `${sets.length}× · ${sets.map(s => `${Math.round(Number(s.sec) || 0)}s`).join(' / ')}`;
                  prLine = `🏆 PR ${c.prSec} s`;
                } else {
                  const topKg = Math.max(...sets.map(s => Number(s.kg) || 0));
                  const topSets = sets.filter(s => (Number(s.kg) || 0) === topKg);
                  const repsStr = topSets.map(s => Number(s.reps) || 0).join(' / ');
                  headline = topKg > 0 ? `${fmtNum(topKg, 1)} kg` : 'Bodyweight';
                  subline = `${topSets.length} Sätze: ${repsStr} Wdh.`;
                  prLine = c.prKg > 0 ? `🏆 ${fmtNum(c.prKg, 1)} kg × ${c.prKgReps}` : `🏆 ${c.prReps} Wdh.`;
                }
              }

              return `
                <button onclick="selectProgressExerciseFromKpi('${safe}')"
                  class="text-left bg-zinc-900/80 hover:bg-zinc-800/80 border border-border hover:border-emerald-500/35 rounded-2xl p-3 space-y-1 transition">
                  <div class="flex items-center justify-between gap-1">
                    <span class="flex items-center gap-1.5 min-w-0">
                      <span class="w-2 h-2 rounded-full shrink-0" style="background:${info.color}"></span>
                      <span class="text-xs font-semibold text-white truncate">${sportEsc(c.name)}</span>
                    </span>
                    ${c.latest ? `<span class="text-[10px] text-zinc-500 shrink-0">${formatDisplayDate(c.latest.date)}</span>` : ''}
                  </div>
                  <div class="text-sm font-bold text-emerald-400 leading-tight">${headline}</div>
                  <div class="text-[11px] text-zinc-300 truncate">${subline}</div>
                  ${prLine ? `<div class="text-[10px] text-amber-300/90 pt-0.5">${prLine}</div>` : ''}
                </button>
              `;
            }).join('')}
          </div>
        `}
    </section>
  `;
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
  sportLiveOpen = true;
  sportPickerState = null;
  if (sportDraft.timerRunning) ensureSportClockTicker();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function discardSavedWorkoutDraft() {
  if (!confirm('Laufendes Training wirklich verwerfen?')) return;
  stopSportRestTimer();
  clearSportDraftLocal();
  sportDraft = null;
  sportLiveOpen = false;
  render();
}

function renderSportTab() {
  if (sportLiveOpen && sportDraft) {
    if (sportDraft.timerRunning) ensureSportClockTicker();
    setTimeout(() => {
      updateSportRestTimerDom();
      if (sportDraft && sportDraft.type === 'cardio') updateSportLivePace();
    }, 0);
    return renderLiveWorkoutView();
  }

  const workouts = [...getWorkouts()].sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));
  const templates = getRecentWorkoutTemplates(6);
  const savedDraft = sportDraft && !sportDraft.id ? sportDraft : loadSportDraftLocal();
  if (savedDraft && savedDraft.timerRunning) ensureSportClockTicker();
  const unconsolidated = countUnconsolidatedExercises();

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
      <section class="bg-emerald-500/15 border border-emerald-500/45 rounded-3xl p-3.5 flex items-center justify-between gap-2">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold text-emerald-300 truncate">🏋️ ${sportEsc(savedDraft.title || 'Laufendes Training')}</span>
            <span id="sport-banner-clock" class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-[11px] font-bold tabular-nums">${fmtClockMs(getDraftElapsedMs(savedDraft))}</span>
          </div>
          <div class="text-[11px] text-zinc-300 mt-0.5">${(savedDraft.exercises || []).length} Übungen · ${savedDraft.timerRunning ? 'Zeit läuft' : 'pausiert / bereit'}</div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button onclick="discardSavedWorkoutDraft()" title="Verwerfen" class="px-2.5 py-1.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-rose-400 text-xs border border-border transition">✕</button>
          <button onclick="resumeSavedWorkoutDraft()" class="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold transition">Öffnen</button>
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

    <!-- Training starten & Vorlagen -->
    <section class="bg-card border border-border rounded-3xl p-4 space-y-3">
      <div class="flex items-center justify-between gap-2">
        <div>
          <h2 class="text-sm font-semibold text-white">Training starten</h2>
          <p class="text-[11px] text-zinc-400">Aus bisherigem Workout starten oder frei anlegen</p>
        </div>
        <div class="flex items-center gap-1.5">
          <button onclick="openSportVoiceDictationModal(true)" title="Neues Training per Sprache diktieren" aria-label="Training diktieren"
            class="h-9 px-2.5 flex items-center gap-1 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/35 text-violet-300 text-xs font-semibold transition">
            <span>🎙️</span><span>Diktieren</span>
          </button>
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
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[11px] text-zinc-400">Auf Basis bisheriger Einheiten (vorbefüllt)</span>
            <button onclick="openTemplatePickerModal()" class="text-[11px] font-medium text-emerald-400 hover:text-emerald-300">Alle wählen →</button>
          </div>
          <div class="flex gap-1.5 overflow-x-auto pb-1">
            ${templates.map(t => `
              <button onclick="startWorkoutFromTemplate('${t.workout.id}')"
                class="shrink-0 text-left px-3 py-2 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-border hover:border-emerald-500/40 transition min-w-[130px]">
                <div class="text-xs font-semibold text-white truncate">🏋️ ${sportEsc(t.label)}</div>
                <div class="text-[10px] text-zinc-400 mt-0.5">${t.workout.exercises.length} Übungen · ${workoutSetCount(t.workout)} Sätze</div>
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </section>

    ${renderPerformanceKpis()}

    ${renderMuscleAnatomyCard(workouts)}

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

// ---------- ANATOMISCHE MUSKEL-FOKUS-KARTE ----------
let sportAnatomyTarget = 'latest'; // 'latest' | '7d' | '30d' | workoutId

function setSportAnatomyTarget(val) {
  sportAnatomyTarget = val;
  render();
}

function showWorkoutInAnatomy(workoutId) {
  sportAnatomyTarget = workoutId;
  render();
  setTimeout(() => {
    const el = document.getElementById('sec-sport-anatomy');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 40);
}

function computeMuscleSetCounts(workoutList) {
  const counts = { Back: 0, Chest: 0, Legs: 0, Shoulders: 0, Triceps: 0, Biceps: 0, Abs: 0 };
  (workoutList || []).forEach(w => {
    (w.exercises || []).forEach(ex => {
      const g = normalizeMuscleGroup(ex.category);
      const n = (ex.sets || []).length;
      if (n > 0 && counts[g] !== undefined) counts[g] += n;
    });
  });
  return counts;
}

function muscleHeatFill(count, maxVal) {
  if (!count || count <= 0 || !maxVal) return { fill: '#27272a', stroke: '#3f3f46', opacity: '0.85' };
  const ratio = count / maxVal;
  if (ratio >= 0.72) return { fill: '#f43f5e', stroke: '#fb7185', opacity: '0.95' }; // Top-Fokus
  if (ratio >= 0.38) return { fill: '#f59e0b', stroke: '#fbbf24', opacity: '0.88' }; // Mittel
  return { fill: '#10b981', stroke: '#34d399', opacity: '0.72' }; // Leicht
}

function renderAnatomicalBodySvg(counts) {
  const vals = Object.values(counts).filter(v => v > 0);
  const maxVal = vals.length ? Math.max(...vals) : 0;
  const st = (g) => {
    const c = muscleHeatFill(counts[g] || 0, maxVal);
    return `fill="${c.fill}" stroke="${c.stroke}" stroke-width="0.9" fill-opacity="${c.opacity}"`;
  };
  const bodyBase = 'fill="#18181d" stroke="#3f3f46" stroke-width="1.1"';

  return `
    <svg viewBox="0 0 280 230" class="w-full max-w-[300px] mx-auto h-52 select-none">
      <!-- ===== VORDERSEITE (x: 0..140, center 70) ===== -->
      <text x="70" y="13" text-anchor="middle" font-size="9" fill="#71717a" font-weight="600">VORDERSEITE</text>
      <!-- Kopf & Hals -->
      <circle cx="70" cy="31" r="11" ${bodyBase} />
      <rect x="65" y="42" width="10" height="7" rx="3" ${bodyBase} />
      <!-- Rumpf-Silhouette -->
      <path d="M50 51 Q70 47 90 51 L87 109 Q70 116 53 109 Z" ${bodyBase} />
      <!-- Unterarme & Hände -->
      <path d="M40 82 L33 114 L39 116 L46 84 Z" ${bodyBase} />
      <path d="M100 82 L107 114 L101 116 L94 84 Z" ${bodyBase} />
      <!-- Füße -->
      <ellipse cx="58" cy="216" rx="7" ry="4" ${bodyBase} />
      <ellipse cx="82" cy="216" rx="7" ry="4" ${bodyBase} />

      <!-- Schultern (Front Delts) -->
      <ellipse cx="45" cy="59" rx="7.5" ry="9" ${st('Shoulders')}><title>Schultern: ${counts.Shoulders || 0} Sätze</title></ellipse>
      <ellipse cx="95" cy="59" rx="7.5" ry="9" ${st('Shoulders')}><title>Schultern: ${counts.Shoulders || 0} Sätze</title></ellipse>
      <!-- Brust (Pecs) -->
      <path d="M52 54 Q61 52 69 57 L69 73 Q58 76 52 69 Z" ${st('Chest')}><title>Brust: ${counts.Chest || 0} Sätze</title></path>
      <path d="M88 54 Q79 52 71 57 L71 73 Q82 76 88 69 Z" ${st('Chest')}><title>Brust: ${counts.Chest || 0} Sätze</title></path>
      <!-- Bizeps -->
      <ellipse cx="43" cy="77" rx="5.5" ry="12" transform="rotate(8 43 77)" ${st('Biceps')}><title>Bizeps: ${counts.Biceps || 0} Sätze</title></ellipse>
      <ellipse cx="97" cy="77" rx="5.5" ry="12" transform="rotate(-8 97 77)" ${st('Biceps')}><title>Bizeps: ${counts.Biceps || 0} Sätze</title></ellipse>
      <!-- Bauch / Core (6-Pack) -->
      <rect x="60" y="76" width="8.5" height="8" rx="2.5" ${st('Abs')}><title>Bauch/Core: ${counts.Abs || 0} Sätze</title></rect>
      <rect x="71.5" y="76" width="8.5" height="8" rx="2.5" ${st('Abs')}><title>Bauch/Core: ${counts.Abs || 0} Sätze</title></rect>
      <rect x="60" y="86" width="8.5" height="8" rx="2.5" ${st('Abs')}><title>Bauch/Core: ${counts.Abs || 0} Sätze</title></rect>
      <rect x="71.5" y="86" width="8.5" height="8" rx="2.5" ${st('Abs')}><title>Bauch/Core: ${counts.Abs || 0} Sätze</title></rect>
      <rect x="61" y="96" width="7.5" height="9" rx="2.5" ${st('Abs')}><title>Bauch/Core: ${counts.Abs || 0} Sätze</title></rect>
      <rect x="71.5" y="96" width="7.5" height="9" rx="2.5" ${st('Abs')}><title>Bauch/Core: ${counts.Abs || 0} Sätze</title></rect>
      <!-- Beine vorn (Quads & Waden) -->
      <path d="M53 114 L67 116 L65 162 L54 162 Z" rx="6" ${st('Legs')}><title>Beine: ${counts.Legs || 0} Sätze</title></path>
      <path d="M87 114 L73 116 L75 162 L86 162 Z" rx="6" ${st('Legs')}><title>Beine: ${counts.Legs || 0} Sätze</title></path>
      <path d="M55 167 L64 167 L62 210 L55 210 Z" ${st('Legs')}><title>Beine: ${counts.Legs || 0} Sätze</title></path>
      <path d="M85 167 L76 167 L78 210 L85 210 Z" ${st('Legs')}><title>Beine: ${counts.Legs || 0} Sätze</title></path>

      <!-- ===== RÜCKSEITE (x: 140..280, center 210) ===== -->
      <text x="210" y="13" text-anchor="middle" font-size="9" fill="#71717a" font-weight="600">RÜCKSEITE</text>
      <!-- Kopf & Hals -->
      <circle cx="210" cy="31" r="11" ${bodyBase} />
      <rect x="205" y="42" width="10" height="7" rx="3" ${bodyBase} />
      <!-- Rumpf-Silhouette -->
      <path d="M190 51 Q210 47 230 51 L227 109 Q210 116 193 109 Z" ${bodyBase} />
      <!-- Unterarme & Hände -->
      <path d="M180 82 L173 114 L179 116 L186 84 Z" ${bodyBase} />
      <path d="M240 82 L247 114 L241 116 L234 84 Z" ${bodyBase} />
      <!-- Füße -->
      <ellipse cx="198" cy="216" rx="7" ry="4" ${bodyBase} />
      <ellipse cx="222" cy="216" rx="7" ry="4" ${bodyBase} />

      <!-- Hintere Schultern -->
      <ellipse cx="185" cy="59" rx="7.5" ry="9" ${st('Shoulders')}><title>Schultern: ${counts.Shoulders || 0} Sätze</title></ellipse>
      <ellipse cx="235" cy="59" rx="7.5" ry="9" ${st('Shoulders')}><title>Schultern: ${counts.Shoulders || 0} Sätze</title></ellipse>
      <!-- Rücken (Trapez, Lats & unterer Rücken) -->
      <path d="M198 50 L210 46 L222 50 L216 68 L204 68 Z" ${st('Back')}><title>Rücken: ${counts.Back || 0} Sätze</title></path>
      <path d="M191 58 L208 69 L206 96 L194 90 Z" ${st('Back')}><title>Rücken: ${counts.Back || 0} Sätze</title></path>
      <path d="M229 58 L212 69 L214 96 L226 90 Z" ${st('Back')}><title>Rücken: ${counts.Back || 0} Sätze</title></path>
      <rect x="201" y="94" width="18" height="14" rx="4" ${st('Back')}><title>Rücken: ${counts.Back || 0} Sätze</title></rect>
      <!-- Trizeps -->
      <ellipse cx="183" cy="77" rx="5.5" ry="12" transform="rotate(8 183 77)" ${st('Triceps')}><title>Trizeps: ${counts.Triceps || 0} Sätze</title></ellipse>
      <ellipse cx="237" cy="77" rx="5.5" ry="12" transform="rotate(-8 237 77)" ${st('Triceps')}><title>Trizeps: ${counts.Triceps || 0} Sätze</title></ellipse>
      <!-- Beine hinten (Glutes, Hamstrings & Waden) -->
      <ellipse cx="201" cy="119" rx="9" ry="10" ${st('Legs')}><title>Beine: ${counts.Legs || 0} Sätze</title></ellipse>
      <ellipse cx="219" cy="119" rx="9" ry="10" ${st('Legs')}><title>Beine: ${counts.Legs || 0} Sätze</title></ellipse>
      <path d="M193 130 L207 130 L205 164 L194 164 Z" ${st('Legs')}><title>Beine: ${counts.Legs || 0} Sätze</title></path>
      <path d="M227 130 L213 130 L215 164 L226 164 Z" ${st('Legs')}><title>Beine: ${counts.Legs || 0} Sätze</title></path>
      <path d="M195 168 L205 168 L202 210 L195 210 Z" ${st('Legs')}><title>Beine: ${counts.Legs || 0} Sätze</title></path>
      <path d="M225 168 L215 168 L218 210 L225 210 Z" ${st('Legs')}><title>Beine: ${counts.Legs || 0} Sätze</title></path>
    </svg>
  `;
}

function renderMuscleAnatomyCard(workouts) {
  const strengthWorkouts = (workouts || []).filter(w => w.type === 'strength' && (w.exercises || []).length > 0);
  if (!strengthWorkouts.length) return '';

  let selectedList = [];
  let subtitle = '';
  if (sportAnatomyTarget === '7d') {
    const cut = getPastDateStr(6);
    selectedList = strengthWorkouts.filter(w => w.date >= cut);
    subtitle = `Letzte 7 Tage (${selectedList.length} Einheiten)`;
  } else if (sportAnatomyTarget === '30d') {
    const cut = getPastDateStr(29);
    selectedList = strengthWorkouts.filter(w => w.date >= cut);
    subtitle = `Letzte 30 Tage (${selectedList.length} Einheiten)`;
  } else {
    const w = sportAnatomyTarget === 'latest'
      ? strengthWorkouts[0]
      : (strengthWorkouts.find(x => x.id === sportAnatomyTarget) || strengthWorkouts[0]);
    selectedList = w ? [w] : [];
    subtitle = w ? `${w.title || getActivityName(w.activityId)} · ${formatDisplayDate(w.date)}` : '';
  }

  const counts = computeMuscleSetCounts(selectedList);
  const ranked = Object.entries(counts)
    .filter(([, cnt]) => cnt > 0)
    .sort((a, b) => b[1] - a[1]);
  const maxVal = ranked.length ? ranked[0][1] : 0;

  return `
    <section id="sec-sport-anatomy" class="bg-card border border-border rounded-3xl p-4 space-y-3">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h2 class="text-sm font-semibold text-white">Muskel-Fokus</h2>
          <p class="text-[11px] text-zinc-400 truncate">${sportEsc(subtitle)}</p>
        </div>
        <div class="flex gap-1 shrink-0">
          <button onclick="setSportAnatomyTarget('latest')"
            class="px-2 py-1 rounded-lg text-[11px] font-medium border transition ${
              sportAnatomyTarget !== '7d' && sportAnatomyTarget !== '30d'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-zinc-900 text-zinc-400 border-border'
            }">Einheit</button>
          <button onclick="setSportAnatomyTarget('7d')"
            class="px-2 py-1 rounded-lg text-[11px] font-medium border transition ${
              sportAnatomyTarget === '7d'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-zinc-900 text-zinc-400 border-border'
            }">7T</button>
          <button onclick="setSportAnatomyTarget('30d')"
            class="px-2 py-1 rounded-lg text-[11px] font-medium border transition ${
              sportAnatomyTarget === '30d'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-zinc-900 text-zinc-400 border-border'
            }">30T</button>
        </div>
      </div>

      ${sportAnatomyTarget !== '7d' && sportAnatomyTarget !== '30d' ? `
        <select onchange="setSportAnatomyTarget(this.value)" class="${SPORT_INPUT}">
          ${strengthWorkouts.slice(0, 30).map((w, idx) => {
            const val = idx === 0 && sportAnatomyTarget === 'latest' ? 'latest' : w.id;
            const isSel = (sportAnatomyTarget === 'latest' && idx === 0) || sportAnatomyTarget === w.id;
            return `<option value="${val}" ${isSel ? 'selected' : ''}>${sportEsc(w.title || getActivityName(w.activityId))} · ${formatDisplayDate(w.date)} (${workoutSetCount(w)} Sätze)</option>`;
          }).join('')}
        </select>
      ` : ''}

      <div class="bg-zinc-950/70 border border-border rounded-2xl p-3 space-y-2.5">
        ${renderAnatomicalBodySvg(counts)}
        <div class="flex items-center justify-center gap-3 text-[10px] text-zinc-400">
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500"></span>Leicht</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-400"></span>Mittel</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-rose-500"></span>Top-Fokus</span>
        </div>
      </div>

      ${ranked.length > 0 ? `
        <div class="flex flex-wrap gap-1.5">
          ${ranked.map(([g, cnt]) => {
            const info = muscleGroupInfo(g);
            const heat = muscleHeatFill(cnt, maxVal);
            return `
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-900 border border-border text-zinc-200">
                <span class="w-2 h-2 rounded-full" style="background:${heat.fill}"></span>
                <span>${info.label}</span>
                <span class="text-zinc-400">${cnt} S.</span>
              </span>
            `;
          }).join('')}
        </div>
      ` : '<p class="text-[11px] text-zinc-500 text-center">Keine Kraftsätze in diesem Zeitraum.</p>'}
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
          ${w.type === 'strength' ? `<button onclick="showWorkoutInAnatomy('${w.id}')" title="Muskel-Fokus dieser Einheit anzeigen" aria-label="Muskel-Fokus" class="${SPORT_ICON_BTN} text-xs">🧍</button>` : ''}
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
let sportChartPointsMeta = [];

const SPORT_CHART_LINES = [
  { key: 'maxKg',  label: 'Max kg',  color: '#38bdf8' },
  { key: 'volume', label: 'Volumen', color: '#f59e0b' },
  { key: 'rm',     label: '1RM',     color: '#34d399' }
];

function getSportChartMetrics() {
  if (!Array.isArray(state.sportChartMetrics) || state.sportChartMetrics.length === 0) {
    state.sportChartMetrics = ['maxKg'];
  }
  return state.sportChartMetrics;
}

function toggleSportChartMetric(key) {
  const cur = new Set(getSportChartMetrics());
  if (cur.has(key)) {
    if (cur.size === 1) return; // Mindestens 1 Linie bleibt sichtbar
    cur.delete(key);
  } else {
    cur.add(key);
  }
  state.sportChartMetrics = [...cur];
  saveState();
  render();
}

function showSportChartPoint(idx) {
  const meta = sportChartPointsMeta[idx];
  if (!meta) return;
  const box = document.getElementById('sport-chart-tooltip');
  if (box) box.innerHTML = meta.html;
  const cursor = document.getElementById('sport-chart-cursor');
  if (cursor) {
    cursor.setAttribute('x1', meta.x.toFixed(1));
    cursor.setAttribute('x2', meta.x.toFixed(1));
    cursor.setAttribute('opacity', '1');
  }
  (meta.dots || []).forEach((d, sIdx) => {
    const dot = document.getElementById(`sport-chart-dot-${sIdx}`);
    if (dot) {
      dot.setAttribute('cx', meta.x.toFixed(1));
      dot.setAttribute('cy', d.y.toFixed(1));
      dot.setAttribute('opacity', '1');
    }
  });
}

let sportChartGeom = { W: 320, pl: 34, pr: 8 };

function scrubSportChart(ev, svg) {
  if (!sportChartPointsMeta.length || !svg) return;
  const touch = ev.touches && ev.touches[0];
  const clientX = touch ? touch.clientX : ev.clientX;
  if (typeof clientX !== 'number') return;
  const rect = svg.getBoundingClientRect();
  if (!rect.width) return;
  const svgX = ((clientX - rect.left) / rect.width) * sportChartGeom.W;
  const plotW = sportChartGeom.W - sportChartGeom.pl - sportChartGeom.pr;
  const ratio = Math.max(0, Math.min(1, (svgX - sportChartGeom.pl) / Math.max(1, plotW)));
  const idx = Math.round(ratio * (sportChartPointsMeta.length - 1));
  showSportChartPoint(idx);
}

function sportLineChart(series, labels, tooltips, independentScales = false) {
  const hasRightAxis = independentScales && series.length > 1;
  const W = 320, H = 140, pl = 34, pr = hasRightAxis ? 34 : 8, pt = 10, pb = 18;
  sportChartGeom = { W, pl, pr };
  const allYs = series.flatMap(s => s.points.map(p => p.y));
  if (allYs.length === 0) return '';

  const makeScale = (ys) => {
    let min = Math.min(...ys), max = Math.max(...ys);
    if (min === max) { min = Math.max(0, min - 1); max += 1; }
    const pad = (max - min) * 0.1;
    const lo = Math.max(0, min - pad);
    const hi = max + pad;
    return {
      min, max, lo, hi,
      Y: v => pt + (1 - (v - lo) / Math.max(0.001, hi - lo)) * (H - pt - pb)
    };
  };

  const sharedScale = makeScale(allYs);
  const scales = series.map(s => independentScales ? makeScale(s.points.map(p => p.y)) : sharedScale);

  const n = Math.max(1, labels.length - 1);
  const X = i => pl + (labels.length === 1 ? (W - pl - pr) / 2 : (i / n) * (W - pl - pr));
  const showDots = labels.length <= 45;

  sportChartPointsMeta = labels.map((lbl, i) => ({
    x: X(i),
    html: tooltips[i] || '',
    dots: series.map((s, sIdx) => ({ y: scales[sIdx].Y(s.points[i]?.y ?? scales[sIdx].lo), color: s.color }))
  }));

  const lastIdx = labels.length - 1;
  const lastMeta = sportChartPointsMeta[lastIdx];

  const leftScale = scales[0];
  const fmtAxis = v => v >= 1000 ? `${fmtNum(v / 1000, 1)}k` : String(Math.round(v));

  let svg = `<svg viewBox="0 0 ${W} ${H}" class="w-full h-36 select-none overflow-visible" style="touch-action:pan-y" onpointerdown="scrubSportChart(event, this)" onpointermove="if(event.buttons===1||event.pointerType==='mouse') scrubSportChart(event, this)" ontouchstart="scrubSportChart(event, this)" ontouchmove="scrubSportChart(event, this)">`;
  [leftScale.min, (leftScale.min + leftScale.max) / 2, leftScale.max].forEach(v => {
    const y = leftScale.Y(v);
    svg += `<line x1="${pl}" x2="${W - pr}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#24242b" stroke-width="1"/>`;
    svg += `<text x="${pl - 4}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="${independentScales ? series[0].color : '#71717a'}">${fmtAxis(v)}</text>`;
  });

  if (hasRightAxis) {
    const volIdx = series.findIndex(s => s.key === 'volume');
    const rIdx = volIdx >= 0 ? volIdx : 1;
    const rScale = scales[rIdx];
    [rScale.min, rScale.max].forEach(v => {
      const y = rScale.Y(v);
      svg += `<text x="${W - pr + 4}" y="${(y + 3).toFixed(1)}" text-anchor="start" font-size="9" fill="${series[rIdx].color}">${fmtAxis(v)}</text>`;
    });
  }

  svg += `<line id="sport-chart-cursor" x1="${lastMeta.x.toFixed(1)}" x2="${lastMeta.x.toFixed(1)}" y1="${pt}" y2="${H - pb}" stroke="#52525b" stroke-dasharray="3 3" stroke-width="1" opacity="0.8"/>`;

  series.forEach((s, sIdx) => {
    const sc = scales[sIdx];
    const pts = s.points.map(p => `${X(p.x).toFixed(1)},${sc.Y(p.y).toFixed(1)}`).join(' ');
    svg += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    if (showDots) {
      s.points.forEach(p => { svg += `<circle cx="${X(p.x).toFixed(1)}" cy="${sc.Y(p.y).toFixed(1)}" r="2.2" fill="${s.color}"/>`; });
    }
  });

  series.forEach((s, sIdx) => {
    const ly = lastMeta.dots[sIdx]?.y ?? pt;
    svg += `<circle id="sport-chart-dot-${sIdx}" cx="${lastMeta.x.toFixed(1)}" cy="${ly.toFixed(1)}" r="4" fill="${s.color}" stroke="#09090b" stroke-width="1.5" opacity="1"/>`;
  });

  svg += `<text x="${pl}" y="${H - 4}" font-size="9" fill="#71717a">${sportEsc(labels[0])}</text>`;
  if (labels.length > 1) svg += `<text x="${W - pr}" y="${H - 4}" text-anchor="end" font-size="9" fill="#71717a">${sportEsc(labels[labels.length - 1])}</text>`;
  svg += '</svg>';

  return `
    <div id="sport-chart-tooltip" class="bg-zinc-950/80 border border-border rounded-xl px-2.5 py-1.5 text-[11px] text-zinc-300 flex flex-wrap items-center gap-x-2 gap-y-0.5">
      ${lastMeta.html}
    </div>
    ${svg}
  `;
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
    let prKg = 0, pr1rm = 0, prReps = 0, prSec = 0, prVol = 0;

    getWorkouts().forEach(w => {
      (w.exercises || []).forEach(ex => {
        if (String(ex.name).trim().toLowerCase() !== key) return;
        let dayVol = 0;
        (ex.sets || []).forEach(s => {
          const kg = Number(s.kg) || 0;
          const reps = Number(s.reps) || 0;
          const sec = Number(s.sec) || 0;
          prKg = Math.max(prKg, kg);
          pr1rm = Math.max(pr1rm, epley1RM(kg, reps));
          prReps = Math.max(prReps, reps);
          prSec = Math.max(prSec, sec);
          dayVol += kg * reps;
        });
        prVol = Math.max(prVol, dayVol);
        if (cutoff && w.date < cutoff) return;
        const d = perDay[w.date] || (perDay[w.date] = { maxKg: 0, rm: 0, volume: 0, maxReps: 0, maxSec: 0, sets: [] });
        (ex.sets || []).forEach(s => {
          const kg = Number(s.kg) || 0;
          const reps = Number(s.reps) || 0;
          const sec = Number(s.sec) || 0;
          d.maxKg = Math.max(d.maxKg, kg);
          d.rm = Math.max(d.rm, epley1RM(kg, reps));
          d.volume += kg * reps;
          d.maxReps = Math.max(d.maxReps, reps);
          d.maxSec = Math.max(d.maxSec, sec);
          d.sets.push(s);
        });
      });
    });

    const dates = Object.keys(perDay).sort();
    const isTimed = prSec > 0 && prReps === 0;
    const isBodyweightOnly = !isTimed && prKg === 0;
    const activeChartLines = getSportChartMetrics();

    let series = [];
    let controlsLine = '';
    let useIndependent = false;

    const tooltips = dates.map(dt => {
      const p = perDay[dt];
      const dLbl = dt.split('-').reverse().join('.');
      const setsTxt = p.sets.map(fmtSetCompact).join(' · ');
      if (isTimed) {
        return `<span class="font-semibold text-white">${dLbl}:</span> <span class="text-teal-300 font-semibold">${p.maxSec} s</span> <span class="text-zinc-500">(${setsTxt})</span>`;
      }
      if (isBodyweightOnly) {
        return `<span class="font-semibold text-white">${dLbl}:</span> <span class="text-emerald-300 font-semibold">${p.maxReps} Wdh.</span> <span class="text-zinc-500">(${setsTxt})</span>`;
      }
      const parts = [
        `<span class="font-semibold text-white">${dLbl}:</span>`,
        `<span class="text-sky-300 font-semibold">${fmtNum(p.maxKg, 1)} kg</span>`,
        `<span class="text-amber-300">Vol. ${Math.round(p.volume)} kg</span>`
      ];
      if (activeChartLines.includes('rm')) {
        parts.push(`<span class="text-emerald-300">1RM ${fmtNum(p.rm, 1)} kg</span>`);
      }
      parts.push(`<span class="text-zinc-500">(${setsTxt})</span>`);
      return parts.join(' ');
    });

    if (isTimed) {
      series = [{ key: 'sec', color: '#14b8a6', points: dates.map((d, i) => ({ x: i, y: perDay[d].maxSec })) }];
      controlsLine = `
        <span class="flex items-center gap-1.5 text-teal-300"><span class="w-2 h-2 rounded-full bg-teal-400"></span>Max. Dauer (s)</span>
        <span class="ml-auto text-amber-300">🏆 PR ${prSec} s</span>`;
    } else if (isBodyweightOnly) {
      series = [{ key: 'reps', color: '#34d399', points: dates.map((d, i) => ({ x: i, y: perDay[d].maxReps })) }];
      controlsLine = `
        <span class="flex items-center gap-1.5 text-emerald-300"><span class="w-2 h-2 rounded-full bg-emerald-400"></span>Max. Wdh.</span>
        <span class="ml-auto text-amber-300">🏆 PR ${prReps} Wdh.</span>`;
    } else {
      series = SPORT_CHART_LINES
        .filter(l => activeChartLines.includes(l.key))
        .map(l => ({
          key: l.key,
          color: l.color,
          points: dates.map((d, i) => ({ x: i, y: perDay[d][l.key] }))
        }));
      useIndependent = activeChartLines.includes('volume') && activeChartLines.length > 1;
      controlsLine = `
        <div class="flex flex-wrap items-center gap-1.5">
          ${SPORT_CHART_LINES.map(l => {
            const isOn = activeChartLines.includes(l.key);
            return `
              <button type="button" onclick="toggleSportChartMetric('${l.key}')"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
                  isOn ? 'bg-zinc-900 text-white border-zinc-600' : 'bg-zinc-950/60 text-zinc-500 border-zinc-900 hover:text-zinc-300'
                }">
                <span class="w-2 h-2 rounded-full" style="background:${isOn ? l.color : '#52525b'}"></span>
                <span>${l.label}</span>
              </button>`;
          }).join('')}
        </div>
        <span class="ml-auto text-[11px] text-amber-300 shrink-0">🏆 ${fmtNum(prKg, 1)} kg · Vol. ${Math.round(prVol)} kg</span>`;
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

        <div class="flex flex-wrap items-center gap-2 text-[11px]">${controlsLine}</div>
        ${dates.length > 0
          ? sportLineChart(series, dates.map(fmtDateLbl), tooltips, useIndependent)
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
    <section id="sec-sport-progress" class="bg-card border border-border rounded-3xl p-4 space-y-3">
      <h2 class="text-sm font-semibold text-white">Fortschritt &amp; Bestleistungen</h2>
      ${strengthHtml}${cardioHtml}
    </section>`;
}

// ---------- VORLAGEN-PICKER (AUS VERLAUF WÄHLEN) ----------
function openTemplatePickerModal() {
  sportTemplatePickerQuery = '';
  renderTemplatePickerModal();
  setTimeout(() => {
    const inp = document.getElementById('sport-tmpl-search');
    if (inp) inp.focus();
  }, 40);
}

function updateTemplatePickerQuery(val) {
  sportTemplatePickerQuery = val;
  const listEl = document.getElementById('sport-tmpl-list');
  if (listEl) listEl.innerHTML = renderTemplatePickerListHtml();
}

function renderTemplatePickerListHtml() {
  const q = sportTemplatePickerQuery.trim().toLowerCase();
  const list = [...getWorkouts()]
    .filter(w => w.type === 'strength' && (w.exercises || []).length > 0)
    .sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)))
    .filter(w => {
      if (!q) return true;
      const title = (w.title || getActivityName(w.activityId) || '').toLowerCase();
      const exMatch = (w.exercises || []).some(e => String(e.name || '').toLowerCase().includes(q));
      return title.includes(q) || exMatch || w.date.includes(q);
    });

  if (!list.length) {
    return '<p class="text-xs text-zinc-500 text-center py-4">Keine passenden Workouts im Verlauf gefunden.</p>';
  }
  return list.slice(0, 40).map(w => `
    <button onclick="closeModal(); startWorkoutFromTemplate('${w.id}')"
      class="w-full text-left p-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-border hover:border-emerald-500/40 space-y-1 transition">
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs font-semibold text-white truncate">🏋️ ${sportEsc(w.title || getActivityName(w.activityId))}</span>
        <span class="text-[10px] text-zinc-500 shrink-0">${formatDisplayDate(w.date)}</span>
      </div>
      <div class="text-[11px] text-zinc-400 truncate">
        ${(w.exercises || []).map(e => sportEsc(e.name)).join(' · ')}
      </div>
    </button>
  `).join('');
}

function renderTemplatePickerModal() {
  openModal(`
    <div class="space-y-3.5">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-base font-semibold text-white">Vorlage aus Verlauf wählen</h3>
          <p class="text-[11px] text-zinc-400">Alle Übungen, Sätze &amp; Gewichte werden direkt vorbefüllt</p>
        </div>
        <button onclick="closeModal()" class="text-zinc-400 hover:text-white px-2 py-1">✕</button>
      </div>
      <input id="sport-tmpl-search" type="search" value="${sportEsc(sportTemplatePickerQuery)}"
        placeholder="Suche nach Training oder Übung (z. B. Hygia, Dips…)"
        oninput="updateTemplatePickerQuery(this.value)" class="${SPORT_INPUT}" />
      <div id="sport-tmpl-list" class="space-y-2 max-h-[56vh] overflow-y-auto pr-0.5">
        ${renderTemplatePickerListHtml()}
      </div>
    </div>
  `);
}

// ---------- FLEXIBLE LIVE-TRAININGSANSICHT (VOLLBILD IM SPORT-TAB) ----------
function startWorkoutFromTemplate(sourceId) {
  const src = getWorkouts().find(w => w.id === sourceId);
  if (!src) return;
  const now = Date.now();
  sportDraft = {
    id: null,
    date: state.selectedDate,
    firstStartedAt: now,
    timerRunning: true,
    timerStartedAt: now,
    elapsedMs: 0,
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
  sportLiveOpen = true;
  sportPickerState = null;
  saveSportDraftLocal();
  ensureSportClockTicker();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openWorkoutModal(id) {
  sportPickerState = null;
  if (id) {
    const found = getWorkouts().find(w => w.id === id);
    if (!found) return;
    sportDraft = JSON.parse(JSON.stringify(found));
    sportDraft.timerRunning = false;
    sportDraft.timerStartedAt = null;
    sportDraft.elapsedMs = (Number(found.duration) || 0) * 60000;
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
      firstStartedAt: null,
      timerRunning: false,
      timerStartedAt: null,
      elapsedMs: 0,
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
  sportLiveOpen = true;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeWorkoutModalKeepDraft() {
  if (sportDraft && !sportDraft.id) saveSportDraftLocal();
  else sportDraft = null;
  sportLiveOpen = false;
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
  render();
}

function sportSetType(type) {
  sportDraft.type = type;
  saveSportDraftLocal();
  render();
}

function sportMoveExercise(i, delta) {
  const j = i + delta;
  if (j < 0 || j >= sportDraft.exercises.length) return;
  const arr = sportDraft.exercises;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  saveSportDraftLocal();
  render();
}

function sportRemoveExercise(i) {
  sportDraft.exercises.splice(i, 1);
  saveSportDraftLocal();
  render();
}

function sportToggleExTimed(i) {
  const ex = sportDraft.exercises[i];
  ex.timed = !ex.timed;
  saveSportDraftLocal();
  render();
}

function sportSetExCategory(i, val) {
  sportDraft.exercises[i].category = normalizeMuscleGroup(val);
  saveSportDraftLocal();
}

function sportCycleSetType(i, j) {
  const s = sportDraft.exercises[i].sets[j];
  s.t = s.t === '' ? 'w' : (s.t === 'w' ? 'd' : '');
  saveSportDraftLocal();
  render();
}

function sportToggleSetDone(i, j) {
  const s = sportDraft.exercises[i].sets[j];
  s.done = !s.done;
  if (s.done && !sportDraft.id && !sportDraft.timerRunning && !sportDraft.firstStartedAt) {
    const now = Date.now();
    sportDraft.firstStartedAt = now;
    sportDraft.timerRunning = true;
    sportDraft.timerStartedAt = now;
    ensureSportClockTicker();
  }
  saveSportDraftLocal();
  render();
}

function sportAddSet(i) {
  const sets = sportDraft.exercises[i].sets;
  const last = sets[sets.length - 1];
  sets.push(last
    ? { kg: last.kg, reps: last.reps, sec: last.sec || '', t: '', done: false }
    : { kg: '', reps: '', sec: '', t: '', done: false });
  saveSportDraftLocal();
  render();
}

function sportRemoveSet(i, j) {
  sportDraft.exercises[i].sets.splice(j, 1);
  saveSportDraftLocal();
  render();
}

function sportSetField(i, j, field, val) {
  sportDraft.exercises[i].sets[j][field] = val === '' ? '' : Number(val);
  saveSportDraftLocal();
}

// ---------- ÜBUNGS-PICKER (SCHICKES MODAL ZUM HINZUFÜGEN & AUSTAUSCHEN) ----------
function openSportExercisePicker(targetIndex) {
  const existingGroup = typeof targetIndex === 'number' && sportDraft.exercises[targetIndex]
    ? sportDraft.exercises[targetIndex].category
    : 'ALL';
  sportPickerState = {
    targetIndex,
    query: '',
    group: existingGroup && existingGroup !== 'Other' ? existingGroup : 'ALL'
  };
  renderSportExercisePickerModal();
  setTimeout(() => {
    const inp = document.getElementById('sport-picker-search');
    if (inp) inp.focus();
  }, 40);
}

function closeSportExercisePicker() {
  sportPickerState = null;
  closeModal();
}

function setSportPickerGroup(grp) {
  if (!sportPickerState) return;
  sportPickerState.group = grp;
  renderSportExercisePickerModal();
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
  closeModal();
  saveSportDraftLocal();
  render();
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

  const rows = filtered.slice(0, 80).map(item => {
    const info = muscleGroupInfo(item.category);
    const safeName = item.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return `
      <button onclick="pickSportExercise('${safeName}', '${item.category}', ${item.timed ? 'true' : 'false'})"
        class="w-full text-left px-3 py-2.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-border flex items-center justify-between gap-2 transition">
        <div class="min-w-0 flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${info.color}"></span>
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

function renderSportExercisePickerModal() {
  const isSwap = typeof sportPickerState.targetIndex === 'number';
  openModal(`
    <div class="space-y-3.5">
      <div class="flex items-center justify-between gap-2">
        <div>
          <h3 class="text-base font-semibold text-white">${isSwap ? 'Übung austauschen' : 'Übung wählen'}</h3>
          <p class="text-[11px] text-zinc-400">Nach Muskelgruppe filtern, suchen oder neu anlegen</p>
        </div>
        <button onclick="closeSportExercisePicker()" class="px-2.5 py-1 rounded-xl bg-zinc-900 border border-border text-xs text-zinc-300 hover:text-white">✕</button>
      </div>

      <input id="sport-picker-search" type="search" value="${sportEsc(sportPickerState.query)}"
        placeholder="Übung suchen oder neuen Namen tippen…"
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

      <div id="sport-picker-list" class="space-y-1.5 max-h-[55vh] overflow-y-auto pr-0.5">
        ${renderSportPickerListHtml()}
      </div>
    </div>
  `);
}

function renderLiveWorkoutView() {
  const d = sportDraft;
  const isEdit = Boolean(d.id);
  const typeBtn = (t, icon, label) => `
    <button onclick="sportSetType('${t}')" title="${label}" aria-label="${label}"
      class="flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition ${d.type === t ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40' : 'bg-zinc-900 border border-border text-zinc-400 hover:text-zinc-200'}">${icon}<span>${label}</span></button>`;

  const totalSets = (d.exercises || []).reduce((a, e) => a + (e.sets || []).length, 0);
  const doneSets = (d.exercises || []).reduce((a, e) => a + (e.sets || []).filter(s => s.done).length, 0);
  const elapsedMs = getDraftElapsedMs(d);
  const startClockStr = d.firstStartedAt
    ? new Date(d.firstStartedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : null;

  let body = '';
  if (d.type === 'strength') {
    body = `
      <!-- Pausen-Timer -->
      <section class="bg-card border border-border rounded-3xl p-3.5 flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-sm">⏱</span>
          <span id="sport-rest-display" class="text-xs font-medium text-zinc-400 tabular-nums">Pausen-Timer</span>
          ${totalSets > 0 ? `<span class="text-[11px] text-zinc-500">· ${doneSets}/${totalSets} ✓</span>` : ''}
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button type="button" onclick="startSportRestTimer(60)" class="px-2 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-border text-[11px] text-zinc-200">60s</button>
          <button type="button" onclick="startSportRestTimer(90)" class="px-2 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-border text-[11px] text-zinc-200">90s</button>
          <button type="button" onclick="startSportRestTimer(120)" class="px-2 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-border text-[11px] text-zinc-200">2m</button>
          <button type="button" onclick="startSportRestTimer(180)" class="px-2 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-border text-[11px] text-zinc-200">3m</button>
          ${sportRestEndMs ? '<button type="button" onclick="stopSportRestTimer()" class="px-2 py-1 rounded-xl bg-rose-500/15 text-rose-300 text-[11px]">✕</button>' : ''}
        </div>
      </section>

      <!-- Sprachdiktat für Übungen, Gewichte & Wiederholungen -->
      <button type="button" onclick="openSportVoiceDictationModal(false)"
        class="w-full py-3 px-4 rounded-2xl bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/40 text-violet-200 flex items-center justify-center gap-2 text-xs font-semibold transition">
        <span>🎙️</span><span>Übungen, Gewichte &amp; Wiederholungen diktieren</span>
      </button>

      <!-- Übungs-Liste -->
      <div class="space-y-3">
        ${d.exercises.length === 0 ? `
          <div class="bg-card border border-dashed border-border rounded-3xl p-5 text-center space-y-2.5">
            <p class="text-xs text-zinc-400">Noch keine Übungen im Training. Füge Übungen hinzu oder lade eine bisherige Einheit als Vorlage.</p>
            <button type="button" onclick="openTemplatePickerModal()"
              class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-border text-xs font-medium text-emerald-300 transition">
              📋 Bisheriges Training als Vorlage laden
            </button>
          </div>
        ` : d.exercises.map((ex, i) => {
          const prev = ex.name ? lastSetsFor(ex.name, d.id) : null;
          const catInfo = muscleGroupInfo(ex.category);
          const timed = Boolean(ex.timed);
          return `
          <section class="bg-card border border-border rounded-3xl p-3.5 space-y-2.5">
            <div class="flex items-center justify-between gap-1.5">
              <div class="min-w-0 flex items-center gap-2 flex-1">
                <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${catInfo.color}"></span>
                <span class="text-sm font-semibold text-white truncate">${sportEsc(ex.name || 'Übung wählen')}</span>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button type="button" onclick="sportMoveExercise(${i}, -1)" ${i === 0 ? 'disabled' : ''} title="Nach oben verschieben"
                  class="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-900 border border-border text-xs ${i === 0 ? 'text-zinc-700' : 'text-zinc-200 hover:bg-zinc-800'}">↑</button>
                <button type="button" onclick="sportMoveExercise(${i}, 1)" ${i === d.exercises.length - 1 ? 'disabled' : ''} title="Nach unten verschieben"
                  class="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-900 border border-border text-xs ${i === d.exercises.length - 1 ? 'text-zinc-700' : 'text-zinc-200 hover:bg-zinc-800'}">↓</button>
                <button type="button" onclick="openSportExercisePicker(${i})" title="Übung austauschen"
                  class="px-2 h-7 flex items-center gap-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/35 text-sky-300 text-[11px] font-medium transition">${ICON_SWAP}<span>Tauschen</span></button>
                <button type="button" onclick="sportRemoveExercise(${i})" title="Übung entfernen"
                  class="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-900 hover:bg-rose-500/15 border border-border text-zinc-400 hover:text-rose-400 transition">${ICON_TRASH}</button>
              </div>
            </div>

            <div class="flex items-center justify-between gap-2">
              <select onchange="sportSetExCategory(${i}, this.value)" class="px-2 py-1 rounded-lg bg-zinc-950 border border-border text-[11px] text-zinc-300 focus:outline-none">
                ${MUSCLE_GROUPS.map(g => `<option value="${g.id}" ${g.id === ex.category ? 'selected' : ''}>${g.label}</option>`).join('')}
              </select>
              <button type="button" onclick="sportToggleExTimed(${i})"
                class="px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-border text-[11px] text-zinc-300 transition">
                ${timed ? '⏱ Zeit (Sek.)' : '🔢 Gewicht × Wdh.'}
              </button>
            </div>

            ${prev ? `<div class="text-[11px] text-zinc-400 bg-zinc-950/70 rounded-xl px-2.5 py-1.5 truncate">Letztes Mal: ${prev.sets.map(fmtSetCompact).join(' · ')}</div>` : ''}

            <div class="grid grid-cols-[2rem_1fr_1fr_2.25rem_1.75rem] gap-1.5 text-[10px] text-zinc-500 px-0.5">
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
              <div class="grid grid-cols-[2rem_1fr_1fr_2.25rem_1.75rem] gap-1.5 items-center ${s.done ? 'opacity-90' : ''}">
                <button type="button" onclick="sportCycleSetType(${i}, ${j})" title="Satz-Typ wechseln (Normal / Warm-up / Dropset)"
                  class="h-9 rounded-xl border text-xs font-semibold transition ${badgeCls}">${badgeLbl}</button>
                <input type="number" inputmode="decimal" step="0.5" min="0" value="${s.kg}" placeholder="0 = BW"
                  oninput="sportSetField(${i}, ${j}, 'kg', this.value)" class="${SPORT_INPUT} h-9" />
                ${timed
                  ? `<input type="number" inputmode="numeric" step="1" min="0" value="${s.sec}" placeholder="Sek."
                      oninput="sportSetField(${i}, ${j}, 'sec', this.value)" class="${SPORT_INPUT} h-9" />`
                  : `<input type="number" inputmode="numeric" step="1" min="0" value="${s.reps}" placeholder="Wdh."
                      oninput="sportSetField(${i}, ${j}, 'reps', this.value)" class="${SPORT_INPUT} h-9" />`}
                <button type="button" onclick="sportToggleSetDone(${i}, ${j})" title="Satz abhaken"
                  class="h-9 rounded-xl border flex items-center justify-center transition ${
                    s.done
                      ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                      : 'bg-zinc-950 text-zinc-500 border-border hover:text-zinc-200'
                  }">${ICON_CHECK}</button>
                <button type="button" onclick="sportRemoveSet(${i}, ${j})" title="Satz entfernen"
                  class="h-9 flex items-center justify-center rounded-xl text-zinc-500 hover:text-rose-400 transition">${ICON_X}</button>
              </div>`;
            }).join('')}

            <button type="button" onclick="sportAddSet(${i})"
              class="w-full py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-dashed border-border text-zinc-300 hover:text-emerald-400 flex items-center justify-center gap-1 text-xs font-medium transition">${ICON_PLUS} Satz hinzufügen</button>
          </section>`;
        }).join('')}

        <button type="button" onclick="openSportExercisePicker('add')"
          class="w-full py-3 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 flex items-center justify-center gap-1.5 text-xs font-semibold transition">
          ${ICON_PLUS} Übung hinzufügen
        </button>
      </div>`;
  } else if (d.type === 'cardio') {
    body = `
      <section class="bg-card border border-border rounded-3xl p-4 space-y-3">
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
        </div>
      </section>`;
  } else {
    body = `
      <section class="bg-card border border-border rounded-3xl p-4">
        <label class="text-[11px] text-zinc-400">Dauer (min)</label>
        <input type="number" inputmode="numeric" min="0" value="${d.duration}" oninput="sportDraftSet('duration', this.value === '' ? '' : Number(this.value))" class="${SPORT_INPUT} mt-1" />
      </section>`;
  }

  return `
    <!-- Live-Trainings-Kopf mit Start/Pause & Stoppuhr -->
    <section class="bg-card border ${d.timerRunning ? 'border-emerald-500/50' : 'border-border'} rounded-3xl p-4 space-y-3">
      <div class="flex items-center justify-between gap-2">
        <button onclick="closeWorkoutModalKeepDraft()" class="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-border text-xs text-zinc-300">
          ← ${isEdit ? 'Abbrechen' : 'Übersicht'}
        </button>
        <div class="flex items-center gap-1.5">
          <button type="button" onclick="openSportVoiceDictationModal(false)" title="Per Sprache diktieren"
            class="px-2.5 py-1.5 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/35 text-xs text-violet-300 font-semibold">
            🎙️ Diktieren
          </button>
          ${!isEdit ? `
            <button onclick="openTemplatePickerModal()" class="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-border text-xs text-emerald-300 font-medium">
              📋 Vorlage
            </button>
          ` : '<span class="text-xs font-semibold text-zinc-300">Einheit bearbeiten</span>'}
        </div>
      </div>

      ${!isEdit ? `
        <div class="bg-zinc-950/80 border border-border rounded-2xl p-3 flex items-center justify-between gap-3">
          <div>
            <div class="text-[10px] uppercase tracking-wider text-zinc-500">
              ${d.timerRunning ? '● Training läuft' : (elapsedMs > 0 ? 'Pausiert' : 'Bereit zum Start')}
              ${startClockStr ? ` · Start ${startClockStr}` : ''}
            </div>
            <div id="sport-live-clock" class="text-2xl font-bold text-white tabular-nums mt-0.5">${fmtClockMs(elapsedMs)}</div>
          </div>
          <button type="button" onclick="toggleSportWorkoutTimer()"
            class="px-4 py-2.5 rounded-2xl text-xs font-semibold transition ${
              d.timerRunning
                ? 'bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/45 text-amber-300'
                : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'
            }">
            ${d.timerRunning ? '⏸ Pause' : (elapsedMs > 0 ? '▶ Weiter' : '▶ Start')}
          </button>
        </div>
      ` : ''}

      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="text-[11px] text-zinc-400">Trainingsname</label>
          <input type="text" value="${sportEsc(d.title)}" placeholder="z. B. Hygia, Push…" oninput="sportDraftSet('title', this.value)" class="${SPORT_INPUT} mt-1" />
        </div>
        <div>
          <label class="text-[11px] text-zinc-400">Datum</label>
          <input type="date" value="${d.date}" onchange="sportDraftSet('date', this.value)" class="${SPORT_INPUT} mt-1" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="text-[11px] text-zinc-400">Aktivität (Kalorienbonus)</label>
          <select onchange="sportSetActivity(this.value)" class="${SPORT_INPUT} mt-1">
            ${(state.sportHabits || []).map(sp => `<option value="${sp.id}" ${sp.id === d.activityId ? 'selected' : ''}>${sportEsc(sp.name)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="text-[11px] text-zinc-400">Dauer manuell (min, optional)</label>
          <input type="number" inputmode="numeric" min="0" value="${d.duration}" placeholder="Auto aus Timer"
            oninput="sportDraftSet('duration', this.value === '' ? '' : Number(this.value))" class="${SPORT_INPUT} mt-1" />
        </div>
      </div>

      <div class="flex gap-1.5">
        ${typeBtn('strength', '🏋️', 'Kraft')}${typeBtn('cardio', '🏃', 'Ausdauer')}${typeBtn('other', '⚡', 'Sonstiges')}
      </div>
    </section>

    ${body}

    <!-- Notiz & Beenden -->
    <section class="bg-card border border-border rounded-3xl p-4 space-y-3">
      <div>
        <label class="text-[11px] text-zinc-400">Notiz zum Training (optional)</label>
        <input type="text" value="${sportEsc(d.notes)}" placeholder="Gefühl, Energie, Hinweise…" oninput="sportDraftSet('notes', this.value)" class="${SPORT_INPUT} mt-1" />
      </div>

      <div class="flex gap-2">
        ${!isEdit ? `
          <button onclick="discardSavedWorkoutDraft()" class="px-3.5 py-3 rounded-2xl bg-zinc-900 hover:bg-rose-500/15 border border-border text-zinc-400 hover:text-rose-400 text-xs font-medium transition">Verwerfen</button>
        ` : `
          <button onclick="closeWorkoutModalKeepDraft()" class="px-3.5 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-border text-zinc-300 text-xs font-medium transition">Abbrechen</button>
        `}
        <button onclick="saveWorkout()"
          class="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition">
          ${ICON_CHECK} ${isEdit ? 'Änderungen speichern' : '🏁 Training beendet & speichern'}
        </button>
      </div>
    </section>
  `;
}

function saveWorkout() {
  const d = sportDraft;
  if (!d) return;
  if (!d.date) return alert('Bitte ein Datum wählen.');
  if (!d.activityId) return alert('Bitte zuerst unter Habits eine Aktivität anlegen.');

  let dur = Number(d.duration) || 0;
  if (!dur) {
    const totalMs = getDraftElapsedMs(d);
    if (totalMs >= 30000) {
      dur = Math.max(1, Math.round(totalMs / 60000));
    }
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
              if (Number(s.sec) > 0) out.sec = Number(s.sec);
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
  sportLiveOpen = false;
  sportPickerState = null;
  render();
}

function deleteWorkout(id) {
  const w = getWorkouts().find(x => x.id === id);
  if (!w) return;
  if (!confirm('Diese Einheit wirklich löschen?')) return;
  state.workouts = getWorkouts().filter(x => x.id !== id);
  if (typeof markDeletedId === 'function') markDeletedId(id);
  syncSportDoneAfterRemoval(w.date, w.activityId, id);
  saveState();
  render();
}

// ---------- SPRACHDIKTAT FÜR TRAINING (ÜBUNGEN, SÄTZE, GEWICHTE, WDH.) ----------
let sportVoiceRec = null;
let sportVoiceActive = false;
let sportVoiceFinalText = '';
let sportVoiceInterimText = '';
let sportVoiceMediaRecorder = null;
let sportVoiceAudioStream = null;
let sportVoiceAudioChunks = [];
let sportVoiceAudioBase64 = null;
let sportVoiceAudioMime = null;
let sportVoiceTimer = null;
let sportVoiceSeconds = 0;
let sportVoiceAbortController = null;

function stopSportVoiceStreamOnly() {
  clearInterval(sportVoiceTimer);
  sportVoiceTimer = null;
  sportVoiceActive = false;
  if (sportVoiceRec) {
    try {
      sportVoiceRec.onresult = null;
      sportVoiceRec.onend = null;
      sportVoiceRec.onerror = null;
      sportVoiceRec.abort();
    } catch (e) {}
    sportVoiceRec = null;
  }
  if (sportVoiceMediaRecorder && sportVoiceMediaRecorder.state !== 'inactive') {
    try { sportVoiceMediaRecorder.onstop = null; sportVoiceMediaRecorder.stop(); } catch (e) {}
  }
  sportVoiceMediaRecorder = null;
  if (sportVoiceAudioStream) {
    sportVoiceAudioStream.getTracks().forEach(t => t.stop());
    sportVoiceAudioStream = null;
  }
  if (sportVoiceAbortController) {
    try { sportVoiceAbortController.abort(); } catch (e) {}
    sportVoiceAbortController = null;
  }
}

function resetSportVoiceBtnUi() {
  const btn = document.getElementById('sportVoiceMicBtn');
  if (!btn) return;
  btn.className = 'w-full py-3 px-4 rounded-2xl bg-violet-500 hover:bg-violet-400 text-white font-semibold text-sm flex items-center justify-center gap-2 transition';
  btn.innerHTML = '<span>🎙️</span><span>Aufnahme starten</span>';
}

function startSportVoiceRecUi(statusMsg) {
  sportVoiceSeconds = 0;
  const btn = document.getElementById('sportVoiceMicBtn');
  const statusEl = document.getElementById('sportVoiceStatus');
  if (btn) {
    btn.className = 'w-full py-3 px-4 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-semibold text-sm flex items-center justify-center gap-2 animate-pulse transition';
    btn.innerHTML = '<span>⏹</span><span id="sportVoiceTimerLbl">Stopp &amp; Auswerten (00:00)</span>';
  }
  if (statusEl) {
    statusEl.textContent = statusMsg;
    statusEl.className = 'text-xs text-amber-300';
  }
  clearInterval(sportVoiceTimer);
  sportVoiceTimer = setInterval(() => {
    sportVoiceSeconds++;
    const mm = String(Math.floor(sportVoiceSeconds / 60)).padStart(2, '0');
    const ss = String(sportVoiceSeconds % 60).padStart(2, '0');
    const lbl = document.getElementById('sportVoiceTimerLbl');
    if (lbl) lbl.textContent = `Stopp & Auswerten (${mm}:${ss})`;
  }, 1000);
}

function openSportVoiceDictationModal(startNewIfNeeded = false) {
  stopSportVoiceStreamOnly();
  sportVoiceFinalText = '';
  sportVoiceInterimText = '';
  sportVoiceAudioBase64 = null;
  sportVoiceAudioMime = null;

  if (startNewIfNeeded && !sportDraft) {
    openWorkoutModal();
  }

  const curExNames = (sportDraft?.exercises || []).map(e => e.name).filter(Boolean);
  openModal(`
    <div class="space-y-4">
      <div class="flex items-start justify-between gap-2">
        <div>
          <h3 class="text-base font-semibold text-white">🎙️ Training diktieren</h3>
          <p class="text-[11px] text-zinc-400">Übungen, Gewichte, Sätze, Wiederholungen oder Zeiten einfach einsprechen</p>
        </div>
        <button type="button" onclick="stopSportVoiceStreamOnly(); closeModal();" class="text-zinc-400 hover:text-white px-2 py-1">✕</button>
      </div>

      <button type="button" id="sportVoiceMicBtn" onclick="toggleSportVoiceRecording()"
        class="w-full py-3 px-4 rounded-2xl bg-violet-500 hover:bg-violet-400 text-white font-semibold text-sm flex items-center justify-center gap-2 transition">
        <span>🎙️</span><span>Aufnahme starten</span>
      </button>

      <div class="space-y-1.5">
        <label class="text-[11px] text-zinc-400">Erkannter Text (oder direkt eintippen / korrigieren)</label>
        <textarea id="sportVoiceTextInput" rows="3"
          placeholder="z. B. Bankdrücken 80 Kilo, 10, 9 und 8 Wiederholungen. Danach 3 Sätze Klimmzüge mit 10 Kilo je 8 Wiederholungen und Plank 60 Sekunden."
          class="w-full px-3 py-2.5 rounded-2xl bg-zinc-950 border border-border text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-400"></textarea>
      </div>

      ${curExNames.length > 0 ? `
        <div class="text-[10px] text-zinc-400 bg-zinc-900/70 border border-border rounded-xl px-2.5 py-2">
          Im aktuellen Training: <span class="text-zinc-200">${sportEsc(curExNames.join(', '))}</span>
          <span class="block text-zinc-500 mt-0.5">Sätze für vorhandene Übungen werden automatisch ergänzt bzw. abgehakt.</span>
        </div>
      ` : ''}

      <div id="sportVoiceStatus" class="text-xs text-zinc-400">Tippe auf „Aufnahme starten“ und sprich dein Training ein.</div>

      <div class="flex gap-2">
        <button type="button" onclick="stopSportVoiceStreamOnly(); closeModal();"
          class="px-4 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-border text-zinc-300 text-xs font-semibold transition">
          Abbrechen
        </button>
        <button type="button" id="sportVoiceAnalyzeBtn" onclick="analyzeSportVoiceDictation()"
          class="flex-1 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition">
          ✨ Erkennen &amp; eintragen
        </button>
      </div>
    </div>
  `);
}

async function startSportVoiceAudioFallback() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Mikrofon wird in diesem Browser nicht unterstützt.');
  }
  sportVoiceAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = typeof pickSupportedAudioMime === 'function' ? pickSupportedAudioMime() : '';
  sportVoiceAudioChunks = [];
  const opts = mime ? { mimeType: mime, audioBitsPerSecond: 24000 } : { audioBitsPerSecond: 24000 };
  try {
    sportVoiceMediaRecorder = new MediaRecorder(sportVoiceAudioStream, opts);
  } catch (e) {
    sportVoiceMediaRecorder = mime ? new MediaRecorder(sportVoiceAudioStream, { mimeType: mime }) : new MediaRecorder(sportVoiceAudioStream);
  }
  sportVoiceMediaRecorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) sportVoiceAudioChunks.push(ev.data);
  };
  sportVoiceMediaRecorder.onstop = async () => {
    const actualMime = (sportVoiceMediaRecorder && sportVoiceMediaRecorder.mimeType) || mime || 'audio/webm';
    if (sportVoiceAudioStream) {
      sportVoiceAudioStream.getTracks().forEach(t => t.stop());
      sportVoiceAudioStream = null;
    }
    sportVoiceMediaRecorder = null;
    clearInterval(sportVoiceTimer);
    sportVoiceTimer = null;
    resetSportVoiceBtnUi();
    const blob = new Blob(sportVoiceAudioChunks, { type: actualMime });
    if (!blob.size) return;
    sportVoiceAudioBase64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || '').split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    sportVoiceAudioMime = actualMime.split(';')[0];
    analyzeSportVoiceDictation();
  };
  sportVoiceMediaRecorder.start();
  startSportVoiceRecUi('🔴 Aufnahme läuft… Sprich deine Übungen, Gewichte & Wiederholungen ein.');
}

async function toggleSportVoiceRecording() {
  const statusEl = document.getElementById('sportVoiceStatus');

  if (sportVoiceActive && sportVoiceRec) {
    sportVoiceActive = false;
    clearInterval(sportVoiceTimer);
    sportVoiceTimer = null;
    try { sportVoiceRec.stop(); } catch (e) {}
    sportVoiceRec = null;
    resetSportVoiceBtnUi();
    const captured = `${sportVoiceFinalText} ${sportVoiceInterimText}`.trim();
    const inp = document.getElementById('sportVoiceTextInput');
    if (inp && captured) inp.value = captured;
    if ((inp?.value || captured).trim()) {
      analyzeSportVoiceDictation();
    }
    return;
  }

  if (sportVoiceMediaRecorder && sportVoiceMediaRecorder.state === 'recording') {
    sportVoiceMediaRecorder.stop();
    return;
  }

  sportVoiceAudioBase64 = null;
  sportVoiceAudioMime = null;

  const SpeechRec = typeof getSpeechRecognitionCtor === 'function' ? getSpeechRecognitionCtor() : null;
  if (SpeechRec) {
    try {
      const existing = (document.getElementById('sportVoiceTextInput')?.value || '').trim();
      sportVoiceFinalText = existing ? existing + ' ' : '';
      sportVoiceInterimText = '';
      const rec = new SpeechRec();
      rec.lang = (typeof appLang !== 'undefined' && appLang === 'es') ? 'es-ES' : 'de-DE';
      rec.continuous = true;
      rec.interimResults = true;
      sportVoiceRec = rec;
      sportVoiceActive = true;

      rec.onresult = (ev) => {
        let fin = existing ? existing + ' ' : '';
        let interim = '';
        for (let i = 0; i < ev.results.length; i++) {
          const t = ev.results[i][0]?.transcript || '';
          if (ev.results[i].isFinal) fin += t + ' ';
          else interim += t;
        }
        sportVoiceFinalText = fin.trim();
        sportVoiceInterimText = interim.trim();
        const combined = `${sportVoiceFinalText} ${sportVoiceInterimText}`.trim();
        const inp = document.getElementById('sportVoiceTextInput');
        if (inp) inp.value = combined;
      };

      rec.onerror = async (ev) => {
        const code = ev?.error || '';
        if (code === 'aborted' || code === 'no-speech') return;
        stopSportVoiceStreamOnly();
        try {
          await startSportVoiceAudioFallback();
        } catch (fallbackErr) {
          resetSportVoiceBtnUi();
          if (statusEl) {
            statusEl.textContent = `Mikrofon-Fehler: ${fallbackErr.message || fallbackErr}`;
            statusEl.className = 'text-xs text-rose-400';
          }
        }
      };

      rec.onend = () => {
        if (!sportVoiceActive) return;
        sportVoiceActive = false;
        clearInterval(sportVoiceTimer);
        sportVoiceTimer = null;
        sportVoiceRec = null;
        resetSportVoiceBtnUi();
      };

      rec.start();
      startSportVoiceRecUi('🔴 Hört live zu… Sprich z. B. „Bankdrücken 80 Kilo, 10, 9, 8 Wiederholungen“.');
      return;
    } catch (e) {
      stopSportVoiceStreamOnly();
    }
  }

  try {
    await startSportVoiceAudioFallback();
  } catch (err) {
    stopSportVoiceStreamOnly();
    resetSportVoiceBtnUi();
    if (statusEl) {
      statusEl.textContent = `Mikrofon-Fehler: ${err.message || err}`;
      statusEl.className = 'text-xs text-rose-400';
    }
  }
}

function parseWorkoutTextLocally(rawText) {
  const clean = String(rawText || '').trim();
  if (!clean) return null;
  const segments = clean
    .split(/(?:\.|;|\n|\bdanach\b|\bdann\b|\baußerdem\b|\bzum schluss\b)/i)
    .map(s => s.trim())
    .filter(s => s.length >= 3);

  const exercises = [];
  const catalogNames = getAllCatalogExercises().map(x => x.name).sort((a, b) => b.length - a.length);
  const aliasKeys = Object.keys(EXERCISE_ALIASES).sort((a, b) => b.length - a.length);

  segments.forEach(seg => {
    const low = seg.toLowerCase();
    let matchedName = '';
    for (const cName of catalogNames) {
      if (low.includes(cName.toLowerCase())) { matchedName = cName; break; }
    }
    if (!matchedName) {
      for (const aKey of aliasKeys) {
        if (low.includes(aKey)) { matchedName = EXERCISE_ALIASES[aKey].name; break; }
      }
    }
    if (!matchedName) {
      const m = seg.match(/^([a-zA-ZäöüÄÖÜß\- ]{3,32}?)(?=\s+\d|\s+mit\s+\d)/);
      if (m) matchedName = m[1].trim();
    }
    if (!matchedName) return;

    const canon = canonicalizeExercise(matchedName, 'Other');
    const kgMatch = seg.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|kilo|kilogramm)\b/i);
    const kg = kgMatch ? Number(kgMatch[1].replace(',', '.')) : 0;
    const setType = /aufwärm|warm[\s-]?up/i.test(seg) ? 'w' : (/drop[\s-]?set|reduktion/i.test(seg) ? 'd' : '');
    const secMatches = [...seg.matchAll(/(\d+)\s*(?:sek(?:unden)?|s)\b/gi)].map(m => Number(m[1]));

    const sets = [];
    if (secMatches.length > 0) {
      secMatches.forEach(sec => {
        if (sec > 0) sets.push({ kg, reps: 0, sec, t: setType });
      });
    } else {
      const multMatch = seg.match(/(\d+)\s*(?:x|×|mal|sätze?(?:\s*(?:à|a|je|mit))?)\s*(\d+)/i);
      if (multMatch) {
        const count = Math.min(12, Math.max(1, Number(multMatch[1])));
        const reps = Number(multMatch[2]);
        for (let k = 0; k < count; k++) sets.push({ kg, reps, sec: 0, t: setType });
      } else {
        const cleanedForReps = seg
          .replace(/(\d+(?:[.,]\d+)?)\s*(?:kg|kilo|kilogramm)\b/gi, '')
          .replace(/\b\d+\s*sätze?\b/gi, '');
        const nums = [...cleanedForReps.matchAll(/\b(\d{1,3})\b/g)].map(m => Number(m[1])).filter(n => n > 0 && n <= 200);
        nums.forEach(reps => sets.push({ kg, reps, sec: 0, t: setType }));
      }
    }

    if (sets.length > 0) {
      exercises.push({
        name: canon.name,
        category: canon.category,
        timed: secMatches.length > 0,
        sets
      });
    }
  });

  if (!exercises.length) return null;
  return { workoutType: 'strength', exercises };
}

function applyVoiceWorkoutResult(parsed) {
  if (!parsed || typeof parsed !== 'object') return { exCount: 0, setCount: 0 };
  if (!sportDraft) {
    openWorkoutModal();
  }
  const d = sportDraft;

  if (parsed.workoutTitle && !d.title) {
    d.title = String(parsed.workoutTitle).trim();
  }
  if (parsed.notes && String(parsed.notes).trim()) {
    const note = String(parsed.notes).trim();
    d.notes = d.notes ? `${d.notes} · ${note}` : note;
  }
  if (Number(parsed.duration) > 0 && !Number(d.duration)) {
    d.duration = Math.round(Number(parsed.duration));
  }

  let addedExercises = 0;
  let addedSets = 0;

  if (parsed.workoutType === 'cardio' && (!(parsed.exercises && parsed.exercises.length))) {
    d.type = 'cardio';
    if (Number(parsed.distance) > 0) d.distance = Math.round(Number(parsed.distance) * 100) / 100;
    if (Number(parsed.hr) > 0) d.hr = Math.round(Number(parsed.hr));
    if (Number(parsed.elev) > 0) d.elev = Math.round(Number(parsed.elev));
    saveSportDraftLocal();
    render();
    return { exCount: 0, setCount: 0, cardio: true };
  }

  const incoming = Array.isArray(parsed.exercises) ? parsed.exercises : [];
  if (incoming.length > 0) {
    d.type = 'strength';
    if (!Array.isArray(d.exercises)) d.exercises = [];

    incoming.forEach(rawEx => {
      const canon = canonicalizeExercise(rawEx?.name, rawEx?.category);
      if (!canon.name) return;
      const rawSets = Array.isArray(rawEx.sets) ? rawEx.sets : [];
      const cleanSets = rawSets
        .map(s => {
          const kg = Math.max(0, Math.round((Number(s?.kg) || 0) * 100) / 100);
          const reps = Math.max(0, Math.round(Number(s?.reps) || 0));
          const sec = Math.max(0, Math.round(Number(s?.sec) || 0));
          const t = s?.t === 'w' || s?.t === 'd' ? s.t : '';
          return { kg, reps, sec, t };
        })
        .filter(s => s.reps > 0 || s.sec > 0);
      if (!cleanSets.length) return;

      const isTimed = Boolean(rawEx.timed) || (cleanSets.some(s => s.sec > 0) && cleanSets.every(s => s.reps === 0));
      const existingEx = d.exercises.find(e => canonicalizeExercise(e.name, e.category).name.toLowerCase() === canon.name.toLowerCase());

      if (existingEx) {
        if (isTimed) existingEx.timed = true;
        if (existingEx.category === 'Other' && canon.category !== 'Other') existingEx.category = canon.category;
        let pendingIdx = 0;
        cleanSets.forEach(ns => {
          const slotIdx = existingEx.sets.findIndex((es, idx) => idx >= pendingIdx && !es.done);
          const builtSet = {
            kg: ns.kg > 0 ? ns.kg : '',
            reps: isTimed ? '' : ns.reps,
            sec: isTimed ? ns.sec : (ns.sec > 0 ? ns.sec : ''),
            t: ns.t,
            done: true
          };
          if (slotIdx >= 0) {
            existingEx.sets[slotIdx] = builtSet;
            pendingIdx = slotIdx + 1;
          } else {
            existingEx.sets.push(builtSet);
          }
          addedSets++;
        });
      } else {
        const prevMeta = lastSetsFor(canon.name, d.id);
        const resolvedCat = canon.category !== 'Other' ? canon.category : (prevMeta ? prevMeta.category : 'Other');
        d.exercises.push({
          name: canon.name,
          category: resolvedCat,
          timed: isTimed,
          sets: cleanSets.map(ns => ({
            kg: ns.kg > 0 ? ns.kg : '',
            reps: isTimed ? '' : ns.reps,
            sec: isTimed ? ns.sec : (ns.sec > 0 ? ns.sec : ''),
            t: ns.t,
            done: true
          }))
        });
        addedExercises++;
        addedSets += cleanSets.length;
      }
    });
  }

  if ((addedSets > 0 || addedExercises > 0) && !d.id && !d.timerRunning && !d.firstStartedAt) {
    const now = Date.now();
    d.firstStartedAt = now;
    d.timerRunning = true;
    d.timerStartedAt = now;
    ensureSportClockTicker();
  }

  saveSportDraftLocal();
  render();
  return { exCount: addedExercises, setCount: addedSets };
}

async function analyzeSportVoiceDictation() {
  const inp = document.getElementById('sportVoiceTextInput');
  const statusEl = document.getElementById('sportVoiceStatus');
  const btn = document.getElementById('sportVoiceAnalyzeBtn');

  if (sportVoiceActive && sportVoiceRec) {
    sportVoiceActive = false;
    clearInterval(sportVoiceTimer);
    sportVoiceTimer = null;
    try { sportVoiceRec.stop(); } catch (e) {}
    sportVoiceRec = null;
    resetSportVoiceBtnUi();
    const captured = `${sportVoiceFinalText} ${sportVoiceInterimText}`.trim();
    if (inp && captured && !inp.value.trim()) inp.value = captured;
  }

  const spokenText = (inp?.value || '').trim();
  if (!spokenText && !sportVoiceAudioBase64) {
    if (statusEl) {
      statusEl.textContent = 'Bitte zuerst einsprechen oder deine Übungen eintippen.';
      statusEl.className = 'text-xs text-rose-400';
    }
    return;
  }

  const apiKey = (typeof GEMINI_KEY_STORAGE !== 'undefined' ? (localStorage.getItem(GEMINI_KEY_STORAGE) || '') : '').trim();

  // Offline oder ohne Gemini Key -> lokaler Sofort-Parser für Textdiktat
  if ((!apiKey || (typeof navigator !== 'undefined' && navigator.onLine === false)) && spokenText) {
    const localParsed = parseWorkoutTextLocally(spokenText);
    if (localParsed) {
      const res = applyVoiceWorkoutResult(localParsed);
      stopSportVoiceStreamOnly();
      closeModal();
      if (typeof showToast === 'function') {
        showToast(`🎙️ ${res.setCount} Satz/Sätze direkt ins Training übernommen`);
      }
      return;
    }
    if (statusEl) {
      statusEl.textContent = !apiKey
        ? 'Für komplexe Spracheingaben bitte deinen Gemini API Key (unter KI-Analyse) hinterlegen.'
        : 'Offline nicht eindeutig erkannt – z. B. „Bankdrücken 80kg 3x10“ versuchen.';
      statusEl.className = 'text-xs text-amber-300';
    }
    return;
  }

  if (!apiKey) {
    if (statusEl) {
      statusEl.textContent = 'Bitte zuerst deinen Gemini API Key (unter Food → KI-Analyse) speichern.';
      statusEl.className = 'text-xs text-rose-400';
    }
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ KI erkennt Sätze…';
  }
  if (statusEl) {
    statusEl.textContent = '⚡ Werte Übungen, Gewichte & Wiederholungen aus…';
    statusEl.className = 'text-xs text-zinc-300';
  }

  const activeExList = (sportDraft?.exercises || []).map(e => e.name).filter(Boolean).join(', ');
  const catalogSample = EXERCISE_CATALOG.map(c => c.name).slice(0, 60).join(', ');
  const promptText = `Du bist ein präziser Trainings-Logger für eine Kraft- und Ausdauer-App.
Extrahiere alle diktierten Übungen, Sätze, Gewichte (in kg, 0 für Bodyweight/Eigengewicht), Wiederholungen (reps) oder Haltezeiten in Sekunden (sec) sowie Satztypen ("w" für Aufwärmsatz/Warmup, "d" für Dropset, "" für normal).
Regeln:
- Bei "3 Sätze à 10 Wiederholungen mit 80 Kilo" erzeuge 3 einzelne Einträge in "sets".
- Bei "10, 9 und 8 Wiederholungen mit 80 Kilo" erzeuge 3 Einträge in "sets" mit je kg=80 und reps=10, 9, 8.
- Nutze bevorzugt passende Übungsnamen aus dem aktuellen Training (${activeExList || 'noch leer'}) oder aus dem Katalog: ${catalogSample}.
- Ordne "category" immer einem dieser Werte zu: Back, Chest, Legs, Shoulders, Triceps, Biceps, Abs, Other.
- Bei Ausdauer (Laufen, Radfahren, Distanz in km) setze workoutType="cardio" mit distance, duration, hr, elev.
${spokenText ? `Diktierter Text: "${spokenText}"` : 'Analysiere die angehängte Sprachaufnahme.'}`;

  const parts = [{ text: promptText }];
  if (sportVoiceAudioBase64) {
    parts.push({
      inlineData: {
        mimeType: sportVoiceAudioMime || 'audio/webm',
        data: sportVoiceAudioBase64
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
          workoutTitle: { type: 'string' },
          workoutType: { type: 'string' },
          duration: { type: 'number' },
          distance: { type: 'number' },
          hr: { type: 'number' },
          elev: { type: 'number' },
          notes: { type: 'string' },
          exercises: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                category: { type: 'string' },
                timed: { type: 'boolean' },
                sets: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      kg: { type: 'number' },
                      reps: { type: 'number' },
                      sec: { type: 'number' },
                      t: { type: 'string' }
                    },
                    required: ['kg', 'reps']
                  }
                }
              },
              required: ['name', 'category', 'sets']
            }
          }
        },
        required: ['workoutType', 'exercises']
      }
    }
  });

  const models = typeof GEMINI_FAST_MODELS_TO_TRY !== 'undefined'
    ? GEMINI_FAST_MODELS_TO_TRY
    : ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
  const timeoutMs = typeof GEMINI_FETCH_TIMEOUT_MS !== 'undefined' ? GEMINI_FETCH_TIMEOUT_MS : 25000;

  try {
    let res = null;
    let lastError = 'Unbekannter Fehler';
    for (const model of models) {
      const controller = new AbortController();
      sportVoiceAbortController = controller;
      const tid = setTimeout(() => { try { controller.abort(); } catch (e) {} }, timeoutMs);
      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
          signal: controller.signal
        });
      } catch (fetchErr) {
        clearTimeout(tid);
        lastError = fetchErr.message || 'Netzwerkfehler';
        res = null;
        continue;
      } finally {
        clearTimeout(tid);
        if (sportVoiceAbortController === controller) sportVoiceAbortController = null;
      }
      if (res.ok) break;
      const errData = await res.json().catch(() => ({}));
      lastError = errData.error?.message || `HTTP ${res.status}`;
      if (![404, 429, 500, 502, 503, 504].includes(res.status)) throw new Error(lastError);
      res = null;
    }

    if (!res) throw new Error(lastError);
    const jsonRes = await res.json();
    const raw = extractGeminiJsonText(jsonRes);
    const parsed = JSON.parse(raw);

    const applied = applyVoiceWorkoutResult(parsed);
    if (!applied.cardio && applied.setCount === 0) {
      throw new Error('Keine Übungen oder Sätze erkannt – bitte kurz deutlicher wiederholen.');
    }

    stopSportVoiceStreamOnly();
    closeModal();
    if (typeof showToast === 'function') {
      showToast(applied.cardio
        ? '🎙️ Ausdauer-Einheit per Sprache übernommen'
        : `🎙️ ${applied.setCount} Satz/Sätze automatisch ins Training eingetragen`);
    }
  } catch (err) {
    // Letzter Fallback: lokaler Parser bei Netzwerkproblemen
    if (spokenText) {
      const localParsed = parseWorkoutTextLocally(spokenText);
      if (localParsed) {
        const applied = applyVoiceWorkoutResult(localParsed);
        stopSportVoiceStreamOnly();
        closeModal();
        if (typeof showToast === 'function') {
          showToast(`🎙️ ${applied.setCount} Satz/Sätze (offline erkannt) eingetragen`);
        }
        return;
      }
    }
    if (statusEl) {
      statusEl.textContent = `Fehler: ${err.message || err}`;
      statusEl.className = 'text-xs text-rose-400';
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '✨ Erkennen & eintragen';
    }
  }
}
