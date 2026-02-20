import { useState } from 'react'
import { useDeleteWorkspace, workspacesApi, type ManagedWorkspace } from '../../api/workspaces'
import styles from './WorkspaceDeleteDialog.module.css'

interface Props {
  workspace: ManagedWorkspace
  onClose: () => void
}

export default function WorkspaceDeleteDialog({ workspace, onClose }: Props) {
  const [error, setError] = useState<string | null>(null)
  const deleteMutation = useDeleteWorkspace()

  async function handleExport() {
    window.open(workspacesApi.exportUrl(workspace.id), '_blank')
  }

  async function handleDelete() {
    setError(null)
    try {
      await deleteMutation.mutateAsync(workspace.id)
      onClose()
    } catch {
      setError('Failed to delete workspace. Please try again.')
    }
  }

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.dialog} role="dialog" aria-modal="true">
        <div className={styles.dialogHeader}>
          <h2 className={styles.dialogTitle}>Delete Workspace</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.dialogBody}>
          <p className={styles.warning}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.warnIcon}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            This will permanently delete <strong>{workspace.name}</strong> and all its folders and snippets.
            This cannot be undone.
          </p>
          <p className={styles.hint}>
            We recommend exporting first to keep a backup.
          </p>
          {error && <p className={styles.errorMsg}>{error}</p>}
        </div>

        <div className={styles.dialogActions}>
          <button className={styles.exportBtn} onClick={handleExport} type="button">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export First
          </button>
          <div className={styles.rightActions}>
            <button className={styles.cancelBtn} onClick={onClose} disabled={deleteMutation.isPending}>
              Cancel
            </button>
            <button
              className={styles.deleteBtn}
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete Workspace'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
