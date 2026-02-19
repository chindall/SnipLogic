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

const SHORTCUT_RE = /\/([a-zA-Z0-9_-]+)$/;

let knownShortcuts = new Set<string>();

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

/** Extracts a trailing shortcut string (e.g. "/noteadreceipt") from text. */
function extractTrailingShortcut(text: string): string | null {
  const m = SHORTCUT_RE.exec(text);
  return m ? `/${m[1]}` : null;
}

// ── Replacement ──────────────────────────────────────────────────────────────

/**
 * Replace the trailing shortcut in an <input> or <textarea> with plain text.
 * Uses execCommand('insertText') to preserve undo history and trigger React/Vue
 * synthetic events. Falls back to direct .value manipulation + dispatched event.
 */
function replaceInInput(
  el: HTMLInputElement | HTMLTextAreaElement,
  shortcut: string,
  content: string
): void {
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
    const newCursor = shortcutStart + content.length;
    el.setSelectionRange(newCursor, newCursor);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

/**
 * Replace the trailing shortcut in a contenteditable element.
 * Uses htmlContent (rich text) if available, else plain text.
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
  } else {
    document.execCommand('insertText', false, content);
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

    const shortcut = extractTrailingShortcut(textBeforeCursor);
    if (!shortcut || !knownShortcuts.has(shortcut)) return;

    // We have a match — prevent default Tab navigation
    e.preventDefault();
    e.stopPropagation();

    // Ask the background to expand it
    chrome.runtime.sendMessage(
      { type: 'EXPAND_SHORTCUT', shortcut },
      (response: { type: string; content?: string; htmlContent?: string | null; name?: string }) => {
        if (chrome.runtime.lastError) return; // service worker unavailable
        if (!response || response.type !== 'SNIPPET') return;
        const { content, htmlContent } = response;
        if (!content) return;

        if (targetType === 'input' && isInputLike(target)) {
          replaceInInput(target, shortcut, content);
        } else if (targetType === 'editable') {
          replaceInEditable(shortcut, content, htmlContent ?? null);
        }
      }
    );
  },
  true // capture phase — fires before site Tab handlers
);

// ── Init: load shortcuts directly from storage (no service worker dependency) ─

chrome.storage.local.get(['shortcuts'], (result: { shortcuts?: string[] }) => {
  if (chrome.runtime.lastError) return; // storage read failed — ignore
  if (Array.isArray(result.shortcuts)) {
    knownShortcuts = new Set(result.shortcuts);
  }
});

// Auto-update whenever the popup logs in or refreshes shortcuts
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.shortcuts?.newValue) {
    knownShortcuts = new Set(changes.shortcuts.newValue as string[]);
  }
});
