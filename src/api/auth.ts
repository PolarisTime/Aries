import md5 from 'md5'
import { http } from './client'
import {
  mockGetCaptcha,
  mockGetCheckcodeFlag,
  mockLogin,
  mockLogout,
} from '@/mock/server'
import type {
  ApiResponse,
  CaptchaData,
  LoginPayload,
  LoginResponseData,
} from '@/types/auth'
import { isMockEnabled } from '@/utils/env'

export function getCheckcodeFlag() {
  if (isMockEnabled) {
    return mockGetCheckcodeFlag()
  }

  return http.get<string, string>('/platformConfig/getPlatform/checkcodeFlag')
}

export function getCaptcha() {
  if (isMockEnabled) {
    return mockGetCaptcha()
  }

  return http.get<ApiResponse<CaptchaData>, ApiResponse<CaptchaData>>(
    '/user/randomImage',
  )
}

export function login(payload: LoginPayload) {
  if (isMockEnabled) {
    return mockLogin(payload)
  }

  return http.post<ApiResponse<LoginResponseData>, ApiResponse<LoginResponseData>>(
    '/user/login',
    {
      ...payload,
      password: md5(payload.password),
    },
  )
}

export function logout() {
  if (isMockEnabled) {
    return mockLogout()
  }

  return http.get('/user/logout')
}
