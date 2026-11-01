import { apiGet } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import {
  type ProjectSalesSummary,
  projectSalesSummarySchema,
} from '@/shared/schemas/project-sales-summary'
import type { EntityId } from '@/types/entity-id'

export type { ProjectSalesSummary } from '@/shared/schemas/project-sales-summary'

/** 项目销售汇总查询参数。雪花 ID 一律保持字符串。 */
export interface ProjectSalesSummaryParams {
  projectId: EntityId
  /** 编辑态排除本单，避免「已保存的本单」与「本次草稿」被重复计入。 */
  excludeOrderId?: EntityId
  /** 含本单待保存金额（编辑器草稿合计；与保存载荷同一口径）。 */
  pendingAmount?: number
  /** 含本单待保存吨位（编辑器草稿合计；与保存载荷同一口径）。 */
  pendingTonnage?: number
}

/**
 * 项目销售汇总的唯一请求出口（`GET /api/v2/projects/{projectId}/sales-summary`）。
 *
 * <p>只读：不写单据、不改表单，任何调用方都不得由此触发保存。</p>
 */
export function fetchProjectSalesSummary(
  params: ProjectSalesSummaryParams,
  signal?: AbortSignal,
): Promise<ProjectSalesSummary> {
  return apiGet(
    ENDPOINTS.PROJECT_SALES_SUMMARY(params.projectId),
    projectSalesSummarySchema,
    {
      params: {
        excludeOrderId: params.excludeOrderId || undefined,
        pendingAmount: params.pendingAmount,
        pendingTonnage: params.pendingTonnage,
      },
      ...(signal ? { signal } : {}),
    },
  )
}
