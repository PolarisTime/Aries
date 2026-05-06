import { useState, useCallback, useMemo } from 'react'
import {
  Card, Button, Table, Modal, Form, Input, Select, Space, Checkbox,
  Tag, Typography, Empty, Radio, message, Row, Col,
} from 'antd'
import {
  PlusOutlined, SafetyCertificateOutlined,
  UnorderedListOutlined, AppstoreOutlined, CheckSquareOutlined,
  BorderOutlined,
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listSystemMenus, listRoleSettingsPage, getRoleActions,
  updateRoleActions, updateRole, createRole,
  type MenuNode, type RoleRecord,
} from '@/api/role-actions'
import { usePermissionStore } from '@/stores/permissionStore'
import { useRequestError } from '@/hooks/useRequestError'
import {
  enabledStatusValues, roleDataScopeValues, roleTypeValues,
} from '@/constants/module-options'
import { normalizeAction, resolveResourceKey } from '@/constants/resource-permissions'

const ACTION_LABELS: Record<string, string> = {
  read: '查看', create: '新增', update: '编辑', delete: '删除',
  audit: '审核', export: '导出', print: '打印', manage_permissions: '配置权限',
}

const ALL_ACTIONS = ['read', 'create', 'update', 'delete', 'audit', 'export', 'print', 'manage_permissions'] as const

