import { formatDate, formatNumber, metric, ring, svgIcon, emptyState } from "../ui/components.js";
import { estimatedPR } from "../core/analytics.js";

export function homeView(state) {
  const { todayWorkout, analytics, insight, cycle, lastSession } = state;
  const afterWorkout = lastSession && sameDay(lastSession.date, new Date());
  return `
    <main class="view home-view reference-home">
      <header class="home-topbar">
        <button class="menu-button" aria-label="Menu"><span></span><span></span><span></span></button>
        <div class="topbar-actions">
          <button class="bell-button" aria-label="Notifications">${svgIcon("spark")}<i></i></button>
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
            <img src="assets/trainwith-z-mark.svg" alt="TrainWith Z logo">
            <h1>TrainWith Z <b>&hearts;</b></h1>
          </div>
        </div>

        <article class="dash-card workout-card">
          <span>Today's Workout</span>
          <h2>${todayWorkout ? todayWorkout.title : "Recovery Day"}</h2>
          <p>${todayWorkout ? `${todayWorkout.exercises.length} exercises` : "Mobility, steps, sleep"}</p>
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
          ${[
            ["Workouts", `${Math.min(analytics.completed, 1)} / 1`],
            ["Steps", "8,432 / 10,000"],
            ["Protein", "120 / 150g"],
            ["Water", "2.1 / 3L"]
          ].map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("")}
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
        <button class="icon-btn" data-action="prev-exercise" aria-label="Previous exercise">&lsaquo;</button>
        <div>
          <p class="eyebrow">Focus mode &middot; ${index + 1}/${draft.exercises.length}</p>
          <h1>${exercise.name}</h1>
          <span>${exercise.muscle} &middot; ${exercise.prescription}</span>
        </div>
        <button class="icon-btn" data-action="next-exercise" aria-label="Next exercise">&rsaquo;</button>
      </section>

      <section class="exercise-focus-card">
        <div class="progress-line"><i style="width:${Math.round((completed / Math.max(total, 1)) * 100)}%"></i></div>
        <p>${exercise.tip}</p>
        <div class="set-list">
          ${exercise.sets.map((set) => `
            <label class="set-row ${set.done ? "done" : ""}">
              <button data-action="toggle-set" data-set="${set.id}" aria-label="Complete set ${set.index}">${set.done ? svgIcon("check") : set.index}</button>
              <span>Set ${set.index}</span>
              <input inputmode="decimal" data-action="set-weight" data-set="${set.id}" value="${set.weight}" placeholder="Weight" aria-label="Weight for set ${set.index}">
              <input inputmode="numeric" data-action="set-reps" data-set="${set.id}" value="${set.reps}" placeholder="Reps" aria-label="Reps for set ${set.index}">
              <em>${estimatedPR(set) || ""}</em>
            </label>`).join("")}
        </div>
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
      <header class="page-head"><p class="eyebrow">Library</p><h1>Exercise system</h1></header>
      <div class="search-row"><input data-action="search-library" value="${state.prefs.search}" placeholder="Search exercises" aria-label="Search exercises"></div>
      <div class="chip-scroll">${filters.map((filter) => `<button class="${state.prefs.libraryFilter === filter ? "active" : ""}" data-filter="${filter}">${filter}</button>`).join("")}</div>
      <section class="card-list">${filtered.map((exercise) => `
        <article class="library-card">
          <div><h2>${exercise.name}</h2><p>${exercise.muscle} &middot; ${exercise.equipment}</p><span>${exercise.tip}</span></div>
          <button class="icon-btn" data-action="add-library-exercise" data-id="${exercise.id}" aria-label="Add ${exercise.name}">${svgIcon("plus")}</button>
        </article>`).join("")}</section>
    </main>`;
}

export function analyticsView(state) {
  const { analytics } = state;
  return `
    <main class="view">
      <header class="page-head"><p class="eyebrow">Progress</p><h1>Athlete analytics</h1></header>
      <section class="panel split-panel">${ring(analytics.score, "Week")}<div><h2>Momentum score</h2><p>Built from sessions, weekly volume, duration consistency, and PR signals. It rewards useful work, not chaos.</p></div></section>
      <section class="stat-grid">
        ${metric("Strength trend", `${analytics.volumeTrend >= 0 ? "+" : ""}${analytics.volumeTrend}%`, "last sessions")}
        ${metric("Duration trend", `${analytics.durationTrend >= 0 ? "+" : ""}${analytics.durationTrend}%`, "pace")}
        ${metric("Weekly lift", `${formatNumber(analytics.totalVolume)} lb`, trendText(analytics.totalVolume, analytics.previousVolume))}
        ${metric("Best PR", analytics.bestPR ? analytics.bestPR.value : "-", analytics.bestPR ? analytics.bestPR.exercise : "Log more sets")}
      </section>
      <section class="panel"><h2>Muscle focus</h2><div class="bars">${analytics.muscleFocus.length ? analytics.muscleFocus.map(([muscle, count]) => `<div><span>${muscle}</span><i style="width:${Math.min(100, count * 28)}%"></i><em>${count}</em></div>`).join("") : "<p>No weekly muscle data yet.</p>"}</div></section>
    </main>`;
}

export function historyView(state) {
  if (!state.sessions.length) return emptyState("No sessions yet", "Your timeline becomes useful as soon as the first workout is completed.", `<button class="primary" data-action="start-workout">${svgIcon("train")} Start workout</button>`);
  return `
    <main class="view">
      <header class="page-head"><p class="eyebrow">History</p><h1>Training timeline</h1></header>
      <section class="timeline">${[...state.sessions].sort((a, b) => new Date(b.date) - new Date(a.date)).map((session) => `
        <article class="session-card">
          <div><span>${formatDate(session.date, { weekday: "short", month: "short", day: "numeric" })}</span><h2>${session.title}</h2><p>${session.focus.join(" &middot; ")}</p></div>
          <div class="session-metrics"><strong>${formatNumber(session.volume)} lb</strong><span>${session.duration} min</span></div>
        </article>`).join("")}</section>
    </main>`;
}

export function editorView(state) {
  return `
    <main class="view">
      <header class="page-head"><p class="eyebrow">Workouts</p><h1>Training hub</h1></header>
      <section class="panel"><h2>Program logic</h2><p>Two build weeks, one deload/light activation week, then a controlled return to intensity.</p></section>
      <section class="hub-actions">
        <button class="glass" data-route="library">${svgIcon("library")} Exercise Library</button>
        <button class="glass" data-route="history">${svgIcon("history")} Workout History</button>
      </section>
      <section class="card-list">${state.program.map((day) => `
        <article class="program-card">
          <div><p class="eyebrow">Day ${day.day}</p><h2>${day.title}</h2><span>${day.tone}</span></div>
          <button class="primary compact" data-action="start-program" data-id="${day.id}">${svgIcon("train")} Start</button>
        </article>`).join("")}</section>
    </main>`;
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
