import { formatDate, formatNumber, metric, ring, svgIcon, emptyState } from "../ui/components.js?v=5";

export function homeView(state) {
  const { todayWorkout, analytics, insight, cycle, lastSession } = state;
  const afterWorkout = lastSession && sameDay(lastSession.date, new Date());
  const nutrition = todayNutrition(state.nutrition);
  const currentTheme = state.prefs.theme === "dark" ? "dark" : "light";
  return `
    <main class="view home-view reference-home">
      <header class="home-topbar">
        <button class="menu-button" aria-label="Menu"><span></span><span></span><span></span></button>
        <div class="topbar-actions">
          <div class="theme-control">
            <button class="bell-button theme-toggle" data-action="toggle-theme" aria-label="Switch to ${currentTheme === "dark" ? "white" : "dark"} theme" title="Switch theme">${svgIcon("spark")}<i></i></button>
          </div>
          <div class="avatar-dot"><img src="assets/app-design-athlete-crop.png" alt="Athlete profile"></div>
        </div>
      </header>

      <section class="fitness-dashboard">
        <div class="athlete-stage">
          <img src="assets/app-design-athlete-crop.png" alt="Athlete in dark premium fitness dashboard">
        </div>
        <div class="dashboard-title">
          <span>Good ${greeting()},</span>
          <div class="brand-heading">
            ${brandLogo()}
          </div>
        </div>

        ${calendarCard(state.sessions, state.prefs.calendarExpanded)}

        <article class="dash-card workout-card">
          <span>Today's Workout</span>
          <h2>${todayWorkout ? todayWorkout.title : "Recovery Day"}</h2>
          <p>${todayWorkout ? `${todayWorkout.exercises.length} exercises` : "Mobility, hydration, sleep"}</p>
          <button class="primary" data-action="start-workout">${state.draft ? "Resume Workout" : "Start Workout"} <b>&rsaquo;</b></button>
        </article>

        <article class="dash-card summary-card">
          <h2>Today's Summary</h2>
          <div>${svgIcon("spark")}<span>Duration</span><strong>${analytics.duration || 0} min</strong></div>
          <div>${svgIcon("train")}<span>Workouts</span><strong>${analytics.completed}</strong></div>
          <div>${svgIcon("chart")}<span>Volume</span><strong>${formatNumber(analytics.totalVolume)} lb</strong></div>
        </article>

        <article class="dash-card progress-card">
          <div class="card-row"><h2>Weekly Progress</h2><span>This Week</span></div>
          <p>Volume</p>
          <strong>${formatNumber(analytics.totalVolume)} <small>lb</small></strong>
          <em>${trendText(analytics.totalVolume, analytics.previousVolume)}</em>
          <div class="mini-chart">${[18,21,25,29,27,25,26,34,36,47,58,70,91].map((point) => `<i style="height:${point}%"></i>`).join("")}</div>
        </article>

        <article class="dash-card overview-card">
          <div class="card-row"><h2>Progress Overview</h2><span>Volume</span></div>
          <strong>${formatNumber(analytics.totalVolume)} <small>lb</small></strong>
          <em>${analytics.volumeTrend >= 0 ? "+" : ""}${analytics.volumeTrend}% vs last week</em>
          <div class="area-chart">${[34,46,49,54,65,66,74,81,88,86,96,108,116].map((point) => `<i style="height:${point / 1.25}%"></i>`).join("")}</div>
        </article>

        <article class="dash-card muscle-card">
          <h2>Muscle Focus</h2>
          ${["Glutes", "Legs", "Back", "Shoulders", "Arms", "Core"].map((muscle, index) => {
            const value = [88, 80, 92, 75, 65, 60][index];
            return `<div class="muscle-row"><span>${muscle}</span><i><b style="width:${value}%"></b></i><em>${value}%</em></div>`;
          }).join("")}
        </article>

        <article class="dash-card targets-card">
          <h2>Today's Targets</h2>
          <div><span>Workouts</span><strong>${Math.min(analytics.completed, 1)} / 1</strong></div>
          <div class="log-target">
            <span>Protein</span><strong>${nutrition.protein} / ${nutrition.proteinGoal}g</strong>
            <section><button data-action="remove-protein" aria-label="Remove 10 grams protein">−</button><button data-action="log-protein" aria-label="Log 10 grams protein">+10g</button></section>
          </div>
          <div class="log-target">
            <span>Water</span><strong>${nutrition.water.toFixed(1)} / ${nutrition.waterGoal}L</strong>
            <section><button data-action="remove-water" aria-label="Remove 250 milliliters water">−</button><button data-action="log-water" aria-label="Log 250 milliliters water">+250ml</button></section>
          </div>
        </article>

        <article class="dash-card ai-strip">
          <div>${svgIcon("spark")}<span>Local AI</span><strong>${insight}</strong></div>
          <div>${svgIcon("history")}<span>Best PR</span><strong>${analytics.bestPR ? analytics.bestPR.exercise : "Build baseline"}</strong></div>
          <div>${svgIcon("chart")}<span>Score</span><strong>${analytics.score}%</strong></div>
        </article>
      </section>
    </main>`;
}

export function workoutView(state) {
  const draft = state.draft;
  if (!draft) return emptyState("No active workout", "Start today's training from Home and the focus screen will lock in here.", `<button class="primary" data-action="start-workout">${svgIcon("train")} Start</button>`);
  const index = state.prefs.activeExerciseIndex || 0;
  const exercise = draft.exercises[index] || draft.exercises[0];
  const completed = draft.exercises.flatMap((ex) => ex.sets).filter((set) => set.done).length;
  const total = draft.exercises.flatMap((ex) => ex.sets).length;
  return `
    <main class="view workout-view">
      <section class="focus-top">
        <button class="cancel-workout-btn" data-action="request-cancel-workout" aria-label="Cancel workout">&times;</button>
        <div>
          <p class="eyebrow">Focus mode &middot; ${index + 1}/${draft.exercises.length}</p>
          <h1>${exercise.name}</h1>
          <span>${exercise.muscle} &middot; ${exercise.prescription}</span>
        </div>
        <div class="focus-nav">
          <button class="icon-btn" data-action="prev-exercise" aria-label="Previous exercise">&lsaquo;</button>
          <button class="icon-btn" data-action="next-exercise" aria-label="Next exercise">&rsaquo;</button>
        </div>
      </section>

      <section class="exercise-focus-card">
        <div class="progress-line"><i style="width:${Math.round((completed / Math.max(total, 1)) * 100)}%"></i></div>
        ${warmUpItemsFor(draft).length ? `<section class="workout-warmup"><strong>Warm Up</strong>${warmUpItemsFor(draft).map((item) => `<p><b>${escapeHtml(item.name || "Warm Up")}</b>${item.sets || item.reps ? ` <span>${escapeHtml([item.sets, item.reps].filter(Boolean).join(" x "))}</span>` : ""}${item.notes ? `<em>${escapeHtml(item.notes)}</em>` : ""}</p>`).join("")}</section>` : ""}
        <p>${exercise.tip}</p>
        <div class="set-list">
          ${exercise.sets.map((set) => `
            <label class="set-row ${set.done ? "done" : ""}">
              <button data-action="toggle-set" data-set="${set.id}" aria-label="Complete set ${set.index}">${set.done ? svgIcon("check") : set.index}</button>
              <span>Set ${set.index}</span>
              <input inputmode="decimal" data-action="set-weight" data-set="${set.id}" value="${set.weight}" placeholder="Weight" aria-label="Weight for set ${set.index}">
              <input inputmode="numeric" data-action="set-reps" data-set="${set.id}" value="${set.reps}" placeholder="Reps" aria-label="Reps for set ${set.index}">
              <button class="remove-set-btn" data-action="remove-workout-set" data-set="${set.id}" aria-label="Remove set ${set.index}">&times;</button>
            </label>`).join("")}
        </div>
        <button class="add-set-button" data-action="add-workout-set">${svgIcon("plus")} Add set</button>
        <textarea data-action="exercise-notes" placeholder="Quick note for this exercise">${exercise.notes || ""}</textarea>
      </section>

      <section class="workout-tools">
        <button class="glass" data-action="skip-exercise">${svgIcon("skip")} Skip</button>
        <button class="glass" data-action="add-exercise">${svgIcon("plus")} Add</button>
        <button class="glass" data-action="replace-exercise">${svgIcon("swap")} Replace</button>
      </section>

      <section class="finish-bar">
        <div><strong>${completed}/${total}</strong><span>sets complete</span></div>
        <button class="primary" data-action="finish-workout">${svgIcon("check")} Finish</button>
      </section>
      ${state.prefs.cancelPrompt ? `
        <div class="confirm-backdrop" role="presentation">
          <section class="confirm-sheet" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
            <span>End this session?</span>
            <h2 id="cancel-title">Cancel workout</h2>
            <p>Your current sets will be removed and this workout will not appear in History.</p>
            <div>
              <button class="glass" data-action="keep-workout">Keep training</button>
              <button class="danger-button" data-action="confirm-cancel-workout">Cancel workout</button>
            </div>
          </section>
        </div>` : ""}
    </main>`;
}

