// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { PriceCompareSheetMeta } from './PriceCompareSheetMeta'

describe('PriceCompareSheetMeta', () => {
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

  afterEach(async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    act(() => root.unmount())
    container.remove()
  })

  const render = (props: {
    savedAt?: string | null
    version?: string | null
  }) => {
    act(() => {
      root.render(createElement(PriceCompareSheetMeta, props))
    })
  }

  it('展示服务端保存时间与版本号, 时间按统一格式渲染到秒', () => {
    render({ savedAt: '2026-10-09 13:50:43', version: '12' })

    const text = container.textContent ?? ''
    expect(text).toContain('保存时间')
    expect(text).toContain('2026年10月09日 13:50:43')
    expect(text).toContain('版本')
    expect(text).toContain('12')
    // 加载失败/未落库时不得出现 Invalid Date
    expect(text).not.toContain('Invalid Date')
  })

  it('缺省保存时间与版本时回落短横线, 不渲染空洞标签', () => {
    render({})

    const text = container.textContent ?? ''
    expect(text).toContain('保存时间')
    expect(text).toContain('版本')
    expect(text).toContain('—')
    expect(text).not.toContain('Invalid Date')
  })

  it('空字符串按缺省处理, 不把空值当成有效版本', () => {
    render({ savedAt: '', version: '' })

    const text = container.textContent ?? ''
    expect(text).toContain('—')
  })

  it('版本为 0 时按有效值展示(乐观锁版本 0 不是空值)', () => {
    render({ savedAt: '2026-10-09 13:50:43', version: '0' })

    const versionValue = container.querySelectorAll(
      '.price-compare-sheet-meta-value',
    )[1]
    expect(versionValue?.textContent).toBe('0')
  })

  it('标签与数值成对渲染, 数值节点带等宽数字样式', () => {
    render({ savedAt: '2026-10-09 13:50:43', version: '3' })

    expect(
      container.querySelectorAll('.price-compare-sheet-meta-label'),
    ).toHaveLength(2)
    expect(
      container.querySelectorAll('.price-compare-sheet-meta-value'),
    ).toHaveLength(2)
  })
})
