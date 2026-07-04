const PDFJS_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs";
const PDFJS_WORKER_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs";

export async function parseWorkoutPdf(file) {
  if (!file || file.type !== "application/pdf") {
    throw new Error("Choose a PDF workout file.");
  }
  const buffer = await file.arrayBuffer();
  const text = await extractPdfText(buffer);
  const days = parseWorkoutText(text);
  if (!days.length || !days.some((day) => day.exercises.length)) {
    throw new Error("I could not find exercises in this PDF. Try a PDF with selectable text instead of scanned images.");
  }
  return {
    sourceName: file.name,
    text,
    days
  };
}

async function extractPdfText(buffer) {
  try {
    const pdfjs = await import(PDFJS_URL);
    pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(linesFromTextItems(content.items).join("\n"));
    }
    return pages.join("\n");
  } catch (error) {
    const fallback = extractRawPdfText(buffer);
    if (fallback.trim().length > 80) return fallback;
    throw new Error("PDF text reader could not load. Check your connection and try again.");
  }
}

function linesFromTextItems(items) {
  const rows = new Map();
  items.forEach((item) => {
    const y = Math.round(item.transform?.[5] || 0);
    const x = Math.round(item.transform?.[4] || 0);
    const row = rows.get(y) || [];
    row.push({ x, text: item.str || "" });
    rows.set(y, row);
  });
  return [...rows.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, row]) => row.sort((a, b) => a.x - b.x).map((item) => item.text).join(" ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function extractRawPdfText(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return binary
    .replace(/\\\(/g, "__LPAREN__")
    .replace(/\\\)/g, "__RPAREN__")
    .match(/\(([^()]{2,})\)/g)
    ?.map((chunk) => chunk.slice(1, -1).replaceAll("__LPAREN__", "(").replaceAll("__RPAREN__", ")"))
    .join("\n") || "";
}

function parseWorkoutText(text) {
  const rawLines = text
    .replace(/\r/g, "\n")
    .split("\n")
    .map(cleanLine)
    .filter(Boolean);
  const lines = mergeSplitExerciseLines(rawLines);
  const days = [];
  let current = makeDay("Imported Workout");

  lines.forEach((line) => {
    if (isNoise(line)) return;
    const heading = parseDayHeading(line);
    if (heading) {
      if (current.exercises.length) days.push(current);
      current = makeDay(heading);
      return;
    }
    const exercise = parseExerciseLine(line);
    if (exercise) current.exercises.push(exercise);
  });

  if (current.exercises.length) days.push(current);
  if (!days.length) {
    const fallbackExercises = lines.filter((line) => !isNoise(line)).slice(0, 20).map((line) => ({
      name: titleCase(line.replace(/\d+\s*x\s*\d+.*/i, "").trim() || line),
      muscle: inferMuscle(line),
      prescription: parsePrescription(line) || "3 x 10",
      tip: "Imported from PDF. Review the plan before training."
    }));
    if (fallbackExercises.length) days.push({ ...makeDay("Imported Workout"), exercises: fallbackExercises });
  }
  return days.slice(0, 14).map((day, index) => ({
    ...day,
    title: day.title || `Imported Day ${index + 1}`,
    exercises: day.exercises.slice(0, 32)
  }));
}

function mergeSplitExerciseLines(lines) {
  const merged = [];
  lines.forEach((line) => {
    const previous = merged.at(-1);
    if (previous && !parsePrescription(previous) && /^\d+\s*(x|sets?|reps?|rounds?|\d)/i.test(line)) {
      merged[merged.length - 1] = `${previous} ${line}`;
      return;
    }
    merged.push(line);
  });
  return merged;
}

function parseDayHeading(line) {
  const direct = line.match(/^(day|workout|session|week)\s*(\d+)?\s*[:\-–]?\s*(.+)?$/i);
  if (direct) return titleCase([direct[1], direct[2], direct[3]].filter(Boolean).join(" "));
  if (/^(legs|glutes|back|shoulders|arms|chest|push|pull|upper|lower|full body|cardio|core)(\s*[+&]\s*\w+)*$/i.test(line)) {
    return titleCase(line);
  }
  return null;
}

