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

  it('兼容旧持久化数据: 忽略 groups/groupId 并摊平行', () => {
    const legacy = {
      sheets: [
        {
          ...externalSheet(),
          groups: [{ id: 'g1', name: '分组 1' }],
          rows: [
            {
              id: 'r1',
              groupId: 'g1',
              category: '螺纹钢',
              material: 'HRB400E',
              spec: 12,
              length: '9米',
            },
          ],
        },
      ],
      activeId: 'ext-1',
      configs: {},
    }
    localStorage.setItem(LS_KEY, JSON.stringify(legacy))
    const store = renderStore()
    const sheet = store.current.sheets[0] as unknown as Record<string, unknown>
    expect(sheet.groups).toBeUndefined()
    const row = store.current.sheets[0].rows[0] as unknown as Record<
      string,
      unknown
    >
    expect(row.groupId).toBeUndefined()
    expect(row.id).toBe('r1')
    expect(store.current.sheets[0].rows).toHaveLength(1)
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

  it('项目级配置补丁持久化品牌限定与备注', async () => {
    const store = renderStore()
    act(() => {
      store.current.assignProjectToUnassigned('p1', '项目')
    })
    act(() => {
      store.current.setConfig({
        brandRestriction: '仅中天',
        remark: '含 12 米',
      })
    })

    expect(store.current.config.brandRestriction).toBe('仅中天')
    expect(store.current.config.remark).toBe('含 12 米')

    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 350)
      })
    })
    const raw = localStorage.getItem(LS_KEY)
    const saved = JSON.parse(raw ?? '{}')
    expect(saved.configs.p1.brandRestriction).toBe('仅中天')
    expect(saved.configs.p1.remark).toBe('含 12 米')
  })
})
