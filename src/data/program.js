export const PROGRAM = [
  {
    id: "day-1-legs",
    day: 1,
    title: "Legs",
    focus: ["Quads", "Glutes"],
    tone: "Build clean leg strength with controlled depth.",
    exercises: [
      ["single-leg-extension", "Single Leg Extension warm-up", "Quads", "2 x 15 each", "Slow squeeze, wake the knee path up."],
      ["deep-squat-bstance-db", "Deep Squat to B-Stance DB", "Glutes", "4 x 8", "Brace first, then drive through the full foot."],
      ["narrow-seated-leg-press", "Narrow Seated Leg Press", "Quads", "4 x 10", "Keep knees tracking clean and tempo honest."],
      ["narrow-walking-lunges", "Narrow Walking Lunges", "Glutes", "3 x 12 each", "Quiet upper body, long controlled steps."],
      ["single-leg-press-machine", "Single Leg Press Machine", "Quads", "3 x 10 each", "Match both sides; no rushed lockout."]
    ]
  },
  {
    id: "day-2-back-calves-core",
    day: 2,
    title: "Back + Calves + Core",
    focus: ["Back", "Calves", "Core"],
    tone: "Pull with precision and finish grounded.",
    exercises: [
      ["wide-grip-pulldown", "Wide Grip Pulldown", "Lats", "4 x 10", "Elbows down, ribs soft."],
      ["narrow-grip-pulldown", "Narrow Grip Pulldown", "Lats", "3 x 10", "Pull to upper chest without leaning back."],
      ["narrow-grip-row", "Narrow Grip Row", "Mid Back", "4 x 8", "Pause at the squeeze."],
      ["single-lat-pull", "Single Lat Pull", "Lats", "3 x 12 each", "Reach long, then tuck the elbow."],
      ["db-pullover", "DB Pullover", "Lats", "3 x 12", "Move from shoulders, not elbows."],
      ["calves", "Calves", "Calves", "4 x 12", "Full stretch, full rise."],
      ["core", "Core", "Core", "3 rounds", "Slow reps, no neck tension."]
    ]
  },
  {
    id: "day-3-shoulders-arms",
    day: 3,
    title: "Shoulders + Arms",
    focus: ["Shoulders", "Arms"],
    tone: "Shape, stability, and crisp upper-body output.",
    exercises: [
      ["side-raises", "Side Raises", "Shoulders", "4 x 12", "Lead with elbows, stop before traps take over."],
      ["cable-side-raises", "Cable Side Raises", "Shoulders", "3 x 12 each", "Smooth cable line, wrist relaxed."],
      ["shoulder-press", "Shoulder Press", "Shoulders", "4 x 8", "Stack ribs and hips before pressing."],
      ["around-the-world", "Around the World", "Shoulders", "3 x 10", "Light, elegant control."],
      ["front-raises", "Front Raises", "Shoulders", "3 x 12", "No swinging."],
      ["cable-triceps", "Cable Triceps", "Triceps", "3 x 12", "Pin elbows, finish strong."],
      ["cable-biceps", "Cable Biceps", "Biceps", "3 x 12", "Full curl without shoulder drift."]
    ]
  },
  {
    id: "day-4-glutes",
    day: 4,
    title: "Glutes",
    focus: ["Glutes"],
    tone: "Activation first, power second, confidence throughout.",
    exercises: [
      ["glute-activation", "Glute Activation", "Glutes", "3 rounds", "Make the working side obvious before loading."],
      ["kickbacks", "Kickbacks", "Glutes", "4 x 12 each", "Stop before lower back joins."],
      ["step-ups", "Step Ups", "Glutes", "3 x 10 each", "Drive through the box foot."],
      ["back-lunges", "Back Lunges", "Glutes", "3 x 10 each", "Step back softly, rise with control."],
      ["hip-thrust", "Hip Thrust", "Glutes", "5 x 8", "Posterior tilt, hard top squeeze."],
      ["cardio-intervals", "Cardio intervals", "Conditioning", "10 rounds", "Short, sharp, recover fully."]
    ]
  },
  {
    id: "day-5-hamstrings-lower",
    day: 5,
    title: "Hamstrings + Lower",
    focus: ["Hamstrings", "Glutes", "Core"],
    tone: "Hinge pattern quality and lower-body balance.",
    exercises: [
      ["rdl", "RDL", "Hamstrings", "4 x 8", "Hips back, lats packed, feel the stretch."],
      ["single-rdl", "Single RDL", "Hamstrings", "3 x 10 each", "Square hips, long spine."],
      ["wide-leg-press", "Wide Leg Press", "Glutes", "4 x 10", "Controlled depth without pelvis curl."],
      ["adductor", "Adductor", "Inner Thigh", "3 x 12", "Slow closing arc."],
      ["abductor", "Abductor", "Glutes", "3 x 15", "Pause out wide."],
      ["core-lower", "Core", "Core", "3 rounds", "Anti-extension over speed."]
    ]
  }
];

export const LIBRARY = PROGRAM.flatMap((day) =>
  day.exercises.map(([id, name, muscle, prescription, tip]) => ({
    id,
    name,
    muscle,
    prescription,
    tip,
    equipment: inferEquipment(name),
    editable: true
  }))
);

export function getCyclePhase(date = new Date()) {
  const anchor = new Date("2026-01-05T00:00:00");
  const week = Math.floor((date - anchor) / 604800000);
  const phase = ((week % 4) + 4) % 4;
  if (phase === 2) return { week: week + 1, label: "Deload", intensity: 0.72, note: "Light activation week. Move beautifully, leave reps in reserve." };
  if (phase === 3) return { week: week + 1, label: "Return", intensity: 0.92, note: "Return to intensity without chasing fatigue." };
  return { week: week + 1, label: "Build", intensity: 1, note: "Standard intensity. Progress one clean variable." };
}

export function getTodayWorkout(date = new Date()) {
  const weekday = date.getDay();
  const index = weekday === 0 || weekday === 6 ? null : Math.min(weekday - 1, PROGRAM.length - 1);
  return index === null ? null : PROGRAM[index];
}

function inferEquipment(name) {
  const lower = name.toLowerCase();
  if (lower.includes("cable")) return "Cable";
  if (lower.includes("db") || lower.includes("dumbbell")) return "Dumbbell";
  if (lower.includes("press") || lower.includes("pulldown") || lower.includes("row")) return "Machine";
  if (lower.includes("cardio")) return "Cardio";
  return "Body / Free";
}
