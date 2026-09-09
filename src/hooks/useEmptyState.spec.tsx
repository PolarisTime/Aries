// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { type EmptyStateViewConfig, useEmptyState } from '@/hooks/useEmptyState'

describe('useEmptyState', () => {
  let root: Root
  let container: HTMLDivElement
  let latest: EmptyStateViewConfig | null

  function Probe(props: Parameters<typeof useEmptyState>[0]) {
    latest = useEmptyState(props)
    return null
  }

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    latest = null
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const renderInput = (input: Parameters<typeof useEmptyState>[0]) => {
    act(() => {
      root.render(createElement(Probe, input))
    })
  }

  it('error 优先级最高，覆盖无权限、筛选与数据状态', () => {
    const onRetry = vi.fn()
    renderInput({
      hasData: false,
      hasFilters: true,
      hasError: true,
      hasPermission: false,
      onRetry,
    })

    expect(latest?.type).toBe('error')
    expect(latest?.secondaryAction).toEqual({
      label: expect.any(String),
      onClick: onRetry,
    })
  })

  it('no-permission 次于 error，高于筛选与数据状态', () => {
    renderInput({
      hasData: false,
      hasFilters: true,
      hasPermission: false,
      onResetFilters: vi.fn(),
    })

    expect(latest?.type).toBe('no-permission')
    expect(latest?.primaryAction).toBeUndefined()
    expect(latest?.secondaryAction).toBeUndefined()
  })

  it('有筛选且无数据时展示 no-result，并接入清空筛选回调', () => {
    const onResetFilters = vi.fn()
    renderInput({ hasData: false, hasFilters: true, onResetFilters })

    expect(latest?.type).toBe('no-result')
    expect(latest?.secondaryAction).toEqual({
      label: expect.any(String),
      onClick: onResetFilters,
    })
    expect(latest?.primaryAction).toBeUndefined()
  })

  it('无筛选且无数据时展示 no-data，可创建时提供创建入口', () => {
    const onCreate = vi.fn()
    renderInput({
      hasData: false,
      hasFilters: false,
      canCreate: true,
      onCreate,
    })

    expect(latest?.type).toBe('no-data')
    expect(latest?.primaryAction).toEqual({
      label: expect.any(String),
      onClick: onCreate,
    })
    expect(latest?.secondaryAction).toBeUndefined()
  })

  it('无筛选且不可创建时 no-data 不提供操作入口', () => {
    renderInput({ hasData: false, hasFilters: false, canCreate: false })

    expect(latest?.type).toBe('no-data')
    expect(latest?.primaryAction).toBeUndefined()
  })

  it('hasData 为 true 时不展示空状态', () => {
    renderInput({
      hasData: true,
      hasFilters: true,
      hasError: false,
      onResetFilters: vi.fn(),
    })

    expect(latest).toBeNull()
  })

  it('hasData 为 null（状态未知）时不展示空状态', () => {
    renderInput({ hasData: null, hasFilters: true })

    expect(latest).toBeNull()
  })

  it('hasError 但未提供 onRetry 时不输出重试操作', () => {
    renderInput({ hasData: false, hasError: true })

    expect(latest?.type).toBe('error')
    expect(latest?.secondaryAction).toBeUndefined()
  })
})
