import { describe, expect, it } from 'vitest'
import { applyEditorLineItemOrder } from '@/module-system/editor/module-editor-line-item-utils'
import { toSaveRequest } from '@/module-system/record/module-save-payload'

/**
 * 「拖动后的行序 = 保存载荷顺序」契约。
 *
 * <p>后端口径(与 be-tolerance 冻结的排序契约一致)是 **items 数组顺序即最终顺序**:
 * 服务端按下标重编 `line_no = 下标 + 1`, 不按 id 排序。因此前端只需保证重排后整组按新顺序
 * 下发 —— 这条链路(拖动 → 写回行模型 → 序列化载荷)必须有用例锁住, 否则"界面顺序变了、
 * 保存回去还是旧顺序"这种静默回退只能在真机上撞见。</p>
 */
describe('明细行序与保存载荷顺序一致', () => {
  const makeItem = (id: string, materialCode: string) => ({
    id,
    materialCode,
    brand: '中天',
    category: '螺纹钢',
    material: 'HRB400E',
    spec: '12',
    unit: '吨',
    warehouseName: '一号库',
    quantity: 1,
    pieceWeightTon: 1,
    piecesPerBundle: 0,
    unitPrice: 3400,
  })

  const record = (items: ReturnType<typeof makeItem>[]) => ({
    customerName: '客户A',
    projectName: '项目A',
    orderDate: '2026-10-08 00:00:00',
    deliveryDate: '2026-10-09 00:00:00',
    salesName: '销售员',
    items,
  })

  it('把第 3 行拖到首位后, 载荷按新顺序下发(而不是原数组顺序/按 id 排序)', async () => {
    const items = [
      makeItem('1001', 'M-1'),
      makeItem('1002', 'M-2'),
      makeItem('1003', 'M-3'),
    ]
    const reordered = applyEditorLineItemOrder(items, ['1003', '1001', '1002'])
    expect(reordered.map((item) => item.id)).toEqual(['1003', '1001', '1002'])

    const payload = (await toSaveRequest(
      'sales-order',
      record(reordered) as never,
    )) as { items: Array<{ materialCode?: string }> }

    expect(payload.items.map((item) => item.materialCode)).toEqual([
      'M-3',
      'M-1',
      'M-2',
    ])
  })

  it('顺序没变时 applyEditorLineItemOrder 原样返回同一数组(避免整表重渲染)', () => {
    const items = [makeItem('1001', 'M-1'), makeItem('1002', 'M-2')]
    expect(applyEditorLineItemOrder(items, ['1001', '1002'])).toBe(items)
  })

  it('传入未知 id 时忽略它, 未被提到的行按原相对顺序保留(不静默丢行)', () => {
    const items = [makeItem('1001', 'M-1'), makeItem('1002', 'M-2')]
    const reordered = applyEditorLineItemOrder(items, ['9999', '1002'])
    expect(reordered.map((item) => item.id)).toEqual(['1002', '1001'])
  })
})
