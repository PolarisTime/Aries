// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import {
  PriceCompareBatchBar,
  PriceCompareProjectPicker,
} from './price-compare-pickers'
import { resolveProjectSelection } from './price-compare-support'
import type { PriceData, PriceSheet, ProjectOption } from './types'

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
    sheets: [sheetOf('s1', 'p1', '批次 1'), sheetOf('s2', 'p1', '批次 2')],
  },
  {
    projectId: 'p2',
    projectName: '苏州欧帝',
    sheets: [sheetOf('s3', 'p2', '批次 1')],
  },
]

const emptyData = {} as PriceData

/**
 * 项目/批次两行的交互契约。
 *
 * <p>重构要点：项目行只剩一个选择器（原来「一排项目胶囊 + 新增项目批次下拉」两个控件做
 * 同一件事），批次行改成可关闭页签（原来两个常驻按钮里挂着「删除批次」危险色按钮）。
 * 这里钉住三件事：判定收在唯一出口、选择器/页签的可访问名、关闭入口的可用边界。</p>
 */
describe('报单比价 项目/批次选择控件契约', () => {
  let container: HTMLDivElement
  let root: Root

  const render = (element: ReactElement) => act(() => root.render(element))

  const renderProjectPicker = (currentProjectId?: string) =>
    render(
      createElement(PriceCompareProjectPicker, {
        projects,
        projectGroups,
        currentGroup: projectGroups.find(
          (group) => group.projectId === currentProjectId,
        ),
        onSelectSheet: () => {},
        onAddProject: () => {},
      }),
    )

  const renderBatchBar = (sheets: PriceSheet[], activeId: string) =>
    render(
      createElement(PriceCompareBatchBar, {
        activeId,
        brands: [],
        currentGroup: { projectId: 'p1', projectName: '稻米加工', sheets },
        data: emptyData,
        sheets,
        onSelectSheet: () => {},
        onAddBatch: () => {},
        onDeleteBatch: () => {},
      }),
    )

  beforeEach(async () => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    // jsdom 没有 ResizeObserver, antd Tabs 的可关闭页签会用到它
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
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
    await i18n.changeLanguage('zh-CN')
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  describe('选中项目后的去向（唯一判定出口）', () => {
    it('已有批次的项目: 切到它的第一个批次', () => {
      expect(resolveProjectSelection('p1', projectGroups, projects)).toEqual({
        type: 'select',
        sheetId: 's1',
      })
    })

    it('还没有批次的项目: 就地建一个批次', () => {
      const withUnstarted = [
        ...projects,
        { id: 'p-未建', name: '瑞宸汽车', abbr: '瑞宸汽车' },
      ]
      expect(
        resolveProjectSelection('p-未建', projectGroups, withUnstarted),
      ).toEqual({
        type: 'create',
        project: { id: 'p-未建', name: '瑞宸汽车', abbr: '瑞宸汽车' },
      })
    })

    it('既没有批次也不在项目清单里: 不做任何动作', () => {
      expect(
        resolveProjectSelection('p-脏数据', projectGroups, projects),
      ).toBeNull()
    })
  })

  it('项目行是一个带可访问名的选择器, 选中框只显示项目名', () => {
    renderProjectPicker('p1')

    const combobox = container.querySelector('[role="combobox"]')
    expect(combobox, '项目行必须是可选中的选择器').not.toBeNull()
    expect(combobox?.getAttribute('aria-label')).toBe('项目切换')
    /* 「N 个批次」只在下拉选项里出现(labelRender 覆盖了选中框的默认渲染), 选中框只放项目名。
       antd 6 的选中项渲染在 .ant-select-content(v5 的 .ant-select-selection-item 已改名)。 */
    expect(container.querySelector('.ant-select-content')?.textContent).toBe(
      '稻米加工',
    )
  })

  it('批次行是一排下划线页签, 一个批次一个页签且可访问名可区分', () => {
    renderBatchBar(projectGroups[0].sheets, 's1')

    expect(container.querySelectorAll('.ant-tabs-tab')).toHaveLength(2)
    expect(
      container.querySelector('[role="tablist"]')?.getAttribute('aria-label'),
    ).toBe('批次页签')
    // line 型页签: 活动项靠「下划线 + 字重」两个信号辨认, 不渲染关闭按钮
    expect(container.querySelectorAll('.ant-tabs-tab-remove')).toHaveLength(0)
    // 新建与删除是两个独立入口: 新建直接可见, 删除收进「更多」
    expect(
      container.querySelector('.price-compare-batch-add')?.textContent,
    ).toContain('新建批次')
    expect(
      container.querySelector('[aria-label="更多批次操作"]'),
      '「更多」入口必须存在',
    ).not.toBeNull()
  })

  it('只剩一个批次时, 「更多」里的删除项被禁用(至少保留一个批次)', async () => {
    renderBatchBar([projectGroups[0].sheets[0]], 's1')

    const trigger = container.querySelector(
      '[aria-label="更多批次操作"]',
    ) as HTMLElement
    expect(trigger).not.toBeNull()
    await act(async () => {
      trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const item = document.querySelector('.ant-dropdown-menu-item')
    expect(item, '「更多」菜单应已展开').not.toBeNull()
    expect(item?.getAttribute('aria-disabled')).toBe('true')
  })
})
