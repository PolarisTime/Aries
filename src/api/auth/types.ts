import type { InternalAxiosRequestConfig } from 'axios'

export type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
  suppressGlobalErrorStatuses?: readonly number[]
}
