// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { ListColumnSettings } from '@/types/module-page'
import { bindAntdAppApi } from '@/utils/antd-app'
import { getListColumnSettings, setListColumnSettings } from '@/utils/storage'
import { useColumnSettingsSupport } from './useColumnSettingsSupport'

/** 登录用户可控: 为 null 时 userKey 为 anonymous, 跳过远端拉取。 */
const authState = vi.hoisted(() => ({
  user: null as { id: string } | null,
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: <T,>(selector: (state: { user: unknown }) => T): T =>
    selector({ user: authState.user }),
}))

const apiMock = vi.hoisted(() => ({
  getUserColumnSettings: vi.fn(),
  saveUserColumnSettings: vi.fn(),
}))

vi.mock('@/api/system/user-preferences', () => apiMock)

vi.mock('@/utils/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const PAGE_KEY = 'page-columns'
const RESET_TIP =
  '检测到该页面的列显示设置异常，已恢复为默认列显示，可在列设置里重新调整'

describe('useColumnSettingsSupport 列设置异常重置', () => {
  let container: HTMLDivElement
  let root: Root
  let warnings: string[]
  let bump: (() => void) | null
  let renderCount: number

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
    localStorage.clear()
    authState.user = null
    apiMock.getUserColumnSettings.mockReset()
    apiMock.getUserColumnSettings.mockResolvedValue({ pages: {} })
    apiMock.saveUserColumnSettings.mockReset()
    apiMock.saveUserColumnSettings.mockResolvedValue(undefined)
    warnings = []
    bump = null
    renderCount = 0
    bindAntdAppApi({
      message: {
        warning: (content: unknown) => {
          warnings.push(String(content))
        },
      },
    } as unknown as Parameters<typeof bindAntdAppApi>[0])
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    bindAntdAppApi(null)
    act(() => root.unmount())
    container.remove()
  })

  const flush = () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

  function Harness({
    pageKey,
    totalColumnCount,
  }: {
    pageKey: string
    totalColumnCount: number
  }) {
    renderCount += 1
    const [, setTick] = useState(0)
    bump = () => setTick((value) => value + 1)
    useColumnSettingsSupport(pageKey, undefined, totalColumnCount)
    return null
  }

  const render = (pageKey: string, totalColumnCount: number) => {
    act(() => {
      root.render(createElement(Harness, { pageKey, totalColumnCount }))
    })
  }

  const seed = (settings: ListColumnSettings) =>
    setListColumnSettings(PAGE_KEY, settings, 'anonymous')

  it('本地存储隐藏比例异常: 静默重置并只提示一次', () => {
    seed({ orderedKeys: [], hiddenKeys: ['b', 'c'] })
    render(PAGE_KEY, 3)
    expect(warnings).toEqual([RESET_TIP])
    // 脏数据已被清掉, 下次读取不再异常
    expect(getListColumnSettings(PAGE_KEY, 'anonymous')?.hiddenKeys).toEqual([])

    const before = renderCount
    // 再次渲染时本地存储仍是脏数据: 一次性标记必须继续抑制重复提示
    seed({ orderedKeys: [], hiddenKeys: ['b', 'c'] })
    act(() => bump?.())
    expect(renderCount).toBeGreaterThan(before)
    expect(warnings).toHaveLength(1)
  })

  it('隐藏比例正常时不提示也不重置', () => {
    seed({ orderedKeys: [], hiddenKeys: ['b'] })
    render(PAGE_KEY, 3)
    expect(warnings).toEqual([])
    expect(getListColumnSettings(PAGE_KEY, 'anonymous')?.hiddenKeys).toEqual([
      'b',
    ])
  })

  it('远端设置为异常隐藏比例: 重置并提示一次', async () => {
    authState.user = { id: 'u1' }
    apiMock.getUserColumnSettings.mockResolvedValue({
      pages: {
        [PAGE_KEY]: { orderedKeys: [], hiddenKeys: ['a', 'b', 'c'] },
      },
    })
    render(PAGE_KEY, 3)
    await flush()
    expect(apiMock.getUserColumnSettings).toHaveBeenCalled()
    expect(warnings).toEqual([RESET_TIP])
    expect(getListColumnSettings(PAGE_KEY, 'u1')?.hiddenKeys).toEqual([])
  })
})
