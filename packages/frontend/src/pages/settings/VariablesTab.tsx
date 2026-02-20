import { useState } from 'react'
import { useVariables, useDeleteVariable, type Variable } from '../../api/variables'
import { useWorkspaces } from '../../api/workspaces'
import VariableModal from '../VariableModal'
import styles from './VariablesTab.module.css'

type Tab = 'user' | 'workspace'

const DYNAMIC_VARIABLES: Array<{ token: string; description: string; example: string }> = [
  { token: '{{datelong}}',   description: 'Full date',          example: 'Thursday, February 19, 2026' },
  { token: '{{dateshort}}',  description: 'Short date',         example: '02/19/2026' },
  { token: '{{dateiso}}',    description: 'ISO date',           example: '2026-02-19' },
  { token: '{{datemedium}}', description: 'Medium date',        example: 'Feb 19, 2026' },
  { token: '{{time}}',       description: '12-hour time',       example: '2:34 PM' },
  { token: '{{time24}}',     description: '24-hour time',       example: '14:34' },
  { token: '{{datetime}}',   description: 'Date + time',        example: 'February 19, 2026 2:34 PM' },
  { token: '{{dayofweek}}',  description: 'Day of week',        example: 'Thursday' },
  { token: '{{month}}',      description: 'Month name',         example: 'February' },
  { token: '{{year}}',       description: 'Year',               example: '2026' },
  { token: '{{cursor}}',     description: 'Cursor position',    example: '(places cursor here after expansion)' },
  { token: '{{clipboard}}',  description: 'Clipboard contents', example: '(pastes current clipboard text)' },
]

function VariableRow({
  variable,
  onEdit,
  onDelete,
}: {
  variable: Variable
  onEdit: (v: Variable) => void
  onDelete: (v: Variable) => void
}) {
  return (
    <div className={styles.varRow}>
      <code className={styles.varToken}>{`{{${variable.name}}}`}</code>
      <span className={styles.varValue}>{variable.value || <em className={styles.emptyValue}>empty</em>}</span>
      <div className={styles.varActions}>
        <button className={styles.editBtn} onClick={() => onEdit(variable)}>Edit</button>
        <button className={styles.deleteBtn} onClick={() => onDelete(variable)}>Delete</button>
      </div>
    </div>
  )
}

export default function VariablesTab() {
  const [activeTab, setActiveTab] = useState<Tab>('user')
  const [selectedWsId, setSelectedWsId] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [editingVar, setEditingVar] = useState<Variable | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Variable | null>(null)

  const { data: variables, isLoading } = useVariables()
  const { data: workspaces } = useWorkspaces()
  const deleteMutation = useDeleteVariable()

  const sharedWorkspaces = workspaces?.filter((w) => !w.isPersonal) ?? []
  const effectiveWsId = selectedWsId || sharedWorkspaces[0]?.id || ''

  const userVars = variables?.filter((v) => v.scope === 'USER') ?? []
  const workspaceVars = variables?.filter(
    (v) => v.scope === 'WORKSPACE' && (effectiveWsId ? v.workspaceId === effectiveWsId : true)
  ) ?? []

  function handleEdit(v: Variable) {
    setEditingVar(v)
    setShowModal(true)
  }

  function handleDelete(v: Variable) {
    setConfirmDelete(v)
  }

  async function confirmDeleteVar() {
    if (!confirmDelete) return
    await deleteMutation.mutateAsync(confirmDelete.id)
    setConfirmDelete(null)
  }

  function openAddModal() {
    setEditingVar(null)
    setShowModal(true)
  }

  return (
    <div className={styles.variables}>
      {/* Custom variables section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Custom Variables</h2>
            <p className={styles.sectionDesc}>
              Use <code className={styles.inlineCode}>{'{{varname}}'}</code> in your snippet content to insert dynamic values.
            </p>
          </div>
          <button className={styles.addBtn} onClick={openAddModal}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Variable
          </button>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'user' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('user')}
          >
            My Variables
            {userVars.length > 0 && <span className={styles.tabBadge}>{userVars.length}</span>}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'workspace' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('workspace')}
          >
            Workspace
            {workspaceVars.length > 0 && <span className={styles.tabBadge}>{workspaceVars.length}</span>}
          </button>
        </div>

        <div className={styles.tabPanel}>
          {activeTab === 'user' && (
            <>
              {isLoading && <div className={styles.loading}>Loading…</div>}
              {!isLoading && userVars.length === 0 && (
                <div className={styles.empty}>
                  <p>No personal variables yet.</p>
                  <p className={styles.emptyHint}>Add one to use in your snippets — e.g. <code className={styles.inlineCode}>{'{{firstname}}'}</code> → Barry</p>
                </div>
              )}
              {userVars.map((v) => (
                <VariableRow key={v.id} variable={v} onEdit={handleEdit} onDelete={handleDelete} />
              ))}
            </>
          )}

          {activeTab === 'workspace' && (
            <>
              {sharedWorkspaces.length > 1 && (
                <div className={styles.wsFilter}>
                  <label htmlFor="ws-select" className={styles.wsFilterLabel}>Workspace:</label>
                  <select
                    id="ws-select"
                    className={styles.wsSelect}
                    value={effectiveWsId}
                    onChange={(e) => setSelectedWsId(e.target.value)}
                  >
                    {sharedWorkspaces.map((ws) => (
                      <option key={ws.id} value={ws.id}>{ws.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {isLoading && <div className={styles.loading}>Loading…</div>}
              {!isLoading && workspaceVars.length === 0 && (
                <div className={styles.empty}>
                  <p>No workspace variables yet.</p>
                  <p className={styles.emptyHint}>Workspace variables are shared with all members of the workspace.</p>
                </div>
              )}
              {workspaceVars.map((v) => (
                <VariableRow key={v.id} variable={v} onEdit={handleEdit} onDelete={handleDelete} />
              ))}
            </>
          )}
        </div>
      </section>

      {/* Dynamic variables reference */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Built-in Dynamic Variables</h2>
            <p className={styles.sectionDesc}>
              Resolved automatically by the browser extension at expansion time — no setup needed.
            </p>
          </div>
        </div>
        <div className={styles.dynamicTable}>
          <div className={styles.dynamicHeader}>
            <span>Token</span>
            <span>Description</span>
            <span>Example output</span>
          </div>
          {DYNAMIC_VARIABLES.map((dv) => (
            <div key={dv.token} className={styles.dynamicRow}>
              <code className={styles.varToken}>{dv.token}</code>
              <span className={styles.dynamicDesc}>{dv.description}</span>
              <span className={styles.dynamicExample}>{dv.example}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Variable add/edit modal */}
      {showModal && (
        <VariableModal
          variable={editingVar}
          defaultScope={activeTab === 'workspace' ? 'WORKSPACE' : 'USER'}
          onClose={() => { setShowModal(false); setEditingVar(null) }}
        />
      )}

      {/* Delete confirm dialog */}
      {confirmDelete && (
        <div className={styles.confirmOverlay} onClick={(e) => { if (e.target === e.currentTarget) setConfirmDelete(null) }}>
          <div className={styles.confirmDialog} role="dialog" aria-modal="true">
            <h3 className={styles.confirmTitle}>Delete Variable</h3>
            <p className={styles.confirmMsg}>
              Delete <code className={styles.inlineCode}>{`{{${confirmDelete.name}}}`}</code>? This cannot be undone.
              Snippets that reference this variable will show the raw token.
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.cancelBtn} onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button
                className={styles.confirmDeleteBtn}
                onClick={confirmDeleteVar}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
