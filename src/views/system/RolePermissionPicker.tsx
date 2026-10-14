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
import type { TFunction } from 'i18next'
import { useMemo, useState } from 'react'
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

type PermissionGroup = ReturnType<typeof groupPermissionsByResource>[number]

/**
 * 按关键字过滤资源分组：资源名或资源展示名命中则整组保留，否则只保留命中的权限项。
 * 抽成纯函数，供渲染期派生与输入事件共用同一口径。
 */
function filterPermissionGroups(
  groups: PermissionGroup[],
  normalizedKeyword: string,
  t: TFunction,
): PermissionGroup[] {
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
  const visibleGroups = useMemo(
    () => filterPermissionGroups(groups, normalizedKeyword, t),
    [groups, normalizedKeyword, t],
  )

  // 关键字过滤时命中分组自动展开；否则保持折叠，避免 40+ 分组撑高弹窗。
  //
  // 展开态由 `visibleGroups` **渲染期派生**，而不是在输入事件里算一次：权限数据晚于关键字
  // 到达（慢请求/缓存未就绪）时可见分组会变化，事件里算出的结果会停留在过滤前的空集，
  // 命中分组保持折叠；清空关键字也不会复位。用 useMemo 派生既跟随可见分组，又不引入
  // effect 级联 setState。
  //
  // 过滤期的 header 仍是 `role="button"` 且可聚焦，因此不能丢弃它的 onChange：可聚焦控件
  // 按下无响应违反 APG。用户的显式折叠落到 `userCollapsedKeys`，展开态照旧在渲染期派生，
  // 于是「默认全展开 + 可逐组折叠」成立；清空关键字后回到未过滤的 `userExpandedKeys`。
  const [userExpandedKeys, setUserExpandedKeys] = useState<string[]>([])
  const [userCollapsedKeys, setUserCollapsedKeys] = useState<Set<string>>(
    () => new Set(),
  )
  const activeKeys = useMemo(
    () =>
      normalizedKeyword
        ? visibleGroups
            .map((group) => group.resource)
            .filter((resource) => !userCollapsedKeys.has(resource))
        : userExpandedKeys,
    [normalizedKeyword, visibleGroups, userCollapsedKeys, userExpandedKeys],
  )

  const handleActiveKeysChange = (keys: string[]) => {
    if (!normalizedKeyword) {
      setUserExpandedKeys(keys)
      return
    }
    // 过滤期只按可见分组对齐显式折叠位：绝不把 antd 回传的整份可见 key 写进未过滤态的
    // 展开集，否则用户只折叠了一组，清空关键字后却冒出多组陈旧展开项。
    const nextActive = new Set(keys)
    setUserCollapsedKeys((prev) => {
      const next = new Set(prev)
      for (const group of visibleGroups) {
        if (nextActive.has(group.resource)) {
          next.delete(group.resource)
        } else {
          next.add(group.resource)
        }
      }
      return next
    })
  }

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
            onChange={handleActiveKeysChange}
            items={collapseItems}
          />
        </div>
      )}
    </Flex>
  )
}
