// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fetchRecommendationsMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/purchase/purchase-order-warehouse-recommendations', () => ({
  fetchPurchaseOrderWarehouseRecommendations: fetchRecommendationsMock,
}))

import type { ModuleLineItem } from '@/types/module-page'
import { usePurchaseOrderWarehouseRecommendations } from '@/views/modules/use-purchase-order-warehouse-recommendations'

interface HarnessProps {
  enabled: boolean
  supplierId: unknown
  initialItems: ModuleLineItem[]
}

interface HarnessResult {
  items: ModuleLineItem[]
}

function Probe({
  result,
  enabled,
  supplierId,
  initialItems,
}: HarnessProps & { result: HarnessResult }) {
  const [items, setItems] = useState<ModuleLineItem[]>(initialItems)
  usePurchaseOrderWarehouseRecommendations({
    enabled,
    supplierId,
    items,
    setItems,
  })
  result.items = items
  return null
}

describe('usePurchaseOrderWarehouseRecommendations', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  beforeEach(() => {
    fetchRecommendationsMock.mockReset()
    fetchRecommendationsMock.mockResolvedValue([
      {
        materialId: '100',
        warehouseId: '200',
        warehouseCode: 'W01',
        warehouseName: '主仓',
      },
    ])
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    queryClient.clear()
  })

  function render(props: HarnessProps): HarnessResult {
    const result: HarnessResult = { items: props.initialItems }
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(Probe, { ...props, result }),
        ),
      )
    })
    return result
  }

  it('拉取推荐并把结果写回编辑器 items', async () => {
    const result = render({
      enabled: true,
      supplierId: '9',
      initialItems: [{ id: '1', materialId: '100' }],
    })

    await vi.waitFor(() => {
      expect(result.items[0]?.warehouseId).toBe('200')
    })
    expect(result.items[0]?.warehouseName).toBe('主仓')
    expect(result.items[0]?._warehouseSelectionSource).toBe('recommended')
    expect(result.items[0]?._warehouseRecommendationKey).toBe('9:100')
    expect(fetchRecommendationsMock).toHaveBeenCalledTimes(1)
    expect(fetchRecommendationsMock).toHaveBeenCalledWith(
      '9',
      ['100'],
      expect.anything(),
    )
  })

  it('无推荐结果时写入空仓库并标记推荐来源', async () => {
    fetchRecommendationsMock.mockResolvedValue([])
    const result = render({
      enabled: true,
      supplierId: '9',
      initialItems: [{ id: '1', materialId: '100' }],
    })

    await vi.waitFor(() => {
      expect(result.items[0]?._warehouseRecommendationKey).toBe('9:100')
    })
    expect(result.items[0]?.warehouseId).toBeUndefined()
    expect(result.items[0]?.warehouseName).toBe('')
    expect(result.items[0]?._warehouseSelectionSource).toBe('recommended')
  })

  it('不覆盖用户手动选择的仓库', () => {
    const result = render({
      enabled: true,
      supplierId: '9',
      initialItems: [
        {
          id: '1',
          materialId: '100',
          warehouseId: '999',
          warehouseName: '手选仓',
          _warehouseSelectionSource: 'manual',
        },
      ],
    })

    expect(fetchRecommendationsMock).not.toHaveBeenCalled()
    expect(result.items[0]?.warehouseId).toBe('999')
    expect(result.items[0]?.warehouseName).toBe('手选仓')
  })

  it('关闭时不发起请求', () => {
    const result = render({
      enabled: false,
      supplierId: '9',
      initialItems: [{ id: '1', materialId: '100' }],
    })

    expect(fetchRecommendationsMock).not.toHaveBeenCalled()
    expect(result.items[0]?.warehouseId).toBeUndefined()
  })

  it('缺少供应商时不发起请求', () => {
    render({
      enabled: true,
      supplierId: undefined,
      initialItems: [{ id: '1', materialId: '100' }],
    })

    expect(fetchRecommendationsMock).not.toHaveBeenCalled()
  })

  it('已匹配推荐 key 的行不会被重复请求', () => {
    render({
      enabled: true,
      supplierId: '9',
      initialItems: [
        {
          id: '1',
          materialId: '100',
          warehouseId: '200',
          warehouseName: '主仓',
          _warehouseSelectionSource: 'recommended',
          _warehouseRecommendationKey: '9:100',
        },
      ],
    })

    expect(fetchRecommendationsMock).not.toHaveBeenCalled()
  })

  it('供应商变化时清理过期推荐仓库并重新请求', async () => {
    const result = render({
      enabled: true,
      supplierId: '8',
      initialItems: [
        {
          id: '1',
          materialId: '100',
          warehouseId: '200',
          warehouseName: '主仓',
          _warehouseSelectionSource: 'recommended',
          _warehouseRecommendationKey: '9:100',
        },
      ],
    })

    await vi.waitFor(() => {
      expect(result.items[0]?._warehouseRecommendationKey).toBe('8:100')
    })
    expect(result.items[0]?.warehouseId).toBe('200')
    expect(fetchRecommendationsMock).toHaveBeenCalledWith(
      '8',
      ['100'],
      expect.anything(),
    )
  })
})
