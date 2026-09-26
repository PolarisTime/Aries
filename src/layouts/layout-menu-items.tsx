import type { MenuProps } from 'antd'
import type { TFunction } from 'i18next'
import { isKnownAppIconKey, resolveAppIcon } from '@/config/app-icons'
import type { LayoutMenuEntry } from '@/layouts/layout-menu'

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
            label: t(child.titleKey),
          }
        }),
      }
    }

    return {
      key: entry.path || entry.menuCode,
      icon: Icon ? <Icon /> : undefined,
      label: t(entry.titleKey),
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
          label: t(child.titleKey),
        }))
      : undefined,
  }))
}
