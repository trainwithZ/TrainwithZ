const KEY = "trainwithz:coaching";

const seed = {
  coach: { name: "Coach Z", username: "coach", role: "Admin Coach" },
  clients: [
    client("maya", "Maya Reynolds", 29, "Build strength", 86, true, "Lower Body Strength"),
    client("jordan", "Jordan Lee", 34, "Improve conditioning", 71, true, "Full Body Engine"),
    client("sophia", "Sophia Khan", 27, "Athletic performance", 93, true, "Upper Body Power"),
    client("noah", "Noah Williams", 41, "Return to training", 48, false, "Foundation Reset")
  ],
  alerts: ["Maya completed Lower Body Strength", "Sophia submitted a weekly check-in"]
};

function client(username, name, age, goal, adherence, active, today) {
  return {
    id: username, username, password: "Train123!", name, age, height: "5'7\"", weight: 152,
    goal, active, adherence, today, completed: adherence > 80, plan: "4 Week Performance Block",
    schedule: ["Lower Strength", "Recovery", "Upper Strength", "Conditioning", "Full Body", "Mobility", "Rest"],
    weights: [158, 156, 155, 154, 152], measurements: { waist: 29, hips: 39, chest: 36, arm: 12.5 },
    history: ["Full Body · 42 min", "Upper Strength · 51 min", "Lower Strength · 48 min"],
    notes: [{ from: "Coach Z", text: "Great control on your final working sets.", date: "Today" }],
    checkin: { energy: 8, recovery: 7, difficulty: 6, note: "Feeling strong and ready to progress." }, photos: []
  };
}

