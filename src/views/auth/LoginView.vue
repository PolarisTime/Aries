<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMutation } from '@tanstack/vue-query'
import {
  ArrowLeftOutlined,
  LockOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { getInitialSetupStatus } from '@/api/setup'
import { useAuthStore } from '@/stores/auth'
import { requiresForcedTotpSetup } from '@/router'
import { fetchCaptcha } from '@/api/auth'
import type { LoginUser } from '@/types/auth'
import { appTitle } from '@/utils/env'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const TOTP_SESSION_KEY = 'aries-totp-session'

function saveTotpSession(token: string, deadline: number, loginName: string) {
  sessionStorage.setItem(TOTP_SESSION_KEY, JSON.stringify({ token, deadline, loginName }))
}

function clearTotpSession() {
  sessionStorage.removeItem(TOTP_SESSION_KEY)
}

function restoreTotpSession(): { token: string; deadline: number; loginName: string } | null {
  try {
    const raw = sessionStorage.getItem(TOTP_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed.token && parsed.deadline && Date.now() < parsed.deadline) {
      return parsed
    }
  } catch { /* ignore */ }
  sessionStorage.removeItem(TOTP_SESSION_KEY)
  return null
}

const savedSession = restoreTotpSession()
const loginStep = ref<'password' | 'totp'>(savedSession ? 'totp' : 'password')
const tempToken = ref(savedSession?.token || '')

const formState = reactive({
  loginName: savedSession?.loginName || '',
  password: '',
  remember: true,
  captchaId: '',
  captchaCode: '',
})
const totpCode = ref('')
const stepDeadline = ref(savedSession?.deadline || 0)
const now = ref(Date.now())
const checkingSetup = ref(true)
const companyName = ref('')

const captchaId = ref('')
const captchaImage = ref('')
const captchaRequired = ref(false)
const captchaCode = ref('')
const captchaLoading = ref(false)

async function fetchCaptchaData() {
  captchaLoading.value = true
  try {
    const res = await fetchCaptcha()
    if (res.data) {
      captchaId.value = res.data.captchaId
      captchaImage.value = res.data.captchaImage
      captchaRequired.value = res.data.required
    }
  } catch { /* silent */ }
  finally {
    captchaLoading.value = false
  }
}

function refreshCaptcha() {
  captchaCode.value = ''
  fetchCaptchaData()
}

let countdownTimer: ReturnType<typeof window.setInterval> | null = null

const isSubmitDisabled = computed(() => !formState.loginName || !formState.password)

const is2faSubmitDisabled = computed(() => {
  if (loginStep.value !== 'totp') {
    return true
  }
  return !/^\d{6}$/.test(totpCode.value.trim()) || remainingSeconds.value <= 0
})

const remainingSeconds = computed(() => {
  if (!stepDeadline.value) {
    return 0
  }
  return Math.max(Math.ceil((stepDeadline.value - now.value) / 1000), 0)
})

function resolveRedirectTarget() {
  const redirect =
    typeof route.query.redirect === 'string' && route.query.redirect
      ? route.query.redirect
      : '/dashboard'

  if (redirect.startsWith('/#/')) {
    return redirect.slice(2)
  }

  if (redirect.startsWith('#/')) {
    return redirect.slice(1)
  }

  if (/^https?:\/\//i.test(redirect)) {
    return '/dashboard'
  }

  return redirect
}

function resolvePostLoginTarget(user: LoginUser | null | undefined) {
  const redirect = resolveRedirectTarget()
  if (requiresForcedTotpSetup(user)) {
    return {
      path: '/setup-2fa',
      query: redirect ? { redirect } : undefined,
    }
  }
  return redirect
}

const countdownText = computed(() => {
  const total = remainingSeconds.value
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const loginMutation = useMutation({
  mutationFn: () =>
    authStore.signIn({
      loginName: formState.loginName,
      password: formState.password,
      remember: formState.remember,
      captchaId: captchaRequired.value ? captchaId.value : undefined,
      captchaCode: captchaRequired.value ? captchaCode.value : undefined,
    }),
  onSuccess: (result) => {
    if (result.requires2fa) {
      tempToken.value = result.tempToken
      totpCode.value = ''
      loginStep.value = 'totp'
      stepDeadline.value = Date.now() + 5 * 60 * 1000
      saveTotpSession(result.tempToken, stepDeadline.value, formState.loginName)
      startStepCountdown()
      message.info('账号密码已验证，请继续输入动态验证码')
      return
    }

    if (requiresForcedTotpSetup(result.user)) {
      message.warning('账号已登录，请先完成 2FA 绑定后再进入系统。')
    } else {
      message.success('登录成功，已接入现有后端认证接口。')
    }
    void router.replace(resolvePostLoginTarget(result.user))
  },
})

const login2faMutation = useMutation({
  mutationFn: () =>
    authStore.verify2fa({
      tempToken: tempToken.value,
      totpCode: totpCode.value.trim(),
      remember: formState.remember,
    }),
  onSuccess: () => {
    stopStepCountdown()
    clearTotpSession()
    message.success('登录成功，二次验证已通过。')
    void router.replace(resolvePostLoginTarget(authStore.user))
  },
})

function stopStepCountdown() {
  if (countdownTimer != null) {
    window.clearInterval(countdownTimer)
    countdownTimer = null
  }
}

function startStepCountdown() {
  stopStepCountdown()
  if (!stepDeadline.value) {
    stepDeadline.value = Date.now() + 5 * 60 * 1000
  }
  now.value = Date.now()
  countdownTimer = window.setInterval(() => {
    now.value = Date.now()
    if (remainingSeconds.value <= 0) {
      reset2faStep(true)
    }
  }, 1000)
}

function reset2faStep(showMessage = false) {
  stopStepCountdown()
  clearTotpSession()
  loginStep.value = 'password'
  tempToken.value = ''
  totpCode.value = ''
  stepDeadline.value = 0
  now.value = Date.now()
  if (showMessage) {
    message.warning('二次验证已超时，请重新输入账号密码')
  }
}

async function handleLogin() {
  if (isSubmitDisabled.value || loginMutation.isPending.value) {
    return
  }
  formState.captchaId = captchaId.value
  formState.captchaCode = captchaCode.value
  try {
    await loginMutation.mutateAsync()
  } catch {
    refreshCaptcha()
  }
}

async function handleVerify2fa() {
  if (is2faSubmitDisabled.value || login2faMutation.isPending.value) {
    return
  }
  try {
    await login2faMutation.mutateAsync()
  } catch {
    // Error feedback is handled in the interceptor / mutation callbacks.
  }
}

async function checkSetupStatus() {
  try {
    const response = await getInitialSetupStatus()
    if (response.data.setupRequired) {
      await router.replace('/setup')
      return
    }
    if (route.query.initialized === '1') {
      message.success('首次初始化完成，请使用刚创建的管理员账号登录。')
    }
  } finally {
    checkingSetup.value = false
  }
}

onMounted(async () => {
  authStore.hydrate()
  await checkSetupStatus()
  fetchCaptchaData()
  if (loginStep.value === 'totp') {
    startStepCountdown()
  }
  try {
    const res = await http.get<{ data: string }>(ENDPOINTS.COMPANY_NAME)
    companyName.value = res.data || ''
  } catch { /* silent */ }
})

onBeforeUnmount(() => {
  stopStepCountdown()
})
</script>

<template>
  <div class="login-layout">
    <div class="login-container">
      <div class="login-slogan">
        <h1>{{ appTitle }}</h1>
        <p class="login-slogan-subtitle">钢贸业务中台管理系统</p>
        <p class="login-slogan-desc">
          面向钢材贸易企业的一站式数字化管理平台，覆盖采购、销售、物流、财务全链路。
        </p>
        <div class="login-slogan-footer">
          <span>高效 · 精准 · 可靠</span>
        </div>
      </div>

      <a-card :bordered="false" class="login-form-card">
        <div class="login-form-head">
          <h2>{{ $t('auth.login') }}</h2>
          <p>{{ companyName || '企业级钢贸管理平台' }}</p>
        </div>

        <div class="centered-form-stage centered-form-stage-login">
          <a-skeleton
            v-if="checkingSetup"
            active
            :paragraph="{ rows: 6 }"
            class="centered-form-shell"
          />

          <a-form
            v-else-if="loginStep === 'password'"
            layout="vertical"
            class="centered-form-shell"
            @keydown.enter.prevent="handleLogin"
          >
            <a-form-item>
              <a-input
                id="login-name"
                v-model:value="formState.loginName"
                name="loginName"
                size="large"
                autocomplete="username"
                :placeholder="$t('auth.loginName')"
                @press-enter="handleLogin"
              >
                <template #prefix>
                  <UserOutlined />
                </template>
              </a-input>
            </a-form-item>

            <a-form-item>
              <a-input-password
                id="login-password"
                v-model:value="formState.password"
                name="password"
                size="large"
                autocomplete="current-password"
                :placeholder="$t('auth.password')"
                @press-enter="handleLogin"
              >
                <template #prefix>
                  <LockOutlined />
                </template>
              </a-input-password>
            </a-form-item>

            <a-form-item v-if="captchaRequired">
              <a-row :gutter="8" align="middle">
                <a-col :span="14">
                  <a-input
                    v-model:value="captchaCode"
                    size="large"
                    :maxlength="4"
                    placeholder="验证码"
                    autocomplete="off"
                    @press-enter="handleLogin"
                  />
                </a-col>
                <a-col :span="10">
                  <a-spin :spinning="captchaLoading" size="small">
                    <img
                      :src="captchaImage"
                      alt="验证码"
                      class="captcha-image"
                      @click="refreshCaptcha"
                    />
                  </a-spin>
                  <a-button
                    type="text"
                    size="small"
                    class="captcha-refresh-btn"
                    @click="refreshCaptcha"
                  >
                    <ReloadOutlined />
                  </a-button>
                </a-col>
              </a-row>
            </a-form-item>

            <a-form-item class="login-options">
              <a-checkbox v-model:checked="formState.remember" name="remember">{{ $t('auth.remember') }}</a-checkbox>
            </a-form-item>

            <a-form-item>
              <a-button
                block
                type="primary"
                size="large"
                html-type="button"
                :loading="loginMutation.isPending.value"
                :disabled="isSubmitDisabled"
                @click.prevent="handleLogin"
              >
                {{ $t('auth.login') }}
              </a-button>
            </a-form-item>

          </a-form>

          <a-form v-else layout="vertical" class="centered-form-shell" @keydown.enter.prevent="handleVerify2fa">
            <a-alert
              type="warning"
              show-icon
              :message="$t('auth.twoFactorTitle')"
              :description="`账号 ${formState.loginName} 已开启动态验证码，请输入 6 位 TOTP 验证码。`"
              style="margin-bottom: 16px"
            />

            <a-form-item :label="$t('auth.twoFactorCode')">
                <a-input
                  v-model:value="totpCode"
                  size="large"
                  :maxlength="6"
                  autocomplete="one-time-code"
                  :placeholder="$t('auth.twoFactorHint')"
                  @press-enter="handleVerify2fa"
                >
                <template #prefix>
                  <SafetyCertificateOutlined />
                </template>
              </a-input>
            </a-form-item>

            <div class="login-2fa-meta">
              <span>剩余有效时间 {{ countdownText }}</span>
              <a class="login-2fa-back" @click.prevent="reset2faStep()">
                <ArrowLeftOutlined />
                返回账号密码
              </a>
            </div>

            <a-form-item>
              <a-button
                block
                type="primary"
                size="large"
                html-type="button"
                :loading="login2faMutation.isPending.value"
                :disabled="is2faSubmitDisabled"
                @click.prevent="handleVerify2fa"
              >
                验证并登录
              </a-button>
            </a-form-item>

            <a-alert
              type="info"
              show-icon
              message="提示"
              description="支持 Google Authenticator、Microsoft Authenticator 等标准 TOTP 应用。"
            />
          </a-form>
        </div>
      </a-card>
    </div>
  </div>
</template>

<style scoped>
.captcha-image {
  height: 40px;
  cursor: pointer;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
}

.captcha-refresh-btn {
  margin-left: 4px;
  color: #999;
}

.login-2fa-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -4px 0 16px;
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
}

.login-2fa-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.login-company-footer {
  text-align: center;
  margin-top: 24px;
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
  letter-spacing: 1px;
}
</style>
