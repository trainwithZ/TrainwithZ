const DB_NAME = "trainwith-z";
const DB_VERSION = 2;

export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("sessions")) {
        const sessions = db.createObjectStore("sessions", { keyPath: "id" });
        sessions.createIndex("date", "date");
      }
      if (!db.objectStoreNames.contains("exercises")) db.createObjectStore("exercises", { keyPath: "id" });
      if (!db.objectStoreNames.contains("photos")) {
        const photos = db.createObjectStore("photos", { keyPath: "id" });
        photos.createIndex("date", "date");
      }
      if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings", { keyPath: "key" });
      if (!db.objectStoreNames.contains("inbody")) {
        const inbody = db.createObjectStore("inbody", { keyPath: "id" });
        inbody.createIndex("date", "date");
      }
      if (!db.objectStoreNames.contains("nutrition")) {
        const nutrition = db.createObjectStore("nutrition", { keyPath: "date" });
        nutrition.createIndex("date", "date");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAll(store) {
  const db = await openDB();
  return tx(db, store, "readonly", (objectStore) => objectStore.getAll());
}

export async function put(store, value) {
  const db = await openDB();
  return tx(db, store, "readwrite", (objectStore) => objectStore.put(value));
}

export async function remove(store, key) {
  const db = await openDB();
  return tx(db, store, "readwrite", (objectStore) => objectStore.delete(key));
}

export async function seedExercises(items) {
  const existing = await getAll("exercises");
  if (existing.length) return existing;
  await Promise.all(items.map((item) => put("exercises", item)));
  return items;
}

function tx(db, store, mode, operation) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, mode);
    const request = operation(transaction.objectStore(store));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => reject(transaction.error);
  });
}

export function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
