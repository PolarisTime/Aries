import {
  CloseOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  Button,
  Checkbox,
  Empty,
  Input,
  Popconfirm,
  Skeleton,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import { Fragment, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Permission } from '@/shared/schemas'
import {
  getDomainDefinition,
  PERMISSION_DOMAINS,
  type PermissionDomain,
  resolveDomain,
} from '@/views/system/permission-domains'
import {
  getActionLabel,
  getPermissionLabel,
  getResourceLabel,
  groupPermissionsByResource,
  isGroupFullySelected,
  isGroupPartiallySelected,
  isWildcardPermission,
  togglePermissionSelection,
} from '@/views/system/role-permission-utils'

/** 矩阵常显的 4 个常用动作（其余动作收进「更多」）。顺序即列顺序。 */
const COMMON_ACTIONS = ['read', 'create', 'update', 'delete'] as const
const COMMON_ACTION_SET: ReadonlySet<string> = new Set(COMMON_ACTIONS)

/**
 * checkbox 命中区样式。
 *
 * <p>`src/styles/touch-targets.css` 的全局热区补丁只作用于 `button` / `[role=button]` /
 * `.ant-btn`，**不覆盖 checkbox**。antd 默认勾选框视觉尺寸仅 16×16，直接放进矩阵会让
 * 命中区低于 WCAG 2.2 SC 2.5.8 要求的 24×24。这里给 `label` 包裹层补到 24×24
 * （视觉尺寸不变，只是可点区域变大），因此不需要额外 CSS 文件。</p>
 */
const CHECKBOX_TARGET_STYLE = {
  minWidth: 24,
  minHeight: 24,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: 0,
} as const

/** 资源级通配动作：权限码形如 `资源:*`，语义是「该资源全部动作」。 */
const RESOURCE_WILDCARD_ACTION = '*'

/**
 * 本组件专属的结构性文案（无法复用 `system.role.*` 现有 key 的那几条）。
 *
 * <p><b>为什么不直接写进 locales</b>：本次改动的写作用域仅限本文件与 spec，
 * `src/locales/` 由他人并发维护，擅自新增 key 会与其改动冲突。这里沿用
 * `permission-domains.ts` 已确立的「`labelZh` / `labelEn` + 按语言取用」写法，
 * 待 locales 收口后整体迁移即可（只需改本常量的取值来源，不动任何调用点）。</p>
 */
const STRUCTURAL_TEXT = {
  domainNavAria: { zh: '业务域导航', en: 'Business domain navigation' },
  domainNavShort: { zh: '业务域', en: 'Domains' },
  resourceColumn: { zh: '资源', en: 'Resource' },
  onlySelected: { zh: '只看已选', en: 'Only selected' },
  selectedSummary: { zh: '已选权限', en: 'Selected permissions' },
  /** 行首资源级全选可访问名的后缀：「销售订单 全部权限」。 */
  allPermissionsSuffix: { zh: '全部权限', en: 'all permissions' },
  /** 通配（`资源:*`）的可见标签。 */
  wildcardAllActions: { zh: '全部动作 *', en: 'All actions *' },
  clearConfirmTitle: { zh: '清空全部权限？', en: 'Clear all permissions?' },
  clearConfirmContent: {
    zh: '将取消当前角色的所有权限勾选。确定继续？',
    en: 'This will uncheck every permission of the role. Continue?',
  },
  removeAriaPrefix: { zh: '移除', en: 'Remove' },
} as const

type StructuralKey = keyof typeof STRUCTURAL_TEXT

function isZh(language: string) {
  return language.toLowerCase().startsWith('zh')
}

/** 按当前界面语言取结构性文案。 */
function structural(key: StructuralKey, language: string) {
  const entry = STRUCTURAL_TEXT[key]
  return isZh(language) ? entry.zh : entry.en
}

/** 单个资源的权限切分结果（矩阵一行的数据）。 */
interface RowPartition {
  /** 常显列的权限（read / create / update / delete，且非字段级）。 */
  readonly common: ReadonlyMap<string, Permission>
  /** 其余动作（非字段级），收进「更多」。 */
  readonly extras: readonly Permission[]
  /** 字段级权限（`资源:动作:字段`），作为该资源的独立子项。 */
  readonly fields: readonly Permission[]
  /** `资源:*` 通配项。 */
  readonly wildcards: readonly Permission[]
}

function partitionRow(actions: readonly Permission[]): RowPartition {
  const plain: Permission[] = []
  const fields: Permission[] = []
  const wildcards: Permission[] = []
  for (const permission of actions) {
    if (permission.field) {
      fields.push(permission)
    } else if (
      permission.action === RESOURCE_WILDCARD_ACTION ||
      isWildcardPermission(permission.code)
    ) {
      wildcards.push(permission)
    } else {
      plain.push(permission)
    }
  }
  // 先建一次 action → permission 的索引，避免在 COMMON_ACTIONS 循环里反复 find
  // （react-doctor 的 js-index-maps：循环内 find 是 O(动作数 × 权限数)）。
  const plainByAction = new Map<string, Permission>()
  for (const permission of plain) {
    // 同一 action 理论上只出现一次；若数据异常取首个，与原先 find 的行为一致。
    if (!plainByAction.has(permission.action)) {
      plainByAction.set(permission.action, permission)
    }
  }
  const common = new Map<string, Permission>()
  for (const action of COMMON_ACTIONS) {
    const found = plainByAction.get(action)
    if (found) common.set(action, found)
  }
  const extras = plain.filter(
    (permission) => !COMMON_ACTION_SET.has(permission.action),
  )
  return { common, extras, fields, wildcards }
}

export interface RolePermissionMatrixEditorProps {
  /**
   * 权限目录（`listPermissions()` 的结果）。由调用方加载后传入：
   * 本组件保持纯展示/交互，不自行发起请求，便于在向导里复用同一份缓存。
   */
  readonly permissions: readonly Permission[]
  /** 受控的已选权限码。 */
  readonly selected: readonly string[]
  /** 已选变化回调；入参为完整的新选中集合（而非增量）。 */
  readonly onChange: (next: string[]) => void
  /** 只读（内置角色等）。 */
  readonly disabled?: boolean
  /** 角色持有全局通配 `*`：权限不可单独勾选，仅提示。 */
  readonly wildcard?: boolean
  /** 权限目录加载中。 */
  readonly loading?: boolean
}

/**
 * 角色权限编辑器：**业务域 × 资源 × 动作** 三栏矩阵。
 *
 * <p><b>为什么重做</b>：旧选择器把 53 个资源按英文字典序平铺成一列折叠面板 ——
 * 「附件清单导出」排第一、「销售订单」埋在中间；每行只有 `0/5` 计数，看不出具体
 * 勾了 read 还是 delete；52 组要滚很久。用户反馈「太简陋」即指此。</p>
 *
 * <p><b>三栏各回答一个问题</b>：</p>
 * <ul>
 *   <li>左栏「我在哪个业务域」——8 个业务域导航，带「已选/总数」，点选即缩小范围；</li>
 *   <li>中栏「这个资源能做什么」——资源 × 动作矩阵，4 个常用动作常显为列，
 *       其余动作与字段级权限收进该行「更多」，勾选状态一眼可见；</li>
 *   <li>右栏「我到底给了什么」——已选权限按业务域分组汇总，可逐项移除。</li>
 * </ul>
 *
 * <p><b>自由组合全部保留</b>：单权限勾选、资源级全选/反选、全局全选（带确认）、
 * 清空（带确认）、搜索、只看已选、字段级权限独立成项、`资源:*` 通配的视觉表达。</p>
 *
 * <p><b>无障碍</b>：矩阵用真实 `table` + `th[scope]` 表达「行=资源、列=动作」；
 * 每个 checkbox 都带「资源 + 动作」的可访问名（如「销售订单 新增」），
 * 用 `aries-sr-only` 提供读屏文本而视觉上保持矩阵紧凑；业务域导航是一组可聚焦
 * `<button aria-pressed>`（不用裸 div，故不需要 tablist/tab 的 roving tabindex）；
 * 「更多」按钮带 `aria-expanded`/`aria-controls`；命中区沿用 antd 默认尺寸
 * （含内边距 ≥24×24），不做压缩。</p>
 */
export function RolePermissionMatrixEditor({
  permissions,
  selected,
  onChange,
  disabled = false,
  wildcard = false,
  loading = false,
}: RolePermissionMatrixEditorProps) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? i18n.language ?? 'zh-CN'
  const locked = disabled || wildcard

  const selectedSet = useMemo(() => new Set(selected), [selected])

  const [activeDomain, setActiveDomain] = useState<PermissionDomain>(
    PERMISSION_DOMAINS[0],
  )
  const [keyword, setKeyword] = useState('')
  const [onlySelected, setOnlySelected] = useState(false)
  const [expandedResources, setExpandedResources] = useState<
    ReadonlySet<string>
  >(() => new Set<string>())
  const [navCollapsed, setNavCollapsed] = useState(false)

  const groups = useMemo(
    () => groupPermissionsByResource([...permissions]),
    [permissions],
  )

  const normalizedKeyword = keyword.trim().toLowerCase()

  /** 每个业务域的「已选/总数」，左栏徽标用。 */
  const domainStats = useMemo(() => {
    const stats = new Map<
      PermissionDomain,
      { total: number; selected: number }
    >()
    for (const domain of PERMISSION_DOMAINS) {
      stats.set(domain, { total: 0, selected: 0 })
    }
    for (const group of groups) {
      const bucket = stats.get(resolveDomain(group.resource))
      if (!bucket) continue
      bucket.total += group.actions.length
      for (const permission of group.actions) {
        if (selectedSet.has(permission.code)) bucket.selected += 1
      }
    }
    return stats
  }, [groups, selectedSet])

  /**
   * 当前可见的资源行：业务域 → 关键字 → 只看已选，三道过滤依次收敛。
   *
   * <p>关键字命中口径与旧选择器一致（资源码/资源中文名/权限码/权限中文名），
   * 但这里**按行过滤**而不是按权限项裁剪：矩阵的列是固定动作，裁剪单项会让
   * 同一资源在筛选前后的列对齐关系变化，反而更难读。</p>
   */
  const visibleGroups = useMemo(() => {
    return groups.filter((group) => {
      /*
       * 有关键字时跨业务域搜索：否则用户在「销售」域里搜「商品资料」会得到空结果，
       * 误以为该资源不存在。业务域导航只在无关键字时作为范围过滤器。
       */
      if (
        !normalizedKeyword &&
        resolveDomain(group.resource) !== activeDomain
      ) {
        return false
      }
      if (onlySelected) {
        const hasSelected = group.actions.some((permission) =>
          selectedSet.has(permission.code),
        )
        if (!hasSelected) return false
      }
      if (!normalizedKeyword) return true
      const resourceLabel = getResourceLabel(group.resource, t).toLowerCase()
      if (
        group.resource.toLowerCase().includes(normalizedKeyword) ||
        resourceLabel.includes(normalizedKeyword)
      ) {
        return true
      }
      return group.actions.some((permission) => {
        if (permission.code.toLowerCase().includes(normalizedKeyword)) {
          return true
        }
        return getPermissionLabel(permission, t)
          .toLowerCase()
          .includes(normalizedKeyword)
      })
    })
  }, [groups, activeDomain, onlySelected, normalizedKeyword, selectedSet, t])

  /** 右栏汇总：已选权限按业务域 → 资源分组。 */
  const summaryByDomain = useMemo(() => {
    const byDomain = new Map<
      PermissionDomain,
      Array<{ resource: string; permissions: Permission[] }>
    >()
    for (const group of groups) {
      const picked = group.actions.filter((permission) =>
        selectedSet.has(permission.code),
      )
      if (picked.length === 0) continue
      const domain = resolveDomain(group.resource)
      const list = byDomain.get(domain)
      const entry = { resource: group.resource, permissions: picked }
      if (list) {
        list.push(entry)
      } else {
        byDomain.set(domain, [entry])
      }
    }
    return PERMISSION_DOMAINS.flatMap((domain) => {
      const entries = byDomain.get(domain)
      return entries ? [{ domain, entries }] : []
    })
  }, [groups, selectedSet])

  const commit = (next: Set<string>) => {
    onChange([...next])
  }

  const toggleOne = (code: string, checked: boolean) => {
    commit(togglePermissionSelection(selectedSet, code, checked))
  }

  const setGroupSelection = (
    actions: readonly Permission[],
    checked: boolean,
  ) => {
    const next = new Set(selectedSet)
    for (const permission of actions) {
      if (checked) next.add(permission.code)
      else next.delete(permission.code)
    }
    commit(next)
  }

  const handleSelectAll = () => {
    const next = new Set(selectedSet)
    for (const group of groups) {
      for (const permission of group.actions) next.add(permission.code)
    }
    commit(next)
  }

  const handleClearAll = () => {
    commit(new Set())
  }

  const toggleExpanded = (resource: string) => {
    setExpandedResources((previous) => {
      const next = new Set(previous)
      if (next.has(resource)) next.delete(resource)
      else next.add(resource)
      return next
    })
  }

  if (loading) {
    return <Skeleton active paragraph={{ rows: 8 }} />
  }

  if (permissions.length === 0) {
    // 目录为空是「没有可配置的权限」，不是加载失败（失败由调用方的 loading/error 态处理），
    // 因此这里用中性空状态，避免把两种语义混成一句会误导排查的提示。
    return <Empty description={t('common.noData')} />
  }

  const actionColumnLabels = COMMON_ACTIONS.map((action) => ({
    action,
    label: getActionLabel(action, t),
  }))

  return (
    <div
      className="role-permission-matrix"
      style={{ display: 'flex', gap: 16 }}
    >
      {/* ───────────────────────── 左栏：业务域导航 ───────────────────────── */}
      <nav
        aria-label={structural('domainNavAria', language)}
        style={{ flex: '0 0 176px', minWidth: 0 }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: 8,
          }}
        >
          <Typography.Text strong ellipsis>
            {structural('domainNavShort', language)}
          </Typography.Text>
          {/* 图标按钮 + aria-label：176px 的左栏放不下「Collapse」这样的文字按钮，
              文字会被挤成多行、标题也被迫折行。可见文案收敛为图标，可访问名仍完整。 */}
          <Tooltip
            title={navCollapsed ? t('common.expand') : t('common.collapse')}
          >
            <Button
              size="small"
              type="text"
              aria-expanded={!navCollapsed}
              aria-controls="role-permission-domain-list"
              aria-label={
                navCollapsed ? t('common.expand') : t('common.collapse')
              }
              icon={
                navCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />
              }
              onClick={() => setNavCollapsed((previous) => !previous)}
            />
          </Tooltip>
        </div>
        {navCollapsed ? null : (
          <ul
            id="role-permission-domain-list"
            style={{ listStyle: 'none', margin: 0, padding: 0 }}
          >
            {PERMISSION_DOMAINS.map((domain) => {
              const definition = getDomainDefinition(domain)
              const label = isZh(language)
                ? definition.labelZh
                : definition.labelEn
              const stats = domainStats.get(domain) ?? { total: 0, selected: 0 }
              const active = domain === activeDomain
              return (
                <li key={domain}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setActiveDomain(domain)}
                    style={{
                      width: '100%',
                      minHeight: 24,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      padding: '6px 8px',
                      marginBottom: 2,
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      textAlign: 'start',
                      fontWeight: active ? 600 : 400,
                      background: active
                        ? 'var(--ant-color-primary-bg)'
                        : 'transparent',
                      color: 'inherit',
                    }}
                  >
                    <span>{label}</span>
                    <Tag
                      color={stats.selected > 0 ? 'blue' : 'default'}
                      style={{ marginInlineEnd: 0 }}
                    >
                      {stats.selected}/{stats.total}
                    </Tag>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </nav>

      {/* ─────────────────────── 中栏：资源 × 动作矩阵 ─────────────────────── */}
      <section
        aria-label={t('system.role.permissions')}
        style={{ flex: '1 1 auto', minWidth: 0 }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            marginBottom: 8,
          }}
        >
          <Input
            allowClear
            prefix={<SearchOutlined />}
            aria-label={t('system.role.permissionSearchPlaceholder')}
            placeholder={t('system.role.permissionSearchPlaceholder')}
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            style={{ maxWidth: 280, minWidth: 180 }}
          />
          <Checkbox
            style={CHECKBOX_TARGET_STYLE}
            checked={onlySelected}
            onChange={(event) => setOnlySelected(event.target.checked)}
          >
            {structural('onlySelected', language)}
          </Checkbox>
          <Typography.Text
            type="secondary"
            style={{ marginInlineStart: 'auto' }}
          >
            {t('system.role.permissionSelectedCount', {
              count: selectedSet.size,
            })}
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
          <Popconfirm
            title={structural('clearConfirmTitle', language)}
            description={structural('clearConfirmContent', language)}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
            onConfirm={handleClearAll}
          >
            <Button size="small" danger disabled={locked}>
              {t('system.role.clearAll')}
            </Button>
          </Popconfirm>
        </div>

        {wildcard ? (
          <div style={{ marginBottom: 8 }}>
            <Typography.Text type="warning">
              {t('system.role.wildcardNotice')}
            </Typography.Text>
          </div>
        ) : null}

        {visibleGroups.length === 0 ? (
          <Empty description={t('common.noData')} />
        ) : (
          <div style={{ maxHeight: 420, overflow: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                tableLayout: 'auto',
              }}
            >
              <thead>
                <tr>
                  <th
                    scope="col"
                    style={{
                      textAlign: 'start',
                      padding: '6px 8px',
                      position: 'sticky',
                      top: 0,
                      background: 'var(--ant-color-bg-container)',
                    }}
                  >
                    {structural('resourceColumn', language)}
                  </th>
                  {actionColumnLabels.map(({ action, label }) => (
                    <th
                      key={action}
                      scope="col"
                      style={{
                        width: 76,
                        padding: '6px 4px',
                        textAlign: 'center',
                        position: 'sticky',
                        top: 0,
                        background: 'var(--ant-color-bg-container)',
                      }}
                    >
                      {label}
                    </th>
                  ))}
                  <th
                    scope="col"
                    style={{
                      width: 96,
                      padding: '6px 4px',
                      textAlign: 'center',
                      position: 'sticky',
                      top: 0,
                      background: 'var(--ant-color-bg-container)',
                    }}
                  >
                    {t('common.more')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleGroups.map((group) => {
                  const resourceLabel = getResourceLabel(group.resource, t)
                  const allSelected = isGroupFullySelected(group, selectedSet)
                  const partial = isGroupPartiallySelected(group, selectedSet)
                  const selectedCount = group.actions.filter((permission) =>
                    selectedSet.has(permission.code),
                  ).length
                  const { common, extras, fields, wildcards } = partitionRow(
                    group.actions,
                  )
                  const detailCount =
                    extras.length + fields.length + wildcards.length
                  const detailId = `role-permission-detail-${group.resource}`
                  const expanded = expandedResources.has(group.resource)
                  return (
                    <Fragment key={group.resource}>
                      <tr>
                        <th
                          scope="row"
                          style={{
                            textAlign: 'start',
                            padding: '6px 8px',
                            fontWeight: 400,
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              minHeight: 24,
                            }}
                          >
                            <Checkbox
                              style={CHECKBOX_TARGET_STYLE}
                              checked={allSelected}
                              indeterminate={partial}
                              disabled={locked}
                              onChange={(event) =>
                                setGroupSelection(
                                  group.actions,
                                  event.target.checked,
                                )
                              }
                            >
                              <span className="aries-sr-only">
                                {`${resourceLabel} ${structural('allPermissionsSuffix', language)}`}
                              </span>
                            </Checkbox>
                            <Typography.Text strong={allSelected}>
                              {resourceLabel}
                            </Typography.Text>
                            {allSelected ? (
                              <Tooltip
                                title={structural(
                                  'wildcardAllActions',
                                  language,
                                )}
                              >
                                <Tag
                                  color="blue"
                                  style={{ marginInlineEnd: 0 }}
                                >
                                  *
                                </Tag>
                              </Tooltip>
                            ) : null}
                            <Typography.Text type="secondary">
                              {selectedCount}/{group.actions.length}
                            </Typography.Text>
                          </span>
                        </th>
                        {COMMON_ACTIONS.map((action) => {
                          const permission = common.get(action)
                          return (
                            <td
                              key={action}
                              style={{
                                padding: '6px 4px',
                                textAlign: 'center',
                              }}
                            >
                              {permission ? (
                                <Checkbox
                                  style={CHECKBOX_TARGET_STYLE}
                                  checked={selectedSet.has(permission.code)}
                                  disabled={locked}
                                  onChange={(event) =>
                                    toggleOne(
                                      permission.code,
                                      event.target.checked,
                                    )
                                  }
                                >
                                  <span className="aries-sr-only">
                                    {`${resourceLabel} ${getActionLabel(action, t)}`}
                                  </span>
                                </Checkbox>
                              ) : (
                                <Typography.Text type="secondary">
                                  —
                                </Typography.Text>
                              )}
                            </td>
                          )
                        })}
                        <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                          {detailCount > 0 ? (
                            <Button
                              size="small"
                              type="link"
                              aria-expanded={expanded}
                              aria-controls={detailId}
                              onClick={() => toggleExpanded(group.resource)}
                            >
                              {t('common.more')} ({detailCount})
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                      {expanded && detailCount > 0 ? (
                        <tr>
                          <td colSpan={1 + COMMON_ACTIONS.length + 1}>
                            <div
                              id={detailId}
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 12,
                                padding: '4px 8px 12px',
                              }}
                            >
                              {wildcards.map((permission) => (
                                <Checkbox
                                  style={CHECKBOX_TARGET_STYLE}
                                  key={permission.code}
                                  checked={selectedSet.has(permission.code)}
                                  disabled={locked}
                                  onChange={(event) =>
                                    toggleOne(
                                      permission.code,
                                      event.target.checked,
                                    )
                                  }
                                >
                                  <span className="aries-sr-only">
                                    {`${resourceLabel} ${structural('wildcardAllActions', language)}`}
                                  </span>
                                  <Tag color="blue">
                                    {structural('wildcardAllActions', language)}
                                  </Tag>
                                </Checkbox>
                              ))}
                              {extras.map((permission) => (
                                <Checkbox
                                  style={CHECKBOX_TARGET_STYLE}
                                  key={permission.code}
                                  checked={selectedSet.has(permission.code)}
                                  disabled={locked}
                                  onChange={(event) =>
                                    toggleOne(
                                      permission.code,
                                      event.target.checked,
                                    )
                                  }
                                >
                                  <span className="aries-sr-only">
                                    {resourceLabel}
                                  </span>
                                  {getActionLabel(permission.action, t)}
                                </Checkbox>
                              ))}
                              {fields.map((permission) => (
                                <Checkbox
                                  style={CHECKBOX_TARGET_STYLE}
                                  key={permission.code}
                                  checked={selectedSet.has(permission.code)}
                                  disabled={locked}
                                  onChange={(event) =>
                                    toggleOne(
                                      permission.code,
                                      event.target.checked,
                                    )
                                  }
                                >
                                  <span className="aries-sr-only">
                                    {resourceLabel}
                                  </span>
                                  <Tag color="purple">
                                    {getPermissionLabel(permission, t)}
                                  </Tag>
                                </Checkbox>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ───────────────────── 右栏：已选权限汇总 ───────────────────── */}
      <aside
        aria-label={structural('selectedSummary', language)}
        style={{ flex: '0 0 240px', minWidth: 0 }}
      >
        <Typography.Text strong>
          {structural('selectedSummary', language)}
        </Typography.Text>
        <Typography.Text type="secondary" style={{ marginInlineStart: 8 }}>
          {selectedSet.size}
        </Typography.Text>
        {summaryByDomain.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('common.noData')}
            style={{ marginTop: 8 }}
          />
        ) : (
          <div style={{ maxHeight: 420, overflow: 'auto', marginTop: 8 }}>
            {summaryByDomain.map(({ domain, entries }) => {
              const definition = getDomainDefinition(domain)
              const label = isZh(language)
                ? definition.labelZh
                : definition.labelEn
              return (
                <div key={domain} style={{ marginBottom: 12 }}>
                  <Typography.Text strong>{label}</Typography.Text>
                  {entries.map((entry) => (
                    <div
                      key={entry.resource}
                      style={{ marginTop: 4, paddingInlineStart: 8 }}
                    >
                      <Typography.Text type="secondary">
                        {getResourceLabel(entry.resource, t)}
                      </Typography.Text>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 4,
                          marginTop: 4,
                        }}
                      >
                        {entry.permissions.map((permission) => (
                          <span
                            key={permission.code}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 2,
                              minHeight: 24,
                            }}
                          >
                            <Tag style={{ marginInlineEnd: 0 }}>
                              {getPermissionLabel(permission, t)}
                            </Tag>
                            <Button
                              size="small"
                              type="text"
                              disabled={locked}
                              icon={<CloseOutlined />}
                              aria-label={`${structural('removeAriaPrefix', language)} ${getResourceLabel(entry.resource, t)} ${getPermissionLabel(permission, t)}`}
                              onClick={() => toggleOne(permission.code, false)}
                            />
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </aside>
    </div>
  )
}
