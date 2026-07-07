import { store } from "./core/state.js?v=18";
import { parseWorkoutPdf } from "./core/pdf-importer.js?v=1";
import { nav } from "./ui/components.js?v=5";
import { analyticsView, editorView, historyView, homeView, libraryView, weeklyView, workoutView } from "./features/views.js?v=48";

const app = document.querySelector("#app");
const splash = document.querySelector("#splash");
const splashStartedAt = performance.now();

const views = {
  home: homeView,
  workout: workoutView,
  library: libraryView,
  analytics: analyticsView,
  history: historyView,
  editor: editorView,
  weekly: weeklyView
};

store.subscribe(render);
store.init().catch((error) => {
  app.innerHTML = `<main class="view"><section class="empty-state"><h1>Storage needs a reset</h1><p>${error.message}</p></section></main>`;
  hideSplash();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
}

function render(state) {
  document.documentElement.dataset.theme = state.prefs.theme === "dark" ? "dark" : "light";
  if (!state.ready) {
    app.innerHTML = `<main class="view loading"><div class="pulse"></div><h1>TrainWith Z</h1><p>Hydrating your private training system.</p></main>`;
    return;
  }
  const route = state.prefs.route in views ? state.prefs.route : "home";
  app.innerHTML = `${views[route](state)}${nav(route)}`;
  app.dataset.route = route;
  bindInteractiveControls();
  hideSplash();
}

function hideSplash() {
  if (!splash || splash.classList.contains("is-hidden")) return;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const minimum = prefersReducedMotion ? 120 : 1150;
  const elapsed = performance.now() - splashStartedAt;
  window.setTimeout(() => {
    splash.classList.add("is-hidden");
    window.setTimeout(() => splash.remove(), prefersReducedMotion ? 80 : 650);
  }, Math.max(0, minimum - elapsed));
}

document.addEventListener("click", (event) => {
  const routeButton = event.target.closest("[data-route]");
  if (routeButton) {
    store.setRoute(routeButton.dataset.route);
    return;
  }

  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget) return;
  const action = actionTarget.dataset.action;

  if (action === "start-workout") {
    if (store.state.draft) store.setRoute("workout");
    else store.startWorkout();
  }
  if (action === "toggle-theme") {
    store.setPrefs({ theme: store.state.prefs.theme === "dark" ? "light" : "dark", themePickerOpen: false });
    return;
  }
  if (action === "start-program") {
    const day = store.state.program.find((item) => item.id === actionTarget.dataset.id) || store.state.program[0];
    store.startWorkout(day);
  }
  if (action === "finish-workout") store.finishWorkout();
  if (action === "request-cancel-workout") store.setPrefs({ cancelPrompt: true });
  if (action === "keep-workout") store.setPrefs({ cancelPrompt: false });
  if (action === "confirm-cancel-workout") store.cancelWorkout();
  if (action === "toggle-session") {
    store.setPrefs({
      expandedSessionId: store.state.prefs.expandedSessionId === actionTarget.dataset.id
        ? null
        : actionTarget.dataset.id
    });
  }
  if (action === "prev-exercise") moveExercise(-1);
  if (action === "next-exercise") moveExercise(1);
  if (action === "toggle-set") updateSet(actionTarget.dataset.set, (set) => { set.done = !set.done; });
  if (action === "skip-exercise") {
    store.updateDraft((draft) => {
      const ex = draft.exercises[store.state.prefs.activeExerciseIndex || 0];
      ex.skipped = !ex.skipped;
      ex.sets.forEach((set) => { set.done = false; });
    });
  }
  if (action === "add-exercise") store.setRoute("library");
  if (action === "replace-exercise") store.setRoute("library");
  if (action === "add-library-exercise") addExerciseToDraft(actionTarget.dataset.id);
  handleManagementAction(actionTarget, event);
});

