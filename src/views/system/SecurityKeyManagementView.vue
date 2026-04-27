<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined, SafetyCertificateOutlined, SyncOutlined } from '@ant-design/icons-vue'
import TwoFactorConfirmModal from '@/components/TwoFactorConfirmModal.vue'
import {
  getSecurityKeyOverview,
  rotateJwtSecurityKey,
  rotateTotpSecurityKey,
  type SecurityKeyItem,
  type SecurityKeyOverview,
} from '@/api/security-keys'
import { useRequestError } from '@/composables/use-request-error'
import { useAuthStore } from '@/stores/auth'
import { usePermissionStore } from '@/stores/permission'

const authStore = useAuthStore()
const permissionStore = usePermissionStore()
const canEdit = computed(() => permissionStore.can('security-key', 'update'))
const isCurrentUserTotpDisabled = computed(() => authStore.user?.totpEnabled === false)
const loading = ref(false)
const jwtRotating = ref(false)
const totpRotating = ref(false)
const overview = ref<SecurityKeyOverview | null>(null)
const totpModalVisible = ref(false)
const pendingAction = ref<'jwt' | 'totp' | null>(null)
const showRequestError = useRequestError()

const securityItems = computed<SecurityKeyItem[]>(() => {
  if (!overview.value) {
    return []
  }
  return [overview.value.jwt, overview.value.totp]
})

onMounted(() => {
  void loadOverview()
})

async function loadOverview() {
  loading.value = true
  try {
    const response = await getSecurityKeyOverview()
    overview.value = response.data
  } catch (error) {
    showRequestError(error, '加载安全密钥状态失败')
  } finally {
    loading.value = false
  }
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return '--'
  }
  return value.replace('T', ' ').slice(0, 19)
}

function sourceLabel(source: string): string {
  return source === 'DATABASE' ? '数据库托管' : '配置文件'
}

const totpModalTitle = computed(() => pendingAction.value === 'jwt' ? '轮转 JWT 主密钥' : '轮转 2FA 主密钥')
const totpModalDescription = computed(() => pendingAction.value === 'jwt'
  ? '轮转后，新签发访问令牌将使用新的主密钥。请输入当前账号的 2FA 验证码以确认操作。'
  : '轮转后将批量重加密已保存的 2FA 绑定密钥。请输入当前账号的 2FA 验证码以确认操作。')
const totpModalLoading = computed(() => jwtRotating.value || totpRotating.value)

function handleRotateJwt() {
  if (!canEdit.value) {
    message.warning('暂无安全密钥编辑权限')
    return
  }
  if (isCurrentUserTotpDisabled.value) {
    message.warning('当前账号未启用 2FA，禁止轮转安全密钥')
    return
  }
  pendingAction.value = 'jwt'
  totpModalVisible.value = true
}

function handleRotateTotp() {
  if (!canEdit.value) {
    message.warning('暂无安全密钥编辑权限')
    return
  }
  if (isCurrentUserTotpDisabled.value) {
    message.warning('当前账号未启用 2FA，禁止轮转安全密钥')
    return
  }
  pendingAction.value = 'totp'
  totpModalVisible.value = true
}

async function handleTotpModalSubmit(totpCode: string) {
  if (pendingAction.value == null) {
    return
  }
  try {
    if (pendingAction.value === 'jwt') {
      jwtRotating.value = true
      const response = await rotateJwtSecurityKey(totpCode)
      message.success(response.message || 'JWT 主密钥轮转成功')
    } else {
      totpRotating.value = true
      const response = await rotateTotpSecurityKey(totpCode)
      const affectedCount = response.data?.processedRecordCount ?? 0
      message.success(response.message || `2FA 主密钥轮转成功，已处理 ${affectedCount} 条绑定记录`)
    }
    totpModalVisible.value = false
    pendingAction.value = null
    await loadOverview()
  } catch (error) {
    showRequestError(error, pendingAction.value === 'jwt' ? 'JWT 主密钥轮转失败' : '2FA 主密钥轮转失败')
  } finally {
    jwtRotating.value = false
    totpRotating.value = false
  }
}

function handleTotpModalClose(value: boolean) {
  totpModalVisible.value = value
  if (!value && !totpModalLoading.value) {
    pendingAction.value = null
  }
}
</script>

