import { store } from "./core/state.js?v=5";
import { nav } from "./ui/components.js?v=3";
import { analyticsView, editorView, historyView, homeView, libraryView, weeklyView, workoutView } from "./features/views.js?v=11";

const app = document.querySelector("#app");

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
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
}

function render(state) {
  if (!state.ready) {
    app.innerHTML = `<main class="view loading"><div class="pulse"></div><h1>TrainWith Z</h1><p>Hydrating your private training system.</p></main>`;
    return;
  }
  const route = state.prefs.route in views ? state.prefs.route : "home";
  app.innerHTML = `${views[route](state)}${nav(route)}`;
  app.dataset.route = route;
  bindInteractiveControls();
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
  handleManagementAction(actionTarget);
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
});

app.addEventListener("change", (event) => {
  const filter = event.target.closest("[data-filter]");
  if (filter) store.setPrefs({ libraryFilter: filter.dataset.filter });

  const fileInput = event.target.closest('[data-action="add-photo"]');
  if (fileInput?.files?.[0]) store.addPhoto(fileInput.files[0]);

  const titleInput = event.target.closest('[data-action="program-day-title"]');
  if (titleInput) store.updateProgramDay(titleInput.dataset.id, { title: titleInput.value.trim() || "Training Day" });

  const planInput = event.target.closest('[data-action="program-exercise-sets"], [data-action="program-exercise-reps"]');
  if (planInput) {
    const row = planInput.closest(".program-exercise-row");
    const sets = row.querySelector('[data-action="program-exercise-sets"]').value;
    const reps = row.querySelector('[data-action="program-exercise-reps"]').value;
    store.updateProgramExercisePlan(planInput.dataset.day, planInput.dataset.id, sets, reps);
  }
});

app.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-form]");
  if (!form) return;
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form));
  if (form.dataset.form === "exercise") {
    const name = String(values.name || "").trim();
    if (!name) return;
    store.saveExercise({
      id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString(36)}`,
      name,
      muscle: String(values.muscle || "").trim(),
      equipment: String(values.equipment || "Body / Free").trim(),
      prescription: String(values.prescription || "3 x 10").trim(),
      tip: String(values.tip || "").trim(),
      editable: true
    });
    store.setPrefs({ showExerciseForm: false });
  }
  if (form.dataset.form === "inbody") {
    store.addInBody(Object.fromEntries(Object.entries(values).map(([key, value]) => [key, key === "date" ? value : Number(value)])));
    store.setPrefs({ showInBodyForm: false });
  }
});

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
  document.querySelectorAll("[data-route]").forEach((button) => {
    button.onclick = (event) => {
      event.stopPropagation();
      store.setRoute(button.dataset.route);
    };
  });
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.onclick = (event) => {
      event.stopPropagation();
      runAction(button);
    };
  });
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.onclick = (event) => {
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
  handleManagementAction(actionTarget);
}

function handleManagementAction(actionTarget) {
  const action = actionTarget.dataset.action;
  const id = actionTarget.dataset.id;
  if (action === "toggle-exercise-form") store.setPrefs({ showExerciseForm: !store.state.prefs.showExerciseForm });
  if (action === "delete-library-exercise" && window.confirm("Delete this exercise from your Library and program days?")) store.deleteExercise(id);
  if (action === "add-program-day") store.addProgramDay();
  if (action === "delete-program-day" && window.confirm("Delete this workout day?")) store.deleteProgramDay(id);
  if (action === "move-day-up") store.moveProgramDay(id, -1);
  if (action === "move-day-down") store.moveProgramDay(id, 1);
  if (action === "choose-day-exercises") store.setPrefs({ editingDayId: id, route: "library" });
  if (action === "finish-editing-day") store.setPrefs({ editingDayId: null, route: "editor" });
  if (action === "remove-day-exercise") store.removeExerciseFromDay(actionTarget.dataset.day, id);
  if (action === "move-day-exercise-up") store.moveExerciseInDay(actionTarget.dataset.day, id, -1);
  if (action === "move-day-exercise-down") store.moveExerciseInDay(actionTarget.dataset.day, id, 1);
  if (action === "toggle-inbody-form") store.setPrefs({ showInBodyForm: !store.state.prefs.showInBodyForm });
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
  if (action === "delete-history-session" && window.confirm("Delete this logged workout permanently?")) {
    store.deleteSession(id);
  }
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
