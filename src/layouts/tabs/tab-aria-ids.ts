/**
 * 标签栏 ARIA 关联所需的稳定 DOM id。
 *
 * <p>真实内容面板由 {@link AppTabContainer} 渲染，标签按钮由 antd Tabs 渲染，两侧必须使用
 * 同一套 id 才能建立 `aria-controls` / `aria-labelledby` 的双向关联。集中在此处定义，
 * 避免两处各写一份前缀而漂移。</p>
 *
 * <p>标签 id 来自 `crypto.randomUUID()` 或 `tab-<base36>-<n>`，均为合法的 HTML id 字符集。</p>
 */
export function tabPanelDomId(tabId: string): string {
  return `leo-tab-panel-${tabId}`
}

export function tabLabelDomId(tabId: string): string {
  return `leo-tab-label-${tabId}`
}
