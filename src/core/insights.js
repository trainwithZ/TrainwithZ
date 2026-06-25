import { getCyclePhase } from "../data/program.js";

export function dailyInsight({ analytics, todayWorkout, lastSession }) {
  const phase = getCyclePhase();
  if (!todayWorkout) {
    return "Recovery day. Keep the rhythm alive with mobility, hydration, and a clean sleep window.";
  }
  if (!lastSession) {
    return `${todayWorkout.title} is ready. Log the first session cleanly so your local AI has a baseline.`;
  }
  if (phase.label === "Deload") {
    return `${phase.note} Your goal is quality, not proving anything today.`;
  }
  if (analytics.volumeTrend > 8) {
    return "Volume is climbing. Keep your first working set calm so the final set stays honest.";
  }
  if (analytics.volumeTrend < -12) {
    return "Recent output dipped. Start with a conservative load and win the session through consistency.";
  }
  return `Today favors ${todayWorkout.focus[0].toLowerCase()} quality. Progress one clean variable: load, reps, or control.`;
}

export function weeklyInsight(analytics) {
  if (!analytics.completed) return "No completed workouts this week yet. The fastest reset is one focused session.";
  const topMuscle = analytics.muscleFocus[0]?.[0] || "strength";
  const delta = analytics.totalVolume - analytics.previousVolume;
  const direction = delta >= 0 ? "up" : "down";
  return `You completed ${analytics.completed} sessions with ${topMuscle.toLowerCase()} leading the week. Volume is ${direction} ${Math.abs(delta).toLocaleString()} lb versus last week; next week should protect recovery while nudging one lift forward.`;
}

export function sessionReflection(session) {
  if (!session) return "";
  const prCount = session.prs?.length || 0;
  if (prCount) return `${prCount} PR signal${prCount > 1 ? "s" : ""}. Let that count, then recover like it matters.`;
  if (session.duration < 35) return "Efficient session. Short can still be elite when the work is precise.";
  return "Strong work logged. Your future self now has better data.";
}
