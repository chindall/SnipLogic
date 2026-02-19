import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

export interface Folder {
  id: string
  name: string
  workspaceId: string
  _count: { snippets: number }
}

export const foldersApi = {
  list: (workspaceId: string) =>
    api.get<Folder[]>('/folders', { params: { workspaceId } }).then((r) => r.data),

  create: (workspaceId: string, name: string) =>
    api.post<Folder>('/folders', { workspaceId, name }).then((r) => r.data),

  rename: (id: string, name: string) =>
    api.patch<Folder>(`/folders/${id}`, { name }).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/folders/${id}`),
}

export function useFolders(workspaceId: string | null) {
  return useQuery({
    queryKey: ['folders', workspaceId],
    queryFn: () => foldersApi.list(workspaceId!),
    enabled: workspaceId !== null,
    staleTime: 2 * 60 * 1000,
  })
}

export function useCreateFolder(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => foldersApi.create(workspaceId, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['folders', workspaceId] })
    },
  })
}

export function useRenameFolder(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => foldersApi.rename(id, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['folders', workspaceId] })
    },
  })
}

export function useDeleteFolder(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => foldersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['folders', workspaceId] })
    },
  })
}
