import { useState } from 'react'

/**
 * 列显隐状态。
 *
 * <p>工具栏是开关语义（勾选/取消），列头右键只有「隐藏」一种动作，两者共用一个写入口，
 * 避免隐藏规则各写一份而漂移。抽成独立 hook 是为了让页面主组件专注于列表与编辑器编排。</p>
 */
export function useProjectColumnVisibility(initialHiddenKeys: string[]) {
  const [hiddenColumnKeys, setHiddenColumnKeys] =
    useState<string[]>(initialHiddenKeys)

  const setColumnHidden = (key: string, hidden: boolean) => {
    setHiddenColumnKeys((previous) => {
      const next = previous.filter((item) => item !== key)
      return hidden ? [...next, key] : next
    })
  }

  return {
    hiddenColumnKeys,
    toggleColumn: (key: string) => {
      setColumnHidden(key, !hiddenColumnKeys.includes(key))
    },
    hideColumn: (key: string) => setColumnHidden(key, true),
  }
}
