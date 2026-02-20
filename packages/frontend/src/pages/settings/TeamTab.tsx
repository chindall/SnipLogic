import { useState } from 'react'
import { useUsers, useResetPassword, useSetAdminStatus, usersApi, type OrgUser, type RoleType } from '../../api/users'
import { useAuthStore } from '../../store/authStore'
import InviteUserModal from '../InviteUserModal'
import AssignRoleModal from '../AssignRoleModal'
import styles from './TeamTab.module.css'

const ROLE_LABELS: Record<RoleType, string> = {
  WORKSPACE_ADMIN: 'Admin',
  EDITOR: 'Editor',
  VIEWER: 'Viewer',
}

function ResetPasswordModal({ user, onClose }: { user: OrgUser; onClose: () => void }) {
  const [newPassword, setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resetMutation = useResetPassword()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return }
    try {
      await resetMutation.mutateAsync({ userId: user.id, newPassword })
      setDone(true)
    } catch {
      setError('Failed to reset password. Please try again.')
    }
  }

  const valid = newPassword.length >= 8 && confirmPassword

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Reset Password — {user.firstName} {user.lastName}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {done ? (
          <div className={styles.modalBody}>
            <p className={styles.successMsg}>
              Password reset successfully. Remind <strong>{user.firstName}</strong> to sign out of the browser extension and sign back in with their new password.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.primaryBtn} onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.modalBody}>
            <div className={styles.field}>
              <label className={styles.label}>New temporary password <span className={styles.req}>*</span></label>
              <input
                className={styles.input}
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(null) }}
                placeholder="Min 8 characters"
                disabled={resetMutation.isPending}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Confirm password <span className={styles.req}>*</span></label>
              <input
                className={styles.input}
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(null) }}
                disabled={resetMutation.isPending}
              />
            </div>
            {error && <p className={styles.errorMsg}>{error}</p>}
            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={resetMutation.isPending}>Cancel</button>
              <button type="submit" className={styles.primaryBtn} disabled={resetMutation.isPending || !valid}>
                {resetMutation.isPending ? 'Resetting…' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function UserCard({
  user,
  isSelf,
  onManageRoles,
  onResetPassword,
  onToggleAdmin,
}: {
  user: OrgUser
  isSelf: boolean
  onManageRoles: (u: OrgUser) => void
  onResetPassword: (u: OrgUser) => void
  onToggleAdmin: (u: OrgUser) => void
}) {
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
  const sharedRoles = user.workspaceRoles

  function handleExportPersonalWorkspace() {
    const url = usersApi.personalWorkspaceExportUrl(user.id)
    window.open(`/api/v1${url.replace('/api/v1', '')}`, '_blank')
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardLeft}>
        <div className={styles.avatar}>{initials}</div>
        <div className={styles.userInfo}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{user.firstName} {user.lastName}</span>
            {isSelf && <span className={styles.youBadge}>You</span>}
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
      <div className={styles.cardActions}>
        <button className={styles.actionBtn} onClick={() => onManageRoles(user)} title="Manage workspace roles">
          Manage Roles
        </button>
        {!isSelf && (
          <>
            <button className={styles.actionBtn} onClick={() => onToggleAdmin(user)} title={user.isGlobalAdmin ? 'Remove admin' : 'Make admin'}>
              {user.isGlobalAdmin ? 'Remove Admin' : 'Make Admin'}
            </button>
            <button className={styles.actionBtn} onClick={() => onResetPassword(user)} title="Reset password">
              Reset Password
            </button>
            <button className={styles.actionBtn} onClick={handleExportPersonalWorkspace} title="Export personal workspace">
              Export Workspace
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function TeamTab() {
  const { user: currentUser } = useAuthStore()
  const { data: users, isLoading } = useUsers()
  const [showInvite, setShowInvite] = useState(false)
  const [managingUser, setManagingUser] = useState<OrgUser | null>(null)
  const [resettingUser, setResettingUser] = useState<OrgUser | null>(null)
  const setAdminStatus = useSetAdminStatus()

  async function handleToggleAdmin(u: OrgUser) {
    await setAdminStatus.mutateAsync({ userId: u.id, isGlobalAdmin: !u.isGlobalAdmin })
  }

  return (
    <div className={styles.team}>
      <div className={styles.teamHeader}>
        <p className={styles.teamCount}>
          {isLoading ? '…' : `${users?.length ?? 0} member${users?.length === 1 ? '' : 's'}`}
        </p>
        <button className={styles.inviteBtn} onClick={() => setShowInvite(true)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Invite Member
        </button>
      </div>

      <div className={styles.list}>
        {isLoading && (
          <>
            <div className={styles.skeletonCard} />
            <div className={styles.skeletonCard} />
          </>
        )}
        {!isLoading && users?.map((u) => (
          <UserCard
            key={u.id}
            user={u}
            isSelf={u.id === currentUser?.id}
            onManageRoles={setManagingUser}
            onResetPassword={setResettingUser}
            onToggleAdmin={handleToggleAdmin}
          />
        ))}
      </div>

      {showInvite && <InviteUserModal onClose={() => setShowInvite(false)} />}
      {managingUser && <AssignRoleModal user={managingUser} onClose={() => setManagingUser(null)} />}
      {resettingUser && <ResetPasswordModal user={resettingUser} onClose={() => setResettingUser(null)} />}
    </div>
  )
}
