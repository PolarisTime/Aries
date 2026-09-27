import { createContext } from 'react'

/**
 * 「列设置」弹层的打开请求。
 *
 * <p>列头右键菜单里有一项「列设置…」, 但弹层与其开合状态由工具栏所在的组件持有;
 * 该组件在表格外层提供本上下文, 菜单渲染时按需取用: 取不到就不展示该项。</p>
 */
export const ColumnSettingsRequestContext = createContext<(() => void) | null>(
  null,
)
