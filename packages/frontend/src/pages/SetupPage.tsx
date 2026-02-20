import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import styles from './SetupPage.module.css'

export default function SetupPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [orgName,    setOrgName]    = useState('')
  const [firstName,  setFirstName]  = useState('')
  const [lastName,   setLastName]   = useState('')
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [confirm,    setConfirm]    = useState('')
  const [error,      setError]      = useState('')
  const [loading,    setLoading]    = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    try {
      const { user, token } = await authApi.register({
        organizationName: orgName.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
      })
      setAuth(user, token)
      navigate('/')
    } catch (err: unknown) {
      const msg: string = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? ''
      setError(msg || 'Setup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const valid = orgName.trim() && firstName.trim() && lastName.trim() && email.trim() && password && confirm

  return (
    <div className={styles.container}>
      <div className={styles.card}>

        {/* Logo */}
        <div className={styles.logoRow}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <rect x="3"  y="3"  width="7" height="7" rx="1.5" fill="#3b82f6"/>
            <rect x="14" y="3"  width="7" height="7" rx="1.5" fill="#3b82f6" opacity="0.6"/>
            <rect x="3"  y="14" width="7" height="7" rx="1.5" fill="#3b82f6" opacity="0.6"/>
            <rect x="14" y="14" width="7" height="7" rx="1.5" fill="#3b82f6" opacity="0.3"/>
          </svg>
          <span className={styles.logoText}>SnipLogic</span>
        </div>

        <h1 className={styles.title}>Welcome to SnipLogic</h1>
        <p className={styles.subtitle}>Let's set up your organization and admin account.</p>

        <form onSubmit={handleSubmit} className={styles.form}>

          {/* Organization */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>Organization</p>
            <div className={styles.field}>
              <label className={styles.label}>Organization name <span className={styles.req}>*</span></label>
              <input
                className={styles.input}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Star Labs"
                required
                autoFocus
                disabled={loading}
              />
            </div>
          </div>

          {/* Admin account */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>Admin Account</p>
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>First name <span className={styles.req}>*</span></label>
                <input
                  className={styles.input}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Barry"
                  required
                  disabled={loading}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Last name <span className={styles.req}>*</span></label>
                <input
                  className={styles.input}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Allen"
                  required
                  disabled={loading}
                />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Email <span className={styles.req}>*</span></label>
              <input
                className={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourorg.com"
                required
                disabled={loading}
              />
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Password <span className={styles.req}>*</span></label>
                <input
                  className={styles.input}
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  placeholder="Min 8 characters"
                  required
                  disabled={loading}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Confirm password <span className={styles.req}>*</span></label>
                <input
                  className={styles.input}
                  type="password"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setError('') }}
                  required
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.btn} disabled={loading || !valid}>
            {loading ? 'Creating your account…' : 'Create Account & Get Started'}
          </button>
        </form>

        <p className={styles.note}>
          This setup page is only available on a fresh installation and disappears once the first account is created.
        </p>
      </div>
    </div>
  )
}
