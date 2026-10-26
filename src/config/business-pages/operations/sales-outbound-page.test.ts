import i18next from 'i18next'
import { beforeAll, describe, expect, it } from 'vitest'
import '@/i18n'
import { renderProjectNameCell } from '@/utils/project-display'
import { salesOutboundsPageConfig } from './sales-outbound-page'

describe('销售出库单页面配置', () => {
  beforeAll(async () => {
    await i18next.changeLanguage('zh-CN')
  })

  it('页面 key 与主编号字段符合模块注册约定', () => {
    expect(salesOutboundsPageConfig.key).toBe('sales-outbound')
    expect(salesOutboundsPageConfig.primaryNoKey).toBe('outboundNo')
  })

  it('「项目名称」列显示「简称（全称）」，无简称时只显示全称', () => {
    const column = salesOutboundsPageConfig.columns.find(
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
