import type { TFunction } from 'i18next'
import { getPageDefinition } from '@/config/page-registry'
import type { LayoutTab } from '@/stores/layoutTabsStore'

/**
 * 解析标签显示名。
 *
 * <p>标题在渲染期解析：注册表只存 i18n key，避免模块顶层 `t()` 早于 i18n 初始化求值。</p>
 */
export function getTabTitle(tab: LayoutTab, t: TFunction): string {
  const definition = getPageDefinition(tab.pathname)
  if (!definition) {
    return tab.pathname
  }
  return t(definition.titleKey)
}
