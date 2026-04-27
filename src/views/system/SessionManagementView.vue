<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { ReloadOutlined, StopOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import {
  getRefreshTokenSummary,
  listRefreshTokens,
  revokeAllRefreshTokens,
  revokeRefreshToken,
  type RefreshTokenRecord,
  type RefreshTokenSummaryData,
} from '@/api/session-management'
import { useRequestError } from '@/composables/use-request-error'
import { usePermissionStore } from '@/stores/permission'

const loading = ref(false)
const tokenRows = ref<RefreshTokenRecord[]>([])
const summary = ref<RefreshTokenSummaryData>({
  onlineUsers: 0,
  onlineSessions: 0,
  activeSessions: 0,
})
const totalElements = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const permissionStore = usePermissionStore()
const canEdit = computed(() => permissionStore.can('session', 'update'))
let refreshTimer: ReturnType<typeof window.setInterval> | null = null
const showRequestError = useRequestError()

watch([currentPage, pageSize], () => {
  void loadPageData()
})

async function loadTokens() {
  const data = await listRefreshTokens({
    page: currentPage.value - 1,
    size: pageSize.value,
    keyword: keyword.value || undefined,
  })
  tokenRows.value = data.records || []
  totalElements.value = data.totalElements || 0
}

async function loadSummary() {
  summary.value = await getRefreshTokenSummary()
}

async function loadPageData() {
  loading.value = true
  try {
    await Promise.all([loadTokens(), loadSummary()])
  } catch (error) {
    showRequestError(error, '加载失败')
  } finally {
    loading.value = false
  }
}

async function handleRevoke(record: RefreshTokenRecord) {
  if (!canEdit.value) {
    message.warning('暂无会话管理权限')
    return
  }
  const confirmed = await new Promise<boolean>((resolve) => {
    Modal.confirm({
      title: '禁用令牌',
      content: `确定禁用该会话令牌吗？禁用后对应设备需要重新登录。`,
      okText: '确认禁用',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    })
  })
  if (!confirmed) return

  try {
    await revokeRefreshToken(record.id)
    message.success('已禁用')
    await loadPageData()
  } catch (error) {
    showRequestError(error, '禁用失败')
  }
}

function handleSearch() {
  if (currentPage.value !== 1) {
    currentPage.value = 1
    return
  }
  currentPage.value = 1
  void loadPageData()
}

async function handleRevokeAll() {
  if (!canEdit.value) {
    message.warning('暂无会话管理权限')
    return
  }
  const confirmed = await new Promise<boolean>((resolve) => {
    Modal.confirm({
      title: '清除全部令牌',
      content: '确定禁用所有有效的会话令牌吗？所有设备将需要重新登录。',
      okText: '确认清除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    })
  })
  if (!confirmed) return

  try {
    const response = await revokeAllRefreshTokens()
    message.success(response.message || '已清除')
    await loadPageData()
  } catch (error) {
    showRequestError(error, '清除失败')
  }
}

function getStatusColor(status: string) {
  if (status === '有效') return 'green'
  if (status === '已禁用') return 'red'
  return 'default'
}

function getOnlineColor(record: RefreshTokenRecord) {
  if (record.status !== '有效') return 'default'
  return record.online ? 'green' : 'orange'
}

function getOnlineLabel(record: RefreshTokenRecord) {
  if (record.status !== '有效') return '离线'
  return record.online ? '在线' : '离线'
}

function truncateDeviceInfo(text: string | null) {
  if (!text) return '--'
  return text.length > 60 ? text.slice(0, 60) + '...' : text
}

function startAutoRefresh() {
  refreshTimer = window.setInterval(() => {
    void loadPageData()
  }, 30_000)
}

function stopAutoRefresh() {
  if (refreshTimer != null) {
    window.clearInterval(refreshTimer)
    refreshTimer = null
  }
}

onMounted(() => {
  void loadPageData()
  startAutoRefresh()
})

onBeforeUnmount(() => {
  stopAutoRefresh()
})
</script>

<template>
  <div class="page-stack session-management-page">
    <a-card :bordered="false" class="module-panel-card">
      <div class="session-summary">
        <a-statistic title="在线人数" :value="summary.onlineUsers" />
        <a-statistic title="在线设备" :value="summary.onlineSessions" />
        <a-statistic title="有效会话" :value="summary.activeSessions" />
      </div>

      <div class="session-toolbar">
        <a-input-search
          v-model:value="keyword"
          placeholder="搜索 Token ID / IP / 设备信息"
          style="width: 320px"
          allow-clear
          @search="handleSearch"
        />
        <a-button @click="loadTokens">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
        <a-button v-if="canEdit" danger @click="handleRevokeAll">
          <template #icon><DeleteOutlined /></template>
          清除全部
        </a-button>
      </div>

      <a-table
        row-key="id"
        size="middle"
        bordered
        :data-source="tokenRows"
        :loading="loading"
        :pagination="{
          current: currentPage,
          pageSize: pageSize,
          total: totalElements,
          showSizeChanger: true,
          showTotal: (total: number) => `共 ${total} 条`,
          onChange: (page: number, size: number) => { currentPage = page; pageSize = size },
        }"
      >
        <a-table-column key="tokenId" title="Token ID" data-index="tokenId" width="200" :ellipsis="true" />
        <a-table-column key="loginName" title="登录名" data-index="loginName" width="120" />
        <a-table-column key="userName" title="用户名" data-index="userName" width="120" />
        <a-table-column key="loginIp" title="登录IP" data-index="loginIp" width="140" />
        <a-table-column key="deviceInfo" title="设备信息" width="280" :ellipsis="true">
          <template #default="{ record }">
            <a-tooltip :title="record.deviceInfo">
              {{ truncateDeviceInfo(record.deviceInfo) }}
            </a-tooltip>
          </template>
        </a-table-column>
        <a-table-column key="createdAt" title="创建时间" data-index="createdAt" width="170" />
        <a-table-column key="lastActiveAt" title="最近活跃" width="170">
          <template #default="{ record }">
            {{ record.lastActiveAt || '--' }}
          </template>
        </a-table-column>
        <a-table-column key="expiresAt" title="过期时间" data-index="expiresAt" width="170" />
        <a-table-column key="online" title="在线状态" width="100" align="center">
          <template #default="{ record }">
            <a-tag :color="getOnlineColor(record)">
              {{ getOnlineLabel(record) }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column key="status" title="状态" width="100" align="center">
          <template #default="{ record }">
            <a-tag :color="getStatusColor(record.status)">
              {{ record.status }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column key="action" title="操作" width="100" align="center">
          <template #default="{ record }">
            <a
              v-if="canEdit && record.status === '有效'"
              style="color: #ff4d4f"
              @click.prevent="handleRevoke(record)"
            >
              <StopOutlined /> 禁用
            </a>
            <span v-else style="color: #bfbfbf">--</span>
          </template>
        </a-table-column>
      </a-table>
    </a-card>
  </div>
</template>

<style scoped>
.session-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.session-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}
</style>
