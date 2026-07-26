import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios'
import { apiBaseUrl } from '@/utils/env'

export type ApiRequestConfig = AxiosRequestConfig & {
  suppressGlobalErrorStatuses?: readonly number[]
  returnFullResponse?: boolean
}

const defaultConfig = {
  baseURL: apiBaseUrl,
  timeout: 30_000,
  withCredentials: true,
}

const rawHttp = axios.create(defaultConfig)

export const authHttp = axios.create(defaultConfig)

// Response interceptor strips response.data, so the effective return type is T, not AxiosResponse<T>.
// This wrapper provides correctly-typed methods that reflect the interceptor behavior.
function createApiClient(instance: AxiosInstance) {
  return {
    get<T = unknown>(url: string, config?: ApiRequestConfig): Promise<T> {
      return instance.get(url, config)
    },
    post<T = unknown>(
      url: string,
      data?: unknown,
      config?: ApiRequestConfig,
    ): Promise<T> {
      return instance.post(url, data, config)
    },
    postResponse<T = unknown>(
      url: string,
      data?: unknown,
      config?: ApiRequestConfig,
    ): Promise<AxiosResponse<T>> {
      const fullResponseConfig: ApiRequestConfig = {
        ...config,
        returnFullResponse: true,
      }
      return instance.post(url, data, fullResponseConfig)
    },
    put<T = unknown>(
      url: string,
      data?: unknown,
      config?: ApiRequestConfig,
    ): Promise<T> {
      return instance.put(url, data, config)
    },
    patch<T = unknown>(
      url: string,
      data?: unknown,
      config?: ApiRequestConfig,
    ): Promise<T> {
      return instance.patch(url, data, config)
    },
    delete<T = unknown>(url: string, config?: ApiRequestConfig): Promise<T> {
      return instance.delete(url, config)
    },
    get instance() {
      return instance
    },
  }
}

export const http = createApiClient(rawHttp)
