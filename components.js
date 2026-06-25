export const icon = {
  home: "M3 11.5 12 4l9 7.5V21h-6v-6H9v6H3v-9.5Z",
  train: "M4 9h3v6H4V9Zm13 0h3v6h-3V9ZM8 7h2v10H8V7Zm4 3h2v4h-2v-4Zm4-3h2v10h-2V7Z",
  library: "M5 4h14v4H5V4Zm0 6h14v10H5V10Zm3 3h8v2H8v-2Z",
  chart: "M4 19V5h2v14H4Zm5 0v-8h2v8H9Zm5 0V8h2v11h-2Zm5 0V3h2v16h-2Z",
  history: "M12 4a8 8 0 1 1-7.5 5.3H2l3.5-4L9 9.3H6.6A6 6 0 1 0 12 6v5l4 2-.8 1.8-5.2-2.6V4h2Z",
  spark: "M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2Z",
  plus: "M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z",
  check: "m9 16.2-4.2-4.2L3.4 13.4 9 19 21 7l-1.4-1.4L9 16.2Z",
  swap: "M7 7h11l-3-3 1.4-1.4L22 8l-5.6 5.4L15 12l3-3H7V7Zm10 10H6l3 3-1.4 1.4L2 16l5.6-5.4L9 12l-3 3h11v2Z",
  skip: "M5 5l8 7-8 7V5Zm10 0h3v14h-3V5Z",
  camera: "M8 6l1.5-2h5L16 6h4v14H4V6h4Zm4 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
};

export function svgIcon(name) {
  return `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="${icon[name]}"/></svg>`;
}

export function metric(label, value, detail = "") {
  return `<div class="metric"><span>${label}</span><strong>${value}</strong>${detail ? `<em>${detail}</em>` : ""}</div>`;
}

export function ring(score, label = "Progress") {
  const safe = Math.max(0, Math.min(100, score));
  return `<div class="score-ring" style="--score:${safe * 3.6}deg"><div><strong>${safe}</strong><span>${label}</span></div></div>`;
}

export function emptyState(title, body, action = "") {
  return `<section class="empty-state"><div class="orbital">${svgIcon("spark")}</div><h2>${title}</h2><p>${body}</p>${action}</section>`;
}

export function nav(route) {
  const items = [
    ["home", "Home", "home"],
    ["editor", "Workouts", "train"],
    ["start", "Start", "plus"],
    ["analytics", "Progress", "chart"],
    ["weekly", "Review", "spark"]
  ];
  return `<nav class="bottom-nav" aria-label="Primary">${items.map(([id, label, glyph]) => `
    <button class="${route === id || (id === "editor" && ["workout", "library", "history"].includes(route)) ? "active" : ""} ${id === "start" ? "nav-start" : ""}" ${id === "start" ? 'data-action="start-workout"' : `data-route="${id}"`} aria-label="${label}">
      ${svgIcon(glyph)}<span>${label}</span>
    </button>`).join("")}</nav>`;
}

export function formatDate(value, options = { month: "short", day: "numeric" }) {
  return new Intl.DateTimeFormat("en", options).format(new Date(value));
}

export function formatNumber(value) {
  return Math.round(value || 0).toLocaleString();
}