function parseExerciseLine(line) {
  if (line.length < 4 || line.length > 140) return null;
  const prescription = parsePrescription(line) || "";
  const likelyExercise = prescription || /press|squat|row|curl|raise|lunge|thrust|pulldown|deadlift|extension|kickback|plank|crunch|calf|fly|push|pull|rdl/i.test(line);
  if (!likelyExercise) return null;
  const name = cleanExerciseName(line, prescription);
  if (!name || name.length < 3 || /^\d+$/.test(name)) return null;
  return {
    name: titleCase(name),
    muscle: inferMuscle(name),
    prescription: prescription || "3 x 10",
    tip: "Imported from PDF. Adjust sets, reps, and notes if needed."
  };
}

function parsePrescription(line) {
  const normalized = line.replace(/[×]/g, "x");
  const setRep = normalized.match(/(?:^|\s)(\d{1,2})\s*x\s*([0-9]{1,3}(?:\s*[-–]\s*[0-9]{1,3})?|amrap|failure)(?:\s|$)/i);
  if (setRep) return `${setRep[1]} x ${setRep[2].replace(/\s+/g, "")}`;
  const setsOf = normalized.match(/(?:^|\s)(\d{1,2})\s*sets?\s*(?:of)?\s*([0-9]{1,3}(?:\s*[-–]\s*[0-9]{1,3})?|amrap|failure)/i);
  if (setsOf) return `${setsOf[1]} x ${setsOf[2].replace(/\s+/g, "")}`;
  const repsSets = normalized.match(/(?:^|\s)([0-9]{1,3})\s*reps?\s*(?:x|for)\s*(\d{1,2})\s*sets?/i);
  if (repsSets) return `${repsSets[2]} x ${repsSets[1]}`;
  const rounds = normalized.match(/(?:^|\s)(\d{1,2})\s*rounds?/i);
  if (rounds) return `${rounds[1]} rounds`;
  return "";
}

function cleanExerciseName(line, prescription) {
  let name = line;
  if (prescription) name = name.replace(new RegExp(escapeRegExp(prescription).replace(/x/i, "[x×]"), "i"), " ");
  name = name
    .replace(/\b(sets?|reps?|rounds?|rest|sec|seconds|mins?|minutes|kg|lb|lbs)\b/gi, " ")
    .replace(/\b\d{1,3}\s*[-–]\s*\d{1,3}\b/g, " ")
    .replace(/\b\d{1,3}\b/g, " ")
    .replace(/^[\s:;,.|\-–]+|[\s:;,.|\-–]+$/g, "")
    .replace(/\s+/g, " ");
  return name;
}

function inferMuscle(value) {
  const lower = value.toLowerCase();
  if (/glute|hip|thrust|kickback|abductor/.test(lower)) return "Glutes";
  if (/squat|lunge|leg|quad|extension|press/.test(lower)) return "Quads";
  if (/hamstring|rdl|deadlift|curl/.test(lower)) return "Hamstrings";
  if (/row|back|pulldown|lat|pull/.test(lower)) return "Back";
  if (/shoulder|raise|press|delt/.test(lower)) return "Shoulders";
  if (/bicep|tricep|curl|arm/.test(lower)) return "Arms";
  if (/core|abs|plank|crunch/.test(lower)) return "Core";
  if (/calf|calves/.test(lower)) return "Calves";
  if (/chest|bench|fly|push/.test(lower)) return "Chest";
  return "General";
}

function isNoise(line) {
  return /^(exercise|sets?|reps?|rest|tempo|notes?|page\s*\d+|warm\s*up|cool\s*down)$/i.test(line) ||
    /copyright|www\.|https?:\/\//i.test(line);
}

function makeDay(title) {
  return {
    title: titleCase(title),
    tone: "Imported from PDF. Review exercise details before training.",
    exercises: []
  };
}

function cleanLine(line) {
  return line
    .replace(/[•●▪]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s:;,.|\-–]+|[\s:;,.|\-–]+$/g, "")
    .trim();
}

function titleCase(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
    .replace(/\bDb\b/g, "DB")
    .replace(/\bRdl\b/g, "RDL");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
