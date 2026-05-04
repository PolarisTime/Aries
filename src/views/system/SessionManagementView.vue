<script setup lang="ts">
import { computed, h, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { ReloadOutlined, StopOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'
import { useDataTable } from '@/composables/use-data-table'
import DataTable from '@/components/DataTable.vue'
import TableActions from '@/components/TableActions.vue'
import type { ActionItem } from '@/components/TableActions.vue'
import StatusTag from '@/components/StatusTag.vue'
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

function getSessionActions(row: RefreshTokenRecord): ActionItem[] {
  return [
    {
      key: 'revoke',
      label: '禁用',
      icon: StopOutlined,
      danger: true,
      visible: canEdit.value && row.status === '有效',
      onClick: () => handleRevoke(row)
    }
  ]
}

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
  totalElements.value = Number(data.totalElements) || 0
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

function truncateDeviceInfo(text: unknown) {
  const s = String(text ?? '')
  if (!s) return '--'
  return s.length > 60 ? s.slice(0, 60) + '...' : s
}

const sessionColumnHelper = createColumnHelper<RefreshTokenRecord>()
const sessionColumns = computed<ColumnDef<RefreshTokenRecord, unknown>[]>(() => [
  sessionColumnHelper.accessor('tokenId', { header: () => 'Token ID', meta: { width: 200, ellipsis: true } }),
  sessionColumnHelper.accessor('loginName', { header: () => '登录名', meta: { width: 120 } }),
  sessionColumnHelper.accessor('userName', { header: () => '用户名', meta: { width: 120 } }),
  sessionColumnHelper.accessor('loginIp', { header: () => '登录IP', meta: { width: 140 } }),
  sessionColumnHelper.accessor('deviceInfo', {
    header: () => '设备信息',
    cell: (info) => {
      const text = String(info.getValue() ?? '')
      return text ? truncateDeviceInfo(text) : '--'
    },
    meta: { width: 280, ellipsis: true },
  }),
  sessionColumnHelper.accessor('createdAt', { header: () => '创建时间', meta: { width: 170 } }),
  sessionColumnHelper.accessor('lastActiveAt', {
    header: () => '最近活跃',
    cell: (info) => info.getValue() || '--',
    meta: { width: 170 },
  }),
  sessionColumnHelper.accessor('expiresAt', { header: () => '过期时间', meta: { width: 170 } }),
  sessionColumnHelper.display({
    id: 'online',
    header: () => '在线状态',
    cell: (info) => {
      const record = info.row.original
      return h(StatusTag, { status: getOnlineLabel(record), color: getOnlineColor(record) })
    },
    meta: { width: 100, align: 'center' },
  }),
  sessionColumnHelper.accessor('status', {
    header: () => '状态',
    cell: (info) => h(StatusTag, { status: info.getValue() as string, color: getStatusColor(String(info.getValue())) }),
    meta: { width: 100, align: 'center' },
  }),
  sessionColumnHelper.display({
    id: 'action',
    header: () => '操作',
    meta: { width: 100, align: 'center' },
  }),
])

const { table: sessionTable } = useDataTable({
  data: computed(() => tokenRows.value),
  columns: sessionColumns,
  getRowId: (row) => row.id,
  manualPagination: true,
  enableSorting: false,
})

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

      <DataTable
        :table="sessionTable"
        size="middle"
        :loading="loading"
      >
        <template #cell-action="{ row }">
          <TableActions :items="getSessionActions(row)" />
        </template>
      </DataTable>
      <div style="display: flex; justify-content: flex-end; margin-top: 16px">
        <a-pagination
          :current="currentPage"
          :page-size="pageSize"
          :total="totalElements"
          show-size-changer
          :show-total="(total: number) => `共 ${total} 条`"
          @change="(page: number, size: number) => { currentPage = page; pageSize = size }"
        />
      </div>
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
