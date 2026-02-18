import { useQuery } from '@tanstack/react-query'
import { api } from './client'

export interface Snippet {
  id: string
  name: string
  shortcut: string | null
  content: string
  htmlContent: string | null
  folderId: string
  organizationId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export const snippetsApi = {
  listByFolder: (folderId: string) =>
    api.get<Snippet[]>('/snippets', { params: { folderId } }).then((r) => r.data),

  search: (query: string) =>
    api.get<Snippet[]>('/snippets', { params: { search: query } }).then((r) => r.data),
}

export function useSnippets(folderId: string | null) {
  return useQuery({
    queryKey: ['snippets', 'folder', folderId],
    queryFn: () => snippetsApi.listByFolder(folderId!),
    enabled: folderId !== null,
    staleTime: 60 * 1000,
  })
}

export function useSnippetSearch(query: string) {
  return useQuery({
    queryKey: ['snippets', 'search', query],
    queryFn: () => snippetsApi.search(query),
    enabled: query.trim().length >= 2,
    staleTime: 30 * 1000,
  })
}
