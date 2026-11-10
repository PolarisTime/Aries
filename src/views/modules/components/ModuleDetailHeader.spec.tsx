// @vitest-environment jsdom

import i18next from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { ModuleDetailHeader } from './ModuleDetailHeader'

/*
 * DocumentFlowModal 会发请求，顶栏测试只关心「是否按 initialView=timeline 打开」，
 * 因此用轻量替身记录 props，不进入真实弹层。
 */
vi.mock('@/components/DocumentFlowModal', async () => {
  const { createElement: createNode } = await import('react')
  return {
    DocumentFlowModal: (props: {
      initialView?: string
      documentNo: string
      open: boolean
    }) =>
      createNode('div', {
        'data-document-no': props.documentNo,
        'data-initial-view': props.initialView,
        'data-open': String(props.open),
        'data-testid': 'document-flow-modal',
      }),
  }
})

const baseConfig = {
  columns: [],
  data: [],
  detailFields: [],
  filters: [],
  key: 'sales-order',
  primaryNoKey: 'orderNo',
  title: '销售订单',
} as unknown as ModulePageConfig

function renderHeader(
  config: ModulePageConfig,
  record: ModuleRecord,
  compact = false,
): { container: HTMLDivElement; unmount: () => void } {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root: Root = createRoot(container)
  act(() => {
    root.render(createElement(ModuleDetailHeader, { compact, config, record }))
  })
  return {
    container,
    unmount: () => {
      act(() => root.unmount())
      container.remove()
    },
  }
}

describe('ModuleDetailHeader 来源单据与单据链', () => {
  beforeAll(async () => {
    await i18next.changeLanguage('zh-CN')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('未配置来源单据时不渲染 chip，也不出现孤立竖线', () => {
    const { container, unmount } = renderHeader(baseConfig, {
      id: '1',
      orderNo: 'SO-20261110-001',
    })

    expect(container.querySelector('.module-detail-header__source')).toBeNull()
    expect(
      container.querySelectorAll('.module-detail-header__divider'),
    ).toHaveLength(0)
    unmount()
  })

  it('配置且记录有值：展示类型 + 单号，复制按钮写入剪贴板', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const config = {
      ...baseConfig,
      detailHeaderSource: { key: 'purchaseOrderNo', typeLabel: '采购订单号' },
    } as ModulePageConfig

    const { container, unmount } = renderHeader(config, {
      id: '1',
      orderNo: 'SO-20261110-001',
      purchaseOrderNo: 'PO-20261108-014',
    })

    const chip = container.querySelector('.module-detail-header__source-chip')
    expect(chip?.textContent).toContain('采购订单号')
    expect(chip?.textContent).toContain('PO-20261108-014')
    expect(chip?.getAttribute('title')).toBe('采购订单号 PO-20261108-014')

    const copy = container.querySelector(
      '.module-detail-header__source-copy',
    ) as HTMLButtonElement
    expect(copy.getAttribute('aria-label')).toBe('复制来源单号')
    await act(async () => {
      copy.click()
      await Promise.resolve()
    })
    expect(writeText).toHaveBeenCalledWith('PO-20261108-014')
    unmount()
  })

  it('来源单号为空时不渲染 chip（手工新建的单没有来源）', () => {
    const config = {
      ...baseConfig,
      detailHeaderSource: { key: 'purchaseOrderNo', typeLabel: '采购订单号' },
    } as ModulePageConfig
    const { container, unmount } = renderHeader(config, {
      id: '1',
      orderNo: 'SO-20261110-002',
      purchaseOrderNo: '   ',
    })

    expect(container.querySelector('.module-detail-header__source')).toBeNull()
    unmount()
  })

  it('行展开（compact）不渲染来源 chip 与单据链按钮', () => {
    const config = {
      ...baseConfig,
      detailHeaderDocumentFlow: true,
      detailHeaderSource: { key: 'purchaseOrderNo', typeLabel: '采购订单号' },
    } as ModulePageConfig
    const { container, unmount } = renderHeader(
      config,
      {
        id: '1',
        orderNo: 'SO-20261110-001',
        purchaseOrderNo: 'PO-20261108-014',
      },
      true,
    )

    expect(container.querySelector('.module-detail-header__source')).toBeNull()
    expect(container.textContent).not.toContain('单据链')
    unmount()
  })

  it('配置单据链后按钮可打开弹层，并按时间线视图初始化', async () => {
    const config = {
      ...baseConfig,
      detailHeaderDocumentFlow: true,
    } as ModulePageConfig
    const { container, unmount } = renderHeader(config, {
      id: '1',
      orderNo: 'SO-20261110-001',
    })

    const flowBtn = [...container.querySelectorAll('button')].find((btn) =>
      btn.textContent?.includes('单据链'),
    )
    expect(flowBtn).toBeTruthy()
    // 弹层按需挂载：未点击前不渲染（避免所有详情页都挂一条 useQuery）
    expect(
      container.querySelector('[data-testid="document-flow-modal"]'),
    ).toBeNull()

    await act(async () => {
      flowBtn?.click()
      await Promise.resolve()
    })
    const opened = container.querySelector(
      '[data-testid="document-flow-modal"]',
    )
    expect(opened?.getAttribute('data-open')).toBe('true')
    expect(opened?.getAttribute('data-initial-view')).toBe('timeline')
    expect(opened?.getAttribute('data-document-no')).toBe('SO-20261110-001')
    unmount()
  })

  it('主单号缺失时沿用记录 id（getPrimaryNo 回退），弹层仍拿到可查询的单号', async () => {
    const config = {
      ...baseConfig,
      detailHeaderDocumentFlow: true,
    } as ModulePageConfig
    const { container, unmount } = renderHeader(config, {
      id: '1',
    })

    const flowBtn = [...container.querySelectorAll('button')].find((btn) =>
      btn.textContent?.includes('单据链'),
    )
    expect(flowBtn).toBeTruthy()

    await act(async () => {
      flowBtn?.click()
      await Promise.resolve()
    })
    const modal = container.querySelector('[data-testid="document-flow-modal"]')
    expect(modal?.getAttribute('data-document-no')).toBe('1')
    unmount()
  })
})
