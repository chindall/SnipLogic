import type { Workspace } from '../../api/workspaces'
import styles from './Sidebar.module.css'

interface WorkspaceItemProps {
  workspace: Workspace
  isActive: boolean
  onClick: () => void
}

export default function WorkspaceItem({ workspace, isActive, onClick }: WorkspaceItemProps) {
  // Build a 1-2 letter avatar from the workspace name
  const initials = workspace.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <li
      className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <span className={styles.wsAvatar}>{initials}</span>
      <span className={styles.navItemLabel}>{workspace.name}</span>
    </li>
  )
}
