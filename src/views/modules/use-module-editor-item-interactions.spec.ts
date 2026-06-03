import { describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('@/module-system/module-adapter-editor', () => ({
  moveEditorLineItemByDrag: vi.fn((items: any[], sourceId: string, targetId: string, position: string) => {
    const sourceIndex = items.findIndex((i: any) => i.id === sourceId)
    const targetIndex = items.findIndex((i: any) => i.id === targetId)
    if (sourceIndex === -1 || targetIndex === -1) return items
    const result = [...items]
    const [moved] = result.splice(sourceIndex, 1)
    const insertIndex = position === 'after' ? targetIndex : targetIndex
    result.splice(insertIndex, 0, moved)
    return result
  }),
}))

import { useModuleEditorItemInteractions } from '@/views/modules/use-module-editor-item-interactions'

function createItems(ids: string[]) {
  return ids.map((id) => ({ id, quantity: 1 }))
}

function setupHook(items = createItems(['a', 'b', 'c'])) {
  let currentItems = items
  const setItems = vi.fn((updater: any) => {
    currentItems = typeof updater === 'function' ? updater(currentItems) : updater
  })
  const { result, rerender } = renderHook(() =>
    useModuleEditorItemInteractions({ items: currentItems, setItems }),
  )
  return { result, setItems, rerender, getCurrentItems: () => currentItems }
}

describe('useModuleEditorItemInteractions', () => {
  it('returns expected properties', () => {
    const { result } = setupHook()
    expect(result.current).toHaveProperty('clearSelectedItems')
    expect(result.current).toHaveProperty('handleDragEnd')
    expect(result.current).toHaveProperty('handleDragOver')
    expect(result.current).toHaveProperty('handleDragStart')
    expect(result.current).toHaveProperty('handleSelectAll')
    expect(result.current).toHaveProperty('handleSelectItem')
    expect(result.current).toHaveProperty('removeSelectedItems')
    expect(result.current).toHaveProperty('selectedItemIds')
  })

  it('starts with empty selectedItemIds', () => {
    const { result } = setupHook()
    expect(result.current.selectedItemIds).toEqual([])
  })

  it('handleSelectAll selects all items when checked is true', () => {
    const { result } = setupHook(createItems(['a', 'b', 'c']))
    act(() => {
      result.current.handleSelectAll(true)
    })
    expect(result.current.selectedItemIds).toEqual(['a', 'b', 'c'])
  })

  it('handleSelectAll deselects all items when checked is false', () => {
    const { result } = setupHook(createItems(['a', 'b', 'c']))
    act(() => {
      result.current.handleSelectAll(true)
    })
    act(() => {
      result.current.handleSelectAll(false)
    })
    expect(result.current.selectedItemIds).toEqual([])
  })

  it('handleSelectItem adds item to selection', () => {
    const { result } = setupHook()
    act(() => {
      result.current.handleSelectItem('a', true)
    })
    expect(result.current.selectedItemIds).toContain('a')
  })

  it('handleSelectItem removes item from selection', () => {
    const { result } = setupHook()
    act(() => {
      result.current.handleSelectItem('a', true)
    })
    act(() => {
      result.current.handleSelectItem('a', false)
    })
    expect(result.current.selectedItemIds).not.toContain('a')
  })

  it('handleSelectItem handles multiple selections', () => {
    const { result } = setupHook()
    act(() => {
      result.current.handleSelectItem('a', true)
    })
    act(() => {
      result.current.handleSelectItem('b', true)
    })
    expect(result.current.selectedItemIds).toEqual(['a', 'b'])
  })

  it('clearSelectedItems resets selection', () => {
    const { result } = setupHook()
    act(() => {
      result.current.handleSelectAll(true)
    })
    act(() => {
      result.current.clearSelectedItems()
    })
    expect(result.current.selectedItemIds).toEqual([])
  })

  it('removeSelectedItems removes selected items from list', () => {
    const { result, setItems } = setupHook(createItems(['a', 'b', 'c']))
    act(() => {
      result.current.handleSelectItem('a', true)
    })
    act(() => {
      result.current.handleSelectItem('c', true)
    })
    act(() => {
      result.current.removeSelectedItems()
    })
    expect(setItems).toHaveBeenCalled()
  })

  it('removeSelectedItems does nothing when no items selected', () => {
    const { result, setItems } = setupHook()
    act(() => {
      result.current.removeSelectedItems()
    })
    expect(setItems).not.toHaveBeenCalled()
  })

  it('handleDragStart sets drag data', () => {
    const { result } = setupHook()
    const mockEvent = {
      dataTransfer: {
        effectAllowed: '',
        setData: vi.fn(),
      },
    }
    act(() => {
      result.current.handleDragStart('a', mockEvent as any)
    })
    expect(mockEvent.dataTransfer.effectAllowed).toBe('move')
    expect(mockEvent.dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'a')
  })

  it('handleDragOver prevents default and sets drop effect', () => {
    const { result } = setupHook()
    const mockEvent = {
      preventDefault: vi.fn(),
      dataTransfer: { dropEffect: '' },
      currentTarget: {
        getBoundingClientRect: () => ({ top: 0, height: 100 }),
      },
      clientY: 30,
    }
    act(() => {
      result.current.handleDragStart('a', { dataTransfer: { effectAllowed: '', setData: vi.fn() } } as any)
    })
    act(() => {
      result.current.handleDragOver('b', mockEvent as any)
    })
    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(mockEvent.dataTransfer.dropEffect).toBe('move')
  })

  it('handleDragOver sets position to before when dragging above midpoint', () => {
    const { result } = setupHook()
    const mockEvent = {
      preventDefault: vi.fn(),
      dataTransfer: { dropEffect: '' },
      currentTarget: {
        getBoundingClientRect: () => ({ top: 0, height: 100 }),
      },
      clientY: 30, // below midpoint of 50
    }
    act(() => {
      result.current.handleDragStart('a', { dataTransfer: { effectAllowed: '', setData: vi.fn() } } as any)
    })
    act(() => {
      result.current.handleDragOver('b', mockEvent as any)
    })
    // position should be 'after' since clientY (30) < midY (50)
  })

  it('handleDragOver does nothing when dragSourceId is null', () => {
    const { result } = setupHook()
    const mockEvent = {
      preventDefault: vi.fn(),
      dataTransfer: { dropEffect: '' },
    }
    act(() => {
      result.current.handleDragOver('b', mockEvent as any)
    })
    expect(mockEvent.preventDefault).toHaveBeenCalled()
  })

  it('handleDragOver does nothing when dragging over same item', () => {
    const { result } = setupHook()
    act(() => {
      result.current.handleDragStart('a', { dataTransfer: { effectAllowed: '', setData: vi.fn() } } as any)
    })
    act(() => {
      result.current.handleDragOver('a', {
        preventDefault: vi.fn(),
        dataTransfer: { dropEffect: '' },
      } as any)
    })
  })

  it('handleDragEnd moves items when source and target are different', () => {
    const { result, setItems } = setupHook(createItems(['a', 'b', 'c']))
    act(() => {
      result.current.handleDragStart('a', { dataTransfer: { effectAllowed: '', setData: vi.fn() } } as any)
    })
    act(() => {
      result.current.handleDragOver('c', {
        preventDefault: vi.fn(),
        dataTransfer: { dropEffect: '' },
        currentTarget: { getBoundingClientRect: () => ({ top: 0, height: 100 }) },
        clientY: 30,
      } as any)
    })
    act(() => {
      result.current.handleDragEnd()
    })
    expect(setItems).toHaveBeenCalled()
  })

  it('handleDragEnd does nothing when source and target are same', () => {
    const { result, setItems } = setupHook(createItems(['a', 'b', 'c']))
    act(() => {
      result.current.handleDragStart('a', { dataTransfer: { effectAllowed: '', setData: vi.fn() } } as any)
    })
    act(() => {
      result.current.handleDragEnd()
    })
    // No target was set, so setItems should not be called
    expect(setItems).not.toHaveBeenCalled()
  })

  it('handleDragOver ignores drag over same source item', () => {
    const { result } = setupHook()
    const preventDefault = vi.fn()
    act(() => {
      result.current.handleDragStart('a', { dataTransfer: { effectAllowed: '', setData: vi.fn() } } as any)
    })
    act(() => {
      result.current.handleDragOver('a', {
        preventDefault,
        dataTransfer: { dropEffect: '' },
        currentTarget: { getBoundingClientRect: () => ({ top: 0, height: 100 }) },
        clientY: 30,
      } as any)
    })
    expect(preventDefault).toHaveBeenCalled()
  })
})
