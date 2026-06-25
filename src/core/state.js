import { computeAnalytics, sessionVolume } from "./analytics.js?v=1";
import { getAll, put, remove, seedExercises, uid } from "./db.js?v=3";
import { dailyInsight, weeklyInsight } from "./insights.js?v=2";
import { getCyclePhase, getTodayWorkout, LIBRARY, PROGRAM } from "../data/program.js?v=2";

const DEFAULT_PREFS = {
  route: "home",
  unit: "lb",
  reducedMotion: false,
  activeExerciseIndex: 0,
  expandedSessionId: null,
  calendarExpanded: true,
  cancelPrompt: false,
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
    inbody: [],
    nutrition: [],
    program: [],
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
    const todayWorkout = getTodayWorkout(new Date(), this.state.program);
    const lastSession = analytics.sorted.at(-1) || null;
    return {
      ...this.state,
      analytics,
      todayWorkout,
      cycle: getCyclePhase(),
      program: this.state.program,
      insight: dailyInsight({ analytics, todayWorkout, lastSession }),
      weeklyInsight: weeklyInsight(analytics),
      lastSession
    };
  },
  async init() {
    const [sessions, photos, exercises, settings, inbody, nutrition] = await Promise.all([
      getAll("sessions"),
      getAll("photos"),
      seedExercises(LIBRARY),
      getAll("settings"),
      getAll("inbody"),
      getAll("nutrition")
    ]);
    this.state.sessions = sessions;
    this.state.photos = photos;
    this.state.exercises = exercises;
    this.state.program = settings.find((item) => item.key === "program")?.value || structuredClone(PROGRAM);
    this.state.inbody = inbody;
    this.state.nutrition = nutrition;
    if (!settings.some((item) => item.key === "program")) {
      await put("settings", { key: "program", value: this.state.program });
    }
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
  startWorkout(day = getTodayWorkout(new Date(), this.state.program) || this.state.program[0]) {
    if (!day || !day.exercises.length) return;
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
  cancelWorkout() {
    this.state.draft = null;
    saveDraft(null);
    this.state.prefs.route = "home";
    this.state.prefs.activeExerciseIndex = 0;
    this.state.prefs.cancelPrompt = false;
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
    this.state.prefs.cancelPrompt = false;
    this.emit();
  },
  async deleteSession(id) {
    await remove("sessions", id);
    this.state.sessions = this.state.sessions.filter((session) => session.id !== id);
    if (this.state.prefs.expandedSessionId === id) this.state.prefs.expandedSessionId = null;
    this.emit();
  },
  async saveExercise(exercise) {
    await put("exercises", exercise);
    const index = this.state.exercises.findIndex((item) => item.id === exercise.id);
    if (index >= 0) this.state.exercises[index] = exercise;
    else this.state.exercises.push(exercise);
    this.emit();
  },
  async deleteExercise(id) {
    await remove("exercises", id);
    this.state.exercises = this.state.exercises.filter((exercise) => exercise.id !== id);
    this.state.program = this.state.program.map((day) => ({
      ...day,
      exercises: day.exercises.filter((exercise) => exercise[0] !== id)
    }));
    await this.saveProgram();
  },
  async addProgramDay(title) {
    const day = {
      id: uid("day"),
      day: this.state.program.length + 1,
      title: title || `Training Day ${this.state.program.length + 1}`,
      focus: [],
      tone: "Custom training day.",
      exercises: []
    };
    this.state.program.push(day);
    await this.saveProgram();
    this.setPrefs({ editingDayId: day.id });
  },
  async updateProgramDay(id, patch) {
    const day = this.state.program.find((item) => item.id === id);
    if (!day) return;
    Object.assign(day, patch);
    await this.saveProgram();
  },
  async deleteProgramDay(id) {
    this.state.program = this.state.program
      .filter((day) => day.id !== id)
      .map((day, index) => ({ ...day, day: index + 1 }));
    await this.saveProgram();
  },
  async moveProgramDay(id, delta) {
    const index = this.state.program.findIndex((day) => day.id === id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= this.state.program.length) return;
    [this.state.program[index], this.state.program[target]] = [this.state.program[target], this.state.program[index]];
    this.state.program = this.state.program.map((day, dayIndex) => ({ ...day, day: dayIndex + 1 }));
    await this.saveProgram();
  },
  async addExerciseToDay(dayId, exerciseId) {
    const day = this.state.program.find((item) => item.id === dayId);
    const exercise = this.state.exercises.find((item) => item.id === exerciseId);
    if (!day || !exercise || day.exercises.some((item) => item[0] === exerciseId)) return;
    day.exercises.push([exercise.id, exercise.name, exercise.muscle, exercise.prescription, exercise.tip]);
    day.focus = [...new Set(day.exercises.map((item) => item[2]))];
    await this.saveProgram();
  },
  async removeExerciseFromDay(dayId, exerciseId) {
    const day = this.state.program.find((item) => item.id === dayId);
    if (!day) return;
    day.exercises = day.exercises.filter((item) => item[0] !== exerciseId);
    day.focus = [...new Set(day.exercises.map((item) => item[2]))];
    await this.saveProgram();
  },
  async moveExerciseInDay(dayId, exerciseId, delta) {
    const day = this.state.program.find((item) => item.id === dayId);
    if (!day) return;
    const index = day.exercises.findIndex((item) => item[0] === exerciseId);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= day.exercises.length) return;
    [day.exercises[index], day.exercises[target]] = [day.exercises[target], day.exercises[index]];
    await this.saveProgram();
  },
  async updateProgramExercisePlan(dayId, exerciseId, sets, reps) {
    const day = this.state.program.find((item) => item.id === dayId);
    const exercise = day?.exercises.find((item) => item[0] === exerciseId);
    if (!exercise) return;
    const safeSets = Math.max(1, Math.min(20, Number(sets) || 1));
    const safeReps = Math.max(1, Math.min(100, Number(reps) || 1));
    exercise[3] = `${safeSets} x ${safeReps}`;
    const libraryExercise = this.state.exercises.find((item) => item.id === exerciseId);
    if (libraryExercise) {
      libraryExercise.prescription = exercise[3];
      await put("exercises", libraryExercise);
    }
    await this.saveProgram();
  },
  async saveProgram() {
    await put("settings", { key: "program", value: this.state.program });
    this.emit();
  },
  async addInBody(values) {
    const scanDate = values.date ? new Date(`${values.date}T12:00:00`).toISOString() : new Date().toISOString();
    const entry = { id: uid("inbody"), ...values, date: scanDate };
    await put("inbody", entry);
    this.state.inbody.push(entry);
    this.emit();
  },
  async logNutrition(type, amount) {
    const date = localDateKey();
    const existing = this.state.nutrition.find((item) => item.date === date) || {
      date, water: 0, protein: 0, waterGoal: 3, proteinGoal: 150
    };
    existing[type] = Math.max(0, Number(existing[type] || 0) + Number(amount || 0));
    await put("nutrition", existing);
    const index = this.state.nutrition.findIndex((item) => item.date === date);
    if (index >= 0) this.state.nutrition[index] = existing;
    else this.state.nutrition.push(existing);
    this.emit();
  },
  async addPhoto(file) {
    const photo = { id: uid("photo"), date: new Date().toISOString(), blob: file, note: "" };
    await put("photos", photo);
    this.state.photos.push(photo);
    this.emit();
  }
};

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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
