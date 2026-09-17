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
