import { api } from './client'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  isGlobalAdmin: boolean
  organizationId: string
  createdAt: string
}

export interface AuthResponse {
  token: string
  user: User
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }).then((r) => r.data),

  register: (data: {
    email: string
    password: string
    firstName: string
    lastName: string
    organizationName: string
  }) => api.post<AuthResponse>('/auth/register', data).then((r) => r.data),

  me: () => api.get<User>('/auth/me').then((r) => r.data),
}
