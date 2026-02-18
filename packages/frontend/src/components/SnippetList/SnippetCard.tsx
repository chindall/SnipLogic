import type { Snippet } from '../../api/snippets'
import styles from './SnippetCard.module.css'

interface SnippetCardProps {
  snippet: Snippet
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export default function SnippetCard({ snippet, onEdit, onDelete }: SnippetCardProps) {
  const preview = snippet.content.length > 120
    ? snippet.content.slice(0, 120).trimEnd() + '…'
    : snippet.content

  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <span className={styles.name}>{snippet.name}</span>
        {snippet.shortcut && (
          <span className={styles.shortcut}>{snippet.shortcut}</span>
        )}
      </div>

      <p className={styles.preview}>{preview}</p>

      <div className={styles.actions}>
        <button
          className={styles.actionBtn}
          onClick={() => onEdit(snippet.id)}
        >
          Edit
        </button>
        <button
          className={`${styles.actionBtn} ${styles.danger}`}
          onClick={() => onDelete(snippet.id)}
        >
          Delete
        </button>
      </div>
    </div>
  )
}
