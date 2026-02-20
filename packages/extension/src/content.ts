/**
 * content.ts — SnipLogic content script
 *
 * On load: fetches known shortcuts from background service worker.
 * On Tab keydown (capture phase): checks if text before cursor ends with a known
 * shortcut. If so, prevents default Tab behavior and expands the snippet.
 *
 * Supported targets:
 *   - <input type="text"> and similar
 *   - <textarea>
 *   - contenteditable elements (Gmail, Notion, Word Online, etc.)
 *
 * Not supported: Google Docs (canvas-based renderer).
 */

const SHORTCUT_RE = /\/\/([a-zA-Z0-9_-]+)$/;
const VAR_RE = /\{\{([a-zA-Z0-9_]+)\}\}/g;

// Sentinel character used to mark cursor position during plain-text insertion
const CURSOR_SENTINEL = '\u2038'; // ‸ (caret)

let knownShortcuts = new Set<string>();

interface CachedVariable {
  name: string;
  value: string;
  scope: 'USER' | 'WORKSPACE';
  workspaceId?: string | null;
}

let cachedVariables: CachedVariable[] = [];

// ── Helpers ─────────────────────────────────────────────────────────────────

function isInputLike(el: Element): el is HTMLInputElement | HTMLTextAreaElement {
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
}

function isContentEditable(el: Element): boolean {
  return (el as HTMLElement).isContentEditable;
}

/** Returns the text before the cursor in an input/textarea. */
function getTextBeforeCursorInInput(el: HTMLInputElement | HTMLTextAreaElement): string {
  const pos = el.selectionStart ?? el.value.length;
  return el.value.substring(0, pos);
}

/** Returns the text before the cursor in a contenteditable element. */
function getTextBeforeCursorInEditable(): string {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return '';
  const range = sel.getRangeAt(0);
  const preRange = range.cloneRange();
  preRange.selectNodeContents(range.startContainer);
  preRange.setEnd(range.startContainer, range.startOffset);
  return preRange.toString();
}

/**
 * Extracts a trailing shortcut from text typed with the // prefix.
 * Returns both forms:
 *   typed  — what the user typed, e.g. "//sig" (used to know how many chars to delete)
 *   lookup — the DB shortcut key, e.g. "/sig" (used for API + knownShortcuts lookup)
 */
function extractTrailingShortcut(text: string): { typed: string; lookup: string } | null {
  const m = SHORTCUT_RE.exec(text);
  if (!m) return null;
  return { typed: `//${m[1]}`, lookup: `/${m[1]}` };
}