app.addEventListener("input", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (action === "set-weight") updateSetQuietly(target.dataset.set, (set) => { set.weight = target.value; });
  if (action === "set-reps") updateSetQuietly(target.dataset.set, (set) => { set.reps = target.value; });
  if (action === "exercise-notes") {
    store.updateDraft((draft) => {
      const ex = draft.exercises[store.state.prefs.activeExerciseIndex || 0];
      ex.notes = target.value;
    });
  }
  if (action === "search-library") store.setPrefs({ search: target.value });
  if (action === "program-day-title") {
    store.updateProgramDayQuietly(target.dataset.id, { title: target.value.trim() || "Training Day" });
  }
  if (action === "warmup-name" || action === "warmup-plan" || action === "warmup-notes") {
    if (action === "warmup-plan") {
      const plan = splitPlan(target.value);
      store.updateWarmUpExerciseQuietly(target.dataset.day, target.dataset.id, plan);
    } else {
      const field = action === "warmup-name" ? "name" : "notes";
      store.updateWarmUpExerciseQuietly(target.dataset.day, target.dataset.id, { [field]: target.value.trim() });
    }
  }
  if (action === "program-exercise-plan") {
    const plan = splitPlan(target.value);
    store.updateProgramExercisePlanQuietly(target.dataset.day, target.dataset.id, plan.sets, plan.reps);
  }
  if (action === "program-exercise-name") {
    store.updateProgramExerciseNameQuietly(target.dataset.day, target.dataset.id, target.value);
  }
  if (action === "program-exercise-notes") {
    store.updateProgramExerciseNotesQuietly(target.dataset.day, target.dataset.id, target.value);
  }
});

app.addEventListener("change", (event) => {
  const filter = event.target.closest("[data-filter]");
  if (filter) store.setPrefs({ libraryFilter: filter.dataset.filter });

  const fileInput = event.target.closest('[data-action="add-photo"]');
  if (fileInput?.files?.[0]) store.addPhoto(fileInput.files[0]);

  const workoutPdfInput = event.target.closest('[data-action="import-workout-pdf"]');
  if (workoutPdfInput?.files?.[0]) importWorkoutPdf(workoutPdfInput);

  const warmupToggle = event.target.closest('[data-action="program-day-warmup-enabled"]');
  if (warmupToggle) store.setWarmUpEnabled(warmupToggle.dataset.id, warmupToggle.checked);

});

let swipeDeleteState = null;
let dayPressState = null;

app.addEventListener("pointerdown", (event) => {
  const row = event.target.closest(".program-exercise-row, .warmup-row");
  if (!row || event.target.closest("button, input, textarea")) return;
  swipeDeleteState = {
    row,
    startX: event.clientX,
    startY: event.clientY,
    moved: false
  };
}, true);

app.addEventListener("pointermove", (event) => {
  if (!swipeDeleteState) return;
  const deltaX = event.clientX - swipeDeleteState.startX;
  const deltaY = event.clientY - swipeDeleteState.startY;
  if (Math.abs(deltaX) < 18 || Math.abs(deltaX) < Math.abs(deltaY)) return;
  swipeDeleteState.moved = true;
  if (deltaX < -44) {
    closeSwipeRows(swipeDeleteState.row);
    closeManageRows();
    closeDayManageCards();
    swipeDeleteState.row.classList.add("swipe-open");
  }
  if (deltaX > 32) {
    swipeDeleteState.row.classList.remove("swipe-open");
  }
}, true);

app.addEventListener("pointerup", () => {
  swipeDeleteState = null;
}, true);

app.addEventListener("pointerdown", (event) => {
  const card = event.target.closest(".program-editor-card");
  if (!card || event.target.closest("button, input, textarea, label, .program-exercise-row, .warmup-row")) return;
  dayPressState = {
    card,
    startX: event.clientX,
    startY: event.clientY,
    active: false,
    used: false,
    timer: window.setTimeout(() => {
      closeDayManageCards(card);
      closeSwipeRows();
      card.classList.add("day-manage-open");
      dayPressState.active = true;
    }, 520)
  };
}, true);

