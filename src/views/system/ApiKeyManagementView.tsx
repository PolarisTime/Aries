import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Card, Button, Table, Tag, Modal, Form, Input, Select, Space,
  InputNumber, Typography, Alert, message,
} from 'antd'
import {
  PlusOutlined, ReloadOutlined, EyeOutlined, StopOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listApiKeys, listApiKeyUserOptions, listApiKeyResourceOptions,
  listApiKeyActionOptions, createApiKey, revokeApiKey,
  type ApiKeyRecord, type ApiKeyUserOption,
} from '@/api/api-keys'
import { usePermissionStore } from '@/stores/permissionStore'
import { useAuthStore } from '@/stores/authStore'
import { useRequestError } from '@/hooks/useRequestError'
import { TwoFactorConfirmModal } from '@/components/TwoFactorConfirmModal'

export function ApiKeyManagementView() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showError } = useRequestError()
  const permissionStore = usePermissionStore()
  const authStore = useAuthStore()

  const canCreate = useMemo(() => permissionStore.can('api-key', 'create'), [permissionStore])
  const canEdit = useMemo(() => permissionStore.can('api-key', 'update'), [permissionStore])
  const isCurrentUserTotpDisabled = useMemo(() => authStore.user?.totpEnabled === false, [authStore])

  const [keyword, setKeyword] = useState('')
  const [filterUserId, setFilterUserId] = useState<string | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [usageScopeFilter, setUsageScopeFilter] = useState<string | undefined>(undefined)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const [generateModalOpen, setGenerateModalOpen] = useState(false)
  const [generating] = useState(false)
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [form] = Form.useForm()

  const [totpModalOpen, setTotpModalOpen] = useState(false)
  const [, setTotpLoading] = useState(false)

  const { data: keysData, isLoading } = useQuery({
    queryKey: ['api-keys', currentPage, pageSize, keyword, filterUserId, statusFilter, usageScopeFilter],
    queryFn: async () => {
      return listApiKeys({
        page: currentPage - 1,
        size: pageSize,
        keyword: keyword.trim() || undefined,
        userId: filterUserId,
        status: statusFilter || undefined,
        usageScope: usageScopeFilter || undefined,
      })
    },
  })

  const keys = useMemo(() => keysData?.records || [], [keysData])
  const totalElements = useMemo(() => Number(keysData?.totalElements) || 0, [keysData])

  const { data: userOptions = [] } = useQuery({
    queryKey: ['api-key-user-options'],
    queryFn: () => listApiKeyUserOptions(),
  })

  const { data: resourceOptions = [] } = useQuery({
    queryKey: ['api-key-resource-options'],
    queryFn: listApiKeyResourceOptions,
  })

  const { data: actionOptions = [] } = useQuery({
    queryKey: ['api-key-action-options'],
    queryFn: listApiKeyActionOptions,
  })

  const revokeMutation = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => {
      message.success('已禁用')
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: (err: Error) => showError(err, '禁用失败'),
  })

  const getStatusColor = useCallback((status: string) => {
    if (status === '有效') return 'green'
    if (status === '已过期') return 'orange'
    if (status === '已禁用') return 'red'
    return 'default'
  }, [])

  const getUserDisplayName = useCallback((user: Pick<ApiKeyUserOption, 'userName' | 'loginName'>) => {
    return user.userName ? `${user.userName}（${user.loginName}）` : user.loginName
  }, [])

  const getAllowedResourceText = useCallback((allowedResources: string[]) => {
    if (!allowedResources?.length) return '未限制'
    const titleByCode = new Map(resourceOptions.map((item) => [item.code, item.title]))
    return allowedResources.map((item) => titleByCode.get(item) || item).join('、')
  }, [resourceOptions])

  const getAllowedActionText = useCallback((allowedActions: string[]) => {
    if (!allowedActions?.length) return '未设置'
    const titleByCode = new Map(actionOptions.map((item) => [item.code, item.title]))
    return allowedActions.map((item) => titleByCode.get(item) || item).join('、')
  }, [actionOptions])

  const openGenerateModal = useCallback(() => {
    if (!canCreate) { message.warning('暂无 API Key 创建权限'); return }
    if (isCurrentUserTotpDisabled) { message.warning('当前账号未启用 2FA，禁止生成 API Key'); return }
    setGeneratedKey(null)
    form.resetFields()
    form.setFieldsValue({
      usageScope: '全部接口',
      allowedActions: actionOptions.map((item) => item.code),
    })
    setGenerateModalOpen(true)
  }, [canCreate, isCurrentUserTotpDisabled, form, actionOptions])

  const handleGenerate = useCallback(async () => {
    try {
      const values = await form.validateFields()
      if (!values.userId || !values.keyName?.trim() || !values.usageScope) {
        message.warning('请选择用户、使用范围并填写密钥名称')
        return
      }
      if (!values.allowedActions?.length) {
        message.warning('请至少选择一个允许动作')
        return
      }
      setTotpModalOpen(true)
    } catch { /* validation failed */ }
  }, [form])

  const handleGenerateWithTotp = useCallback(async (totpCode: string) => {
    const values = form.getFieldsValue()
    setTotpLoading(true)
    try {
      const response = await createApiKey(values.userId, {
        keyName: values.keyName.trim(),
        usageScope: values.usageScope,
        allowedResources: values.allowedResources || [],
        allowedActions: values.allowedActions || [],
        expireDays: values.expireDays ?? null,
      }, totpCode)
      setGeneratedKey(response.data?.rawKey || null)
      setTotpModalOpen(false)
      message.success(response.message || 'API Key 已生成')
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    } catch (err) {
      showError(err, '生成失败')
      throw err
    } finally {
      setTotpLoading(false)
    }
  }, [form, queryClient, showError])

  const handleRevoke = useCallback((record: ApiKeyRecord) => {
    if (!canEdit) { message.warning('暂无 API Key 管理权限'); return }
    Modal.confirm({
      title: '禁用 API Key',
      content: `确定禁用密钥「${record.keyName}」吗？禁用后使用该密钥的调用将失败。`,
      okText: '确认禁用', cancelText: '取消', okButtonProps: { danger: true },
      onOk: () => revokeMutation.mutateAsync(record.id),
    })
  }, [canEdit, revokeMutation])

  const columns = useMemo(() => [
    { dataIndex: 'keyName', title: '密钥名称', width: 180 },
    { dataIndex: 'usageScope', title: '使用范围', width: 130 },
    { dataIndex: 'allowedResources', title: '允许资源', width: 240, ellipsis: true, render: (v: string[]) => getAllowedResourceText(v) },
    { dataIndex: 'allowedActions', title: '允许动作', width: 180, ellipsis: true, render: (v: string[]) => getAllowedActionText(v) },
    {
      title: '所属用户', dataIndex: 'userName', width: 200,
      render: (_: string, record: ApiKeyRecord) => (
        <div>
          <div><strong>{record.userName || record.loginName}</strong></div>
          {record.userName && <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{record.loginName}</div>}
        </div>
      ),
    },
    { dataIndex: 'keyPrefix', title: '前缀', width: 110 },
    { dataIndex: 'createdAt', title: '创建时间', width: 180 },
    { dataIndex: 'expiresAt', title: '过期时间', width: 180, render: (v: string) => v || '永不过期' },
    { dataIndex: 'lastUsedAt', title: '最后使用', width: 180, render: (v: string) => v || '--' },
    {
      dataIndex: 'status', title: '状态', width: 110, align: 'center' as const,
      render: (v: string) => <Tag color={getStatusColor(v)}>{v}</Tag>,
    },
    {
      title: '操作', key: 'action', width: 150, fixed: 'right' as const,
      render: (_: unknown, record: ApiKeyRecord) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate({ to: `/api-key-management/${record.id}` as '/' })}>查看</Button>
          {canEdit && record.status === '有效' && (
            <Button type="link" size="small" danger icon={<StopOutlined />} onClick={() => handleRevoke(record)}>禁用</Button>
          )}
        </Space>
      ),
    },
  ], [getStatusColor, getAllowedResourceText, getAllowedActionText, canEdit, navigate, handleRevoke])

  return (
    <div className="page-stack">
      <Alert
        type="info" showIcon style={{ marginBottom: 16 }}
        message="API Key 使用说明"
        description={
          <div style={{ display: 'grid', gap: 4, lineHeight: 1.7 }}>
            <div>1. 生成后会返回完整密钥，仅显示一次，关闭弹窗后无法再次查看。</div>
            <div>2. 调用接口时请在请求头中传入 <code>X-API-Key</code>，值为完整 API Key。</div>
            <div>3. 使用范围说明：只读接口仅允许 GET / HEAD / OPTIONS，请求写接口会被拒绝。</div>
            <div>4. 业务接口仅允许访问业务数据接口，不允许访问系统管理类接口。</div>
            <div>5. 允许访问资源留空时，按使用范围放行；选择资源后，只允许访问白名单资源接口。</div>
            <div>6. 仅允许为已启用 2FA 的账号生成 API Key，且生成时需要验证当前操作人的 2FA。</div>
            <div>7. 建议按用途分开创建，例如订单同步、报表读取，便于后续排查和禁用。</div>
            <div>8. 禁用后立即失效，已过期或已禁用的密钥无法继续调用接口。</div>
          </div>
        }
      />

      {isCurrentUserTotpDisabled && (
        <Alert
          type="warning" showIcon style={{ marginBottom: 16 }}
          message="当前账号未启用 2FA，禁止生成 API Key。请先在用户管理中完成 2FA 绑定。"
        />
      )}

      <Card
        title="API Key 管理"
        extra={
          <Space>
            <Input.Search
              placeholder="搜索密钥名称 / 前缀"
              style={{ width: 280 }}
              allowClear
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onSearch={() => { setCurrentPage(1); queryClient.invalidateQueries({ queryKey: ['api-keys'] }) }}
            />
            <Select
              showSearch allowClear
              placeholder="筛选所属用户"
              style={{ width: 260 }}
              value={filterUserId}
              onChange={(v) => { setFilterUserId(v); setCurrentPage(1) }}
              options={userOptions.map((u) => ({ label: getUserDisplayName(u), value: u.id }))}
              filterOption={(input, option) => {
                const label = String(option?.label || '')
                return label.toLowerCase().includes(input.toLowerCase())
              }}
            />
            <Select
              allowClear placeholder="全部状态"
              style={{ width: 140 }}
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setCurrentPage(1) }}
              options={[
                { label: '有效', value: '有效' },
                { label: '已过期', value: '已过期' },
                { label: '已禁用', value: '已禁用' },
              ]}
            />
            <Select
              allowClear placeholder="全部范围"
              style={{ width: 150 }}
              value={usageScopeFilter}
              onChange={(v) => { setUsageScopeFilter(v); setCurrentPage(1) }}
              options={[
                { label: '全部接口', value: '全部接口' },
                { label: '只读接口', value: '只读接口' },
                { label: '业务接口', value: '业务接口' },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ['api-keys'] })}>刷新</Button>
            {canCreate && (
              <Button type="primary" icon={<PlusOutlined />} disabled={isCurrentUserTotpDisabled} onClick={openGenerateModal}>
                生成 API Key
              </Button>
            )}
          </Space>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={keys}
          loading={isLoading}
          size="middle"
          scroll={{ x: 1800 }}
          pagination={{
            current: currentPage,
            pageSize,
            total: totalElements,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, size) => { setCurrentPage(page); setPageSize(size) },
          }}
        />
      </Card>

      <Modal
        title="生成 API Key"
        open={generateModalOpen}
        onCancel={() => { setGenerateModalOpen(false); setGeneratedKey(null) }}
        footer={null}
        maskClosable={false}
      >
        {!generatedKey ? (
          <Form form={form} layout="vertical">
            <Form.Item name="userId" label="所属用户" required>
              <Select
                showSearch
                placeholder="搜索账号 / 用户姓名 / 手机号"
                options={userOptions.map((u) => ({
                  label: `${getUserDisplayName(u)}${u.mobile ? ` / ${u.mobile}` : ''}`,
                  value: u.id,
                }))}
                filterOption={(input, option) => {
                  const label = String(option?.label || '')
                  return label.toLowerCase().includes(input.toLowerCase())
                }}
              />
            </Form.Item>
            <Form.Item name="keyName" label="密钥名称" required>
              <Input placeholder="例如：订单同步密钥" maxLength={64} />
            </Form.Item>
            <Form.Item name="usageScope" label="使用范围" required>
              <Select
                options={[
                  { label: '全部接口', value: '全部接口' },
                  { label: '只读接口', value: '只读接口' },
                  { label: '业务接口', value: '业务接口' },
                ]}
              />
            </Form.Item>
            <Form.Item name="allowedResources" label="允许访问资源">
              <Select
                mode="multiple" allowClear
                placeholder="不选则按使用范围放行"
                maxTagCount={4}
                options={resourceOptions.map((item) => ({
                  label: `${item.group} / ${item.title}`,
                  value: item.code,
                }))}
              />
            </Form.Item>
            <Form.Item name="allowedActions" label="允许动作" required>
              <Select
                mode="multiple"
                placeholder="请选择允许动作"
                maxTagCount={5}
                options={actionOptions.map((item) => ({ label: item.title, value: item.code }))}
              />
            </Form.Item>
            <Form.Item name="expireDays" label="有效期（天）">
              <InputNumber placeholder="留空则永不过期" style={{ width: '100%' }} min={1} max={3650} />
            </Form.Item>
            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={() => { setGenerateModalOpen(false); setGeneratedKey(null) }}>取消</Button>
                <Button type="primary" loading={generating} disabled={isCurrentUserTotpDisabled} onClick={handleGenerate}>生成</Button>
              </Space>
            </div>
          </Form>
        ) : (
          <>
            <Alert type="warning" showIcon style={{ marginBottom: 16 }} message="请立即复制保存，此密钥仅显示一次" />
            <div style={{ background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: 6, padding: 16 }}>
              <Typography.Paragraph copyable code style={{ margin: 0, wordBreak: 'break-all' }}>
                {generatedKey}
              </Typography.Paragraph>
            </div>
            <div style={{ textAlign: 'right', marginTop: 16 }}>
              <Button type="primary" onClick={() => { setGenerateModalOpen(false); setGeneratedKey(null) }}>关闭</Button>
            </div>
          </>
        )}
      </Modal>

      <TwoFactorConfirmModal
        open={totpModalOpen}
        onConfirm={handleGenerateWithTotp}
        onCancel={() => setTotpModalOpen(false)}
        title="验证 2FA 后生成 API Key"
      />
    </div>
  )
}
