// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getBusinessModuleDetailMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/business/business-crud', () => ({
  getBusinessModuleDetail: getBusinessModuleDetailMock,
}))

import { purchaseOrdersPageConfig } from '@/config/business-pages/operations/purchase-order-page'
import { useDetailSupport } from '@/hooks/useDetailSupport'
import type {
  ModuleDetailRecordFor,
  ModuleListRecordFor,
} from '@/types/module-record'

describe('useDetailSupport', () => {
  let root: Root
  let container: HTMLDivElement
  let queryClient: QueryClient
  let latest: ReturnType<typeof useDetailSupport<'purchase-order'>>

  function Probe() {
    latest = useDetailSupport({
      moduleKey: 'purchase-order',
      config: purchaseOrdersPageConfig,
    })
    return null
  }

  function renderOnce() {
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(Probe),
        ),
      )
    })
  }

  const flushAsync = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  beforeEach(() => {
    getBusinessModuleDetailMock.mockReset()
    getBusinessModuleDetailMock.mockImplementation(
      (_moduleKey: string, id: string) =>
        Promise.resolve({ id } as ModuleDetailRecordFor<'purchase-order'>),
    )
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    renderOnce()
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    queryClient.clear()
  })

  it('keeps multiple document details open independently', async () => {
    const firstRecord = { id: '1' } as ModuleListRecordFor<'purchase-order'>
    const secondRecord = { id: '2' } as ModuleListRecordFor<'purchase-order'>

    await act(async () => {
      await latest.openDetail(firstRecord)
    })
    await act(async () => {
      await latest.openDetail(secondRecord)
    })
    await flushAsync()

    expect(latest.detailItems.map((item) => item.recordId)).toEqual(['1', '2'])
    expect(latest.detailItems.map((item) => item.record?.id)).toEqual([
      '1',
      '2',
    ])
    expect(getBusinessModuleDetailMock).toHaveBeenCalledTimes(2)

    act(() => {
      latest.closeDetail('1')
    })

    expect(latest.detailItems.map((item) => item.recordId)).toEqual(['2'])
  })

  it('keeps multiple inline document details open independently', async () => {
    const firstRecord = { id: '1' } as ModuleListRecordFor<'purchase-order'>
    const secondRecord = { id: '2' } as ModuleListRecordFor<'purchase-order'>

    await act(async () => {
      await latest.openInlineDetail(firstRecord)
    })
    await act(async () => {
      await latest.openInlineDetail(secondRecord)
    })
    await flushAsync()

    expect(latest.inlineExpandedRowKeys).toEqual(['1', '2'])
    expect(
      latest.inlineDetailItems.map((item) => [item.recordId, item.record?.id]),
    ).toEqual([
      ['1', '1'],
      ['2', '2'],
    ])
    expect(getBusinessModuleDetailMock).toHaveBeenCalledTimes(2)

    act(() => {
      latest.closeInlineDetail('1')
    })

    expect(latest.inlineExpandedRowKeys).toEqual(['2'])
    expect(latest.inlineDetailItems.map((item) => item.recordId)).toEqual(['2'])
  })
})
