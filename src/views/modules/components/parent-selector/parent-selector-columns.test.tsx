// @vitest-environment jsdom

import type { ColumnsType, ColumnType } from 'antd/es/table'
import { describe, expect, it, vi } from 'vitest'
import type { ModuleRecord } from '@/types/module-page'
import {
  buildParentSelectorDataColumns,
  buildParentSelectorDetailToggleColumn,
  formatCnDate,
  resolveParentSelectorColumns,
} from './parent-selector-columns'

const formatCellValue = vi.fn((value: unknown) => `formatted:${String(value)}`)
const t = vi.fn((key: string) => key)

function toPlainColumns(columns: ColumnsType<ModuleRecord>) {
  return columns as ColumnType<ModuleRecord>[]
}

describe('formatCnDate', () => {
  it('按 X年M月D日 格式展示，月/日不足两位补零', () => {
    expect(formatCnDate('2026-9-1')).toBe('2026年09月01日')
    expect(formatCnDate('2026-12-31')).toBe('2026年12月31日')
  })

  it('空值与非日期字符串走 fallback', () => {
    expect(formatCnDate(null)).toBe('-')
    expect(formatCnDate(undefined)).toBe('-')
    expect(formatCnDate('')).toBe('-')
    expect(formatCnDate('not-a-date')).toBe('not-a-date')
  })
})

describe('resolveParentSelectorColumns', () => {
  it('已配置模块返回预置列', () => {
    const columns = resolveParentSelectorColumns('purchase-order', 'orderNo')
    expect(columns.map((column) => column.dataIndex)).toEqual([
      'orderNo',
      'supplierName',
      'buyerName',
      'orderDate',
      'totalWeight',
      'totalAmount',
      'status',
    ])
  })

  it('未配置模块回退为单号 + 状态两列', () => {
    const columns = resolveParentSelectorColumns('unknown-module', 'docNo')
    expect(columns.map((column) => column.dataIndex)).toEqual([
      'docNo',
      'status',
    ])
  })
})

describe('buildParentSelectorDataColumns', () => {
  it('hiddenSelectorColumnKeys 过滤隐藏列', () => {
    const columns = toPlainColumns(
      buildParentSelectorDataColumns({
        parentModuleKey: 'purchase-order',
        displayFieldKey: 'orderNo',
        hiddenSelectorColumnKeys: ['supplierName', 'buyerName'],
        formatCellValue,
      }),
    )
    expect(columns.map((column) => column.dataIndex)).not.toContain(
      'supplierName',
    )
    expect(columns.map((column) => column.dataIndex)).not.toContain('buyerName')
  })

  it('金额/重量列右对齐，其余列居中，均带 ellipsis', () => {
    const columns = toPlainColumns(
      buildParentSelectorDataColumns({
        parentModuleKey: 'purchase-order',
        displayFieldKey: 'orderNo',
        formatCellValue,
      }),
    )
    const byKey = new Map(columns.map((column) => [column.dataIndex, column]))
    expect(byKey.get('totalAmount')?.align).toBe('right')
    expect(byKey.get('totalWeight')?.align).toBe('right')
    expect(byKey.get('orderNo')?.align).toBe('center')
    expect(byKey.get('orderNo')?.ellipsis).toBe(true)
  })

  it('日期列渲染为中文日期', () => {
    const columns = toPlainColumns(
      buildParentSelectorDataColumns({
        parentModuleKey: 'purchase-order',
        displayFieldKey: 'orderNo',
        formatCellValue,
      }),
    )
    const dateColumn = columns.find(
      (column) => column.dataIndex === 'orderDate',
    )
    const rendered = dateColumn?.render?.('2026-9-1', {} as ModuleRecord, 0)
    expect(rendered).toBe('2026年09月01日')
  })

  it('普通列委托 formatCellValue 渲染', () => {
    const columns = toPlainColumns(
      buildParentSelectorDataColumns({
        parentModuleKey: 'purchase-order',
        displayFieldKey: 'orderNo',
        formatCellValue,
      }),
    )
    const column = columns.find((item) => item.dataIndex === 'supplierName')
    expect(column?.render?.('供应商A', {} as ModuleRecord, 0)).toBe(
      'formatted:供应商A',
    )
  })
})

describe('buildParentSelectorDetailToggleColumn', () => {
  it('未展开行渲染展开按钮并触发展开回调', () => {
    const toggleDetail = vi.fn()
    const column = buildParentSelectorDetailToggleColumn({
      detailExpandedRowKeys: [],
      toggleDetail,
      t,
    })
    const element = column.render?.(null, { id: '9001' }, 0) as {
      props: { children: { props: Record<string, unknown> } }
    }
    const buttonProps = element.props.children.props
    expect(buttonProps['aria-expanded']).toBe(false)
    expect(buttonProps['aria-label']).toBe(
      'modules.parentSelector.expandDetail',
    )
    const event = { stopPropagation: vi.fn() }
    ;(buttonProps.onClick as (event: unknown) => void)(event)
    expect(event.stopPropagation).toHaveBeenCalled()
    expect(toggleDetail).toHaveBeenCalledWith({ id: '9001' })
  })

  it('已展开行渲染收起按钮', () => {
    const column = buildParentSelectorDetailToggleColumn({
      detailExpandedRowKeys: ['9001'],
      toggleDetail: vi.fn(),
      t,
    })
    const element = column.render?.(null, { id: '9001' }, 0) as {
      props: { children: { props: Record<string, unknown> } }
    }
    expect(element.props.children.props['aria-expanded']).toBe(true)
    expect(element.props.children.props['aria-label']).toBe(
      'modules.parentSelector.collapseDetail',
    )
  })
})
