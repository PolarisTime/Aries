import { useLayoutEffect, useRef } from 'react'
import { detachAllTabRouters } from '@/layouts/tabs/tab-location-sync'
import {
  normalizeTabPathname,
  useLayoutTabsStore,
} from '@/stores/layoutTabsStore'

export interface LayoutTabsHydrationInput {
  /** 认证状态就绪（未就绪前不恢复，避免按匿名键读到错误清单） */
  authReady: boolean
  /** 当前登录用户 id；为空表示未登录 */
  userId: string
  /** 当前主路由位置，用于"首次打开的深链优先于上次工作区" */
  location: { pathname: string; searchStr: string }
}

/**
 * 恢复某个用户持久化的标签页清单——**在子容器的被动 effect 之前完成**。
 *
 * <p>为什么必须是布局阶段：`AppTabContainer` 是 `AppLayout` 的子节点，React 会**先跑子组件
 * 的 effect**。改造前这里用的是 `useEffect`，于是 `useTabRouteReconciliation` 的定位 effect
 * 先为当前深链建了标签 X（并 `markTabMounted`），恢复逻辑随后用持久化清单整体覆盖 store、
 * 又建了一个同路径的 Y，X 连同它的 `mountedOnce` 被静默丢弃——这正是"深链落地标签转非激活
 * 即整块面板卸载重建"的根因。布局阶段（React 提交 DOM 之后、**所有**被动 effect 之前）执行，
 * 就严格早于子容器的定位 effect，竞态在结构上不再成立；同时因为随后在浏览器绘制前完成，
 * 也不会出现"先闪一版未恢复的页签"。</p>
 *
 * <p>与改造前 `useEffect` 版本语义一致：每个用户只恢复一次（`hydratedUserRef` 守卫），
 * 切换用户时先销毁上一会话残留的子 Router，再按持久化清单恢复。</p>
 */
export function useLayoutTabsHydration({
  authReady,
  userId,
  location,
}: LayoutTabsHydrationInput): void {
  const hydratedUserRef = useRef('')

  useLayoutEffect(() => {
    if (!authReady || !userId) {
      hydratedUserRef.current = ''
      return
    }
    if (hydratedUserRef.current === userId) {
      return
    }
    hydratedUserRef.current = userId
    // 切换用户/重新登录时销毁上一会话残留的子 Router 实例，避免内存泄漏
    detachAllTabRouters()
    useLayoutTabsStore.getState().hydrateForUser(userId, {
      pathname: normalizeTabPathname(location.pathname),
      search: location.searchStr,
    })
  }, [authReady, location.pathname, location.searchStr, userId])
}
