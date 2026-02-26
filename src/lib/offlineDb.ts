const DB_NAME = "ai-student-companion";
const DB_VERSION = 1;

type StoreName = "summaries" | "flashcards" | "quizzes";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("summaries")) db.createObjectStore("summaries", { keyPath: "id" });
      if (!db.objectStoreNames.contains("flashcards")) db.createObjectStore("flashcards", { keyPath: "id" });
      if (!db.objectStoreNames.contains("quizzes")) db.createObjectStore("quizzes", { keyPath: "id" });
    };
  });
}

export async function cacheData<T extends { id: string }>(store: StoreName, items: T[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(store, "readwrite");
  const os = tx.objectStore(store);
  items.forEach((item) => os.put(item));
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedData<T>(store: StoreName): Promise<T[]> {
  const db = await openDB();
  const tx = db.transaction(store, "readonly");
  const os = tx.objectStore(store);
  const request = os.getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

export async function clearCachedStore(store: StoreName): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).clear();
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function isOnline(): boolean {
  return navigator.onLine;
}
