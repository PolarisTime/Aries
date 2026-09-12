// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { PriceSheet } from './types'
import { type SheetsStore, useSheetsStore } from './useSheetsStore'

const LS_KEY = 'aries-price-compare-v5'

function externalSheet(): PriceSheet {
  return {
    id: 'ext-1',
    name: '批次 X',
    status: '报价',
    projectId: 'p1',
    projectName: '项目',
    orderDate: '',
    refDate: '',
    refPeriod: '',
    lengthPremium: 30,
    inputs: {},
    groups: [{ id: 'g1', name: '分组 1' }],
    rows: [],
  }
}

describe('useSheetsStore 多标签页同步', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    localStorage.clear()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    localStorage.clear()
  })

  function renderStore() {
    let result!: SheetsStore
    function Probe() {
      result = useSheetsStore()
      return null
    }
    act(() => {
      root.render(createElement(Probe))
    })
    return {
      get current() {
        return result
      },
    }
  }

  it('外部 storage 变化时同步单据状态', () => {
    const store = renderStore()
    const external = {
      sheets: [externalSheet()],
      activeId: 'ext-1',
      configs: {},
    }
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: LS_KEY,
          newValue: JSON.stringify(external),
        }),
      )
    })
    expect(store.current.sheets).toHaveLength(1)
    expect(store.current.sheets[0].id).toBe('ext-1')
    expect(store.current.activeId).toBe('ext-1')
  })

  it('忽略非本 key 与非法 JSON 的变化', () => {
    const store = renderStore()
    const before = store.current.sheets
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'other', newValue: '{}' }),
      )
      window.dispatchEvent(
        new StorageEvent('storage', { key: LS_KEY, newValue: 'not-json' }),
      )
    })
    expect(store.current.sheets).toBe(before)
  })
})