export function libraryView(state) {
  const filters = ["All", ...new Set(state.exercises.map((e) => e.muscle))];
  const query = state.prefs.search.toLowerCase();
  const filtered = state.exercises.filter((exercise) =>
    (state.prefs.libraryFilter === "All" || exercise.muscle === state.prefs.libraryFilter) &&
    exercise.name.toLowerCase().includes(query)
  );
  return `
    <main class="view">
      <header class="page-head library-head">
        <div class="page-title-with-back"><button class="back-button" data-route="${state.prefs.editingDayId ? "editor" : state.draft ? "workout" : "editor"}" aria-label="Back">&lsaquo;</button><div><p class="eyebrow">Library</p><h1>Exercise system</h1></div></div>
        <button class="primary compact" data-action="toggle-exercise-form">${svgIcon("plus")} New exercise</button>
      </header>
      ${state.prefs.showExerciseForm ? `
        <form class="panel form-grid" data-form="exercise">
          <h2>Add exercise</h2>
          <label>Name<input name="name" required placeholder="Exercise name"></label>
          <label>Sets and reps<input name="prescription" placeholder="3 x 10"></label>
          <label class="full-field">Form tip<textarea name="tip" placeholder="Short technique cue"></textarea></label>
          <div class="form-actions full-field">
            <button type="button" class="glass" data-action="toggle-exercise-form">Cancel</button>
            <button class="primary" type="button" data-action="save-exercise-form">Save exercise</button>
          </div>
        </form>` : ""}
      ${state.prefs.editingDayId ? `<section class="editing-context"><span>Adding to</span><strong>${state.program.find((day) => day.id === state.prefs.editingDayId)?.title || "workout day"}</strong><button data-action="finish-editing-day">Done</button></section>` : ""}
      <div class="search-row"><input data-action="search-library" value="${state.prefs.search}" placeholder="Search exercises" aria-label="Search exercises"></div>
      <div class="chip-scroll">${filters.map((filter) => `<button class="${state.prefs.libraryFilter === filter ? "active" : ""}" data-filter="${filter}">${filter}</button>`).join("")}</div>
      <section class="card-list">${filtered.map((exercise) => `
        <article class="library-card">
          <div><h2>${exercise.name}</h2><p>${exercise.prescription}</p><span>${exercise.tip}</span></div>
          <div class="library-actions">
            ${(state.draft || state.prefs.editingDayId) ? `<button class="icon-btn" data-action="add-library-exercise" data-id="${exercise.id}" aria-label="Add ${exercise.name}">${svgIcon("plus")}</button>` : ""}
            <button class="delete-icon" data-action="delete-library-exercise" data-id="${exercise.id}" aria-label="Delete ${exercise.name}">&times;</button>
          </div>
        </article>`).join("")}</section>
    </main>`;
}

export function analyticsView(state) {
  const { analytics, weeklyInsight, photos } = state;
  const inbody = [...state.inbody].sort((a, b) => new Date(b.date) - new Date(a.date));
  const latest = inbody[0];
  const previous = inbody[1];
  return `
    <main class="view">
      <header class="page-head"><p class="eyebrow">Progress + Review</p><h1>Your training signal</h1></header>
      <section class="panel split-panel review-hero">${ring(analytics.score, "Score")}<div><h2>${analytics.completed} workouts this week</h2><p>${weeklyInsight}</p></div></section>
      <section class="stat-grid">
        ${metric("Strength trend", `${analytics.volumeTrend >= 0 ? "+" : ""}${analytics.volumeTrend}%`, "last sessions")}
        ${metric("Duration trend", `${analytics.durationTrend >= 0 ? "+" : ""}${analytics.durationTrend}%`, "pace")}
        ${metric("Weekly lift", `${formatNumber(analytics.totalVolume)} lb`, trendText(analytics.totalVolume, analytics.previousVolume))}
        ${metric("Best PR", analytics.bestPR ? analytics.bestPR.value : "-", analytics.bestPR ? analytics.bestPR.exercise : "Log more sets")}
      </section>
      <section class="panel"><h2>Muscle focus</h2><div class="bars">${analytics.muscleFocus.length ? analytics.muscleFocus.map(([muscle, count]) => `<div><span>${muscle}</span><i style="width:${Math.min(100, count * 28)}%"></i><em>${count}</em></div>`).join("") : "<p>No weekly muscle data yet.</p>"}</div></section>
      <section class="panel">
        <div class="panel-title"><div><p class="eyebrow">Body composition</p><h2>InBody tracking</h2></div><button class="primary compact" data-action="toggle-inbody-form">${svgIcon("plus")} Add scan</button></div>
        ${state.prefs.showInBodyForm ? inBodyForm() : ""}
        ${latest ? inBodySummary(latest, previous) : `<div class="soft-empty"><p>Add your first InBody scan and optional report image to track weight, muscle, fat, BMI, score, and segmental fat over time.</p></div>`}
      </section>
      <section class="panel">
        <div class="panel-title"><h2>Progress photos</h2><label class="photo-upload">${svgIcon("camera")} Add<input type="file" accept="image/*" data-action="add-photo"></label></div>
        <div class="photo-grid">${photos.length ? photos.slice(-4).map((photo) => `<figure><img src="${URL.createObjectURL(photo.blob)}" alt="Progress photo from ${formatDate(photo.date)}"><figcaption>${formatDate(photo.date)}</figcaption></figure>`).join("") : "<p>Photos stay private on this device.</p>"}</div>
      </section>
    </main>`;
}

export function historyView(state) {
  if (!state.sessions.length) return `
    <main class="view">
      <header class="page-head"><div class="page-title-with-back"><button class="back-button" data-route="editor" aria-label="Back">&lsaquo;</button><div><p class="eyebrow">History</p><h1>Training timeline</h1></div></div></header>
      ${emptyState("No sessions yet", "Your timeline becomes useful as soon as the first workout is completed.", `<button class="primary" data-action="start-workout">${svgIcon("train")} Start workout</button>`)}
    </main>`;
  return `
    <main class="view">
      <header class="page-head"><div class="page-title-with-back"><button class="back-button" data-route="editor" aria-label="Back">&lsaquo;</button><div><p class="eyebrow">History</p><h1>Training timeline</h1></div></div></header>
      <section class="timeline">${[...state.sessions].sort((a, b) => new Date(b.date) - new Date(a.date)).map((session) => {
        const expanded = state.prefs.expandedSessionId === session.id;
        return `
        <article class="session-card ${expanded ? "expanded" : ""}">
          <button class="session-summary" data-action="toggle-session" data-id="${session.id}" aria-expanded="${expanded}">
            <div><span>${formatDate(session.date, { weekday: "short", month: "short", day: "numeric" })}</span><h2>${session.title}</h2><p>${session.focus.join(" &middot; ")}</p></div>
            <div class="session-metrics"><strong>${formatNumber(session.volume)} lb</strong><span>${session.duration} min</span><b>${expanded ? "−" : "+"}</b></div>
          </button>
          ${expanded ? `<div class="session-detail">
            <div class="session-detail-actions"><button class="delete-session-button" data-action="delete-history-session" data-id="${session.id}">Delete workout</button></div>
            ${(session.exercises || []).map((exercise) => `
            <section class="history-exercise">
              <div><h3>${exercise.name}</h3><span>${exercise.muscle}${exercise.skipped ? " · Skipped" : ""}</span></div>
              <div class="history-sets">
                <span>Set</span><span>Weight</span><span>Reps</span><span>Status</span>
                ${(exercise.sets || []).map((set) => `
                  <b>${set.index}</b>
                  <strong>${set.weight || "—"} lb</strong>
                  <strong>${set.reps || "—"}</strong>
                  <em class="${set.done ? "complete" : ""}">${set.done ? "Done" : "Not logged"}</em>`).join("")}
              </div>
              ${exercise.notes ? `<p>${exercise.notes}</p>` : ""}
            </section>`).join("") || "<p>No set details were stored for this older session.</p>"}</div>` : ""}
        </article>`;
      }).join("")}</section>
    </main>`;
}

