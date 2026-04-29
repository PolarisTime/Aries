<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMutation } from '@tanstack/vue-query'
import {
  BankOutlined,
  CheckCircleOutlined,
  IdcardOutlined,
  LockOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import {
  getInitialSetupStatus,
  setupInitialAdmin2fa,
  submitInitialAdmin,
  submitInitialCompany,
} from '@/api/setup'
import type { InitialSetupStatus, InitialSetupTotpResult } from '@/types/setup'
import { appTitle } from '@/utils/env'

type SetupStep = 'admin' | 'company'

const router = useRouter()
const checking = ref(true)
const status = ref<InitialSetupStatus | null>(null)
const currentStep = ref<SetupStep>('admin')
const adminCompleted = ref(false)
const lastAdminLoginName = ref('')
const totpSetup = ref<InitialSetupTotpResult | null>(null)

const formState = reactive({
  adminLoginName: '',
  adminPassword: '',
  adminConfirmPassword: '',
  adminUserName: '系统管理员',
  totpCode: '',
  companyName: '',
  taxNo: '',
  bankName: '',
  bankAccount: '',
  taxRate: 0.13,
  remark: '',
})

const needsAdminSetup = computed(() => status.value?.adminConfigured !== true)
const needsCompanySetup = computed(() => status.value?.companyConfigured !== true)
const activeStepIndex = computed(() => currentStep.value === 'company' ? 1 : 0)
const currentStepTitle = computed(() => (
  currentStep.value === 'admin' ? '管理员配置' : '公司主体配置'
))

const canGenerateTotp = computed(() => (
  needsAdminSetup.value
  && Boolean(formState.adminLoginName.trim())
))

const canSubmitAdmin = computed(() => (
  status.value?.setupRequired === true
  && needsAdminSetup.value
  && Boolean(formState.adminLoginName.trim())
  && Boolean(formState.adminPassword.trim())
  && Boolean(formState.adminUserName.trim())
  && Boolean(totpSetup.value?.secret)
  && /^\d{6}$/.test(formState.totpCode.trim())
))

const canSubmitCompany = computed(() => (
  status.value?.setupRequired === true
  && status.value?.adminConfigured === true
  && needsCompanySetup.value
  && Boolean(formState.companyName.trim())
  && Boolean(formState.taxNo.trim())
  && Boolean(formState.bankName.trim())
  && Boolean(formState.bankAccount.trim())
))

const totpMutation = useMutation({
  mutationFn: () => setupInitialAdmin2fa({ loginName: formState.adminLoginName.trim() }),
  onSuccess: (response) => {
    totpSetup.value = response.data
    formState.totpCode = ''
    message.success(response.message || '管理员 2FA 已生成')
  },
})

const adminMutation = useMutation({
  mutationFn: () => submitInitialAdmin({
    admin: {
      loginName: formState.adminLoginName.trim(),
      password: formState.adminPassword,
      userName: formState.adminUserName.trim(),
    },
    totpSecret: totpSetup.value?.secret || '',
    totpCode: formState.totpCode.trim(),
  }),
  onSuccess: async (response) => {
    lastAdminLoginName.value = response.data.adminLoginName || formState.adminLoginName.trim()
    message.success(response.message || '管理员账号初始化完成')
    await loadStatus({ syncStep: false, showLoading: false })
    adminCompleted.value = true
  },
})

const companyMutation = useMutation({
  mutationFn: () => submitInitialCompany({
    companyName: formState.companyName.trim(),
    taxNo: formState.taxNo.trim(),
    bankName: formState.bankName.trim(),
    bankAccount: formState.bankAccount.trim(),
    taxRate: formState.taxRate,
    remark: formState.remark.trim(),
  }),
  onSuccess: async (response) => {
    message.success(response.message || '公司主体初始化完成')
    await router.replace({
      path: '/login',
      query: {
        initialized: '1',
      },
    })
  },
})

watch(
  () => formState.adminLoginName,
  () => {
    if (!adminCompleted.value) {
      totpSetup.value = null
      formState.totpCode = ''
    }
  },
)

async function loadStatus(options: { syncStep?: boolean; showLoading?: boolean } = {}) {
  const syncStep = options.syncStep ?? true
  const showLoading = options.showLoading ?? true
  if (showLoading) {
    checking.value = true
  }
  try {
    const response = await getInitialSetupStatus()
    status.value = response.data
    if (!response.data.setupRequired) {
      await router.replace('/login')
      return
    }
    if (syncStep) {
      currentStep.value = response.data.adminConfigured ? 'company' : 'admin'
      adminCompleted.value = false
    }
  } finally {
    if (showLoading) {
      checking.value = false
    }
  }
}

async function handleGenerateTotp() {
  if (!canGenerateTotp.value || totpMutation.isPending.value) {
    return
  }
  try {
    await totpMutation.mutateAsync()
  } catch {
    // Request error feedback is handled by the HTTP layer.
  }
}

async function handleSubmitAdmin() {
  if (!canSubmitAdmin.value || adminMutation.isPending.value) {
    return
  }
  if (formState.adminPassword.length < 8) {
    message.warning('管理员密码至少 8 位')
    return
  }
  if (formState.adminPassword !== formState.adminConfirmPassword) {
    message.warning('两次输入的管理员密码不一致')
    return
  }
  try {
    await adminMutation.mutateAsync()
  } catch {
    // Request error feedback is handled by the HTTP layer.
  }
}

function handleNextToCompany() {
  if (status.value?.adminConfigured !== true) {
    return
  }
  currentStep.value = 'company'
  adminCompleted.value = false
}

async function handleSubmitCompany() {
  if (!canSubmitCompany.value || companyMutation.isPending.value) {
    return
  }
  try {
    await companyMutation.mutateAsync()
  } catch {
    // Request error feedback is handled by the HTTP layer.
  }
}

onMounted(() => {
  void loadStatus()
})
</script>

<template>
  <div class="initial-setup-page">
    <div class="initial-setup-shell">
      <section class="initial-setup-hero">
        <span class="initial-setup-kicker">First Launch Setup</span>
        <h1>{{ appTitle }}</h1>
        <p>
          首次进入系统时先创建管理员并绑定 2FA，再配置公司主体信息。
        </p>

        <div class="initial-setup-points">
          <div class="initial-setup-point">
            <strong>管理员账号</strong>
            <span>用于首次登录、角色授权、安全策略和系统参数配置。</span>
          </div>
          <div class="initial-setup-point">
            <strong>2FA 验证</strong>
            <span>管理员创建时必须完成认证器绑定，后续登录将使用二次验证。</span>
          </div>
          <div class="initial-setup-point">
            <strong>公司主体</strong>
            <span>用于单据抬头、默认税率、银行账户和结算信息。</span>
          </div>
        </div>
      </section>

      <section class="initial-setup-panel">
        <a-card :bordered="false" class="initial-setup-card">
          <template v-if="checking">
            <a-skeleton active :paragraph="{ rows: 8 }" />
          </template>

          <template v-else>
            <div class="initial-setup-head">
              <h2>{{ currentStepTitle }}</h2>
              <p>管理员配置完成后，点击下一步进入公司主体配置。</p>
            </div>

            <div class="initial-setup-status-grid">
              <div
                class="initial-setup-status-item"
                :class="{ active: activeStepIndex === 0, done: status?.adminConfigured }"
              >
                <CheckCircleOutlined />
                <span>管理员配置</span>
              </div>
              <div
                class="initial-setup-status-item"
                :class="{ active: activeStepIndex === 1, done: status?.companyConfigured }"
              >
                <CheckCircleOutlined />
                <span>公司主体配置</span>
              </div>
            </div>

            <a-form layout="vertical" class="initial-setup-form">
              <template v-if="currentStep === 'admin'">
                <template v-if="needsAdminSetup">
                  <div class="initial-setup-section">
                    <div class="initial-setup-section-title">管理员账号</div>
                    <a-form-item label="登录账号" required>
                      <a-input v-model:value="formState.adminLoginName" placeholder="请输入管理员登录账号">
                        <template #prefix><UserOutlined /></template>
                      </a-input>
                    </a-form-item>
                    <a-form-item label="管理员姓名" required>
                      <a-input v-model:value="formState.adminUserName" placeholder="请输入管理员姓名">
                        <template #prefix><IdcardOutlined /></template>
                      </a-input>
                    </a-form-item>
                    <a-form-item label="登录密码" required>
                      <a-input-password v-model:value="formState.adminPassword" placeholder="至少 8 位">
                        <template #prefix><LockOutlined /></template>
                      </a-input-password>
                    </a-form-item>
                    <a-form-item label="确认密码" required>
                      <a-input-password
                        v-model:value="formState.adminConfirmPassword"
                        placeholder="再次输入管理员密码"
                      >
                        <template #prefix><LockOutlined /></template>
                      </a-input-password>
                    </a-form-item>
                  </div>

                  <div class="initial-setup-section">
                    <div class="initial-setup-section-title">管理员 2FA</div>
                    <div class="initial-setup-two-factor">
                      <a-button
                        :loading="totpMutation.isPending.value"
                        :disabled="!canGenerateTotp"
                        @click="handleGenerateTotp"
                      >
                        生成 2FA
                      </a-button>

                      <div v-if="totpSetup" class="initial-setup-qr-grid">
                        <div class="initial-setup-qr">
                          <img
                            :src="`data:image/png;base64,${totpSetup.qrCodeBase64}`"
                            alt="2FA QR Code"
                          >
                        </div>
                        <div class="initial-setup-qr-fields">
                          <a-form-item label="密钥">
                            <a-input :value="totpSetup.secret" readonly />
                          </a-form-item>
                          <a-form-item label="6 位验证码" required>
                            <a-input
                              v-model:value="formState.totpCode"
                              :maxlength="6"
                              placeholder="请输入认证器验证码"
                            />
                          </a-form-item>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>

                <div v-else class="initial-setup-success">
                  <CheckCircleOutlined />
                  <h3>管理员配置已完成</h3>
                  <p>继续配置公司主体信息后即可回到登录页。</p>
                </div>
              </template>

              <template v-else>
                <div class="initial-setup-section">
                  <div class="initial-setup-section-title">公司主体</div>
                  <a-form-item label="公司名称" required>
                    <a-input v-model:value="formState.companyName" placeholder="请输入公司全称">
                      <template #prefix><BankOutlined /></template>
                    </a-input>
                  </a-form-item>
                  <a-form-item label="统一社会信用代码 / 税号" required>
                    <a-input v-model:value="formState.taxNo" placeholder="请输入税号" />
                  </a-form-item>
                  <a-form-item label="开户银行" required>
                    <a-input v-model:value="formState.bankName" placeholder="请输入开户银行" />
                  </a-form-item>
                  <a-form-item label="银行账号" required>
                    <a-input v-model:value="formState.bankAccount" placeholder="请输入银行账号" />
                  </a-form-item>
                  <a-form-item label="默认税率" required>
                    <a-input-number
                      v-model:value="formState.taxRate"
                      :min="0"
                      :max="1"
                      :step="0.01"
                      :precision="4"
                      style="width: 100%"
                    />
                  </a-form-item>
                  <a-form-item label="备注">
                    <a-textarea
                      v-model:value="formState.remark"
                      :rows="3"
                      placeholder="可填写开账说明、初始化备注等"
                    />
                  </a-form-item>
                </div>
              </template>

              <div class="initial-setup-actions">
                <a-button @click="() => loadStatus()">{{ $t('common.refresh') }}</a-button>
                <a-button
                  v-if="currentStep === 'admin' && needsAdminSetup"
                  type="primary"
                  :loading="adminMutation.isPending.value"
                  :disabled="!canSubmitAdmin"
                  @click="handleSubmitAdmin"
                >
                  完成管理员配置
                </a-button>
                <a-button
                  v-else-if="currentStep === 'admin'"
                  type="primary"
                  @click="handleNextToCompany"
                >
                  下一步：公司主体
                </a-button>
                <a-button
                  v-else
                  type="primary"
                  :loading="companyMutation.isPending.value"
                  :disabled="!canSubmitCompany"
                  @click="handleSubmitCompany"
                >
                  完成初始化
                </a-button>
              </div>
            </a-form>
          </template>
        </a-card>
      </section>
    </div>
  </div>
</template>

<style scoped>
.initial-setup-page {
  min-height: 100vh;
  background: #f4f7fb;
}

.initial-setup-shell {
  display: grid;
  grid-template-columns: minmax(280px, 430px) minmax(320px, 680px);
  gap: 28px;
  max-width: 1180px;
  min-height: 100vh;
  margin: 0 auto;
  padding: 40px 28px;
  box-sizing: border-box;
}

.initial-setup-hero {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 24px 8px;
}

.initial-setup-kicker {
  display: inline-flex;
  width: fit-content;
  padding: 6px 12px;
  border-radius: 999px;
  background: #e0f2fe;
  color: #0369a1;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.initial-setup-hero h1 {
  margin: 18px 0 12px;
  color: #0f172a;
  font-size: clamp(34px, 5vw, 52px);
  line-height: 1.05;
}

.initial-setup-hero p {
  margin: 0;
  color: #475569;
  font-size: 16px;
  line-height: 1.8;
}

.initial-setup-points {
  display: grid;
  gap: 12px;
  margin-top: 28px;
}

.initial-setup-point {
  padding: 16px 18px;
  border: 1px solid #dbe4ef;
  border-radius: 8px;
  background: #ffffff;
}

.initial-setup-point strong {
  display: block;
  margin-bottom: 6px;
  color: #0f172a;
  font-size: 15px;
}

.initial-setup-point span {
  color: #64748b;
  line-height: 1.7;
}

.initial-setup-panel {
  display: flex;
  align-items: center;
}

.initial-setup-card {
  width: 100%;
  border-radius: 8px;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.12);
}

