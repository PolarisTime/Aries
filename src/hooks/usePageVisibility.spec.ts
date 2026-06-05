import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { usePageVisibility } from './usePageVisibility'

describe('usePageVisibility', () => {
  const originalVisibilityState = document.visibilityState

  afterEach(() => {
    Object.defineProperty(document, 'visibilityState', {
      value: originalVisibilityState,
      writable: true,
    })
  })

  it('returns true when page is visible', () => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
    })
    const { result } = renderHook(() => usePageVisibility())
    expect(result.current).toBe(true)
  })

  it('returns false when page is hidden', () => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
    })
    const { result } = renderHook(() => usePageVisibility())
    expect(result.current).toBe(false)
  })
})
