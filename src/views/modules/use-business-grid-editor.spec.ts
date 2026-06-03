import { describe, expect, it, vi } from 'vitest'

vi.mock('@/api/business', () => ({
  getBusinessModuleDetail: vi.fn(),
  listAllBusinessModuleRows: vi.fn(),
}))

vi.mock('@/api/module-contracts', () => ({
  getModuleConfig: vi.fn(() => ({ readOnly: false })),
}))

vi.mock('@/module-system/module-behavior-registry', () => ({
  getBehaviorValue: vi.fn(),
}))

vi.mock('@/utils/type-narrowing', () => ({
  asString: (v: unknown) => String(v ?? ''),
}))

import { renderHook, act } from '@testing-library/react'
import { useBusinessGridEditor } from '@/views/modules/use-business-grid-editor'

describe('useBusinessGridEditor', () => {
  const defaultProps = {
    moduleKey: 'test-module',
    config: {
      readOnly: false,
      itemColumns: [],
    },
  }

  it('returns initial state', () => {
    const { result } = renderHook(() => useBusinessGridEditor(defaultProps))
    expect(result.current.editorOpen).toBe(false)
    expect(result.current.editRecord).toBeNull()
    expect(result.current.editorLockRelatedRows).toEqual([])
    expect(result.current.editorLockLoading).toBe(false)
  })

  it('opens editor with record', async () => {
    const { result } = renderHook(() => useBusinessGridEditor(defaultProps))
    await act(async () => {
      await result.current.openEditor({ id: '1', name: 'Test' })
    })
    expect(result.current.editorOpen).toBe(true)
    expect(result.current.editRecord).toEqual({ id: '1', name: 'Test' })
  })

  it('opens editor with null for new record', async () => {
    const { result } = renderHook(() => useBusinessGridEditor(defaultProps))
    await act(async () => {
      await result.current.openEditor(null)
    })
    expect(result.current.editorOpen).toBe(true)
    expect(result.current.editRecord).toBeNull()
  })

  it('closes editor', async () => {
    const { result } = renderHook(() => useBusinessGridEditor(defaultProps))
    await act(async () => {
      await result.current.openEditor({ id: '1', name: 'Test' })
    })
    expect(result.current.editorOpen).toBe(true)
    act(() => {
      result.current.closeEditor()
    })
    expect(result.current.editorOpen).toBe(false)
    expect(result.current.editRecord).toBeNull()
    expect(result.current.editorLockRelatedRows).toEqual([])
  })

  it('handles saved', async () => {
    const { result } = renderHook(() => useBusinessGridEditor(defaultProps))
    await act(async () => {
      await result.current.openEditor({ id: '1', name: 'Test' })
    })
    act(() => {
      result.current.handleSaved()
    })
    expect(result.current.editorLockRelatedRows).toEqual([])
  })

  it('returns functions', () => {
    const { result } = renderHook(() => useBusinessGridEditor(defaultProps))
    expect(typeof result.current.openEditor).toBe('function')
    expect(typeof result.current.closeEditor).toBe('function')
    expect(typeof result.current.handleSaved).toBe('function')
  })
})
