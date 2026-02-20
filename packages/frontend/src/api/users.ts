import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

export type RoleType = 'WORKSPACE_ADMIN' | 'EDITOR' | 'VIEWER'

export interface WorkspaceRole {
  workspaceId: string
  role: RoleType
  workspace: { id: string; name: string }
}

export interface OrgUser {
  id: string
  email: string
  firstName: string
  lastName: string
  isGlobalAdmin: boolean
  createdAt: string
  workspaceRoles: WorkspaceRole[]
}

export interface InviteInput {
  email: string
  firstName: string
  lastName: string
  password: string
}

export const usersApi = {
  list: () => api.get<OrgUser[]>('/users').then((r) => r.data),

  invite: (data: InviteInput) =>
    api.post<OrgUser>('/users/invite', data).then((r) => r.data),

  assignRole: (userId: string, workspaceId: string, role: RoleType) =>
    api.post<OrgUser>(`/users/${userId}/workspace-roles`, { workspaceId, role }).then((r) => r.data),

  removeRole: (userId: string, workspaceId: string) =>
    api.delete<OrgUser>(`/users/${userId}/workspace-roles/${workspaceId}`).then((r) => r.data),

  resetPassword: (userId: string, newPassword: string) =>
    api.post(`/users/${userId}/reset-password`, { newPassword }).then((r) => r.data),

  personalWorkspaceExportUrl: (userId: string) =>
    `/api/v1/users/${userId}/personal-workspace/export`,
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
    staleTime: 60 * 1000,
  })
}

export function useInviteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: InviteInput) => usersApi.invite(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useAssignRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, workspaceId, role }: { userId: string; workspaceId: string; role: RoleType }) =>
      usersApi.assignRole(userId, workspaceId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useRemoveRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, workspaceId }: { userId: string; workspaceId: string }) =>
      usersApi.removeRole(userId, workspaceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ userId, newPassword }: { userId: string; newPassword: string }) =>
      usersApi.resetPassword(userId, newPassword),
  })
}
