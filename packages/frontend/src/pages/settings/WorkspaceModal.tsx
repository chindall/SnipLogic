import { useState, useEffect } from 'react'
import { useCreateWorkspace, useRenameWorkspace, type ManagedWorkspace } from '../../api/workspaces'
import styles from './WorkspaceModal.module.css'

interface Props {
  /** If provided, we are renaming an existing workspace */
  workspace?: ManagedWorkspace
  onClose: () => void
}

export default function WorkspaceModal({ workspace, onClose }: Props) {
  const [name, setName] = useState(workspace?.name ?? '')
  const [error, setError] = useState<string | null>(null)

  const createMutation = useCreateWorkspace()
  const renameMutation = useRenameWorkspace()

  const isPending = createMutation.isPending || renameMutation.isPending
  const isEdit = !!workspace

  useEffect(() => {
    setName(workspace?.name ?? '')
  }, [workspace])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const trimmed = name.trim()
    if (!trimmed) { setError('Name is required.'); return }
    try {
      if (isEdit && workspace) {
        await renameMutation.mutateAsync({ id: workspace.id, name: trimmed })
      } else {
        await createMutation.mutateAsync({ name: trimmed })
      }
      onClose()
    } catch {
      setError(isEdit ? 'Failed to rename workspace.' : 'Failed to create workspace.')
    }
  }

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{isEdit ? 'Rename Workspace' : 'New Workspace'}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          <div className={styles.field}>
            <label className={styles.label}>
              Workspace name <span className={styles.req}>*</span>
            </label>
            <input
              className={styles.input}
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null) }}
              placeholder="e.g. Immigration Templates"
              autoFocus
              disabled={isPending}
            />
          </div>
          {error && <p className={styles.errorMsg}>{error}</p>}
          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isPending}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryBtn} disabled={isPending || !name.trim()}>
              {isPending ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save' : 'Create Workspace')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