export function RoleActionEditor() {
  const queryClient = useQueryClient()
  const { showError } = useRequestError()
  const permissionStore = usePermissionStore()

  const canCreateRole = useMemo(() => permissionStore.can('role', 'create'), [permissionStore])
  const canEditRole = useMemo(() => permissionStore.can('role', 'update'), [permissionStore])
  const canEditPermissions = useMemo(() => permissionStore.can('role', 'manage_permissions'), [permissionStore])

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list')

  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null)
  const [roleForm] = Form.useForm()

  const [roleSaving] = useState(false)

  const { data: rolesData } = useQuery({
    queryKey: ['role-settings'],
    queryFn: async () => {
      const allRoles: RoleRecord[] = []
      let page = 0
      while (true) {
        const data = await listRoleSettingsPage(page, 100)
        allRoles.push(...(data.records || []))
        const totalPages = Number(data.totalPages || 0)
        if ((totalPages > 0 && page + 1 >= totalPages) || (data.records || []).length < 100) break
        page++
      }
      return allRoles
    },
  })

  const roles = useMemo(() => rolesData || [], [rolesData])

  const { data: menuTree = [] } = useQuery({
    queryKey: ['role-permission-options'],
    queryFn: listSystemMenus,
    enabled: canEditPermissions,
  })

  const selectedRoleInfo = useMemo(() => roles.find((r) => r.id === selectedRoleId), [roles, selectedRoleId])

  const flatMenus = useMemo(() => {
    const result: { menuCode: string; menuName: string; parentName: string; resource: string; actions: string[] }[] = []
    for (const group of menuTree) {
      if (group.children.length > 0) {
        for (const child of group.children) {
          if (child.actions.length > 0) {
            result.push({
              menuCode: child.menuCode, menuName: child.menuName,
              parentName: group.menuName, resource: resolveResourceKey(child.menuCode),
              actions: child.actions,
            })
          }
        }
      } else if (group.actions.length > 0) {
        result.push({
          menuCode: group.menuCode, menuName: group.menuName,
          parentName: '', resource: resolveResourceKey(group.menuCode),
          actions: group.actions,
        })
      }
    }
    return result
  }, [menuTree])

  const matrixData = useMemo(() => {
    return flatMenus.map((menu) => {
      const row: Record<string, unknown> = {
        key: menu.menuCode, menuName: menu.menuName, menuCode: menu.menuCode,
        resource: menu.resource, actions: menu.actions,
      }
      let count = 0
      for (const action of ALL_ACTIONS) {
        const supported = menu.actions.includes(action)
        const checked = supported && selectedActions.has(`${menu.resource}:${action}`)
        row[action] = checked
        if (checked) count++
      }
      row._count = `${count}/${menu.actions.length}`
      return row
    })
  }, [flatMenus, selectedActions])

  const selectRole = useCallback(async (role: RoleRecord) => {
    setSelectedRoleId(role.id)
    try {
      const actions = new Set<string>()
      for (const item of await getRoleActions(role.id)) {
        actions.add(`${item.resource}:${normalizeAction(item.action)}`)
      }
      setSelectedActions(actions)
    } catch (err) {
      setSelectedActions(new Set())
      showError(err, '加载角色权限失败')
    }
  }, [showError])

  const isMenuChecked = useCallback((menuCode: string) => {
    const resource = resolveResourceKey(menuCode)
    for (const key of selectedActions) { if (key.startsWith(resource + ':')) return true }
    return false
  }, [selectedActions])

  const isMenuFullyChecked = useCallback((menu: MenuNode) => {
    const resource = resolveResourceKey(menu.menuCode)
    return menu.actions.every((action) => selectedActions.has(`${resource}:${action}`))
  }, [selectedActions])

  const isMenuPartiallyChecked = useCallback((menu: MenuNode) => {
    return isMenuChecked(menu.menuCode) && !isMenuFullyChecked(menu)
  }, [isMenuChecked, isMenuFullyChecked])

  const toggleAction = useCallback((menuCode: string, action: string) => {
    if (!canEditPermissions) { message.warning('暂无权限配置编辑权限'); return }
    const key = `${resolveResourceKey(menuCode)}:${action}`
    const newSet = new Set(selectedActions)
    if (newSet.has(key)) newSet.delete(key); else newSet.add(key)
    setSelectedActions(newSet)
  }, [canEditPermissions, selectedActions])

  const isActionSelected = useCallback((menuCode: string, action: string) => {
    return selectedActions.has(`${resolveResourceKey(menuCode)}:${action}`)
  }, [selectedActions])

  const toggleAllMenuActions = useCallback((menu: MenuNode) => {
    if (!canEditPermissions) { message.warning('暂无权限配置编辑权限'); return }
    const newSet = new Set(selectedActions)
    const resource = resolveResourceKey(menu.menuCode)
    const allChecked = menu.actions.every((action) => newSet.has(`${resource}:${action}`))
    for (const action of menu.actions) {
      const key = `${resource}:${action}`
      if (allChecked) newSet.delete(key); else newSet.add(key)
    }
    setSelectedActions(newSet)
  }, [canEditPermissions, selectedActions])

  const selectAll = useCallback(() => {
    if (!canEditPermissions) { message.warning('暂无权限配置编辑权限'); return }
    const newSet = new Set<string>()
    for (const menu of flatMenus) {
      for (const action of menu.actions) newSet.add(`${menu.resource}:${action}`)
    }
    setSelectedActions(newSet)
  }, [canEditPermissions, flatMenus])

  const deselectAll = useCallback(() => {
    if (!canEditPermissions) { message.warning('暂无权限配置编辑权限'); return }
    setSelectedActions(new Set())
  }, [canEditPermissions])

  const saveRoleActionsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRoleId) return
      const actions = Array.from(selectedActions).map((key) => {
        const [resource, action] = key.split(':')
        return { resource, action }
      })
      await updateRoleActions(selectedRoleId, actions)
    },
    onSuccess: () => { message.success('权限保存成功') },
    onError: (err: Error) => showError(err, '保存失败'),
  })

  const openRoleForm = useCallback((mode: 'create' | 'edit', role?: RoleRecord) => {
    if (mode === 'edit' && role) {
      if (!canEditRole) { message.warning('暂无编辑角色权限'); return }
      setEditingRole(role)
      roleForm.setFieldsValue({
        roleName: role.roleName, roleCode: role.roleCode,
        roleType: role.roleType, dataScope: role.dataScope,
        remark: role.remark || '',
      })
    } else {
      if (!canCreateRole) { message.warning('暂无新增角色权限'); return }
      setEditingRole(null)
      roleForm.resetFields()
      roleForm.setFieldsValue({ roleType: roleTypeValues[1], dataScope: roleDataScopeValues[0] })
    }
    setRoleModalOpen(true)
  }, [canEditRole, canCreateRole, roleForm])

  const saveRoleMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const payload = {
        ...values,
        remark: values.remark || null,
        status: editingRole?.status || enabledStatusValues[0],
      }
      if (editingRole) {
        await updateRole(editingRole.id, payload)
        return { mode: 'edit' as const }
      }
      const response = await createRole(payload)
      return { mode: 'create' as const, data: response.data }
    },
    onSuccess: async (result) => {
      if (result.mode === 'create' && result.data) {
        message.success('角色创建成功')
        setRoleModalOpen(false)
        await queryClient.invalidateQueries({ queryKey: ['role-settings'] })
        const newRole = result.data as RoleRecord
        if (newRole?.id) {
          Modal.confirm({
            title: '角色创建成功',
            content: `角色已创建完成，是否立即为此角色配置权限？`,
            okText: '去配置', cancelText: '稍后配置',
            onOk: () => { const created = roles.find((r) => r.id === newRole.id); if (created) selectRole(created) },
          })
        }
      } else {
        message.success('角色更新成功')
        setRoleModalOpen(false)
        await queryClient.invalidateQueries({ queryKey: ['role-settings'] })
      }
    },
    onError: (err: Error) => showError(err, '保存失败'),
  })

  const handleSaveRole = useCallback(async () => {
    try {
      const values = await roleForm.validateFields()
      if (!values.roleName?.trim() || !values.roleCode?.trim()) {
        message.warning('请填写角色名称和编码')
        return
      }
      saveRoleMutation.mutate(values)
    } catch { /* validation failed */ }
  }, [roleForm, saveRoleMutation])

  const matrixColumns = useMemo(() => {
    const cols = [
      { dataIndex: 'menuName', title: '菜单名称', width: 160, fixed: 'left' as const },
    ] as Array<Record<string, unknown>>
    for (const action of ALL_ACTIONS) {
      const label = ACTION_LABELS[action] || action
      if (!flatMenus.some((m) => m.actions.includes(action))) continue
      cols.push({
        dataIndex: action, title: label, width: 70, align: 'center' as const,
        render: (checked: unknown, record: Record<string, unknown>) => {
          const supported = Array.isArray(record.actions) && (record.actions as string[]).includes(action)
          if (!supported) return <span style={{ color: '#d9d9d9' }}>-</span>
          return (
            <Checkbox
              checked={checked as boolean}
              disabled={!canEditPermissions}
              onChange={() => toggleAction(String(record.menuCode || ''), action)}
            />
          )
        },
      })
    }
    cols.push({ dataIndex: '_count', title: '已授权', width: 70, align: 'center' as const })
    return cols
  }, [flatMenus, canEditPermissions, toggleAction])

  return (
    <div className="page-stack">
      <Row gutter={16} style={{ height: 'calc(100vh - 160px)' }}>
        <Col span={6}>
          <Card
            title="角色列表"
            size="small"
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            styles={{ body: { flex: 1, overflow: 'auto', padding: 8 } }}
            extra={canCreateRole && <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => openRoleForm('create')}>新增</Button>}
          >
            {roles.map((role) => (
              <div
                key={role.id}
                style={{
                  padding: '12px 16px', borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                  border: selectedRoleId === role.id ? '1px solid #91d5ff' : '1px solid transparent',
                  background: selectedRoleId === role.id ? '#e6f7ff' : undefined,
                }}
                onClick={() => selectRole(role)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Typography.Text strong>{role.roleName}</Typography.Text>
                  <Tag color={role.status === enabledStatusValues[0] ? 'green' : 'red'} style={{ marginLeft: 8 }}>{role.status}</Tag>
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: 12, color: '#8c8c8c' }}>
                  <span>{role.roleCode}</span>
                  <span>{role.roleType}</span>
                  <span>{role.userCount} 用户</span>
                </div>
              </div>
            ))}
            {roles.length === 0 && <Empty description="暂无角色" />}
          </Card>
        </Col>

        <Col span={18}>
          <Card
            size="small"
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            styles={{ body: { flex: 1, overflow: 'auto' } }}
            title={
              <Space>
                <SafetyCertificateOutlined />
                <span>{selectedRoleInfo ? `${selectedRoleInfo.roleName} - 权限配置` : '请选择角色'}</span>
              </Space>
            }
            extra={
              selectedRoleInfo && (
                <Space size="small">
                  {canEditPermissions && <Button size="small" icon={<CheckSquareOutlined />} onClick={selectAll}>全选</Button>}
                  {canEditPermissions && <Button size="small" icon={<BorderOutlined />} onClick={deselectAll}>全不选</Button>}
                  {canEditPermissions && <span style={{ borderLeft: '1px solid #f0f0f0', height: 20 }} />}
                  <Radio.Group size="small" value={viewMode} onChange={(e) => setViewMode(e.target.value)} buttonStyle="solid">
                    <Radio.Button value="list"><UnorderedListOutlined /> 列表</Radio.Button>
                    <Radio.Button value="matrix"><AppstoreOutlined /> 矩阵</Radio.Button>
                  </Radio.Group>
                  <span style={{ borderLeft: '1px solid #f0f0f0', height: 20 }} />
                  {canEditPermissions && <Button type="primary" size="small" loading={saveRoleActionsMutation.isPending} onClick={() => saveRoleActionsMutation.mutate()}>保存权限</Button>}
                </Space>
              )
            }
          >
            {selectedRoleInfo ? (
              viewMode === 'list' ? (
                <div>
                  {menuTree.map((group) => (
                    <div key={group.menuCode} style={{ marginBottom: 16 }}>
                      {group.children.length > 0 && (
                        <div style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0', marginBottom: 8 }}>
                          <Typography.Text strong>{group.menuName}</Typography.Text>
                        </div>
                      )}
                      {(group.children.length > 0 ? group.children : [group]).filter((m) => m.actions.length > 0).map((child) => (
                        <div key={child.menuCode} style={{ display: 'flex', alignItems: 'center', padding: '6px 0 6px 16px' }}>
                          <div style={{ width: 160, flexShrink: 0 }}>
                            <Checkbox
                              checked={isMenuChecked(child.menuCode)}
                              indeterminate={isMenuPartiallyChecked(child)}
                              disabled={!canEditPermissions}
                              onChange={() => toggleAllMenuActions(child)}
                            >
                              <Typography.Text strong>{child.menuName}</Typography.Text>
                            </Checkbox>
                          </div>
                          <Space size={16} wrap>
                            {child.actions.map((action) => (
                              <Checkbox
                                key={action}
                                checked={isActionSelected(child.menuCode, action)}
                                disabled={!canEditPermissions}
                                onChange={() => toggleAction(child.menuCode, action)}
                              >
                                {ACTION_LABELS[action] || action}
                              </Checkbox>
                            ))}
                          </Space>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <Table
                  rowKey="key"
                  columns={matrixColumns}
                  dataSource={matrixData}
                  size="small"
                  bordered
                  pagination={false}
                  scroll={{ x: 800 }}
                />
              )
            ) : (
              <Empty description="请从左侧选择一个角色来配置权限" style={{ marginTop: 120 }} />
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title={editingRole ? '编辑角色' : '新增角色'}
        open={roleModalOpen}
        onCancel={() => setRoleModalOpen(false)}
        onOk={handleSaveRole}
        confirmLoading={roleSaving}
        okText="保存"
        cancelText="取消"
        maskClosable={false}
      >
        <Form form={roleForm} layout="vertical">
          <Form.Item name="roleName" label="角色名称" required>
            <Input placeholder="例如：采购主管" maxLength={64} />
          </Form.Item>
          <Form.Item name="roleCode" label="角色编码" required>
            <Input placeholder="例如：PURCHASER" maxLength={64} disabled={!!editingRole} />
          </Form.Item>
          <Form.Item name="roleType" label="角色类型">
            <Select options={roleTypeValues.map((t) => ({ label: t, value: t }))} />
          </Form.Item>
          <Form.Item name="dataScope" label="数据范围">
            <Select options={roleDataScopeValues.map((s) => ({ label: s, value: s }))} />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea placeholder="角色描述" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
