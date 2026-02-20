import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

export interface Variable {
  id: string
  name: string
  value: string
  scope: 'USER' | 'WORKSPACE'
  userId: string | null
  workspaceId: string | null
  organizationId: string
  createdAt: string
  updatedAt: string
}

export interface VariableInput {
  name: string
  value: string
  scope: 'USER' | 'WORKSPACE'
  workspaceId?: string | null
}

export const variablesApi = {
  list: () => api.get<Variable[]>('/variables').then((r) => r.data),

  create: (data: VariableInput) =>
    api.post<Variable>('/variables', data).then((r) => r.data),

  update: (id: string, data: Partial<VariableInput>) =>
    api.patch<Variable>(`/variables/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/variables/${id}`),
}

export function useVariables() {
  return useQuery({
    queryKey: ['variables'],
    queryFn: () => variablesApi.list(),
    staleTime: 60 * 1000,
  })
}

export function useCreateVariable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: VariableInput) => variablesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['variables'] })
    },
  })
}

export function useUpdateVariable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VariableInput> }) =>
      variablesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['variables'] })
    },
  })
}

export function useDeleteVariable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => variablesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['variables'] })
    },
  })
}
