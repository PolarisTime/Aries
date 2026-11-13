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
    columnKeys,
  }: {
    pageKey: string
    totalColumnCount: number
    columnKeys?: string[]
  }) {
    renderCount += 1
    const [, setTick] = useState(0)
    bump = () => setTick((value) => value + 1)
    useColumnSettingsSupport(pageKey, undefined, totalColumnCount, columnKeys)
    return null
  }

  const render = (
    pageKey: string,
    totalColumnCount: number,
    columnKeys?: string[],
  ) => {
    act(() => {
      root.render(
        createElement(Harness, { pageKey, totalColumnCount, columnKeys }),
      )
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

  /*
   * 「列顺序引用已删列」的自愈。
   * 真实案例：物流单明细把 materialCode/projectName/materialName 从列集合删掉后，
   * 旧 orderedKeys 仍按旧相对位置把 仓库/品牌/类别 排到「重量」后面 —— 用户怎么看都别扭。
   */
  it('本地保存的列顺序引用了已不存在的列: 退回默认顺序, 但保留显隐偏好', () => {
    seed({
      orderedKeys: [
        'sourceNo',
        'materialCode',
        'spec',
        'material',
        'weightTon',
      ],
      hiddenKeys: ['materialCode'],
    })
    render(PAGE_KEY, 3, ['sourceNo', 'material', 'spec', 'weightTon'])

    const saved = getListColumnSettings(PAGE_KEY, 'anonymous')
    // 顺序退回默认（空数组表示由列定义决定），隐藏偏好原样保留
    expect(saved?.orderedKeys).toEqual([])
    expect(saved?.hiddenKeys).toEqual(['materialCode'])
    // 这不是「异常隐藏比例」，不该出提示
    expect(warnings).toEqual([])
  })

  it('顺序里的列全部仍存在时不重置（尊重用户拖拽结果）', () => {
    seed({ orderedKeys: ['weightTon', 'spec'], hiddenKeys: [] })
    render(PAGE_KEY, 3, ['sourceNo', 'material', 'spec', 'weightTon'])
    expect(getListColumnSettings(PAGE_KEY, 'anonymous')?.orderedKeys).toEqual([
      'weightTon',
      'spec',
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

  it('远端列顺序引用已删列: 清掉顺序并回存服务端, 避免每次加载重复自愈', async () => {
    authState.user = { id: 'u1' }
    apiMock.getUserColumnSettings.mockResolvedValue({
      pages: {
        [PAGE_KEY]: {
          orderedKeys: ['gone', 'spec', 'weightTon'],
          hiddenKeys: [],
        },
      },
    })
    render(PAGE_KEY, 3, ['spec', 'weightTon'])
    await flush()

    expect(getListColumnSettings(PAGE_KEY, 'u1')?.orderedKeys).toEqual([])
    expect(apiMock.saveUserColumnSettings).toHaveBeenCalledWith({
      pages: { [PAGE_KEY]: { orderedKeys: [], hiddenKeys: [] } },
    })
  })
})
