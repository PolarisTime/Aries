import i18next from 'i18next'
import { beforeAll, describe, expect, it } from 'vitest'
import '@/i18n'
import type { ModulePageConfig } from '@/types/module-page'

let salesOrdersPageConfig: ModulePageConfig

describe('销售订单报单日期配置', () => {
  beforeAll(async () => {
    await i18next.changeLanguage('zh-CN')
    ;({ salesOrdersPageConfig } = await import(
      '@/config/business-pages/operations/sales-order-page'
    ))
  })

  it('表单提供必填的报单日期，且排在交货日期之前', () => {
    const formFields = salesOrdersPageConfig.formFields ?? []
    const keys = formFields.map((field) => field.key)

    expect(formFields.find((field) => field.key === 'orderDate')).toMatchObject(
      {
        label: '报单日期',
        type: 'date',
        required: true,
        row: 1,
      },
    )
    expect(keys.indexOf('orderDate')).toBeLessThan(keys.indexOf('deliveryDate'))
  })

  it('列表在交货日期之前展示报单日期列', () => {
    const keys = salesOrdersPageConfig.columns.map((column) => column.dataIndex)

    expect(
      salesOrdersPageConfig.columns.find(
        (column) => column.dataIndex === 'orderDate',
      ),
    ).toMatchObject({ title: '报单日期', width: 120, type: 'date' })
    expect(keys.indexOf('orderDate')).toBeLessThan(keys.indexOf('deliveryDate'))
  })

  it('详情在交货日期之前展示报单日期', () => {
    const keys = salesOrdersPageConfig.detailFields.map((field) => field.key)

    expect(
      salesOrdersPageConfig.detailFields.find(
        (field) => field.key === 'orderDate',
      ),
    ).toMatchObject({ label: '报单日期', type: 'date' })
    expect(keys.indexOf('orderDate')).toBeLessThan(keys.indexOf('deliveryDate'))
  })

  it('筛选栏不新增报单日期条件（保持范围最小）', () => {
    expect(
      salesOrdersPageConfig.filters.some(
        (filter) => filter.key === 'orderDate',
      ),
    ).toBe(false)
  })

  /**
   * 项目下拉的空态必须说明前置条件。
   *
   * <p>项目按客户过滤(未选客户时列表必然为空)。antd 默认只说"暂无数据", 用户分不清是确实
   * 没有项目还是要先选客户 —— 实测新建销售订单时项目下拉就是 0 项, 只报"暂无数据"。
   * 空态写成"请先选择客户"才指向可执行的下一步。</p>
   */
  it('项目字段的下拉空态说明"先选客户"这一前置条件', () => {
    const projectField = (salesOrdersPageConfig.formFields ?? []).find(
      (field) => field.key === 'projectId',
    )
    expect(projectField, '项目字段必须存在').toBeTruthy()
    expect(projectField?.emptyHint).toBeTruthy()
    expect(projectField?.emptyHint).toContain('客户')
  })
})
