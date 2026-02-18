import Sidebar from '../components/Sidebar/Sidebar'
import SnippetList from '../components/SnippetList/SnippetList'
import styles from './DashboardPage.module.css'

export default function DashboardPage() {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.main}>
        <SnippetList />
      </main>
    </div>
  )
}
