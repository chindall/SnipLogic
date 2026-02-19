import { useEffect, useRef, useState } from 'react'
import { type Snippet, type SnippetInput, useCreateSnippet, useUpdateSnippet } from '../../api/snippets'
import styles from './SnippetModal.module.css'

interface Props {
  mode: 'create' | 'edit'
  folderId: string
  snippet?: Snippet
  onClose: () => void
}

export default function SnippetModal({ mode, folderId, snippet, onClose }: Props) {
  const [name, setName] = useState(snippet?.name ?? '')
  const [shortcut, setShortcut] = useState(snippet?.shortcut ?? '')
  const [content, setContent] = useState(snippet?.content ?? '')
  const [error, setError] = useState<string | null>(null)

  const nameRef = useRef<HTMLInputElement>(null)
  const createMutation = useCreateSnippet(folderId)
  const updateMutation = useUpdateSnippet(folderId)
  const isPending = createMutation.isPending || updateMutation.isPending

  // Focus name field on open
  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isPending, onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const data: SnippetInput = {
      name: name.trim(),
      shortcut: shortcut.trim() || null,
      content: content,
    }

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(data)
      } else {
        await updateMutation.mutateAsync({ id: snippet!.id, data })
      }
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg)
    }
  }

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget && !isPending) onClose() }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className={styles.header}>
          <h2 id="modal-title" className={styles.title}>
            {mode === 'create' ? 'New Snippet' : 'Edit Snippet'}
          </h2>
          <button className={styles.closeBtn} onClick={onClose} disabled={isPending} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="snippet-name" className={styles.label}>Name <span className={styles.required}>*</span></label>
            <input
              id="snippet-name"
              ref={nameRef}
              className={styles.input}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Note of Appearance Receipt"
              required
              disabled={isPending}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="snippet-shortcut" className={styles.label}>
              Shortcut <span className={styles.optional}>(optional)</span>
            </label>
            <input
              id="snippet-shortcut"
              className={`${styles.input} ${styles.inputMono}`}
              type="text"
              value={shortcut}
              onChange={(e) => setShortcut(e.target.value)}
              placeholder="e.g. /noteadreceipt"
              disabled={isPending}
            />
          </div>

          <div className={`${styles.field} ${styles.fieldGrow}`}>
            <label htmlFor="snippet-content" className={styles.label}>Content <span className={styles.required}>*</span></label>
            <textarea
              id="snippet-content"
              className={styles.textarea}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Snippet text goes here…"
              required
              disabled={isPending}
            />
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isPending}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={isPending || !name.trim() || !content.trim()}>
              {isPending ? 'Saving…' : mode === 'create' ? 'Create Snippet' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
