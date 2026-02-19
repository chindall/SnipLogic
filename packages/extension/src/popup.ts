/**
 * popup.ts — SnipLogic extension popup
 *
 * Shows either:
 *   - Login view: email/password form + collapsible API settings
 *   - Logged-in view: status badge, user email, shortcut count, refresh/sign-out
 */

export {};

const DEFAULT_API_URL = 'https://sniplogic.yourdomain.com';

// ── DOM helpers ──────────────────────────────────────────────────────────────

function el<T extends HTMLElement>(id: string): T {
  const elem = document.getElementById(id);
  if (!elem) throw new Error(`Element #${id} not found`);
  return elem as T;
}

// ── Storage ──────────────────────────────────────────────────────────────────

interface StorageData {
  token?: string;
  user?: { email: string };
  apiUrl?: string;
  shortcuts?: string[];
}

function getStorage(): Promise<StorageData> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['token', 'user', 'apiUrl', 'shortcuts'], (r) =>
      resolve(r as StorageData)
    );
  });
}

function setStorage(data: Partial<StorageData>): Promise<void> {
  return new Promise((resolve) => chrome.storage.local.set(data, resolve));
}

function clearStorage(): Promise<void> {
  return new Promise((resolve) =>
    chrome.storage.local.remove(['token', 'user', 'shortcuts', 'shortcutsLastFetched'], resolve)
  );
}

// ── Views ────────────────────────────────────────────────────────────────────

function showLogin(): void {
  el('view-login').style.display = '';
  el('view-loggedin').style.display = 'none';
}

function showLoggedIn(email: string, shortcutCount: number): void {
  el('view-login').style.display = 'none';
  el('view-loggedin').style.display = '';
  el('user-email').textContent = email;
  el('shortcut-count').textContent = `${shortcutCount} shortcut${shortcutCount !== 1 ? 's' : ''} loaded`;
}

function showError(msg: string): void {
  const errEl = el('login-error');
  errEl.textContent = msg;
  errEl.style.display = '';
}

function hideError(): void {
  el('login-error').style.display = 'none';
}

// ── Shortcut fetching ────────────────────────────────────────────────────────

async function fetchAndCacheShortcuts(token: string, apiUrl: string): Promise<string[]> {
  const resp = await fetch(`${apiUrl}/api/v1/snippets/shortcuts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) return [];
  const data = (await resp.json()) as Array<{ shortcut: string | null }>;
  const shortcuts = data.map((s) => s.shortcut).filter((s): s is string => s !== null);
  await setStorage({ shortcuts, shortcutsLastFetched: Date.now() } as never);
  return shortcuts;
}

/** Broadcasts updated shortcuts to all content scripts. */
async function broadcastShortcuts(shortcuts: string[]): Promise<void> {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id == null) continue;
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'SHORTCUTS_REFRESHED', shortcuts });
    } catch {
      // Tab may not have a content script — ignore
    }
  }
}

// ── Login ────────────────────────────────────────────────────────────────────

async function handleLogin(): Promise<void> {
  const emailInput = el<HTMLInputElement>('email');
  const passwordInput = el<HTMLInputElement>('password');
  const loginBtn = el<HTMLButtonElement>('btn-login');

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError('Please enter your email and password.');
    return;
  }

  hideError();
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in…';

  try {
    const storage = await getStorage();
    const apiUrl = storage.apiUrl || DEFAULT_API_URL;

    const resp = await fetch(`${apiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const body = (await resp.json()) as { token?: string; user?: { email: string }; error?: string; message?: string };

    if (!resp.ok) {
      showError(body.message ?? body.error ?? 'Login failed. Check your credentials.');
      return;
    }

    if (!body.token || !body.user) {
      showError('Unexpected response from server.');
      return;
    }

    await setStorage({ token: body.token, user: body.user });

    // Warm the shortcut cache
    const shortcuts = await fetchAndCacheShortcuts(body.token, apiUrl);
    await broadcastShortcuts(shortcuts);

    showLoggedIn(body.user.email, shortcuts.length);
  } catch (err) {
    showError('Could not reach the SnipLogic server. Check API URL in settings.');
    console.error('[SnipLogic popup] login error:', err);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
  }
}

// ── Refresh ──────────────────────────────────────────────────────────────────

async function handleRefresh(): Promise<void> {
  const btn = el<HTMLButtonElement>('btn-refresh');
  btn.disabled = true;
  btn.textContent = 'Refreshing…';

  try {
    const storage = await getStorage();
    if (!storage.token) { showLogin(); return; }

    const apiUrl = storage.apiUrl || DEFAULT_API_URL;
    const shortcuts = await fetchAndCacheShortcuts(storage.token, apiUrl);
    await broadcastShortcuts(shortcuts);

    el('shortcut-count').textContent = `${shortcuts.length} shortcut${shortcuts.length !== 1 ? 's' : ''} loaded`;
  } catch (err) {
    console.error('[SnipLogic popup] refresh error:', err);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Refresh Shortcuts';
  }
}

// ── Sign out ─────────────────────────────────────────────────────────────────

async function handleSignOut(): Promise<void> {
  await clearStorage();
  showLogin();
}

// ── API settings ─────────────────────────────────────────────────────────────

async function handleSaveUrl(): Promise<void> {
  const urlInput = el<HTMLInputElement>('api-url');
  const url = urlInput.value.trim().replace(/\/$/, ''); // strip trailing slash
  if (!url) return;
  await setStorage({ apiUrl: url });
  el('btn-save-url').textContent = 'Saved!';
  setTimeout(() => { el('btn-save-url').textContent = 'Save'; }, 1500);
}

// ── Init ─────────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
  const storage = await getStorage();

  // Populate API URL input with saved value (or default)
  el<HTMLInputElement>('api-url').value = storage.apiUrl || DEFAULT_API_URL;

  if (storage.token && storage.user) {
    const count = storage.shortcuts?.length ?? 0;
    showLoggedIn(storage.user.email, count);
  } else {
    showLogin();
  }

  // Wire up events
  el('btn-login').addEventListener('click', handleLogin);
  el<HTMLInputElement>('password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });

  el('btn-refresh').addEventListener('click', handleRefresh);
  el('btn-signout').addEventListener('click', handleSignOut);
  el('btn-save-url').addEventListener('click', handleSaveUrl);

  el('btn-toggle-settings').addEventListener('click', () => {
    const panel = el('settings-panel');
    const btn = el('btn-toggle-settings');
    if (panel.style.display === 'none') {
      panel.style.display = '';
      btn.textContent = 'API Settings ▴';
    } else {
      panel.style.display = 'none';
      btn.textContent = 'API Settings ▾';
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
