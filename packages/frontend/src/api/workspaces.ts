import { useQuery } from '@tanstack/react-query'
import { api } from './client'

export interface Workspace {
  id: string
  name: string
  isPersonal: boolean
  organizationId: string
  ownerId: string | null
  _count: { folders: number }
}

export const workspacesApi = {
  list: () => api.get<Workspace[]>('/workspaces').then((r) => r.data),
}

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: workspacesApi.list,
    staleTime: 5 * 60 * 1000,
  })
}
