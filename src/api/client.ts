import axios from 'axios'
import { message } from 'ant-design-vue'
import { apiBaseUrl } from '@/utils/env'
import { clearStoredUser, clearToken, getToken } from '@/utils/storage'
import { isMockEnabled } from '@/utils/env'
import { mockRequest } from '@/mock/rest'

export const http = axios.create({
  baseURL: apiBaseUrl,
  timeout: 300_000,
})

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers['X-Access-Token'] = token
  }

  return config
})

http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status
    const description =
      error.response?.data?.message || error.message || '请求失败，请稍后重试'

    if (status === 401) {
      clearToken()
      clearStoredUser()
      window.location.href = '/login'
    }

    message.error(description)
    return Promise.reject(error)
  },
)

export function restGet<T>(
  url: string,
  params?: Record<string, unknown>,
): Promise<T> {
  if (isMockEnabled) {
    return mockRequest<T>('GET', url, { params })
  }

  return http.get<T, T>(url, { params })
}

export function restPost<T>(
  url: string,
  data?: Record<string, unknown>,
): Promise<T> {
  if (isMockEnabled) {
    return mockRequest<T>('POST', url, { data })
  }

  return http.post<T, T>(url, data)
}

export function restDelete<T>(
  url: string,
  params?: Record<string, unknown>,
): Promise<T> {
  if (isMockEnabled) {
    return mockRequest<T>('DELETE', url, { params })
  }

  return http.delete<T, T>(url, { params })
}
