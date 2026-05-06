import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Card, Button, Table, Tag, Modal, Form, Input, Select, Space,
  Descriptions, Typography, Row, Col, Spin, message, QRCode,
} from 'antd'
import {
  PlusOutlined, ReloadOutlined, DeleteOutlined, EditOutlined,
  EyeOutlined, SafetyCertificateOutlined, CopyOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listUserAccounts, getUserAccountDetail, createUserAccount,
  updateUserAccount, deleteUserAccount, checkUserAccountLoginName,
  setupUserAccount2fa, enableUserAccount2fa, disableUserAccount2fa,
  listRoleOptions, listDepartmentOptions, type UserAccountListParams,
} from '@/api/user-accounts'
import { usePermissionStore } from '@/stores/permissionStore'
import { useAuthStore } from '@/stores/authStore'
import { useRequestError } from '@/hooks/useRequestError'
import {
  enabledStatusOptions, enabledStatusValues, userAccountDataScopeValues,
} from '@/constants/module-options'
import { setStoredUser } from '@/utils/storage'
import type { TotpSetupResponse } from '@/types/auth'
import type {
  UserAccountRecord, UserAccountFormPayload, UserAccountCreateResult,
} from '@/types/user-account'

type EditorMode = 'create' | 'edit'

export function UserAccountManagementView() {
  const queryClient = useQueryClient()
  const { showError } = useRequestError()
  const permissionStore = usePermissionStore()
  const authStore = useAuthStore()

  const canCreate = useMemo(() => permissionStore.can('user-account', 'create'), [permissionStore])
  const canEdit = useMemo(() => permissionStore.can('user-account', 'update'), [permissionStore])
  const canDelete = useMemo(() => permissionStore.can('user-account', 'delete'), [permissionStore])
  const canViewRoleCatalog = useMemo(() => permissionStore.can('role', 'read'), [permissionStore])
  const canViewDepartmentCatalog = useMemo(() => permissionStore.can('department', 'read'), [permissionStore])

  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<EditorMode>('create')
  const [editorLoading, setEditorLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  const [loginNameValidationMessage, setLoginNameValidationMessage] = useState('')
  const [loginNameChecking, setLoginNameChecking] = useState(false)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailRecord, setDetailRecord] = useState<UserAccountRecord | null>(null)

  const [createResultOpen, setCreateResultOpen] = useState(false)
  const [createResult, setCreateResult] = useState<UserAccountCreateResult | null>(null)

  const [twoFaOpen, setTwoFaOpen] = useState(false)
  const [twoFaLoading, setTwoFaLoading] = useState(false)
  const [twoFaRecord, setTwoFaRecord] = useState<UserAccountRecord | null>(null)
  const [twoFaSetup, setTwoFaSetup] = useState<TotpSetupResponse | null>(null)
  const [twoFaCode, setTwoFaCode] = useState('')
  const [twoFaSetupLoading, setTwoFaSetupLoading] = useState(false)
  const [twoFaEnableLoading, setTwoFaEnableLoading] = useState(false)
  const [twoFaDisableLoading, setTwoFaDisableLoading] = useState(false)

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['user-accounts', currentPage, pageSize, keyword, statusFilter],
    queryFn: async () => {
      const params: UserAccountListParams = {
        page: currentPage - 1,
        size: pageSize,
        keyword: keyword.trim() || undefined,
        status: statusFilter || undefined,
      }
      return listUserAccounts(params)
    },
  })

  const users = useMemo(() => usersData?.records || [], [usersData])
  const totalElements = useMemo(() => Number(usersData?.totalElements) || 0, [usersData])

  const { data: roleOptions = [] } = useQuery({
    queryKey: ['role-options'],
    queryFn: listRoleOptions,
    enabled: canViewRoleCatalog,
  })

  const { data: departmentOptions = [] } = useQuery({
    queryKey: ['department-options'],
    queryFn: listDepartmentOptions,
    enabled: canViewDepartmentCatalog,
  })

  const saveMutation = useMutation({
    mutationFn: async (values: UserAccountFormPayload) => {
      if (editorMode === 'create') {
        return createUserAccount(values)
      }
      return updateUserAccount(editingId!, values)
    },
    onSuccess: (response) => {
      if (editorMode === 'create' && response.data) {
        setCreateResult(response.data as UserAccountCreateResult)
        setCreateResultOpen(true)
      } else {
        message.success((response as { message?: string }).message || '保存成功')
      }
      setEditorOpen(false)
      queryClient.invalidateQueries({ queryKey: ['user-accounts'] })
    },
    onError: (err: Error) => {
      if (err.message.includes('登录账号已存在')) {
        setLoginNameValidationMessage('登录账号已存在')
        return
      }
      showError(err, '保存失败')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUserAccount,
    onSuccess: () => {
      message.success('删除成功')
      queryClient.invalidateQueries({ queryKey: ['user-accounts'] })
    },
    onError: (err: Error) => showError(err, '删除失败'),
  })

  const getStatusColor = useCallback((value: string) => {
    return value === enabledStatusValues[0] ? 'green' : 'red'
  }, [])

  const getTotpColor = useCallback((enabled: boolean) => {
    return enabled ? 'processing' : 'default'
  }, [])

  const normalizeDataScopeLabel = useCallback((value: string | null | undefined) => {
    const normalized = String(value || '').trim()
    if (normalized === '全部数据' || normalized === '全部') return '全部数据'
    if (normalized === '本部门') return '本部门'
    return '本人'
  }, [])

  const dataScopeRank = useCallback((value: string) => {
    switch (normalizeDataScopeLabel(value)) {
      case '全部数据': return 3
      case '本部门': return 2
      default: return 1
    }
  }, [normalizeDataScopeLabel])

  const selectedRoleNames = Form.useWatch('roleNames', form) || []

  const selectedRoleDataScope = useMemo(() => {
    const selectedRoles = roleOptions.filter((r) => selectedRoleNames.includes(r.roleName))
    if (!selectedRoles.length) {
      return selectedRoleNames.length ? normalizeDataScopeLabel(form.getFieldValue('dataScope')) : '本人'
    }
    return selectedRoles
      .map((r) => normalizeDataScopeLabel(r.dataScope))
      .reduce((eff, cur) => (dataScopeRank(cur) > dataScopeRank(eff) ? cur : eff), '本人')
  }, [selectedRoleNames, roleOptions, normalizeDataScopeLabel, dataScopeRank, form])

  const selectedRoleSummaries = useMemo(() => {
    return roleOptions
      .filter((r) => selectedRoleNames.includes(r.roleName))
      .map((r) => r.permissionSummary)
      .filter((s): s is string => Boolean(s?.trim()))
      .filter((s, i, arr) => arr.indexOf(s) === i)
  }, [selectedRoleNames, roleOptions])

  useEffect(() => {
    form.setFieldValue('dataScope', selectedRoleDataScope)
  }, [selectedRoleDataScope, form])

  useEffect(() => {
    form.setFieldValue('permissionSummary', selectedRoleSummaries.join('；'))
  }, [selectedRoleSummaries, form])

  const syncCurrentUserTotpState = useCallback((record: UserAccountRecord | null) => {
    if (!record || !authStore.user) return
    if (String(authStore.user.id) !== String(record.id)) return
    const nextUser = { ...authStore.user, totpEnabled: record.totpEnabled }
    useAuthStore.setState({ user: nextUser })
    setStoredUser(nextUser)
  }, [authStore])

  const resetEditorForm = useCallback(() => {
    setEditingId(null)
    form.resetFields()
    form.setFieldsValue({
      loginName: '', password: '', userName: '', mobile: '',
      departmentId: null, roleNames: [], dataScope: userAccountDataScopeValues[0],
      permissionSummary: '', status: enabledStatusValues[0], remark: '',
    })
    setLoginNameValidationMessage('')
    setLoginNameChecking(false)
  }, [form])

  const fillEditorForm = useCallback((record: UserAccountRecord) => {
    setEditingId(record.id)
    form.setFieldsValue({
      loginName: record.loginName || '',
      password: '',
      userName: record.userName || '',
      mobile: record.mobile || '',
      departmentId: record.departmentId ?? null,
      roleNames: [...(record.roleNames || [])],
      dataScope: record.dataScope || userAccountDataScopeValues[0],
      permissionSummary: record.permissionSummary || '',
      status: record.status || enabledStatusValues[0],
      remark: record.remark || '',
    })
    setLoginNameValidationMessage('')
    setLoginNameChecking(false)
  }, [form])

  const runLoginNameCheck = useCallback(async (loginName: string, excludeUserId?: string | number) => {
    if (!loginName.trim()) {
      setLoginNameValidationMessage('')
      return true
    }
    setLoginNameChecking(true)
    try {
      const result = await checkUserAccountLoginName(loginName, excludeUserId)
      setLoginNameValidationMessage(result.available ? '' : (result.message || '登录账号已存在'))
      return result.available
    } catch (err) {
      showError(err, '检查登录账号失败')
      return true
    } finally {
      setLoginNameChecking(false)
    }
  }, [showError])

  const openCreateModal = useCallback(() => {
    setEditorMode('create')
    resetEditorForm()
    setEditorOpen(true)
  }, [resetEditorForm])

  const openEditModal = useCallback(async (record: UserAccountRecord) => {
    setEditorMode('edit')
    setEditorOpen(true)
    setEditorLoading(true)
    try {
      const detail = await getUserAccountDetail(record.id)
      fillEditorForm(detail)
    } catch (err) {
      showError(err, '加载用户详情失败')
      setEditorOpen(false)
    } finally {
      setEditorLoading(false)
    }
  }, [fillEditorForm, showError])

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields()
      const available = await runLoginNameCheck(values.loginName, editorMode === 'edit' ? (editingId ?? undefined) : undefined)
      if (!available) {
        message.warning(loginNameValidationMessage || '登录账号已存在')
        return
      }
      const payload: UserAccountFormPayload = {
        loginName: values.loginName.trim(),
        ...(editorMode === 'create' && values.password?.trim() ? { password: values.password.trim() } : {}),
        userName: values.userName.trim(),
        mobile: values.mobile?.trim() || '',
        departmentId: values.departmentId ?? null,
        roleNames: [...(values.roleNames || [])],
        dataScope: selectedRoleDataScope,
        permissionSummary: values.permissionSummary?.trim() || '',
        status: values.status,
        remark: values.remark?.trim() || '',
      }
      saveMutation.mutate(payload)
    } catch {
      // validation failed
    }
  }, [form, runLoginNameCheck, editorMode, editingId, loginNameValidationMessage, selectedRoleDataScope, saveMutation])

  const openDetailModal = useCallback(async (record: UserAccountRecord) => {
    setDetailOpen(true)
    setDetailLoading(true)
    try {
      setDetailRecord(await getUserAccountDetail(record.id))
    } catch (err) {
      showError(err, '加载详情失败')
      setDetailOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }, [showError])

  const handleDelete = useCallback((record: UserAccountRecord) => {
    Modal.confirm({
      title: '删除用户账户',
      content: `确定删除账号「${record.loginName}」吗？删除后该用户将无法继续登录。`,
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutateAsync(record.id),
    })
  }, [deleteMutation])

  const open2faModal = useCallback(async (record: UserAccountRecord) => {
    setTwoFaOpen(true)
    setTwoFaLoading(true)
    setTwoFaSetup(null)
    setTwoFaCode('')
    try {
      setTwoFaRecord(await getUserAccountDetail(record.id))
    } catch (err) {
      showError(err, '加载 2FA 信息失败')
      setTwoFaOpen(false)
    } finally {
      setTwoFaLoading(false)
    }
  }, [showError])

  const handleGenerate2fa = useCallback(async () => {
    if (!twoFaRecord) return
    setTwoFaSetupLoading(true)
    try {
      const response = await setupUserAccount2fa(twoFaRecord.id)
      setTwoFaSetup(response.data)
      setTwoFaCode('')
      message.success(response.message || '二维码生成成功')
    } catch (err) {
      showError(err, '二维码生成失败')
    } finally {
      setTwoFaSetupLoading(false)
    }
  }, [twoFaRecord, showError])

  const handleEnable2fa = useCallback(async () => {
    if (!twoFaRecord) return
    if (!/^\d{6}$/.test(twoFaCode.trim())) {
      message.warning('请输入 6 位动态验证码')
      return
    }
    setTwoFaEnableLoading(true)
    try {
      const response = await enableUserAccount2fa(twoFaRecord.id, twoFaCode.trim())
      setTwoFaRecord(response.data)
      syncCurrentUserTotpState(response.data)
      setTwoFaSetup(null)
      setTwoFaCode('')
      message.success(response.message || '2FA 已启用')
      setTwoFaOpen(false)
      queryClient.invalidateQueries({ queryKey: ['user-accounts'] })
    } catch (err) {
      showError(err, '启用 2FA 失败')
    } finally {
      setTwoFaEnableLoading(false)
    }
  }, [twoFaRecord, twoFaCode, syncCurrentUserTotpState, queryClient, showError])

  const handleDisable2fa = useCallback(async () => {
    if (!twoFaRecord) return
    Modal.confirm({
      title: '关闭二次验证',
      content: `确定关闭用户「${twoFaRecord.loginName}」的 2FA 吗？`,
      okText: '确认关闭',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        setTwoFaDisableLoading(true)
        try {
          const response = await disableUserAccount2fa(twoFaRecord.id)
          setTwoFaRecord(response.data)
          syncCurrentUserTotpState(response.data)
          setTwoFaSetup(null)
          setTwoFaCode('')
          message.success(response.message || '2FA 已关闭')
          setTwoFaOpen(false)
          queryClient.invalidateQueries({ queryKey: ['user-accounts'] })
        } catch (err) {
          showError(err, '关闭 2FA 失败')
        } finally {
          setTwoFaDisableLoading(false)
        }
      },
    })
  }, [twoFaRecord, syncCurrentUserTotpState, queryClient, showError])

  const copyText = useCallback(async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      message.success(`${label}已复制`)
    } catch {
      message.error(`${label}复制失败`)
    }
  }, [])

  const columns = useMemo(() => [
    { dataIndex: 'loginName', title: '登录账号', width: 140 },
    { dataIndex: 'userName', title: '用户姓名', width: 140 },
    { dataIndex: 'departmentName', title: '所属部门', width: 140, render: (v: string) => v || '--' },
    { dataIndex: 'mobile', title: '手机号', width: 140, render: (v: string) => v || '--' },
    {
      dataIndex: 'roleNames', title: '所属角色', width: 220,
      render: (names: string[]) => Array.isArray(names) ? names.join('、') : '--',
    },
    { dataIndex: 'dataScope', title: '数据范围', width: 120, render: (v: string) => v || '--' },
    {
      dataIndex: 'totpEnabled', title: '2FA 状态', width: 110, align: 'center' as const,
      render: (v: boolean) => (
        <Tag color={getTotpColor(!!v)}>{v ? '已启用' : '未启用'}</Tag>
      ),
    },
    {
      dataIndex: 'status', title: '状态', width: 100, align: 'center' as const,
      render: (v: string) => <Tag color={getStatusColor(v)}>{v}</Tag>,
    },
    { dataIndex: 'lastLoginDate', title: '最近登录', width: 180, render: (v: string) => v || '--' },
    {
      title: '操作', key: 'action', width: 260, fixed: 'right' as const,
      render: (_: unknown, record: UserAccountRecord) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetailModal(record)}>查看</Button>
          {canEdit && <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>编辑</Button>}
          {canEdit && <Button type="link" size="small" icon={<SafetyCertificateOutlined />} onClick={() => open2faModal(record)}>2FA</Button>}
          {canDelete && record.loginName !== 'admin' && (
            <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>删除</Button>
          )}
        </Space>
      ),
    },
  ], [getStatusColor, getTotpColor, canEdit, canDelete, openDetailModal, openEditModal, open2faModal, handleDelete])

  const editorTitle = editorMode === 'create' ? '新增用户账户' : '编辑用户账户'

  return (
    <div className="page-stack">
      <Card
        title="用户账户管理"
        extra={
          <Space>
            <Input.Search
              placeholder="搜索登录账号 / 用户姓名 / 手机号"
              style={{ width: 320 }}
              allowClear
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onSearch={() => { setCurrentPage(1); queryClient.invalidateQueries({ queryKey: ['user-accounts'] }) }}
            />
            <Select
              allowClear
              placeholder="全部状态"
              style={{ width: 140 }}
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setCurrentPage(1) }}
              options={enabledStatusOptions}
            />
            <Button icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ['user-accounts'] })}>刷新</Button>
            {canCreate && <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>新建</Button>}
          </Space>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={users}
          loading={isLoading}
          size="middle"
          scroll={{ x: 1400 }}
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
        title={editorTitle}
        open={editorOpen}
        onCancel={() => setEditorOpen(false)}
        onOk={handleSave}
        confirmLoading={saveMutation.isPending}
        width={760}
        maskClosable={false}
      >
        <Spin spinning={editorLoading}>
          <Form form={form} layout="vertical" className="user-account-form">
            <div className="form-section">
              <div className="form-section-title">账户信息</div>
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item
                    name="loginName"
                    label="登录账号"
                    required
                    hasFeedback
                    validateStatus={loginNameChecking ? 'validating' : loginNameValidationMessage ? 'error' : undefined}
                    help={loginNameChecking ? '正在检查登录账号...' : loginNameValidationMessage || undefined}
                  >
                    <Input
                      placeholder="请输入登录账号"
                      maxLength={64}
                      onBlur={() => {
                        const loginName = form.getFieldValue('loginName')
                        if (loginName?.trim()) runLoginNameCheck(loginName, editorMode === 'edit' ? (editingId ?? undefined) : undefined)
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="userName" label="用户姓名" required>
                    <Input placeholder="请输入用户姓名" maxLength={64} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item name="mobile" label="手机号">
                    <Input placeholder="请输入手机号" maxLength={32} />
                  </Form.Item>
                </Col>
                {editorMode === 'create' ? (
                  <Col span={12}>
                    <Form.Item name="password" label="初始密码" extra="留空时系统会自动生成 8 位随机密码。">
                      <Input.Password placeholder="请输入初始密码" maxLength={128} />
                    </Form.Item>
                  </Col>
                ) : (
                  <Col span={12}>
                    <Form.Item name="status" label="状态">
                      <Select placeholder="请选择状态" options={enabledStatusOptions} />
                    </Form.Item>
                  </Col>
                )}
              </Row>
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item name="departmentId" label="所属部门" required>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      placeholder="请选择部门"
                      options={departmentOptions.map((d) => ({ label: d.departmentName, value: d.id }))}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <div className="form-section">
              <div className="form-section-title">权限配置</div>
              <Row gutter={24}>
                <Col span={editorMode === 'create' ? 16 : 14}>
                  <Form.Item name="roleNames" label="所属角色" required>
                    <Select
                      mode="multiple"
                      placeholder="请选择角色"
                      maxTagCount={5}
                      options={roleOptions.map((r) => ({
                        label: r.roleName,
                        value: r.roleName,
                        disabled: r.status === enabledStatusValues[1] && !selectedRoleNames.includes(r.roleName),
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={editorMode === 'create' ? 8 : 5}>
                  <Form.Item label="角色数据范围">
                    <Input value={selectedRoleDataScope} disabled />
                  </Form.Item>
                </Col>
                {editorMode === 'create' && (
                  <Col span={8}>
                    <Form.Item name="status" label="状态">
                      <Select placeholder="请选择状态" options={enabledStatusOptions} />
                    </Form.Item>
                  </Col>
                )}
              </Row>
              <Form.Item name="permissionSummary" label="权限摘要">
                {selectedRoleSummaries.length > 0 ? (
                  <Space wrap>
                    {selectedRoleSummaries.map((s, i) => <Tag key={i} color="blue">{s}</Tag>)}
                  </Space>
                ) : (
                  <Typography.Text type="secondary">选择角色后自动汇总</Typography.Text>
                )}
              </Form.Item>
            </div>

            <div className="form-section">
              <div className="form-section-title">补充信息</div>
              <Form.Item name="remark" label="备注">
                <Input.TextArea rows={2} placeholder="请输入备注" />
              </Form.Item>
            </div>
          </Form>
        </Spin>
      </Modal>

      <Modal
        title="用户详情"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={760}
      >
        <Spin spinning={detailLoading}>
          {detailRecord && (
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="登录账号">{detailRecord.loginName}</Descriptions.Item>
              <Descriptions.Item label="用户姓名">{detailRecord.userName}</Descriptions.Item>
              <Descriptions.Item label="手机号">{detailRecord.mobile || '--'}</Descriptions.Item>
              <Descriptions.Item label="所属部门">{detailRecord.departmentName || '--'}</Descriptions.Item>
              <Descriptions.Item label="数据范围">{detailRecord.dataScope || '--'}</Descriptions.Item>
              <Descriptions.Item label="所属角色" span={2}>
                {detailRecord.roleNames?.length ? detailRecord.roleNames.join('、') : '--'}
              </Descriptions.Item>
              <Descriptions.Item label="权限摘要" span={2}>{detailRecord.permissionSummary || '--'}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={getStatusColor(detailRecord.status)}>{detailRecord.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="2FA 状态">
                <Tag color={getTotpColor(detailRecord.totpEnabled)}>{detailRecord.totpEnabled ? '已启用' : '未启用'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="最近登录" span={2}>{detailRecord.lastLoginDate || '--'}</Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>{detailRecord.remark || '--'}</Descriptions.Item>
            </Descriptions>
          )}
        </Spin>
      </Modal>

      <Modal
        title="用户创建成功"
        open={createResultOpen}
        onCancel={() => { setCreateResultOpen(false); setCreateResult(null) }}
        footer={null}
        width={560}
        maskClosable={false}
      >
        {createResult && (
          <div style={{ padding: '16px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ color: '#666', fontSize: 12 }}>账号</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{createResult.user.loginName}</div>
              </div>
              <Button icon={<CopyOutlined />} onClick={() => copyText(createResult.user.loginName, '账号')}>复制账号</Button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ color: '#666', fontSize: 12 }}>初始密码</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#f5222d' }}>{createResult.initialPassword}</div>
              </div>
              <Button type="primary" icon={<CopyOutlined />} onClick={() => copyText(createResult.initialPassword, '密码')}>复制密码</Button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: '#666', fontSize: 12 }}>所属部门</div>
              <div>{createResult.user.departmentName || '--'}</div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#666', fontSize: 12 }}>所属角色</div>
              <div>{createResult.user.roleNames?.join('、') || '--'}</div>
            </div>
            <Typography.Text type="warning">请妥善保存初始密码，关闭后将不再展示。</Typography.Text>
            <div style={{ textAlign: 'right', marginTop: 16 }}>
              <Button type="primary" onClick={() => { setCreateResultOpen(false); setCreateResult(null) }}>知道了</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="2FA 管理"
        open={twoFaOpen}
        onCancel={() => { setTwoFaOpen(false); setTwoFaRecord(null); setTwoFaSetup(null); setTwoFaCode('') }}
        footer={null}
        width={720}
        maskClosable={false}
      >
        <Spin spinning={twoFaLoading}>
          {twoFaRecord && (
            <>
              <div style={{ marginBottom: 16 }}>
                <Tag color={twoFaRecord.totpEnabled ? 'success' : 'info'} style={{ padding: '4px 12px' }}>
                  {twoFaRecord.totpEnabled ? '当前已启用二次验证' : '当前未启用二次验证'}
                </Tag>
                <Typography.Text type="secondary" style={{ marginLeft: 8 }}>用户：{twoFaRecord.loginName}</Typography.Text>
              </div>

              {!twoFaRecord.totpEnabled ? (
                <div>
                  <Typography.Title level={5}>步骤 1：生成绑定二维码</Typography.Title>
                  <Typography.Paragraph type="secondary">
                    支持 Google Authenticator、Microsoft Authenticator 等标准 TOTP 应用。
                  </Typography.Paragraph>
                  <Button type="primary" loading={twoFaSetupLoading} onClick={handleGenerate2fa}>生成二维码</Button>

                  {twoFaSetup && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ textAlign: 'center', marginBottom: 16 }}>
                        <QRCode value={twoFaSetup.qrCodeBase64 || twoFaSetup.secret} size={200} />
                      </div>
                      <Form layout="vertical">
                        <Form.Item label="手动绑定密钥">
                          <Input value={twoFaSetup.secret} readOnly />
                        </Form.Item>
                        <Form.Item label="步骤 2：输入 6 位验证码确认启用">
                          <Input
                            maxLength={6}
                            placeholder="请输入动态验证码"
                            value={twoFaCode}
                            onChange={(e) => setTwoFaCode(e.target.value)}
                          />
                        </Form.Item>
                        <Space>
                          <Button onClick={handleGenerate2fa}>重新生成</Button>
                          <Button type="primary" loading={twoFaEnableLoading} onClick={handleEnable2fa}>确认启用 2FA</Button>
                        </Space>
                      </Form>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <Typography.Title level={5}>当前状态</Typography.Title>
                  <Typography.Paragraph type="secondary">
                    该用户已启用二次验证，登录时需要在账号密码后继续输入动态验证码。
                  </Typography.Paragraph>
                  <Button danger loading={twoFaDisableLoading} onClick={handleDisable2fa}>关闭 2FA</Button>
                </div>
              )}
            </>
          )}
        </Spin>
      </Modal>
    </div>
  )
}
