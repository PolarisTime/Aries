import { useLocation, useRouter } from '@tanstack/react-router'
import { Tabs } from 'antd'
import { type ReactNode, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { AppPageDefinition } from '@/config/page-registry'
import { getPageDefinition } from '@/config/page-registry'
import { usePermissions } from '@/hooks/usePermission'
import { hasPermission } from '@/utils/permission'
import './master-host-tabs.css'

/**
 * 宿主页（把若干「基础数据」子页面并进一个页面）的标签页基元。
 *
 * <p><b>唯一口径</b>：标签声明（key ↔ 页面定义）、权限过滤、选中标签推导、切标签写
 * `?tab=` 都只在这里实现一次；material / project 两个宿主页只声明自己的标签清单与内容，
 * 不各写一套。</p>
 *
 * <p><b>为什么切标签只改查询串、不改 pathname</b>：shell 的多标签页按 pathname 去重
 * （layoutTabsStore 的 `setTabLocation` 不变式：一个 pathname 只归一个外壳标签），
 * 从 /material-categories 深链去 `navigate({ to: '/material' })` 会被判成「改标签的
 * pathname」，与已存在的 /material 标签冲突后被打回，标签点击看起来没反应。
 * 只改 `?tab=` 则始终留在当前外壳标签内，深链路径也能正常切标签。</p>
 *
 * <p><b>深链</b>：/material-categories、/length-premium、/value-alias、/quote-region
 * 的页面定义 view 指向宿主页，因此直接访问这些路径会渲染宿主页；默认标签由 pathname
 * 推导（`getPageDefinition(pathname)` 的 key），有 `?tab=` 时以 `?tab=` 为准。</p>
 */

/** 宿主页标签声明：`key` 同时是 `?tab=` 的取值，`pageKey` 指向页面定义（标题 / 权限）。 */
export interface MasterHostTabSpec {
  key: string
  pageKey: string
}

export interface ResolvedMasterHostTab {
  key: string
  pageDef: AppPageDefinition
}

/** 取页面定义；注册表缺项是配置错误，直接抛出而不是渲染空白。 */
export function requirePageDefinition(key: string): AppPageDefinition {
  const pageDef = getPageDefinition(key)
  if (!pageDef) {
    throw new Error(`未找到页面定义: ${key}`)
  }
  return pageDef
}

/** 按权限过滤标签：与布局菜单共用 `hasPermission` 口径，无权限的标签不渲染。 */
export function resolveVisibleMasterHostTabs(
  specs: readonly MasterHostTabSpec[],
  permissions: readonly string[],
): ResolvedMasterHostTab[] {
  const visibleTabs: ResolvedMasterHostTab[] = []
  for (const spec of specs) {
    const pageDef = requirePageDefinition(spec.pageKey)
    if (hasPermission(permissions, pageDef.requiredPermission)) {
      visibleTabs.push({ key: spec.key, pageDef })
    }
  }
  return visibleTabs
}

/**
 * 选中标签的推导顺序：`?tab=`（仅当有权限且存在）→ pathname 对应的页面 → 首个可见标签。
 *
 * <p>无权限 / 未知的 `?tab=` 只影响渲染，不回写 URL：写入会在渲染期改历史，
 * 用户刷新或复制地址时会得到与看到的不一致的值。</p>
 */
export function resolveActiveMasterHostTabKey(options: {
  requestedTab?: string
  pathnameKey?: string
  visibleKeys: readonly string[]
}): string {
  const { requestedTab, pathnameKey, visibleKeys } = options
  if (requestedTab && visibleKeys.includes(requestedTab)) {
    return requestedTab
  }
  if (pathnameKey && visibleKeys.includes(pathnameKey)) {
    return pathnameKey
  }
  return visibleKeys[0] ?? ''
}

/** 宿主页标签状态：可见标签、当前标签、切换动作（写 `?tab=`，保留其它查询参数）。 */
export function useMasterHostTabsState(specs: readonly MasterHostTabSpec[]) {
  const location = useLocation()
  const router = useRouter()
  const permissions = usePermissions()

  const requestedTab = readRequestedTab(location.searchStr)
  const pathnameKey = getPageDefinition(location.pathname)?.key
  const tabs = resolveVisibleMasterHostTabs(specs, permissions)
  const activeKey = resolveActiveMasterHostTabKey({
    requestedTab,
    pathnameKey,
    visibleKeys: tabs.map((tab) => tab.key),
  })

  const switchTab = useCallback(
    (key: string) => {
      // 保留 docNo / create 等深链意图参数，只改 tab。
      const params = new URLSearchParams(location.searchStr)
      params.set('tab', key)
      router.history.push(`${location.pathname}?${params.toString()}`)
    },
    [location.pathname, location.searchStr, router],
  )

  return { tabs, activeKey, switchTab }
}

function readRequestedTab(searchStr: string): string | undefined {
  const tab = new URLSearchParams(searchStr).get('tab')
  return tab?.trim() ? tab : undefined
}

interface MasterHostTabsProps {
  tabs: readonly ResolvedMasterHostTab[]
  activeKey: string
  onChange: (key: string) => void
  renderTab: (tab: ResolvedMasterHostTab) => ReactNode
}

/**
 * 宿主页外壳：标签条 + 面板。面板内容由调用方按标签渲染，本组件只管标签语义与布局。
 *
 * <p>高度链（见 master-host-tabs.css）让面板内的表格页仍按「整页填充 + 内部滚动」表现，
 * 与合并前的独立页面一致。</p>
 */
export function MasterHostTabs({
  tabs,
  activeKey,
  onChange,
  renderTab,
}: MasterHostTabsProps) {
  const { t } = useTranslation()

  return (
    <div className="master-host-tabs">
      <Tabs
        activeKey={activeKey}
        onChange={onChange}
        items={tabs.map((tab) => ({
          key: tab.key,
          label: t(tab.pageDef.titleKey),
          children: renderTab(tab),
        }))}
      />
    </div>
  )
}
