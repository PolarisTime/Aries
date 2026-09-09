// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useModuleParentSelectorOverlay } from './useModuleParentSelectorOverlay'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/api/purchase/purchase-order-candidates', () => ({
  listPurchaseOrderInboundImportCandidatePage: vi.fn(() => ({
    data: {
      rows: [
        {
          id: '9001',
          orderNo: 'PO-001',
          supplierName: '供应商A',
          orderDate: '2026-09-01 00:00:00',
          totalWeight: 10,
          totalAmount: 1000,
          status: '已审核',
          importableQuantity: 5,
        },
        {
          id: '9002',
          orderNo: 'PO-002',
          supplierName: '供应商B',
          orderDate: '2026-09-02 00:00:00',
          totalWeight: 8,
          totalAmount: 800,
          status: '已审核',
          importableQuantity: 3,
        },
      ],
      total: 2,
    },
  })),
}))

const getBusinessModuleDetailMock = vi.fn((_moduleKey: string, id: string) => ({
  id,
  orderNo: `PO-${id}`,
  status: '已审核',
  items: [
    {
      id: `${id}-1`,
      materialCode: 'M1',
      quantity: 5,
      remainingQuantity: 5,
    },
  ],
}))

vi.mock('@/api/business/business-crud', () => ({
  getBusinessModuleDetail: (
    ...args: Parameters<typeof getBusinessModuleDetailMock>
  ) => getBusinessModuleDetailMock(...args),
}))

vi.mock('@/config/business-page-loader', () => ({
  loadBusinessPageConfig: vi.fn(() => ({
    key: 'purchase-order',
    title: '采购订单',
    columns: [],
    filters: [],
    formFields: [],
    detailFields: [],
    itemColumns: [{ dataIndex: 'materialCode', title: '物料' }],
    detailItemColumns: [{ dataIndex: 'materialCode', title: '物料' }],
  })),
}))

type HookResult = ReturnType<typeof useModuleParentSelectorOverlay>

describe('选单器默认展开明细', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    getBusinessModuleDetailMock.mockClear()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  function renderHook(): { result: HookResult; queryClient: QueryClient } {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    let result!: HookResult

    function Probe() {
      result = useModuleParentSelectorOverlay({
        parentModuleKey: 'purchase-order',
        parentDisplayFieldKey: 'orderNo',
        candidateQueryType: 'purchase-order-import',
        onSelect: () => {},
        onClose: () => {},
      })
      return null
    }

    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(Probe) as ReactNode,
        ),
      )
    })
    return {
      get result() {
        return result
      },
      queryClient,
    }
  }

  it('候选行默认折叠，手动展开时按需预取明细并渲染摘要行', async () => {
    const hook = renderHook()

    await vi.waitFor(() => {
      expect(hook.result.records).toHaveLength(2)
    })
    // 默认全部折叠
    expect(hook.result.detailExpandedRowKeys).toEqual([])

    act(() => {
      hook.result.toggleDetail({ id: '9001' })
    })

    await vi.waitFor(() => {
      expect(hook.result.detailExpandedRowKeys).toEqual(['9001'])
      expect(getBusinessModuleDetailMock).toHaveBeenCalledWith(
        'purchase-order',
        '9001',
      )
    })

    await vi.waitFor(() => {
      const panelElement = hook.result.renderDetail({ id: '9001' }) as {
        props: {
          className: string
          children: Array<{
            props: {
              className?: string
              record?: { items?: unknown[] } | null
              loading?: boolean
            }
          }>
        }
      }
      expect(panelElement.props.className).toContain(
        'parent-selector-detail-panel',
      )
      // 摘要行在前，明细内容在后
      const summaryElement = panelElement.props.children[0]
      expect(String(summaryElement.props.className)).toContain(
        'parent-selector-detail-summary',
      )
      const detailElement = panelElement.props.children[1]
      expect(detailElement.props.loading).toBe(false)
      expect(detailElement.props.record?.items).toHaveLength(1)
    })
  })

  it('单选模式点行仅选中，不直接导入', async () => {
    const hook = renderHook()

    await vi.waitFor(() => {
      expect(hook.result.records).toHaveLength(2)
    })

    act(() => {
      hook.result.selectSingleRecord({ id: '9002' })
    })

    expect(hook.result.selectedRowKeys).toEqual(['9002'])
    // 单选汇总走 selectedSingleSummary 分支（测试 i18n mock 不做插值）
    await vi.waitFor(() => {
      expect(hook.result.selectedSummary).toContain('selectedSingleSummary')
    })
  })
})
