import { computeAnalytics, sessionVolume } from "./analytics.js?v=1";
import { getAll, put, remove, seedExercises, uid } from "./db.js?v=2";
import { dailyInsight, weeklyInsight } from "./insights.js?v=1";
import { getCyclePhase, getTodayWorkout, LIBRARY, PROGRAM } from "../data/program.js?v=1";

const DEFAULT_PREFS = {
  route: "home",
  unit: "lb",
  reducedMotion: false,
  activeExerciseIndex: 0,
  libraryFilter: "All",
  search: ""
};

const STORAGE_KEYS = {
  prefs: "trainwithz:prefs",
  draft: "trainwithz:draft",
  legacyPrefs: "aurafit:prefs",
  legacyDraft: "aurafit:draft"
};

migrateLocalStorage();

export const store = {
  state: {
    prefs: loadPrefs(),
    sessions: [],
    exercises: [],
    photos: [],
    draft: loadDraft(),
    ready: false
  },
  listeners: new Set(),
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },
  emit() {
    persistPrefs(this.state.prefs);
    this.listeners.forEach((fn) => fn(this.snapshot()));
  },
  snapshot() {
    const analytics = computeAnalytics(this.state.sessions);
    const todayWorkout = getTodayWorkout();
    const lastSession = analytics.sorted.at(-1) || null;
    return {
      ...this.state,
      analytics,
      todayWorkout,
      cycle: getCyclePhase(),
      program: PROGRAM,
      insight: dailyInsight({ analytics, todayWorkout, lastSession }),
      weeklyInsight: weeklyInsight(analytics),
      lastSession
    };
  },
  async init() {
    const [sessions, photos, exercises] = await Promise.all([
      getAll("sessions"),
      getAll("photos"),
      seedExercises(LIBRARY)
    ]);
    this.state.sessions = sessions;
    this.state.photos = photos;
    this.state.exercises = exercises;
    this.state.ready = true;
    this.emit();
  },
  setRoute(route) {
    this.state.prefs.route = route;
    this.emit();
  },
  setPrefs(patch) {
    this.state.prefs = { ...this.state.prefs, ...patch };
    this.emit();
  },
  startWorkout(day = getTodayWorkout() || PROGRAM[0]) {
    const now = new Date();
    this.state.draft = {
      id: uid("draft"),
      programId: day.id,
      title: day.title,
      focus: day.focus,
      startedAt: now.toISOString(),
      activeExerciseIndex: 0,
      notes: "",
      exercises: day.exercises.map(([id, name, muscle, prescription, tip]) => ({
        id,
        name,
        muscle,
        prescription,
        tip,
        skipped: false,
        notes: "",
        sets: seedSets(prescription)
      }))
    };
    saveDraft(this.state.draft);
    this.state.prefs.route = "workout";
    this.state.prefs.activeExerciseIndex = 0;
    this.emit();
  },
  updateDraft(mutator) {
    if (!this.state.draft) return;
    mutator(this.state.draft);
    saveDraft(this.state.draft);
    this.emit();
  },
  async finishWorkout() {
    const draft = this.state.draft;
    if (!draft) return;
    const finishedAt = new Date();
    const duration = Math.max(1, Math.round((finishedAt - new Date(draft.startedAt)) / 60000));
    const volume = sessionVolume(draft.exercises);
    const session = {
      id: uid("session"),
      date: finishedAt.toISOString(),
      title: draft.title,
      focus: draft.focus,
      duration,
      volume,
      notes: draft.notes,
      exercises: draft.exercises,
      prs: []
    };
    await put("sessions", session);
    this.state.sessions.push(session);
    this.state.draft = null;
    saveDraft(null);
    this.state.prefs.route = "home";
    this.emit();
  },
  async deleteSession(id) {
    await remove("sessions", id);
    this.state.sessions = this.state.sessions.filter((session) => session.id !== id);
    this.emit();
  },
  async saveExercise(exercise) {
    await put("exercises", exercise);
    const index = this.state.exercises.findIndex((item) => item.id === exercise.id);
    if (index >= 0) this.state.exercises[index] = exercise;
    else this.state.exercises.push(exercise);
    this.emit();
  },
  async addPhoto(file) {
    const photo = { id: uid("photo"), date: new Date().toISOString(), blob: file, note: "" };
    await put("photos", photo);
    this.state.photos.push(photo);
    this.emit();
  }
};

function seedSets(prescription) {
  const count = Number((prescription.match(/^(\d+)/) || [])[1]) || 3;
  const reps = Number((prescription.match(/x\s*(\d+)/i) || [])[1]) || "";
  return Array.from({ length: count }, (_, index) => ({
    id: uid("set"),
    index: index + 1,
    weight: "",
    reps,
    done: false
  }));
}

function loadPrefs() {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(STORAGE_KEYS.prefs) || "{}") };
  } catch {
    return DEFAULT_PREFS;
  }
}

function persistPrefs(prefs) {
  localStorage.setItem(STORAGE_KEYS.prefs, JSON.stringify(prefs));
}

function loadDraft() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.draft) || "null");
  } catch {
    return null;
  }
}

function saveDraft(draft) {
  if (!draft) localStorage.removeItem(STORAGE_KEYS.draft);
  else localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(draft));
}

function migrateLocalStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.prefs) && localStorage.getItem(STORAGE_KEYS.legacyPrefs)) {
    localStorage.setItem(STORAGE_KEYS.prefs, localStorage.getItem(STORAGE_KEYS.legacyPrefs));
  }
  if (!localStorage.getItem(STORAGE_KEYS.draft) && localStorage.getItem(STORAGE_KEYS.legacyDraft)) {
    localStorage.setItem(STORAGE_KEYS.draft, localStorage.getItem(STORAGE_KEYS.legacyDraft));
  }
}
