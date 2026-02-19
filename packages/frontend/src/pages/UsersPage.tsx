import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar/Sidebar'
import { useUsers, type OrgUser, type RoleType } from '../api/users'
import { useAuthStore } from '../store/authStore'
import InviteUserModal from './InviteUserModal'
import AssignRoleModal from './AssignRoleModal'
import styles from './UsersPage.module.css'
import dashStyles from './DashboardPage.module.css'

const ROLE_LABELS: Record<RoleType, string> = {
  WORKSPACE_ADMIN: 'Admin',
  EDITOR: 'Editor',
  VIEWER: 'Viewer',
}

function UserCard({ user, onManageRoles }: { user: OrgUser; onManageRoles: (u: OrgUser) => void }) {
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
  // Only show shared workspace roles (personal workspace has no role entry)
  const sharedRoles = user.workspaceRoles

  return (
    <div className={styles.card}>
      <div className={styles.cardLeft}>
        <div className={styles.avatar}>{initials}</div>
        <div className={styles.userInfo}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{user.firstName} {user.lastName}</span>
            {user.isGlobalAdmin && <span className={styles.adminBadge}>Admin</span>}
          </div>
          <span className={styles.email}>{user.email}</span>
          {sharedRoles.length > 0 && (
            <div className={styles.roles}>
              {sharedRoles.map((wr) => (
                <span key={wr.workspaceId} className={`${styles.rolePill} ${styles[`role_${wr.role}`]}`}>
                  {wr.workspace.name}: {ROLE_LABELS[wr.role]}
                </span>
              ))}
            </div>
          )}
          {sharedRoles.length === 0 && (
            <span className={styles.noRoles}>No workspace access assigned</span>
          )}
        </div>
      </div>
      <button className={styles.manageBtn} onClick={() => onManageRoles(user)}>
        Manage Roles
      </button>
    </div>
  )
}

export default function UsersPage() {
  const navigate = useNavigate()
  const { user: currentUser } = useAuthStore()
  const { data: users, isLoading } = useUsers()

  const [showInvite, setShowInvite] = useState(false)
  const [managingUser, setManagingUser] = useState<OrgUser | null>(null)

  return (
    <div className={dashStyles.layout}>
      <Sidebar />
      <main className={dashStyles.main}>
        <div className={styles.page}>
          {/* Page header */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <button className={styles.backBtn} onClick={() => navigate('/')} title="Back to dashboard">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <div>
                <h1 className={styles.title}>Team</h1>
                <p className={styles.subtitle}>
                  {isLoading ? '…' : `${users?.length ?? 0} member${users?.length === 1 ? '' : 's'}`}
                </p>
              </div>
            </div>
            {currentUser?.isGlobalAdmin && (
              <button className={styles.inviteBtn} onClick={() => setShowInvite(true)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Invite Member
              </button>
            )}
          </div>

          {/* User list */}
          <div className={styles.list}>
            {isLoading && (
              <>
                <div className={styles.skeletonCard} />
                <div className={styles.skeletonCard} />
                <div className={styles.skeletonCard} />
              </>
            )}
            {!isLoading && users?.map((u) => (
              <UserCard key={u.id} user={u} onManageRoles={setManagingUser} />
            ))}
          </div>
        </div>

        {/* Modals */}
        {showInvite && <InviteUserModal onClose={() => setShowInvite(false)} />}
        {managingUser && <AssignRoleModal user={managingUser} onClose={() => setManagingUser(null)} />}
      </main>
    </div>
  )
}
