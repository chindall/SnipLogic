import { useEffect, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useUpdateMe } from '../../api/auth'
import styles from './AccountTab.module.css'

export default function AccountTab() {
  const { user, setUser } = useAuthStore()
  const updateMe = useUpdateMe()

  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName,  setLastName]  = useState(user?.lastName  ?? '')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Keep fields in sync if user object changes
  useEffect(() => {
    setFirstName(user?.firstName ?? '')
    setLastName(user?.lastName   ?? '')
  }, [user])

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    setProfileMsg(null)
    try {
      const updated = await updateMe.mutateAsync({ firstName: firstName.trim(), lastName: lastName.trim() })
      setUser(updated)
      setProfileMsg({ type: 'ok', text: 'Profile updated.' })
    } catch {
      setProfileMsg({ type: 'err', text: 'Failed to update profile.' })
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault()
    setPasswordMsg(null)
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'err', text: 'New passwords do not match.' })
      return
    }
    try {
      await updateMe.mutateAsync({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMsg({ type: 'ok', text: 'Password changed. Sign out of the extension and sign back in.' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      setPasswordMsg({ type: 'err', text: msg.includes('incorrect') ? 'Current password is incorrect.' : 'Failed to change password.' })
    }
  }

  const profileDirty = firstName.trim() !== (user?.firstName ?? '') || lastName.trim() !== (user?.lastName ?? '')
  const passwordValid = currentPassword && newPassword.length >= 8 && confirmPassword

  return (
    <div className={styles.account}>
      {/* Profile section */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Profile</h3>
        <form onSubmit={handleProfileSave} className={styles.form}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>First name</label>
              <input
                className={styles.input}
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value); setProfileMsg(null) }}
                required
                disabled={updateMe.isPending}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Last name</label>
              <input
                className={styles.input}
                value={lastName}
                onChange={(e) => { setLastName(e.target.value); setProfileMsg(null) }}
                required
                disabled={updateMe.isPending}
              />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input className={`${styles.input} ${styles.inputReadonly}`} value={user?.email ?? ''} readOnly />
            <p className={styles.hint}>Email cannot be changed here.</p>
          </div>
          {profileMsg && <p className={profileMsg.type === 'ok' ? styles.successMsg : styles.errorMsg}>{profileMsg.text}</p>}
          <div className={styles.formActions}>
            <button type="submit" className={styles.saveBtn} disabled={updateMe.isPending || !profileDirty}>
              {updateMe.isPending ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </form>
      </section>

      {/* Password section */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Change Password</h3>
        <form onSubmit={handlePasswordSave} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Current password <span className={styles.req}>*</span></label>
            <input
              className={styles.input}
              type="password"
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setPasswordMsg(null) }}
              autoComplete="current-password"
              disabled={updateMe.isPending}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>New password <span className={styles.req}>*</span></label>
            <input
              className={styles.input}
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPasswordMsg(null) }}
              autoComplete="new-password"
              placeholder="Min 8 characters"
              disabled={updateMe.isPending}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Confirm new password <span className={styles.req}>*</span></label>
            <input
              className={styles.input}
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setPasswordMsg(null) }}
              autoComplete="new-password"
              disabled={updateMe.isPending}
            />
          </div>
          {passwordMsg && <p className={passwordMsg.type === 'ok' ? styles.successMsg : styles.errorMsg}>{passwordMsg.text}</p>}
          <div className={styles.formActions}>
            <button type="submit" className={styles.saveBtn} disabled={updateMe.isPending || !passwordValid}>
              {updateMe.isPending ? 'Saving…' : 'Change Password'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
