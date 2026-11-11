import { describe, expect, it } from 'vitest'
import {
  resolveFilterRow,
  sortFilterFieldsByRow,
} from '@/views/modules/components/module-filter-rows'

/*
 * 筛选区的行分组规则：往来方（客户/供应商/物流商）与项目默认落第二行，
 * 单据自身属性留在第一行。这条规则影响所有列表页的筛选区顺序，
 * 单独锁定，避免以后调某个页面的配置时静默改掉全站行为。
 */
describe('module-filter-rows', () => {
  it('往来方与项目默认排第二行', () => {
    for (const key of [
      'customerId',
      'customerName',
      'supplierId',
      'supplierName',
      'carrierId',
      'carrierName',
      'projectId',
      'projectName',
    ]) {
      expect(resolveFilterRow({ key })).toBe(2)
    }
  })

  it('单据自身属性默认排第一行', () => {
    for (const key of [
      'keyword',
      'status',
      'settlementCompanyId',
      'deliveryDate',
    ]) {
      expect(resolveFilterRow({ key })).toBe(1)
    }
  })

  it('显式 row 覆盖默认规则', () => {
    expect(resolveFilterRow({ key: 'customerId', row: 1 })).toBe(1)
    expect(resolveFilterRow({ key: 'keyword', row: 2 })).toBe(2)
    // 0 是合法值，不能被 `|| 1` 兜底吃掉
    expect(resolveFilterRow({ key: 'keyword', row: 0 })).toBe(0)
  })

  it('按行升序排序，同一行内保持声明顺序', () => {
    const fields = [
      { key: 'customerId' },
      { key: 'keyword' },
      { key: 'projectId' },
      { key: 'status' },
      { key: 'deliveryDate' },
    ]
    expect(sortFilterFieldsByRow(fields).map((field) => field.key)).toEqual([
      'keyword',
      'status',
      'deliveryDate',
      'customerId',
      'projectId',
    ])
  })

  it('不修改入参，且保留元素上的其它字段', () => {
    const fields = [
      { key: 'projectId', label: '项目名称', type: 'select' as const },
      { key: 'keyword', label: '单据编号', type: 'input' as const },
    ]
    const sorted = sortFilterFieldsByRow(fields)
    expect(sorted.map((field) => field.key)).toEqual(['keyword', 'projectId'])
    // 排序结果是新数组，原数组顺序不变
    expect(fields.map((field) => field.key)).toEqual(['projectId', 'keyword'])
    // 元素本身带的其它属性没有丢
    expect(sorted[1].label).toBe('项目名称')
    expect(sorted[1].type).toBe('select')
  })
})
