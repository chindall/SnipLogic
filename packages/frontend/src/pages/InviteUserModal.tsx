import { useEffect, useRef, useState } from 'react'
import { useInviteUser } from '../api/users'
import styles from './InviteUserModal.module.css'

interface Props {
  onClose: () => void
}

export default function InviteUserModal({ onClose }: Props) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [error, setError]         = useState<string | null>(null)
  const firstRef = useRef<HTMLInputElement>(null)

  const inviteMutation = useInviteUser()
  const isPending = inviteMutation.isPending

  useEffect(() => { firstRef.current?.focus() }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isPending, onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await inviteMutation.mutateAsync({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), password })
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setError(msg.includes('409') || msg.toLowerCase().includes('already') ? 'Email already in use.' : msg)
    }
  }

  const valid = firstName.trim() && lastName.trim() && email.trim() && password.length >= 8

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget && !isPending) onClose() }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="invite-title">
        <div className={styles.header}>
          <h2 id="invite-title" className={styles.title}>Invite Team Member</h2>
          <button className={styles.closeBtn} onClick={onClose} disabled={isPending} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="inv-first" className={styles.label}>First name <span className={styles.req}>*</span></label>
              <input id="inv-first" ref={firstRef} className={styles.input} value={firstName}
                onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" required disabled={isPending} />
            </div>
            <div className={styles.field}>
              <label htmlFor="inv-last" className={styles.label}>Last name <span className={styles.req}>*</span></label>
              <input id="inv-last" className={styles.input} value={lastName}
                onChange={(e) => setLastName(e.target.value)} placeholder="Smith" required disabled={isPending} />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="inv-email" className={styles.label}>Email <span className={styles.req}>*</span></label>
            <input id="inv-email" className={styles.input} type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="jane@lookmc.com" required disabled={isPending} />
          </div>

          <div className={styles.field}>
            <label htmlFor="inv-pass" className={styles.label}>Temporary password <span className={styles.req}>*</span></label>
            <input id="inv-pass" className={styles.input} type="password" value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" required disabled={isPending} />
            <p className={styles.hint}>Share this with the team member — they can change it later.</p>
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isPending}>Cancel</button>
            <button type="submit" className={styles.saveBtn} disabled={isPending || !valid}>
              {isPending ? 'Inviting…' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
