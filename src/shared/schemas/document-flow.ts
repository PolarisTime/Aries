import { z } from 'zod'
import { responseEntityIdSchema } from './api'

/**
 * 通用单据流视图（采购/销售/物流核心业务链）。
 *
 * 后端契约为扁平节点 + 连线：nodes 描述单据，links 描述节点间的业务引用关系。
 * 采用宽松对象解析：仅在字段存在时展示，额外字段不影响页面渲染。
 */
const documentFlowNodeSchema = z.looseObject({
  type: z.string().min(1),
  id: responseEntityIdSchema,
  no: z.string().optional(),
  status: z.string().nullish(),
  amount: z.union([z.number(), z.string()]).nullish(),
  weight: z.union([z.number(), z.string()]).nullish(),
  date: z.string().nullish(),
})

const documentFlowLinkSchema = z.looseObject({
  fromType: z.string().optional(),
  fromId: responseEntityIdSchema.optional(),
  toType: z.string().optional(),
  toId: responseEntityIdSchema.optional(),
  linkType: z.string().optional(),
  /**
   * 该下游单据实际引用上游明细的数量（件）与重量（吨）。
   *
   * <p>后端只对「采购订单→采购入库、采购入库→销售订单、销售订单→销售出库、
   * 销售订单→物流单」四条明细级链路填充，其余链路（对账单、退货等）为 null；
   * 前端必须按"缺失/为 null 就完全不渲染"处理，不能补 0。</p>
   */
  quantity: z.union([z.number(), z.string()]).nullish(),
  weight: z.union([z.number(), z.string()]).nullish(),
})

export const documentFlowSchema = z.looseObject({
  documentNo: z.string(),
  nodes: z.array(documentFlowNodeSchema),
  links: z.array(documentFlowLinkSchema),
  /** 节点/关系边数量达到上限被服务端截断时置真。 */
  truncated: z.boolean().optional(),
})

export type DocumentFlow = z.output<typeof documentFlowSchema>
export type DocumentFlowNode = z.output<typeof documentFlowNodeSchema>
export type DocumentFlowLink = z.output<typeof documentFlowLinkSchema>