export function editorView(state) {
  return `
    <main class="view">
      <header class="page-head editor-head">
        <div><p class="eyebrow">Workouts</p><h1>Training hub</h1></div>
        <button class="primary compact" data-action="add-program-day">${svgIcon("plus")} Add Workout</button>
      </header>
      <section class="panel"><h2>Your current program</h2><p>Days run in the order shown. Reorder them anytime, replace exercises, or build a completely new month.</p></section>
      <section class="hub-actions">
        <button class="glass" data-action="toggle-last-schedule">${svgIcon("history")} Last Schedule</button>
        <button class="glass" data-route="history">${svgIcon("history")} Workout History</button>
        <label class="glass pdf-import-button">${svgIcon("plus")} Import PDF<input type="file" accept="application/pdf,.pdf" data-action="import-workout-pdf"></label>
      </section>
      ${state.prefs.lastScheduleOpen ? lastSchedulePanel(state) : ""}
      ${state.prefs.pdfImportStatus ? `
        <section class="pdf-import-status ${state.prefs.pdfImportStatus.type}">
          <div><strong>${state.prefs.pdfImportStatus.type === "error" ? "Import needs review" : state.prefs.pdfImportStatus.type === "loading" ? "Reading PDF" : "Workout imported"}</strong><p>${escapeHtml(state.prefs.pdfImportStatus.message)}</p></div>
          ${state.prefs.pdfImportStatus.type !== "loading" ? `<button data-action="clear-pdf-import" aria-label="Dismiss import message">&times;</button>` : ""}
        </section>` : ""}
      <section class="program-editor-list">${state.program.map((day, index) => `
        <article class="program-editor-card ${state.prefs.expandedProgramDayId === day.id ? "expanded" : "collapsed"}" data-day-card="${day.id}">
          <header>
            <button class="program-day-toggle" data-action="toggle-program-day" data-id="${day.id}" aria-expanded="${state.prefs.expandedProgramDayId === day.id}">
              <span><small>Day ${index + 1}</small><strong>${day.title}</strong><em>${day.exercises.length} exercise${day.exercises.length === 1 ? "" : "s"}</em></span>
              <b>${state.prefs.expandedProgramDayId === day.id ? "&minus;" : "+"}</b>
            </button>
          </header>
          ${state.prefs.expandedProgramDayId === day.id ? `
          <div class="program-day-name"><label>Workout Title<input data-action="program-day-title" data-id="${day.id}" value="${escapeAttribute(day.title)}" aria-label="Workout title"></label></div>
          <section class="warmup-editor">
            <div class="warmup-head">
              <label class="warmup-toggle">
                <input type="checkbox" data-action="program-day-warmup-enabled" data-id="${day.id}" ${warmUpItemsFor(day).length ? "checked" : ""}>
                <span>Warm Up</span>
              </label>
              ${warmUpItemsFor(day).length ? `<button class="glass compact" data-action="add-warmup-exercise" data-id="${day.id}">${svgIcon("plus")} Add</button>` : ""}
            </div>
            ${warmUpItemsFor(day).length ? `<div class="warmup-list">${warmUpItemsFor(day).map((item) => `
              <article class="warmup-row">
                <label>Exercise<input data-action="warmup-name" data-day="${day.id}" data-id="${item.id}" value="${escapeAttribute(item.name)}" placeholder="Warm up exercise"></label>
                <label>Sets & Reps<input inputmode="text" data-action="warmup-plan" data-day="${day.id}" data-id="${item.id}" value="${escapeAttribute(formatPlan(item.sets, item.reps))}" placeholder="2 x 10, 12"></label>
                ${item.notes || state.prefs.openWarmUpNoteId === item.id ? `<label class="warmup-notes">NOTE<textarea data-action="warmup-notes" data-day="${day.id}" data-id="${item.id}" placeholder="Optional note">${escapeHtml(item.notes)}</textarea></label><button class="note-link" data-action="remove-warmup-notes" data-day="${day.id}" data-id="${item.id}">Remove NOTE</button>` : `<button class="note-link warmup-add-notes" data-action="show-warmup-notes" data-id="${item.id}">NOTE</button>`}
              </article>`).join("")}</div>` : ""}
          </section>
          <div class="program-exercises">${day.exercises.length ? day.exercises.map((exercise, exerciseIndex) => {
            const plan = parsePrescription(exercise.prescription || exercise[3]);
            const id = exercise.id || exercise[0];
            const notes = exercise.tip || exercise[4] || "";
            return `
            <div class="program-exercise-row">
              <label class="program-exercise-name">Exercise<input data-action="program-exercise-name" data-day="${day.id}" data-id="${id}" value="${escapeAttribute(exercise.name || exercise[1] || "")}" placeholder="Exercise name"></label>
              <label class="plan-field">Sets & Reps<input inputmode="text" value="${escapeAttribute(formatPlan(plan.sets, plan.reps))}" data-action="program-exercise-plan" data-day="${day.id}" data-id="${id}" aria-label="Sets and reps" placeholder="3 x 10"></label>
              ${notes || state.prefs.openExerciseNoteId === id ? `<label class="exercise-notes-field">NOTE<textarea data-action="program-exercise-notes" data-day="${day.id}" data-id="${id}" placeholder="Optional note">${escapeHtml(notes)}</textarea></label><button class="note-link" data-action="remove-program-exercise-notes" data-day="${day.id}" data-id="${id}">Remove NOTE</button>` : `<button class="note-link add-exercise-notes" data-action="show-program-exercise-notes" data-id="${id}">NOTE</button>`}
            </div>`;
          }).join("") : "<p>No exercises yet. Import a PDF or add exercises later.</p>"}</div>
          <footer class="workout-editor-actions">
            <button class="tool-icon-button" data-action="add-blank-exercise" data-id="${day.id}" aria-label="Add exercise" title="Add exercise">${svgIcon("dumbbell")}</button>
            <button class="tool-icon-button finish-workout-plan" data-action="start-program" data-id="${day.id}" ${day.exercises.length ? "" : "disabled"} aria-label="Finish workout setup" title="Finish workout setup"><span aria-hidden="true">&#9889;&#65039;</span></button>
          </footer>` : ""}
        </article>`).join("") || `<section class="soft-empty"><h2>No workout days</h2><p>Add your first day, then choose exercises from the Library.</p></section>`}</section>
    </main>`;
}

function lastSchedulePanel(state) {
  const schedule = state.lastSchedules?.[0];
  if (!schedule) {
    return `<section class="last-schedule-panel soft-empty"><h2>Last Schedule</h2><p>No previous schedule saved yet. When you import a new PDF, the current schedule will move here automatically.</p></section>`;
  }
  return `
    <section class="last-schedule-panel">
      <header>
        <div><p class="eyebrow">Last Schedule</p><h2>${escapeHtml(schedule.title)}</h2></div>
        <span>${formatDate(schedule.startedAt, { month: "short", day: "numeric", year: "numeric" })} - ${formatDate(schedule.stoppedAt, { month: "short", day: "numeric", year: "numeric" })}</span>
      </header>
      <div class="last-schedule-days">
        ${(schedule.days || []).map((day, index) => `
          <article>
            <small>Day ${index + 1}</small>
            <strong>${escapeHtml(day.title)}</strong>
            ${warmUpItemsFor(day).length ? `<p><b>Warm Up:</b> ${warmUpItemsFor(day).map((item) => escapeHtml(item.name || item.notes || "Warm Up")).join(", ")}</p>` : ""}
            <ul>${(day.exercises || []).map((exercise) => `<li>${escapeHtml(exercise.name || exercise[1])}<span>${escapeHtml(exercise.prescription || exercise[3] || "")}</span></li>`).join("")}</ul>
          </article>`).join("")}
      </div>
    </section>`;
}

