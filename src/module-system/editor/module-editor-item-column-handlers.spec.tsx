// @vitest-environment jsdom

import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useModuleEditorItemColumnHandlers } from '@/module-system/editor/module-editor-item-column-handlers'
import { applyMaterialToEditorLineItem } from '@/module-system/editor/module-editor-line-item-utils'
import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'

interface ProbeResult {
  items: ModuleLineItem[]
  select: (materialId: string, materialRecord: ModuleRecord | null) => void
}

const material = (overrides: Record<string, unknown>): ModuleRecord => ({
  id: '347011099205312512',
  materialCode: 'M-001',
  brand: '泸钢',
  category: '盘螺',
  material: 'HRB400E',
  spec: '8',
  length: '9米',
  ...overrides,
})

function Probe({ result }: { result: ProbeResult }) {
  const [items, setItems] = useState<ModuleLineItem[]>([
    { id: 'item-1', quantityUnit: '件' },
  ])
  const { handleMaterialSelect } = useModuleEditorItemColumnHandlers({
    moduleKey: 'sales-order',
    setItems,
  })

  result.items = items
  result.select = (materialId, materialRecord) => {
    handleMaterialSelect('item-1', materialId, materialRecord, (item, record) =>
      applyMaterialToEditorLineItem(item, record, 'sales-order'),
    )
  }
  return null
}

describe('商品浮层选择后数量单位跟随商品', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const mount = () => {
    const result = {} as ProbeResult
    act(() => {
      root.render(createElement(Probe, { result }))
    })
    return result
  }

  it('unit=支 的商品写入行数量单位「支」', () => {
    const result = mount()
    act(() => {
      result.select('347011099205312512', material({ unit: '支' }))
    })
    expect(result.items[0].quantityUnit).toBe('支')
  })

  it('unit=件 的商品保持「件」', () => {
    const result = mount()
    act(() => {
      result.select('347011099205312512', material({ unit: '件' }))
    })
    expect(result.items[0].quantityUnit).toBe('件')
  })

  it('商品 unit 缺失时回落「件」', () => {
    const result = mount()
    act(() => {
      result.select('347011099205312512', material({ unit: undefined }))
    })
    expect(result.items[0].quantityUnit).toBe('件')
  })
})
