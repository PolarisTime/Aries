<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { LockOutlined, LogoutOutlined, SafetyCertificateOutlined } from '@ant-design/icons-vue'
import {
  changeOwnPassword,
  enableOwn2fa,
  setupOwn2fa,
} from '@/api/account-security'
import { useRequestError } from '@/composables/use-request-error'
import { useAuthStore } from '@/stores/auth'
import type { TotpSetupResponse } from '@/types/auth'
import { setStoredUser } from '@/utils/storage'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const showRequestError = useRequestError()

const passwordSaving = ref(false)
const setupLoading = ref(false)
const enableLoading = ref(false)
const totpSetup = ref<TotpSetupResponse | null>(null)
const totpCode = ref('')

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const currentUserName = computed(() => authStore.user?.userName || authStore.user?.loginName || '当前账号')

function resolveRedirectTarget() {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  if (!redirect.startsWith('/') || /^https?:\/\//i.test(redirect)) {
    return '/dashboard'
  }
  return redirect
}

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

async function handleChangePassword() {
  if (!passwordForm.currentPassword.trim()) {
    message.warning('请先填写当前密码')
    return
  }
  if (!passwordForm.newPassword.trim()) {
    message.warning('请先填写新密码')
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
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    message.success(response.message || '密码修改成功')
  } catch (error) {
    showRequestError(error, '修改密码失败')
  } finally {
    passwordSaving.value = false
  }
}

async function handleSetup2fa() {
  setupLoading.value = true
  try {
    const response = await setupOwn2fa()
    totpSetup.value = response.data
    totpCode.value = ''
    message.success(response.message || '二维码已生成')
  } catch (error) {
    showRequestError(error, '生成 2FA 二维码失败')
  } finally {
    setupLoading.value = false
  }
}

async function handleEnable2fa() {
  if (!/^\d{6}$/.test(totpCode.value.trim())) {
    message.warning('请输入 6 位动态验证码')
    return
  }

  enableLoading.value = true
  try {
    const response = await enableOwn2fa(totpCode.value.trim())
    syncCurrentUserSecurity(response.data || {})
    message.success(response.message || '2FA 已启用')
    void router.replace(resolveRedirectTarget())
  } catch (error) {
    showRequestError(error, '启用 2FA 失败')
  } finally {
    enableLoading.value = false
  }
}

async function handleLogout() {
  await authStore.signOut()
  void router.replace('/login')
}
</script>

<template>
  <div class="setup-2fa-shell">
    <div class="setup-2fa-backdrop" />
    <div class="setup-2fa-layout">
      <section class="setup-2fa-hero">
        <span class="setup-kicker">首次登录安全引导</span>
        <h1>先完成账号加固，再进入业务系统。</h1>
        <p>
          {{ currentUserName }} 当前使用的是管理员创建的初始登录方式。为了避免弱口令与账号共享风险，
          这次登录需要先完成两件事：确认个人密码、绑定认证器。
        </p>
        <div class="setup-checklist">
          <div class="setup-checkitem">
            <strong>1</strong>
            <span>可先用当前密码改成自己的密码，不影响后续绑定。</span>
          </div>
          <div class="setup-checkitem">
            <strong>2</strong>
            <span>绑定 Google Authenticator、Microsoft Authenticator 等标准 TOTP 应用。</span>
          </div>
          <div class="setup-checkitem">
            <strong>3</strong>
            <span>完成绑定后自动进入原目标页面，未完成前不开放业务菜单。</span>
          </div>
        </div>
        <a-button ghost class="setup-logout-button" @click="handleLogout">
          <template #icon><LogoutOutlined /></template>
          退出当前账号
        </a-button>
      </section>

      <section class="setup-2fa-panel">
        <a-alert
          type="warning"
          show-icon
          message="当前会话仅开放密码修改与 2FA 绑定"
          description="如果这是管理员分配的初始密码，建议先改成个人密码，再继续绑定 2FA。"
        />

        <a-card :bordered="false" class="setup-card">
          <template #title>第一步：确认个人密码</template>
          <a-form layout="vertical">
            <a-form-item label="当前密码" required>
              <a-input-password
                v-model:value="passwordForm.currentPassword"
                :maxlength="128"
                placeholder="输入当前登录密码"
              >
                <template #prefix><LockOutlined /></template>
              </a-input-password>
            </a-form-item>
            <a-form-item label="新密码" required>
              <a-input-password
                v-model:value="passwordForm.newPassword"
                :maxlength="128"
                placeholder="设置个人密码"
              >
                <template #prefix><LockOutlined /></template>
              </a-input-password>
            </a-form-item>
            <a-form-item label="确认新密码" required>
              <a-input-password
                v-model:value="passwordForm.confirmPassword"
                :maxlength="128"
                placeholder="再次输入新密码"
              >
                <template #prefix><LockOutlined /></template>
              </a-input-password>
            </a-form-item>
            <a-button type="default" :loading="passwordSaving" @click="handleChangePassword">
              更新密码
            </a-button>
          </a-form>
        </a-card>

        <a-card :bordered="false" class="setup-card">
          <template #title>第二步：绑定 2FA 认证器</template>
          <div class="setup-card-actions">
            <a-button type="primary" :loading="setupLoading" @click="handleSetup2fa">
              生成绑定二维码
            </a-button>
            <span class="setup-card-hint">每次重新生成都会替换旧密钥，请以最新二维码为准。</span>
          </div>

          <template v-if="totpSetup">
            <div class="setup-qr-panel">
              <div class="setup-qr-box">
                <img
                  class="setup-qr-image"
                  :src="`data:image/png;base64,${totpSetup.qrCodeBase64}`"
                  alt="2FA QR Code"
                />
              </div>
              <div class="setup-secret-panel">
                <a-form layout="vertical">
                  <a-form-item label="手动绑定密钥">
                    <a-input :value="totpSetup.secret" readonly />
                  </a-form-item>
                  <a-form-item label="动态验证码" required>
                    <a-input
                      v-model:value="totpCode"
                      :maxlength="6"
                      placeholder="输入认证器中的 6 位验证码"
                    >
                      <template #prefix><SafetyCertificateOutlined /></template>
                    </a-input>
                  </a-form-item>
                  <a-space>
                    <a-button @click="handleSetup2fa">重新生成</a-button>
                    <a-button type="primary" :loading="enableLoading" @click="handleEnable2fa">
                      完成绑定并进入系统
                    </a-button>
                  </a-space>
                </a-form>
              </div>
            </div>
          </template>

          <a-empty v-else description="先生成二维码，再用认证器扫码绑定" />
        </a-card>
      </section>
    </div>
  </div>
