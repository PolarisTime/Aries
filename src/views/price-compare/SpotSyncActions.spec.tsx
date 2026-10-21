// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { modal } from '@/utils/antd-app'
import { SpotSyncActions } from './SpotSyncActions'
import type { PriceRow, PriceSheet } from './types'

vi.mock('@/utils/antd-app', () => ({
  message: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    destroy: vi.fn(),
  },
  modal: { confirm: vi.fn() },
}))

function row(id: string, spec = 12): PriceRow {
  return {
    id,
    rowType: 'PRODUCT',
    category: '螺纹钢',
    material: 'HRB400E',
    spec,
    length: '9米',
  }
}

function sheet(
  overrides: Partial<PriceSheet> & { id: string; name: string },
): PriceSheet {
  return {
    status: '报价',
    projectId: 'p1',
    projectName: '项目',
    orderDate: '2026-09-10',
    refDate: '2026-09-10',
    refPeriod: '上午',
    lengthPremium: 30,
    inputs: {},
    rows: [],
    brands: [{ name: '中天', freight: 30 }],
    ...overrides,
  }
}

const BRANDS = ['中天']

describe('SpotSyncActions —— 同步作用域按钮与影响面确认', () => {
  let container: HTMLDivElement
  let root: Root
  let mounted: boolean

  beforeEach(() => {
    mounted = true
    vi.mocked(modal.confirm).mockReset()
    // jsdom 没有 ResizeObserver，antd Dropdown 的弹出层测量会用到它
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    if (mounted) act(() => root.unmount())
    container.remove()
  })

  function render(props: Parameters<typeof SpotSyncActions>[0]) {
    act(() => {
      root.render(createElement(SpotSyncActions, props))
    })
  }

  /**
   * 三个作用域已合并成一个下拉按钮，因此"执行某范围"= 先开菜单、再点对应项。
   * 菜单项按文案定位（下拉里还有一行不可点的"以当前批次为准"说明）。
   */
  function clickScrope(title: string) {
    const trigger = container.querySelector('button')
    expect(trigger, '同步现货价按钮应存在').toBeTruthy()
    act(() => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    const item = Array.from(
      document.querySelectorAll<HTMLElement>('.ant-dropdown-menu-item'),
    ).find((node) => node.textContent?.includes(title))
    expect(item, `菜单项「${title}」应存在`).toBeTruthy()
    act(() => {
      item?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
  }

  /** 取出确认框的配置（confirmDanger 最终调用 modal.confirm）。 */
  function confirmOptions() {
    const calls = vi.mocked(modal.confirm).mock.calls
    expect(calls.length).toBe(1)
    return calls[0][0] as {
      title?: unknown
      content?: unknown
      okText?: unknown
      onOk?: () => void
    }
  }

  it('三个作用域合并为一个下拉按钮, 菜单里三档范围各自写清覆盖层级', () => {
    render({
      activeSheet: sheet({ id: 's1', name: '批次 1', rows: [row('a')] }),
      sheets: [],
      resolveBrands: () => BRANDS,
      patchSheet: vi.fn(),
    })
    // 页面上只剩一个按钮（合并前是三个）
    const buttons = [...container.querySelectorAll('button')]
    expect(buttons).toHaveLength(1)
    expect(buttons[0].textContent).toContain('同步现货价')
    expect(buttons[0].getAttribute('aria-label')).toContain('选择同步范围')

    act(() => {
      buttons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    const items = Array.from(
      document.querySelectorAll<HTMLElement>('.ant-dropdown-menu-item'),
    ).map((node) => node.textContent ?? '')
    const joined = items.join('|')
    // 每档都要有"覆盖到哪一层"的明确说法，而不是旧版的"项目级/全部"
    expect(joined).toContain('仅本批次内的其它行')
    expect(joined).toContain('本项目下的所有批次')
    expect(joined).toContain('全部项目的所有批次')
    // 说明行把"以谁为准"讲在前面
    expect(document.body.textContent).toContain('以当前批次')
  })

  it('没有可同步内容时只提示, 不弹确认框', async () => {
    render({
      activeSheet: sheet({ id: 's1', name: '批次 1', rows: [row('a')] }),
      sheets: [sheet({ id: 's1', name: '批次 1', rows: [row('a')] })],
      resolveBrands: () => BRANDS,
      patchSheet: vi.fn(),
    })
    clickScrope('本项目下的所有批次')
    await act(async () => {})
    expect(modal.confirm).not.toHaveBeenCalled()
  })

  it('项目级同步：确认框列出会覆盖的批次与处数, 确认后写到目标批次', async () => {
    const active = sheet({
      id: 's1',
      name: '批次 1',
      projectId: 'p1',
      rows: [row('a')],
      inputs: { '中天:a': { spot: 3200 } },
    })
    const target = sheet({
      id: 's2',
      name: '批次 2',
      projectId: 'p1',
      rows: [row('a')],
      inputs: { '中天:a': { spot: 3999 } },
    })
    const other = sheet({
      id: 's3',
      name: '别的项目批次',
      projectId: 'p2',
      rows: [row('a')],
    })
    const patchSheet = vi.fn()
    render({
      activeSheet: active,
      sheets: [active, target, other],
      resolveBrands: () => BRANDS,
      patchSheet,
    })

    clickScrope('本项目下的所有批次')
    await act(async () => {})

    const options = confirmOptions()
    // 确认按钮文案直接说明动作（NN/g：不要用「是/否」）
    expect(String(options.okText)).toContain('覆盖并同步')

    /*
     * 影响面必须**具体**：NN/g 明确要求确认框说明后果而非只问「确定吗」。
     * 内容是以 ReactNode 形式交给 modal.confirm 的，容器里看不到，
     * 因此把 content 单独渲染出来断言文案。
     */
    const impactContainer = document.createElement('div')
    document.body.appendChild(impactContainer)
    const impactRoot = createRoot(impactContainer)
    act(() => {
      impactRoot.render(
        createElement('div', null, options.content as React.ReactNode),
      )
    })
    const impactText = impactContainer.textContent ?? ''
    act(() => impactRoot.unmount())
    impactContainer.remove()

    // 源批次 + 会被覆盖的批次名 + 覆盖处数都要出现在确认框里
    expect(impactText).toContain('批次 1')
    expect(impactText).toContain('批次 2')
    expect(impactText).toContain('1')
    expect(impactText).toContain('覆盖')
    // 不在作用域内的批次不得出现在影响面里
    expect(impactText).not.toContain('别的项目批次')

    act(() => {
      options.onOk?.()
    })
    expect(patchSheet).toHaveBeenCalledTimes(1)
    const [sheetId, patch] = patchSheet.mock.calls[0] as [
      string,
      { inputs: Record<string, { spot?: number }> },
    ]
    expect(sheetId).toBe('s2')
    expect(patch.inputs['中天:a']).toEqual({ spot: 3200 })
  })

  it('他人已签出的批次被跳过：不写入, 且确认框里标注跳过', async () => {
    const active = sheet({
      id: 's1',
      name: '批次 1',
      projectId: 'p1',
      rows: [row('a')],
      inputs: { '中天:a': { spot: 3200 } },
    })
    const locked = sheet({
      id: 's2',
      name: '别人在编辑的批次',
      serverId: '9002',
      projectId: 'p1',
      rows: [row('a')],
    })
    const patchSheet = vi.fn()
    render({
      activeSheet: active,
      sheets: [active, locked],
      resolveBrands: () => BRANDS,
      patchSheet,
      checkLockedByOther: () => Promise.resolve(true),
    })

    clickScrope('本项目下的所有批次')
    await act(async () => {})

    // 唯一的目标被跳过 → 没有可同步内容
    expect(modal.confirm).not.toHaveBeenCalled()
    expect(patchSheet).not.toHaveBeenCalled()
  })

  it('只读时禁用同步（当前批次不归我编辑, 不拿它的数据往外推）', () => {
    render({
      activeSheet: undefined,
      sheets: [],
      resolveBrands: () => BRANDS,
      patchSheet: vi.fn(),
    })
    for (const button of container.querySelectorAll('button')) {
      expect(button.disabled).toBe(true)
    }
  })
})
