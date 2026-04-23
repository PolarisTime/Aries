<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMutation } from '@tanstack/vue-query'
import {
  LockOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import { notification } from 'ant-design-vue'
import { getCaptcha, getCheckcodeFlag } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { appTitle, isMockEnabled } from '@/utils/env'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const loadingCaptcha = ref(false)
const captchaEnabled = ref(false)
const captchaImage = ref('')
const captchaUuid = ref('')

const formState = reactive({
  loginName: '',
  password: '',
  code: '',
  remember: true,
})

const isSubmitDisabled = computed(() => {
  if (!formState.loginName || !formState.password) {
    return true
  }

  if (captchaEnabled.value && !formState.code) {
    return true
  }

  return false
})

const loginMutation = useMutation({
  mutationFn: () =>
    authStore.signIn({
      loginName: formState.loginName,
      password: formState.password,
      code: formState.code,
      uuid: captchaUuid.value,
    }),
  onSuccess: () => {
    notification.success({
      message: '登录成功',
      description: isMockEnabled
        ? '当前为 Mock 环境，已直接进入系统。'
        : '已接入现有后端认证接口。',
    })
    const redirect =
      typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    void router.replace(redirect)
  },
  onError: async () => {
    notification.error({
      message: '登录失败',
      description: isMockEnabled
        ? 'Mock 模式下输入任意非空用户名和密码即可。'
        : '请检查用户名、密码或验证码。',
    })
    if (captchaEnabled.value) {
      formState.code = ''
      await loadCaptcha()
    }
  },
})

async function loadCaptcha() {
  loadingCaptcha.value = true
  try {
    const response = await getCaptcha()
    if (response.code === 200) {
      captchaUuid.value = response.data.uuid
      captchaImage.value = response.data.base64
    }
  } finally {
    loadingCaptcha.value = false
  }
}

async function initCaptcha() {
  try {
    const response = await getCheckcodeFlag()
    captchaEnabled.value = String(response) === '1'
    if (captchaEnabled.value) {
      await loadCaptcha()
    }
  } catch {
    captchaEnabled.value = false
  }
}

async function handleLogin() {
  if (isSubmitDisabled.value || loginMutation.isPending.value) {
    return
  }
  await loginMutation.mutateAsync()
}

onMounted(() => {
  authStore.hydrate()
  void initCaptcha()
})
</script>

<template>
  <div class="login-layout">
    <div class="login-container">
      <div class="login-slogan">
        <h1>{{ appTitle }}</h1>
        <p>Vue 3 + Vite + TypeScript</p>
        <p class="login-slogan-desc">
          页面风格按 Jeecg 列表体系重写，优先保持旧系统的布局密度、操作路径和表格习惯。
        </p>
      </div>

      <a-card :bordered="false" class="login-form-card">
        <div class="login-form-head">
          <h2>用户登录</h2>
          <p>{{ isMockEnabled ? '当前环境：Mock 服务' : '当前环境：业务接口' }}</p>
        </div>

        <a-form @submit.prevent="handleLogin">
          <a-form-item>
            <a-input
              v-model:value="formState.loginName"
              size="large"
              placeholder="请输入用户名"
              @press-enter="handleLogin"
            >
              <template #prefix>
                <UserOutlined />
              </template>
            </a-input>
          </a-form-item>

          <a-form-item>
            <a-input-password
              v-model:value="formState.password"
              size="large"
              placeholder="请输入密码"
              @press-enter="handleLogin"
            >
              <template #prefix>
                <LockOutlined />
              </template>
            </a-input-password>
          </a-form-item>

          <a-form-item v-if="captchaEnabled">
            <div class="login-captcha-row">
              <a-input
                v-model:value="formState.code"
                size="large"
                placeholder="请输入验证码"
                @press-enter="handleLogin"
              >
                <template #prefix>
                  <SafetyCertificateOutlined />
                </template>
              </a-input>
              <button type="button" class="captcha-button" @click="loadCaptcha">
                <img v-if="captchaImage" :src="captchaImage" alt="captcha" />
                <span v-else>{{ loadingCaptcha ? '加载中' : '刷新验证码' }}</span>
              </button>
            </div>
          </a-form-item>

          <a-form-item class="login-options">
            <a-checkbox v-model:checked="formState.remember">记住账号</a-checkbox>
          </a-form-item>

          <a-form-item>
            <a-button
              block
              type="primary"
              size="large"
              :loading="loginMutation.isPending.value"
              :disabled="isSubmitDisabled"
              @click="handleLogin"
            >
              登 录
            </a-button>
          </a-form-item>

          <a-alert
            type="info"
            show-icon
            :message="isMockEnabled ? 'Mock 登录说明' : '接口说明'"
            :description="
              isMockEnabled
                ? '输入任意非空用户名和密码即可进入系统，推荐 admin / 123456。'
                : '默认通过 Vite 代理访问后端认证接口。'
            "
          />
        </a-form>
      </a-card>
    </div>
  </div>
</template>
