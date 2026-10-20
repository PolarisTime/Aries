// @vitest-environment jsdom

import { act, createElement, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DetailSkeleton } from '@/components/loading'

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

  it('DetailSkeleton 渲染标题与区块占位', () => {
    render(createElement(DetailSkeleton, { sections: 3, linesPerSection: 2 }))

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(
      container.querySelectorAll('.aries-skeleton-detail-section'),
    ).toHaveLength(3)
    expect(container.querySelectorAll('.aries-skeleton-line')).toHaveLength(6)
  })
})
