/**
 * background.ts — SnipLogic MV3 service worker
 *
 * Storage schema:
 *   token: string | undefined
 *   user: { email: string } | undefined
 *   apiUrl: string  (default: https://sniplogic.yourdomain.com)
 *   shortcuts: string[]  (list of shortcut strings, e.g. ["/noteadreceipt", ...])
 *   shortcutsLastFetched: number  (timestamp ms)
 */

export {};

const DEFAULT_API_URL = 'https://sniplogic.yourdomain.com';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface StorageData {
  token?: string;
  user?: { email: string };
  apiUrl?: string;
  shortcuts?: string[];
  shortcutsLastFetched?: number;
}

async function getStorage(): Promise<StorageData> {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      ['token', 'user', 'apiUrl', 'shortcuts', 'shortcutsLastFetched'],
      (result) => resolve(result as StorageData)
    );
  });
}

async function setStorage(data: Partial<StorageData>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });
}

async function clearAuth(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['token', 'user', 'shortcuts', 'shortcutsLastFetched'], resolve);
  });
}

async function fetchShortcuts(token: string, apiUrl: string): Promise<string[]> {
  const base = apiUrl || DEFAULT_API_URL;
  const resp = await fetch(`${base}/api/v1/snippets/shortcuts`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (resp.status === 401) {
    await clearAuth();
    return [];
  }

  if (!resp.ok) throw new Error(`shortcuts fetch failed: ${resp.status}`);

  const data = (await resp.json()) as Array<{ shortcut: string | null; name: string }>;
  return data.map((s) => s.shortcut).filter((s): s is string => s !== null);
}

async function getShortcuts(forceRefresh = false): Promise<string[]> {
  const storage = await getStorage();
  if (!storage.token) return [];

  const now = Date.now();
  const stale =
    !storage.shortcuts ||
    !storage.shortcutsLastFetched ||
    now - storage.shortcutsLastFetched > CACHE_TTL_MS;

  if (!forceRefresh && !stale && storage.shortcuts) {
    return storage.shortcuts;
  }

  const apiUrl = storage.apiUrl || DEFAULT_API_URL;
  const shortcuts = await fetchShortcuts(storage.token, apiUrl);
  await setStorage({ shortcuts, shortcutsLastFetched: now });
  return shortcuts;
}

interface GetShortcutsMessage { type: 'GET_SHORTCUTS' }
interface ExpandShortcutMessage { type: 'EXPAND_SHORTCUT'; shortcut: string }
interface GetStatusMessage { type: 'GET_STATUS' }

type Message = GetShortcutsMessage | ExpandShortcutMessage | GetStatusMessage;

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  // Must return true synchronously to keep channel open for async response
  (async () => {
    const storage = await getStorage();

    if (message.type === 'GET_SHORTCUTS') {
      try {
        const shortcuts = await getShortcuts();
        sendResponse({ shortcuts });
      } catch {
        sendResponse({ shortcuts: [] });
      }
      return;
    }

    if (message.type === 'EXPAND_SHORTCUT') {
      if (!storage.token) {
        sendResponse({ type: 'NOT_LOGGED_IN' });
        return;
      }
      const apiUrl = storage.apiUrl || DEFAULT_API_URL;
      try {
        const resp = await fetch(
          `${apiUrl}/api/v1/snippets/shortcut/${encodeURIComponent(message.shortcut)}`,
          { headers: { Authorization: `Bearer ${storage.token}` } }
        );

        if (resp.status === 401) {
          await clearAuth();
          sendResponse({ type: 'NOT_LOGGED_IN' });
          return;
        }

        if (resp.status === 404) {
          sendResponse({ type: 'NOT_FOUND' });
          return;
        }

        if (!resp.ok) {
          sendResponse({ type: 'NOT_FOUND' });
          return;
        }

        const snippet = (await resp.json()) as {
          content: string;
          htmlContent: string | null;
          name: string;
        };
        sendResponse({
          type: 'SNIPPET',
          content: snippet.content,
          htmlContent: snippet.htmlContent,
          name: snippet.name,
        });
      } catch {
        sendResponse({ type: 'NOT_FOUND' });
      }
      return;
    }

    if (message.type === 'GET_STATUS') {
      const shortcuts = storage.shortcuts ?? [];
      sendResponse({
        loggedIn: !!storage.token,
        shortcutCount: shortcuts.length,
        userEmail: storage.user?.email ?? null,
      });
      return;
    }
  })();

  return true; // keep message channel open
});