export function weeklyView(state) {
  const { analytics, weeklyInsight, photos } = state;
  return `
    <main class="view weekly-view">
      <header class="page-head cinematic"><p class="eyebrow">Weekly review</p><h1>Your training signal</h1></header>
      <section class="panel split-panel review-hero">${ring(analytics.score, "Score")}<div><h2>${analytics.completed} workouts completed</h2><p>${weeklyInsight}</p></div></section>
      <section class="stat-grid">
        ${metric("Total lifted", `${formatNumber(analytics.totalVolume)} lb`, "this week")}
        ${metric("Best PR", analytics.bestPR ? analytics.bestPR.value : "-", analytics.bestPR ? analytics.bestPR.exercise : "No PR yet")}
        ${metric("Duration", `${analytics.duration} min`, "training time")}
        ${metric("Top focus", analytics.muscleFocus[0]?.[0] || "-", "muscle")}
      </section>
      <section class="panel">
        <div class="panel-title"><h2>Progress photos</h2><label class="photo-upload">${svgIcon("camera")} Add<input type="file" accept="image/*" data-action="add-photo"></label></div>
        <div class="photo-grid">${photos.length ? photos.slice(-4).map((photo) => `<figure><img src="${URL.createObjectURL(photo.blob)}" alt="Progress photo from ${formatDate(photo.date)}"><figcaption>${formatDate(photo.date)}</figcaption></figure>`).join("") : "<p>Photos stay local in IndexedDB. Add one when you want a visual checkpoint.</p>"}</div>
      </section>
    </main>`;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

function brandLogo() {
  return `
    <div class="brand-logo" role="img" aria-label="TrainWith Z">
      <svg viewBox="0 0 560 150" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="brandZ" x1="40" y1="32" x2="132" y2="118" gradientUnits="userSpaceOnUse">
            <stop stop-color="#7CC8FF"/>
            <stop offset=".52" stop-color="#147BFF"/>
            <stop offset="1" stop-color="#7CC8FF"/>
          </linearGradient>
          <linearGradient id="brandPulse" x1="10" y1="78" x2="162" y2="78" gradientUnits="userSpaceOnUse">
            <stop stop-color="#147BFF" stop-opacity="0"/>
            <stop offset=".22" stop-color="#7CC8FF"/>
            <stop offset=".5" stop-color="#E6F2FF"/>
            <stop offset=".78" stop-color="#7CC8FF"/>
            <stop offset="1" stop-color="#147BFF" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <g transform="translate(4 7)">
          <path d="M27 31a67 67 0 0 1 98-4" fill="none" stroke="#147BFF" stroke-width="4.5" stroke-linecap="round" opacity=".82"/>
          <path d="M130 44a67 67 0 0 1-102 82" fill="none" stroke="#147BFF" stroke-width="4.5" stroke-linecap="round" opacity=".48"/>
          <circle cx="134" cy="33" r="5.5" fill="#7CC8FF"/>
          <circle cx="22" cy="120" r="5.5" fill="#7CC8FF"/>
          <path d="M42 42h76L83 75h42l-29 25H59l35-34H33l9-24Z" fill="url(#brandZ)"/>
          <path d="M45 125h71l10-25H53l-18 25h10Z" fill="url(#brandZ)"/>
          <path d="M10 82h42l8-15 11 45 11-61 12 46 8-15h50" fill="none" stroke="url(#brandPulse)" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
        <text class="brand-word" x="165" y="96" font-size="56" font-family="Inter, Segoe UI, Arial, sans-serif" font-weight="760">TrainWith</text>
        <text class="brand-word" x="428" y="96" font-size="60" font-family="Inter, Segoe UI, Arial, sans-serif" font-weight="790">Z</text>
      </svg>
    </div>`;
}

function sameDay(a, b) {
  const first = new Date(a);
  const second = new Date(b);
  return first.toDateString() === second.toDateString();
}

function trendText(now, before) {
  if (!before) return "baseline";
  const delta = now - before;
  return `${delta >= 0 ? "+" : ""}${formatNumber(delta)} vs last`;
}

function calendarCard(sessions, expanded) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (firstDay.getDay() + 6) % 7;
  const monthName = new Intl.DateTimeFormat("en", { month: "long" }).format(now);
  const sessionsByDay = new Map();
  sessions
    .filter((session) => {
      const date = new Date(session.date);
      return date.getFullYear() === year && date.getMonth() === month;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach((session) => {
      sessionsByDay.set(new Date(session.date).getDate(), session);
    });
  const cells = [
    ...Array.from({ length: leading }, () => `<i></i>`),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const classes = [
        day === now.getDate() ? "today" : "",
        sessionsByDay.has(day) ? "trained" : ""
      ].filter(Boolean).join(" ");
      const session = sessionsByDay.get(day);
      return session
        ? `<button class="${classes}" data-action="open-calendar-session" data-id="${session.id}" aria-label="Open completed workout from ${monthName} ${day}"><span>${day}</span><em>Done</em></button>`
        : `<b class="${classes}">${day}</b>`;
    })
  ];
  return `
    <article class="dash-card calendar-card ${expanded ? "expanded" : "collapsed"}">
      <div><span>Training calendar</span><strong>${monthName}</strong><button data-action="toggle-calendar" aria-label="${expanded ? "Collapse" : "Expand"} calendar">${expanded ? "&minus;" : "+"}</button></div>
      ${expanded ? `
        <section class="calendar-grid">
          ${["M", "T", "W", "T", "F", "S", "S"].map((day) => `<em>${day}</em>`).join("")}
          ${cells.join("")}
        </section>` : ""}
    </article>`;
}

function parsePrescription(value = "") {
  const [sets = "3", reps = "10"] = String(value).split(/\s+x\s+/i);
  return {
    sets: sets.trim() || "3",
    reps: reps.trim() || "10"
  };
}

function formatPlan(sets = "", reps = "") {
  return [sets, reps].filter(Boolean).join(" x ");
}

function warmUpItemsFor(day) {
  if (Array.isArray(day?.warmUpItems)) return day.warmUpItems;
  if (day?.warmUp) return [{ id: "legacy-warmup", name: "Warm Up", sets: "", reps: "", notes: day.warmUp }];
  return [];
}

function todayNutrition(entries) {
  const now = new Date();
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return entries.find((entry) => entry.date === key) || {
    water: 0,
    protein: 0,
    waterGoal: 3,
    proteinGoal: 150
  };
}

function inBodyForm() {
  const today = new Date();
  const dateValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return `
    <form class="inbody-form" data-form="inbody">
      <label><span>Scan date</span><div><input name="date" type="date" value="${dateValue}" required></div></label>
      <label class="full-field inbody-image-field">
        <span>InBody report image</span>
        <div class="image-input-shell">
          ${svgIcon("camera")}
          <strong>Add report photo</strong>
          <small>Private on this device. Analysis uses the numbers below.</small>
          <input name="reportImage" type="file" accept="image/*">
        </div>
      </label>
      ${[
        ["weight", "Weight", "kg"],
        ["muscle", "Skeletal muscle", "kg"],
        ["fat", "Body fat", "%"],
        ["bmi", "BMI", ""],
        ["score", "InBody score", "/100"],
        ["visceralFat", "Visceral fat level", ""],
        ["rightArmFat", "Right arm fat", "%"],
        ["leftArmFat", "Left arm fat", "%"],
        ["trunkFat", "Trunk fat", "%"],
        ["rightLegFat", "Right leg fat", "%"],
        ["leftLegFat", "Left leg fat", "%"]
      ].map(([name, label, unit]) => `
        <label><span>${label}</span><div><input name="${name}" type="number" step="0.1" inputmode="decimal" required><em>${unit}</em></div></label>`).join("")}
      <div class="form-actions full-field">
        <button type="button" class="glass" data-action="toggle-inbody-form">Cancel</button>
        <button class="primary" type="button" data-action="save-inbody-form">Save scan</button>
      </div>
    </form>`;
}

function inBodySummary(latest, previous) {
  const metrics = [
    ["Weight", "weight", "kg", false],
    ["Muscle", "muscle", "kg", true],
    ["Body fat", "fat", "%", false],
    ["BMI", "bmi", "", false],
    ["InBody score", "score", "", true],
    ["Visceral fat", "visceralFat", "", false]
  ];
  const segmental = [
    ["Right arm", "rightArmFat"],
    ["Left arm", "leftArmFat"],
    ["Trunk", "trunkFat"],
    ["Right leg", "rightLegFat"],
    ["Left leg", "leftLegFat"]
  ];
  return `
    <div class="inbody-summary">
      <header><span>Latest scan</span><strong>${formatDate(latest.date, { month: "short", day: "numeric", year: "numeric" })}</strong></header>
      ${latest.reportImage ? `<figure class="inbody-report"><img src="${URL.createObjectURL(latest.reportImage)}" alt="InBody report from ${formatDate(latest.date)}"><figcaption>Saved report image</figcaption></figure>` : ""}
      <div class="inbody-metrics">${metrics.map(([label, key, unit, higherIsBetter]) => {
        const delta = previous ? Number(latest[key]) - Number(previous[key]) : null;
        return `<article><span>${label}</span><strong>${latest[key]}${unit}</strong>${delta === null ? `<em>Baseline</em>` : `<em class="${metricTrend(delta, higherIsBetter)}">${signed(delta)}${unit}</em>`}</article>`;
      }).join("")}</div>
      <section class="inbody-analysis"><h3>Local analysis</h3><p>${inBodyAnalysis(latest, previous)}</p></section>
      <section class="segmental-fat"><h3>Segmental fat</h3>${segmental.map(([label, key]) => {
        const delta = previous ? Number(latest[key]) - Number(previous[key]) : null;
        return `<div><span>${label}</span><strong>${latest[key]}%</strong><em class="${delta === null ? "" : metricTrend(delta, false)}">${delta === null ? "Baseline" : `${signed(delta)}%`}</em></div>`;
      }).join("")}</section>
    </div>`;
}

function inBodyAnalysis(latest, previous) {
  if (!previous) return "This is your baseline scan. Add another InBody result later to unlock trend analysis.";
  const weight = Number(latest.weight) - Number(previous.weight);
  const muscle = Number(latest.muscle) - Number(previous.muscle);
  const fat = Number(latest.fat) - Number(previous.fat);
  const score = Number(latest.score) - Number(previous.score);
  const parts = [
    `weight ${weight === 0 ? "held steady" : `${weight > 0 ? "increased" : "decreased"} by ${Math.abs(weight).toFixed(1)} kg`}`,
    `muscle ${muscle === 0 ? "held steady" : `${muscle > 0 ? "increased" : "decreased"} by ${Math.abs(muscle).toFixed(1)} kg`}`,
    `body fat ${fat === 0 ? "held steady" : `${fat > 0 ? "increased" : "decreased"} by ${Math.abs(fat).toFixed(1)}%`}`,
    `score ${score === 0 ? "held steady" : `${score > 0 ? "improved" : "decreased"} by ${Math.abs(score).toFixed(1)} points`}`
  ];
  return `Since your previous scan, ${parts.join(", ")}. This is descriptive tracking, not a medical interpretation.`;
}

function metricTrend(delta, higherIsBetter) {
  if (!delta) return "neutral";
  return (delta > 0) === higherIsBetter ? "positive" : "negative";
}

