import { useEffect, useState } from 'react'
import { type OrgUser, type RoleType, useAssignRole, useRemoveRole } from '../api/users'
import { useWorkspaces } from '../api/workspaces'
import styles from './AssignRoleModal.module.css'

interface Props {
  user: OrgUser
  onClose: () => void
}

const ROLE_LABELS: Record<RoleType, string> = {
  WORKSPACE_ADMIN: 'Admin',
  EDITOR: 'Editor',
  VIEWER: 'Viewer',
}

export default function AssignRoleModal({ user, onClose }: Props) {
  const { data: workspaces } = useWorkspaces()
  const assignMutation = useAssignRole()
  const removeMutation = useRemoveRole()

  const [workspaceId, setWorkspaceId] = useState('')
  const [role, setRole] = useState<RoleType>('EDITOR')
  const [error, setError] = useState<string | null>(null)

  const isPending = assignMutation.isPending || removeMutation.isPending

  // Default to first non-already-assigned workspace
  useEffect(() => {
    if (workspaces) {
      const assignedIds = new Set(user.workspaceRoles.map((r) => r.workspaceId))
      const first = workspaces.find((w) => !w.isPersonal && !assignedIds.has(w.id))
      setWorkspaceId(first?.id ?? '')
    }
  }, [workspaces, user.workspaceRoles])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isPending, onClose])

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault()
    if (!workspaceId) return
    setError(null)
    try {
      await assignMutation.mutateAsync({ userId: user.id, workspaceId, role })
    } catch {
      setError('Failed to assign role. Please try again.')
    }
  }

  async function handleRemove(wsId: string) {
    setError(null)
    try {
      await removeMutation.mutateAsync({ userId: user.id, workspaceId: wsId })
    } catch {
      setError('Failed to remove role. Please try again.')
    }
  }

  // Shared workspaces only (personal workspaces don't need role management)
  const sharedWorkspaces = workspaces?.filter((w) => !w.isPersonal) ?? []
  const assignedIds = new Set(user.workspaceRoles.map((r) => r.workspaceId))
  const availableWorkspaces = sharedWorkspaces.filter((w) => !assignedIds.has(w.id))

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget && !isPending) onClose() }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="role-modal-title">
        <div className={styles.header}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{initials}</div>
            <div>
              <h2 id="role-modal-title" className={styles.title}>{user.firstName} {user.lastName}</h2>
              <p className={styles.email}>{user.email}</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} disabled={isPending} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          {/* Current roles */}
          <section className={styles.section}>
            <p className={styles.sectionLabel}>Workspace Access</p>
            {user.workspaceRoles.length === 0 ? (
              <p className={styles.empty}>No workspace roles assigned yet.</p>
            ) : (
              <ul className={styles.roleList}>
                {user.workspaceRoles.map((wr) => (
                  <li key={wr.workspaceId} className={styles.roleRow}>
                    <span className={styles.wsName}>{wr.workspace.name}</span>
                    <span className={`${styles.roleBadge} ${styles[`role_${wr.role}`]}`}>
                      {ROLE_LABELS[wr.role]}
                    </span>
                    <button
                      className={styles.removeBtn}
                      onClick={() => handleRemove(wr.workspaceId)}
                      disabled={isPending}
                      title="Remove role"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Add role form */}
          {availableWorkspaces.length > 0 && (
            <section className={styles.section}>
              <p className={styles.sectionLabel}>Add Access</p>
              <form onSubmit={handleAssign} className={styles.addForm}>
                <select
                  className={styles.select}
                  value={workspaceId}
                  onChange={(e) => setWorkspaceId(e.target.value)}
                  disabled={isPending}
                >
                  {availableWorkspaces.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
                <select
                  className={styles.select}
                  value={role}
                  onChange={(e) => setRole(e.target.value as RoleType)}
                  disabled={isPending}
                >
                  <option value="EDITOR">Editor</option>
                  <option value="VIEWER">Viewer</option>
                  <option value="WORKSPACE_ADMIN">Admin</option>
                </select>
                <button type="submit" className={styles.addBtn} disabled={isPending || !workspaceId}>
                  {assignMutation.isPending ? 'Adding…' : 'Add'}
                </button>
              </form>
            </section>
          )}

          {error && <p className={styles.errorMsg}>{error}</p>}
        </div>

        <div className={styles.footer}>
          <button className={styles.doneBtn} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
