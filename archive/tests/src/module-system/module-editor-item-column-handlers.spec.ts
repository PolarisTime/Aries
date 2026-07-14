import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useModuleEditorItemColumnHandlers } from './module-editor-item-column-handlers'

vi.mock('./module-adapter-editor', () => ({
  recalculateEditorLineItem: vi.fn((item, key) => ({
    ...item,
    recalculated: key,
  })),
}))

describe('useModuleEditorItemColumnHandlers', () => {
  let setItems: ReturnType<typeof vi.fn>
  let items: any[]

  beforeEach(() => {
    items = []
    setItems = vi.fn((updater: any) => {
      if (typeof updater === 'function') {
        items = updater(items)
      } else {
        items = updater
      }
    })
  })

  it('returns all handler functions', () => {
    const { result } = renderHook(() =>
      useModuleEditorItemColumnHandlers({ setItems }),
    )
    expect(result.current.handleItemNumberChange).toBeInstanceOf(Function)
    expect(result.current.handleItemInputChange).toBeInstanceOf(Function)
    expect(result.current.handleMaterialSelect).toBeInstanceOf(Function)
    expect(result.current.handleWarehouseSelect).toBeInstanceOf(Function)
    expect(result.current.handleSettlementModeChange).toBeInstanceOf(Function)
  })

  describe('handleItemNumberChange', () => {
    it('updates item number value', () => {
      const { result } = renderHook(() =>
        useModuleEditorItemColumnHandlers({ setItems }),
      )
      items = [
        { id: '1', quantity: 10 },
        { id: '2', quantity: 20 },
      ]

      act(() => {
        result.current.handleItemNumberChange('1', 'quantity', 15)
      })

      expect(setItems).toHaveBeenCalled()
      expect(items[0].quantity).toBe(15)
      expect(items[1].quantity).toBe(20)
    })

    it('converts null to 0', () => {
      const { result } = renderHook(() =>
        useModuleEditorItemColumnHandlers({ setItems }),
      )
      items = [{ id: '1', quantity: 10 }]

      act(() => {
        result.current.handleItemNumberChange('1', 'quantity', null)
      })

      expect(items[0].quantity).toBe(0)
    })

    it('converts undefined to 0', () => {
      const { result } = renderHook(() =>
        useModuleEditorItemColumnHandlers({ setItems }),
      )
      items = [{ id: '1', quantity: 10 }]

      act(() => {
        result.current.handleItemNumberChange('1', 'quantity', undefined)
      })

      expect(items[0].quantity).toBe(0)
    })

    it('does not update other items', () => {
      const { result } = renderHook(() =>
        useModuleEditorItemColumnHandlers({ setItems }),
      )
      items = [
        { id: '1', quantity: 10 },
        { id: '2', quantity: 20 },
      ]

      act(() => {
        result.current.handleItemNumberChange('2', 'quantity', 30)
      })

      expect(items[0].quantity).toBe(10)
      expect(items[1].quantity).toBe(30)
    })
  })

  describe('handleItemInputChange', () => {
    it('updates item input value', () => {
      const { result } = renderHook(() =>
        useModuleEditorItemColumnHandlers({ setItems }),
      )
      items = [{ id: '1', name: 'test' }]

      act(() => {
        result.current.handleItemInputChange('1', 'name', 'new value')
      })

      expect(items[0].name).toBe('new value')
    })

    it('does not update other items', () => {
      const { result } = renderHook(() =>
        useModuleEditorItemColumnHandlers({ setItems }),
      )
      items = [
        { id: '1', name: 'test1' },
        { id: '2', name: 'test2' },
      ]

      act(() => {
        result.current.handleItemInputChange('2', 'name', 'new value')
      })

      expect(items[0].name).toBe('test1')
      expect(items[1].name).toBe('new value')
    })
  })

  describe('handleMaterialSelect', () => {
    it('atomically writes material identity and the authoritative code snapshot', () => {
      const { result } = renderHook(() =>
        useModuleEditorItemColumnHandlers({ setItems }),
      )
      items = [
        {
          id: '1',
          materialId: '100',
          materialCode: 'OLD',
          brand: '旧品牌',
        },
      ]
      const materialRecord = {
        id: '200',
        materialCode: 'M-200',
        brand: '权威品牌',
      }
      const applyMaterial = vi.fn((item, record) => ({
        ...item,
        brand: record?.brand,
      }))

      act(() => {
        result.current.handleMaterialSelect(
          '1',
          '200',
          materialRecord,
          applyMaterial,
        )
      })

      expect(applyMaterial).toHaveBeenCalledWith(
        expect.objectContaining({
          materialId: '200',
          materialCode: 'M-200',
        }),
        materialRecord,
      )
      expect(items[0]).toMatchObject({
        materialId: '200',
        materialCode: 'M-200',
        brand: '权威品牌',
      })
    })

    it('atomically clears material identity before clearing its snapshots', () => {
      const { result } = renderHook(() =>
        useModuleEditorItemColumnHandlers({ setItems }),
      )
      items = [{ id: '1', materialId: '100', materialCode: 'OLD' }]
      const applyMaterial = vi.fn((item) => ({
        ...item,
        brand: '',
      }))

      act(() => {
        result.current.handleMaterialSelect('1', '', null, applyMaterial)
      })

      expect(applyMaterial).toHaveBeenCalledWith(
        expect.objectContaining({
          materialId: undefined,
          materialCode: '',
        }),
        null,
      )
      expect(items[0]).toMatchObject({
        materialId: undefined,
        materialCode: '',
        brand: '',
      })
    })

    it('updates material code from the selected record', () => {
      const { result } = renderHook(() =>
        useModuleEditorItemColumnHandlers({ setItems }),
      )
      items = [{ id: '1', materialCode: 'old' }]

      act(() => {
        result.current.handleMaterialSelect('1', '200', {
          id: '200',
          materialCode: 'new-code',
        })
      })

      expect(items[0].materialId).toBe('200')
      expect(items[0].materialCode).toBe('new-code')
    })

    it('keeps other items when selecting material', () => {
      const { result } = renderHook(() =>
        useModuleEditorItemColumnHandlers({ setItems }),
      )
      items = [
        { id: '1', materialCode: 'old-1' },
        { id: '2', materialCode: 'old-2' },
      ]

      act(() => {
        result.current.handleMaterialSelect('1', '200', {
          id: '200',
          materialCode: 'new-code',
        })
      })

      expect(items[0].materialCode).toBe('new-code')
      expect(items[1].materialCode).toBe('old-2')
    })

    it('applies material when applyMaterial provided', () => {
      const { result } = renderHook(() =>
        useModuleEditorItemColumnHandlers({ setItems }),
      )
      items = [{ id: '1', materialCode: 'old' }]
      const applyMaterial = vi.fn((item) => ({ ...item, applied: true }))
      const materialRecord = {
        id: '200',
        materialCode: 'new-code',
        name: 'Material A',
      }

      act(() => {
        result.current.handleMaterialSelect(
          '1',
          '200',
          materialRecord,
          applyMaterial,
        )
      })

      expect(applyMaterial).toHaveBeenCalled()
      expect(items[0].applied).toBe(true)
    })

    it('keeps non-target rows when applying material', () => {
      const { result } = renderHook(() =>
        useModuleEditorItemColumnHandlers({ setItems }),
      )
      items = [
        { id: '1', materialCode: 'new-code' },
        { id: '2', materialCode: 'other-code' },
      ]
      const applyMaterial = vi.fn((item) => ({ ...item, applied: true }))
      const materialRecord = { id: '200', materialCode: 'new-code' }

      act(() => {
        result.current.handleMaterialSelect(
          '1',
          '200',
          materialRecord,
          applyMaterial,
        )
      })

      expect(items[0].applied).toBe(true)
      expect(items[1]).toEqual({ id: '2', materialCode: 'other-code' })
    })
  })

  describe('handleWarehouseSelect', () => {
    it('atomically writes warehouse id and the authoritative name snapshot', () => {
      const { result } = renderHook(() =>
        useModuleEditorItemColumnHandlers({ setItems }),
      )
      items = [{ id: '1', warehouseId: '100', warehouseName: '旧仓' }]

      act(() => {
        result.current.handleWarehouseSelect('1', '200', {
          id: '200',
          value: '200',
          label: 'WH-200 / 新仓',
          warehouseCode: 'WH-200',
          warehouseName: '新仓',
        })
      })

      expect(items[0]).toMatchObject({
        warehouseId: '200',
        warehouseName: '新仓',
      })
    })

    it('clears warehouse id and name together', () => {
      const { result } = renderHook(() =>
        useModuleEditorItemColumnHandlers({ setItems }),
      )
      items = [{ id: '1', warehouseId: '100', warehouseName: '旧仓' }]

      act(() => {
        result.current.handleWarehouseSelect('1', '', null)
      })

      expect(items[0]).toMatchObject({
        warehouseId: undefined,
        warehouseName: '',
      })
    })

    it('updates warehouse name from the selected option', () => {
      const { result } = renderHook(() =>
        useModuleEditorItemColumnHandlers({ setItems }),
      )
      items = [{ id: '1', warehouseName: 'old' }]

      act(() => {
        result.current.handleWarehouseSelect('1', '200', {
          id: '200',
          value: '200',
          label: 'new-warehouse',
          warehouseCode: 'WH-200',
          warehouseName: 'new-warehouse',
        })
      })

      expect(items[0].warehouseName).toBe('new-warehouse')
    })

    it('keeps other items when updating warehouse name', () => {
      const { result } = renderHook(() =>
        useModuleEditorItemColumnHandlers({ setItems }),
      )
      items = [
        { id: '1', warehouseName: 'old-1' },
        { id: '2', warehouseName: 'old-2' },
      ]

      act(() => {
        result.current.handleWarehouseSelect('1', '200', {
          id: '200',
          value: '200',
          label: 'new-warehouse',
          warehouseCode: 'WH-200',
          warehouseName: 'new-warehouse',
        })
      })

      expect(items[0].warehouseName).toBe('new-warehouse')
      expect(items[1].warehouseName).toBe('old-2')
    })
  })

  describe('handleSettlementModeChange', () => {
    it('updates settlement mode', () => {
      const { result } = renderHook(() =>
        useModuleEditorItemColumnHandlers({ setItems }),
      )
      items = [{ id: '1', settlementMode: 'old' }]

      act(() => {
        result.current.handleSettlementModeChange('1', '过磅')
      })

      expect(items[0].settlementMode).toBe('过磅')
    })

    it('keeps other items when updating settlement mode', () => {
      const { result } = renderHook(() =>
        useModuleEditorItemColumnHandlers({ setItems }),
      )
      items = [
        { id: '1', settlementMode: 'old-1' },
        { id: '2', settlementMode: 'old-2' },
      ]

      act(() => {
        result.current.handleSettlementModeChange('1', '过磅')
      })

      expect(items[0].settlementMode).toBe('过磅')
      expect(items[1].settlementMode).toBe('old-2')
    })
  })
})
