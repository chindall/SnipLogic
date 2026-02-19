import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

export interface SnippetInput {
  name: string
  shortcut?: string | null
  content: string
  htmlContent?: string | null
}

export const snippetsApi = {
  listByFolder: (folderId: string) =>
    api.get<Snippet[]>('/snippets', { params: { folderId } }).then((r) => r.data),

  search: (query: string) =>
    api.get<Snippet[]>('/snippets', { params: { search: query } }).then((r) => r.data),

  create: (folderId: string, data: SnippetInput) =>
    api.post<Snippet>('/snippets', { ...data, folderId }).then((r) => r.data),

  update: (id: string, data: Partial<SnippetInput>) =>
    api.patch<Snippet>(`/snippets/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/snippets/${id}`),
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

export function useCreateSnippet(folderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SnippetInput) => snippetsApi.create(folderId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['snippets', 'folder', folderId] })
    },
  })
}

export function useUpdateSnippet(folderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SnippetInput> }) =>
      snippetsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['snippets', 'folder', folderId] })
    },
  })
}

export function useDeleteSnippet(folderId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => snippetsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['snippets', 'folder', folderId] })
    },
  })
}
