import type { MenuProps } from 'antd'
import type { TFunction } from 'i18next'
import { isKnownAppIconKey, resolveAppIcon } from '@/config/app-icons'
import { getPageDefinition } from '@/config/page-registry'
import type { LayoutMenuEntry } from '@/layouts/layout-menu'
import { prefetchPage } from '@/router/page-prefetch'

/**
 * 菜单项「意图预取」：鼠标悬停时就把目标页面的视图 chunk 取回来。
 *
 * <p>页面组件是 `lazy(viewLoaders[view])`，不预热的话首次点开要现下载 chunk
 * （dev 实测 200~300ms），这段时间内容区是骨架 —— 用户感知为「点了才加载」。
 * 悬停预取把这段时间挪到用户"决定点之前"，点下去时 chunk 已在缓存里，直接渲染内容。</p>
 *
 * <p>键盘用户走方向键选择，悬停不会触发；他们仍会看到一次骨架（安全网见
 * `AppTabContainer` 的 Suspense fallback）。这是有意接受的取舍，不是遗漏。</p>
 */
function preloadViewForPath(path?: string | null): void {
  if (!path) {
    return
  }
  const definition = getPageDefinition(path)
  if (definition) {
    // 唯一预热出口：视图 chunk + 列表页首屏数据一起提前取回
    prefetchPage(definition)
  }
}

/**
 * 菜单容器的预取委托：把 hover / focus 事件解析到最近的菜单项，取出其内部
 * `[data-menu-path]` 再预热。
 *
 * <p><b>为什么不在标签 `<span>` 上直接挂 `onMouseEnter`</b>：antd 的菜单项 `<li>` 比文字宽得多，
 * 鼠标落在行的空白处（真实用户很常见）根本不会经过 span，预取永远不会触发 —— 实测悬停 2.5 秒
 * 期间视图 chunk 与列表请求均为 0。改为容器级委托后覆盖整行，键盘焦点（`.ant-menu-item` 获得焦点）
 * 也能走同一个入口。</p>
 */
export function preloadMenuTarget(event: React.SyntheticEvent): void {
  const target = event.target as HTMLElement | null
  const item = target?.closest('.ant-menu-item')
  if (!item) {
    return
  }
  const path =
    item.querySelector<HTMLElement>('[data-menu-path]')?.dataset.menuPath
  if (path) {
    preloadViewForPath(path)
  }
}

/** 给叶子菜单项的文字挂上预取；无 path 的项（纯分组）原样返回字符串。 */
function menuLabel(text: string, path?: string | null): React.ReactNode {
  if (!path) {
    return text
  }
  return (
    <span onMouseEnter={() => preloadViewForPath(path)} data-menu-path={path}>
      {text}
    </span>
  )
}

export function buildMenuPathMap(entries: LayoutMenuEntry[]) {
  const pathMap: Record<string, string> = {}

  const visit = (entry: LayoutMenuEntry) => {
    if (entry.path) {
      pathMap[entry.path] = entry.path
    }
    entry.children.forEach(visit)
  }

  entries.forEach(visit)
  return pathMap
}

export function findMenuParentKeys(
  entries: LayoutMenuEntry[],
  targetKey: string,
  parents: string[] = [],
): string[] | null {
  for (const entry of entries) {
    const currentKeys = [entry.menuCode, entry.path].filter(
      (value): value is string => Boolean(value),
    )
    if (new Set(currentKeys).has(targetKey)) {
      return parents
    }
    if (entry.children.length > 0) {
      const matched = findMenuParentKeys(entry.children, targetKey, [
        ...parents,
        entry.menuCode,
      ])
      if (matched) {
        return matched
      }
    }
  }

  return null
}

export function buildSideMenuItems(
  entries: LayoutMenuEntry[],
  t: TFunction,
): NonNullable<MenuProps['items']> {
  return entries.map((entry) => {
    const Icon = isKnownAppIconKey(entry.icon)
      ? resolveAppIcon(entry.icon)
      : null

    if (entry.children.length > 0) {
      return {
        key: entry.menuCode,
        icon: Icon ? <Icon /> : undefined,
        label: t(entry.titleKey),
        children: entry.children.map((child) => {
          const ChildIcon = isKnownAppIconKey(child.icon)
            ? resolveAppIcon(child.icon)
            : null

          return {
            key: child.path || child.menuCode,
            icon: ChildIcon ? <ChildIcon /> : undefined,
            label: menuLabel(t(child.titleKey), child.path),
          }
        }),
      }
    }

    return {
      key: entry.path || entry.menuCode,
      icon: Icon ? <Icon /> : undefined,
      label: menuLabel(t(entry.titleKey), entry.path),
    }
  })
}

export function buildTopMenuItems(
  entries: LayoutMenuEntry[],
  t: TFunction,
): NonNullable<MenuProps['items']> {
  return entries.map((entry) => ({
    key: entry.path || entry.menuCode,
    label: t(entry.titleKey),
    children: entry.children.length
      ? entry.children.map((child) => ({
          key: child.path || child.menuCode,
          label: menuLabel(t(child.titleKey), child.path),
        }))
      : undefined,
  }))
}
