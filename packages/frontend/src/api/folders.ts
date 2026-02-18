import { useQuery } from '@tanstack/react-query'
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
}

export function useFolders(workspaceId: string | null) {
  return useQuery({
    queryKey: ['folders', workspaceId],
    queryFn: () => foldersApi.list(workspaceId!),
    enabled: workspaceId !== null,
    staleTime: 2 * 60 * 1000,
  })
}
