import type { Folder } from '../../api/folders'
import styles from './Sidebar.module.css'

interface FolderItemProps {
  folder: Folder
  isActive: boolean
  canWrite: boolean
  onClick: () => void
  onRename: (folder: Folder) => void
  onDelete: (folder: Folder) => void
}

export default function FolderItem({ folder, isActive, canWrite, onClick, onRename, onDelete }: FolderItemProps) {
  const count = folder._count?.snippets

  function handleRename(e: React.MouseEvent) {
    e.stopPropagation()
    onRename(folder)
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    onDelete(folder)
  }

  return (
    <li
      className={`${styles.navItem} ${styles.folderItem} ${isActive ? styles.navItemActive : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      {/* Folder icon */}
      <svg className={styles.folderIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>

      <span className={styles.navItemLabel}>{folder.name}</span>

      {/* Hover actions — only shown when user has write access */}
      {canWrite && <span className={styles.folderActions} onClick={(e) => e.stopPropagation()}>
        <button
          className={styles.folderActionBtn}
          onClick={handleRename}
          title="Rename folder"
          aria-label="Rename folder"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          className={`${styles.folderActionBtn} ${styles.folderActionBtnDanger}`}
          onClick={handleDelete}
          title="Delete folder"
          aria-label="Delete folder"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </span>}

      {/* Snippet count — visible at rest, hidden when actions show */}
      {count !== undefined && (
        <span className={styles.countBadge}>{count}</span>
      )}
    </li>
  )
}
