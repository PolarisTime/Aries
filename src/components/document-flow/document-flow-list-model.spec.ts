import { describe, expect, it } from 'vitest'
import type {
  DocumentFlowLink,
  DocumentFlowNode,
} from '@/shared/schemas/document-flow'
import { buildDocumentFlowListModel } from './document-flow-list-model'

const node = (
  type: string,
  id: string,
  no = `${type}-${id}`,
): DocumentFlowNode => ({ type, id, no })

const link = (
  from: DocumentFlowNode,
  to: DocumentFlowNode,
  extra: Partial<DocumentFlowLink> = {},
): DocumentFlowLink => ({
  fromType: from.type,
  fromId: from.id,
  toType: to.type,
  toId: to.id,
  linkType: '入库',
  ...extra,
})

describe('buildDocumentFlowListModel', () => {
  const order = node('purchase-order', '1', 'PO-1')
  const inbound = node('purchase-inbound', '2', 'IN-1')
  const salesOrder = node('sales-order', '3', 'SO-1')

  it('按类型分组，组顺序跟随业务链路（采购 → 入库 → 销售）', () => {
    const model = buildDocumentFlowListModel([salesOrder, inbound, order], [])

    expect(model.groups.map((group) => group.type)).toEqual([
      'purchase-order',
      'purchase-inbound',
      'sales-order',
    ])
    expect(model.groups.map((group) => group.entries.length)).toEqual([1, 1, 1])
  })

  it('未知类型排在已知类型之后，并保持出现顺序', () => {
    const unknownA = node('custom-a', '9', 'A-9')
    const unknownB = node('custom-b', '8', 'B-8')
    const model = buildDocumentFlowListModel([unknownA, order, unknownB], [])

    expect(model.groups.map((group) => group.type)).toEqual([
      'purchase-order',
      'custom-a',
      'custom-b',
    ])
  })

  it('关系行带上下游单号、类型与数量', () => {
    const model = buildDocumentFlowListModel(
      [order, inbound],
      [link(order, inbound, { quantity: '10', weight: '12.5' })],
    )

    expect(model.relations).toHaveLength(1)
    expect(model.relations[0]).toMatchObject({
      fromNo: 'PO-1',
      toNo: 'IN-1',
      linkType: '入库',
      quantity: '10',
      weight: '12.5',
    })
  })

  it('数量/重量缺失时的属性为 null（界面据此不渲染）', () => {
    const model = buildDocumentFlowListModel(
      [order, inbound],
      [link(order, inbound)],
    )

    expect(model.relations[0].quantity).toBeNull()
    expect(model.relations[0].weight).toBeNull()
  })

  it('空串/非法数字同样按缺失处理', () => {
    const model = buildDocumentFlowListModel(
      [order, inbound],
      [
        link(order, inbound, { quantity: '  ' }),
        { ...link(order, inbound), weight: 'abc' },
      ],
    )

    expect(model.relations.map((relation) => relation.quantity)).toEqual([
      null,
      null,
    ])
    expect(model.relations[1].weight).toBeNull()
  })

  it('端点不在节点集合里的关系被丢弃（不出现空单号行）', () => {
    const model = buildDocumentFlowListModel(
      [order],
      [link(order, inbound), link(order, order)],
    )

    // 端点缺失 → 丢弃；自环端点存在 → 保留（由后端数据决定，列表如实展示）
    expect(model.relations).toHaveLength(1)
    expect(model.relations[0].fromNo).toBe('PO-1')
    expect(model.relations[0].toNo).toBe('PO-1')
  })

  it('重复节点按 key 去重，单号缺失时回落为 id', () => {
    const noNoNode: DocumentFlowNode = { type: 'sales-order', id: '77' }
    const model = buildDocumentFlowListModel([order, order, noNoNode], [])

    const salesGroup = model.groups.find(
      (group) => group.type === 'sales-order',
    )
    expect(model.groups[0].entries).toHaveLength(1)
    expect(salesGroup?.entries[0].node.id).toBe('77')
  })

  it('空输入返回空模型', () => {
    expect(buildDocumentFlowListModel([], [])).toEqual({
      groups: [],
      relations: [],
    })
  })
})
