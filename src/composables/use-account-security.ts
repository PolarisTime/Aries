import { computed, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  changeOwnPassword,
  disableOwn2fa,
  enableOwn2fa,
  setupOwn2fa,
} from '@/api/account-security'
import { showRequestError } from '@/composables/use-request-error'
import { useAuthStore } from '@/stores/auth'
import type { TotpSetupResponse } from '@/types/auth'
import { setStoredUser } from '@/utils/storage'

export function useAccountSecurity() {
  const authStore = useAuthStore()

  const passwordSaving = ref(false)
  const twoFactorSetupLoading = ref(false)
  const twoFactorEnableLoading = ref(false)
  const twoFactorDisableLoading = ref(false)
  const twoFactorSetup = ref<TotpSetupResponse | null>(null)
  const twoFactorCode = ref('')

  const passwordForm = reactive({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const disableTwoFactorForm = reactive({
    totpCode: '',
  })

  const currentUserTotpEnabled = computed(() => Boolean(authStore.user?.totpEnabled))

  function syncCurrentUserSecurity(security: { totpEnabled?: boolean; forceTotpSetup?: boolean }) {
    if (!authStore.user) {
      return
    }
    const nextUser = {
      ...authStore.user,
      totpEnabled: Boolean(security.totpEnabled),
      forceTotpSetup: Boolean(security.forceTotpSetup),
    }
    authStore.user = nextUser
    setStoredUser(nextUser)
  }

  function resetSecurityForms() {
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    disableTwoFactorForm.totpCode = ''
    twoFactorSetup.value = null
    twoFactorCode.value = ''
  }

  async function handleChangeOwnPassword() {
    if (!passwordForm.currentPassword.trim()) {
      message.warning('请填写当前密码')
      return
    }
    if (!passwordForm.newPassword.trim()) {
      message.warning('请填写新密码')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      message.warning('两次输入的新密码不一致')
      return
    }

    passwordSaving.value = true
    try {
      const response = await changeOwnPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })
      message.success(response.message || '密码修改成功')
      passwordForm.currentPassword = ''
      passwordForm.newPassword = ''
      passwordForm.confirmPassword = ''
    } catch (error) {
      showRequestError(error, '修改密码失败')
    } finally {
      passwordSaving.value = false
    }
  }

  async function handleSetupOwn2fa() {
    twoFactorSetupLoading.value = true
    try {
      const response = await setupOwn2fa()
      twoFactorSetup.value = response.data
      twoFactorCode.value = ''
      message.success(response.message || '二维码生成成功')
    } catch (error) {
      showRequestError(error, '生成 2FA 二维码失败')
    } finally {
      twoFactorSetupLoading.value = false
    }
  }

  async function handleEnableOwn2fa() {
    if (!/^\d{6}$/.test(twoFactorCode.value.trim())) {
      message.warning('请输入 6 位动态验证码')
      return
    }

    twoFactorEnableLoading.value = true
    try {
      const response = await enableOwn2fa(twoFactorCode.value.trim())
      syncCurrentUserSecurity(response.data || {})
      twoFactorSetup.value = null
      twoFactorCode.value = ''
      message.success(response.message || '2FA 已启用')
    } catch (error) {
      showRequestError(error, '启用 2FA 失败')
    } finally {
      twoFactorEnableLoading.value = false
    }
  }

  async function handleDisableOwn2fa() {
    if (!/^\d{6}$/.test(disableTwoFactorForm.totpCode.trim())) {
      message.warning('请输入当前有效的 6 位 2FA 验证码')
      return
    }

    twoFactorDisableLoading.value = true
    try {
      const response = await disableOwn2fa(disableTwoFactorForm.totpCode.trim())
      syncCurrentUserSecurity(response.data || {})
      disableTwoFactorForm.totpCode = ''
      twoFactorSetup.value = null
      twoFactorCode.value = ''
      message.success(response.message || '2FA 已关闭')
    } catch (error) {
      showRequestError(error, '关闭 2FA 失败')
    } finally {
      twoFactorDisableLoading.value = false
    }
  }

  return {
    passwordSaving,
    twoFactorSetupLoading,
    twoFactorEnableLoading,
    twoFactorDisableLoading,
    twoFactorSetup,
    twoFactorCode,
    passwordForm,
    disableTwoFactorForm,
    currentUserTotpEnabled,
    syncCurrentUserSecurity,
    resetSecurityForms,
    handleChangeOwnPassword,
    handleSetupOwn2fa,
    handleEnableOwn2fa,
    handleDisableOwn2fa,
  }
}
