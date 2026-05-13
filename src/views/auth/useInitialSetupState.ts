import { useNavigate } from '@tanstack/react-router'
import Form from 'antd/es/form'
import { useCallback, useEffect, useState } from 'react'
import {
  getInitialSetupStatus,
  setupInitialAdmin2fa,
  submitInitialAdmin,
  submitInitialCompany,
} from '@/api/setup'
import type { InitialSetupStatus, InitialSetupTotpResult } from '@/types/setup'
import { message } from '@/utils/antd-app'

export type SetupStep = 'admin' | 'company'

export function useInitialSetupState() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [status, setStatus] = useState<InitialSetupStatus | null>(null)
  const [currentStep, setCurrentStep] = useState<SetupStep>('admin')
  const [adminCompleted, setAdminCompleted] = useState(false)
  const [totpSetup, setTotpSetup] = useState<InitialSetupTotpResult | null>(
    null,
  )
  const [loadingTotp, setLoadingTotp] = useState(false)
  const [loadingAdmin, setLoadingAdmin] = useState(false)
  const [loadingCompany, setLoadingCompany] = useState(false)
  const [form] = Form.useForm()

  const loadStatus = useCallback(async () => {
    try {
      const res = await getInitialSetupStatus()
      setStatus(res.data)

      if (res.data.adminConfigured && !res.data.companyConfigured) {
        setAdminCompleted(true)
        setCurrentStep('company')
      } else if (!res.data.adminConfigured) {
        setAdminCompleted(false)
        setCurrentStep('admin')
      }

      if (!res.data.setupRequired) {
        message.info('系统已完成初始化，即将跳转登录页')
        setTimeout(() => navigate({ to: '/login' as '/' }), 1500)
      }
    } catch {
      message.error('获取初始化状态失败')
    } finally {
      setChecking(false)
    }
  }, [navigate])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  const handleGenerateTotp = useCallback(async () => {
    const loginName = form.getFieldValue('adminLoginName')?.trim()
    if (!loginName) {
      message.error('请先输入管理员登录名')
      return
    }

    setLoadingTotp(true)
    try {
      const res = await setupInitialAdmin2fa({ loginName })
      setTotpSetup(res.data)
      message.success('TOTP 密钥已生成')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '生成2FA失败')
    } finally {
      setLoadingTotp(false)
    }
  }, [form])

  const handleSubmitAdmin = useCallback(async () => {
    try {
      const values = await form.validateFields([
        'adminLoginName',
        'adminPassword',
        'adminConfirmPassword',
        'adminUserName',
        'totpCode',
      ])
      if (values.adminPassword !== values.adminConfirmPassword) {
        message.error('两次密码输入不一致')
        return
      }
      if (!totpSetup?.secret) {
        message.error('请先生成TOTP')
        return
      }

      setLoadingAdmin(true)
      const res = await submitInitialAdmin({
        admin: {
          loginName: values.adminLoginName.trim(),
          password: values.adminPassword,
          userName: (values.adminUserName || '系统管理员').trim(),
        },
        totpSecret: totpSetup.secret,
        totpCode: values.totpCode.trim(),
      })
      message.success(res.message || '管理员创建成功')
      setAdminCompleted(true)
      setCurrentStep('company')
      await loadStatus()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '创建管理员失败')
    } finally {
      setLoadingAdmin(false)
    }
  }, [form, loadStatus, totpSetup])

  const handleSubmitCompany = useCallback(async () => {
    try {
      const values = await form.validateFields([
        'companyName',
        'taxNo',
        'bankName',
        'bankAccount',
      ])
      setLoadingCompany(true)
      const res = await submitInitialCompany({
        companyName: values.companyName.trim(),
        taxNo: values.taxNo.trim(),
        bankName: values.bankName.trim(),
        bankAccount: values.bankAccount.trim(),
        taxRate: values.taxRate || 0.13,
        remark: values.remark?.trim() || '',
      })
      message.success(res.message || '公司信息初始化完成')
      navigate({ to: '/login' as '/' })
    } catch (error) {
      message.error(error instanceof Error ? error.message : '初始化公司失败')
    } finally {
      setLoadingCompany(false)
    }
  }, [form, navigate])

  return {
    adminCompleted,
    checking,
    currentStep,
    form,
    handleGenerateTotp,
    handleSubmitAdmin,
    handleSubmitCompany,
    loadingAdmin,
    loadingCompany,
    loadingTotp,
    setCurrentStep,
    status,
    totpSetup,
  }
}