function data() {
  try { return { ...seed, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
  catch { return structuredClone(seed); }
}
function save(value) { localStorage.setItem(KEY, JSON.stringify(value)); }
function esc(value = "") { return String(value).replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
function initials(name) { return name.split(" ").map(x => x[0]).slice(0,2).join(""); }

export function coachView(state) {
  const d = data();
  const selected = d.clients.find(c => c.id === state.prefs.coachClientId);
  return selected ? clientView(selected, state) : dashboard(d);
}

function dashboard(d) {
  const active = d.clients.filter(c => c.active);
  const complete = active.filter(c => c.completed).length;
  const avg = active.length ? Math.round(active.reduce((s,c) => s + c.adherence, 0) / active.length) : 0;
  return `<main class="view coach-view">
    <header class="coach-head"><div><p class="eyebrow">Coach workspace</p><h1>Good morning, Z.</h1><p>Your athletes are moving. Here is what needs your attention.</p></div>
      <div class="coach-head-actions"><button class="icon-btn" data-action="coach-notifications" aria-label="Enable workout reminders">⌁</button><button class="primary compact" data-action="coach-new-client">＋ Add client</button></div></header>
    <section class="coach-metrics">
      <article><span>Active clients</span><strong>${active.length}</strong><small>${d.clients.length - active.length} paused</small></article>
      <article><span>Trained today</span><strong>${complete}<em>/${active.length}</em></strong><small>${Math.round((complete / Math.max(active.length,1))*100)}% complete</small></article>
      <article><span>Weekly adherence</span><strong>${avg}%</strong><small class="positive">↑ 6% this month</small></article>
      <article><span>Open check-ins</span><strong>2</strong><small>Review by Friday</small></article>
    </section>
    <section class="coach-grid"><div class="coach-main">
      <div class="section-title"><div><p class="eyebrow">Roster</p><h2>Client performance</h2></div><input class="coach-search" placeholder="Search clients" aria-label="Search clients"></div>
      <div class="client-table" role="table"><div class="client-row client-row-head"><span>Client</span><span>Today</span><span>Adherence</span><span>Status</span><span></span></div>
      ${d.clients.map(c => `<button class="client-row" data-action="coach-open-client" data-id="${c.id}"><span class="client-person"><i>${initials(c.name)}</i><b>${esc(c.name)}<small>@${esc(c.username)} · ${esc(c.goal)}</small></b></span><span><b>${esc(c.today)}</b><small>${c.completed ? "Completed" : "Not completed"}</small></span><span class="adherence"><b>${c.adherence}%</b><i><em style="width:${c.adherence}%"></em></i></span><span><i class="status-dot ${c.active ? "on" : ""}"></i>${c.active ? "Active" : "Paused"}</span><span>›</span></button>`).join("")}</div>
    </div><aside class="coach-side"><section class="coach-panel"><p class="eyebrow">Live activity</p><h3>Latest updates</h3>${d.alerts.map(a => `<p class="activity-item"><i>✓</i><span>${esc(a)}<small>Just now</small></span></p>`).join("")}</section>
      <section class="coach-panel premium"><p class="eyebrow">This week</p><h3>Strong consistency</h3><div class="mini-bars">${[62,78,55,88,72,40,20].map((x,i)=>`<i style="height:${x}%"><span>${"MTWTFSS"[i]}</span></i>`).join("")}</div><p>12 of 16 scheduled sessions completed.</p></section></aside></section>
    <dialog class="coach-dialog" id="new-client-dialog"><form method="dialog" data-form="coach-client"><header><div><p class="eyebrow">New account</p><h2>Add a coaching client</h2></div><button value="cancel" aria-label="Close">×</button></header><div class="coach-form-grid">
      <label>Full name<input name="name" required></label><label>Username<input name="username" required autocomplete="off"></label><label>Temporary password<input name="password" required minlength="8" value="Train123!"></label><label>Age<input name="age" type="number" min="13"></label><label>Height<input name="height" placeholder="5'7\""></label><label>Weight<input name="weight" type="number" step=".1"></label><label class="wide">Primary goal<input name="goal" required></label></div><footer><button value="cancel" class="secondary">Cancel</button><button value="default" class="primary">Create client account</button></footer></form></dialog>
  </main>`;
}

function clientView(c, state) {
  const tab = state.prefs.coachClientTab || "overview";
  const tabs = ["overview","program","progress","check-in","notes"];
  return `<main class="view coach-view"><header class="client-detail-head"><button class="back-button" data-action="coach-back">‹</button><span class="client-avatar">${initials(c.name)}</span><div><p class="eyebrow">Client profile</p><h1>${esc(c.name)}</h1><p>@${esc(c.username)} · ${c.age} years · ${esc(c.goal)}</p></div><button class="status-button ${c.active ? "active" : ""}" data-action="coach-toggle-active" data-id="${c.id}">${c.active ? "● Active" : "○ Paused"}</button></header>
    <nav class="client-tabs">${tabs.map(t=>`<button class="${tab===t?"active":""}" data-action="coach-client-tab" data-tab="${t}">${t}</button>`).join("")}</nav>
    ${tabContent(c, tab)}
  </main>`;
}

function tabContent(c, tab) {
  if (tab === "overview") return `<section class="detail-grid"><div><section class="coach-panel today-card"><div><p class="eyebrow">Today's workout</p><h2>${esc(c.today)}</h2><p>5 exercises · 18 working sets · Est. 48 min</p></div><button class="${c.completed ? "completed" : "primary"}" data-action="coach-complete-workout" data-id="${c.id}">${c.completed ? "✓ Completed" : "Mark completed"}</button></section><section class="coach-panel"><div class="section-title"><h3>Weekly schedule</h3><span>${c.adherence}% adherence</span></div><div class="week-strip">${c.schedule.map((x,i)=>`<article class="${i<4?"done":""} ${i===4?"today":""}"><b>${"MTWTFSS"[i]}</b><i>${i<4?"✓":i===4?"•":""}</i><small>${esc(x)}</small></article>`).join("")}</div></section><section class="coach-panel"><h3>Recent exercise history</h3>${c.history.map((h,i)=>`<div class="history-line"><i>${i+1}</i><b>${esc(h)}</b><span>${i+2} days ago</span></div>`).join("")}</section></div><aside><section class="coach-panel profile-facts"><h3>Personal information</h3><p><span>Age</span><b>${c.age}</b></p><p><span>Height</span><b>${esc(c.height)}</b></p><p><span>Weight</span><b>${c.weight} lb</b></p><p><span>Goal</span><b>${esc(c.goal)}</b></p></section><section class="coach-panel"><h3>Coach note</h3><p>${esc(c.notes.at(-1)?.text)}</p><button class="text-button" data-action="coach-client-tab" data-tab="notes">Open conversation →</button></section></aside></section>`;
  if (tab === "program") return `<section class="detail-grid"><section class="coach-panel"><div class="section-title"><div><p class="eyebrow">Assigned program</p><h2>${esc(c.plan)}</h2></div><button class="primary compact" data-action="coach-save-program">Save changes</button></div>${c.schedule.map((x,i)=>`<div class="program-assignment"><b>Day ${i+1}</b><input value="${esc(x)}" aria-label="Day ${i+1} workout"><span>${[5,0,6,4,7,2,0][i]} exercises</span></div>`).join("")}</section><aside class="coach-panel"><h3>Plan controls</h3><p>Changes apply only to ${esc(c.name)} and never alter your personal workout plan.</p><button class="secondary wide-button">Upload workout PDF</button><button class="secondary wide-button">Duplicate from client</button></aside></section>`;
  if (tab === "progress") return `<section class="detail-grid"><div><section class="coach-panel"><div class="section-title"><div><p class="eyebrow">Weight tracking</p><h2>${c.weight} lb</h2></div><span class="positive">−6 lb this block</span></div><div class="progress-chart">${c.weights.map((w,i)=>`<i style="height:${35+(160-w)*8}%"><span>${w}</span></i>`).join("")}</div></section><section class="coach-panel"><h3>Progress photos</h3><div class="photo-slots"><button>＋<small>Add front</small></button><button>＋<small>Add side</small></button><button>＋<small>Add back</small></button></div></section></div><aside class="coach-panel"><h3>Body measurements</h3>${Object.entries(c.measurements).map(([k,v])=>`<p class="measurement"><span>${k}</span><b>${v} in</b><em>↓ 0.5</em></p>`).join("")}<button class="primary wide-button">Log measurements</button></aside></section>`;
  if (tab === "check-in") return `<section class="coach-panel checkin-card"><p class="eyebrow">Weekly check-in</p><h2>Week 4 response</h2>${[["Energy",c.checkin.energy],["Recovery",c.checkin.recovery],["Workout difficulty",c.checkin.difficulty]].map(([x,v])=>`<div class="check-score"><span>${x}</span><i><em style="width:${v*10}%"></em></i><b>${v}/10</b></div>`).join("")}<blockquote>“${esc(c.checkin.note)}”</blockquote><textarea placeholder="Coach response"></textarea><button class="primary">Send feedback</button></section>`;
  return `<section class="notes-layout"><div class="coach-panel note-thread">${c.notes.map(n=>`<article><b>${esc(n.from)}</b><small>${n.date}</small><p>${esc(n.text)}</p></article>`).join("")}<form data-form="coach-note"><input type="hidden" name="id" value="${c.id}"><textarea name="text" required placeholder="Write a note to ${esc(c.name)}…"></textarea><button class="primary">Send note</button></form></div></section>`;
}

export function handleCoachAction(target, store) {
  const action = target.dataset.action;
  if (!action?.startsWith("coach-")) return false;
  const d = data(); const c = d.clients.find(x => x.id === target.dataset.id);
  if (action === "coach-new-client") document.querySelector("#new-client-dialog")?.showModal();
  if (action === "coach-open-client") store.setPrefs({ coachClientId: target.dataset.id, coachClientTab: "overview" });
  if (action === "coach-back") store.setPrefs({ coachClientId: null });
  if (action === "coach-client-tab") store.setPrefs({ coachClientTab: target.dataset.tab });
  if (action === "coach-toggle-active" && c) { c.active = !c.active; save(d); store.emit(); }
  if (action === "coach-complete-workout" && c) { c.completed = true; c.adherence = Math.min(100, c.adherence + 4); d.alerts.unshift(`${c.name} completed ${c.today}`); save(d); store.emit(); }
  if (action === "coach-notifications") requestNotifications();
  if (action === "coach-save-program") { target.textContent = "✓ Saved"; setTimeout(()=>target.textContent="Save changes", 1400); }
  return true;
}

export function handleCoachForm(form, store) {
  const d = data(); const values = Object.fromEntries(new FormData(form));
  if (form.dataset.form === "coach-client") {
    const username = String(values.username).trim().toLowerCase();
    if (d.clients.some(c => c.username.toLowerCase() === username)) { alert("That username is already in use."); return; }
    const c = client(username, String(values.name).trim(), Number(values.age)||18, values.goal, 0, true, "Welcome assessment");
    Object.assign(c, { password: values.password, height: values.height || "—", weight: Number(values.weight)||0 });
    d.clients.push(c); save(d); document.querySelector("#new-client-dialog")?.close(); store.emit();
  }
  if (form.dataset.form === "coach-note") { const c=d.clients.find(x=>x.id===values.id); if(c){c.notes.push({from:"Coach Z",text:values.text,date:"Just now"});save(d);store.emit();} }
}

async function requestNotifications() {
  if (!("Notification" in window)) return alert("Notifications are not supported on this device.");
  const permission = await Notification.requestPermission();
  if (permission === "granted") new Notification("TrainWith Z reminders enabled", { body: "Clients can now receive scheduled workout reminders." });
}
