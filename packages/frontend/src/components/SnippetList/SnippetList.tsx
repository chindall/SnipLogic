import { useUiStore } from '../../store/uiStore'
import { useWorkspaces } from '../../api/workspaces'
import { useFolders } from '../../api/folders'
import { useSnippets, useSnippetSearch } from '../../api/snippets'
import SearchBar from './SearchBar'
import SnippetCard from './SnippetCard'
import EmptyState from './EmptyState'
import styles from './SnippetList.module.css'

// Shimmer skeleton shown while data loads
function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <div className={styles.skeletonRow}>
        <div className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
        <div className={`${styles.skeletonLine} ${styles.skeletonBadge}`} />
      </div>
      <div className={`${styles.skeletonLine} ${styles.skeletonBody}`} />
      <div className={`${styles.skeletonLine} ${styles.skeletonBodyShort}`} />
    </div>
  )
}

export default function SnippetList() {
  const { selectedWorkspaceId, selectedFolderId, searchQuery } = useUiStore()

  const { data: workspaces } = useWorkspaces()
  const { data: folders } = useFolders(selectedWorkspaceId)
  const { data: folderSnippets, isLoading: loadingFolder } = useSnippets(selectedFolderId)
  const { data: searchResults, isLoading: loadingSearch } = useSnippetSearch(searchQuery)

  const isSearching = searchQuery.trim().length >= 2
  const snippets = isSearching ? searchResults : folderSnippets
  const isLoading = isSearching ? loadingSearch : loadingFolder

  // Breadcrumb labels
  const workspaceName = workspaces?.find((w) => w.id === selectedWorkspaceId)?.name
  const folderName = folders?.find((f) => f.id === selectedFolderId)?.name

  function handleEdit(id: string) {
    // TODO: open snippet editor modal (next phase)
    console.log('Edit snippet', id)
  }

  function handleDelete(id: string) {
    // TODO: confirm + delete (next phase)
    console.log('Delete snippet', id)
  }

  // Determine which empty state to show
  const emptyVariant = !selectedWorkspaceId
    ? 'no-workspace'
    : !selectedFolderId && !isSearching
      ? 'no-folder'
      : !isLoading && snippets?.length === 0 && isSearching
        ? 'no-results'
        : !isLoading && snippets?.length === 0
          ? 'no-snippets'
          : null

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.breadcrumb}>
          {workspaceName && (
            <span className={styles.breadcrumbWs}>{workspaceName}</span>
          )}
          {workspaceName && folderName && (
            <svg className={styles.chevron} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
          {folderName && (
            <span className={styles.breadcrumbFolder}>{folderName}</span>
          )}
          {isSearching && (
            <span className={styles.breadcrumbFolder}>Search results</span>
          )}
          {!workspaceName && (
            <span className={styles.breadcrumbEmpty}>SnipLogic</span>
          )}
        </div>

        <button
          className={styles.newBtn}
          disabled={!selectedFolderId}
          title={!selectedFolderId ? 'Select a folder first' : 'Create a new snippet'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Snippet
        </button>
      </div>

      {/* Search bar */}
      <SearchBar />

      {/* Content */}
      <div className={styles.listArea}>
        {isLoading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {!isLoading && emptyVariant && (
          <EmptyState variant={emptyVariant} />
        )}

        {!isLoading && !emptyVariant && snippets?.map((snippet) => (
          <SnippetCard
            key={snippet.id}
            snippet={snippet}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  )
}
