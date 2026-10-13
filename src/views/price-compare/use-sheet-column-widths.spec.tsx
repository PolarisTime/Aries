// @vitest-environment jsdom

import i18next from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import { useUiSettingsStore } from '@/stores/uiSettingsStore'
import {
  requiredTonColumnWidth,
  SHEET_COLUMN_WIDTH,
  tonProgressLineWidth,
} from './core'
import { tonProgressTextParts } from './ton-progress-text'
import { useSheetColumnWidths } from './use-sheet-column-widths'

/** 明细行工厂: 只覆盖断言关心的字段。 */
function poRecord(
  overrides: Partial<PurchaseOrderTonnageRecord> = {},
): PurchaseOrderTonnageRecord {
  return {
    purchaseOrderId: '1',
    purchaseOrderItemId: '301',
    orderNo: 'PO-1',
    supplierName: '沙钢',
    category: '螺纹钢',
    material: 'HRB400E',
    spec: '12',
    length: '9米',
    brand: '中天',
    orderedWeight: 12,
    issuedWeight: 0,
    remainingWeight: 12,
    status: '正常',
    ...overrides,
  }
}

/**
 * 探针组件: 把 hook 结果序列化进 DOM。
 * 不在渲染期写外部变量(组件必须保持纯函数), 断言统一从 container.textContent 读取。
 */
function Probe({
  records = [],
  localTonByItemId = new Map<string, number>(),
}: {
  records?: readonly PurchaseOrderTonnageRecord[]
  localTonByItemId?: ReadonlyMap<string, number>
}) {
  const widths = useSheetColumnWidths(records, localTonByItemId)
  return createElement('output', null, JSON.stringify(widths))
}

describe('useSheetColumnWidths 随个人设置字号自适应', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    await i18next.changeLanguage('zh-CN')
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    useUiSettingsStore.setState({ settings: null })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    useUiSettingsStore.setState({ settings: null })
  })

  const widthsNow = () =>
    JSON.parse(container.textContent ?? '{}') as Record<string, number>

  const render = (
    records: readonly PurchaseOrderTonnageRecord[] = [],
    localTonByItemId: ReadonlyMap<string, number> = new Map(),
  ) => {
    act(() => {
      root.render(createElement(Probe, { records, localTonByItemId }))
    })
    return widthsNow()
  }

  it('未配置字号时使用 14px 基准列宽', () => {
    expect(render()).toEqual({ ...SHEET_COLUMN_WIDTH })
  })

  it('字号 16/18 时列宽等比放大', () => {
    useUiSettingsStore.setState({ settings: { fontSize: 16 } })
    const at16 = render()
    expect(at16.spec).toBe(Math.round((SHEET_COLUMN_WIDTH.spec * 16) / 14))
    expect(at16.ton).toBeGreaterThan(SHEET_COLUMN_WIDTH.ton)

    act(() => {
      useUiSettingsStore.setState({ settings: { fontSize: 18 } })
    })
    const at18 = widthsNow()
    expect(at18.spec).toBe(Math.round((SHEET_COLUMN_WIDTH.spec * 18) / 14))
    // 字号变大后每一列都不能变窄
    for (const key of Object.keys(SHEET_COLUMN_WIDTH)) {
      expect(at18[key]).toBeGreaterThanOrEqual(at16[key])
    }
  })

  it('字号缩小时列宽同比缩小, 不会出现 0 宽列', () => {
    useUiSettingsStore.setState({ settings: { fontSize: 11 } })
    const widths = render()
    expect(widths.spec).toBe(Math.round((SHEET_COLUMN_WIDTH.spec * 11) / 14))
    for (const value of Object.values(widths)) {
      expect(value).toBeGreaterThan(0)
    }
  })

  it('吨位列按单据实际内容定宽: 长品牌名不再被省略号收尾', () => {
    const widths = render([poRecord({ orderedWeight: 128, brand: '中天钢铁' })])
    const primaryOnly = requiredTonColumnWidth(
      14,
      tonProgressLineWidth('剩余 128', ''),
    )
    expect(widths.ton).toBe(
      requiredTonColumnWidth(14, tonProgressLineWidth('剩余 128', '中天钢铁')),
    )
    // 定宽必须真的比"只兜主段"的下界宽, 否则品牌还是会被裁
    expect(widths.ton).toBeGreaterThan(primaryOnly)
    // 其余列不受内容影响
    expect(widths.spec).toBe(SHEET_COLUMN_WIDTH.spec)
  })

  it('取单据里最长的一条进度小字定宽(含本单据超额文案)', () => {
    const short = poRecord({ purchaseOrderItemId: '301', brand: '中天' })
    const long = poRecord({
      purchaseOrderItemId: '302',
      brand: '中天钢铁',
      orderedWeight: 128,
      issuedWeight: 12.5,
    })
    // 本单据给明细 302 填了 9000 吨: 超额文案「超额 8,884.5」比未超额更长
    const widths = render([short, long], new Map([['302', 9000]]))
    const overParts = tonProgressTextParts(i18next.t, long, 12.5 + 9000)
    expect(overParts.primary).toContain('超额')
    expect(widths.ton).toBe(
      requiredTonColumnWidth(
        14,
        tonProgressLineWidth(overParts.primary, overParts.brand),
      ),
    )
    expect(widths.ton).toBeGreaterThan(
      requiredTonColumnWidth(14, tonProgressLineWidth('剩余 115.5', '中天')),
    )
  })

  it('没有吨位数据时回落到基准字号列宽(不被主段下界压低)', () => {
    const widths = render([])
    expect(widths.ton).toBe(SHEET_COLUMN_WIDTH.ton)
    expect(widths.ton).toBeGreaterThanOrEqual(requiredTonColumnWidth(14, 0))
  })
})
