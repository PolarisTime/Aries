// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTableBodyScrollY } from './use-table-body-scroll-y'

function Harness() {
  const { shellRef, scrollY, shellStyle } = useTableBodyScrollY()
  return (
    <div
      ref={shellRef}
      className="module-table-shell"
      data-scroll-y={scrollY}
      style={shellStyle}
    >
      <div className="ant-table-thead" />
    </div>
  )
}

describe('useTableBodyScrollY', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
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
    vi.restoreAllMocks()
  })

  it('shell 有可用高度时按容器高度计算表体滚动高度', () => {
    vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(500)
    act(() => {
      root.render(<Harness />)
    })

    const shell = container.querySelector('.module-table-shell')
    expect(shell?.getAttribute('data-scroll-y')).toBe('500')
    expect(
      shell
        ?.getAttribute('style')
        ?.includes('--module-table-body-height: 500px'),
    ).toBe(true)
  })

  it('容器零高度时保留最小滚动高度', () => {
    act(() => {
      root.render(<Harness />)
    })

    const shell = container.querySelector('.module-table-shell')
    expect(shell?.getAttribute('data-scroll-y')).toBe('120')
    expect(
      shell
        ?.getAttribute('style')
        ?.includes('--module-table-body-height: 120px'),
    ).toBe(true)
  })
})
