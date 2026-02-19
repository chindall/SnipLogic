import { useEffect } from 'react'
import { type Snippet, useDeleteSnippet } from '../../api/snippets'
import styles from './DeleteConfirmDialog.module.css'

interface Props {
  snippet: Snippet
  onClose: () => void
}

export default function DeleteConfirmDialog({ snippet, onClose }: Props) {
  const deleteMutation = useDeleteSnippet(snippet.folderId)
  const isPending = deleteMutation.isPending

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isPending, onClose])

  async function handleConfirm() {
    await deleteMutation.mutateAsync(snippet.id)
    onClose()
  }

  return (
    <div
      className={styles.overlay}
      onClick={(e) => { if (e.target === e.currentTarget && !isPending) onClose() }}
    >
      <div className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="delete-title">
        <div className={styles.iconWrap}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </div>

        <h2 id="delete-title" className={styles.title}>Delete snippet?</h2>
        <p className={styles.body}>
          <strong>{snippet.name}</strong> will be permanently deleted. This cannot be undone.
        </p>

        {deleteMutation.isError && (
          <p className={styles.errorMsg}>Something went wrong. Please try again.</p>
        )}

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={isPending}>
            Cancel
          </button>
          <button className={styles.deleteBtn} onClick={handleConfirm} disabled={isPending}>
            {isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