function signed(value) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}`;
}

function escapeAttribute(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
import { formatDate, formatNumber, metric, ring, svgIcon, emptyState } from "../ui/components.js";

export function homeView(state) {
  const { todayWorkout, analytics, insight, cycle, lastSession } = state;
  const afterWorkout = lastSession && sameDay(lastSession.date, new Date());
  const nutrition = todayNutrition(state.nutrition);
  const currentTheme = state.prefs.theme === "dark" ? "dark" : "light";
  return `
    <main class="view home-view reference-home">
      <header class="home-topbar">
        <button class="menu-button" aria-label="Menu"><span></span><span></span><span></span></button>
        <div class="topbar-actions">
          <div class="theme-control">
            <button class="bell-button theme-toggle" data-action="toggle-theme" aria-label="Switch to ${currentTheme === "dark" ? "white" : "dark"} theme" title="Switch theme">${svgIcon("spark")}<i></i></button>
          </div>
          <div class="avatar-dot"><img src="assets/app-design-athlete-crop.png" alt="Athlete profile"></div>
        </div>
      </header>

      <section class="fitness-dashboard">
        <div class="athlete-stage">
          <img src="assets/app-design-athlete-crop.png" alt="Athlete in dark premium fitness dashboard">
        </div>
        <div class="dashboard-title">
          <span>Good ${greeting()},</span>
          <div class="brand-heading">
            ${brandLogo()}
          </div>
        </div>

        ${calendarCard(state.sessions, state.prefs.calendarExpanded)}

        <article class="dash-card workout-card">
          <span>Today's Workout</span>
          <h2>${todayWorkout ? todayWorkout.title : "Recovery Day"}</h2>
          <p>${todayWorkout ? `${todayWorkout.exercises.length} exercises` : "Mobility, hydration, sleep"}</p>
          <button class="primary" data-action="start-workout">${state.draft ? "Resume Workout" : "Start Workout"} <b>&rsaquo;</b></button>
        </article>

        <article class="dash-card summary-card">
          <h2>Today's Summary</h2>
          <div>${svgIcon("spark")}<span>Duration</span><strong>${analytics.duration || 0} min</strong></div>
          <div>${svgIcon("train")}<span>Workouts</span><strong>${analytics.completed}</strong></div>
          <div>${svgIcon("chart")}<span>Volume</span><strong>${formatNumber(analytics.totalVolume)} lb</strong></div>
        </article>

        <article class="dash-card progress-card">
          <div class="card-row"><h2>Weekly Progress</h2><span>This Week</span></div>
          <p>Volume</p>
          <strong>${formatNumber(analytics.totalVolume)} <small>lb</small></strong>
          <em>${trendText(analytics.totalVolume, analytics.previousVolume)}</em>
          <div class="mini-chart">${[18,21,25,29,27,25,26,34,36,47,58,70,91].map((point) => `<i style="height:${point}%"></i>`).join("")}</div>
        </article>

        <article class="dash-card overview-card">
          <div class="card-row"><h2>Progress Overview</h2><span>Volume</span></div>
          <strong>${formatNumber(analytics.totalVolume)} <small>lb</small></strong>
          <em>${analytics.volumeTrend >= 0 ? "+" : ""}${analytics.volumeTrend}% vs last week</em>
          <div class="area-chart">${[34,46,49,54,65,66,74,81,88,86,96,108,116].map((point) => `<i style="height:${point / 1.25}%"></i>`).join("")}</div>
        </article>

        <article class="dash-card muscle-card">
          <h2>Muscle Focus</h2>
          ${["Glutes", "Legs", "Back", "Shoulders", "Arms", "Core"].map((muscle, index) => {
            const value = [88, 80, 92, 75, 65, 60][index];
            return `<div class="muscle-row"><span>${muscle}</span><i><b style="width:${value}%"></b></i><em>${value}%</em></div>`;
          }).join("")}
        </article>

        <article class="dash-card targets-card">
          <h2>Today's Targets</h2>
          <div><span>Workouts</span><strong>${Math.min(analytics.completed, 1)} / 1</strong></div>
          <div class="log-target">
            <span>Protein</span><strong>${nutrition.protein} / ${nutrition.proteinGoal}g</strong>
            <section><button data-action="remove-protein" aria-label="Remove 10 grams protein">−</button><button data-action="log-protein" aria-label="Log 10 grams protein">+10g</button></section>
          </div>
          <div class="log-target">
            <span>Water</span><strong>${nutrition.water.toFixed(1)} / ${nutrition.waterGoal}L</strong>
            <section><button data-action="remove-water" aria-label="Remove 250 milliliters water">−</button><button data-action="log-water" aria-label="Log 250 milliliters water">+250ml</button></section>
          </div>
        </article>

        <article class="dash-card ai-strip">
          <div>${svgIcon("spark")}<span>Local AI</span><strong>${insight}</strong></div>
          <div>${svgIcon("history")}<span>Best PR</span><strong>${analytics.bestPR ? analytics.bestPR.exercise : "Build baseline"}</strong></div>
          <div>${svgIcon("chart")}<span>Score</span><strong>${analytics.score}%</strong></div>
        </article>
      </section>
    </main>`;
}

export function workoutView(state) {
  const draft = state.draft;
  if (!draft) return emptyState("No active workout", "Start today's training from Home and the focus screen will lock in here.", `<button class="primary" data-action="start-workout">${svgIcon("train")} Start</button>`);
  const index = state.prefs.activeExerciseIndex || 0;
  const exercise = draft.exercises[index] || draft.exercises[0];
  const completed = draft.exercises.flatMap((ex) => ex.sets).filter((set) => set.done).length;
  const total = draft.exercises.flatMap((ex) => ex.sets).length;
  return `
    <main class="view workout-view">
      <section class="focus-top">
        <button class="cancel-workout-btn" data-action="request-cancel-workout" aria-label="Cancel workout">&times;</button>
        <div>
          <p class="eyebrow">Focus mode &middot; ${index + 1}/${draft.exercises.length}</p>
          <h1>${exercise.name}</h1>
          <span>${exercise.muscle} &middot; ${exercise.prescription}</span>
        </div>
        <div class="focus-nav">
          <button class="icon-btn" data-action="prev-exercise" aria-label="Previous exercise">&lsaquo;</button>
          <button class="icon-btn" data-action="next-exercise" aria-label="Next exercise">&rsaquo;</button>
        </div>
      </section>

      <section class="exercise-focus-card">
        <div class="progress-line"><i style="width:${Math.round((completed / Math.max(total, 1)) * 100)}%"></i></div>
        ${warmUpItemsFor(draft).length ? `<section class="workout-warmup"><strong>Warm Up</strong>${warmUpItemsFor(draft).map((item) => `<p><b>${escapeHtml(item.name || "Warm Up")}</b>${item.sets || item.reps ? ` <span>${escapeHtml([item.sets, item.reps].filter(Boolean).join(" x "))}</span>` : ""}${item.notes ? `<em>${escapeHtml(item.notes)}</em>` : ""}</p>`).join("")}</section>` : ""}
        <p>${exercise.tip}</p>
        <div class="set-list">
          ${exercise.sets.map((set) => `
            <label class="set-row ${set.done ? "done" : ""}">
              <button data-action="toggle-set" data-set="${set.id}" aria-label="Complete set ${set.index}">${set.done ? svgIcon("check") : set.index}</button>
              <span>Set ${set.index}</span>
              <input inputmode="decimal" data-action="set-weight" data-set="${set.id}" value="${set.weight}" placeholder="Weight" aria-label="Weight for set ${set.index}">
              <input inputmode="numeric" data-action="set-reps" data-set="${set.id}" value="${set.reps}" placeholder="Reps" aria-label="Reps for set ${set.index}">
              <button class="remove-set-btn" data-action="remove-workout-set" data-set="${set.id}" aria-label="Remove set ${set.index}">&times;</button>
            </label>`).join("")}
        </div>
        <button class="add-set-button" data-action="add-workout-set">${svgIcon("plus")} Add set</button>
        <textarea data-action="exercise-notes" placeholder="Quick note for this exercise">${exercise.notes || ""}</textarea>
      </section>

      <section class="workout-tools">
        <button class="glass" data-action="skip-exercise">${svgIcon("skip")} Skip</button>
        <button class="glass" data-action="add-exercise">${svgIcon("plus")} Add</button>
        <button class="glass" data-action="replace-exercise">${svgIcon("swap")} Replace</button>
      </section>

      <section class="finish-bar">
        <div><strong>${completed}/${total}</strong><span>sets complete</span></div>
        <button class="primary" data-action="finish-workout">${svgIcon("check")} Finish</button>
      </section>
      ${state.prefs.cancelPrompt ? `
        <div class="confirm-backdrop" role="presentation">
          <section class="confirm-sheet" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
            <span>End this session?</span>
            <h2 id="cancel-title">Cancel workout</h2>
            <p>Your current sets will be removed and this workout will not appear in History.</p>
            <div>
              <button class="glass" data-action="keep-workout">Keep training</button>
              <button class="danger-button" data-action="confirm-cancel-workout">Cancel workout</button>
            </div>
          </section>
        </div>` : ""}
    </main>`;
}

export function libraryView(state) {
  const filters = ["All", ...new Set(state.exercises.map((e) => e.muscle))];
  const query = state.prefs.search.toLowerCase();
  const filtered = state.exercises.filter((exercise) =>
    (state.prefs.libraryFilter === "All" || exercise.muscle === state.prefs.libraryFilter) &&
    exercise.name.toLowerCase().includes(query)
  );
  return `
    <main class="view">
      <header class="page-head library-head">
        <div class="page-title-with-back"><button class="back-button" data-route="${state.prefs.editingDayId ? "editor" : state.draft ? "workout" : "editor"}" aria-label="Back">&lsaquo;</button><div><p class="eyebrow">Library</p><h1>Exercise system</h1></div></div>
        <button class="primary compact" data-action="toggle-exercise-form">${svgIcon("plus")} New exercise</button>
      </header>
      ${state.prefs.showExerciseForm ? `
        <form class="panel form-grid" data-form="exercise">
          <h2>Add exercise</h2>
          <label>Name<input name="name" required placeholder="Exercise name"></label>
          <label>Sets and reps<input name="prescription" placeholder="3 x 10"></label>
          <label class="full-field">Form tip<textarea name="tip" placeholder="Short technique cue"></textarea></label>
          <div class="form-actions full-field">
            <button type="button" class="glass" data-action="toggle-exercise-form">Cancel</button>
            <button class="primary" type="button" data-action="save-exercise-form">Save exercise</button>
          </div>
        </form>` : ""}
      ${state.prefs.editingDayId ? `<section class="editing-context"><span>Adding to</span><strong>${state.program.find((day) => day.id === state.prefs.editingDayId)?.title || "workout day"}</strong><button data-action="finish-editing-day">Done</button></section>` : ""}
      <div class="search-row"><input data-action="search-library" value="${state.prefs.search}" placeholder="Search exercises" aria-label="Search exercises"></div>
      <div class="chip-scroll">${filters.map((filter) => `<button class="${state.prefs.libraryFilter === filter ? "active" : ""}" data-filter="${filter}">${filter}</button>`).join("")}</div>
      <section class="card-list">${filtered.map((exercise) => `
        <article class="library-card">
          <div><h2>${exercise.name}</h2><p>${exercise.prescription}</p><span>${exercise.tip}</span></div>
          <div class="library-actions">
            ${(state.draft || state.prefs.editingDayId) ? `<button class="icon-btn" data-action="add-library-exercise" data-id="${exercise.id}" aria-label="Add ${exercise.name}">${svgIcon("plus")}</button>` : ""}
            <button class="delete-icon" data-action="delete-library-exercise" data-id="${exercise.id}" aria-label="Delete ${exercise.name}">&times;</button>
          </div>
        </article>`).join("")}</section>
    </main>`;
}

export function analyticsView(state) {
  const { analytics, weeklyInsight, photos } = state;
  const inbody = [...state.inbody].sort((a, b) => new Date(b.date) - new Date(a.date));
  const latest = inbody[0];
  const previous = inbody[1];
  return `
    <main class="view">
      <header class="page-head"><p class="eyebrow">Progress + Review</p><h1>Your training signal</h1></header>
      <section class="panel split-panel review-hero">${ring(analytics.score, "Score")}<div><h2>${analytics.completed} workouts this week</h2><p>${weeklyInsight}</p></div></section>
      <section class="stat-grid">
        ${metric("Strength trend", `${analytics.volumeTrend >= 0 ? "+" : ""}${analytics.volumeTrend}%`, "last sessions")}
        ${metric("Duration trend", `${analytics.durationTrend >= 0 ? "+" : ""}${analytics.durationTrend}%`, "pace")}
        ${metric("Weekly lift", `${formatNumber(analytics.totalVolume)} lb`, trendText(analytics.totalVolume, analytics.previousVolume))}
        ${metric("Best PR", analytics.bestPR ? analytics.bestPR.value : "-", analytics.bestPR ? analytics.bestPR.exercise : "Log more sets")}
      </section>
      <section class="panel"><h2>Muscle focus</h2><div class="bars">${analytics.muscleFocus.length ? analytics.muscleFocus.map(([muscle, count]) => `<div><span>${muscle}</span><i style="width:${Math.min(100, count * 28)}%"></i><em>${count}</em></div>`).join("") : "<p>No weekly muscle data yet.</p>"}</div></section>
      <section class="panel">
        <div class="panel-title"><div><p class="eyebrow">Body composition</p><h2>InBody tracking</h2></div><button class="primary compact" data-action="toggle-inbody-form">${svgIcon("plus")} Add scan</button></div>
        ${state.prefs.showInBodyForm ? inBodyForm() : ""}
        ${latest ? inBodySummary(latest, previous) : `<div class="soft-empty"><p>Add your first InBody scan and optional report image to track weight, muscle, fat, BMI, score, and segmental fat over time.</p></div>`}
      </section>
      <section class="panel">
        <div class="panel-title"><h2>Progress photos</h2><label class="photo-upload">${svgIcon("camera")} Add<input type="file" accept="image/*" data-action="add-photo"></label></div>
        <div class="photo-grid">${photos.length ? photos.slice(-4).map((photo) => `<figure><img src="${URL.createObjectURL(photo.blob)}" alt="Progress photo from ${formatDate(photo.date)}"><figcaption>${formatDate(photo.date)}</figcaption></figure>`).join("") : "<p>Photos stay private on this device.</p>"}</div>
      </section>
    </main>`;
}

export function historyView(state) {
  if (!state.sessions.length) return `
    <main class="view">
      <header class="page-head"><div class="page-title-with-back"><button class="back-button" data-route="editor" aria-label="Back">&lsaquo;</button><div><p class="eyebrow">History</p><h1>Training timeline</h1></div></div></header>
      ${emptyState("No sessions yet", "Your timeline becomes useful as soon as the first workout is completed.", `<button class="primary" data-action="start-workout">${svgIcon("train")} Start workout</button>`)}
    </main>`;
  return `
    <main class="view">
      <header class="page-head"><div class="page-title-with-back"><button class="back-button" data-route="editor" aria-label="Back">&lsaquo;</button><div><p class="eyebrow">History</p><h1>Training timeline</h1></div></div></header>
      <section class="timeline">${[...state.sessions].sort((a, b) => new Date(b.date) - new Date(a.date)).map((session) => {
        const expanded = state.prefs.expandedSessionId === session.id;
        return `
        <article class="session-card ${expanded ? "expanded" : ""}">
          <button class="session-summary" data-action="toggle-session" data-id="${session.id}" aria-expanded="${expanded}">
            <div><span>${formatDate(session.date, { weekday: "short", month: "short", day: "numeric" })}</span><h2>${session.title}</h2><p>${session.focus.join(" &middot; ")}</p></div>
            <div class="session-metrics"><strong>${formatNumber(session.volume)} lb</strong><span>${session.duration} min</span><b>${expanded ? "−" : "+"}</b></div>
          </button>
          ${expanded ? `<div class="session-detail">
            <div class="session-detail-actions"><button class="delete-session-button" data-action="delete-history-session" data-id="${session.id}">Delete workout</button></div>
            ${(session.exercises || []).map((exercise) => `
            <section class="history-exercise">
              <div><h3>${exercise.name}</h3><span>${exercise.muscle}${exercise.skipped ? " · Skipped" : ""}</span></div>
              <div class="history-sets">
                <span>Set</span><span>Weight</span><span>Reps</span><span>Status</span>
                ${(exercise.sets || []).map((set) => `
                  <b>${set.index}</b>
                  <strong>${set.weight || "—"} lb</strong>
                  <strong>${set.reps || "—"}</strong>
                  <em class="${set.done ? "complete" : ""}">${set.done ? "Done" : "Not logged"}</em>`).join("")}
              </div>
              ${exercise.notes ? `<p>${exercise.notes}</p>` : ""}
            </section>`).join("") || "<p>No set details were stored for this older session.</p>"}</div>` : ""}
        </article>`;
      }).join("")}</section>
    </main>`;
}

export function editorView(state) {
  return `
    <main class="view">
      <header class="page-head editor-head">
        <div><p class="eyebrow">Workouts</p><h1>Training hub</h1></div>
        <button class="primary compact" data-action="add-program-day">${svgIcon("plus")} Add Workout</button>
      </header>
      <section class="panel"><h2>Your current program</h2><p>Days run in the order shown. Reorder them anytime, replace exercises, or build a completely new month.</p></section>
      <section class="hub-actions">
        <button class="glass" data-action="toggle-last-schedule">${svgIcon("history")} Last Schedule</button>
        <button class="glass" data-route="history">${svgIcon("history")} Workout History</button>
        <label class="glass pdf-import-button">${svgIcon("plus")} Import PDF<input type="file" accept="application/pdf,.pdf" data-action="import-workout-pdf"></label>
      </section>
      ${state.prefs.lastScheduleOpen ? lastSchedulePanel(state) : ""}
      ${state.prefs.pdfImportStatus ? `
        <section class="pdf-import-status ${state.prefs.pdfImportStatus.type}">
          <div><strong>${state.prefs.pdfImportStatus.type === "error" ? "Import needs review" : state.prefs.pdfImportStatus.type === "loading" ? "Reading PDF" : "Workout imported"}</strong><p>${escapeHtml(state.prefs.pdfImportStatus.message)}</p></div>
          ${state.prefs.pdfImportStatus.type !== "loading" ? `<button data-action="clear-pdf-import" aria-label="Dismiss import message">&times;</button>` : ""}
        </section>` : ""}
      <section class="program-editor-list">${state.program.map((day, index) => `
        <article class="program-editor-card ${state.prefs.expandedProgramDayId === day.id ? "expanded" : "collapsed"}" data-day-card="${day.id}">
          <header>
            <button class="program-day-toggle" data-action="toggle-program-day" data-id="${day.id}" aria-expanded="${state.prefs.expandedProgramDayId === day.id}">
              <span><small>Day ${index + 1}</small><strong>${day.title}</strong><em>${day.exercises.length} exercise${day.exercises.length === 1 ? "" : "s"}</em></span>
              <b>${state.prefs.expandedProgramDayId === day.id ? "&minus;" : "+"}</b>
            </button>
          </header>
          ${state.prefs.expandedProgramDayId === day.id ? `
          <div class="program-day-name"><label>Workout Title<input data-action="program-day-title" data-id="${day.id}" value="${escapeAttribute(day.title)}" aria-label="Workout title"></label></div>
          <section class="warmup-editor">
            <div class="warmup-head">
              <label class="warmup-toggle">
                <input type="checkbox" data-action="program-day-warmup-enabled" data-id="${day.id}" ${warmUpItemsFor(day).length ? "checked" : ""}>
                <span>Warm Up</span>
              </label>
              ${warmUpItemsFor(day).length ? `<button class="glass compact" data-action="add-warmup-exercise" data-id="${day.id}">${svgIcon("plus")} Add</button>` : ""}
            </div>
            ${warmUpItemsFor(day).length ? `<div class="warmup-list">${warmUpItemsFor(day).map((item) => `
              <article class="warmup-row">
                <label>Exercise<input data-action="warmup-name" data-day="${day.id}" data-id="${item.id}" value="${escapeAttribute(item.name)}" placeholder="Warm up exercise"></label>
                <label>Sets & Reps<input inputmode="text" data-action="warmup-plan" data-day="${day.id}" data-id="${item.id}" value="${escapeAttribute(formatPlan(item.sets, item.reps))}" placeholder="2 x 10, 12"></label>
                ${item.notes || state.prefs.openWarmUpNoteId === item.id ? `<label class="warmup-notes">NOTE<textarea data-action="warmup-notes" data-day="${day.id}" data-id="${item.id}" placeholder="Optional note">${escapeHtml(item.notes)}</textarea></label><button class="note-link" data-action="remove-warmup-notes" data-day="${day.id}" data-id="${item.id}">Remove NOTE</button>` : `<button class="note-link warmup-add-notes" data-action="show-warmup-notes" data-id="${item.id}">NOTE</button>`}
              </article>`).join("")}</div>` : ""}
          </section>
          <div class="program-exercises">${day.exercises.length ? day.exercises.map((exercise, exerciseIndex) => {
            const plan = parsePrescription(exercise.prescription || exercise[3]);
            const id = exercise.id || exercise[0];
            const notes = exercise.tip || exercise[4] || "";
            return `
            <div class="program-exercise-row">
              <label class="program-exercise-name">Exercise<input data-action="program-exercise-name" data-day="${day.id}" data-id="${id}" value="${escapeAttribute(exercise.name || exercise[1] || "")}" placeholder="Exercise name"></label>
              <label class="plan-field">Sets & Reps<input inputmode="text" value="${escapeAttribute(formatPlan(plan.sets, plan.reps))}" data-action="program-exercise-plan" data-day="${day.id}" data-id="${id}" aria-label="Sets and reps" placeholder="3 x 10"></label>
              ${notes || state.prefs.openExerciseNoteId === id ? `<label class="exercise-notes-field">NOTE<textarea data-action="program-exercise-notes" data-day="${day.id}" data-id="${id}" placeholder="Optional note">${escapeHtml(notes)}</textarea></label><button class="note-link" data-action="remove-program-exercise-notes" data-day="${day.id}" data-id="${id}">Remove NOTE</button>` : `<button class="note-link add-exercise-notes" data-action="show-program-exercise-notes" data-id="${id}">NOTE</button>`}
            </div>`;
          }).join("") : "<p>No exercises yet. Import a PDF or add exercises later.</p>"}</div>
          <footer class="workout-editor-actions">
            <button class="tool-icon-button" data-action="add-blank-exercise" data-id="${day.id}" aria-label="Add exercise" title="Add exercise">${svgIcon("train")}</button>
            <button class="tool-icon-button finish-workout-plan" data-action="start-program" data-id="${day.id}" ${day.exercises.length ? "" : "disabled"} aria-label="Finish workout setup" title="Finish workout setup"><span aria-hidden="true">⚡️</span></button>
          </footer>` : ""}
        </article>`).join("") || `<section class="soft-empty"><h2>No workout days</h2><p>Add your first day, then choose exercises from the Library.</p></section>`}</section>
    </main>`;
}

function lastSchedulePanel(state) {
  const schedule = state.lastSchedules?.[0];
  if (!schedule) {
    return `<section class="last-schedule-panel soft-empty"><h2>Last Schedule</h2><p>No previous schedule saved yet. When you import a new PDF, the current schedule will move here automatically.</p></section>`;
  }
  return `
    <section class="last-schedule-panel">
      <header>
        <div><p class="eyebrow">Last Schedule</p><h2>${escapeHtml(schedule.title)}</h2></div>
        <span>${formatDate(schedule.startedAt, { month: "short", day: "numeric", year: "numeric" })} - ${formatDate(schedule.stoppedAt, { month: "short", day: "numeric", year: "numeric" })}</span>
      </header>
      <div class="last-schedule-days">
        ${(schedule.days || []).map((day, index) => `
          <article>
            <small>Day ${index + 1}</small>
            <strong>${escapeHtml(day.title)}</strong>
            ${warmUpItemsFor(day).length ? `<p><b>Warm Up:</b> ${warmUpItemsFor(day).map((item) => escapeHtml(item.name || item.notes || "Warm Up")).join(", ")}</p>` : ""}
            <ul>${(day.exercises || []).map((exercise) => `<li>${escapeHtml(exercise.name || exercise[1])}<span>${escapeHtml(exercise.prescription || exercise[3] || "")}</span></li>`).join("")}</ul>
          </article>`).join("")}
      </div>
    </section>`;
}

export function weeklyView(state) {
  const { analytics, weeklyInsight, photos } = state;
  return `
    <main class="view weekly-view">
      <header class="page-head cinematic"><p class="eyebrow">Weekly review</p><h1>Your training signal</h1></header>
      <section class="panel split-panel review-hero">${ring(analytics.score, "Score")}<div><h2>${analytics.completed} workouts completed</h2><p>${weeklyInsight}</p></div></section>
      <section class="stat-grid">
        ${metric("Total lifted", `${formatNumber(analytics.totalVolume)} lb`, "this week")}
        ${metric("Best PR", analytics.bestPR ? analytics.bestPR.value : "-", analytics.bestPR ? analytics.bestPR.exercise : "No PR yet")}
        ${metric("Duration", `${analytics.duration} min`, "training time")}
        ${metric("Top focus", analytics.muscleFocus[0]?.[0] || "-", "muscle")}
      </section>
      <section class="panel">
        <div class="panel-title"><h2>Progress photos</h2><label class="photo-upload">${svgIcon("camera")} Add<input type="file" accept="image/*" data-action="add-photo"></label></div>
        <div class="photo-grid">${photos.length ? photos.slice(-4).map((photo) => `<figure><img src="${URL.createObjectURL(photo.blob)}" alt="Progress photo from ${formatDate(photo.date)}"><figcaption>${formatDate(photo.date)}</figcaption></figure>`).join("") : "<p>Photos stay local in IndexedDB. Add one when you want a visual checkpoint.</p>"}</div>
      </section>
    </main>`;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

function brandLogo() {
  return `
    <div class="brand-logo" role="img" aria-label="TrainWith Z">
      <svg viewBox="0 0 560 150" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="brandZ" x1="40" y1="32" x2="132" y2="118" gradientUnits="userSpaceOnUse">
            <stop stop-color="#7CC8FF"/>
            <stop offset=".52" stop-color="#147BFF"/>
            <stop offset="1" stop-color="#7CC8FF"/>
          </linearGradient>
          <linearGradient id="brandPulse" x1="10" y1="78" x2="162" y2="78" gradientUnits="userSpaceOnUse">
            <stop stop-color="#147BFF" stop-opacity="0"/>
            <stop offset=".22" stop-color="#7CC8FF"/>
            <stop offset=".5" stop-color="#E6F2FF"/>
            <stop offset=".78" stop-color="#7CC8FF"/>
            <stop offset="1" stop-color="#147BFF" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <g transform="translate(4 7)">
          <path d="M27 31a67 67 0 0 1 98-4" fill="none" stroke="#147BFF" stroke-width="4.5" stroke-linecap="round" opacity=".82"/>
          <path d="M130 44a67 67 0 0 1-102 82" fill="none" stroke="#147BFF" stroke-width="4.5" stroke-linecap="round" opacity=".48"/>
          <circle cx="134" cy="33" r="5.5" fill="#7CC8FF"/>
          <circle cx="22" cy="120" r="5.5" fill="#7CC8FF"/>
          <path d="M42 42h76L83 75h42l-29 25H59l35-34H33l9-24Z" fill="url(#brandZ)"/>
          <path d="M45 125h71l10-25H53l-18 25h10Z" fill="url(#brandZ)"/>
          <path d="M10 82h42l8-15 11 45 11-61 12 46 8-15h50" fill="none" stroke="url(#brandPulse)" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
        <text class="brand-word" x="165" y="96" font-size="56" font-family="Inter, Segoe UI, Arial, sans-serif" font-weight="760">TrainWith</text>
        <text class="brand-word" x="428" y="96" font-size="60" font-family="Inter, Segoe UI, Arial, sans-serif" font-weight="790">Z</text>
      </svg>
    </div>`;
}

function sameDay(a, b) {
  const first = new Date(a);
  const second = new Date(b);
  return first.toDateString() === second.toDateString();
}

function trendText(now, before) {
  if (!before) return "baseline";
  const delta = now - before;
  return `${delta >= 0 ? "+" : ""}${formatNumber(delta)} vs last`;
}

function calendarCard(sessions, expanded) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (firstDay.getDay() + 6) % 7;
  const monthName = new Intl.DateTimeFormat("en", { month: "long" }).format(now);
  const sessionsByDay = new Map();
  sessions
    .filter((session) => {
      const date = new Date(session.date);
      return date.getFullYear() === year && date.getMonth() === month;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach((session) => {
      sessionsByDay.set(new Date(session.date).getDate(), session);
    });
  const cells = [
    ...Array.from({ length: leading }, () => `<i></i>`),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const classes = [
        day === now.getDate() ? "today" : "",
        sessionsByDay.has(day) ? "trained" : ""
      ].filter(Boolean).join(" ");
      const session = sessionsByDay.get(day);
      return session
        ? `<button class="${classes}" data-action="open-calendar-session" data-id="${session.id}" aria-label="Open completed workout from ${monthName} ${day}"><span>${day}</span><em>Done</em></button>`
        : `<b class="${classes}">${day}</b>`;
    })
  ];
  return `
    <article class="dash-card calendar-card ${expanded ? "expanded" : "collapsed"}">
      <div><span>Training calendar</span><strong>${monthName}</strong><button data-action="toggle-calendar" aria-label="${expanded ? "Collapse" : "Expand"} calendar">${expanded ? "&minus;" : "+"}</button></div>
      ${expanded ? `
        <section class="calendar-grid">
          ${["M", "T", "W", "T", "F", "S", "S"].map((day) => `<em>${day}</em>`).join("")}
          ${cells.join("")}
        </section>` : ""}
    </article>`;
}

function parsePrescription(value = "") {
  const [sets = "3", reps = "10"] = String(value).split(/\s+x\s+/i);
  return {
    sets: sets.trim() || "3",
    reps: reps.trim() || "10"
  };
}

function formatPlan(sets = "", reps = "") {
  return [sets, reps].filter(Boolean).join(" x ");
}

function warmUpItemsFor(day) {
  if (Array.isArray(day?.warmUpItems)) return day.warmUpItems;
  if (day?.warmUp) return [{ id: "legacy-warmup", name: "Warm Up", sets: "", reps: "", notes: day.warmUp }];
  return [];
}

function todayNutrition(entries) {
  const now = new Date();
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return entries.find((entry) => entry.date === key) || {
    water: 0,
    protein: 0,
    waterGoal: 3,
    proteinGoal: 150
  };
}

function inBodyForm() {
  const today = new Date();
  const dateValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return `
    <form class="inbody-form" data-form="inbody">
      <label><span>Scan date</span><div><input name="date" type="date" value="${dateValue}" required></div></label>
      <label class="full-field inbody-image-field">
        <span>InBody report image</span>
        <div class="image-input-shell">
          ${svgIcon("camera")}
          <strong>Add report photo</strong>
          <small>Private on this device. Analysis uses the numbers below.</small>
          <input name="reportImage" type="file" accept="image/*">
        </div>
      </label>
      ${[
        ["weight", "Weight", "kg"],
        ["muscle", "Skeletal muscle", "kg"],
        ["fat", "Body fat", "%"],
        ["bmi", "BMI", ""],
        ["score", "InBody score", "/100"],
        ["visceralFat", "Visceral fat level", ""],
        ["rightArmFat", "Right arm fat", "%"],
        ["leftArmFat", "Left arm fat", "%"],
        ["trunkFat", "Trunk fat", "%"],
        ["rightLegFat", "Right leg fat", "%"],
        ["leftLegFat", "Left leg fat", "%"]
      ].map(([name, label, unit]) => `
        <label><span>${label}</span><div><input name="${name}" type="number" step="0.1" inputmode="decimal" required><em>${unit}</em></div></label>`).join("")}
      <div class="form-actions full-field">
        <button type="button" class="glass" data-action="toggle-inbody-form">Cancel</button>
        <button class="primary" type="button" data-action="save-inbody-form">Save scan</button>
      </div>
    </form>`;
}

function inBodySummary(latest, previous) {
  const metrics = [
    ["Weight", "weight", "kg", false],
    ["Muscle", "muscle", "kg", true],
    ["Body fat", "fat", "%", false],
    ["BMI", "bmi", "", false],
    ["InBody score", "score", "", true],
    ["Visceral fat", "visceralFat", "", false]
  ];
  const segmental = [
    ["Right arm", "rightArmFat"],
    ["Left arm", "leftArmFat"],
    ["Trunk", "trunkFat"],
    ["Right leg", "rightLegFat"],
    ["Left leg", "leftLegFat"]
  ];
  return `
    <div class="inbody-summary">
      <header><span>Latest scan</span><strong>${formatDate(latest.date, { month: "short", day: "numeric", year: "numeric" })}</strong></header>
      ${latest.reportImage ? `<figure class="inbody-report"><img src="${URL.createObjectURL(latest.reportImage)}" alt="InBody report from ${formatDate(latest.date)}"><figcaption>Saved report image</figcaption></figure>` : ""}
      <div class="inbody-metrics">${metrics.map(([label, key, unit, higherIsBetter]) => {
        const delta = previous ? Number(latest[key]) - Number(previous[key]) : null;
        return `<article><span>${label}</span><strong>${latest[key]}${unit}</strong>${delta === null ? `<em>Baseline</em>` : `<em class="${metricTrend(delta, higherIsBetter)}">${signed(delta)}${unit}</em>`}</article>`;
      }).join("")}</div>
      <section class="inbody-analysis"><h3>Local analysis</h3><p>${inBodyAnalysis(latest, previous)}</p></section>
      <section class="segmental-fat"><h3>Segmental fat</h3>${segmental.map(([label, key]) => {
        const delta = previous ? Number(latest[key]) - Number(previous[key]) : null;
        return `<div><span>${label}</span><strong>${latest[key]}%</strong><em class="${delta === null ? "" : metricTrend(delta, false)}">${delta === null ? "Baseline" : `${signed(delta)}%`}</em></div>`;
      }).join("")}</section>
    </div>`;
}

function inBodyAnalysis(latest, previous) {
  if (!previous) return "This is your baseline scan. Add another InBody result later to unlock trend analysis.";
  const weight = Number(latest.weight) - Number(previous.weight);
  const muscle = Number(latest.muscle) - Number(previous.muscle);
  const fat = Number(latest.fat) - Number(previous.fat);
  const score = Number(latest.score) - Number(previous.score);
  const parts = [
    `weight ${weight === 0 ? "held steady" : `${weight > 0 ? "increased" : "decreased"} by ${Math.abs(weight).toFixed(1)} kg`}`,
    `muscle ${muscle === 0 ? "held steady" : `${muscle > 0 ? "increased" : "decreased"} by ${Math.abs(muscle).toFixed(1)} kg`}`,
    `body fat ${fat === 0 ? "held steady" : `${fat > 0 ? "increased" : "decreased"} by ${Math.abs(fat).toFixed(1)}%`}`,
    `score ${score === 0 ? "held steady" : `${score > 0 ? "improved" : "decreased"} by ${Math.abs(score).toFixed(1)} points`}`
  ];
  return `Since your previous scan, ${parts.join(", ")}. This is descriptive tracking, not a medical interpretation.`;
}

function metricTrend(delta, higherIsBetter) {
  if (!delta) return "neutral";
  return (delta > 0) === higherIsBetter ? "positive" : "negative";
}

function signed(value) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}`;
}

function escapeAttribute(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeHtml(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
