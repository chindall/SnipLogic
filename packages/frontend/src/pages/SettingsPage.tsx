import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import Sidebar from '../components/Sidebar/Sidebar'
import AccountTab from './settings/AccountTab'
import VariablesTab from './settings/VariablesTab'
import TeamTab from './settings/TeamTab'
import WorkspacesTab from './settings/WorkspacesTab'
import styles from './SettingsPage.module.css'
import dashStyles from './DashboardPage.module.css'

type Tab = 'account' | 'variables' | 'team' | 'workspaces'

const TAB_LABELS: Record<Tab, string> = {
  account:    'Account',
  variables:  'Variables',
  team:       'Team',
  workspaces: 'Workspaces',
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isAdmin = user?.isGlobalAdmin ?? false

  const [activeTab, setActiveTab] = useState<Tab>('account')

  const tabs: Tab[] = ['account', 'variables', ...(isAdmin ? (['team', 'workspaces'] as Tab[]) : [])]

  return (
    <div className={dashStyles.layout}>
      <Sidebar />
      <main className={dashStyles.main}>
        <div className={styles.page}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <button className={styles.backBtn} onClick={() => navigate('/')} title="Back to dashboard">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <div>
                <h1 className={styles.title}>Settings</h1>
                <p className={styles.subtitle}>{TAB_LABELS[activeTab]}</p>
              </div>
            </div>
          </div>

          {/* Top-level tab bar */}
          <div className={styles.tabBar}>
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`${styles.tabBarBtn} ${activeTab === tab ? styles.tabBarBtnActive : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className={styles.content}>
            {activeTab === 'account'    && <AccountTab />}
            {activeTab === 'variables'  && <VariablesTab />}
            {activeTab === 'team'       && isAdmin && <TeamTab />}
            {activeTab === 'workspaces' && isAdmin && <WorkspacesTab />}
          </div>
        </div>
      </main>
    </div>
  )
}
