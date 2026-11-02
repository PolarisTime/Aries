import { Tag } from 'antd'
import i18next from 'i18next'
import React from 'react'
import { beforeAll, describe, expect, it } from 'vitest'
import '@/i18n'
import { buildQueryParams } from '@/api/business/business-listing-filtering'
import { financeModuleEndpointContracts } from '@/api/contracts/module-contracts-finance'
import { moveDocumentNoFieldsToSectionEnd } from '@/module-system/presentation/module-field-layout'
import { renderProjectNameCell } from '@/utils/project-display'
import { customerStatementPageConfig } from './customer-statement-page'
import {
  renderStatementAmount,
  renderStatementDirection,
  renderStatementWeight,
} from './customer-statement-rules'

beforeAll(async () => {
  await i18next.changeLanguage('zh-CN')
})

describe('客户对账单红字展示配置', () => {
  /**
   * 抬头口径（与销售订单/出库统一）：第 1 行业务对象，第 2 行日期与金额，
   * 第 3 行方向/状态后再接单号（运行时把主单号与来源单号排到段末），备注整行。
   */
  it('抬头行序：客户/项目在前，单号与来源订单在后', () => {
    const formFields = customerStatementPageConfig.formFields ?? []
    const ordered = moveDocumentNoFieldsToSectionEnd(
      formFields,
      [
        customerStatementPageConfig.primaryNoKey,
        customerStatementPageConfig.parentImport?.parentFieldKey,
      ].filter((key): key is string => Boolean(key)),
    )
    const keysOfRow = (row: number) =>
      ordered.filter((field) => field.row === row).map((field) => field.key)

    expect(keysOfRow(1)).toEqual([
      'customerId',
      'projectId',
      'settlementCompanyId',
      'customerCode',
    ])
    expect(keysOfRow(2)).toEqual([
      'startDate',
      'endDate',
      'salesAmount',
      'closingAmount',
    ])
    expect(keysOfRow(3)).toEqual([
      'direction',
      'status',
      'statementNo',
      'sourceOrderNos',
    ])
    expect(keysOfRow(4)).toEqual(['remark'])
  })

  it('筛选包含方向分段选项（蓝字/红字）', () => {
    const directionFilter = customerStatementPageConfig.filters.find(
      (filter) => filter.key === 'billDirection',
    )
    expect(directionFilter?.type).toBe('segmented')
    const options = directionFilter?.options
    expect(Array.isArray(options)).toBe(true)
    if (!Array.isArray(options)) {
      return
    }
    const values = options.flatMap((option) =>
      'value' in option ? [option.value] : [],
    )
    expect(values).toEqual(['蓝字', '红字'])
    expect(
      options.every(
        (option) =>
          'label' in option &&
          typeof option.label === 'string' &&
          option.label.length > 0,
      ),
    ).toBe(true)
  })

  it('列表新增方向列，金额列启用负数红色渲染', () => {
    const directionColumn = customerStatementPageConfig.columns.find(
      (column) => column.dataIndex === 'direction',
    )
    expect(directionColumn?.render).toBe(renderStatementDirection)

    for (const key of ['salesAmount', 'closingAmount']) {
      const column = customerStatementPageConfig.columns.find(
        (item) => item.dataIndex === key,
      )
      expect(column?.render).toBe(renderStatementAmount)
    }
  })

  it('明细金额与重量列启用负数红色渲染', () => {
    const itemColumns = customerStatementPageConfig.itemColumns ?? []
    expect(
      itemColumns.find((column) => column.dataIndex === 'amount')?.render,
    ).toBe(renderStatementAmount)
    expect(
      itemColumns.find((column) => column.dataIndex === 'weightTon')?.render,
    ).toBe(renderStatementWeight)
  })

  it('详情与保存字段包含方向', () => {
    expect(
      customerStatementPageConfig.detailFields.map((field) => field.key),
    ).toContain('direction')
    expect(customerStatementPageConfig.saveFields?.scalar).toContain(
      'direction',
    )
  })

  it('接口契约声明 billDirection 过滤，排序方向沿用 direction', () => {
    const contract = financeModuleEndpointContracts['customer-statement']
    expect(contract.nativeFilterKeys).toContain('billDirection')
    expect(contract.nativeFilterKeys).not.toContain('direction')
    expect('sortDirectionParam' in contract).toBe(false)
  })

  it('筛选值 billDirection 与排序方向 direction 同时传递', () => {
    const params = buildQueryParams(
      'customer-statement',
      { billDirection: '蓝字' },
      {
        currentPage: 1,
        pageSize: 20,
        sortBy: 'endDate',
        sortDirection: 'desc',
      },
    )
    expect(params).toMatchObject({ billDirection: '蓝字', direction: 'desc' })
  })

  it('「项目名称」列显示「简称（全称）」，无简称时只显示全称', () => {
    const column = customerStatementPageConfig.columns.find(
      (item) => item.dataIndex === 'projectName',
    )

    expect(column?.render).toBe(renderProjectNameCell)
    expect(column?.width).toBe(240)
    expect(
      column?.render?.(undefined, {
        id: '1',
        projectNameAbbr: '东钢',
        projectName: '广东东钢供应链有限公司',
      }),
    ).toBe('东钢（广东东钢供应链有限公司）')
    expect(
      column?.render?.(undefined, {
        id: '1',
        projectName: '广东东钢供应链有限公司',
      }),
    ).toBe('广东东钢供应链有限公司')
  })
})

describe('客户对账单方向渲染', () => {
  it('红字使用红色标签', () => {
    const element = renderStatementDirection('红字') as React.ReactElement<{
      color: string
      children: React.ReactNode
    }>
    expect(element.type).toBe(Tag)
    expect(element.props.color).toBe('red')
    expect(element.props.children).toBe('红字')
  })

  it('蓝字与缺失方向回退为蓝色标签', () => {
    for (const value of ['蓝字', undefined, null]) {
      const element = renderStatementDirection(value) as React.ReactElement<{
        color: string
      }>
      expect(element.type).toBe(Tag)
      expect(element.props.color).toBe('blue')
    }
  })

  it('负数金额红色展示，正数保持纯文本', () => {
    const negative = renderStatementAmount(-1234.5)
    expect(React.isValidElement(negative)).toBe(true)
    expect(
      (negative as React.ReactElement<{ style: { color: string } }>).props.style
        .color,
    ).toBe('var(--theme-error)')

    expect(renderStatementAmount(1234.5)).toBe('1234.50')
    expect(renderStatementAmount('')).toBe('-')
  })

  it('负数重量保留三位小数并红色展示', () => {
    const negative = renderStatementWeight(-1.25) as React.ReactElement<{
      children: React.ReactNode
    }>
    expect(negative.props.children).toBe('-1.250')
    expect(renderStatementWeight(1.25)).toBe('1.250')
  })
})
