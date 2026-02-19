import { useEffect, useRef, useState } from 'react'
import { useCreateFolder, useRenameFolder } from '../../api/folders'
import styles from './FolderModal.module.css'

interface Props {
  mode: 'create' | 'rename'
  workspaceId: string
  folderId?: string
  currentName?: string
  onClose: () => void
}

export default function FolderModal({ mode, workspaceId, folderId, currentName, onClose }: Props) {
  const [name, setName] = useState(currentName ?? '')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const createMutation = useCreateFolder(workspaceId)
  const renameMutation = useRenameFolder(workspaceId)
  const isPending = createMutation.isPending || renameMutation.isPending

  useEffect(() => {
    inputRef.current?.select()
  }, [])

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
    const trimmed = name.trim()
    if (!trimmed) return

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(trimmed)
      } else {
        await renameMutation.mutateAsync({ id: folderId!, name: trimmed })
      }
      onClose()
    } catch {
      setError('Something went wrong. Please try again.')
    }
  }

  return (
    <div
      className={styles.overlay}
      onClick={(e) => { if (e.target === e.currentTarget && !isPending) onClose() }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="folder-modal-title">
        <div className={styles.header}>
          <h2 id="folder-modal-title" className={styles.title}>
            {mode === 'create' ? 'New Folder' : 'Rename Folder'}
          </h2>
          <button className={styles.closeBtn} onClick={onClose} disabled={isPending} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Folder name"
            required
            disabled={isPending}
            aria-label="Folder name"
          />

          {error && <p className={styles.errorMsg}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isPending}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={isPending || !name.trim()}>
              {isPending ? 'Saving…' : mode === 'create' ? 'Create' : 'Rename'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
