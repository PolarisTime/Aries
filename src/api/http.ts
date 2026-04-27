import axios from 'axios'
import { apiBaseUrl } from '@/utils/env'

export const http = axios.create({
  baseURL: apiBaseUrl,
  timeout: 300_000,
  withCredentials: true,
})

export const authHttp = axios.create({
  baseURL: apiBaseUrl,
  timeout: 300_000,
  withCredentials: true,
})
