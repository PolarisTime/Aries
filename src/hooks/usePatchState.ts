import { useReducer } from 'react'

export type PatchStateUpdater<T> = Partial<T> | ((prev: T) => Partial<T>)

/**
 * 弹窗/浮层状态的统一 patch 更新模式：
 * set 传 Partial<T> 直接合并，传函数则基于前一状态计算补丁。
 */
export function usePatchState<T extends object>(
  initialState: T,
): [T, (patch: PatchStateUpdater<T>) => void] {
  const [state, dispatch] = useReducer(
    (prev: T, patch: PatchStateUpdater<T>): T => ({
      ...prev,
      ...(typeof patch === 'function' ? patch(prev) : patch),
    }),
    initialState,
  )
  return [state, dispatch]
}
