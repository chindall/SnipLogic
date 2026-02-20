import { useEffect, useRef, useState } from 'react'
import { useWorkspaces } from '../api/workspaces'
import { useCreateVariable, useUpdateVariable, type Variable, type VariableInput } from '../api/variables'
import styles from './VariableModal.module.css'

interface Props {
  variable?: Variable | null
  defaultScope?: 'USER' | 'WORKSPACE'
  onClose: () => void
}

export default function VariableModal({ variable, defaultScope = 'USER', onClose }: Props) {
  const isEditing = !!variable

  const [name, setName]             = useState(variable?.name ?? '')
  const [value, setValue]           = useState(variable?.value ?? '')
  const [scope, setScope]           = useState<'USER' | 'WORKSPACE'>(variable?.scope ?? defaultScope)
  const [workspaceId, setWorkspaceId] = useState<string>(variable?.workspaceId ?? '')
  const [error, setError]           = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  const { data: workspaces } = useWorkspaces()
  const createMutation = useCreateVariable()
  const updateMutation = useUpdateVariable()
  const isPending = createMutation.isPending || updateMutation.isPending

  useEffect(() => { nameRef.current?.focus() }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isPending, onClose])

  // Auto-select first workspace when scope switches to WORKSPACE
  useEffect(() => {
    if (scope === 'WORKSPACE' && !workspaceId && workspaces && workspaces.length > 0) {
      setWorkspaceId(workspaces[0].id)
    }
  }, [scope, workspaceId, workspaces])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const data: VariableInput = {
      name: name.trim(),
      value: value,
      scope,
      workspaceId: scope === 'WORKSPACE' ? workspaceId : null,
    }

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: variable!.id, data })
      } else {
        await createMutation.mutateAsync(data)
      }
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      if (msg.includes('409') || msg.toLowerCase().includes('unique')) {
        setError('A variable with this name already exists in this scope.')
      } else {
        setError(msg)
      }
    }
  }

  const nameValid = /^[a-zA-Z0-9_]+$/.test(name.trim())
  const valid = name.trim() && nameValid && value !== '' && (scope === 'USER' || !!workspaceId)

  const sharedWorkspaces = workspaces?.filter((w) => !w.isPersonal) ?? []

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget && !isPending) onClose() }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="var-modal-title">
        <div className={styles.header}>
          <h2 id="var-modal-title" className={styles.title}>
            {isEditing ? 'Edit Variable' : 'Add Variable'}
          </h2>
          <button className={styles.closeBtn} onClick={onClose} disabled={isPending} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="var-name" className={styles.label}>
              Name <span className={styles.req}>*</span>
            </label>
            <input
              id="var-name"
              ref={nameRef}
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="firstname"
              pattern="[a-zA-Z0-9_]+"
              required
              disabled={isPending}
              spellCheck={false}
            />
            <p className={styles.hint}>
              Letters, numbers, underscores only. Use as <code className={styles.code}>{`{{${name || 'name'}}}`}</code> in snippets.
            </p>
          </div>

          <div className={styles.field}>
            <label htmlFor="var-value" className={styles.label}>
              Value <span className={styles.req}>*</span>
            </label>
            <textarea
              id="var-value"
              className={styles.textarea}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Barry"
              rows={3}
              disabled={isPending}
            />
          </div>

          <div className={styles.field}>
            <span className={styles.label}>Scope <span className={styles.req}>*</span></span>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="scope"
                  value="USER"
                  checked={scope === 'USER'}
                  onChange={() => setScope('USER')}
                  disabled={isPending || isEditing}
                />
                <span>My Variables</span>
                <span className={styles.radioDesc}>Only you can use this</span>
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="scope"
                  value="WORKSPACE"
                  checked={scope === 'WORKSPACE'}
                  onChange={() => setScope('WORKSPACE')}
                  disabled={isPending || isEditing}
                />
                <span>Workspace</span>
                <span className={styles.radioDesc}>Shared with workspace members</span>
              </label>
            </div>
          </div>

          {scope === 'WORKSPACE' && (
            <div className={styles.field}>
              <label htmlFor="var-workspace" className={styles.label}>
                Workspace <span className={styles.req}>*</span>
              </label>
              <select
                id="var-workspace"
                className={styles.select}
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                disabled={isPending || isEditing}
              >
                <option value="">Select a workspace…</option>
                {sharedWorkspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>{ws.name}</option>
                ))}
              </select>
            </div>
          )}

          {error && <p className={styles.errorMsg}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isPending}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={isPending || !valid}>
              {isPending ? (isEditing ? 'Saving…' : 'Adding…') : (isEditing ? 'Save Changes' : 'Add Variable')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