/** Escape HTML special characters in a variable value before inserting into HTML content. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Variable substitution ────────────────────────────────────────────────────

/** Resolve all dynamic date/time variables. */
function resolveDynamicVars(): Record<string, string> {
  const now = new Date();

  const fmtDate = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-US', opts).format(now);

  return {
    datelong: fmtDate({ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    dateshort: fmtDate({ month: '2-digit', day: '2-digit', year: 'numeric' }),
    dateiso: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    datemedium: fmtDate({ month: 'short', day: 'numeric', year: 'numeric' }),
    time: fmtDate({ hour: 'numeric', minute: '2-digit', hour12: true }),
    time24: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    datetime: fmtDate({ month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }),
    dayofweek: fmtDate({ weekday: 'long' }),
    month: fmtDate({ month: 'long' }),
    year: String(now.getFullYear()),
  };
}

/**
 * Apply variable substitution to a text string.
 * - Static variables: from cachedVariables (USER scope overrides WORKSPACE for same name)
 * - Dynamic variables: date/time computed at call time
 * - {{cursor}}: replaced with CURSOR_SENTINEL for plain text, or handled by caller for HTML
 * - {{clipboard}}: replaced with clipboardText if provided
 * - Unknown tokens: left as-is
 */
function applyStaticAndDynamic(
  text: string,
  isHtml: boolean,
  clipboardText: string
): string {
  // Build var map: WORKSPACE first, then USER overrides
  const varMap = new Map<string, string>();

  // 1. Workspace-scoped variables
  for (const v of cachedVariables) {
    if (v.scope === 'WORKSPACE') {
      varMap.set(v.name, v.value);
    }
  }
  // 2. User-scoped overrides
  for (const v of cachedVariables) {
    if (v.scope === 'USER') {
      varMap.set(v.name, v.value);
    }
  }

  // 3. Dynamic variables
  const dynamic = resolveDynamicVars();
  for (const [k, v] of Object.entries(dynamic)) {
    varMap.set(k, v);
  }

  return text.replace(VAR_RE, (_match, token: string) => {
    if (token === 'cursor') {
      // Special: for HTML we use a span marker; for plain text a sentinel char
      return isHtml ? '<span id="sniplogic-cursor"></span>' : CURSOR_SENTINEL;
    }

    if (token === 'clipboard') {
      return isHtml ? escapeHtml(clipboardText) : clipboardText;
    }

    if (varMap.has(token)) {
      const val = varMap.get(token)!;
      return isHtml ? escapeHtml(val) : val;
    }

    // Unknown token — leave as-is
    return _match;
  });
}

// ── Replacement ──────────────────────────────────────────────────────────────

/**
 * Replace the trailing shortcut in an <input> or <textarea> with plain text.
 * Handles {{cursor}} positioning via sentinel character.
 * Uses execCommand('insertText') to preserve undo history and trigger React/Vue
 * synthetic events. Falls back to direct .value manipulation + dispatched event.
 */
function replaceInInput(
  el: HTMLInputElement | HTMLTextAreaElement,
  shortcut: string,
  content: string
): void {
  const hasCursor = content.includes(CURSOR_SENTINEL);
  const cursorPos = el.selectionStart ?? el.value.length;
  const textBefore = el.value.substring(0, cursorPos);
  const shortcutStart = textBefore.length - shortcut.length;

  el.focus();
  el.setSelectionRange(shortcutStart, cursorPos);

  const inserted = document.execCommand('insertText', false, content);
  if (!inserted) {
    // Fallback for browsers where execCommand is not supported
    const before = el.value.substring(0, shortcutStart);
    const after = el.value.substring(cursorPos);
    el.value = before + content + after;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Position cursor at sentinel, then remove it
  if (hasCursor) {
    const sentinelIdx = el.value.indexOf(CURSOR_SENTINEL);
    if (sentinelIdx !== -1) {
      el.setSelectionRange(sentinelIdx, sentinelIdx + 1);
      document.execCommand('delete', false);
      el.setSelectionRange(sentinelIdx, sentinelIdx);
    }
  }
}

/**
 * Replace the trailing shortcut in a contenteditable element.
 * Uses htmlContent (rich text) if available, else plain text.
 * Handles {{cursor}} via a span marker in HTML or sentinel char in plain text.
 */
function replaceInEditable(shortcut: string, content: string, htmlContent: string | null): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  const offset = range.startOffset;

  if (node.nodeType !== Node.TEXT_NODE) return;

  const textBefore = node.textContent?.substring(0, offset) ?? '';
  const shortcutStart = textBefore.length - shortcut.length;
  if (shortcutStart < 0) return;

  // Select just the shortcut text in the current text node
  const replaceRange = document.createRange();
  replaceRange.setStart(node, shortcutStart);
  replaceRange.setEnd(node, offset);
  sel.removeAllRanges();
  sel.addRange(replaceRange);

  if (htmlContent) {
    document.execCommand('insertHTML', false, htmlContent);

    // Position cursor at the marker span if present
    const cursorSpan = document.getElementById('sniplogic-cursor');
    if (cursorSpan) {
      const cursorRange = document.createRange();
      cursorRange.setStartAfter(cursorSpan);
      cursorRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(cursorRange);
      cursorSpan.parentNode?.removeChild(cursorSpan);
    }
  } else {
    // Plain text — use sentinel for cursor positioning
    const hasCursor = content.includes(CURSOR_SENTINEL);
    document.execCommand('insertText', false, content);

    if (hasCursor) {
      // Walk the DOM to find and remove the sentinel, place cursor there
      const editableRoot = sel.anchorNode?.parentElement?.closest('[contenteditable]');
      if (editableRoot) {
        placeCursorAfterSentinel(editableRoot as HTMLElement);
      }
    }
  }
}

/** Walk text nodes to find sentinel char, place cursor there, remove it. */
function placeCursorAfterSentinel(root: HTMLElement): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const idx = node.textContent?.indexOf(CURSOR_SENTINEL) ?? -1;
    if (idx !== -1) {
      // Remove the sentinel
      node.textContent =
        (node.textContent ?? '').substring(0, idx) +
        (node.textContent ?? '').substring(idx + 1);
      // Place cursor
      const sel = window.getSelection();
      if (sel) {
        const r = document.createRange();
        r.setStart(node, idx);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
      }
      break;
    }
  }
}

