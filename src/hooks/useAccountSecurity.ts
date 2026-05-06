import { useState, useCallback } from 'react'
import { http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import { message } from '@/utils/antd-app'

export function useAccountSecurity() {
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [twoFactorSetupLoading, setTwoFactorSetupLoading] = useState(false)
  const [twoFactorEnableLoading, setTwoFactorEnableLoading] = useState(false)
  const [twoFactorDisableLoading, setTwoFactorDisableLoading] = useState(false)

  const handleChangePassword = useCallback(async (values: { oldPassword: string; newPassword: string }) => {
    setPasswordSaving(true)
    try {
      await http.post(ENDPOINTS.ACCOUNT_PASSWORD, values)
      message.success('密码修改成功')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '密码修改失败')
    } finally { setPasswordSaving(false) }
  }, [])

  const handleSetup2fa = useCallback(async () => {
    setTwoFactorSetupLoading(true)
    try {
      const res = await http.post<ApiResponse<{ qrCodeBase64: string; secret: string }>>(`${ENDPOINTS.ACCOUNT_2FA_SETUP}`, {})
      return res.data
    } catch (err) {
      message.error(err instanceof Error ? err.message : '获取2FA设置失败')
    } finally { setTwoFactorSetupLoading(false) }
  }, [])

  const handleEnable2fa = useCallback(async (totpCode: string) => {
    setTwoFactorEnableLoading(true)
    try {
      await http.post(ENDPOINTS.ACCOUNT_2FA_ENABLE, { totpCode })
      message.success('二次验证已启用')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '启用2FA失败')
    } finally { setTwoFactorEnableLoading(false) }
  }, [])

  const handleDisable2fa = useCallback(async (totpCode: string) => {
    setTwoFactorDisableLoading(true)
    try {
      await http.post(ENDPOINTS.ACCOUNT_2FA_DISABLE, { totpCode })
      message.success('二次验证已禁用')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '禁用2FA失败')
    } finally { setTwoFactorDisableLoading(false) }
  }, [])

  return {
    passwordSaving, twoFactorSetupLoading, twoFactorEnableLoading, twoFactorDisableLoading,
    handleChangePassword, handleSetup2fa, handleEnable2fa, handleDisable2fa,
  }
}
