import { ReloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Empty,
  Flex,
  Modal,
  Skeleton,
  Space,
  Typography,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listPermissions } from '@/api/system/permissions'
import { getRole } from '@/api/system/roles'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { RoleResponse } from '@/shared/schemas'
import {
  getActionLabel,
  groupPermissionsByResource,
  hasWildcardPermission,
  isGroupFullySelected,
  isGroupPartiallySelected,
  isWildcardPermission,
  toggleGroupSelection,
  togglePermissionSelection,
} from '@/views/system/role-permission-utils'

interface Props {
  role: RoleResponse | null
  saving: boolean
  onSave: (payload: { id: string; permissions: string[] }) => void
  onClose: () => void
}

export function RolePermissionMatrixModal({
  role,
  saving,
  onSave,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const roleId = role?.id ?? ''
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const roleQuery = useQuery({
    queryKey: QUERY_KEYS.role(roleId),
    queryFn: ({ signal }) => getRole(roleId, signal),
    enabled: Boolean(roleId),
  })
  const permissionsQuery = useQuery({
    queryKey: QUERY_KEYS.permissions,
    queryFn: ({ signal }) => listPermissions(signal),
    enabled: Boolean(roleId),
  })

  const rolePermissions = roleQuery.data?.permissions
  useEffect(() => {
    setSelected(new Set(rolePermissions ?? []))
  }, [rolePermissions])

  const groups = useMemo(
    () => groupPermissionsByResource(permissionsQuery.data ?? []),
    [permissionsQuery.data],
  )
  const wildcard = hasWildcardPermission(roleQuery.data?.permissions ?? [])

  const handleSave = () => {
    if (!roleId) return
    const permissions = [...selected].filter(
      (code) => !isWildcardPermission(code),
    )
    onSave({ id: roleId, permissions })
  }

  const handleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelected(new Set())
      return
    }
    const next = new Set(selected)
    for (const group of groups) {
      for (const action of group.actions) {
        next.add(action.code)
      }
    }
    setSelected(next)
  }

  const loading = roleQuery.isPending || permissionsQuery.isPending
  const loadFailed = roleQuery.isError || permissionsQuery.isError

  return (
    <Modal
      open={Boolean(role)}
      title={t('system.role.permissionMatrixTitle', { name: role?.name ?? '' })}
      width={860}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={saving}
      okButtonProps={{ disabled: wildcard }}
      onOk={handleSave}
      onCancel={onClose}
      destroyOnHidden
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : loadFailed ? (
        <Empty description={t('system.role.permissionsLoadFailed')}>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              void roleQuery.refetch()
              void permissionsQuery.refetch()
            }}
          >
            {t('common.refresh')}
          </Button>
        </Empty>
      ) : (
        <Flex vertical gap={12}>
          {wildcard ? (
            <Alert
              type="warning"
              showIcon
              message={t('system.role.wildcardNotice')}
            />
          ) : null}
          <Flex align="center" justify="space-between">
            <Typography.Text type="secondary">
              {t('system.role.permissionSelectedCount', {
                count: selected.size,
              })}
            </Typography.Text>
            <Space>
              <Button
                size="small"
                onClick={() => handleSelectAll(true)}
                disabled={wildcard}
              >
                {t('system.role.selectAll')}
              </Button>
              <Button
                size="small"
                onClick={() => handleSelectAll(false)}
                disabled={wildcard}
              >
                {t('system.role.clearAll')}
              </Button>
            </Space>
          </Flex>
          {wildcard ? null : groups.length === 0 ? (
            <Empty description={t('common.noData')} />
          ) : (
            <Flex vertical gap={8}>
              {groups.map((group) => {
                const allSelected = isGroupFullySelected(group, selected)
                const partial = isGroupPartiallySelected(group, selected)
                return (
                  <Card
                    key={group.resource}
                    size="small"
                    title={
                      <Checkbox
                        checked={allSelected}
                        indeterminate={partial}
                        onChange={(event) =>
                          setSelected(
                            toggleGroupSelection(
                              group,
                              selected,
                              event.target.checked,
                            ),
                          )
                        }
                      >
                        {group.resource}
                      </Checkbox>
                    }
                  >
                    <Flex wrap gap={12}>
                      {group.actions.map((permission) => (
                        <Checkbox
                          key={permission.code}
                          checked={selected.has(permission.code)}
                          title={permission.code}
                          onChange={(event) =>
                            setSelected(
                              togglePermissionSelection(
                                selected,
                                permission.code,
                                event.target.checked,
                              ),
                            )
                          }
                        >
                          {getActionLabel(permission.action, t)}
                        </Checkbox>
                      ))}
                    </Flex>
                  </Card>
                )
              })}
            </Flex>
          )}
        </Flex>
      )}
    </Modal>
  )
}
