// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { PriceCompareProjectPicker } from './price-compare-pickers'
import type { PriceSheet, ProjectOption } from './types'

const projects: ProjectOption[] = [
  { id: 'p1', name: '稻米加工', abbr: '稻米加工' },
  { id: 'p2', name: '苏州欧帝', abbr: '苏州欧帝' },
]

function sheetOf(id: string, projectId: string, name: string): PriceSheet {
  return {
    id,
    name,
    status: '报价',
    projectId,
    projectName: name,
    orderDate: '2026-10-15',
    refDate: '2026-10-14',
    refPeriod: '上午',
    lengthPremium: 30,
    inputs: {},
    rows: [],
  }
}

const projectGroups = [
  {
    projectId: 'p1',
    projectName: '稻米加工',
    sheets: [sheetOf('s1', 'p1', '批次 1')],
  },
  {
    projectId: 'p2',
    projectName: '苏州欧帝',
    sheets: [sheetOf('s2', 'p2', '批次 1')],
  },
]

/**
 * 项目/批次两行的选择控件契约。
 *
 * <p>两行都是「互斥单选」, 必须是同一个组件(Segmented)且各自有可区分的可访问名:
 * 原先项目行用的是可勾选胶囊(Tag.CheckableTag), 既没有选中/键盘语义, 视觉上也几乎没有
 * 边界, 用户反馈「项目批次两行不明显」。另外批次分段控件锚点类名是 e2e
 * (parity-price-compare-edit-lock / parity-price-compare-concurrency /
 * price-compare-spec-quantity-lock-link) 用来区分两个分段控件的唯一依据, 不能改名。</p>
 */
describe('报单比价 项目/批次选择控件契约', () => {
  let container: HTMLDivElement
  let root: Root

  const renderPicker = (props: {
    currentProjectId?: string
    onSelectSheet?: (sheetId: string) => void
  }) =>
    act(() =>
      root.render(
        createElement(PriceCompareProjectPicker, {
          projects,
          projectGroups,
          currentGroup: projectGroups.find(
            (group) => group.projectId === props.currentProjectId,
          ),
          onSelectSheet: props.onSelectSheet ?? (() => {}),
          onAddProject: () => {},
        }),
      ),
    )

  beforeEach(async () => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    await i18n.changeLanguage('zh-CN')
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('项目行用 Segmented 承载, 可访问名与批次行可区分', async () => {
    await renderPicker({ currentProjectId: 'p1' })

    const group = container.querySelector('[role="radiogroup"]')
    expect(group, '项目行必须是 radiogroup(Segmented)').not.toBeNull()
    expect(group?.getAttribute('aria-label')).toBe('项目切换')
    expect(group?.textContent).toContain('稻米加工')
    expect(group?.textContent).toContain('苏州欧帝')
  })

  it('切换项目时按该项目首个批次回调', async () => {
    const onSelectSheet = vi.fn()
    await renderPicker({ currentProjectId: 'p1', onSelectSheet })

    const target = [...container.querySelectorAll('.ant-segmented-item')].find(
      (item) => item.textContent?.includes('苏州欧帝'),
    )
    expect(target, '未找到「苏州欧帝」分段项').toBeTruthy()
    await act(() => {
      ;(target as HTMLElement).click()
    })

    expect(onSelectSheet).toHaveBeenCalledWith('s2')
  })
})