</template>

<style scoped>
.setup-2fa-shell {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(197, 165, 114, 0.28), transparent 34%),
    linear-gradient(135deg, #f3ede2 0%, #f8f4ec 42%, #e7edf3 100%);
}

.setup-2fa-backdrop {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(120deg, rgba(20, 28, 45, 0.08), transparent 30%),
    radial-gradient(circle at 85% 18%, rgba(57, 84, 117, 0.14), transparent 22%);
}

.setup-2fa-layout {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(320px, 460px) minmax(360px, 720px);
  gap: 28px;
  align-items: start;
  max-width: 1220px;
  margin: 0 auto;
  padding: 48px 28px;
}

.setup-2fa-hero {
  color: #172033;
  padding: 28px 8px 12px;
}

.setup-kicker {
  display: inline-flex;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(23, 32, 51, 0.08);
  color: #7b5b2f;
  font-size: 12px;
  letter-spacing: 0.08em;
}

.setup-2fa-hero h1 {
  margin: 18px 0 14px;
  font-size: clamp(32px, 4vw, 48px);
  line-height: 1.08;
}

.setup-2fa-hero p {
  margin: 0;
  color: rgba(23, 32, 51, 0.72);
  font-size: 16px;
  line-height: 1.8;
}

.setup-checklist {
  display: grid;
  gap: 14px;
  margin-top: 28px;
}

.setup-checkitem {
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  border: 1px solid rgba(23, 32, 51, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.46);
  backdrop-filter: blur(12px);
}

.setup-checkitem strong {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #172033;
  color: #fff;
}

.setup-logout-button {
  margin-top: 28px;
  border-color: rgba(23, 32, 51, 0.28);
  color: #172033;
}

.setup-2fa-panel {
  display: grid;
  gap: 18px;
}

.setup-card {
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(27, 37, 56, 0.12);
}

.setup-card-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.setup-card-hint {
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
}

.setup-qr-panel {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 20px;
  align-items: center;
}

.setup-qr-box {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  padding: 16px;
  border-radius: 20px;
  background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
}

.setup-qr-image {
  width: 208px;
  height: 208px;
  object-fit: contain;
}

.setup-secret-panel {
  min-width: 0;
}

@media (max-width: 960px) {
  .setup-2fa-layout {
    grid-template-columns: 1fr;
    padding: 28px 16px 36px;
  }

  .setup-2fa-hero {
    padding: 8px 0 0;
  }

  .setup-qr-panel {
    grid-template-columns: 1fr;
  }

  .setup-card-actions {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
