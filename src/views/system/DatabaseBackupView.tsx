import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Card, Button, Table, Tag, Alert, Upload, Form, Input, Modal,
  Typography, Descriptions, message, Row, Col, Statistic, Skeleton,
} from 'antd'
import {
  DownloadOutlined, UploadOutlined, ReloadOutlined, DatabaseOutlined,
} from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getDatabaseStatus, listDatabaseExportTasks, createDatabaseExportTask,
  generateDatabaseExportDownloadLink, importDatabaseBackup,
  type DatabaseExportTask,
} from '@/api/database-admin'
import { usePermissionStore } from '@/stores/permissionStore'
import { useAuthStore } from '@/stores/authStore'
import { useRequestError } from '@/hooks/useRequestError'
import { TwoFactorConfirmModal } from '@/components/TwoFactorConfirmModal'

export function DatabaseBackupView() {
  const queryClient = useQueryClient()
  const { showError } = useRequestError()
  const permissionStore = usePermissionStore()
  const authStore = useAuthStore()

  const canExport = permissionStore.can('database', 'export')
  const canImport = permissionStore.can('database', 'update')
  const isCurrentUserTotpDisabled = authStore.user?.totpEnabled === false

  const [exportLoading, setExportLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [totpModalOpen, setTotpModalOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<'export' | 'import' | null>(null)
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
    enabled: canExport,
  })

  const isRunningTask = useCallback((status: string) => {
    return status === '排队中' || status === '执行中'
  }, [])

  const scheduleTaskPolling = useCallback(() => {
    if (taskPollingRef.current) clearTimeout(taskPollingRef.current)
    if (exportTasks.some((t) => isRunningTask(t.status))) {
      taskPollingRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['database-export-tasks'] })
      }, 3000)
    }
  }, [exportTasks, isRunningTask, queryClient])

  useEffect(() => {
    scheduleTaskPolling()
    return () => { if (taskPollingRef.current) clearTimeout(taskPollingRef.current) }
  }, [scheduleTaskPolling])

  const formatMemory = useCallback((bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB'
  }, [])

  const formatDateTime = useCallback((value?: string) => {
    if (!value) return '--'
    return value.replace('T', ' ').slice(0, 19)
  }, [])

  const formatTaskStatusColor = useCallback((status: string) => {
    if (status === '已完成') return 'success'
    if (status === '失败' || status === '已过期') return 'error'
    if (status === '执行中') return 'processing'
    return 'default'
  }, [])

  const handleGenerateDownloadLink = useCallback(async (taskId: string) => {
    try {
      const response = await generateDatabaseExportDownloadLink(taskId)
      if (!response.downloadUrl) throw new Error('下载链接为空')
      window.open(response.downloadUrl, '_blank', 'noopener,noreferrer')
      message.success('一次性下载链接已生成并开始下载；如需再次下载，请重新生成')
      queryClient.invalidateQueries({ queryKey: ['database-export-tasks'] })
    } catch (err) {
      showError(err, '生成下载链接失败')
    }
  }, [queryClient, showError])

  const handleExport = useCallback(() => {
    if (!canExport) { message.warning('暂无数据库导出权限'); return }
    if (isCurrentUserTotpDisabled) { message.warning('当前账号未启用 2FA，禁止导出数据库备份'); return }
    setPendingAction('export')
    setTotpModalOpen(true)
  }, [canExport, isCurrentUserTotpDisabled])

  const handleImportClick = useCallback(() => {
    if (!canImport) { message.warning('暂无数据库导入权限'); return }
    if (isCurrentUserTotpDisabled) { message.warning('当前账号未启用 2FA，禁止导入数据库备份'); return }
    setImportModalOpen(true)
  }, [canImport, isCurrentUserTotpDisabled])

  const submitImportRequest = useCallback(() => {
    if (!canImport) { message.warning('暂无数据库导入权限'); return }
    if (isCurrentUserTotpDisabled) { message.warning('当前账号未启用 2FA，禁止导入数据库备份'); return }
    const values = importForm.getFieldsValue()
    if (!values.databaseUsername?.trim()) { message.warning('请输入数据库用户名'); return }
    if (!values.databasePassword) { message.warning('请输入数据库密码'); return }
    if (!pendingImportFile) { message.warning('请选择备份文件'); return }
    setPendingAction('import')
    setTotpModalOpen(true)
  }, [canImport, isCurrentUserTotpDisabled, importForm, pendingImportFile])

  const handleTotpSubmit = useCallback(async (totpCode: string) => {
    if (!pendingAction) return
    try {
      if (pendingAction === 'export') {
        setExportLoading(true)
        message.loading('正在提交数据库导出任务...', 0)
        await createDatabaseExportTask(totpCode)
        queryClient.invalidateQueries({ queryKey: ['database-export-tasks'] })
        message.destroy()
        message.success('数据库导出任务已提交，完成后可在下方下载')
      } else if (pendingImportFile) {
        const values = importForm.getFieldsValue()
        setImportLoading(true)
        message.loading('正在导入数据库备份（含自动备份）...', 0)
        await importDatabaseBackup(pendingImportFile, totpCode, values.databaseUsername, values.databasePassword)
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
  }, [pendingAction, pendingImportFile, importForm, queryClient, showError])

  const taskColumns = [
    { dataIndex: 'taskNo', title: '任务编号', width: 220 },
    {
      dataIndex: 'status', title: '状态', width: 110, align: 'center' as const,
      render: (v: string) => <Tag color={formatTaskStatusColor(v)}>{v}</Tag>,
    },
    { dataIndex: 'fileName', title: '备份文件', width: 220, render: (v: string) => v || '--' },
    { dataIndex: 'fileSize', title: '大小', width: 120, align: 'right' as const, render: (v: number) => v ? formatMemory(v) : '--' },
    { dataIndex: 'createdAt', title: '提交时间', width: 180, render: (v: string) => formatDateTime(v) },
    { dataIndex: 'expiresAt', title: '文件保留至', width: 180, render: (v: string) => formatDateTime(v) },
    { dataIndex: 'failureReason', title: '结果说明', width: 260, render: (v: string, record: DatabaseExportTask) => v || (record.status === '已完成' ? '导出完成，可下载' : '--') },
    {
      title: '操作', key: 'action', width: 120, fixed: 'right' as const,
      render: (_: unknown, record: DatabaseExportTask) => (
        record.status === '已完成' ? (
          <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleGenerateDownloadLink(record.id)}>生成链接</Button>
        ) : null
      ),
    },
  ]

  return (
    <div className="page-stack">
      <div style={{ background: '#fff', borderRadius: 8, padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <Typography.Title level={5} style={{ margin: 0 }}>数据库状态</Typography.Title>
          <Button size="small" loading={statusLoading} icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ['database-status'] })}>刷新</Button>
        </div>

        {dbStatus ? (
          <Row gutter={20}>
            <Col span={12}>
              <Card size="small" style={{ background: '#fafafa' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #1890ff, #096dd9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff' }}>
                    <DatabaseOutlined />
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>PostgreSQL</div>
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>{dbStatus.postgres.version}</div>
                  </div>
                  <Tag color={dbStatus.postgres.status === '正常' ? 'green' : 'red'} style={{ marginLeft: 'auto' }}>{dbStatus.postgres.status}</Tag>
                </div>
                <Row gutter={16} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #f0f0f0' }}>
                  <Col span={8}><Statistic title="数据库大小" value={dbStatus.postgres.databaseSize} valueStyle={{ fontSize: 20 }} /></Col>
                  <Col span={8}><Statistic title="表数量" value={dbStatus.postgres.tableCount} valueStyle={{ fontSize: 20 }} /></Col>
                  <Col span={8}><Statistic title="活跃连接" value={`${dbStatus.postgres.activeConnections}/${dbStatus.postgres.maxConnections}`} valueStyle={{ fontSize: 20 }} /></Col>
                </Row>
                <Descriptions size="small" column={1}>
                  <Descriptions.Item label="地址">{dbStatus.postgres.host}:{dbStatus.postgres.port}</Descriptions.Item>
                  <Descriptions.Item label="数据库">{dbStatus.postgres.database}</Descriptions.Item>
                  {dbStatus.postgres.serverStartTime && <Descriptions.Item label="启动时间">{formatDateTime(dbStatus.postgres.serverStartTime)}</Descriptions.Item>}
                </Descriptions>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" style={{ background: '#fafafa' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #ff4d4f, #cf1322)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff' }}>
                    <DatabaseOutlined />
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>Redis</div>
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>{dbStatus.redis.version}</div>
                  </div>
                  <Tag color={dbStatus.redis.status === '正常' ? 'green' : 'red'} style={{ marginLeft: 'auto' }}>{dbStatus.redis.status}</Tag>
                </div>
                <Row gutter={16} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #f0f0f0' }}>
                  <Col span={8}><Statistic title="内存占用" value={formatMemory(dbStatus.redis.usedMemory)} valueStyle={{ fontSize: 20 }} /></Col>
                  <Col span={8}><Statistic title="键数量" value={dbStatus.redis.totalKeys} valueStyle={{ fontSize: 20 }} /></Col>
                  <Col span={8}><Statistic title="命中率" value={`${dbStatus.redis.hitRate}%`} valueStyle={{ fontSize: 20 }} /></Col>
                </Row>
                <Descriptions size="small" column={1}>
                  <Descriptions.Item label="地址">{dbStatus.redis.host}:{dbStatus.redis.port}</Descriptions.Item>
                  <Descriptions.Item label="运行时间">{dbStatus.redis.uptime}</Descriptions.Item>
                  <Descriptions.Item label="客户端">{dbStatus.redis.connectedClients} 个连接</Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
          </Row>
        ) : (
          <Skeleton active />
        )}
      </div>

      <Card style={{ marginBottom: 16 }}>
        {isCurrentUserTotpDisabled && (
          <Alert type="warning" showIcon style={{ marginBottom: 16 }} message="当前账号未启用 2FA，数据库导出和导入已禁止。请先完成 2FA 绑定。" />
        )}
        <Alert type="info" showIcon style={{ marginBottom: 24 }} message="数据库备份管理" description="导出已改为后台任务，完成后提供 7 天有效下载链接；导入恢复需填写数据库用户名和密码，导入前会自动创建一份当前数据库的备份。" />
        <Row gutter={20}>
          <Col span={12}>
            <Card hoverable>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <DownloadOutlined style={{ fontSize: 48, color: '#1890ff' }} />
              </div>
              <Typography.Title level={5} style={{ textAlign: 'center' }}>后台导出</Typography.Title>
              <Typography.Paragraph type="secondary" style={{ textAlign: 'center' }}>将当前数据库导出为 SQL 备份文件，完成后提供下载链接</Typography.Paragraph>
              {canExport && (
                <Button type="primary" loading={exportLoading} disabled={isCurrentUserTotpDisabled} size="large" block onClick={handleExport}>提交导出</Button>
              )}
            </Card>
          </Col>
          <Col span={12}>
            <Card hoverable>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <UploadOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />
              </div>
              <Typography.Title level={5} style={{ textAlign: 'center' }}>导入恢复</Typography.Title>
              <Typography.Paragraph type="secondary" style={{ textAlign: 'center' }}>从 SQL 备份文件恢复数据库（自动备份前置）</Typography.Paragraph>
              {canImport && (
                <Button type="primary" danger loading={importLoading} disabled={isCurrentUserTotpDisabled} size="large" block onClick={handleImportClick}>导入备份</Button>
              )}
            </Card>
          </Col>
        </Row>
      </Card>

      {canExport && (
        <Card
          title="导出任务"
          extra={<Button size="small" loading={taskLoading} icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ['database-export-tasks'] })}>刷新任务</Button>}
        >
          <Typography.Paragraph type="secondary">最近 20 条后台导出记录，成功后可在有效期内直接下载。</Typography.Paragraph>
          <Table
            rowKey="id"
            columns={taskColumns}
            dataSource={exportTasks}
            loading={taskLoading}
            size="small"
            scroll={{ x: 1100 }}
            pagination={false}
          />
        </Card>
      )}

      <Modal
        title="导入数据库备份"
        open={importModalOpen}
        onCancel={() => { if (!importLoading) { setImportModalOpen(false); importForm.resetFields(); setPendingImportFile(null) } }}
        onOk={submitImportRequest}
        confirmLoading={importLoading}
        okText="验证并导入"
        cancelText="取消"
        width={480}
        destroyOnClose
      >
        <Alert type="warning" showIcon style={{ marginBottom: 16 }} message="导入前会自动备份当前数据库" description="请选择 .sql 格式的备份文件，并填写当前 PostgreSQL 账号密码。导入操作会覆盖当前数据，请谨慎操作。" />
        <Form form={importForm} layout="vertical">
          <Form.Item name="databaseUsername" label="数据库用户名" required>
            <Input disabled={importLoading || isCurrentUserTotpDisabled} placeholder="输入 PostgreSQL 用户名" />
          </Form.Item>
          <Form.Item name="databasePassword" label="数据库密码" required>
            <Input.Password disabled={importLoading || isCurrentUserTotpDisabled} placeholder="输入 PostgreSQL 密码" />
          </Form.Item>
          <Form.Item label="备份文件" required>
            <Upload beforeUpload={(file) => { setPendingImportFile(file); return false }} showUploadList={false} accept=".sql">
              <Button loading={importLoading} disabled={isCurrentUserTotpDisabled} type="primary" danger>选择备份文件</Button>
            </Upload>
            <div style={{ marginTop: 8, color: 'rgba(0,0,0,0.45)' }}>{pendingImportFile?.name || '未选择文件'}</div>
          </Form.Item>
        </Form>
      </Modal>

      <TwoFactorConfirmModal
        open={totpModalOpen}
        onConfirm={handleTotpSubmit}
        onCancel={() => { if (!exportLoading && !importLoading) { setTotpModalOpen(false); setPendingAction(null) } }}
        title={pendingAction === 'import' ? '导入数据库备份' : '提交数据库导出任务'}
      />
    </div>
  )
}
