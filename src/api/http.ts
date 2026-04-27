import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { apiBaseUrl } from '@/utils/env'

const rawHttp = axios.create({
  baseURL: apiBaseUrl,
  timeout: 300_000,
  withCredentials: true,
})

export const authHttp = axios.create({
  baseURL: apiBaseUrl,
  timeout: 300_000,
  withCredentials: true,
})

// Response interceptor strips response.data, so the effective return type is T, not AxiosResponse<T>.
// This wrapper provides correctly-typed methods that reflect the interceptor behavior.
function createApiClient(instance: AxiosInstance) {
  return {
    get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
      return instance.get(url, config) as Promise<T>
    },
    post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
      return instance.post(url, data, config) as Promise<T>
    },
    put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
      return instance.put(url, data, config) as Promise<T>
    },
    delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
      return instance.delete(url, config) as Promise<T>
    },
    get instance() {
      return instance
    },
  }
}

export type ApiClient = ReturnType<typeof createApiClient>

export const http = createApiClient(rawHttp)
