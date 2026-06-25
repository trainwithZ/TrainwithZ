export function computeAnalytics(sessions) {
  const sorted = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date));
  const now = new Date();
  const weekStart = startOfWeek(now);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const thisWeek = sorted.filter((s) => new Date(s.date) >= weekStart);
  const lastWeek = sorted.filter((s) => new Date(s.date) >= prevWeekStart && new Date(s.date) < weekStart);
  const prs = findPRs(sorted);
  const muscleFocus = countMuscles(thisWeek);
  const totalVolume = sum(thisWeek.map((s) => s.volume));
  const previousVolume = sum(lastWeek.map((s) => s.volume));
  const duration = sum(thisWeek.map((s) => s.duration));
  const completed = thisWeek.length;
  const score = clamp(Math.round(completed * 14 + Math.min(totalVolume / 650, 34) + Math.min(prs.length * 6, 18)), 0, 100);

  return {
    sorted,
    thisWeek,
    lastWeek,
    completed,
    totalVolume,
    previousVolume,
    duration,
    prs,
    muscleFocus,
    score,
    durationTrend: trend(sorted.map((s) => s.duration)),
    volumeTrend: trend(sorted.map((s) => s.volume)),
    bestPR: prs[0] || null
  };
}

export function sessionVolume(exercises) {
  return exercises.reduce((total, ex) => total + ex.sets.reduce((sumSets, set) => {
    const reps = Number(set.reps) || 0;
    const weight = Number(set.weight) || 0;
    return sumSets + reps * weight;
  }, 0), 0);
}

export function estimatedPR(set) {
  const reps = Number(set.reps) || 0;
  const weight = Number(set.weight) || 0;
  return Math.round(weight * (1 + reps / 30));
}

export function startOfWeek(date) {
  const copy = new Date(date);
  const diff = (copy.getDay() + 6) % 7;
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - diff);
  return copy;
}

function findPRs(sessions) {
  const best = new Map();
  const prs = [];
  sessions.forEach((session) => {
    session.exercises.forEach((exercise) => {
      exercise.sets.forEach((set) => {
        const value = estimatedPR(set);
        if (!value) return;
        const previous = best.get(exercise.id) || 0;
        if (value > previous) {
          best.set(exercise.id, value);
          prs.unshift({ exercise: exercise.name, value, date: session.date });
        }
      });
    });
  });
  return prs.slice(0, 8);
}

function countMuscles(sessions) {
  const counts = {};
  sessions.forEach((session) => session.focus.forEach((muscle) => {
    counts[muscle] = (counts[muscle] || 0) + 1;
  }));
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function trend(values) {
  if (values.length < 2) return 0;
  const last = values.at(-1);
  const previous = values.at(-2) || 1;
  return Math.round(((last - previous) / Math.max(previous, 1)) * 100);
}

function sum(values) {
  return values.reduce((a, b) => a + (Number(b) || 0), 0);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
