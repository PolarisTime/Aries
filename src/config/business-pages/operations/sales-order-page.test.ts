import i18next from 'i18next'
import { beforeAll, describe, expect, it } from 'vitest'
import '@/i18n'
import type { ModulePageConfig } from '@/types/module-page'
import { renderProjectNameCell } from '@/utils/project-display'

let salesOrdersPageConfig: ModulePageConfig

describe('销售订单报单日期配置', () => {
  beforeAll(async () => {
    await i18next.changeLanguage('zh-CN')
    ;({ salesOrdersPageConfig } = await import(
      '@/config/business-pages/operations/sales-order-page'
    ))
  })

  it('表单提供必填的报单日期，且与交货日期、销售员同处「日期与经手」区', () => {
    const formFields = salesOrdersPageConfig.formFields ?? []
    const keys = formFields.map((field) => field.key)

    expect(formFields.find((field) => field.key === 'orderDate')).toMatchObject(
      {
        label: '报单日期',
        type: 'date',
        required: true,
        row: 2,
        section: '日期与经手',
      },
    )
    expect(keys.indexOf('orderDate')).toBeLessThan(keys.indexOf('deliveryDate'))
  })

  /**
   * 表头顺序契约（2026-10 统一）：第 1 行「单号 → 来源单号 → 客户 → 项目」，
   * 第 2 行「报单日期 → 交货日期 → 销售员」，备注整行收尾。
   *
   * <p>锁定这组顺序的原因：行内字段位置是扫读单据的主要线索，改动它会直接影响录入效率；
   * 此前采购订单/入库/出库/退货各行顺序各不相同（来源单号与日期谁在前、客户与项目是否
   * 相邻都不一致），用户在不同单据之间切换时要重新找字段。顺序调整若不同步改这组断言，
   * 会静默退化。</p>
   */
  it('表头行内顺序符合统一口径', () => {
    const formFields = salesOrdersPageConfig.formFields ?? []
    const keysOfRow = (row: number) =>
      formFields.filter((field) => field.row === row).map((field) => field.key)

    expect(keysOfRow(1)).toEqual([
      'orderNo',
      'purchaseOrderNo',
      'customerId',
      'projectId',
    ])
    expect(keysOfRow(2)).toEqual(['orderDate', 'deliveryDate', 'salesName'])
    expect(keysOfRow(3)).toEqual(['remark'])
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

  it('「项目名称」列显示「简称（全称）」，无简称时只显示全称', () => {
    const column = salesOrdersPageConfig.columns.find(
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
