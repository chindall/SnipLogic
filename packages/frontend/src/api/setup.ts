import { api } from './client'

export const setupApi = {
  status: () => api.get<{ configured: boolean }>('/setup/status').then((r) => r.data),
}
