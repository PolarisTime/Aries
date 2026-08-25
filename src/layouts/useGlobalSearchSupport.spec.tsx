// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GlobalSearchResult } from '@/types/global-search'

const searchGlobalDocumentsMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/system/global-search', () => ({
  searchGlobalDocuments: searchGlobalDocumentsMock,
}))

import { useGlobalSearchSupport } from '@/layouts/useGlobalSearchSupport'

const searchResult: GlobalSearchResult = {
  value: 'sales-order::order-1',
  label: '销售订单 | SO-2026-001',
  moduleKey: 'sales-order',
  title: '销售订单',
  trackId: 'order-1',
  primaryNo: 'SO-2026-001',
  summary: '',
  matchedByTrackId: false,
}

describe('useGlobalSearchSupport', () => {
  let root: Root
  let container: HTMLDivElement
  let latest: ReturnType<typeof useGlobalSearchSupport>

  function Probe() {
    latest = useGlobalSearchSupport({
      moduleKeys: ['sales-order'],
      onJump: vi.fn(),
    })
    return null
  }

  beforeEach(() => {
    vi.useFakeTimers()
    searchGlobalDocumentsMock.mockReset()
    searchGlobalDocumentsMock.mockResolvedValue([searchResult])
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
    vi.useRealTimers()
  })

  it('debounces complete document number input and reuses the result on submit', async () => {
    await act(async () => {
      latest.handleSearch('SO-2026-001')
      vi.advanceTimersByTime(300)
      await Promise.resolve()
    })

    expect(searchGlobalDocumentsMock).toHaveBeenCalledTimes(1)
    expect(searchGlobalDocumentsMock).toHaveBeenCalledWith(
      'SO-2026-001',
      ['sales-order'],
      expect.any(AbortSignal),
    )

    await act(async () => {
      await latest.handleSubmit('SO-2026-001')
    })

    expect(searchGlobalDocumentsMock).toHaveBeenCalledTimes(1)
  })

  it('does not query for a single-character keyword', async () => {
    await act(async () => {
      latest.handleSearch('S')
      vi.advanceTimersByTime(500)
      await Promise.resolve()
    })

    expect(searchGlobalDocumentsMock).not.toHaveBeenCalled()
  })
})
