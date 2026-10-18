import { RouterProvider } from '@tanstack/react-router'
import { Layout } from 'antd'
import { Activity, useEffect, useMemo, useRef } from 'react'
import { AppErrorBoundary } from '@/components/AppErrorBoundary'
import { AppBreadcrumb } from '@/layouts/AppBreadcrumb'
import { EditorSessionScopeProvider } from '@/layouts/editor-session/EditorSessionGuard'
import { editorSessionStore } from '@/layouts/editor-session/editor-session-store'
import { LayoutTabBar } from '@/layouts/tabs/LayoutTabBar'
import { tabLabelDomId, tabPanelDomId } from '@/layouts/tabs/tab-aria-ids'
import {
  attachTabRouter,
  detachTabRouter,
} from '@/layouts/tabs/tab-location-sync'
import { useTabRouteReconciliation } from '@/layouts/tabs/useTabRouteReconciliation'
import { type LayoutTab, useLayoutTabsStore } from '@/stores/layoutTabsStore'

const { Content } = Layout

/**
 * 非激活面板是否改用 React 19 的 `Activity` 承载。
 *
 * <p><b>语义边界（官方语义，实测一致）</b>：`Activity` 在 hidden 时用
 * `display: none !important` 隐藏子树，**销毁子树 effect**，组件 state 与 DOM 全部保留；
 * 恢复时按新挂载重跑一遍 effect setup。它不仅隐藏宿主节点，连子树里的 portal（Modal、
 * Dropdown 等 body 级弹层）也一起隐藏，所以隐藏态的面板在视觉、鼠标与键盘上都不可达。
 * 代价是「只在挂载时跑一次」的 effect 会被重跑，因此**任何初始化都必须是幂等的**：
 * 编辑器初始化已按会话 key 收口（见 src/views/modules/use-module-editor-workspace.ts
 * 的 `initializedEditorKeyRef`），effect 重入不再覆盖用户已改的值。</p>
 *
 * <p>出问题时可以把开关拨回 `false`：退回「已挂载面板常驻 DOM + `hidden` 属性显隐」的旧行为，
 * 其余逻辑（激活即已挂载不变式、Router 回收）两条路径共用。</p>
 */
export const TAB_PANEL_ACTIVITY_ENABLED = true

/** 单个面板内的子 Router 挂载点；reloadKey 变化时经 key 重建（「刷新当前页」） */
function TabPanelRouter({ tab }: { tab: LayoutTab }) {
  // attach 幂等：同 tabId 返回既有实例；reloadKey 变化时内部先 detach 再重建
  const router = useMemo(() => attachTabRouter(tab), [tab])
  return <RouterProvider router={router} />
}

/**
 * 多标签页内容容器：替代原 <Outlet key={openPageKey}> 强制重挂载方案。
 * 已挂载过的 Tab 常驻 DOM（非激活时隐藏），实现表单/筛选/滚动位置保留；
 * 当前激活的 Tab 无论是否挂载过都立即渲染（激活即挂载），
 * 其余恢复自持久化的 Tab 保持惰性，首次激活才创建子 Router。
 *
 * <p><b>非激活面板已由 React 19 的 `Activity` 收口</b>（开关见
 * {@link TAB_PANEL_ACTIVITY_ENABLED}）。此前记录的「已知瑕疵」——Activity 会销毁子树 effect，
 * 把面板套进 `<Activity mode="hidden">` 后 tests/e2e/navigation.spec.ts 的 P2-25 在
 * 「切回后草稿仍在」变红——已经定位为**真 bug 而非 Activity 的副作用**：编辑器初始化写成
 * 「挂载即初始化」（setup 里 `form.resetFields()` + 灌默认值），任何 effect 重入
 * （StrictMode 双调用、Activity 隐藏→恢复、父级重渲染换 config 身份）都会把用户已改的值重置。
 * 收口方式：初始化按会话 key（`moduleKey:实体 id:open`，见
 * use-module-editor-workspace.ts 的 `initializeEditor`）幂等，重置移到「会话结束（open 收回 false）」
 * 的清理侧。因此 Activity 带来的语义变化只有一条：**state/DOM 保留、effect 销毁重跑**，
 * 凡是挂在 effect 上的初始化都必须幂等，不要再写「挂载即初始化」。</p>
 *
 * <p>隐藏态的两个附带要求同样由 Activity 的语义满足：面板内的 Modal/Dropdown（portal 到 body）
 * 随子树一起被 `display:none` 隐藏，视觉、指针与键盘都不可达；面板的焦点陷阱
 * （useFocusTrap）随 effect 销毁而摘掉监听，不会在别的标签里抢 Tab 键，恢复时才重新武装。</p>
 */
