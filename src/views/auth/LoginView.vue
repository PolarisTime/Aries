<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMutation } from '@tanstack/vue-query'
import {
  ArrowLeftOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { getInitialSetupStatus } from '@/api/setup'
import { useAuthStore } from '@/stores/auth'
import type { LoginUser } from '@/types/auth'
import { appTitle } from '@/utils/env'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const loginStep = ref<'password' | 'totp'>('password')
const tempToken = ref('')
const totpCode = ref('')
const stepDeadline = ref(0)
const now = ref(Date.now())
const checkingSetup = ref(true)
let countdownTimer: ReturnType<typeof window.setInterval> | null = null

const formState = reactive({
  loginName: '',
  password: '',
  remember: true,
})

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
  if (user?.forceTotpSetup && user?.totpEnabled !== true) {
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
    }),
  onSuccess: (result) => {
    if (result.requires2fa) {
      tempToken.value = result.tempToken
      totpCode.value = ''
      loginStep.value = 'totp'
      startStepCountdown()
      message.info('账号密码已验证，请继续输入动态验证码')
      return
    }

    if (result.user?.forceTotpSetup && result.user?.totpEnabled !== true) {
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
  stepDeadline.value = Date.now() + 5 * 60 * 1000
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
  try {
    await loginMutation.mutateAsync()
  } catch {
    // Error feedback is handled in the mutation callbacks.
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
    if (typeof route.query.loginName === 'string' && route.query.loginName) {
      formState.loginName = route.query.loginName
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
        <p>Vue 3 + Vite + TypeScript</p>
        <p class="login-slogan-desc">
          面向钢贸业务的独立前端工作台，默认直接对接 Leo 后端 REST API，保留紧凑录入和整单查看体验。
        </p>
      </div>

      <a-card :bordered="false" class="login-form-card">
        <div class="login-form-head">
          <h2>用户登录</h2>
          <p>当前环境：Leo 业务接口</p>
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
                placeholder="请输入账号"
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
                placeholder="请输入密码"
                @press-enter="handleLogin"
              >
                <template #prefix>
                  <LockOutlined />
                </template>
              </a-input-password>
            </a-form-item>

            <a-form-item class="login-options">
              <a-checkbox v-model:checked="formState.remember" name="remember">记住账号</a-checkbox>
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
                登录
              </a-button>
            </a-form-item>

            <a-alert
              type="info"
              show-icon
              message="接口说明"
              description="默认通过 Vite 代理访问 Leo 后端认证接口，可直接使用统一账号体系登录。"
            />
          </a-form>

          <a-form v-else layout="vertical" class="centered-form-shell" @keydown.enter.prevent="handleVerify2fa">
            <a-alert
              type="warning"
              show-icon
              message="二次验证"
              :description="`账号 ${formState.loginName} 已开启动态验证码，请输入 6 位 TOTP 验证码。`"
              style="margin-bottom: 16px"
            />

            <a-form-item label="动态验证码">
                <a-input
                  v-model:value="totpCode"
                  size="large"
                  :maxlength="6"
                  autocomplete="one-time-code"
                  placeholder="请输入 6 位验证码"
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
</style>
