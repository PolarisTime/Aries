import { useNavigate } from '@tanstack/react-router'
import Form from 'antd/es/form'
import { useCallback, useEffect, useState } from 'react'
import { http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { syncCurrentUserTotpState } from '@/stores/auth-user-sync'
import type { ApiResponse } from '@/types/api'
import { message } from '@/utils/antd-app'

interface TotpSetupData {
  qrCodeBase64: string
  secret: string
}

interface TotpCodeFormValues {
  totpCode: string
}

export function useSetupTwoFactorState() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [enabling, setEnabling] = useState(false)
  const [totpData, setTotpData] = useState<TotpSetupData | null>(null)
  const [form] = Form.useForm<TotpCodeFormValues>()

  const resolveRedirectTarget = useCallback(() => {
    if (typeof window === 'undefined') {
      return '/dashboard'
    }

    const redirect =
      new URLSearchParams(window.location.search).get('redirect') ||
      '/dashboard'
    if (!redirect.startsWith('/') || /^https?:\/\//i.test(redirect)) {
      return '/dashboard'
    }
    return redirect
  }, [])

  const fetchTotpSetup = useCallback(async () => {
    setLoading(true)
    try {
      const res = await http.post<ApiResponse<TotpSetupData>>(
        ENDPOINTS.ACCOUNT_2FA_SETUP,
        {},
      )
      setTotpData(res.data)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '获取2FA设置失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time data fetch requires setState
    void fetchTotpSetup()
  }, [fetchTotpSetup])

  const handleEnable = useCallback(
    async (values: TotpCodeFormValues) => {
      try {
        setEnabling(true)
        await http.post(ENDPOINTS.ACCOUNT_2FA_ENABLE, {
          totpCode: values.totpCode,
        })
        syncCurrentUserTotpState(true)
        message.success('二次验证已启用')
        setTimeout(() => {
          void navigate({ to: resolveRedirectTarget() as '/' })
        }, 300)
      } catch (error) {
        message.error(error instanceof Error ? error.message : '启用2FA失败')
      } finally {
        setEnabling(false)
      }
    },
    [navigate, resolveRedirectTarget],
  )

  return {
    enabling,
    fetchTotpSetup,
    form,
    handleEnable,
    loading,
    totpData,
  }
}