app.addEventListener("pointermove", (event) => {
  if (!dayPressState) return;
  const deltaX = event.clientX - dayPressState.startX;
  const deltaY = event.clientY - dayPressState.startY;
  if (!dayPressState.active && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
    window.clearTimeout(dayPressState.timer);
  }
  if (dayPressState.active && !dayPressState.used && Math.abs(deltaY) > 58 && Math.abs(deltaY) > Math.abs(deltaX)) {
    moveManagedDay(dayPressState.card, deltaY < 0 ? -1 : 1);
    dayPressState.used = true;
  }
}, true);

app.addEventListener("pointerup", () => {
  if (dayPressState) {
    window.clearTimeout(dayPressState.timer);
    dayPressState = null;
  }
}, true);

document.addEventListener("click", (event) => {
  const row = event.target.closest(".program-exercise-row, .warmup-row");
  const dayCard = event.target.closest(".program-editor-card");
  if (!row) {
    closeSwipeRows();
    closeManageRows();
  }
  if (!dayCard) closeDayManageCards();
}, true);

app.addEventListener("pointerdown", (event) => {
  if (event.target.closest("input, textarea")) {
    event.stopPropagation();
  }
}, true);

app.addEventListener("click", (event) => {
  if (event.target.closest("input, textarea")) {
    event.stopPropagation();
  }
}, true);

app.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-form]");
  if (!form) return;
  event.preventDefault();
  if (form.dataset.form === "exercise") await saveExerciseForm(form);
  if (form.dataset.form === "inbody") await saveInBodyForm(form);
});