<template>
  <div class="page-stack security-key-page">
    <div class="status-section">
      <a-alert
        v-if="isCurrentUserTotpDisabled"
        type="warning"
        show-icon
        style="margin-bottom: 16px"
        message="当前账号未启用 2FA，安全密钥轮转已禁止。请先完成 2FA 绑定。"
      />
      <div class="status-header">
        <div class="status-header-main">
          <span class="status-title">安全密钥管理</span>
          <span class="status-subtitle">JWT 主密钥与 2FA 主密钥支持从配置文件切换到数据库托管，并在系统设置内执行轮转。</span>
        </div>
        <a-button size="small" :loading="loading" @click="loadOverview">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
      </div>

      <div class="status-cards security-key-cards">
        <div
          v-for="item in securityItems"
          :key="item.keyCode"
          class="status-card security-key-card"
        >
          <div class="status-card-header">
            <div class="status-card-icon">
              <SafetyCertificateOutlined />
            </div>
            <div class="status-card-info">
              <div class="status-card-name">{{ item.keyName }}</div>
              <div class="status-card-version">来源：{{ sourceLabel(item.source) }}</div>
            </div>
            <a-tag :color="item.source === 'DATABASE' ? 'green' : 'gold'" class="status-tag">
              {{ sourceLabel(item.source) }}
            </a-tag>
          </div>

          <div class="status-card-body">
            <div class="status-metric">
              <div class="metric-value">v{{ item.activeVersion }}</div>
              <div class="metric-label">当前版本</div>
            </div>
            <div class="status-metric">
              <div class="metric-value">{{ item.activeFingerprint }}</div>
              <div class="metric-label">当前指纹</div>
            </div>
            <div class="status-metric">
              <div class="metric-value">{{ item.retiredVersionCount }}</div>
              <div class="metric-label">历史版本</div>
            </div>
          </div>

          <div class="status-card-footer">
            <div class="footer-item">
              <span class="footer-label">启用时间</span>
              <span class="footer-value">{{ formatDateTime(item.activatedAt) }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">受保护记录</span>
              <span class="footer-value">{{ item.protectedRecordCount }}</span>
            </div>
            <div class="footer-item footer-item-wrap">
              <span class="footer-label">说明</span>
              <span class="footer-value">{{ item.remark }}</span>
            </div>
          </div>

          <div class="security-key-actions">
            <a-button
              v-if="item.keyCode === 'JWT_MASTER'"
              type="primary"
              :loading="jwtRotating"
              :disabled="!canEdit || isCurrentUserTotpDisabled"
              @click="handleRotateJwt"
            >
              <template #icon><SyncOutlined /></template>
              轮转 JWT 主密钥
            </a-button>
            <a-button
              v-else
              danger
              :loading="totpRotating"
              :disabled="!canEdit || isCurrentUserTotpDisabled"
              @click="handleRotateTotp"
            >
              <template #icon><SyncOutlined /></template>
              轮转 2FA 主密钥
            </a-button>
          </div>
        </div>
      </div>

      <div class="security-key-notes">
        <a-alert
          type="info"
          show-icon
          message="配置检查"
          description="未轮转前，系统使用 application.yml 与环境变量中的启动兜底密钥；一旦完成轮转，JWT 与 2FA 将优先使用数据库托管主密钥。"
        />
        <a-alert
          type="warning"
          show-icon
          message="执行建议"
          description="JWT 轮转会立即影响新签发令牌；2FA 轮转会重加密现有绑定，建议在低峰期由系统管理员执行，并在执行前确认数据库备份正常。"
        />
      </div>
    </div>
    <TwoFactorConfirmModal
      :open="totpModalVisible"
      :title="totpModalTitle"
      :description="totpModalDescription"
      confirm-text="确认并执行"
      :confirm-danger="pendingAction === 'totp'"
      :loading="totpModalLoading"
      @submit="handleTotpModalSubmit"
      @update:open="handleTotpModalClose"
    />
  </div>
</template>

<style scoped>
.status-section {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 16px;
}

.status-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.status-header-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.status-title {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

.status-subtitle {
  color: #8c8c8c;
  line-height: 1.6;
}

.status-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
}

.status-card {
  background: #fafafa;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #f0f0f0;
  transition: all 0.3s;
}

.status-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: #e0e0e0;
}

.status-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.status-card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #1890ff, #096dd9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #fff;
}

.status-card-info {
  flex: 1;
}

.status-card-name {
  font-size: 18px;
  font-weight: 600;
  color: #262626;
}

.status-card-version {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 2px;
}

.status-tag {
  margin-left: auto;
}

.status-card-body {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.status-metric {
  flex: 1;
  text-align: center;
}

.metric-value {
  font-size: 20px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 4px;
  word-break: break-all;
}

.metric-label {
  font-size: 12px;
  color: #8c8c8c;
}

.status-card-footer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.footer-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.footer-item-wrap .footer-value {
  text-align: right;
  font-family: inherit;
}

.footer-label {
  font-size: 13px;
  color: #8c8c8c;
}

.footer-value {
  font-size: 13px;
  color: #595959;
  font-family: monospace;
}

.security-key-actions {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
}

.security-key-notes {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
}
</style>
