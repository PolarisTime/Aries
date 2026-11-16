// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS } from '@/constants/storage'

const getUserAccountSettingsMock = vi.hoisted(() => vi.fn())
const saveUserAccountSettingsMock = vi.hoisted(() => vi.fn())
const messageWarningMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/system/user-preferences', () => ({
  getUserAccountSettings: getUserAccountSettingsMock,
  saveUserAccountSettings: saveUserAccountSettingsMock,
}))
vi.mock('@/utils/antd-app', () => ({
  message: {
    warning: messageWarningMock,
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}))
vi.mock('@/utils/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}))

import {
  activateUserSettingsSync,
  bootstrapUserSettings,
  flushUserSettings,
  getUserSettingsSyncSnapshot,
  loadUserAccountSettings,
  mergeUserSectionValues,
  patchUserSection,
  readSection,
  resetUserSettingsSyncForTests,
  subscribeUserSection,
} from './user-settings-sync'

const MIRROR_KEY = (userKey: string) =>
  `${STORAGE_KEYS.userSettingsPrefix}${userKey}`

function signIn(id: string) {
  window.localStorage.setItem(
    STORAGE_KEYS.user,
    JSON.stringify({ id, loginName: id }),
  )
}

function emptySettings() {
  return { version: 2, sections: {}, pages: {} }
}

function mirrorOf(userKey: string): {
  sections: Record<string, { value: unknown }>
} {
  const raw = window.localStorage.getItem(MIRROR_KEY(userKey))
  return raw ? JSON.parse(raw) : { sections: {} }
}

/** 排空微任务（mock 的 Promise 在假定时器下要显式推进）。 */
async function settle() {
  await vi.advanceTimersByTimeAsync(0)
}

describe('用户设置同步引擎', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.localStorage.clear()
    resetUserSettingsSyncForTests()
    getUserAccountSettingsMock.mockReset()
    saveUserAccountSettingsMock.mockReset()
    messageWarningMock.mockReset()
    getUserAccountSettingsMock.mockResolvedValue(emptySettings())
    saveUserAccountSettingsMock.mockResolvedValue(emptySettings())
    signIn('u1')
  })

  afterEach(() => {
    resetUserSettingsSyncForTests()
    vi.useRealTimers()
  })

  it('1s 防抖把同一窗口内的多个分片合并成一次 PUT', async () => {
    activateUserSettingsSync('u1')
    await bootstrapUserSettings()
    await settle()
    saveUserAccountSettingsMock.mockClear()

    patchUserSection('ui', { fontSize: 15 })
    patchUserSection('ui', { themeMode: 'dark' })
    patchUserSection('layoutTabs', {
      tabs: [{ pathname: '/dashboard' }],
      activeTabPath: '/dashboard',
    })

    // 防抖窗口内不发送
    expect(saveUserAccountSettingsMock).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1000)

    expect(saveUserAccountSettingsMock).toHaveBeenCalledTimes(1)
    const payload = saveUserAccountSettingsMock.mock.calls[0]?.[0] as Record<
      string,
      { value: unknown }
    >
    expect(Object.keys(payload).sort()).toEqual(['layoutTabs', 'ui'])
    // 同一分片内的多次 patch 合并成一个值
    expect(payload.ui?.value).toMatchObject({ fontSize: 15, themeMode: 'dark' })
    expect(getUserSettingsSyncSnapshot().dirty).toEqual([])
  })

  it('启动阶段（远端未到）的本地值：服务端没有该分片时才上传', async () => {
    activateUserSettingsSync('u1')
    // 模拟「本地有、服务端空」：先写本地镜像再启动
    window.localStorage.setItem(
      MIRROR_KEY('u1'),
      JSON.stringify({
        sections: {
          ui: {
            value: { fontSize: 18 },
            clientUpdatedAt: '2026-11-01T00:00:00Z',
          },
        },
      }),
    )
    activateUserSettingsSync(null)
    activateUserSettingsSync('u1')

    await bootstrapUserSettings()
    await settle()
    await vi.advanceTimersByTimeAsync(1000)

    expect(saveUserAccountSettingsMock).toHaveBeenCalledTimes(1)
    const payload = saveUserAccountSettingsMock.mock.calls[0]?.[0] as Record<
      string,
      { value: unknown }
    >
    expect(payload.ui?.value).toEqual({ fontSize: 18 })
  })

  it('启动阶段本地改动不覆盖服务端已有分片（远端赢）', async () => {
    getUserAccountSettingsMock.mockResolvedValue({
      version: 2,
      sections: {
        ui: {
          value: { fontSize: 12 },
          clientUpdatedAt: '2026-11-10T00:00:00Z',
        },
      },
      pages: {},
    })
    activateUserSettingsSync('u1')
    patchUserSection('ui', { fontSize: 30 })
    await bootstrapUserSettings()
    await settle()

    expect(readSection('ui')).toEqual({ fontSize: 12 })
    // 远端已给出该分片，不应把它当成 dirty 上传
    await vi.advanceTimersByTimeAsync(1000)
    expect(saveUserAccountSettingsMock).not.toHaveBeenCalled()
  })

  it('离线时保留 dirty，online 事件立即补发', async () => {
    activateUserSettingsSync('u1')
    await bootstrapUserSettings()
    await settle()
    saveUserAccountSettingsMock.mockClear()

    const navigatorSpy = vi
      .spyOn(window.navigator, 'onLine', 'get')
      .mockReturnValue(false)
    patchUserSection('ui', { fontSize: 17 })
    await vi.advanceTimersByTimeAsync(1000)
    expect(saveUserAccountSettingsMock).not.toHaveBeenCalled()
    expect(getUserSettingsSyncSnapshot().dirty).toEqual(['ui'])

    navigatorSpy.mockReturnValue(true)
    window.dispatchEvent(new Event('online'))
    await settle()

    expect(saveUserAccountSettingsMock).toHaveBeenCalledTimes(1)
    expect(getUserSettingsSyncSnapshot().dirty).toEqual([])
    navigatorSpy.mockRestore()
  })

  it('网络失败按 1s/2s/4s 指数退避重试且不清空 dirty', async () => {
    activateUserSettingsSync('u1')
    await bootstrapUserSettings()
    await settle()
    saveUserAccountSettingsMock.mockReset()
    saveUserAccountSettingsMock.mockRejectedValue(new Error('network down'))

    patchUserSection('ui', { fontSize: 16 })
    await vi.advanceTimersByTimeAsync(1000)
    expect(saveUserAccountSettingsMock).toHaveBeenCalledTimes(1)

    // 第 1 次重试：+1s
    await vi.advanceTimersByTimeAsync(1000)
    expect(saveUserAccountSettingsMock).toHaveBeenCalledTimes(2)

    // 第 2 次重试：+2s
    await vi.advanceTimersByTimeAsync(2000)
    expect(saveUserAccountSettingsMock).toHaveBeenCalledTimes(3)

    // 第 3 次重试：+4s（不是固定 1s）
    await vi.advanceTimersByTimeAsync(3999)
    expect(saveUserAccountSettingsMock).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(1)
    expect(saveUserAccountSettingsMock).toHaveBeenCalledTimes(4)
    expect(getUserSettingsSyncSnapshot().dirty).toEqual(['ui'])
  })

  it('409 冲突：采用服务端值并提示，不再重试本次批量', async () => {
    activateUserSettingsSync('u1')
    await bootstrapUserSettings()
    await settle()
    saveUserAccountSettingsMock.mockClear()
    /*
     * 真实后端（leo UserSettingsConflictException）的 409 形状：
     * `sections` 是冲突分片**列表**，分片值在 `serverValue` 映射里。
     * 这里用真形状钉住解析（旧用例用的是 `sections` 对象映射，与后端不一致）。
     */
    saveUserAccountSettingsMock.mockRejectedValue({
      response: {
        status: 409,
        data: {
          status: 409,
          sections: ['ui'],
          serverValue: {
            ui: {
              value: { fontSize: 20, themeMode: 'light' },
              clientUpdatedAt: '2026-11-12T00:00:00Z',
            },
          },
        },
      },
    })

    patchUserSection('ui', { fontSize: 16 })
    await vi.advanceTimersByTimeAsync(1000)
    await settle()

    expect(messageWarningMock).toHaveBeenCalledTimes(1)
    expect(readSection('ui')).toEqual({ fontSize: 20, themeMode: 'light' })
    expect(getUserSettingsSyncSnapshot().dirty).toEqual([])

    // 冲突不重试：再等 2s 也不会再发
    await vi.advanceTimersByTimeAsync(2000)
    expect(saveUserAccountSettingsMock).toHaveBeenCalledTimes(1)
  })

  /*
   * 服务端存着「未来时间戳」的脏数据（dev 库实测 ui.clientUpdatedAt = 2030-01-01）。
   *
   * 不加保护时：客户端用 new Date() 提交 → 服务端判 incoming < existing → 每次 409 →
   * 每次都"采用服务端值 + 弹提示"，这个分片永远写不回去。契约：采用服务端值之后，
   * 下一次提交的时间戳必须**严格大于**服务端那个未来时间戳，才能自愈。
   */
  it('服务端时间戳在未来（历史脏数据）时，下一次提交必须比它更新，否则该分片永久 409', async () => {
    activateUserSettingsSync('u1')
    await bootstrapUserSettings()
    await settle()
    saveUserAccountSettingsMock.mockClear()

    saveUserAccountSettingsMock.mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          status: 409,
          sections: ['ui'],
          serverValue: {
            ui: {
              value: { fontSize: 20 },
              clientUpdatedAt: '2030-01-01T00:00:00Z',
            },
          },
        },
      },
    })

    patchUserSection('ui', { fontSize: 16 })
    await vi.advanceTimersByTimeAsync(1000)
    await settle()
    expect(readSection('ui')).toEqual({ fontSize: 20 })

    // 采用服务端值后再改一次：时间戳必须追上 2030，否则服务端仍会 409
    saveUserAccountSettingsMock.mockResolvedValue(emptySettings())
    patchUserSection('ui', { fontSize: 18 })
    await vi.advanceTimersByTimeAsync(1000)
    await settle()

    const sent = saveUserAccountSettingsMock.mock.calls.at(-1)?.[0] as Record<
      string,
      { clientUpdatedAt: string }
    >
    expect(Date.parse(sent.ui.clientUpdatedAt)).toBeGreaterThan(
      Date.parse('2030-01-01T00:00:00Z'),
    )
  })

  /*
   * 真实链路上的 409 形状：全局拦截器（auth-interceptor）会把 axios 错误重包成
   * `new Error(detail)`，只把 status / code / details 挂在新错误上 —— `response` 已经没了。
   * 只读 `error.response.status` 的旧实现会把这个 409 当成"通用失败"，进入指数退避重试：
   * 每 1/2/4… 秒发一次、每次弹一条提示，而设置永远同步不上去（实测就是这样）。
   * 这里用**拦截器包装后的形状**钉住：要能识别 409、读到 serverValue、采用服务端值、只提示一次、不重试。
   */
  it('识别拦截器包装后的 409（status/details 挂在 Error 上）：采用服务端值且不重试', async () => {
    activateUserSettingsSync('u1')
    await bootstrapUserSettings()
    await settle()
    saveUserAccountSettingsMock.mockClear()

    const wrapped = Object.assign(
      new Error(
        '设置已在其他设备更新，请采用服务端值：layoutTabs、supplierQuote',
      ),
      {
        status: 409,
        code: 4090,
        details: {
          status: 409,
          sections: ['layoutTabs', 'supplierQuote'],
          serverValue: {
            supplierQuote: {
              value: { openSupplierIds: ['srv-1'], activeSupplierId: 'srv-1' },
              clientUpdatedAt: '2026-11-16T08:25:27.977Z',
            },
          },
        },
      },
    )
    saveUserAccountSettingsMock.mockRejectedValueOnce(wrapped)

    patchUserSection('supplierQuote', { activeSupplierId: 'local-1' })
    await vi.advanceTimersByTimeAsync(1000)
    await settle()

    expect(readSection('supplierQuote')).toMatchObject({
      activeSupplierId: 'srv-1',
    })
    expect(messageWarningMock).toHaveBeenCalledTimes(1)
    expect(getUserSettingsSyncSnapshot().dirty).toEqual([])

    // 不再重试（旧行为会 1s/2s/4s 反复发）
    await vi.advanceTimersByTimeAsync(4000)
    expect(saveUserAccountSettingsMock).toHaveBeenCalledTimes(1)
  })

  it('413 超限：停用该分片、本地仍可用、不再重试', async () => {
    activateUserSettingsSync('u1')
    await bootstrapUserSettings()
    await settle()
    saveUserAccountSettingsMock.mockClear()
    saveUserAccountSettingsMock.mockRejectedValue({
      response: { status: 413, data: {} },
    })

    patchUserSection('ui', { huge: 'x'.repeat(40 * 1024) })
    await vi.advanceTimersByTimeAsync(1000)
    await settle()

    expect(getUserSettingsSyncSnapshot().disabled).toEqual(['ui'])
    expect(messageWarningMock).toHaveBeenCalledTimes(1)
    // 本地仍然生效
    expect((readSection('ui') as { huge?: string }).huge).toHaveLength(
      40 * 1024,
    )

    patchUserSection('ui', { fontSize: 18 })
    await vi.advanceTimersByTimeAsync(1000)
    expect(saveUserAccountSettingsMock).toHaveBeenCalledTimes(1)
  })

  it('401 未认证：只写本地，不重试、不提示', async () => {
    activateUserSettingsSync('u1')
    await bootstrapUserSettings()
    await settle()
    saveUserAccountSettingsMock.mockClear()
    saveUserAccountSettingsMock.mockRejectedValue({
      response: { status: 401, data: {} },
    })

    patchUserSection('ui', { fontSize: 19 })
    await vi.advanceTimersByTimeAsync(1000)
    await settle()

    expect(messageWarningMock).not.toHaveBeenCalled()
    expect(readSection('ui')).toEqual({ fontSize: 19 })
    await vi.advanceTimersByTimeAsync(5000)
    expect(saveUserAccountSettingsMock).toHaveBeenCalledTimes(1)
  })

  it('本地镜像按账号隔离，切换账号不会串号', async () => {
    activateUserSettingsSync('u1')
    await bootstrapUserSettings()
    await settle()
    patchUserSection('ui', { fontSize: 15 })
    await vi.advanceTimersByTimeAsync(1000)

    expect(mirrorOf('u1').sections.ui?.value).toEqual({ fontSize: 15 })

    signIn('u2')
    activateUserSettingsSync('u2')
    expect(readSection('ui')).toBeNull()

    patchUserSection('layoutTabs', { tabs: [], activeTabPath: '/dashboard' })
    await vi.advanceTimersByTimeAsync(1000)
    expect(mirrorOf('u2').sections.layoutTabs?.value).toEqual({
      tabs: [],
      activeTabPath: '/dashboard',
    })
    // u1 的镜像不受影响
    expect(mirrorOf('u1').sections.ui?.value).toEqual({ fontSize: 15 })
  })

  it('旧键一次性迁移：读旧 → 写新 → 删旧', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.userSettingsLegacyKey,
      JSON.stringify({
        sections: {
          ui: {
            value: { fontSize: 21 },
            clientUpdatedAt: '2026-11-01T00:00:00Z',
          },
        },
      }),
    )
    signIn('u7')
    activateUserSettingsSync('u7')

    expect(readSection('ui')).toEqual({ fontSize: 21 })
    expect(
      window.localStorage.getItem(STORAGE_KEYS.userSettingsLegacyKey),
    ).toBeNull()
    expect(mirrorOf('u7').sections.ui?.value).toEqual({ fontSize: 21 })
  })

  it('多标签页：storage 事件把其它标签页的本地值同步进来（且不回写）', async () => {
    activateUserSettingsSync('u1')
    await bootstrapUserSettings()
    await settle()
    const listener = vi.fn()
    subscribeUserSection('ui', listener)
    saveUserAccountSettingsMock.mockClear()

    const nextRaw = JSON.stringify({
      sections: {
        ui: {
          value: { themeMode: 'dark' },
          clientUpdatedAt: '2026-11-12T00:00:00Z',
        },
      },
    })
    window.localStorage.setItem(MIRROR_KEY('u1'), nextRaw)
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: MIRROR_KEY('u1'),
        newValue: nextRaw,
      }),
    )

    expect(listener).toHaveBeenCalledWith({ themeMode: 'dark' }, 'storage')
    expect(readSection('ui')).toEqual({ themeMode: 'dark' })
    await vi.advanceTimersByTimeAsync(1000)
    expect(saveUserAccountSettingsMock).not.toHaveBeenCalled()
  })

  it('v1 数据（只有 pages）：照常读取，提交只带 sections', async () => {
    getUserAccountSettingsMock.mockResolvedValue({
      version: 1,
      sections: {},
      pages: {
        'page-a': { orderedKeys: ['a'], hiddenKeys: ['b'] },
      },
    })
    activateUserSettingsSync('u1')
    await bootstrapUserSettings()
    await settle()

    const settings = await loadUserAccountSettings()
    expect(settings?.pages['page-a']).toEqual({
      orderedKeys: ['a'],
      hiddenKeys: ['b'],
    })

    patchUserSection('ui', { fontSize: 14 })
    await vi.advanceTimersByTimeAsync(1000)
    const payload = saveUserAccountSettingsMock.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >
    expect(Object.keys(payload)).toEqual(['ui'])
  })

  it('启动读取与列设置合流：并发调用只发一次 GET', async () => {
    activateUserSettingsSync('u1')
    getUserAccountSettingsMock.mockClear()
    const first = loadUserAccountSettings()
    const second = loadUserAccountSettings()
    await settle()
    await Promise.all([first, second])
    expect(getUserAccountSettingsMock).toHaveBeenCalledTimes(1)
  })

  it('未登录（匿名）只写本地，不发请求', async () => {
    window.localStorage.removeItem(STORAGE_KEYS.user)
    activateUserSettingsSync(null)
    await bootstrapUserSettings()
    patchUserSection('ui', { fontSize: 13 })
    await vi.advanceTimersByTimeAsync(1000)

    expect(getUserAccountSettingsMock).not.toHaveBeenCalled()
    expect(saveUserAccountSettingsMock).not.toHaveBeenCalled()
    expect(readSection('ui')).toEqual({ fontSize: 13 })
  })

  it('supplierQuote 分片的 materialTabs 按 supplierId 深度合并', () => {
    const merged = mergeUserSectionValues(
      'supplierQuote',
      { openSupplierIds: ['s1'], materialTabs: { s1: { 直条: 'HRB400' } } },
      { materialTabs: { s2: { 直条: 'HRB400E' } } },
    ) as {
      openSupplierIds: string[]
      materialTabs: Record<string, unknown>
    }
    expect(merged.openSupplierIds).toEqual(['s1'])
    expect(merged.materialTabs).toEqual({
      s1: { 直条: 'HRB400' },
      s2: { 直条: 'HRB400E' },
    })
  })

  it('flushUserSettings 可显式触发（不依赖定时器）', async () => {
    activateUserSettingsSync('u1')
    await bootstrapUserSettings()
    await settle()
    patchUserSection('ui', { fontSize: 22 })
    await flushUserSettings()
    expect(saveUserAccountSettingsMock).toHaveBeenCalledTimes(1)
    expect(getUserSettingsSyncSnapshot().dirty).toEqual([])
  })
})