.initial-setup-head h2 {
  margin: 0;
  color: #0f172a;
  font-size: 24px;
}

.initial-setup-head p {
  margin: 8px 0 0;
  color: #64748b;
}

.initial-setup-status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 18px 0 22px;
}

.initial-setup-status-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  color: #64748b;
}

.initial-setup-status-item.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
}

.initial-setup-status-item.done {
  border-color: #bbf7d0;
  background: #ecfdf5;
  color: #047857;
}

.initial-setup-form {
  display: grid;
  gap: 16px;
  margin-top: 18px;
}

.initial-setup-section {
  padding: 18px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}

.initial-setup-section-title {
  margin-bottom: 16px;
  color: #0f172a;
  font-size: 16px;
  font-weight: 700;
}

.initial-setup-two-factor {
  display: grid;
  gap: 16px;
}

.initial-setup-qr-grid {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.initial-setup-qr {
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  padding: 10px;
  border: 1px solid #dbe4ef;
  border-radius: 8px;
  background: #ffffff;
}

.initial-setup-qr img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.initial-setup-qr-fields {
  min-width: 0;
}

.initial-setup-success {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 42px 18px;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  background: #ecfdf5;
  color: #047857;
  text-align: center;
}

.initial-setup-success :deep(.anticon) {
  font-size: 34px;
}

.initial-setup-success h3 {
  margin: 0;
  color: #065f46;
  font-size: 18px;
}

.initial-setup-success p {
  margin: 0;
  color: #047857;
}

.initial-setup-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 980px) {
  .initial-setup-shell {
    grid-template-columns: 1fr;
    padding: 24px 18px 40px;
  }

  .initial-setup-hero {
    padding: 4px 0;
  }
}

@media (max-width: 640px) {
  .initial-setup-status-grid,
  .initial-setup-qr-grid {
    grid-template-columns: 1fr;
  }

  .initial-setup-actions {
    flex-direction: column;
  }
}
</style>
