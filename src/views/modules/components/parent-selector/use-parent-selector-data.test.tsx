// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePatchState } from '@/hooks/usePatchState'
import type { SearchParams } from '@/types/api-raw'
import type { ModuleRecord } from '@/types/module-page'
import {
  parentSelectorInitialState,
  useParentSelectorData,
} from './use-parent-selector-data'

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
          importableQuantity: 5,
        },
        {
          id: '9002',
          orderNo: 'PO-002',
          importableQuantity: 3,
        },
      ],
      total: 2,
    },
  })),
}))

const getBusinessModuleDetailMock = vi.fn(
  (_moduleKey: string, id: string): ModuleRecord | Promise<ModuleRecord> => ({
    id,
    orderNo: `PO-${id}`,
    items: [{ id: `${id}-1` }],
  }),
)

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
    itemColumns: [],
    detailItemColumns: [],
  })),
}))

type HookResult = {
  state: typeof parentSelectorInitialState
  data: ReturnType<typeof useParentSelectorData>
}

describe('useParentSelectorData', () => {
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

  function renderDataHook(options?: { fixedFilters?: SearchParams }): {
    result: HookResult
    queryClient: QueryClient
  } {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const result: HookResult = {} as HookResult

    function Probe() {
      const [state, setState] = usePatchState(parentSelectorInitialState)
      result.state = state
      result.data = useParentSelectorData({
        parentModuleKey: 'purchase-order',
        candidateQueryType: 'purchase-order-import',
        fixedFilters: options?.fixedFilters ?? {},
        state,
        setState,
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

  it('主表候选查询返回可导入行与总数', async () => {
    const hook = renderDataHook()
    await vi.waitFor(() => {
      expect(hook.result.data.records).toHaveLength(2)
      expect(hook.result.data.total).toBe(2)
    })
  })

  it('updateFilter 仅更新草稿过滤器', () => {
    const hook = renderDataHook()
    act(() => {
      hook.result.data.updateFilter('keyword', 'PO')
    })
    expect(hook.result.state.draftFilters).toEqual({ keyword: 'PO' })
    expect(hook.result.state.submittedFilters).toEqual({})
  })

  it('applyFilters 提交过滤条件并重置页码', () => {
    const hook = renderDataHook()
    act(() => {
      hook.result.data.handlePageChange(3, 30)
    })
    expect(hook.result.state.page).toBe(3)
    act(() => {
      hook.result.data.applyFilters({ keyword: 'PO' })
    })
    expect(hook.result.state.draftFilters).toEqual({ keyword: 'PO' })
    expect(hook.result.state.submittedFilters).toEqual({ keyword: 'PO' })
    expect(hook.result.state.page).toBe(1)
  })

  it('resetFilters 清空草稿与已提交过滤器并回到第一页', () => {
    const hook = renderDataHook()
    act(() => {
      hook.result.data.updateFilter('keyword', 'PO')
    })
    act(() => {
      hook.result.data.applyFilters({ keyword: 'PO' })
    })
    act(() => {
      hook.result.data.handlePageChange(2, 30)
    })
    act(() => {
      hook.result.data.resetFilters()
    })
    expect(hook.result.state.draftFilters).toEqual({})
    expect(hook.result.state.submittedFilters).toEqual({})
    expect(hook.result.state.page).toBe(1)
  })

  it('handlePageChange 保留相同 pageSize，仅在不同时更新', () => {
    const hook = renderDataHook()
    act(() => {
      hook.result.data.handlePageChange(2, 30)
    })
    expect(hook.result.state.page).toBe(2)
    expect(hook.result.state.pageSize).toBe(30)
    act(() => {
      hook.result.data.handlePageChange(3, 30)
    })
    expect(hook.result.state.pageSize).toBe(30)
    act(() => {
      hook.result.data.handlePageChange(3, 50)
    })
    expect(hook.result.state.pageSize).toBe(50)
  })

  it('明细按需加载成功后写入行内明细', async () => {
    const hook = renderDataHook()
    act(() => {
      void hook.result.data.loadDetailRecord('9001')
    })
    await vi.waitFor(() => {
      expect(hook.result.state.inlineDetailItems['9001']?.record?.orderNo).toBe(
        'PO-9001',
      )
      expect(hook.result.state.inlineDetailItems['9001']?.loading).toBe(false)
    })
  })

  it('明细请求竞态：过期响应被版本守卫丢弃', async () => {
    let resolveFirst!: (value: ModuleRecord) => void
    let resolveSecond!: (value: ModuleRecord) => void
    getBusinessModuleDetailMock
      .mockImplementationOnce(
        () =>
          new Promise<ModuleRecord>((resolve) => {
            resolveFirst = resolve
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<ModuleRecord>((resolve) => {
            resolveSecond = resolve
          }),
      )

    const hook = renderDataHook()
    act(() => {
      void hook.result.data.loadDetailRecord('9001')
    })
    act(() => {
      void hook.result.data.loadDetailRecord('9001')
    })
    await act(async () => {
      resolveSecond({ id: '9001', orderNo: 'PO-SECOND' })
      await Promise.resolve()
    })
    await act(async () => {
      resolveFirst({ id: '9001', orderNo: 'PO-FIRST' })
      await Promise.resolve()
    })

    expect(hook.result.state.inlineDetailItems['9001']?.record?.orderNo).toBe(
      'PO-SECOND',
    )
  })
})
