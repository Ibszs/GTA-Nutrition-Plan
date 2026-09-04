export function createStorage(candidate) {
  try {
    const storage = candidate ?? globalThis.localStorage;
    const probe = '__gta_storage_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return { storage, persistent: true };
  } catch (_) {
    const values = new Map();
    return {
      persistent: false,
      storage: {
        getItem: (key) => values.has(key) ? values.get(key) : null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: (key) => values.delete(key),
      },
    };
  }
}

export function loadJson(storage, key, fallback) {
  const stored = storage.getItem(key);
  if (stored === null) return structuredClone(fallback);
  try {
    return JSON.parse(stored);
  } catch (_) {
    return structuredClone(fallback);
  }
}

export function saveJson(storage, key, value) {
  storage.setItem(key, JSON.stringify(value));
}

export function makeId(cryptoLike = globalThis.crypto) {
  if (cryptoLike?.randomUUID) return cryptoLike.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export async function copyText(text, clipboard = globalThis.navigator?.clipboard) {
  if (!clipboard?.writeText) return false;
  try {
    await clipboard.writeText(text);
    return true;
  } catch (_) {
    return false;
  }
}

export function downloadText(filename, text, type = 'text/plain', environment = {}) {
  try {
    const documentObject = environment.document ?? globalThis.document;
    const urlObject = environment.URL ?? globalThis.URL;
    const BlobObject = environment.Blob ?? globalThis.Blob;
    const schedule = environment.schedule ?? globalThis.setTimeout;
    const blob = new BlobObject([text], { type });
    const url = urlObject.createObjectURL(blob);
    const anchor = documentObject.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    documentObject.body?.append(anchor);
    anchor.click();
    anchor.remove?.();
    schedule(() => urlObject.revokeObjectURL(url), 1000);
    return true;
  } catch (_) {
    return false;
  }
}

