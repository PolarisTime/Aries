// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  ModuleLineItem,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import {
  buildModuleDetailBodyModel,
  getModuleDetailErrorMessage,
  ModuleDetailBody,
} from './ModuleDetailBody'

const record = {
  id: '1',
  orderNo: 'SO-1',
  status: 'DRAFT',
  items: [{ id: 'i1', amount: 100 }],
} as unknown as ModuleRecord

function configWith(overrides: Partial<ModulePageConfig>): ModulePageConfig {
  return {
    key: 'sales-order',
    // 真实模块都会声明信息区字段；模型直接读它，不能缺省
    detailFields: [],
    ...overrides,
  } as unknown as ModulePageConfig
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('getModuleDetailErrorMessage', () => {
  it('Error 取 message，字符串原样，其余走兜底文案', () => {
    expect(getModuleDetailErrorMessage(new Error(' 加载失败 '), '兜底')).toBe(
      '加载失败',
    )
    expect(getModuleDetailErrorMessage(' 接口 500 ', '兜底')).toBe('接口 500')
    expect(getModuleDetailErrorMessage(null, '兜底')).toBe('兜底')
    expect(getModuleDetailErrorMessage(new Error('   '), '兜底')).toBe('兜底')
  })
})

describe('buildModuleDetailBodyModel', () => {
  it('明细列按 detailItemColumns → itemColumns 顺序取，并构建表格列', () => {
    const model = buildModuleDetailBodyModel({
      config: configWith({
        itemColumns: [{ dataIndex: 'amount', title: '金额' }],
      } as Partial<ModulePageConfig>),
      record,
      formatCellValue: (value) => String(value ?? ''),
    })

    expect(model.detailItems).toHaveLength(1)
    expect(model.detailItemColumns).toHaveLength(1)
    expect(model.tableColumns.length).toBeGreaterThan(0)
    expect(model.hasItemColumns).toBe(true)
  })

  it('没有明细列时不渲染明细卡，也没有合计行', () => {
    const model = buildModuleDetailBodyModel({
      config: configWith({}),
      record,
      formatCellValue: (value) => String(value ?? ''),
    })

    expect(model.hasItemColumns).toBe(false)
    expect(model.summary).toBeUndefined()
  })

  it('合计口径只来自 config.detailSummary，空明细时不出现合计行', () => {
    const detailSummary = vi.fn(() => [
      { key: 'amount', dataIndex: 'amount', value: '100.00' },
    ])
    const withItems = buildModuleDetailBodyModel({
      config: configWith({
        itemColumns: [{ dataIndex: 'amount', title: '金额' }],
        detailSummary,
      }),
      record,
      formatCellValue: (value) => String(value ?? ''),
    })
    expect(typeof withItems.summary).toBe('function')

    const empty = buildModuleDetailBodyModel({
      config: configWith({
        itemColumns: [{ dataIndex: 'amount', title: '金额' }],
        detailSummary,
      }),
      record: { id: '2', items: [] } as unknown as ModuleRecord,
      formatCellValue: (value) => String(value ?? ''),
    })
    // 没有明细行就不该调合计（避免「合计 0 行」），也不给 summary 插槽
    expect(empty.summary).toBeUndefined()
    expect(detailSummary).toHaveBeenCalledTimes(1)
  })

  it('方案 B 只去掉顶栏已呈现的内容：状态 + 页面显式声明的隐藏 key', () => {
    const config = configWith({
      detailLayout: 'inline',
      detailInfoHiddenKeys: ['orderNo'],
      detailFields: [
        { key: 'orderNo', label: '单号' },
        { key: 'status', label: '状态' },
        { key: 'customerName', label: '客户' },
      ],
    })
    const model = buildModuleDetailBodyModel({
      config,
      // record.status 有值 → 顶栏会渲染状态标签，信息区不再重复
      record,
      formatCellValue: (value) => String(value ?? ''),
    })

    expect(model.isPlanB).toBe(true)
    expect(model.infoFields.map((field) => field.key)).toEqual(['customerName'])
  })

  it('未配置 detailLayout 的模块一个字段都不动（缺省 descriptions 形态）', () => {
    const model = buildModuleDetailBodyModel({
      config: configWith({
        detailFields: [
          { key: 'orderNo', label: '单号' },
          { key: 'status', label: '状态' },
        ],
      }),
      record,
      formatCellValue: (value) => String(value ?? ''),
    })

    expect(model.isPlanB).toBe(false)
    expect(model.infoFields.map((field) => field.key)).toEqual([
      'orderNo',
      'status',
    ])
  })
})

describe('ModuleDetailBody', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
  })

  function render(props: Parameters<typeof ModuleDetailBody>[0]) {
    act(() => {
      root.render(createElement(ModuleDetailBody, props))
    })
  }

  it('按 info → items 顺序包卡片，leading 在最前', () => {
    render({
      className: 'module-detail-surface',
      leading: createElement('span', { className: 'lead' }, 'L'),
      info: createElement('span', null, 'info'),
      items: createElement('span', null, 'items'),
    })

    const surface = container.querySelector('.module-detail-surface')
    expect(surface?.className).toBe('module-detail-surface')
    expect(
      [...(surface?.children ?? [])].map((node) =>
        node.classList.contains('module-detail-card--info')
          ? 'info'
          : node.classList.contains('module-detail-card--items')
            ? 'items'
            : 'lead',
      ),
    ).toEqual(['lead', 'info', 'items'])
  })

  it('info/items 为 null 时不渲染空卡片，且不出现空 div', () => {
    render({
      className: 'module-detail-surface',
      info: null,
      items: undefined,
      emptyFallback: createElement('span', { className: 'fallback' }, '空'),
    })

    expect(container.querySelectorAll('.module-detail-card')).toHaveLength(0)
    expect(container.querySelector('.fallback')).not.toBeNull()
  })
})

/** 明细行类型仅用于让测试里的 fixture 形状可读。 */
export type FixtureItem = ModuleLineItem