// ── Extension context guard ───────────────────────────────────────────────────

/** Returns false when the extension has been reloaded and the old context is stale. */
function isContextValid(): boolean {
  try {
    return !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

// ── Tab handler ──────────────────────────────────────────────────────────────

document.addEventListener(
  'keydown',
  (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const target = e.target;
    if (!(target instanceof Element)) return;

    let textBeforeCursor: string;
    let targetType: 'input' | 'editable' | null = null;

    if (isInputLike(target)) {
      textBeforeCursor = getTextBeforeCursorInInput(target);
      targetType = 'input';
    } else if (isContentEditable(target)) {
      textBeforeCursor = getTextBeforeCursorInEditable();
      targetType = 'editable';
    } else {
      return;
    }

    const match = extractTrailingShortcut(textBeforeCursor);
    if (!match || !knownShortcuts.has(match.lookup)) return;

    // Guard: if extension was reloaded this tab's content script is stale — bail silently
    if (!isContextValid()) return;

    // We have a match — prevent default Tab navigation
    e.preventDefault();
    e.stopPropagation();

    // Ask the background to expand it (lookup uses DB key e.g. "/sig")
    try {
      chrome.runtime.sendMessage(
        { type: 'EXPAND_SHORTCUT', shortcut: match.lookup },
        async (response: { type: string; content?: string; htmlContent?: string | null; name?: string }) => {
          try {
            if (chrome.runtime.lastError) return; // service worker unavailable
            if (!response || response.type !== 'SNIPPET') return;
            const { content, htmlContent } = response;
            if (!content) return;

            // Resolve clipboard content (async) before substitution
            let clipboardText = '';
            if (content.includes('{{clipboard}}') || (htmlContent && htmlContent.includes('{{clipboard}}'))) {
              try {
                clipboardText = await navigator.clipboard.readText();
              } catch {
                // Clipboard API denied or unavailable — use empty string
                clipboardText = '';
              }
            }

            const resolvedContent = applyStaticAndDynamic(content, false, clipboardText);
            const resolvedHtml = htmlContent
              ? applyStaticAndDynamic(htmlContent, true, clipboardText)
              : null;

            // Use match.typed ("//sig") for deletion length, match.lookup ("/sig") was for API
            if (targetType === 'input' && isInputLike(target)) {
              replaceInInput(target, match.typed, resolvedContent);
            } else if (targetType === 'editable') {
              replaceInEditable(match.typed, resolvedContent, resolvedHtml);
            }
          } catch {
            // Swallow errors from stale extension context in async callback
          }
        }
      );
    } catch {
      // sendMessage itself threw — extension context already invalidated
    }
  },
  true // capture phase — fires before site Tab handlers
);

// ── Init: load shortcuts + variables directly from storage ───────────────────

try {
  chrome.storage.local.get(['shortcuts', 'variables'], (result: { shortcuts?: string[]; variables?: CachedVariable[] }) => {
    try {
      if (chrome.runtime.lastError) return;
      if (Array.isArray(result.shortcuts)) {
        knownShortcuts = new Set(result.shortcuts);
      }
      if (Array.isArray(result.variables)) {
        cachedVariables = result.variables;
      }
    } catch { /* stale context */ }
  });
} catch { /* stale context */ }

// Auto-update whenever the popup logs in or refreshes
try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.shortcuts?.newValue) {
      knownShortcuts = new Set(changes.shortcuts.newValue as string[]);
    }
    if (changes.variables?.newValue) {
      cachedVariables = changes.variables.newValue as CachedVariable[];
    }
  });
} catch { /* stale context */ }
