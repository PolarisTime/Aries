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

function asApiResponse<T>(response: Promise<unknown>): Promise<T> {
  return response as Promise<T>
}

// Response interceptor strips response.data, so the effective return type is T, not AxiosResponse<T>.
// This wrapper provides correctly-typed methods that reflect the interceptor behavior.
function createApiClient(instance: AxiosInstance) {
  return {
    get<T = unknown>(url: string, config?: ApiRequestConfig): Promise<T> {
      return asApiResponse<T>(instance.get<T, T>(url, config))
    },
    post<T = unknown>(
      url: string,
      data?: unknown,
      config?: ApiRequestConfig,
    ): Promise<T> {
      return asApiResponse<T>(instance.post<T, T>(url, data, config))
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
      return instance.post<T, AxiosResponse<T>>(url, data, fullResponseConfig)
    },
    put<T = unknown>(
      url: string,
      data?: unknown,
      config?: ApiRequestConfig,
    ): Promise<T> {
      return asApiResponse<T>(instance.put<T, T>(url, data, config))
    },
    patch<T = unknown>(
      url: string,
      data?: unknown,
      config?: ApiRequestConfig,
    ): Promise<T> {
      return asApiResponse<T>(instance.patch<T, T>(url, data, config))
    },
    delete<T = unknown>(url: string, config?: ApiRequestConfig): Promise<T> {
      return asApiResponse<T>(instance.delete<T, T>(url, config))
    },
    get instance() {
      return instance
    },
  }
}

export const http = createApiClient(rawHttp)
