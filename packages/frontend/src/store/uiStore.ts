import { create } from 'zustand'

interface UiState {
  selectedWorkspaceId: string | null
  selectedFolderId: string | null
  searchQuery: string
  setSelectedWorkspace: (id: string) => void
  setSelectedFolder: (id: string | null) => void
  setSearchQuery: (q: string) => void
}

export const useUiStore = create<UiState>((set) => ({
  selectedWorkspaceId: null,
  selectedFolderId: null,
  searchQuery: '',

  // Changing workspace clears folder selection and search
  setSelectedWorkspace: (id) =>
    set({ selectedWorkspaceId: id, selectedFolderId: null, searchQuery: '' }),

  // Changing folder clears search
  setSelectedFolder: (id) =>
    set({ selectedFolderId: id, searchQuery: '' }),

  setSearchQuery: (q) => set({ searchQuery: q }),
}))
