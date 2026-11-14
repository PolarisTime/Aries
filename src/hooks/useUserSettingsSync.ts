import { useEffect, useState } from 'react'
import { installUserSettingsBindings } from '@/services/user-settings-bindings'
import {
  activateUserSettingsSync,
  bootstrapUserSettings,
} from '@/services/user-settings-sync'
import { useAuthStore } from '@/stores/authStore'

/** 雪花 ID 优先，其次登录名；都没有 = 匿名（只写本地，不发请求）。 */
function resolveUserKey(
  user: { id?: string; loginName?: string } | null | undefined,
): string | null {
  const id = String(user?.id ?? '').trim()
  if (id) return id
  const loginName = String(user?.loginName ?? '').trim()
  return loginName || null
}

export interface UserSettingsSyncResult {
  /** 首次启动读取（GET）是否已完成（成功或失败都算）。UI 一般不需要等它。 */
  ready: boolean
}

/**
 * 启动个人设置跨端同步（docs/client-state-sync.md §5）。
 *
 * <p>在应用根部挂一次即可：它负责「按登录账号激活引擎 + 启动读取一次 + 接线三个分片」。
 * 本地值在读取完成前就已经能渲染（各 store 自己读本地缓存），因此这里返回的 `ready`
 * 只用于需要等待远端覆盖的极少数场景。</p>
 */
export function useUserSettingsSync(): UserSettingsSyncResult {
  const userKey = useAuthStore((state) => resolveUserKey(state.user))
  /*
   * 完成状态与「属于哪个账号」一起存：切换账号时无需在 effect 里同步 setState(false)
   * （那会让 React Compiler 无法优化该 effect），直接按 userKey 比对即可判定是否就绪。
   */
  const [syncedFor, setSyncedFor] = useState<{
    userKey: string | null
    ready: boolean
  }>({ userKey: null, ready: false })

  useEffect(() => {
    let cancelled = false
    activateUserSettingsSync(userKey)
    void bootstrapUserSettings()
      .catch(() => null)
      .finally(() => {
        if (cancelled) return
        /*
         * 绑定必须等 bootstrap 之后再装：启动阶段各 store 的**本地水合**（页签恢复、
         * 设置读取）不是用户改动，先装绑定会把它当成 dirty 上传，反而覆盖服务端已有设置。
         * 水合早于本 effect（子组件 effect 先于父组件），因此这里装绑定不会漏掉用户操作。
         */
        installUserSettingsBindings()
        setSyncedFor({ userKey, ready: true })
      })
    return () => {
      cancelled = true
    }
  }, [userKey])

  return { ready: syncedFor.ready && syncedFor.userKey === userKey }
}
