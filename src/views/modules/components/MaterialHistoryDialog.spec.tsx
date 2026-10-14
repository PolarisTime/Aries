// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type {
  MaterialHistoryPageResponse,
  MaterialHistoryRecord,
} from '@/api/master/materials'

/**
 * 捕获真正下发给 antd Table 的 props：`scroll.x` 是否存在决定了会不会出现横向滚动条，
 * 而 jsdom 不做布局计算（scrollWidth 恒等于 clientWidth），只能在 props 层断言。
 */
const tablePropsRef = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}))

vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('antd')>()
  const ActualTable = actual.Table
  function CapturingTable(props: Record<string, unknown>) {
    tablePropsRef.current = props
    return createElement(ActualTable as never, props)
  }
  return { ...actual, Table: CapturingTable }
})

vi.mock('@/api/master/materials', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/master/materials')>()
  return { ...actual, fetchMaterialHistories: vi.fn() }
})

import { fetchMaterialHistories } from '@/api/master/materials'
import { MaterialHistoryDialog } from './MaterialHistoryDialog'

const fetchMaterialHistoriesMock = vi.mocked(fetchMaterialHistories)

const MATERIAL_ID = '333647445122621440'

function historyRecord(
  overrides: Partial<MaterialHistoryRecord> = {},
): MaterialHistoryRecord {
  return {
    id: '368807430016100352',
    materialId: MATERIAL_ID,
    changeSource: 'IMPORT',
    changeType: 'CREATED',
    before: null,
    after: {
      materialCode: '368807430009651200',
      brand: '敬业',
      material: 'HRB400',
      category: '螺纹钢',
      spec: '18',
      length: '12米',
      unit: '吨',
      quantityUnit: '件',
      pieceWeightTon: '0.002',
      piecesPerBundle: '1',
      unitPrice: '3500',
      remark: '示例数据，可删除',
      materialType: '实体商品',
    },
    importBatchNo: '368807430001262592',
    remark: null,
    changedBy: '1',
    changedAt: '2026-10-14T09:09:03.000Z',
    ...overrides,
  }
}

function pageResponse(
  content: MaterialHistoryRecord[],
  totalElements = content.length,
): MaterialHistoryPageResponse {
  return {
    content,
    totalElements,
    totalPages: totalElements === 0 ? 0 : 1,
    currentPage: 1,
    pageSize: 10,
    hasMore: false,
  }
}

describe('MaterialHistoryDialog', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  beforeEach(() => {
    if (!globalThis.ResizeObserver) {
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    }
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
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    tablePropsRef.current = null
    fetchMaterialHistoriesMock.mockReset()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    queryClient.clear()
  })

  async function render(records: MaterialHistoryRecord[]) {
    fetchMaterialHistoriesMock.mockResolvedValue(pageResponse(records))
    await act(async () => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(MaterialHistoryDialog, {
            open: true,
            materialId: MATERIAL_ID,
            materialLabel: '368807430009651200',
            onClose: () => undefined,
          }) as ReactNode,
        ),
      )
      await Promise.resolve()
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  const rows = () =>
    container.querySelectorAll(
      '.ant-table-tbody tr:not(.ant-table-measure-row)',
    )

  const cellText = (rowIndex: number, columnIndex: number) =>
    rows()[rowIndex]?.querySelectorAll('td')[columnIndex]?.textContent ?? ''

  it('以对话框（role=dialog + 遮罩）渲染，不再是右侧抽屉', async () => {
    await render([historyRecord()])

    expect(
      container.querySelector('.ant-drawer'),
      '版本历史必须是弹层对话框，不能再渲染成抽屉',
    ).toBeNull()
    const dialog = container.querySelector('[role="dialog"]')
    expect(dialog, '缺少 role=dialog').not.toBeNull()
    expect(dialog?.getAttribute('aria-modal')).toBe('true')
    expect(
      container.querySelector('.workspace-overlay-mask'),
      '弹层必须有遮罩（点击遮罩关闭）',
    ).not.toBeNull()
    // 关闭动作走 WorkspaceOverlay 的 footer 槽
    const footerButton = container.querySelector(
      '.workspace-overlay-footer button',
    )
    expect(footerButton?.textContent?.replace(/\s+/g, '')).toContain('关闭')
  })

  it('表格只配置纵向滚动：没有 scroll.x，空态/有数据都不会出现横向滚动条', async () => {
    await render([])

    const scroll = tablePropsRef.current?.scroll as
      | { x?: unknown; y?: unknown }
      | undefined
    expect(scroll, '未向 Table 传 scroll').toBeTruthy()
    expect(
      Object.keys(scroll ?? {}).sort(),
      '只允许 scroll.y；scroll.x 会让空表也挂一条横向滚动条',
    ).toEqual(['y'])
    expect(
      tablePropsRef.current?.tableLayout,
      '固定布局 + 只留一个自适应列，列宽总和不会超出容器',
    ).toBe('fixed')
  })

  it('导入批次列显示批次号，回滚动作落在独立操作列', async () => {
    await render([historyRecord()])

    const batchCell = cellText(0, 3)
    expect(batchCell, '导入批次列必须能看到批次号').toContain(
      '368807430001262592',
    )
    expect(batchCell, '危险动作不能充当「导入批次」列的内容').not.toContain(
      '回滚该批次',
    )

    const actionsCell = cellText(0, 6)
    expect(actionsCell, '操作列承载回滚动作').toContain('回滚该批次')

    // 表头顺序与列语义一致
    const headers = [...container.querySelectorAll('.ant-table-thead th')].map(
      (th) => th.textContent?.trim(),
    )
    expect(headers).toEqual([
      '变更时间',
      '来源',
      '类型',
      '导入批次',
      '备注',
      '字段差异',
      '操作',
    ])
  })

  it('字段差异列完整展示全部变更（不被裁掉）', async () => {
    await render([historyRecord()])

    const diffCell = cellText(0, 5)
    for (const expected of [
      '商品编码: 空 → 368807430009651200',
      '品牌: 空 → 敬业',
      '材质: 空 → HRB400',
      '类别: 空 → 螺纹钢',
      '规格: 空 → 18',
      '长度: 空 → 12米',
      '单位: 空 → 吨',
      '数量单位: 空 → 件',
      '件重/吨: 空 → 0.002',
      '每件支数: 空 → 1',
      '单价: 空 → 3500',
      '备注: 空 → 示例数据，可删除',
      '商品类型: 空 → 实体商品',
    ]) {
      expect(diffCell, `字段差异缺少「${expected}」`).toContain(expected)
    }
  })

  it('来源/类型用中文标签，备注为空显示 —，分页计数与页数一致', async () => {
    await render([historyRecord({ remark: null })])

    expect(cellText(0, 1)).toBe('导入')
    expect(cellText(0, 2)).toBe('新建')
    expect(cellText(0, 4)).toBe('—')

    const pagination = container.querySelector('.module-table-pagination')
    expect(pagination?.textContent).toContain('第 1-1 条 / 共 1 条')

    // 分页必须固定在弹层底部：表格区域之后、关闭按钮所在的 footer 之前
    expect(
      container.querySelector('.material-history-dialog')?.lastElementChild
        ?.className,
      '分页必须排在表格之后（固定在弹层底部）',
    ).toContain('module-table-pagination')
  })

  it('空态显示「暂无版本历史」且分页计数为 0', async () => {
    await render([])

    expect(container.textContent).toContain('暂无版本历史')
    expect(
      container.querySelector('.module-table-pagination')?.textContent,
    ).toContain('第 0-0 条 / 共 0 条')
  })
})
