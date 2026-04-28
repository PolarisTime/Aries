<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMutation } from '@tanstack/vue-query'
import {
  BankOutlined,
  CheckCircleOutlined,
  IdcardOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { getInitialSetupStatus, submitInitialSetup } from '@/api/setup'
import type { InitialSetupStatus } from '@/types/setup'
import { appTitle } from '@/utils/env'

const router = useRouter()
const checking = ref(true)
const status = ref<InitialSetupStatus | null>(null)

const formState = reactive({
  adminLoginName: 'admin',
  adminPassword: '',
  adminConfirmPassword: '',
  adminUserName: '系统管理员',
  adminMobile: '',
  companyName: '',
  taxNo: '',
  bankName: '',
  bankAccount: '',
  taxRate: 0.13,
  remark: '',
})

const needsAdminSetup = computed(() => status.value?.adminConfigured !== true)
const needsCompanySetup = computed(() => status.value?.companyConfigured !== true)
const canSubmit = computed(() => {
  if (!status.value?.setupRequired) {
    return false
  }
  if (needsAdminSetup.value) {
    if (
      !formState.adminLoginName.trim() ||
      !formState.adminPassword.trim() ||
      !formState.adminUserName.trim()
    ) {
      return false
    }
  }
  if (needsCompanySetup.value) {
    if (
      !formState.companyName.trim() ||
      !formState.taxNo.trim() ||
      !formState.bankName.trim() ||
      !formState.bankAccount.trim()
    ) {
      return false
    }
  }
  return true
})

const setupMutation = useMutation({
  mutationFn: () =>
    submitInitialSetup({
      admin: needsAdminSetup.value
        ? {
            loginName: formState.adminLoginName.trim(),
            password: formState.adminPassword,
            userName: formState.adminUserName.trim(),
            mobile: formState.adminMobile.trim(),
          }
        : undefined,
      company: needsCompanySetup.value
        ? {
            companyName: formState.companyName.trim(),
            taxNo: formState.taxNo.trim(),
            bankName: formState.bankName.trim(),
            bankAccount: formState.bankAccount.trim(),
            taxRate: formState.taxRate,
            remark: formState.remark.trim(),
          }
        : undefined,
    }),
  onSuccess: async (response) => {
    message.success(response.message || '首次初始化完成')
    await router.replace({
      path: '/login',
      query: {
        initialized: '1',
        loginName: response.data.adminLoginName || formState.adminLoginName,
      },
    })
  },
})

async function loadStatus() {
  checking.value = true
  try {
    const response = await getInitialSetupStatus()
    status.value = response.data
    if (!response.data.setupRequired) {
      await router.replace('/login')
    }
  } finally {
    checking.value = false
  }
}

async function handleSubmit() {
  if (!canSubmit.value || setupMutation.isPending.value) {
    return
  }
  if (needsAdminSetup.value) {
    if (formState.adminPassword.length < 8) {
      message.warning('管理员密码至少 8 位')
      return
    }
    if (formState.adminPassword !== formState.adminConfirmPassword) {
      message.warning('两次输入的管理员密码不一致')
      return
    }
  }
  try {
    await setupMutation.mutateAsync()
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
    <div class="initial-setup-backdrop" />
    <div class="initial-setup-shell">
      <section class="initial-setup-hero">
        <span class="initial-setup-kicker">First Launch Setup</span>
        <h1>{{ appTitle }}</h1>
        <p>
          当前系统还没有完成首次初始化。先在这里补齐管理员账号和公司主体信息，
          完成后即可回到登录页进入业务工作区。
        </p>

        <div class="initial-setup-points">
          <div class="initial-setup-point">
            <strong>管理员账号</strong>
            <span>用于首次进入系统、配置菜单、角色、安全策略与业务基础数据。</span>
          </div>
          <div class="initial-setup-point">
            <strong>公司主体信息</strong>
            <span>用于单据抬头、税率、结算信息和后续业务参数初始化。</span>
          </div>
          <div class="initial-setup-point">
            <strong>一次性流程</strong>
            <span>初始化完成后，该页面会自动关闭，后续改动统一在系统设置中维护。</span>
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
              <h2>{{ $t('auth.initialSetup') }}</h2>
              <p>检测系统是否已经完成管理员与公司主体配置。</p>
            </div>

            <a-alert
              type="info"
              show-icon
              message="初始化状态"
              :description="`管理员：${status?.adminConfigured ? '已完成' : '待创建'}；公司主体：${status?.companyConfigured ? '已完成' : '待创建'}`"
            />

            <div class="initial-setup-status-grid">
              <div class="initial-setup-status-item" :class="{ done: status?.adminConfigured }">
                <CheckCircleOutlined />
                <span>管理员账号</span>
              </div>
              <div class="initial-setup-status-item" :class="{ done: status?.companyConfigured }">
                <CheckCircleOutlined />
                <span>公司主体</span>
              </div>
            </div>

            <a-form layout="vertical" class="initial-setup-form">
              <a-card v-if="needsAdminSetup" size="small" class="initial-setup-section">
                <template #title>管理员账号</template>
                <a-form-item label="登录账号" required>
                  <a-input v-model:value="formState.adminLoginName" placeholder="建议使用 admin">
                    <template #prefix><UserOutlined /></template>
                  </a-input>
                </a-form-item>
                <a-form-item label="管理员姓名" required>
                  <a-input v-model:value="formState.adminUserName" placeholder="请输入管理员姓名">
                    <template #prefix><IdcardOutlined /></template>
                  </a-input>
                </a-form-item>
                <a-form-item label="手机号">
                  <a-input v-model:value="formState.adminMobile" placeholder="用于联系和安全提醒">
                    <template #prefix><SafetyCertificateOutlined /></template>
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
              </a-card>

              <a-card v-if="needsCompanySetup" size="small" class="initial-setup-section">
                <template #title>公司主体</template>
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
              </a-card>

              <a-alert
                v-if="status?.setupRequired"
                type="warning"
                show-icon
                message="提交后将立即写入系统基础信息"
                description="建议先核对管理员账号和公司主体信息，初始化完成后请尽快登录并继续配置 2FA、角色和其他系统参数。"
              />

              <div class="initial-setup-actions">
                <a-button @click="loadStatus">{{ $t('common.refresh') }}</a-button>
                <a-button
                  type="primary"
                  :loading="setupMutation.isPending.value"
                  :disabled="!canSubmit"
                  @click="handleSubmit"
                >
                  {{ $t('common.submit') }}
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
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(14, 116, 144, 0.2), transparent 34%),
    linear-gradient(135deg, #eef6fb 0%, #f8fafc 48%, #fff8ef 100%);
}

.initial-setup-backdrop {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(120deg, rgba(15, 118, 110, 0.08), transparent 36%),
    radial-gradient(circle at 80% 20%, rgba(251, 191, 36, 0.14), transparent 30%);
}

.initial-setup-shell {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(280px, 460px) minmax(320px, 680px);
  gap: 28px;
  max-width: 1240px;
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
  background: rgba(15, 118, 110, 0.12);
  color: #0f766e;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.initial-setup-hero h1 {
  margin: 18px 0 12px;
  color: #0f172a;
  font-size: clamp(36px, 5vw, 54px);
  line-height: 1.02;
}

.initial-setup-hero p {
  margin: 0;
  color: #475569;
  font-size: 16px;
  line-height: 1.8;
}

.initial-setup-points {
  display: grid;
  gap: 14px;
  margin-top: 28px;
}

.initial-setup-point {
  padding: 16px 18px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.05);
  backdrop-filter: blur(10px);
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
  border-radius: 28px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
}

.initial-setup-head h2 {
  margin: 0;
  color: #0f172a;
  font-size: 26px;
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
  padding: 14px 16px;
  border-radius: 16px;
  background: #f8fafc;
  color: #64748b;
}

.initial-setup-status-item.done {
  background: #ecfdf5;
  color: #047857;
}

.initial-setup-form {
  display: grid;
  gap: 16px;
  margin-top: 18px;
}

.initial-setup-section {
  border-radius: 20px;
  background: #fcfdff;
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
  .initial-setup-status-grid {
    grid-template-columns: 1fr;
  }

  .initial-setup-actions {
    flex-direction: column;
  }
}
</style>
