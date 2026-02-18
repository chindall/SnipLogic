import { useState, useEffect } from 'react'
import { useUiStore } from '../../store/uiStore'
import styles from './SearchBar.module.css'

export default function SearchBar() {
  const setSearchQuery = useUiStore((s) => s.setSearchQuery)
  const [value, setValue] = useState('')

  // Debounce: only fire the store update 300ms after the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(value), 300)
    return () => clearTimeout(timer)
  }, [value, setSearchQuery])

  return (
    <div className={styles.wrapper}>
      <div className={styles.inputWrapper}>
        {/* Search icon */}
        <svg className={styles.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          type="text"
          className={styles.input}
          placeholder="Search snippets…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />

        {/* Clear button */}
        {value && (
          <button
            className={styles.clearBtn}
            onClick={() => { setValue(''); setSearchQuery('') }}
            aria-label="Clear search"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
