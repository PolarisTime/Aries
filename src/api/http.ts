import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import { apiBaseUrl } from '@/utils/env'

const defaultConfig = {
  baseURL: apiBaseUrl,
  timeout: 300_000,
  withCredentials: true,
}

const rawHttp = axios.create(defaultConfig)

export const authHttp = axios.create(defaultConfig)

// Response interceptor strips response.data, so the effective return type is T, not AxiosResponse<T>.
// This wrapper provides correctly-typed methods that reflect the interceptor behavior.
function createApiClient(instance: AxiosInstance) {
  return {
    get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
      return instance.get(url, config)
    },
    post<T = unknown>(
      url: string,
      data?: unknown,
      config?: AxiosRequestConfig,
    ): Promise<T> {
      return instance.post(url, data, config)
    },
    put<T = unknown>(
      url: string,
      data?: unknown,
      config?: AxiosRequestConfig,
    ): Promise<T> {
      return instance.put(url, data, config)
    },
    delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
      return instance.delete(url, config)
    },
    get instance() {
      return instance
    },
  }
}


export const http = createApiClient(rawHttp)
