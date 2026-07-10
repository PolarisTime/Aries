import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  disableUserAccount2fa,
  enableUserAccount2fa,
  getUserAccountDetail,
  setupUserAccount2fa,
} from '@/api/user-accounts'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useRequestError } from '@/hooks/useRequestError'
import type { TotpSetupResponse, UserAccountRecord } from '@/shared/schemas'
import { syncCurrentUserTotpStateById } from '@/stores/auth-user-sync'
import { useAuthStore } from '@/stores/authStore'
import { message, modal } from '@/utils/antd-app'

interface TwoFaSession {
  version: number
  targetId: string | null
}

interface TwoFaOperation {
  version: number
  sessionVersion: number
  targetId: string
}

export function useUserAccountTwoFactor() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { showError } = useRequestError()
  const currentUser = useAuthStore((state) => state.user)
  const twoFaSessionRef = useRef<TwoFaSession>({
    version: 0,
    targetId: null,
  })
  const operationVersionRef = useRef(0)
  const detailAbortControllerRef = useRef<AbortController | null>(null)

  const [twoFaOpen, setTwoFaOpen] = useState(false)
  const [twoFaLoading, setTwoFaLoading] = useState(false)
  const [twoFaRecord, setTwoFaRecord] = useState<UserAccountRecord | null>(null)
  const [twoFaSetup, setTwoFaSetup] = useState<TotpSetupResponse | null>(null)
  const [twoFaCode, setTwoFaCode] = useState('')
  const [twoFaSetupLoading, setTwoFaSetupLoading] = useState(false)
  const [twoFaEnableLoading, setTwoFaEnableLoading] = useState(false)
  const [twoFaDisableLoading, setTwoFaDisableLoading] = useState(false)

  const startTwoFaSession = (targetId: string): TwoFaSession => {
    detailAbortControllerRef.current?.abort()
    detailAbortControllerRef.current = null
    const session = {
      version: twoFaSessionRef.current.version + 1,
      targetId,
    }
    twoFaSessionRef.current = session
    operationVersionRef.current += 1
    return session
  }

  const invalidateTwoFaSession = () => {
    detailAbortControllerRef.current?.abort()
    detailAbortControllerRef.current = null
    twoFaSessionRef.current = {
      version: twoFaSessionRef.current.version + 1,
      targetId: null,
    }
    operationVersionRef.current += 1
  }

  const isCurrentTwoFaTarget = (session: TwoFaSession, targetId: string) =>
    twoFaSessionRef.current.version === session.version &&
    twoFaSessionRef.current.targetId === session.targetId &&
    session.targetId === targetId

  const startTwoFaOperation = (
    session: TwoFaSession,
    targetId: string,
  ): TwoFaOperation => {
    const operation = {
      version: operationVersionRef.current + 1,
      sessionVersion: session.version,
      targetId,
    }
    operationVersionRef.current = operation.version
    return operation
  }

  const isCurrentTwoFaOperation = (
    operation: TwoFaOperation,
    responseTargetId = operation.targetId,
  ) =>
    operationVersionRef.current === operation.version &&
    twoFaSessionRef.current.version === operation.sessionVersion &&
    twoFaSessionRef.current.targetId === operation.targetId &&
    responseTargetId === operation.targetId

  const resetOperationLoading = () => {
    setTwoFaSetupLoading(false)
    setTwoFaEnableLoading(false)
    setTwoFaDisableLoading(false)
  }

  useEffect(
    () => () => {
      detailAbortControllerRef.current?.abort()
      detailAbortControllerRef.current = null
      twoFaSessionRef.current = {
        version: twoFaSessionRef.current.version + 1,
        targetId: null,
      }
      operationVersionRef.current += 1
    },
    [],
  )

  const syncCurrentUserTotpState = (record: UserAccountRecord | null) => {
    if (!record || !currentUser) return
    if (String(currentUser.id) !== String(record.id)) return
    syncCurrentUserTotpStateById(record.id, record.totpEnabled)
  }

  const refreshUsers = () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userAccountBase })
  }

  const open2faModal = async (record: UserAccountRecord) => {
    const targetId = String(record.id)
    const session = startTwoFaSession(targetId)
    const abortController = new AbortController()
    detailAbortControllerRef.current = abortController
    setTwoFaOpen(true)
    setTwoFaLoading(true)
    setTwoFaRecord(null)
    setTwoFaSetup(null)
    setTwoFaCode('')
    resetOperationLoading()
    try {
      const detail = await getUserAccountDetail(
        targetId,
        abortController.signal,
      )
      if (
        !isCurrentTwoFaTarget(session, targetId) ||
        String(detail.id) !== targetId
      ) {
        return
      }
      setTwoFaRecord(detail)
    } catch (error) {
      if (!isCurrentTwoFaTarget(session, targetId)) return
      showError(error, t('auth.user2fa.loadFailed'))
      setTwoFaLoading(false)
      invalidateTwoFaSession()
      setTwoFaOpen(false)
    } finally {
      if (isCurrentTwoFaTarget(session, targetId)) {
        setTwoFaLoading(false)
        if (detailAbortControllerRef.current === abortController) {
          detailAbortControllerRef.current = null
        }
      }
    }
  }

  const handleGenerate2fa = async () => {
    if (!twoFaRecord) return
    const targetId = String(twoFaRecord.id)
    const session = { ...twoFaSessionRef.current }
    if (!isCurrentTwoFaTarget(session, targetId)) return
    const operation = startTwoFaOperation(session, targetId)
    resetOperationLoading()
    setTwoFaSetupLoading(true)
    try {
      const response = await setupUserAccount2fa(targetId)
      if (!isCurrentTwoFaOperation(operation)) return
      setTwoFaSetup(response.data)
      setTwoFaCode('')
      message.success(response.message || t('auth.user2fa.generateSuccess'))
    } catch (error) {
      if (isCurrentTwoFaOperation(operation)) {
        showError(error, t('auth.user2fa.generateFailed'))
      }
    } finally {
      if (isCurrentTwoFaOperation(operation)) {
        setTwoFaSetupLoading(false)
      }
    }
  }

  const handleEnable2fa = async () => {
    if (!twoFaRecord) return
    const targetId = String(twoFaRecord.id)
    const session = { ...twoFaSessionRef.current }
    if (!isCurrentTwoFaTarget(session, targetId)) return
    const normalizedCode = twoFaCode.trim()
    if (!/^\d{6}$/.test(normalizedCode)) {
      message.warning(t('auth.user2fa.codeInvalid'))
      return
    }
    const operation = startTwoFaOperation(session, targetId)
    resetOperationLoading()
    setTwoFaEnableLoading(true)
    try {
      const response = await enableUserAccount2fa(targetId, normalizedCode)
      if (!isCurrentTwoFaOperation(operation, String(response.data.id))) {
        return
      }
      setTwoFaRecord(response.data)
      syncCurrentUserTotpState(response.data)
      setTwoFaSetup(null)
      setTwoFaCode('')
      message.success(response.message || t('auth.user2fa.enableSuccess'))
      setTwoFaOpen(false)
      refreshUsers()
      setTwoFaEnableLoading(false)
      invalidateTwoFaSession()
    } catch (error) {
      if (isCurrentTwoFaOperation(operation)) {
        showError(error, t('auth.user2fa.enableFailed'))
      }
    } finally {
      if (isCurrentTwoFaOperation(operation)) {
        setTwoFaEnableLoading(false)
      }
    }
  }

  const handleDisable2fa = () => {
    if (!twoFaRecord) return
    const targetId = String(twoFaRecord.id)
    const session = { ...twoFaSessionRef.current }
    if (!isCurrentTwoFaTarget(session, targetId)) return
    const normalizedCode = twoFaCode.trim()
    if (!/^\d{6}$/.test(normalizedCode)) {
      message.warning(t('auth.user2fa.codeInvalid'))
      return
    }
    modal.confirm({
      title: t('auth.user2fa.disableTitle'),
      content: t('auth.user2fa.disableContent', {
        loginName: twoFaRecord.loginName,
      }),
      okText: t('auth.user2fa.disableOk'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        if (!isCurrentTwoFaTarget(session, targetId)) return
        const operation = startTwoFaOperation(session, targetId)
        resetOperationLoading()
        setTwoFaDisableLoading(true)
        try {
          const response = await disableUserAccount2fa(targetId, normalizedCode)
          if (!isCurrentTwoFaOperation(operation, String(response.data.id))) {
            return
          }
          setTwoFaRecord(response.data)
          syncCurrentUserTotpState(response.data)
          setTwoFaSetup(null)
          setTwoFaCode('')
          message.success(response.message || t('auth.user2fa.disableSuccess'))
          setTwoFaOpen(false)
          refreshUsers()
          setTwoFaDisableLoading(false)
          invalidateTwoFaSession()
        } catch (error) {
          if (isCurrentTwoFaOperation(operation)) {
            showError(error, t('auth.user2fa.disableFailed'))
          }
        } finally {
          if (isCurrentTwoFaOperation(operation)) {
            setTwoFaDisableLoading(false)
          }
        }
      },
    })
  }

  const close2faModal = () => {
    invalidateTwoFaSession()
    setTwoFaOpen(false)
    setTwoFaLoading(false)
    setTwoFaRecord(null)
    setTwoFaSetup(null)
    setTwoFaCode('')
    resetOperationLoading()
  }

  return {
    twoFaOpen,
    twoFaLoading,
    twoFaRecord,
    twoFaSetup,
    twoFaCode,
    twoFaSetupLoading,
    twoFaEnableLoading,
    twoFaDisableLoading,
    setTwoFaCode,
    open2faModal,
    handleGenerate2fa,
    handleEnable2fa,
    handleDisable2fa,
    close2faModal,
  }
}
