import axios from 'axios'

// All requests go to /api — Vite proxies to localhost:3001 in dev,
// nginx proxies to the backend container in production.
export const api = axios.create({
  baseURL: '/api/v1',
})

// Attach the JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// If the server returns 401, clear the token and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
