import { useEffect } from 'react'
import { type Folder, useDeleteFolder } from '../../api/folders'
import styles from './FolderDeleteDialog.module.css'

interface Props {
  folder: Folder
  onClose: () => void
}

export default function FolderDeleteDialog({ folder, onClose }: Props) {
  const deleteMutation = useDeleteFolder(folder.workspaceId)
  const isPending = deleteMutation.isPending
  const snippetCount = folder._count?.snippets ?? 0

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isPending, onClose])

  async function handleConfirm() {
    await deleteMutation.mutateAsync(folder.id)
    onClose()
  }

  return (
    <div
      className={styles.overlay}
      onClick={(e) => { if (e.target === e.currentTarget && !isPending) onClose() }}
    >
      <div className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="folder-delete-title">
        <div className={styles.iconWrap}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </div>

        <h2 id="folder-delete-title" className={styles.title}>Delete folder?</h2>
        <p className={styles.body}>
          <strong>{folder.name}</strong> will be permanently deleted
          {snippetCount > 0 && (
            <> along with <strong>{snippetCount} {snippetCount === 1 ? 'snippet' : 'snippets'}</strong> inside it</>
          )}. This cannot be undone.
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
