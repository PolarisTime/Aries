// @vitest-environment jsdom

import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { Form } from 'antd'
import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { PrintRecordItem } from '@/api/system/print-template'
import { PrintJobModalBody } from './PrintJobModalBody'
import type { PrintJobFormValues } from './print-job-modal-state'
import type { PrintJobItemsState } from './use-print-job-modal-items'

/**
 * 打印明细区 `DndContext` 的**接线**守护。
 *
 * <p>{@link buildPrintJobDragAccessibility} 本身有单测, 但那只证明"函数算得对":
 * 弹窗忘了把 `accessibility` 传给 `DndContext` 时读屏用户拿到的仍是 dnd-kit 默认英文
 * 说明与「Picked up draggable item &lt;19 位雪花 id&gt;」。这里渲染真实内容区,
 * 断言 dnd-kit 渲染出的隐藏说明文本已经是中文 —— 去掉 `accessibility` 属性即变红。</p>
 */

const ITEM_A_ID = '1834671234567890123'
const ITEM_B_ID = '1834671234567890456'

function buildItem(id: string, material: string): PrintRecordItem {
  return {
    id,
    recordId: '1',
    brand: '莱钢',
    category: '螺纹钢',
    material,
    spec: '12',
    length: '9',
    quantity: '2',
    pieceWeightTon: '0.1',
    weightTon: '0.2',
    unitPrice: '3800',
    amount: '7600',
  }
}

const ITEMS = [buildItem(ITEM_A_ID, 'HRB400E'), buildItem(ITEM_B_ID, 'HPB300')]

function buildItemState(): PrintJobItemsState {
  return {
    effectiveSplitItemIds: [],
    handleDragEnd: vi.fn(),
    handleToggleSplitItem: vi.fn(),
    mergeMarkersByItemId: {},
    orderedPrintItemIds: ITEMS.map((item) => item.id),
    orderedPrintItems: ITEMS,
    outputPrintItemIdSet: new Set<string>(),
    selectedPrintItems: ITEMS,
    showMergeGroup: false,
    splitColumnEnabled: false,
    splitPieceCount: undefined,
  }
}

/** 与 PrintJobModal 的接线一致: 传感器由外层创建后传入内容区。 */
function BodyHarness() {
  const [form] = Form.useForm<PrintJobFormValues>()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )
  return (
    <PrintJobModalBody
      brandOverrideEnabled={false}
      brandOverridesByItemId={{}}
      dispatch={() => undefined}
      form={form}
      itemSelectionEnabled={false}
      itemState={buildItemState()}
      mergeEquivalentItems={false}
      moduleKey="sales-order"
      onDragEnd={() => undefined}
      onRetryPrintItems={() => undefined}
      primaryRecord={undefined}
      printItems={ITEMS}
      printItemsError={false}
      sensors={sensors}
      templates={[]}
    />
  )
}

describe('打印明细区 DndContext 的读屏接线', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
    if (!window.matchMedia) {
      window.matchMedia = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })
    }
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
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
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('渲染中文操作说明而不是 dnd-kit 英文默认文案', () => {
    act(() => {
      root.render(createElement(BodyHarness))
    })

    const text = container.textContent ?? ''
    expect(text).toContain('按空格键拾起当前明细行')
    // 说明里同时给出鼠标右键/Shift+F10 的非拖动替代入口
    expect(text).toContain('Shift+F10')
    expect(text).not.toContain('To pick up a draggable item')
  })
})
