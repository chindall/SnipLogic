import { useState } from 'react'
import { useUiStore } from '../../store/uiStore'
import { useWorkspaces } from '../../api/workspaces'
import { useFolders } from '../../api/folders'
import { useSnippets, useSnippetSearch, type Snippet } from '../../api/snippets'
import SearchBar from './SearchBar'
import SnippetCard from './SnippetCard'
import EmptyState from './EmptyState'
import SnippetModal from './SnippetModal'
import DeleteConfirmDialog from './DeleteConfirmDialog'
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

  // Breadcrumb labels + permissions
  const selectedWorkspace = workspaces?.find((w) => w.id === selectedWorkspaceId)
  const workspaceName = selectedWorkspace?.name
  const folderName = folders?.find((f) => f.id === selectedFolderId)?.name
  const canWrite = selectedWorkspace?.canWrite ?? false

  // Modal state
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null)
  const [deletingSnippet, setDeletingSnippet] = useState<Snippet | null>(null)

  function handleNew() {
    setEditingSnippet(null)
    setModalMode('create')
  }

  function handleEdit(id: string) {
    const snippet = snippets?.find((s) => s.id === id) ?? null
    setEditingSnippet(snippet)
    setModalMode('edit')
  }

  function handleDelete(id: string) {
    const snippet = snippets?.find((s) => s.id === id) ?? null
    setDeletingSnippet(snippet)
  }

  function closeModal() {
    setModalMode(null)
    setEditingSnippet(null)
  }

  function closeDeleteDialog() {
    setDeletingSnippet(null)
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
          disabled={!selectedFolderId || !canWrite}
          title={!selectedFolderId ? 'Select a folder first' : !canWrite ? 'You have read-only access' : 'Create a new snippet'}
          onClick={handleNew}
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
            canWrite={canWrite}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Snippet create/edit modal */}
      {modalMode && selectedFolderId && (
        <SnippetModal
          mode={modalMode}
          folderId={selectedFolderId}
          snippet={editingSnippet ?? undefined}
          onClose={closeModal}
        />
      )}

      {/* Delete confirmation dialog */}
      {deletingSnippet && (
        <DeleteConfirmDialog
          snippet={deletingSnippet}
          onClose={closeDeleteDialog}
        />
      )}
    </div>
  )
}
