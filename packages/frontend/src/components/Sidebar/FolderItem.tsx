import type { Folder } from '../../api/folders'
import styles from './Sidebar.module.css'

interface FolderItemProps {
  folder: Folder
  isActive: boolean
  onClick: () => void
}

export default function FolderItem({ folder, isActive, onClick }: FolderItemProps) {
  const count = folder._count?.snippets

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

      {count !== undefined && (
        <span className={styles.countBadge}>{count}</span>
      )}
    </li>
  )
}
