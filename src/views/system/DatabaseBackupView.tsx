/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Form from 'antd/es/form'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createDatabaseExportTask,
  generateDatabaseExportDownloadLink,
  getDatabaseStatus,
  importDatabaseBackup,
  listDatabaseExportTasks,
} from '@/api/database-admin'
import { TwoFactorConfirmModal } from '@/components/TwoFactorConfirmModal'
import { usePageVisibility } from '@/hooks/usePageVisibility'
import { useRequestError } from '@/hooks/useRequestError'
import { useAuthStore } from '@/stores/authStore'
import { usePermissionStore } from '@/stores/permissionStore'
import { DatabaseBackupActionsCard } from '@/views/system/DatabaseBackupActionsCard'
import { DatabaseExportTasksCard } from '@/views/system/DatabaseExportTasksCard'
import { DatabaseImportBackupModal } from '@/views/system/DatabaseImportBackupModal'
import { DatabaseStatusOverview } from '@/views/system/DatabaseStatusOverview'
import { isDatabaseTaskRunning } from '@/views/system/database-backup-view-utils'
import { message } from '@/utils/antd-app'

export function DatabaseBackupView() {
  const queryClient = useQueryClient()
  const { showError } = useRequestError()
  const permissionStore = usePermissionStore()
  const authStore = useAuthStore()

  const canExport = permissionStore.can('database', 'export')
  const canImport = permissionStore.can('database', 'update')
  const isCurrentUserTotpDisabled = authStore.user?.totpEnabled === false
  const isPageVisible = usePageVisibility()

  const [exportLoading, setExportLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [totpModalOpen, setTotpModalOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<
    'export' | 'import' | null
  >(null)
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null)
  const [importForm] = Form.useForm()

  const taskPollingRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: dbStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['database-status'],
    queryFn: getDatabaseStatus,
  })

  const { data: exportTasks = [], isLoading: taskLoading } = useQuery({
    queryKey: ['database-export-tasks'],
    queryFn: listDatabaseExportTasks,
    enabled: canExport && isPageVisible,
  })

  const scheduleTaskPolling = useCallback(() => {
    if (taskPollingRef.current) clearTimeout(taskPollingRef.current)
    if (
      isPageVisible &&
      exportTasks.some((task) => isDatabaseTaskRunning(task.status))
    ) {
      taskPollingRef.current = setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['database-export-tasks'] })
      }, 3000)
    }
  }, [exportTasks, isPageVisible, queryClient])

  useEffect(() => {
    scheduleTaskPolling()
    return () => {
      if (taskPollingRef.current) clearTimeout(taskPollingRef.current)
    }
  }, [scheduleTaskPolling])

  const handleGenerateDownloadLink = useCallback(
    async (taskId: string) => {
      try {
        const response = await generateDatabaseExportDownloadLink(taskId)
        if (!response.downloadUrl) throw new Error('下载链接为空')
        window.open(response.downloadUrl, '_blank', 'noopener,noreferrer')
        message.success(
          '一次性下载链接已生成并开始下载；如需再次下载，请重新生成',
        )
        void queryClient.invalidateQueries({ queryKey: ['database-export-tasks'] })
      } catch (err) {
        showError(err, '生成下载链接失败')
      }
    },
    [queryClient, showError],
  )

  const handleExport = useCallback(() => {
    if (!canExport) {
      message.warning('暂无数据库导出权限')
      return
    }
    if (isCurrentUserTotpDisabled) {
      message.warning('当前账号未启用 2FA，禁止导出数据库备份')
      return
    }
    setPendingAction('export')
    setTotpModalOpen(true)
  }, [canExport, isCurrentUserTotpDisabled])

  const handleImportClick = useCallback(() => {
    if (!canImport) {
      message.warning('暂无数据库导入权限')
      return
    }
    if (isCurrentUserTotpDisabled) {
      message.warning('当前账号未启用 2FA，禁止导入数据库备份')
      return
    }
    setImportModalOpen(true)
  }, [canImport, isCurrentUserTotpDisabled])

  const submitImportRequest = useCallback(() => {
    if (!canImport) {
      message.warning('暂无数据库导入权限')
      return
    }
    if (isCurrentUserTotpDisabled) {
      message.warning('当前账号未启用 2FA，禁止导入数据库备份')
      return
    }
    const values = importForm.getFieldsValue()
    if (!values.databaseUsername?.trim()) {
      message.warning('请输入数据库用户名')
      return
    }
    if (!values.databasePassword) {
      message.warning('请输入数据库密码')
      return
    }
    if (!pendingImportFile) {
      message.warning('请选择备份文件')
      return
    }
    setPendingAction('import')
    setTotpModalOpen(true)
  }, [canImport, isCurrentUserTotpDisabled, importForm, pendingImportFile])

  const handleTotpSubmit = useCallback(
    async (totpCode: string) => {
      if (!pendingAction) return
      try {
        if (pendingAction === 'export') {
          setExportLoading(true)
          message.loading('正在提交数据库导出任务...', 0)
          await createDatabaseExportTask(totpCode)
          void queryClient.invalidateQueries({ queryKey: ['database-export-tasks'] })
          message.destroy()
          message.success('数据库导出任务已提交，完成后可在下方下载')
        } else if (pendingImportFile) {
          const values = importForm.getFieldsValue()
          setImportLoading(true)
          message.loading('正在导入数据库备份（含自动备份）...', 0)
          await importDatabaseBackup(
            pendingImportFile,
            totpCode,
            values.databaseUsername,
            values.databasePassword,
          )
          message.destroy()
          message.success('数据库导入成功')
          setImportModalOpen(false)
          importForm.resetFields()
          setPendingImportFile(null)
        }
        setTotpModalOpen(false)
        setPendingAction(null)
      } catch (err) {
        message.destroy()
        showError(err, pendingAction === 'export' ? '导出失败' : '导入失败')
        throw err
      } finally {
        setExportLoading(false)
        setImportLoading(false)
      }
    },
    [pendingAction, pendingImportFile, importForm, queryClient, showError],
  )

  return (
    <div className="page-stack">
      <DatabaseStatusOverview
        dbStatus={dbStatus}
        loading={() => { void statusLoading() }}
        onRefresh={() =>
          queryClient.invalidateQueries({ queryKey: ['database-status'] })
        }
      />

      <DatabaseBackupActionsCard
        canExport={canExport}
        canImport={canImport}
        exportLoading={exportLoading}
        importLoading={importLoading}
        totpDisabled={isCurrentUserTotpDisabled}
        onExport={handleExport}
        onImport={handleImportClick}
      />

      {canExport && (
        <DatabaseExportTasksCard
          tasks={exportTasks}
          loading={() => { void taskLoading() }}
          onRefresh={() =>
            queryClient.invalidateQueries({
              queryKey: ['database-export-tasks'],
            })
          }
          onGenerateDownloadLink={(taskId) => {
            void handleGenerateDownloadLink(taskId)
          }}
        />
      )}

      {importModalOpen ? (
        <DatabaseImportBackupModal
          open={importModalOpen}
          loading={importLoading}
          totpDisabled={isCurrentUserTotpDisabled}
          form={importForm}
          selectedFile={pendingImportFile}
          onSelectFile={setPendingImportFile}
          onSubmit={submitImportRequest}
          onCancel={() => {
            if (!importLoading) {
              setImportModalOpen(false)
              importForm.resetFields()
              setPendingImportFile(null)
            }
          }}
        />
      ) : null}

      {totpModalOpen ? (
        <TwoFactorConfirmModal
          open={totpModalOpen}
          onConfirm={handleTotpSubmit}
          onCancel={() => {
            if (!exportLoading && !importLoading) {
              setTotpModalOpen(false)
              setPendingAction(null)
            }
          }}
          title={
            pendingAction === 'import'
              ? '导入数据库备份'
              : '提交数据库导出任务'
          }
        />
      ) : null}
    </div>
  )
}
