// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePatchState } from '@/hooks/usePatchState'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import {
  type ParentSelectorState,
  parentSelectorInitialState,
  useParentSelectorData,
} from './use-parent-selector-data'
import { useParentSelectorDetail } from './use-parent-selector-detail'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/api/purchase/purchase-order-candidates', () => ({
  listPurchaseOrderInboundImportCandidatePage: vi.fn(() => ({
    data: {
      rows: [{ id: '9001', orderNo: 'PO-001', importableQuantity: 5 }],
      total: 1,
    },
  })),
}))

const getBusinessModuleDetailMock = vi.fn((_moduleKey: string, id: string) => ({
  id,
  orderNo: `PO-${id}`,
  items: [{ id: `${id}-1` }],
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

const pageConfig = {
  key: 'purchase-order',
  title: '采购订单',
  columns: [],
  filters: [],
  formFields: [],
  detailFields: [],
  itemColumns: [{ dataIndex: 'materialCode', title: '物料' }],
  detailItemColumns: [{ dataIndex: 'materialCode', title: '物料' }],
} as unknown as ModulePageConfig

describe('useParentSelectorDetail', () => {
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

  function renderDetailHook() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    let result!: ReturnType<typeof useParentSelectorDetail>
    let state!: ParentSelectorState

    function Probe() {
      const [patchState, setState] = usePatchState<ParentSelectorState>(
        parentSelectorInitialState,
      )
      state = patchState
      const data = useParentSelectorData({
        parentModuleKey: 'purchase-order',
        candidateQueryType: 'purchase-order-import',
        fixedFilters: {},
        state: patchState,
        setState,
      })
      result = useParentSelectorDetail({
        state: patchState,
        setState,
        parentPageConfig: pageConfig,
        displayFieldKey: 'orderNo',
        t: (key: string) => key,
        detailRequestVersionsRef: data.detailRequestVersionsRef,
        loadDetailRecord: data.loadDetailRecord,
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
      get state() {
        return state
      },
    }
  }

  it('无行内明细的行展开时按需预取明细', async () => {
    const hook = renderDetailHook()
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
      expect(hook.state.inlineDetailItems['9001']?.record?.orderNo).toBe(
        'PO-9001',
      )
    })
  })

  it('自带行内明细的行展开时直接使用行数据，不触发请求', () => {
    const hook = renderDetailHook()
    const recordWithItems = {
      id: '9002',
      orderNo: 'PO-002',
      items: [{ id: '9002-1' }],
    } as ModuleRecord

    act(() => {
      hook.result.toggleDetail(recordWithItems)
    })

    expect(hook.result.detailExpandedRowKeys).toEqual(['9002'])
    expect(hook.state.inlineDetailItems['9002']?.record).toEqual(
      recordWithItems,
    )
    expect(hook.state.inlineDetailItems['9002']?.loading).toBe(false)
    expect(getBusinessModuleDetailMock).not.toHaveBeenCalled()
  })

  it('折叠时移除展开 key 与行内明细', async () => {
    const hook = renderDetailHook()
    act(() => {
      hook.result.toggleDetail({ id: '9001' })
    })
    await vi.waitFor(() => {
      expect(hook.state.inlineDetailItems['9001']?.record).toBeDefined()
    })

    act(() => {
      hook.result.toggleDetail({ id: '9001' })
    })

    expect(hook.result.detailExpandedRowKeys).toEqual([])
    expect(hook.state.inlineDetailItems['9001']).toBeUndefined()
  })

  it('无 id 的行不触发展开', () => {
    const hook = renderDetailHook()
    act(() => {
      hook.result.toggleDetail({ id: '' })
    })
    expect(hook.result.detailExpandedRowKeys).toEqual([])
    expect(getBusinessModuleDetailMock).not.toHaveBeenCalled()
  })

  it('renderDetail 渲染摘要行与明细内容', async () => {
    const hook = renderDetailHook()
    act(() => {
      hook.result.toggleDetail({ id: '9001' })
    })
    await vi.waitFor(() => {
      expect(hook.state.inlineDetailItems['9001']?.record).toBeDefined()

      const panelElement = hook.result.renderDetail({
        id: '9001',
        orderNo: 'PO-001',
        importableQuantity: 5,
      }) as {
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
      const summaryElement = panelElement.props.children[0]
      expect(String(summaryElement.props.className)).toContain(
        'parent-selector-detail-summary',
      )
      const detailElement = panelElement.props.children[1]
      expect(detailElement.props.loading).toBe(false)
      expect(detailElement.props.record?.items).toHaveLength(1)
    })
  })

  it('renderDetail 在缺少页面配置时渲染加载态', () => {
    let result!: ReturnType<typeof useParentSelectorDetail>

    function Probe() {
      const [patchState, setState] = usePatchState<ParentSelectorState>(
        parentSelectorInitialState,
      )
      result = useParentSelectorDetail({
        state: patchState,
        setState,
        displayFieldKey: 'orderNo',
        t: (key: string) => key,
        detailRequestVersionsRef: { current: new Map() },
        loadDetailRecord: async () => {},
      })
      return null
    }

    act(() => {
      root.render(createElement(Probe))
    })

    const panelElement = result.renderDetail({
      id: '9001',
      orderNo: 'PO-001',
    }) as {
      props: {
        children: Array<{
          props: { className?: string; children: Array<{ props: object }> }
        }>
      }
    }
    const loadingElement = panelElement.props.children[1]
    expect(String(loadingElement.props.className)).toContain(
      'module-record-detail-inline-state',
    )
    act(() => root.unmount())
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  it('renderDetail 的 onRetry 在已有行内明细时重新加载', async () => {
    const hook = renderDetailHook()
    act(() => {
      hook.result.toggleDetail({ id: '9001' })
    })
    await vi.waitFor(() => {
      expect(hook.state.inlineDetailItems['9001']?.record).toBeDefined()
      expect(getBusinessModuleDetailMock).toHaveBeenCalledTimes(1)
    })

    const panelElement = hook.result.renderDetail({
      id: '9001',
      orderNo: 'PO-001',
    }) as {
      props: {
        children: Array<{
          props: { onRetry?: () => void }
        }>
      }
    }
    act(() => {
      panelElement.props.children[1].props.onRetry?.()
    })
    await vi.waitFor(() => {
      expect(getBusinessModuleDetailMock).toHaveBeenCalledTimes(2)
    })
  })
})
