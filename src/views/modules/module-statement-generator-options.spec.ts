import { describe, expect, it } from 'vitest'
import {
  buildStatementCounterpartyOptions,
  filterStatementCounterpartyOptions,
} from './module-statement-generator-options'

describe('module-statement-generator-options', () => {
  it('dedupes customer options by customer name instead of project row', () => {
    const options = buildStatementCounterpartyOptions('customer', [
      {
        id: '308251467645452288',
        customerName: '测试客户',
        projectName: '项目A',
        label: '测试客户 / 项目A',
        value: '测试客户',
      },
      {
        id: '308251467645452289',
        customerName: '测试客户',
        projectName: '项目B',
        label: '测试客户 / 项目B',
        value: '测试客户',
      },
    ])

    expect(options).toEqual([{ label: '测试客户', value: '测试客户' }])
  })

  it('keeps supplier options as explicit name values', () => {
    const options = buildStatementCounterpartyOptions('supplier', [
      { label: '益海供应商', value: '益海供应商' },
      { label: '益海供应商', value: '益海供应商' },
    ])

    expect(options).toEqual([{ label: '益海供应商', value: '益海供应商' }])
  })

  it('filters options by label or value keyword', () => {
    const filtered = filterStatementCounterpartyOptions(
      [
        { label: '陈永祥', value: '陈永祥' },
        { label: '杭州物流', value: '杭州物流' },
      ],
      '杭州',
    )

    expect(filtered).toEqual([{ label: '杭州物流', value: '杭州物流' }])
  })
})
