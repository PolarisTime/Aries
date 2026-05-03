<script setup lang="ts">
import { computed, h, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { DownloadOutlined, UploadOutlined, ReloadOutlined, DatabaseOutlined } from '@ant-design/icons-vue'
import { createColumnHelper, type ColumnDef } from '@tanstack/vue-table'
import TwoFactorConfirmModal from '@/components/TwoFactorConfirmModal.vue'
import { useDataTable } from '@/composables/use-data-table'
import DataTable from '@/components/DataTable.vue'
import {
  createDatabaseExportTask,
  getDatabaseStatus,
  generateDatabaseExportDownloadLink,
  importDatabaseBackup,
  listDatabaseExportTasks,
  type DatabaseExportTask,
  type DatabaseStatus,
} from '@/api/database-admin'
import { useRequestError } from '@/composables/use-request-error'
import { useAuthStore } from '@/stores/auth'
import { usePermissionStore } from '@/stores/permission'

const authStore = useAuthStore()
const permissionStore = usePermissionStore()

const statusLoading = ref(false)
const exportTaskLoading = ref(false)
const dbStatus = ref<DatabaseStatus | null>(null)
const exportTasks = ref<DatabaseExportTask[]>([])
const exportLoading = ref(false)
const importLoading = ref(false)
const importModalVisible = ref(false)
const totpModalVisible = ref(false)
const pendingAction = ref<'export' | 'import' | null>(null)
const pendingImportFile = ref<File | null>(null)
const importForm = reactive({
  databaseUsername: '',
  databasePassword: '',
})

const canExport = computed(() => permissionStore.can('database', 'export'))
const canImport = computed(() => permissionStore.can('database', 'update'))
const isCurrentUserTotpDisabled = computed(() => authStore.user?.totpEnabled === false)
const totpModalTitle = computed(() => pendingAction.value === 'import' ? '导入数据库备份' : '提交数据库导出任务')
const showRequestError = useRequestError()
const totpModalDescription = computed(() => pendingAction.value === 'import'
  ? `即将导入备份文件“${pendingImportFile.value?.name || ''}”，并使用所填数据库账号执行恢复。导入前会自动备份当前数据库。请输入当前账号的 2FA 验证码确认操作。`
  : '即将提交数据库导出后台任务。导出完成后会生成一个 7 天有效的下载链接。请输入当前账号的 2FA 验证码确认操作。')
const totpModalLoading = computed(() => exportLoading.value || importLoading.value)

let taskPollingTimer: number | null = null

onMounted(() => {
  loadStatus()
  if (canExport.value) {
    loadExportTasks()
  }
})

onBeforeUnmount(() => {
  clearTaskPollingTimer()
})

watch(canExport, (value) => {
  if (value) {
    loadExportTasks()
    return
  }
  clearTaskPollingTimer()
  exportTasks.value = []
})

async function loadStatus() {
  statusLoading.value = true
  try {
    dbStatus.value = await getDatabaseStatus()
  } catch (error) {
    showRequestError(error, '加载状态失败')
  } finally {
    statusLoading.value = false
  }
}

async function loadExportTasks(silent = false) {
  if (!canExport.value) {
    return
  }

  if (!silent) {
    exportTaskLoading.value = true
  }

  try {
    exportTasks.value = await listDatabaseExportTasks()
    scheduleTaskPolling()
  } catch (error) {
    clearTaskPollingTimer()
    if (!silent) {
      showRequestError(error, '加载导出任务失败')
    }
  } finally {
    exportTaskLoading.value = false
  }
}

function clearTaskPollingTimer() {
  if (taskPollingTimer != null) {
    window.clearTimeout(taskPollingTimer)
    taskPollingTimer = null
  }
}

function scheduleTaskPolling() {
  clearTaskPollingTimer()
  if (!exportTasks.value.some((task) => isRunningTask(task.status))) {
    return
  }

  taskPollingTimer = window.setTimeout(async () => {
    await loadExportTasks(true)
  }, 3000)
}

function formatMemory(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB'
}

function formatDateTime(value: string | undefined): string {
  if (!value) {
    return '--'
  }
  return value.replace('T', ' ').slice(0, 19)
}

function isNormal(status: string): boolean {
  return status === '正常'
}

function isRunningTask(status: string): boolean {
  return status === '排队中' || status === '执行中'
}

const taskColumnHelper = createColumnHelper<DatabaseExportTask>()
const exportTaskColumns = computed<ColumnDef<DatabaseExportTask, unknown>[]>(() => [
  taskColumnHelper.accessor('taskNo', { header: () => '任务编号', meta: { width: 220 } }),
  taskColumnHelper.accessor('status', {
    header: () => '状态',
    cell: (info) => h('span', { class: `ant-tag ant-tag-${formatTaskStatusColor(info.getValue())}` }, info.getValue()),
    meta: { width: 110, align: 'center' },
  }),
  taskColumnHelper.accessor('fileName', {
    header: () => '备份文件',
    cell: (info) => info.getValue() || '--',
    meta: { width: 220 },
  }),
  taskColumnHelper.accessor('fileSize', {
    header: () => '大小',
    cell: (info) => info.getValue() ? formatMemory(info.getValue()!) : '--',
    meta: { width: 120, align: 'right' },
  }),
  taskColumnHelper.accessor('createdAt', {
    header: () => '提交时间',
    cell: (info) => formatDateTime(info.getValue()),
    meta: { width: 180 },
  }),
  taskColumnHelper.accessor('expiresAt', {
    header: () => '文件保留至',
    cell: (info) => formatDateTime(info.getValue()),
    meta: { width: 180 },
  }),
  taskColumnHelper.accessor('failureReason', {
    header: () => '结果说明',
    cell: (info) => info.getValue() || (info.row.original.status === '已完成' ? '导出完成，可下载' : '--'),
    meta: { width: 260 },
  }),
  taskColumnHelper.display({
    id: 'action',
    header: () => '操作',
    meta: { width: 120, align: 'center', fixed: 'right' },
  }),
])

const { table: exportTaskTable } = useDataTable({
  data: computed(() => exportTasks.value),
  columns: exportTaskColumns,
  getRowId: (row) => row.id,
  manualPagination: false,
  enableSorting: false,
})

function formatTaskStatusColor(status: string) {
  if (status === '已完成') return 'success'
  if (status === '失败' || status === '已过期') return 'error'
  if (status === '执行中') return 'processing'
  return 'default'
}

async function handleGenerateDownloadLink(taskId: string) {
  try {
    const response = await generateDatabaseExportDownloadLink(taskId)
    if (!response.downloadUrl) {
      throw new Error('下载链接为空')
    }
    window.open(response.downloadUrl, '_blank', 'noopener,noreferrer')
    message.success('一次性下载链接已生成并开始下载；如需再次下载，请重新生成')
    await loadExportTasks(true)
  } catch (error) {
    showRequestError(error, '生成下载链接失败')
  }
}

function handleExport() {
  if (!canExport.value) {
    message.warning('暂无数据库导出权限')
    return
  }
  if (isCurrentUserTotpDisabled.value) {
    message.warning('当前账号未启用 2FA，禁止导出数据库备份')
    return
  }
  pendingAction.value = 'export'
  totpModalVisible.value = true
}

function handleImportClick() {
  if (!canImport.value) {
    message.warning('暂无数据库导入权限')
    return
  }
  if (isCurrentUserTotpDisabled.value) {
    message.warning('当前账号未启用 2FA，禁止导入数据库备份')
    return
  }
  importModalVisible.value = true
}

function handleImportFile(file: File) {
  pendingImportFile.value = file
  return false
}

function resetImportForm() {
  importForm.databaseUsername = ''
  importForm.databasePassword = ''
  pendingImportFile.value = null
}

function submitImportRequest() {
  if (!canImport.value) {
    message.warning('暂无数据库导入权限')
    return
  }
  if (isCurrentUserTotpDisabled.value) {
    message.warning('当前账号未启用 2FA，禁止导入数据库备份')
    return
  }
  if (!importForm.databaseUsername.trim()) {
    message.warning('请输入数据库用户名')
    return
  }
  if (!importForm.databasePassword) {
    message.warning('请输入数据库密码')
    return
  }
  if (!pendingImportFile.value) {
    message.warning('请选择备份文件')
    return
  }
  pendingAction.value = 'import'
  totpModalVisible.value = true
}

async function handleTotpModalSubmit(totpCode: string) {
  if (pendingAction.value == null) {
    return
  }

  try {
    if (pendingAction.value === 'export') {
      exportLoading.value = true
      message.loading('正在提交数据库导出任务...', 0)
      await createDatabaseExportTask(totpCode)
      await loadExportTasks(true)
      message.destroy()
      message.success('数据库导出任务已提交，完成后可在下方下载')
    } else if (pendingImportFile.value) {
      importLoading.value = true
      message.loading('正在导入数据库备份（含自动备份）...', 0)
      await importDatabaseBackup(
        pendingImportFile.value,
        totpCode,
        importForm.databaseUsername,
        importForm.databasePassword,
      )
      message.destroy()
      message.success('数据库导入成功')
      importModalVisible.value = false
      resetImportForm()
    }
    totpModalVisible.value = false
    pendingAction.value = null
  } catch (error) {
    message.destroy()
    showRequestError(error, pendingAction.value === 'export' ? '导出失败' : '导入失败')
  } finally {
    exportLoading.value = false
    importLoading.value = false
  }
}

function handleTotpModalClose(value: boolean) {
  totpModalVisible.value = value
  if (!value && !totpModalLoading.value) {
    pendingAction.value = null
  }
}

function closeImportModal() {
  if (importLoading.value) {
    return
  }
  importModalVisible.value = false
  resetImportForm()
}
</script>

<template>
  <div class="page-stack database-management-page">
    <div class="status-section">
      <div class="status-header">
        <span class="status-title">数据库状态</span>
        <a-button size="small" :loading="statusLoading" @click="loadStatus">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
      </div>

      <div v-if="dbStatus" class="status-cards">
        <div class="status-card postgres-card">
          <div class="status-card-header">
            <div class="status-card-icon">
              <DatabaseOutlined />
            </div>
            <div class="status-card-info">
              <div class="status-card-name">PostgreSQL</div>
              <div class="status-card-version">{{ dbStatus.postgres.version }}</div>
            </div>
            <a-tag :color="isNormal(dbStatus.postgres.status) ? 'green' : 'red'" class="status-tag">
              {{ dbStatus.postgres.status }}
            </a-tag>
          </div>
          <div class="status-card-body">
            <div class="status-metric">
              <div class="metric-value">{{ dbStatus.postgres.databaseSize }}</div>
              <div class="metric-label">数据库大小</div>
            </div>
            <div class="status-metric">
              <div class="metric-value">{{ dbStatus.postgres.tableCount }}</div>
              <div class="metric-label">表数量</div>
            </div>
            <div class="status-metric">
              <div class="metric-value">{{ dbStatus.postgres.activeConnections }}/{{ dbStatus.postgres.maxConnections }}</div>
              <div class="metric-label">活跃连接</div>
            </div>
          </div>
          <div class="status-card-footer">
            <div class="footer-item">
              <span class="footer-label">地址</span>
              <span class="footer-value">{{ dbStatus.postgres.host }}:{{ dbStatus.postgres.port }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">数据库</span>
              <span class="footer-value">{{ dbStatus.postgres.database }}</span>
            </div>
            <div v-if="dbStatus.postgres.serverStartTime" class="footer-item">
              <span class="footer-label">启动时间</span>
              <span class="footer-value">{{ dbStatus.postgres.serverStartTime.replace('T', ' ').slice(0, 19) }}</span>
            </div>
          </div>
        </div>

        <div class="status-card redis-card">
          <div class="status-card-header">
            <div class="status-card-icon redis-icon">
              <DatabaseOutlined />
            </div>
            <div class="status-card-info">
              <div class="status-card-name">Redis</div>
              <div class="status-card-version">{{ dbStatus.redis.version }}</div>
            </div>
            <a-tag :color="isNormal(dbStatus.redis.status) ? 'green' : 'red'" class="status-tag">
              {{ dbStatus.redis.status }}
            </a-tag>
          </div>
          <div class="status-card-body">
            <div class="status-metric">
              <div class="metric-value">{{ formatMemory(dbStatus.redis.usedMemory) }}</div>
              <div class="metric-label">内存占用</div>
            </div>
            <div class="status-metric">
              <div class="metric-value">{{ dbStatus.redis.totalKeys }}</div>
              <div class="metric-label">键数量</div>
            </div>
            <div class="status-metric">
              <div class="metric-value">{{ dbStatus.redis.hitRate }}%</div>
              <div class="metric-label">命中率</div>
            </div>
          </div>
          <div class="status-card-footer">
            <div class="footer-item">
              <span class="footer-label">地址</span>
              <span class="footer-value">{{ dbStatus.redis.host }}:{{ dbStatus.redis.port }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">运行时间</span>
              <span class="footer-value">{{ dbStatus.redis.uptime }}</span>
            </div>
            <div class="footer-item">
              <span class="footer-label">客户端</span>
              <span class="footer-value">{{ dbStatus.redis.connectedClients }} 个连接</span>
            </div>
          </div>
        </div>
      </div>

      <a-skeleton v-else active />
    </div>

    <a-card :bordered="false" class="module-panel-card">
      <a-alert
        v-if="isCurrentUserTotpDisabled"
        type="warning"
        show-icon
        style="margin-bottom: 16px"
        message="当前账号未启用 2FA，数据库导出和导入已禁止。请先完成 2FA 绑定。"
      />
      <a-alert
        type="info"
        show-icon
        style="margin-bottom: 24px"
        message="数据库备份管理"
        description="导出已改为后台任务，完成后提供 7 天有效下载链接；导入恢复需填写数据库用户名和密码，导入前会自动创建一份当前数据库的备份。"
      />

      <div class="backup-actions">
        <div class="backup-actions-row">
          <a-card hoverable class="backup-action-card">
            <div class="backup-action-icon">
              <DownloadOutlined />
            </div>
            <div class="backup-action-title">后台导出</div>
            <div class="backup-action-desc">将当前数据库导出为 SQL 备份文件，完成后提供下载链接</div>
            <a-button
              v-if="canExport"
              type="primary"
              :loading="exportLoading"
              :disabled="isCurrentUserTotpDisabled"
              size="large"
              block
              @click="handleExport"
            >
              提交导出
            </a-button>
          </a-card>
          <a-card hoverable class="backup-action-card">
            <div class="backup-action-icon">
              <UploadOutlined />
            </div>
            <div class="backup-action-title">导入恢复</div>
            <div class="backup-action-desc">从 SQL 备份文件恢复数据库（自动备份前置）</div>
            <a-button
              v-if="canImport"
              type="primary"
              danger
              :loading="importLoading"
              :disabled="isCurrentUserTotpDisabled"
              size="large"
              block
              @click="handleImportClick"
            >
              导入备份
            </a-button>
          </a-card>
        </div>
      </div>
    </a-card>

    <a-card v-if="canExport" :bordered="false" class="module-panel-card">
      <div class="task-header">
        <div>
          <div class="backup-action-title">导出任务</div>
          <div class="backup-action-desc">最近 20 条后台导出记录，成功后可在有效期内直接下载。</div>
        </div>
        <a-button size="small" :loading="exportTaskLoading" @click="loadExportTasks()">
          <template #icon><ReloadOutlined /></template>
          刷新任务
        </a-button>
      </div>

      <DataTable
        :table="exportTaskTable"
        :loading="exportTaskLoading"
        size="small"
        :scroll-x="1100"
      >
        <template #cell-action="{ row }">
          <a
            v-if="row.status === '已完成'"
            @click="handleGenerateDownloadLink(row.id)"
          >
            生成链接
          </a>
          <span v-else>--</span>
        </template>
      </DataTable>
    </a-card>

    <a-modal
      v-model:open="importModalVisible"
      title="导入数据库备份"
      ok-text="验证并导入"
      cancel-text="取消"
      :confirm-loading="importLoading"
      :width="480"
      :destroy-on-close="true"
      @ok="submitImportRequest"
      @cancel="closeImportModal"
    >
      <div style="padding: 16px 0;">
        <a-alert
          type="warning"
          show-icon
          style="margin-bottom: 16px"
          message="导入前会自动备份当前数据库"
          description="请选择 .sql 格式的备份文件，并填写当前 PostgreSQL 账号密码。导入操作会覆盖当前数据，请谨慎操作。"
        />
        <a-form layout="vertical">
          <a-form-item label="数据库用户名" required>
            <a-input
              v-model:value="importForm.databaseUsername"
              :disabled="importLoading || isCurrentUserTotpDisabled"
              placeholder="输入 PostgreSQL 用户名"
            />
          </a-form-item>
          <a-form-item label="数据库密码" required>
            <a-input-password
              v-model:value="importForm.databasePassword"
              :disabled="importLoading || isCurrentUserTotpDisabled"
              placeholder="输入 PostgreSQL 密码"
            />
          </a-form-item>
          <a-form-item label="备份文件" required>
            <a-upload
              :before-upload="handleImportFile"
              :show-upload-list="false"
              accept=".sql"
            >
              <a-button
                :loading="importLoading"
                :disabled="isCurrentUserTotpDisabled"
                type="primary"
                danger
              >
                选择备份文件
              </a-button>
            </a-upload>
            <div class="selected-file-name">
              {{ pendingImportFile?.name || '未选择文件' }}
            </div>
          </a-form-item>
        </a-form>
      </div>
    </a-modal>

    <TwoFactorConfirmModal
      :open="totpModalVisible"
      :title="totpModalTitle"
      :description="totpModalDescription"
      confirm-text="验证并继续"
      :confirm-danger="pendingAction === 'import'"
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
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.status-title {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

.status-cards {
  display: flex;
  gap: 20px;
}

.status-card {
  flex: 1;
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

.redis-icon {
  background: linear-gradient(135deg, #ff4d4f, #cf1322);
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
  align-items: center;
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

.backup-actions {
  width: 100%;
}

.backup-actions-row {
  display: flex;
  gap: 24px;
  width: 100%;
}

.backup-actions-row .backup-action-card {
  flex: 1;
  min-width: 0;
  text-align: center;
}

.backup-actions-row .backup-action-card :deep(.ant-card-body) {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.backup-action-icon {
  font-size: 48px;
  color: #1890ff;
}

.backup-action-title {
  font-size: 18px;
  font-weight: 600;
  color: #262626;
}

.backup-action-desc {
  font-size: 14px;
  color: #8c8c8c;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.selected-file-name {
  margin-top: 8px;
  color: #8c8c8c;
}

@media (max-width: 960px) {
  .status-cards,
  .backup-actions-row {
    flex-direction: column;
  }

  .task-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
