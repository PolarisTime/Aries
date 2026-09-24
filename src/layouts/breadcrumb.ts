import type { TFunction } from 'i18next'
import { menuGroupDefinitions } from '@/config/navigation-registry'
import { appPageDefinitions } from '@/config/page-registry'

export interface BreadcrumbItem {
  /** 面包屑文案(已本地化)。 */
  title: string
  /** 可跳转路径; 根节点/分组/当前页不可跳转时为 undefined。 */
  path?: string
  /** 是否为当前页(末项, 不可点击)。 */
  current: boolean
}

/** 工作台为业务根页面, 面包屑根节点指向它而非无路由的 '/'。 */
const ROOT_PAGE_PATH = '/dashboard'

/** 页面 key -> 定义, 供按 pathname 反查层级。 */
const pageByMenuKey = new Map(
  appPageDefinitions.map(
    (entry) => [normalizePath(entry.menuKey), entry] as const,
  ),
)

function normalizePath(pathname: string): string {
  const normalized = String(pathname || '').replace(/\/+$/, '')
  return normalized || '/'
}

/**
 * 面包屑层级解析: 由当前路由 pathname 反查页面定义, 生成
 * `业务中心 / <菜单分组?> / <页面标题>`。
 *
 * <p>根节点指向工作台(可点击); 分组无独立路由, 仅展示层级; 当前页(末项)不可点击。
 * 未匹配到页面定义时退化为 `业务中心 / <pathname>`, 保证不出现空面包屑。</p>
 */
export function resolveBreadcrumbItems(
  pathname: string,
  t: TFunction,
): BreadcrumbItem[] {
  const normalizedPath = normalizePath(pathname)
  const isRoot = normalizedPath === ROOT_PAGE_PATH
  if (isRoot) {
    // 工作台即业务根, 仅展示根节点且不可跳转。
    return [{ title: t('layouts.sideNav.root'), current: false }]
  }

  const root: BreadcrumbItem = {
    title: t('layouts.sideNav.root'),
    current: false,
    path: ROOT_PAGE_PATH,
  }
  const definition = pageByMenuKey.get(normalizedPath)
  if (!definition) {
    return [root, { title: normalizedPath, current: true }]
  }

  const items: BreadcrumbItem[] = [root]
  const parentKey = definition.menuParent
  if (parentKey) {
    const group = menuGroupDefinitions[parentKey]
    if (group) {
      // 分组无独立路由, 仅展示层级不可跳转。
      items.push({ title: group.title, current: false })
    }
  }
  items.push({ title: definition.title, current: true })
  return items
}
