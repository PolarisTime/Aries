// @vitest-environment jsdom

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
  let latest: ReturnType<typeof useDetailSupport<'purchase-order'>>

  function Probe() {
    latest = useDetailSupport({
      moduleKey: 'purchase-order',
      config: purchaseOrdersPageConfig,
    })
    return null
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
    act(() => {
      root.render(createElement(Probe))
    })
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
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

    expect(latest.detailItems.map((item) => item.recordId)).toEqual(['1', '2'])
    expect(getBusinessModuleDetailMock).toHaveBeenCalledTimes(2)

    act(() => {
      latest.closeDetail('1')
    })

    expect(latest.detailItems.map((item) => item.recordId)).toEqual(['2'])
  })
})