export function AppTabContainer() {
  const tabs = useLayoutTabsStore((state) => state.tabs)
  const activeTabId = useLayoutTabsStore((state) => state.activeTabId)

  useTabRouteReconciliation()

  /**
   * 不变式：**激活的标签一定"已挂载过"**。
   *
   * <p>本组件在激活时无条件渲染该标签的面板（见下方 `mounted` 计算），因此提交后必须把它记为
   * {@link LayoutTab.mountedOnce}，否则该标签一旦转成非激活，面板就被**卸载重建**，它的筛选草稿、
   * 已打开的编辑浮层与未保存编辑会话一起丢失（用户口述的"点新标签后整页重载"）。</p>
   *
   * <p>原先漏记的那条路径（`hydrateForUser` 为当前深链新建/选中的标签）已由两处根治：
   * hydrate 改在布局阶段执行（use-layout-tabs-hydration.ts，严格早于本组件的被动 effect），
   * 建标签统一走幂等入口 `ensureTabForLocation`（同 pathname 只会有一个标签对象）。这里保留
   * "激活即已挂载"作为结果不变式，与上述两处互为保险。`markTabMounted` 对已标记者是 no-op，
   * 不会形成渲染环。</p>
   */
  useEffect(() => {
    if (!activeTabId) return
    useLayoutTabsStore.getState().markTabMounted(activeTabId)
  }, [activeTabId])

  /**
   * 兜底资源回收：任何让 Tab 消失的路径（关闭、超上限淘汰、hydration 截断、切换用户）
   * 都要释放它的子 Router 与编辑器会话槽。
   *
   * <p>关闭路径已在 LayoutTabBar 显式 detach；这里再收敛一次是为了覆盖「超上限淘汰」——
   * 淘汰发生在 store 内部，调用方拿不到时机。放在 effect 而非调用点，可保证 React 完成
   * 卸载后才 dispose，不会对已销毁的 Router 继续渲染。</p>
   *
   * <p>`detachTabRouter` 与 `endSession` 都是幂等的（对不存在的 id 是 no-op），
   * 因此与关闭路径重复执行无害。</p>
   */
  const previousTabIdsRef = useRef<string[]>([])
  useEffect(() => {
    const currentIds = new Set(tabs.map((tab) => tab.id))
    for (const tabId of previousTabIdsRef.current) {
      if (!currentIds.has(tabId)) {
        detachTabRouter(tabId)
        editorSessionStore.endSession(tabId)
      }
    }
    previousTabIdsRef.current = tabs.map((tab) => tab.id)
  }, [tabs])

  return (
    /*
     * `id` + `tabIndex={-1}` 是 Skip link 的落点：跳转后焦点必须真的进到内容区，
     * 否则键盘用户按「跳到主要内容」后焦点仍停在页眉，等于没跳。
     */
    <Content id="main-content" tabIndex={-1} className="leo-content">
      <LayoutTabBar />
      <AppBreadcrumb />
      <div className="leo-content-inner leo-tab-viewport">
        {tabs.map((tab) => {
          const mounted = tab.mountedOnce || tab.id === activeTabId
          const isActive = tab.id === activeTabId
          /* 面板外壳始终存在, 内容仍按需挂载(恢复自持久化的标签保持惰性)。
             若外壳也惰性渲染, 非激活标签的 aria-controls 会指向不存在的元素,
             形成悬空引用 —— 实测 Playwright 可复现。 */
          const content = mounted ? (
            <AppErrorBoundary resetKey={`${tab.id}:${tab.reloadKey}`}>
              <EditorSessionScopeProvider tabId={tab.id}>
                <TabPanelRouter key={`${tab.id}:${tab.reloadKey}`} tab={tab} />
              </EditorSessionScopeProvider>
            </AppErrorBoundary>
          ) : null
          return (
            <div
              key={tab.id}
              /* 真实内容面板才是 tab 的 panel：rc-tabs 自己渲染的面板是空的,
                 且被 CSS 整体隐藏(见 layout-shell.css 的 .ant-tabs-body-holder)。
                 刻意不加 tabIndex —— APG 只在面板内无可聚焦元素时才要求 tabindex="0",
                 而本项目面板内有表单与表格, Tab 键会自然落到其中。 */
              id={tabPanelDomId(tab.id)}
              role="tabpanel"
              aria-labelledby={tabLabelDomId(tab.id)}
              /* 走 Activity 时显隐交给 Activity 的内联 display:none !important，这里**不能**
                 再设 hidden 属性：Activity 恢复只清内联 display，属性还留着的话恢复后依旧不可见；
                 关掉开关时退回属性显隐。另给出「哪个面板是激活的」稳定锚点：
                 Activity 隐藏态没有 hidden 属性可判，纯 DOM 查询会误选隐藏面板。 */
              hidden={TAB_PANEL_ACTIVITY_ENABLED ? undefined : !isActive}
              data-tab-active={isActive ? 'true' : undefined}
              className="leo-tab-panel"
            >
              {TAB_PANEL_ACTIVITY_ENABLED ? (
                <Activity mode={isActive ? 'visible' : 'hidden'}>
                  {content}
                </Activity>
              ) : (
                content
              )}
            </div>
          )
        })}
      </div>
    </Content>
  )
}
