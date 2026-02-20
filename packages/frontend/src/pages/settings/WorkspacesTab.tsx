import { useState } from 'react'
import { useManagedWorkspaces, workspacesApi, type ManagedWorkspace } from '../../api/workspaces'
import WorkspaceModal from './WorkspaceModal'
import WorkspaceDeleteDialog from './WorkspaceDeleteDialog'
import styles from './WorkspacesTab.module.css'

export default function WorkspacesTab() {
  const { data: workspaces, isLoading } = useManagedWorkspaces()
  const [showCreate, setShowCreate] = useState(false)
  const [renamingWs, setRenamingWs] = useState<ManagedWorkspace | null>(null)
  const [deletingWs, setDeletingWs] = useState<ManagedWorkspace | null>(null)

  function handleExport(ws: ManagedWorkspace) {
    window.open(workspacesApi.exportUrl(ws.id), '_blank')
  }

  return (
    <div className={styles.workspaces}>
      <div className={styles.wsHeader}>
        <p className={styles.wsCount}>
          {isLoading ? '…' : `${workspaces?.length ?? 0} shared workspace${workspaces?.length === 1 ? '' : 's'}`}
        </p>
        <button className={styles.createBtn} onClick={() => setShowCreate(true)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Workspace
        </button>
      </div>

      <div className={styles.list}>
        {isLoading && (
          <>
            <div className={styles.skeletonCard} />
            <div className={styles.skeletonCard} />
          </>
        )}
        {!isLoading && workspaces?.length === 0 && (
          <div className={styles.empty}>
            <p>No shared workspaces yet.</p>
            <p className={styles.emptyHint}>Create one to share snippets with your team.</p>
          </div>
        )}
        {workspaces?.map((ws) => (
          <WorkspaceCard
            key={ws.id}
            workspace={ws}
            onRename={setRenamingWs}
            onExport={handleExport}
            onDelete={setDeletingWs}
          />
        ))}
      </div>

      {showCreate && (
        <WorkspaceModal onClose={() => setShowCreate(false)} />
      )}
      {renamingWs && (
        <WorkspaceModal workspace={renamingWs} onClose={() => setRenamingWs(null)} />
      )}
      {deletingWs && (
        <WorkspaceDeleteDialog workspace={deletingWs} onClose={() => setDeletingWs(null)} />
      )}
    </div>
  )
}

function WorkspaceCard({
  workspace,
  onRename,
  onExport,
  onDelete,
}: {
  workspace: ManagedWorkspace
  onRename: (ws: ManagedWorkspace) => void
  onExport: (ws: ManagedWorkspace) => void
  onDelete: (ws: ManagedWorkspace) => void
}) {
  const memberCount = workspace.workspaceRoles.length

  return (
    <div className={styles.card}>
      <div className={styles.cardLeft}>
        <div className={styles.wsIcon}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <div className={styles.wsInfo}>
          <span className={styles.wsName}>{workspace.name}</span>
          <div className={styles.wsMeta}>
            <span className={styles.wsMetaItem}>
              {workspace._count.folders} folder{workspace._count.folders === 1 ? '' : 's'}
            </span>
            <span className={styles.wsDot}>·</span>
            <span className={styles.wsMetaItem}>
              {memberCount} member{memberCount === 1 ? '' : 's'}
            </span>
          </div>
          {memberCount > 0 && (
            <div className={styles.memberPills}>
              {workspace.workspaceRoles.slice(0, 4).map((wr) => (
                <span key={wr.userId} className={styles.memberPill}>
                  {wr.user.firstName} {wr.user.lastName[0]}.
                </span>
              ))}
              {memberCount > 4 && (
                <span className={styles.memberPillMore}>+{memberCount - 4} more</span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className={styles.cardActions}>
        <button className={styles.actionBtn} onClick={() => onRename(workspace)} title="Rename workspace">
          Rename
        </button>
        <button className={styles.actionBtn} onClick={() => onExport(workspace)} title="Export workspace as JSON">
          Export
        </button>
        <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={() => onDelete(workspace)} title="Delete workspace">
          Delete
        </button>
      </div>
    </div>
  )
}
