import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useWorkspaces } from '../../api/workspaces'
import { useFolders } from '../../api/folders'
import { useUiStore } from '../../store/uiStore'
import { useAuthStore } from '../../store/authStore'
import WorkspaceItem from './WorkspaceItem'
import FolderItem from './FolderItem'
import styles from './Sidebar.module.css'

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, clearAuth } = useAuthStore()
  const { selectedWorkspaceId, selectedFolderId, setSelectedWorkspace, setSelectedFolder } = useUiStore()

  const { data: workspaces, isLoading: loadingWorkspaces } = useWorkspaces()
  const { data: folders, isLoading: loadingFolders } = useFolders(selectedWorkspaceId)

  // Auto-select the first workspace when data first loads
  useEffect(() => {
    if (workspaces && workspaces.length > 0 && !selectedWorkspaceId) {
      // Personal workspace first, then alphabetical
      const personal = workspaces.find((w) => w.isPersonal)
      setSelectedWorkspace(personal ? personal.id : workspaces[0].id)
    }
  }, [workspaces, selectedWorkspaceId, setSelectedWorkspace])

  function handleLogout() {
    clearAuth()
    navigate('/login')
  }

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : '?'

  const displayName = user ? `${user.firstName} ${user.lastName}` : ''

  return (
    <aside className={styles.sidebar}>
      {/* Logo zone */}
      <div className={styles.logoZone}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={styles.logoIcon}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" fill="#3b82f6"/>
          <rect x="14" y="3" width="7" height="7" rx="1.5" fill="#3b82f6" opacity="0.6"/>
          <rect x="3" y="14" width="7" height="7" rx="1.5" fill="#3b82f6" opacity="0.6"/>
          <rect x="14" y="14" width="7" height="7" rx="1.5" fill="#3b82f6" opacity="0.3"/>
        </svg>
        <span className={styles.logoText}>SnipLogic</span>
      </div>

      {/* Scrollable nav area */}
      <div className={styles.scrollable}>
        {/* Workspaces section */}
        <p className={styles.sectionLabel}>Workspaces</p>
        <ul className={styles.navList}>
          {loadingWorkspaces && (
            <>
              <li className={styles.skeletonItem} />
              <li className={styles.skeletonItem} />
            </>
          )}
          {workspaces?.map((ws) => (
            <WorkspaceItem
              key={ws.id}
              workspace={ws}
              isActive={ws.id === selectedWorkspaceId}
              onClick={() => setSelectedWorkspace(ws.id)}
            />
          ))}
        </ul>

        {/* Folders section — only shown when a workspace is selected */}
        {selectedWorkspaceId && (
          <>
            <div className={styles.sectionDivider} />
            <p className={styles.sectionLabel}>Folders</p>
            <ul className={styles.navList}>
              {loadingFolders && (
                <>
                  <li className={styles.skeletonItem} />
                  <li className={styles.skeletonItem} />
                  <li className={styles.skeletonItem} />
                </>
              )}
              {!loadingFolders && folders?.length === 0 && (
                <li className={styles.emptyFolders}>No folders yet</li>
              )}
              {folders?.map((folder) => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  isActive={folder.id === selectedFolderId}
                  onClick={() => setSelectedFolder(folder.id)}
                />
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Import button */}
      <button
        className={`${styles.importBtn} ${location.pathname === '/import' ? styles.importBtnActive : ''}`}
        onClick={() => navigate('/import')}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Import from TextBlaze
      </button>

      {/* User zone */}
      <div className={styles.userZone}>
        <div className={styles.avatar}>{initials}</div>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{displayName}</span>
          {user?.isGlobalAdmin && (
            <span className={styles.userRole}>Admin</span>
          )}
        </div>
        <button
          className={styles.signOutBtn}
          onClick={handleLogout}
          title="Sign out"
          aria-label="Sign out"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </aside>
  )
}
