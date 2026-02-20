import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { RoleType } from './users'

export interface Workspace {
  id: string
  name: string
  isPersonal: boolean
  organizationId: string
  ownerId: string | null
  canWrite: boolean
  _count: { folders: number }
}

export interface ManagedWorkspaceMember {
  userId: string
  role: RoleType
  user: { id: string; firstName: string; lastName: string; email: string }
}

export interface ManagedWorkspace extends Omit<Workspace, 'canWrite'> {
  workspaceRoles: ManagedWorkspaceMember[]
}

export interface CreateWorkspaceInput {
  name: string
  memberRoles?: Array<{ userId: string; role: RoleType }>
}

export const workspacesApi = {
  list: () => api.get<Workspace[]>('/workspaces').then((r) => r.data),

  listManaged: () => api.get<ManagedWorkspace[]>('/workspaces/managed').then((r) => r.data),

  create: (data: CreateWorkspaceInput) =>
    api.post<ManagedWorkspace>('/workspaces', data).then((r) => r.data),

  rename: (id: string, name: string) =>
    api.patch<ManagedWorkspace>(`/workspaces/${id}`, { name }).then((r) => r.data),

  exportUrl: (id: string) => `/api/v1/workspaces/${id}/export`,

  delete: (id: string) => api.delete(`/workspaces/${id}`),
}

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: workspacesApi.list,
    staleTime: 5 * 60 * 1000,
  })
}

export function useManagedWorkspaces() {
  return useQuery({
    queryKey: ['workspaces', 'managed'],
    queryFn: workspacesApi.listManaged,
    staleTime: 60 * 1000,
  })
}

export function useCreateWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateWorkspaceInput) => workspacesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}

export function useRenameWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => workspacesApi.rename(id, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}

export function useDeleteWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => workspacesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}
