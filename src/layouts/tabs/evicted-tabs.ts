import type { TFunction } from 'i18next'
import { message } from '@/utils/antd-app'

/**
 * 超上限淘汰发生后的用户提示。
 *
 * <p>淘汰必须是**可见**的：阶段一已保证持有未保存编辑会话的标签不会被淘汰，但被淘汰的
 * 干净标签仍然代表一次导航上下文丢失，静默消失会让用户以为「页面自己没了」。</p>
 *
 * <p>资源回收（子 Router 与编辑器会话槽）由 {@link AppTabContainer} 的兜底 effect 统一
 * 负责，这里只负责告知，不承担清理职责。</p>
 */
export function notifyEvictedTabs(evictedIds: string[], t: TFunction): void {
  if (!evictedIds.length) {
    return
  }
  message.warning(t('layouts.tabs.evicted', { n: evictedIds.length }))
}
