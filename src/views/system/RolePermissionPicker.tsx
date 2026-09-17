import { ReloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Empty,
  Flex,
  Skeleton,
  Space,
  Typography,
} from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listPermissions } from '@/api/system/permissions'
import { QUERY_KEYS } from '@/constants/query-keys'
import {
  getActionLabel,
  groupPermissionsByResource,
  isGroupFullySelected,
  isGroupPartiallySelected,
  toggleGroupSelection,
  togglePermissionSelection,
} from '@/views/system/role-permission-utils'

interface Props {
  /**
   * 初始选中权限码。仅作为挂载初值；重载不同角色时由调用方通过 key 重挂载本组件。
   */
  initialSelected?: readonly string[]
  onSelectedChange: (permissions: string[]) => void
  /** 角色持有全局通配 `*`：权限不可单独勾选，仅提示。 */
  wildcard?: boolean
  /** 只读（如内置角色）。 */
  disabled?: boolean
}

/**
 * 角色权限选择器：按资源分组的 resource×action 复选矩阵。
 * 供角色管理列表的权限弹窗与「角色配置向导」共用；内部维护选中集合并通过
 * onChange 对外通知，避免调用方用 effect 同步派生 state。
 */
export function RolePermissionPicker({
  initialSelected = [],
  onSelectedChange,
  wildcard = false,
  disabled = false,
}: Props) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelected),
  )

  const permissionsQuery = useQuery({
    queryKey: QUERY_KEYS.permissions,
    queryFn: ({ signal }) => listPermissions(signal),
  })

  const groups = useMemo(
    () => groupPermissionsByResource(permissionsQuery.data ?? []),
    [permissionsQuery.data],
  )

  const update = (next: Set<string>) => {
    setSelected(next)
    onSelectedChange([...next])
  }

  const handleSelectAll = (checked: boolean) => {
    if (!checked) {
      update(new Set())
      return
    }
    const next = new Set(selected)
    for (const group of groups) {
      for (const action of group.actions) {
        next.add(action.code)
      }
    }
    update(next)
  }

  if (permissionsQuery.isPending) {
    return <Skeleton active paragraph={{ rows: 8 }} />
  }

  if (permissionsQuery.isError) {
    return (
      <Empty description={t('system.role.permissionsLoadFailed')}>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            void permissionsQuery.refetch()
          }}
        >
          {t('common.refresh')}
        </Button>
      </Empty>
    )
  }

  const locked = disabled || wildcard

  return (
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
          {t('system.role.permissionSelectedCount', { count: selected.size })}
        </Typography.Text>
        <Space>
          <Button
            size="small"
            disabled={locked}
            onClick={() => handleSelectAll(true)}
          >
            {t('system.role.selectAll')}
          </Button>
          <Button
            size="small"
            disabled={locked}
            onClick={() => handleSelectAll(false)}
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
                    disabled={disabled}
                    onChange={(event) =>
                      update(
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
                      disabled={disabled}
                      onChange={(event) =>
                        update(
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
  )
}