async function saveExerciseForm(form) {
  if (!form?.reportValidity()) return;
  const formData = new FormData(form);
  const values = Object.fromEntries(formData);
  const name = String(values.name || "").trim();
  if (!name) return;
  const exercise = {
    id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString(36)}`,
    name,
    muscle: "General",
    equipment: "Custom",
    prescription: String(values.prescription || "3 x 10").trim(),
    tip: String(values.tip || "").trim(),
    editable: true
  };
  await store.saveExercise(exercise);
  if (store.state.prefs.editingDayId) {
    await store.addExerciseToDay(store.state.prefs.editingDayId, exercise.id);
  }
  store.setPrefs({ showExerciseForm: false });
  form.reset();
}

async function saveInBodyForm(form) {
  if (!form?.reportValidity()) return;
  const formData = new FormData(form);
  const values = Object.fromEntries(formData);
  const reportImage = formData.get("reportImage");
  const scan = Object.fromEntries(Object.entries(values)
    .filter(([key]) => key !== "reportImage")
    .map(([key, value]) => [key, key === "date" ? value : Number(value)]));
  if (reportImage instanceof File && reportImage.size) {
    scan.reportImage = reportImage;
  }
  await store.addInBody(scan);
  store.setPrefs({ showInBodyForm: false });
  form.reset();
}

document.addEventListener("click", (event) => {
  const filter = event.target.closest("[data-filter]");
  if (filter) store.setPrefs({ libraryFilter: filter.dataset.filter });
});

let touchStartX = 0;
app.addEventListener("touchstart", (event) => {
  touchStartX = event.touches[0]?.clientX || 0;
}, { passive: true });

app.addEventListener("touchend", (event) => {
  if (store.state.prefs.route !== "workout") return;
  const delta = (event.changedTouches[0]?.clientX || 0) - touchStartX;
  if (Math.abs(delta) > 70) moveExercise(delta < 0 ? 1 : -1);
}, { passive: true });

function moveExercise(delta) {
  const draft = store.state.draft;
  if (!draft) return;
  const next = Math.max(0, Math.min(draft.exercises.length - 1, (store.state.prefs.activeExerciseIndex || 0) + delta));
  store.setPrefs({ activeExerciseIndex: next });
}

function updateSet(id, mutator, rerender = true) {
  store.updateDraft((draft) => {
    const set = draft.exercises.flatMap((ex) => ex.sets).find((item) => item.id === id);
    if (set) mutator(set);
  });
  if (!rerender) saveDraftQuietly();
}

function updateSetQuietly(id, mutator) {
  const draft = store.state.draft;
  if (!draft) return;
  const set = draft.exercises.flatMap((ex) => ex.sets).find((item) => item.id === id);
  if (set) mutator(set);
  saveDraftQuietly();
}

function addExerciseToDraft(id) {
  const exercise = store.state.exercises.find((item) => item.id === id);
  if (!exercise) return;
  if (store.state.prefs.editingDayId) {
    store.addExerciseToDay(store.state.prefs.editingDayId, id);
    return;
  }
  if (!store.state.draft) return;
  store.updateDraft((draft) => {
    draft.exercises.push({
      id: exercise.id,
      name: exercise.name,
      muscle: exercise.muscle,
      prescription: exercise.prescription,
      tip: exercise.tip,
      skipped: false,
      notes: "",
      sets: [
        { id: crypto.randomUUID(), index: 1, weight: "", reps: "", done: false },
        { id: crypto.randomUUID(), index: 2, weight: "", reps: "", done: false },
        { id: crypto.randomUUID(), index: 3, weight: "", reps: "", done: false }
      ]
    });
  });
  store.setPrefs({ route: "workout", activeExerciseIndex: store.state.draft.exercises.length - 1 });
}

function saveDraftQuietly() {
  localStorage.setItem("trainwithz:draft", JSON.stringify(store.state.draft));
}

function bindInteractiveControls() {
  app.querySelectorAll("[data-route]").forEach((button) => {
    button.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      store.setRoute(button.dataset.route);
    };
  });
  app.querySelectorAll("button[data-action], label[data-action], [role='button'][data-action]").forEach((button) => {
    button.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      runAction(button);
    };
  });
  app.querySelectorAll("[data-filter]").forEach((button) => {
    button.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      store.setPrefs({ libraryFilter: button.dataset.filter });
    };
  });
}

function runAction(actionTarget) {
  const action = actionTarget.dataset.action;
  if (action === "start-workout") {
    if (store.state.draft) store.setRoute("workout");
    else store.startWorkout();
  }
  if (action === "toggle-theme") {
    store.setPrefs({ theme: store.state.prefs.theme === "dark" ? "light" : "dark", themePickerOpen: false });
    return;
  }
  if (action === "start-program") {
    const day = store.state.program.find((item) => item.id === actionTarget.dataset.id) || store.state.program[0];
    store.startWorkout(day);
  }
  if (action === "finish-workout") store.finishWorkout();
  if (action === "request-cancel-workout") store.setPrefs({ cancelPrompt: true });
  if (action === "keep-workout") store.setPrefs({ cancelPrompt: false });
  if (action === "confirm-cancel-workout") store.cancelWorkout();
  if (action === "toggle-session") {
    store.setPrefs({
      expandedSessionId: store.state.prefs.expandedSessionId === actionTarget.dataset.id
        ? null
        : actionTarget.dataset.id
    });
  }
  if (action === "prev-exercise") moveExercise(-1);
  if (action === "next-exercise") moveExercise(1);
  if (action === "toggle-set") updateSet(actionTarget.dataset.set, (set) => { set.done = !set.done; });
  if (action === "skip-exercise") {
    store.updateDraft((draft) => {
      const ex = draft.exercises[store.state.prefs.activeExerciseIndex || 0];
      ex.skipped = !ex.skipped;
      ex.sets.forEach((set) => { set.done = false; });
    });
  }
  if (action === "add-exercise") store.setRoute("library");
  if (action === "replace-exercise") store.setRoute("library");
  if (action === "add-library-exercise") addExerciseToDraft(actionTarget.dataset.id);
  if (action === "remove-day-exercise" || action === "remove-warmup-exercise") {
    closeSwipeRows();
    closeManageRows();
  }
  if (action === "delete-program-day" || action === "move-day-up" || action === "move-day-down") {
    closeDayManageCards();
  }
  handleManagementAction(actionTarget, event);
}

function closeSwipeRows(exceptRow = null) {
  document.querySelectorAll(".program-exercise-row.swipe-open, .warmup-row.swipe-open").forEach((row) => {
    if (row !== exceptRow) row.classList.remove("swipe-open");
  });
}

function closeManageRows(exceptRow = null) {
  document.querySelectorAll(".program-exercise-row.manage-open, .warmup-row.manage-open").forEach((row) => {
    if (row !== exceptRow) row.classList.remove("manage-open");
  });
}

function closeDayManageCards(exceptCard = null) {
  document.querySelectorAll(".program-editor-card.day-manage-open").forEach((card) => {
    if (card !== exceptCard) card.classList.remove("day-manage-open");
  });
}

function moveManagedDay(card, delta) {
  const action = delta < 0 ? "move-day-up" : "move-day-down";
  const button = card.querySelector(`[data-action="${action}"]`);
  if (button && !button.disabled) button.click();
}

function moveManagedRow(row, delta) {
  const action = row.dataset.reorderKind === "warmup"
    ? (delta < 0 ? "move-warmup-exercise-up" : "move-warmup-exercise-down")
    : (delta < 0 ? "move-day-exercise-up" : "move-day-exercise-down");
  const button = row.querySelector(`[data-action="${action}"]`);
  if (button && !button.disabled) button.click();
}

function handleManagementAction(actionTarget, event) {
  const action = actionTarget.dataset.action;
  const id = actionTarget.dataset.id;
  if (action === "toggle-day-manage") {
    const card = actionTarget.closest(".program-editor-card");
    if (card) {
      closeDayManageCards(card);
      closeSwipeRows();
      closeManageRows();
      card.classList.toggle("day-manage-open");
    }
    return;
  }
  if (action === "toggle-row-manage") {
    const row = actionTarget.closest(".program-exercise-row, .warmup-row");
    if (row) {
      closeManageRows(row);
      closeSwipeRows(row);
      row.classList.toggle("manage-open");
    }
    return;
  }
  if (action === "toggle-exercise-form") store.setPrefs({ showExerciseForm: !store.state.prefs.showExerciseForm });
  if (action === "save-exercise-form") saveExerciseForm(actionTarget.closest("form"));
  if (action === "delete-library-exercise" && window.confirm("Delete this exercise from your Library and program days?")) store.deleteExercise(id);
  if (action === "add-program-day") {
    store.addProgramDay().then((dayId) => scrollDayIntoView(dayId));
  }
  if (action === "delete-program-day" && window.confirm("Delete this workout day?")) store.deleteProgramDay(id);
  if (action === "move-day-up") store.moveProgramDay(id, -1);
  if (action === "move-day-down") store.moveProgramDay(id, 1);
  if (action === "choose-day-exercises") store.setPrefs({ editingDayId: id, route: "library" });
  if (action === "finish-editing-day") store.setPrefs({ editingDayId: null, route: "editor" });
  if (action === "add-blank-exercise") store.addBlankExerciseToDay(id);
  if (action === "remove-day-exercise") store.removeExerciseFromDay(actionTarget.dataset.day, id);
  if (action === "move-day-exercise-up") store.moveExerciseInDay(actionTarget.dataset.day, id, -1);
  if (action === "move-day-exercise-down") store.moveExerciseInDay(actionTarget.dataset.day, id, 1);
  if (action === "add-warmup-exercise") store.addWarmUpExercise(id);
  if (action === "remove-warmup-exercise") store.removeWarmUpExercise(actionTarget.dataset.day, id);
  if (action === "move-warmup-exercise-up") store.moveWarmUpExercise(actionTarget.dataset.day, id, -1);
  if (action === "move-warmup-exercise-down") store.moveWarmUpExercise(actionTarget.dataset.day, id, 1);
  if (action === "show-warmup-notes") store.setPrefs({ openWarmUpNoteId: id });
  if (action === "remove-warmup-notes") {
    store.updateWarmUpExercise(actionTarget.dataset.day, id, { notes: "" });
    store.setPrefs({ openWarmUpNoteId: null });
  }
  if (action === "show-program-exercise-notes") store.setPrefs({ openExerciseNoteId: id });
  if (action === "remove-program-exercise-notes") {
    store.updateProgramExerciseNotes(actionTarget.dataset.day, id, "");
    store.setPrefs({ openExerciseNoteId: null });
  }
  if (action === "toggle-inbody-form") store.setPrefs({ showInBodyForm: !store.state.prefs.showInBodyForm });
  if (action === "toggle-last-schedule") store.setPrefs({ lastScheduleOpen: !store.state.prefs.lastScheduleOpen });
  if (action === "save-inbody-form") saveInBodyForm(actionTarget.closest("form"));
  if (action === "log-water") store.logNutrition("water", 0.25);
  if (action === "log-protein") store.logNutrition("protein", 10);
  if (action === "remove-water") store.logNutrition("water", -0.25);
  if (action === "remove-protein") store.logNutrition("protein", -10);
  if (action === "open-calendar-session") {
    store.setPrefs({
      route: "history",
      expandedSessionId: id
    });
  }
  if (action === "toggle-program-day") {
    store.setPrefs({
      expandedProgramDayId: store.state.prefs.expandedProgramDayId === id ? null : id
    });
  }
  if (action === "delete-history-session" && window.confirm("Delete this logged workout permanently?")) {
    store.deleteSession(id);
  }
  if (action === "clear-pdf-import") store.setPrefs({ pdfImportStatus: null });
  if (action === "toggle-calendar") store.setPrefs({ calendarExpanded: !store.state.prefs.calendarExpanded });
  if (action === "add-workout-set") {
    store.updateDraft((draft) => {
      const exercise = draft.exercises[store.state.prefs.activeExerciseIndex || 0];
      const previous = exercise.sets.at(-1);
      exercise.sets.push({
        id: crypto.randomUUID(),
        index: exercise.sets.length + 1,
        weight: previous?.weight || "",
        reps: previous?.reps || "",
        done: false
      });
    });
  }
  if (action === "remove-workout-set") {
    store.updateDraft((draft) => {
      const exercise = draft.exercises[store.state.prefs.activeExerciseIndex || 0];
      if (exercise.sets.length <= 1) return;
      exercise.sets = exercise.sets
        .filter((set) => set.id !== actionTarget.dataset.set)
        .map((set, index) => ({ ...set, index: index + 1 }));
    });
  }
}

function scrollDayIntoView(dayId) {
  window.requestAnimationFrame(() => {
    document.querySelector(`[data-day-card="${CSS.escape(dayId)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function allProgramExerciseKeys() {
  return store.state.program.flatMap((day) =>
    day.exercises.map((exercise) => `${day.id}::${exercise[0]}`)
  );
}

function toggleProgramExerciseSelection(key, checked) {
  if (!key) return;
  const selected = new Set(store.state.prefs.selectedProgramExerciseKeys || []);
  if (checked) selected.add(key);
  else selected.delete(key);
  store.setPrefs({ selectedProgramExerciseKeys: [...selected], confirmExerciseDelete: false });
}

function splitPlan(value) {
  const [sets = "", ...rest] = String(value || "").split(/\s+x\s+/i);
  return {
    sets: sets.trim(),
    reps: rest.join(" x ").trim()
  };
}

async function importWorkoutPdf(input) {
  const file = input.files?.[0];
  if (!file) return;
  store.setPrefs({
    pdfImportStatus: {
      type: "loading",
      message: `Reading ${file.name} and looking for workout days, exercises, sets, and reps.`
    }
  });
  try {
    const imported = await parseWorkoutPdf(file);
    await store.importWorkoutProgram(imported);
  } catch (error) {
    store.setPrefs({
      pdfImportStatus: {
        type: "error",
        message: error.message || "This PDF could not be imported. Try a file with selectable text."
      }
    });
  } finally {
    input.value = "";
  }
}
