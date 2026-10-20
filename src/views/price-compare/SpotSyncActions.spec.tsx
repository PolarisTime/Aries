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

  function clickButton(label: string) {
    const button = [...container.querySelectorAll('button')].find((item) =>
      (item.textContent ?? '').includes(label),
    )
    expect(button, `按钮「${label}」应存在`).toBeTruthy()
    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
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

  it('渲染三个作用域按钮', () => {
    render({
      activeSheet: sheet({ id: 's1', name: '批次 1', rows: [row('a')] }),
      sheets: [],
      resolveBrands: () => BRANDS,
      patchSheet: vi.fn(),
    })
    const labels = [...container.querySelectorAll('button')].map(
      (item) => item.textContent ?? '',
    )
    expect(labels.join('|')).toContain('当前批次内同步')
    expect(labels.join('|')).toContain('项目级同步')
    expect(labels.join('|')).toContain('全部同步')
  })

  it('没有可同步内容时只提示, 不弹确认框', async () => {
    render({
      activeSheet: sheet({ id: 's1', name: '批次 1', rows: [row('a')] }),
      sheets: [sheet({ id: 's1', name: '批次 1', rows: [row('a')] })],
      resolveBrands: () => BRANDS,
      patchSheet: vi.fn(),
    })
    clickButton('项目级同步')
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

    clickButton('项目级同步')
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

    clickButton('项目级同步')
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
