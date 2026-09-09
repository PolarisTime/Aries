// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { type PatchStateUpdater, usePatchState } from '@/hooks/usePatchState'
import type { ModuleRecord } from '@/types/module-page'
import {
  type ParentSelectorState,
  parentSelectorInitialState,
} from './use-parent-selector-data'
import { useParentSelectorSelection } from './use-parent-selector-selection'

const records: ModuleRecord[] = [
  { id: '9001', orderNo: 'PO-001' },
  { id: '9002', orderNo: 'PO-002' },
  { id: '9003', orderNo: 'PO-003' },
]

describe('useParentSelectorSelection', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  function renderSelectionHook(initialState?: Partial<ParentSelectorState>) {
    let result!: ReturnType<typeof useParentSelectorSelection>
    let state!: ParentSelectorState
    let setState!: (patch: PatchStateUpdater<ParentSelectorState>) => void

    function Probe() {
      const patchState = usePatchState({
        ...parentSelectorInitialState,
        ...initialState,
      })
      state = patchState[0]
      setState = patchState[1]
      result = useParentSelectorSelection({
        state,
        setState,
        records,
      })
      return null
    }

    act(() => {
      root.render(createElement(Probe))
    })
    return {
      get result() {
        return result
      },
      get state() {
        return state
      },
    }
  }

  it('toggleRecordSelection 勾选后再次勾选取消', () => {
    const hook = renderSelectionHook()
    act(() => {
      hook.result.toggleRecordSelection(records[0])
    })
    expect(hook.result.selectedRowKeys).toEqual(['9001'])
    expect(hook.result.selectedRows.map((row) => row.id)).toEqual(['9001'])
    act(() => {
      hook.result.toggleRecordSelection(records[0])
    })
    expect(hook.result.selectedRowKeys).toEqual([])
    expect(hook.result.selectedRows).toEqual([])
  })

  it('toggleRecordSelection 支持多行复选', () => {
    const hook = renderSelectionHook()
    act(() => {
      hook.result.toggleRecordSelection(records[0])
    })
    act(() => {
      hook.result.toggleRecordSelection(records[2])
    })
    expect(hook.result.selectedRowKeys).toEqual(['9001', '9003'])
  })

  it('selectSingleRecord 单选确认制：仅保留最后选中行', () => {
    const hook = renderSelectionHook({
      selectedRowKeys: ['9001'],
      selectedRecordMap: { '9001': records[0] },
    })
    act(() => {
      hook.result.selectSingleRecord(records[2])
    })
    expect(hook.result.selectedRowKeys).toEqual(['9003'])
    expect(Object.keys(hook.state.selectedRecordMap)).toEqual(['9003'])
  })

  it('removeSelectedRecord 命中已选缓存时同步清理 keys 与 map', () => {
    const hook = renderSelectionHook({
      selectedRowKeys: ['9001', '9002'],
      selectedRecordMap: { '9001': records[0], '9002': records[1] },
    })
    act(() => {
      hook.result.removeSelectedRecord('9001')
    })
    expect(hook.result.selectedRowKeys).toEqual(['9002'])
    expect(hook.state.selectedRecordMap['9001']).toBeUndefined()
    expect(hook.state.selectedRecordMap['9002']).toBeDefined()
  })

  it('removeSelectedRecord 未命中缓存时仅清理 keys', () => {
    const hook = renderSelectionHook({
      selectedRowKeys: ['9001', 'ghost'],
      selectedRecordMap: { '9001': records[0] },
    })
    act(() => {
      hook.result.removeSelectedRecord('ghost')
    })
    expect(hook.result.selectedRowKeys).toEqual(['9001'])
  })

  it('handleClearSelectedRecords 清空全部选择', () => {
    const hook = renderSelectionHook({
      selectedRowKeys: ['9001'],
      selectedRecordMap: { '9001': records[0] },
    })
    act(() => {
      hook.result.handleClearSelectedRecords()
    })
    expect(hook.result.selectedRowKeys).toEqual([])
    expect(hook.state.selectedRecordMap).toEqual({})
  })

  it('handleSelectedRowsChange 合并当前页行与跨页缓存行', () => {
    const hook = renderSelectionHook({
      selectedRowKeys: ['9003'],
      selectedRecordMap: { '9003': records[2] },
    })
    act(() => {
      hook.result.handleSelectedRowsChange(['9001', '9003'], [records[0]])
    })
    expect(hook.result.selectedRowKeys).toEqual(['9001', '9003'])
    expect(hook.state.selectedRecordMap['9001']).toEqual(records[0])
    expect(hook.state.selectedRecordMap['9003']).toEqual(records[2])
  })
})
