// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProPage } from '@/components/AppProPage'

const pageContainerPropsSpy = vi.hoisted(() => vi.fn())

vi.mock(
  '@ant-design/pro-components/es/layout/components/PageContainer',
  () => ({
    PageContainer: (props: Record<string, unknown>) => {
      pageContainerPropsSpy(props)
      return createElement('div', null, props.children as React.ReactNode)
    },
  }),
)

describe('AppProPage', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    pageContainerPropsSpy.mockReset()
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

  it('使用紧凑的页面纵向内容间距', () => {
    act(() => {
      root.render(
        <AppProPage title="测试页面">
          <div>业务内容</div>
        </AppProPage>,
      )
    })

    expect(pageContainerPropsSpy.mock.lastCall?.[0]).toMatchObject({
      token: {
        paddingBlockPageContainerContent: 8,
        paddingInlinePageContainerContent: 16,
      },
    })
  })
})
