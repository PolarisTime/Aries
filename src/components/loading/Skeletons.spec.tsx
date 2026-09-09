// @vitest-environment jsdom

import { act, createElement, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  DetailSkeleton,
  FormSkeleton,
  TableSkeleton,
} from '@/components/loading'

describe('加载骨架屏渲染冒烟测试', () => {
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

  const render = (element: ReactElement) => {
    act(() => {
      root.render(element)
    })
  }

  it('TableSkeleton 渲染工具栏、表头、行与分页占位', () => {
    render(createElement(TableSkeleton, { rows: 3 }))

    const skeleton = container.querySelector('[role="status"]')
    expect(skeleton?.getAttribute('aria-busy')).toBe('true')
    expect(container.querySelectorAll('.aries-skeleton-toolbar')).toHaveLength(
      1,
    )
    expect(
      container.querySelectorAll('.aries-skeleton-pagination'),
    ).toHaveLength(1)
    // 1 行表头 + 3 行主体
    expect(container.querySelectorAll('.aries-skeleton-cell')).toHaveLength(20)
  })

  it('TableSkeleton 可关闭工具栏与分页', () => {
    render(
      createElement(TableSkeleton, {
        rows: 2,
        toolbar: false,
        pagination: false,
      }),
    )

    expect(container.querySelectorAll('.aries-skeleton-toolbar')).toHaveLength(
      0,
    )
    expect(
      container.querySelectorAll('.aries-skeleton-pagination'),
    ).toHaveLength(0)
  })

  it('FormSkeleton 渲染字段组与操作区占位', () => {
    render(createElement(FormSkeleton, { fields: 4 }))

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(container.querySelectorAll('.aries-skeleton-field')).toHaveLength(4)
    expect(
      container.querySelectorAll('.aries-skeleton-field-input'),
    ).toHaveLength(4)
  })

  it('DetailSkeleton 渲染标题与区块占位', () => {
    render(createElement(DetailSkeleton, { sections: 3, linesPerSection: 2 }))

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(
      container.querySelectorAll('.aries-skeleton-detail-section'),
    ).toHaveLength(3)
    expect(container.querySelectorAll('.aries-skeleton-line')).toHaveLength(6)
  })
})
