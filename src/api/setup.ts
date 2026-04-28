import { assertApiSuccess, http } from './client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import type {
  InitialSetupAdminSubmitPayload,
  InitialSetupCompanyPayload,
  InitialSetupPayload,
  InitialSetupResult,
  InitialSetupStatus,
  InitialSetupTotpPayload,
  InitialSetupTotpResult,
} from '@/types/setup'

export async function getInitialSetupStatus() {
  const response = await http.get<ApiResponse<InitialSetupStatus>>(ENDPOINTS.SETUP_STATUS)
  return assertApiSuccess(response, '获取初始化状态失败')
}

export async function submitInitialSetup(payload: InitialSetupPayload) {
  const response = await http.post<ApiResponse<InitialSetupResult>>(ENDPOINTS.SETUP_INITIALIZE, payload)
  return assertApiSuccess(response, '首次初始化失败')
}

export async function setupInitialAdmin2fa(payload: InitialSetupTotpPayload) {
  const response = await http.post<ApiResponse<InitialSetupTotpResult>>(ENDPOINTS.SETUP_ADMIN_2FA, payload)
  return assertApiSuccess(response, '生成管理员 2FA 失败')
}

export async function submitInitialAdmin(payload: InitialSetupAdminSubmitPayload) {
  const response = await http.post<ApiResponse<InitialSetupResult>>(ENDPOINTS.SETUP_ADMIN, payload)
  return assertApiSuccess(response, '管理员账号初始化失败')
}

export async function submitInitialCompany(payload: InitialSetupCompanyPayload) {
  const response = await http.post<ApiResponse<InitialSetupResult>>(ENDPOINTS.SETUP_COMPANY, payload)
  return assertApiSuccess(response, '公司主体初始化失败')
}
