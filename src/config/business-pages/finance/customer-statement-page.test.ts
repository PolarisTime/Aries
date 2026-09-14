import { Tag } from 'antd'
import i18next from 'i18next'
import React from 'react'
import { beforeAll, describe, expect, it } from 'vitest'
import '@/i18n'
import { buildQueryParams } from '@/api/business/business-listing-filtering'
import { financeModuleEndpointContracts } from '@/api/contracts/module-contracts-finance'
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
    ).toBe('#cf1322')

    expect(renderStatementAmount(1234.5)).toBe('1,234.50')
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
