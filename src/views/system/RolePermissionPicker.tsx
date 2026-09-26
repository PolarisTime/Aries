import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Checkbox,
  Collapse,
  Empty,
  Flex,
  Input,
  Popconfirm,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listPermissions } from '@/api/system/permissions'
import { QUERY_KEYS } from '@/constants/query-keys'
import {
  getPermissionLabel,
  getResourceLabel,
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
 * 角色权限选择器：按资源分组、可折叠的 resource×action 复选矩阵。
 * 供角色管理列表的权限弹窗与「角色配置向导」共用；内部维护选中集合并通过
 * onChange 对外通知，避免调用方用 effect 同步派生 state。
 *
 * <p>遵循 antd 交互约定：资源名中文化、关键字过滤、高密度可折叠分组、固定高度滚动、
 * 破坏性的「全选」使用 Popconfirm 二次确认。</p>
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
  const [keyword, setKeyword] = useState('')

  const permissionsQuery = useQuery({
    queryKey: QUERY_KEYS.permissions,
    queryFn: ({ signal }) => listPermissions(signal),
  })

  const groups = useMemo(
    () => groupPermissionsByResource(permissionsQuery.data ?? []),
    [permissionsQuery.data],
  )

  const normalizedKeyword = keyword.trim().toLowerCase()
  const visibleGroups = useMemo(() => {
    if (!normalizedKeyword) return groups
    return groups.flatMap((group) => {
      const resourceLabel = getResourceLabel(group.resource, t)
      const resourceMatched =
        group.resource.toLowerCase().includes(normalizedKeyword) ||
        resourceLabel.toLowerCase().includes(normalizedKeyword)
      if (resourceMatched) return [group]
      const actions = group.actions.filter((permission) => {
        const label = getPermissionLabel(permission, t)
        return (
          permission.code.toLowerCase().includes(normalizedKeyword) ||
          label.toLowerCase().includes(normalizedKeyword)
        )
      })
      return actions.length ? [{ ...group, actions }] : []
    })
  }, [groups, normalizedKeyword, t])

  // 关键字过滤时自动展开命中分组；否则折叠，避免 40+ 分组撑高弹窗。
  const [activeKeys, setActiveKeys] = useState<string[]>([])
  useEffect(() => {
    if (normalizedKeyword) {
      setActiveKeys(visibleGroups.map((group) => group.resource))
    }
  }, [normalizedKeyword, visibleGroups])

  const update = (next: Set<string>) => {
    setSelected(next)
    onSelectedChange([...next])
  }

  const handleSelectAll = () => {
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

  if (wildcard) {
    return (
      <Flex vertical gap={12}>
        <Alert
          type="warning"
          showIcon
          title={t('system.role.wildcardNotice')}
        />
      </Flex>
    )
  }

  const collapseItems = visibleGroups.map((group) => {
    const allSelected = isGroupFullySelected(group, selected)
    const partial = isGroupPartiallySelected(group, selected)
    const selectedCount = group.actions.filter((action) =>
      selected.has(action.code),
    ).length
    return {
      key: group.resource,
      label: (
        <Flex align="center" gap={8}>
          <Checkbox
            checked={allSelected}
            indeterminate={partial}
            disabled={disabled}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) =>
              update(
                toggleGroupSelection(group, selected, event.target.checked),
              )
            }
          />
          <Typography.Text strong>
            {getResourceLabel(group.resource, t)}
          </Typography.Text>
          <Tag
            color={selectedCount > 0 ? 'blue' : 'default'}
            style={{ marginInlineStart: 'auto' }}
          >
            {selectedCount}/{group.actions.length}
          </Tag>
        </Flex>
      ),
      children: (
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
              {getPermissionLabel(permission, t)}
            </Checkbox>
          ))}
        </Flex>
      ),
    }
  })

  return (
    <Flex vertical gap={12}>
      <Flex align="center" justify="space-between" gap={12} wrap>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={t('system.role.permissionSearchPlaceholder')}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          style={{ maxWidth: 280 }}
        />
        <Space>
          <Typography.Text type="secondary">
            {t('system.role.permissionSelectedCount', { count: selected.size })}
          </Typography.Text>
          <Popconfirm
            title={t('system.role.selectAllConfirmTitle')}
            description={t('system.role.selectAllConfirmContent')}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
            onConfirm={handleSelectAll}
          >
            <Button size="small" disabled={locked}>
              {t('system.role.selectAll')}
            </Button>
          </Popconfirm>
          <Button
            size="small"
            disabled={locked}
            onClick={() => update(new Set())}
          >
            {t('system.role.clearAll')}
          </Button>
        </Space>
      </Flex>
      {visibleGroups.length === 0 ? (
        <Empty description={t('common.noData')} />
      ) : (
        <div className="role-permission-scroll">
          <Collapse
            size="small"
            activeKey={activeKeys}
            onChange={(keys) => setActiveKeys(keys)}
            items={collapseItems}
          />
        </div>
      )}
    </Flex>
  )
}
